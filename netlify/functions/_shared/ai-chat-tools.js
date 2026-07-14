/**
 * Read-only tool set for the AI Clinic Chat feature. Every handler receives the
 * clinic_id resolved server-side from the caller's JWT (never trust one from the
 * model's tool input) and only ever runs `.select()` queries — no handler here may
 * insert/update/delete anything.
 */

const DEFAULT_LIST_LIMIT = 10;
const BASE_APPOINTMENTS_LIMIT = 50;
const BASE_LEDGER_LIMIT = 30;
const BASE_PAYOUT_LIMIT = 20;
const MAX_DATE_RANGE_DAYS = 366;
const HARD_MAX_APPOINTMENTS_LIMIT = 300;
const HARD_MAX_LEDGER_LIMIT = 200;
const HARD_MAX_PAYOUT_LIMIT = 120;
const OVERVIEW_PAGE_SIZE = 500;
const OVERVIEW_HARD_SCAN_MAX = 20000;
const OVERVIEW_MAX_PAGES = 8;
const OVERVIEW_TARGET_ROWS_BY_SPAN = {
  day: 4000,
  week: 8000,
  month: 12000,
  long: 6000,
};
// Balance isn't a stored column (it's computed from payments/completed appointments), so
// filtering/sorting by it can't happen in SQL — scan up to this many clients, compute
// balances in one batch, then filter/sort/paginate in memory. Well above any real clinic's
// roster size; if a clinic actually exceeds it, list_clients reports truncated: true.
const CLIENTS_LIST_SCAN_CAP = 1000;
const CLIENTS_LIST_DEFAULT_LIMIT = 20;
const CLIENTS_LIST_MAX_LIMIT = 100;

const RANGE_LIMIT_MULTIPLIERS = {
  day: { default: 2.5, max: 4, shouldFullyAggregate: true },
  week: { default: 2, max: 3, shouldFullyAggregate: true },
  month: { default: 1.5, max: 2, shouldFullyAggregate: true },
  long: { default: 1, max: 1, shouldFullyAggregate: false },
};

const clampLimit = (requested, max, fallbackDefault = DEFAULT_LIST_LIMIT) => {
  const n = Number(requested);
  if (!Number.isFinite(n) || n <= 0) return Math.min(fallbackDefault, max);
  return Math.min(Math.floor(n), max);
};

const clampOffset = (requested) => {
  const n = Number(requested);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
};

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const parseDateOrNull = (value, boundary = 'exact') => {
  if (!value) return null;
  if (typeof value === 'string' && DATE_ONLY_PATTERN.test(value.trim())) {
    const [year, month, day] = value.trim().split('-').map((part) => Number(part));
    if (![year, month, day].every(Number.isFinite)) return null;
    if (boundary === 'end') return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const classifyRangeSpan = (startDate, endDate) => {
  const msInDay = 24 * 60 * 60 * 1000;
  const daySpan = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / msInDay));
  if (daySpan <= 1) return { kind: 'day', day_span: daySpan };
  if (daySpan <= 7) return { kind: 'week', day_span: daySpan };
  if (daySpan <= 31) return { kind: 'month', day_span: daySpan };
  return { kind: 'long', day_span: daySpan };
};

const resolveRangePolicy = (spanKind, baseDefaultLimit, baseMaxLimit, hardMaxLimit) => {
  const policy = RANGE_LIMIT_MULTIPLIERS[spanKind] || RANGE_LIMIT_MULTIPLIERS.long;
  const computedDefault = Math.max(1, Math.round(baseDefaultLimit * policy.default));
  const computedMax = Math.max(computedDefault, Math.round(baseMaxLimit * policy.max));
  const maxLimit = Math.min(computedMax, hardMaxLimit);
  return {
    default_limit: Math.min(computedDefault, maxLimit),
    max_limit: maxLimit,
    should_fully_aggregate: policy.shouldFullyAggregate,
  };
};

const resolvePagination = ({ requestedLimit, requestedOffset, spanKind, baseDefaultLimit, baseMaxLimit, hardMaxLimit }) => {
  const policy = resolveRangePolicy(spanKind, baseDefaultLimit, baseMaxLimit, hardMaxLimit);
  return {
    offset: clampOffset(requestedOffset),
    limit: clampLimit(requestedLimit, policy.max_limit, policy.default_limit),
    policy,
  };
};

const buildPaginationMeta = ({ offset, limit, totalMatching, returnedCount }) => {
  const nextOffset = offset + returnedCount;
  const hasMore = Number.isFinite(totalMatching) ? nextOffset < totalMatching : returnedCount === limit;
  return {
    offset,
    limit,
    returned: returnedCount,
    has_more: hasMore,
    next_offset: hasMore ? nextOffset : null,
  };
};

/** Clamp a [start,end] range to MAX_DATE_RANGE_DAYS, defaulting to the last 90 days. */
const resolveDateRange = (startDate, endDate) => {
  let end = parseDateOrNull(endDate, 'end') || new Date();
  const defaultStart = new Date(end);
  defaultStart.setDate(defaultStart.getDate() - 90);
  let start = parseDateOrNull(startDate, 'start') || defaultStart;
  if (start.getTime() > end.getTime()) {
    const tmp = start;
    start = end;
    end = tmp;
  }

  const maxSpanMs = MAX_DATE_RANGE_DAYS * 24 * 60 * 60 * 1000;
  const clampedStart = end.getTime() - start.getTime() > maxSpanMs
    ? new Date(end.getTime() - maxSpanMs)
    : start;
  const span = classifyRangeSpan(clampedStart, end);

  return { start: clampedStart.toISOString(), end: end.toISOString(), span };
};

const fullName = (row) => `${row?.first_name || ''} ${row?.last_name || ''}`.trim() || null;
const MAX_ACTIVITY_METADATA_KEYS = 8;
const PAYROLL_RULES_NOTE = {
  pay_therapist_in_full: 'pay_therapist_in_full means therapist compensation is 100% of that appointment pre-IVA revenue; it does NOT mean the client fully paid their account balance.',
  retention_positive: 'Positive retention_rate/retention_amount is a deduction from therapist payout.',
  retention_negative: 'Negative retention_rate/retention_amount is an additive adjustment (bonus) that increases therapist payout.',
};

const normalizeSearchText = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

const tokenizeSearchText = (value) => normalizeSearchText(value)
  .split(/[\s,.;:_-]+/)
  .map((token) => token.trim())
  .filter(Boolean);

const digitsOnly = (value) => String(value || '').replace(/\D/g, '');

const sanitizeLikeTerm = (value) => String(value || '')
  .replace(/[%_(),]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const scoreClientMatch = (client, normalizedQuery, queryTokens, queryDigits) => {
  const firstName = normalizeSearchText(client.first_name);
  const lastName = normalizeSearchText(client.last_name);
  const fullNameNormalized = `${firstName} ${lastName}`.trim();
  const email = normalizeSearchText(client.email);
  const phoneDigits = digitsOnly(client.phone);
  const haystack = `${fullNameNormalized} ${email} ${phoneDigits}`.trim();

  if (!haystack || !normalizedQuery) return 0;

  let score = 0;
  if (fullNameNormalized === normalizedQuery) score += 220;
  if (firstName === normalizedQuery || lastName === normalizedQuery) score += 180;
  if (fullNameNormalized.startsWith(normalizedQuery)) score += 150;
  if (firstName.startsWith(normalizedQuery) || lastName.startsWith(normalizedQuery)) score += 120;
  if (fullNameNormalized.includes(normalizedQuery)) score += 100;
  if (email.includes(normalizedQuery)) score += 75;
  if (queryDigits && phoneDigits.includes(queryDigits)) score += 120;

  if (queryTokens.length > 0) {
    const tokenHits = queryTokens.filter((token) => haystack.includes(token)).length;
    score += tokenHits * 25;
    if (queryTokens.length > 1 && tokenHits === queryTokens.length) score += 110;
  }

  return score;
};

const compactActivityMetadata = (metadata) => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const preferredKeys = [
    'document_id',
    'templateName',
    'clientFullName',
    'responsibleName',
    'clientName',
    'client_name',
    'appointmentId',
    'appointment_id',
    'old_status',
    'new_status',
    'status',
    'start_time',
    'end_time',
    'therapist_name',
    'old_therapist_name',
    'new_therapist_name',
    'paymentId',
    'payment_id',
    'amount',
  ];

  const picked = {};
  preferredKeys.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(metadata, key)) picked[key] = metadata[key];
  });

  if (Object.keys(picked).length > 0) return picked;

  const compact = {};
  Object.keys(metadata)
    .slice(0, MAX_ACTIVITY_METADATA_KEYS)
    .forEach((key) => {
      const value = metadata[key];
      if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) {
        compact[key] = value;
      } else {
        compact[key] = String(value).slice(0, 120);
      }
    });
  return compact;
};

const describeRetentionEffect = (retentionAmount) => {
  if (retentionAmount > 0) return 'deducts_from_payout';
  if (retentionAmount < 0) return 'adds_to_payout';
  return 'no_effect';
};

/**
 * The clinic's local calendar date + weekday name for a UTC timestamp. Computed here
 * (not left to the model) for two reasons: a raw UTC date slice can misattribute an
 * evening appointment to the wrong local day, and LLMs are unreliable at computing an
 * arbitrary date's day-of-week from scratch.
 */
const localDateAndWeekday = (isoTimestamp, timezone) => {
  const d = new Date(isoTimestamp);
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'long' }).format(d);
  return { date, weekday };
};

/**
 * Local date + weekday + 24-hour clock time for a UTC timestamp. Exists so the model is
 * never handed a raw UTC instant to interpret itself — it has repeatedly mangled these
 * (e.g. relabeling a raw UTC hour as if it were already clinic-local, or mislabeling a
 * 24-hour value with the wrong AM/PM). Always prefer this over exposing a raw timestamp.
 */
const localDateTime = (isoTimestamp, timezone) => {
  const { date, weekday } = localDateAndWeekday(isoTimestamp, timezone);
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(isoTimestamp));
  return { date, weekday, time };
};

/**
 * Converts a clinic-local calendar day (YYYY-MM-DD) to correct UTC instant bounds via an
 * Intl.DateTimeFormat offset probe (correct for any timezone, not a hardcoded offset).
 * Used only to build the default "today" range for list_appointments — resolveDateRange's
 * own date-only parsing assumes UTC calendar days, which is wrong for non-UTC clinics.
 */
const clinicLocalDayBoundsUtc = (dateStr, timezone) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  // Probe the offset once, at a clean whole-second instant (noon, away from any day
  // boundary) — probing directly at a .999ms boundary would have the millisecond
  // truncated by formatToParts' second-only granularity, overshooting by up to ~1s.
  const guessNoon = Date.UTC(year, month - 1, day, 12, 0, 0, 0);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(guessNoon)).reduce((acc, p) => { acc[p.type] = p.value; return acc; }, {});
  const asIfUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  const offsetMs = asIfUtc - guessNoon;
  return {
    startUtcIso: new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - offsetMs).toISOString(),
    endUtcIso: new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999) - offsetMs).toISOString(),
  };
};

/**
 * Turn a document instance's schema + filled values into readable {label, value}
 * pairs. Port of buildFieldSummary in src/hooks/useDocuments.ts / the section-walk
 * in _shared/document-render.js — skips the readonly header group and signatures.
 */
const buildFieldSummary = (schema, values) => {
  const sections = Array.isArray(schema?.sections) ? schema.sections : [];
  const summary = [];

  const pushField = (field) => {
    if (!field || typeof field.id !== 'string' || field.type === 'signature') return;
    const raw = values?.[field.id];
    if (raw === undefined || raw === null || raw === '') return;
    summary.push({ id: field.id, label: field.label || field.id, value: String(raw) });
  };

  sections.forEach((section) => {
    if (section.id === 'header') return;
    if (section.type === 'group' && Array.isArray(section.fields)) {
      section.fields.forEach(pushField);
    } else {
      pushField(section);
    }
  });

  return summary;
};

/**
 * Client balance, computed identically to src/hooks/useClientBalance.ts:
 * balance = money actually received (excluding balance-credit rows) − amounts
 * actually paid toward completed appointments. Completion alone isn't a charge.
 */
const computeClientBalance = async (supabase, clinicId, clientId) => {
  const [{ data: payments }, { data: completedAppointments }] = await Promise.all([
    supabase
      .from('payments')
      .select('amount, appointment_id, method, iva_amount, facturado')
      .eq('client_id', clientId)
      .eq('clinic_id', clinicId),
    supabase
      .from('appointments')
      .select('id')
      .eq('client_id', clientId)
      .eq('clinic_id', clinicId)
      .eq('status', 'completed'),
  ]);

  const paymentRows = payments || [];
  const completedIds = new Set((completedAppointments || []).map((a) => a.id));

  const baseAmount = (p) => (p.facturado ? Number(p.amount || 0) - Number(p.iva_amount || 0) : Number(p.amount || 0));

  const totalCharges = paymentRows
    .filter((p) => p.appointment_id && completedIds.has(p.appointment_id))
    .reduce((sum, p) => sum + Math.abs(baseAmount(p)), 0);

  const totalPayments = paymentRows
    .filter((p) => p.method !== 'balance')
    .reduce((sum, p) => sum + baseAmount(p), 0);

  return { balance: totalPayments - totalCharges, totalPayments, totalCharges };
};

/**
 * Same formula as computeClientBalance, but for many clients in 2 queries total
 * instead of 2*N — used by search_clients so a broad search doesn't need a
 * separate get_client_details round trip per candidate just to see who owes money.
 */
const computeClientBalancesBatch = async (supabase, clinicId, clientIds) => {
  const ids = [...new Set(clientIds)].filter(Boolean);
  if (ids.length === 0) return {};

  const [{ data: payments }, { data: completedAppointments }] = await Promise.all([
    supabase
      .from('payments')
      .select('client_id, amount, appointment_id, method, iva_amount, facturado')
      .eq('clinic_id', clinicId)
      .in('client_id', ids),
    supabase
      .from('appointments')
      .select('id, client_id')
      .eq('clinic_id', clinicId)
      .eq('status', 'completed')
      .in('client_id', ids),
  ]);

  const completedIdsByClient = {};
  (completedAppointments || []).forEach((a) => {
    if (!completedIdsByClient[a.client_id]) completedIdsByClient[a.client_id] = new Set();
    completedIdsByClient[a.client_id].add(a.id);
  });

  const baseAmount = (p) => (p.facturado ? Number(p.amount || 0) - Number(p.iva_amount || 0) : Number(p.amount || 0));

  const totals = {};
  ids.forEach((id) => { totals[id] = { totalPayments: 0, totalCharges: 0 }; });
  (payments || []).forEach((p) => {
    const bucket = totals[p.client_id];
    if (!bucket) return;
    const completedIds = completedIdsByClient[p.client_id] || new Set();
    if (p.appointment_id && completedIds.has(p.appointment_id)) {
      bucket.totalCharges += Math.abs(baseAmount(p));
    }
    if (p.method !== 'balance') {
      bucket.totalPayments += baseAmount(p);
    }
  });

  const balances = {};
  ids.forEach((id) => {
    const { totalPayments, totalCharges } = totals[id];
    balances[id] = { balance: totalPayments - totalCharges, totalPayments, totalCharges };
  });
  return balances;
};

/**
 * Payroll math ported 1:1 from src/lib/payroll.ts, which the Payroll page uses to
 * compute what each therapist earns/is owed. Kept in sync manually since Netlify
 * functions run as plain CommonJS and can't import the TS module directly.
 */
const clampPercent = (value) => {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
};

const clampRetentionPercent = (value) => {
  if (Number.isNaN(value)) return 0;
  if (value < -100) return -100;
  if (value > 100) return 100;
  return value;
};

const normalizeCompensationType = (value) => (value === 'fixed_per_session' ? 'fixed_per_session' : 'percentage');

const summarizeAppointmentPayments = (appointment) => {
  const paymentRows = (appointment.payments || []).filter((p) => Number(p?.amount || 0) > 0);
  if (paymentRows.length === 0) {
    const fallback = Number(appointment.payment_amount || 0);
    return { totalCollected: fallback, preIvaRevenue: fallback, totalIva: 0 };
  }
  return paymentRows.reduce(
    (acc, payment) => {
      const total = Number(payment.amount || 0);
      const iva = Number(payment.iva_amount || 0);
      const preIva = payment.facturado && iva > 0 ? Math.max(total - iva, 0) : total;
      return {
        totalCollected: acc.totalCollected + total,
        preIvaRevenue: acc.preIvaRevenue + preIva,
        totalIva: acc.totalIva + iva,
      };
    },
    { totalCollected: 0, preIvaRevenue: 0, totalIva: 0 },
  );
};

/** Appointment payroll terms come from its frozen snapshot once one exists, else the therapist's live config. */
const resolveAppointmentPayrollConfig = (appointment, liveConfig) => {
  if (!appointment.payroll_snapshot_at) return liveConfig;
  return {
    compensationType: appointment.payroll_compensation_type,
    commissionPercentage: appointment.payroll_commission_percentage,
    fixedSessionAmount: appointment.payroll_fixed_session_amount,
    retentionEnabled: appointment.payroll_retention_enabled,
    retentionRate: appointment.payroll_retention_rate,
    incentiveEnabled: appointment.payroll_incentive_enabled,
    incentiveThresholdSessions: appointment.payroll_incentive_threshold_sessions,
    incentivePercentageBonus: appointment.payroll_incentive_percentage_bonus,
    incentiveFixedBonus: appointment.payroll_incentive_fixed_bonus,
  };
};

const getPayrollQuarterRange = (periodStartDate) => {
  const year = periodStartDate.getFullYear();
  const month = periodStartDate.getMonth();
  const isFirstHalf = periodStartDate.getDate() <= 15;
  const periodIndexInYear = month * 2 + (isFirstHalf ? 0 : 1);
  const quarterIndex = Math.floor(periodIndexInYear / 6);
  const quarterStartIndex = quarterIndex * 6;
  const quarterEndIndex = quarterStartIndex + 5;
  const startMonth = Math.floor(quarterStartIndex / 2);
  const startIsFirstHalf = quarterStartIndex % 2 === 0;
  const endMonth = Math.floor(quarterEndIndex / 2);
  const endIsFirstHalf = quarterEndIndex % 2 === 0;
  const startDate = startIsFirstHalf ? new Date(year, startMonth, 1) : new Date(year, startMonth, 16);
  const endDate = endIsFirstHalf ? new Date(year, endMonth, 15) : new Date(year, endMonth + 1, 0);
  return { startDate, endDate };
};

/** Today's semi-monthly pay period (1st-15th or 16th-end of month), used when no dates are given. */
const resolveCurrentPayPeriod = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  if (now.getDate() <= 15) return { startDate: new Date(year, month, 1), endDate: new Date(year, month, 15) };
  return { startDate: new Date(year, month, 16), endDate: new Date(year, month + 1, 0) };
};

const startOfDayIso = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).toISOString();
const endOfDayIso = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).toISOString();
const toDateOnly = (d) => d.toISOString().slice(0, 10);

const computeTherapistPayroll = ({ periodSessions, periodPreIvaRevenue, quarterSessions, config, payInFull = false }) => {
  const compensationType = normalizeCompensationType(config.compensationType);
  const baseCommission = clampPercent(Number(config.commissionPercentage || 0));
  const baseFixedSessionAmount = Math.max(Number(config.fixedSessionAmount || 0), 0);
  const retentionEnabled = !!config.retentionEnabled;
  const retentionRate = clampRetentionPercent(Number(config.retentionRate || 0));
  const incentiveEnabled = !!config.incentiveEnabled;
  const incentiveThresholdSessions = Math.max(Number(config.incentiveThresholdSessions || 0), 0);
  const incentivePercentageBonus = clampPercent(Number(config.incentivePercentageBonus || 0));
  const incentiveFixedBonus = Math.max(Number(config.incentiveFixedBonus || 0), 0);

  const incentiveApplied =
    incentiveEnabled && incentiveThresholdSessions > 0 && quarterSessions >= incentiveThresholdSessions;

  const effectiveCommissionPercentage =
    compensationType === 'percentage'
      ? clampPercent(baseCommission + (incentiveApplied ? incentivePercentageBonus : 0))
      : 0;

  const effectiveFixedSessionAmount =
    compensationType === 'fixed_per_session'
      ? baseFixedSessionAmount + (incentiveApplied ? incentiveFixedBonus : 0)
      : 0;

  const grossEarnings = payInFull
    ? periodPreIvaRevenue
    : compensationType === 'percentage'
      ? periodPreIvaRevenue * (effectiveCommissionPercentage / 100)
      : periodSessions * effectiveFixedSessionAmount;

  const retentionAmount = retentionEnabled && !payInFull ? grossEarnings * (retentionRate / 100) : 0;
  const netEarnings = grossEarnings - retentionAmount;
  const clinicEarnings = periodPreIvaRevenue - grossEarnings;

  return {
    compensationType,
    effectiveCommissionPercentage,
    effectiveFixedSessionAmount,
    incentiveApplied,
    grossEarnings,
    retentionAmount,
    retentionRateApplied: retentionEnabled ? retentionRate : 0,
    netEarnings,
    clinicEarnings,
  };
};

const toolDefinitions = [
  {
    name: 'get_current_clinic_datetime',
    description: 'Current date and weekday in the clinic timezone. Use this for any "what day is today" or weekday question.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'remember_fact',
    description: 'Permanently remember a clinic-wide business fact or rule (e.g. "Sergio is the clinic owner", "Fridays are half-days"). This is visible to every staff member using this chat from now on, and to you in every future conversation — write it as a clear, self-contained statement. ONLY call this when a staff member explicitly asks you to remember/note/keep in mind something — never proactively, and never for information already available from another tool (e.g. do not remember a client\'s balance). This and forget_fact are the ONLY tools that write anything; every other tool is strictly read-only.',
    input_schema: {
      type: 'object',
      properties: {
        fact: { type: 'string', description: 'The fact to remember, self-contained and clear (max 500 characters).' },
      },
      required: ['fact'],
    },
  },
  {
    name: 'forget_fact',
    description: 'Permanently delete a previously remembered clinic-wide fact, by its id (shown as "[id: ...]" next to each fact in your system context). ONLY call this when a staff member explicitly asks you to forget/remove/correct a remembered fact. If they want to correct a fact rather than just remove it, forget the old one and remember the new one.',
    input_schema: {
      type: 'object',
      properties: {
        fact_id: { type: 'string', description: 'The id of the fact to forget, from the "[id: ...]" tag in your remembered-facts context.' },
      },
      required: ['fact_id'],
    },
  },
  {
    name: 'search_clients',
    description: 'Search the clinic\'s patients by name, email, or phone (active and archived). Uses case-insensitive + accent-insensitive token matching (helps with full-name keywords). Returns up to 10 ranked matches, each including their current balance (positive = credit, negative = owed) — no need to call get_client_details separately just for balance. Requires a search term — for "which clients owe money" or any filter-based listing with no name/contact to search by, use list_clients instead.',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Name, email, or phone fragment to search for.' } },
      required: ['query'],
    },
  },
  {
    name: 'list_clients',
    description: 'Clinic-wide patient list with server-side filters — by balance status (who owes money vs has credit), active/archived, or the pay-in-full flag — plus sorting and pagination. Use this for "which clients owe money", "list clients with a credit balance", "all active patients", etc. — anything filter-based with no specific name/contact to search by (use search_clients for that instead). Excludes archived clients by default.',
    input_schema: {
      type: 'object',
      properties: {
        balance_filter: { type: 'string', description: 'One of: owes (negative balance), has_credit (positive balance), zero. Omit for no balance filter.' },
        is_active: { type: 'boolean', description: 'Filter by the active/inactive flag.' },
        archived: { type: 'boolean', description: 'Include archived clients. Defaults to false (archived excluded).' },
        pay_therapist_in_full: { type: 'boolean', description: 'Filter by the pay-therapist-in-full flag.' },
        sort_by: { type: 'string', description: 'One of: balance_asc, balance_desc, name. Defaults to name.' },
        limit: { type: 'number', description: 'Rows per page, up to 100.' },
        offset: { type: 'number', description: 'Zero-based row offset for pagination.' },
      },
    },
  },
  {
    name: 'get_client_details',
    description: 'Full profile for one patient — contact info, default charge amount, pay-in-full flag, emergency contact, invoicing (RFC/tax regime/CFDI) fields, and current balance (positive = credit, negative = owed).',
    input_schema: {
      type: 'object',
      properties: { client_id: { type: 'string', description: 'The patient id, from search_clients.' } },
      required: ['client_id'],
    },
  },
  {
    name: 'get_client_appointments',
    description: 'A patient\'s appointment history (defaults to the last 90 days if no dates given), with range-aware pagination. Each row includes pay_therapist_in_full for that specific appointment.',
    input_schema: {
      type: 'object',
      properties: {
        client_id: { type: 'string' },
        start_date: { type: 'string', description: 'ISO date, e.g. 2026-01-01.' },
        end_date: { type: 'string', description: 'ISO date, e.g. 2026-12-31.' },
        limit: { type: 'number', description: 'Rows per page; range-aware max (higher for day/week/month ranges).' },
        offset: { type: 'number', description: 'Zero-based row offset for pagination.' },
      },
      required: ['client_id'],
    },
  },
  {
    name: 'get_client_documents',
    description: 'List of documents generated for a patient (titles/status only — use get_document_details for a document\'s actual answers).',
    input_schema: {
      type: 'object',
      properties: { client_id: { type: 'string' } },
      required: ['client_id'],
    },
  },
  {
    name: 'get_document_details',
    description: 'The filled-in field/answer pairs for one specific document instance (e.g. a Historia Clínica).',
    input_schema: {
      type: 'object',
      properties: { document_id: { type: 'string', description: 'From get_client_documents or search_activity_log.entity_id when entity_type=document.' } },
      required: ['document_id'],
    },
  },
  {
    name: 'get_financial_summary',
    description: 'Revenue and expense totals for a date range (max 366 days), broken down by payment method and expense category, including pre-computed percentages (payment_method_breakdown, expense_category_breakdown, expense_payment_method_breakdown) — use those percent fields as-is rather than computing your own. Includes amount_in_cashier: physical cash-drawer reconciliation (cash revenue minus only CASH-PAID expenses) — use this, not total_cash minus total_expenses, for "how much cash should be in the register" questions, since a large non-cash expense (e.g. an INFONAVIT payment via bank transfer) must not appear to drain the drawer. Use list_payments/list_expenses for individual transactions.',
    input_schema: {
      type: 'object',
      properties: {
        start_date: { type: 'string', description: 'ISO date.' },
        end_date: { type: 'string', description: 'ISO date.' },
      },
      required: ['start_date', 'end_date'],
    },
  },
  {
    name: 'list_payments',
    description: 'Individual payment records for a date range (defaults to the last 90 days), optionally filtered by patient, payment method, or standalone-only (not tied to an appointment). Each row includes iva_amount, refund info, which appointment it belongs to (if any), and who received it (received_by). Returns paginated rows with range-aware limits.',
    input_schema: {
      type: 'object',
      properties: {
        start_date: { type: 'string', description: 'ISO date.' },
        end_date: { type: 'string', description: 'ISO date.' },
        client_id: { type: 'string', description: 'From search_clients, to filter to one patient.' },
        method: { type: 'string', description: 'One of: cash, card, transfer, cheque, insurance, balance, adjustment.' },
        standalone_only: { type: 'boolean', description: 'If true, only payments not tied to an appointment (manual finance movements).' },
        limit: { type: 'number', description: 'Rows per page; range-aware max (higher for day/week/month ranges).' },
        offset: { type: 'number', description: 'Zero-based row offset for pagination.' },
      },
    },
  },
  {
    name: 'list_expenses',
    description: 'Individual expense records for a date range (defaults to the last 90 days), optionally filtered by category, attributed therapist, or payment method. Each row includes payment_method (cash/card/transfer/cheque) — only "cash" expenses affect the physical cash drawer; non-cash expenses (e.g. a bank-transferred INFONAVIT payment) reduce net profit but not cash on hand — and recorded_by (who logged it). Returns paginated rows with range-aware limits.',
    input_schema: {
      type: 'object',
      properties: {
        start_date: { type: 'string', description: 'ISO date.' },
        end_date: { type: 'string', description: 'ISO date.' },
        category: { type: 'string', description: 'e.g. supplies, office, maintenance, utilities, equipment, marketing, travel, food, general, Payroll.' },
        therapist_id: { type: 'string', description: 'From search_therapists, to filter to expenses attributed to one therapist.' },
        payment_method: { type: 'string', description: 'One of: cash, card, transfer, cheque.' },
        limit: { type: 'number', description: 'Rows per page; range-aware max (higher for day/week/month ranges).' },
        offset: { type: 'number', description: 'Zero-based row offset for pagination.' },
      },
    },
  },
  {
    name: 'get_payroll_summary',
    description: 'Computed payroll for one or all therapists over a pay period (defaults to the current semi-monthly period): gross earnings, retention withheld, net earnings, therapist-attributed expenses, final net payable, and paid-in-full appointment metrics. Note: pay_therapist_in_full means therapist gets 100% pre-IVA revenue for that appointment (compensation rule), not that the client fully paid their balance. Negative retention increases payout.',
    input_schema: {
      type: 'object',
      properties: {
        therapist_id: { type: 'string', description: 'From search_therapists. Omit to get all therapists for the period.' },
        start_date: { type: 'string', description: 'ISO date, start of the pay period.' },
        end_date: { type: 'string', description: 'ISO date, end of the pay period.' },
      },
    },
  },
  {
    name: 'list_therapist_payouts',
    description: 'Already-paid-out payroll records (actual payouts registered on the Payroll page), optionally filtered by therapist. Defaults to the last 90 days and supports pagination.',
    input_schema: {
      type: 'object',
      properties: {
        therapist_id: { type: 'string', description: 'From search_therapists.' },
        start_date: { type: 'string', description: 'ISO date.' },
        end_date: { type: 'string', description: 'ISO date.' },
        limit: { type: 'number', description: 'Rows per page; range-aware max.' },
        offset: { type: 'number', description: 'Zero-based row offset for pagination.' },
      },
    },
  },
  {
    name: 'get_appointments_overview',
    description: 'Clinic-wide appointment counts for a date range, broken down by calendar day and by status (completed/cancelled/no_show/scheduled) — covers the WHOLE range, not a capped recent sample. If start/end are omitted, defaults to last 90 days through now. This is the right tool for "how many appointments", "which day was busiest", or "summarize appointments this month" — prefer it over search_activity_log or get_client_appointments for anything period-wide.',
    input_schema: {
      type: 'object',
      properties: {
        start_date: { type: 'string', description: 'Optional ISO date.' },
        end_date: { type: 'string', description: 'Optional ISO date.' },
      },
    },
  },
  {
    name: 'list_appointments',
    description: 'Clinic-wide, per-appointment detail rows (patient, therapist, treatment, status, payment info, pay_therapist_in_full, localized time) for a date range. Defaults to TODAY (clinic-local) if no dates are given. Use this for "list/show today\'s appointments", "what appointments do we have this week with details" — anything asking for individual appointment rows rather than counts. For counts/totals/busiest-day use get_appointments_overview instead.',
    input_schema: {
      type: 'object',
      properties: {
        start_date: { type: 'string', description: 'ISO date. Omit along with end_date to default to today (clinic-local).' },
        end_date: { type: 'string', description: 'ISO date. Omit along with start_date to default to today (clinic-local).' },
        therapist_id: { type: 'string', description: 'From search_therapists, to filter to one therapist.' },
        status: { type: 'string', description: 'One of: scheduled, completed, cancelled, no_show.' },
        limit: { type: 'number', description: 'Rows per page; range-aware max (higher for day/week ranges).' },
        offset: { type: 'number', description: 'Zero-based row offset for pagination.' },
      },
    },
  },
  {
    name: 'get_activity_summary',
    description: 'Clinic-wide activity-log counts for a date range, broken down by calendar day and by action/entity type (appointment/client/payment/document) — covers the WHOLE range via internal server-side scanning, not a single capped page. Use this for "how is today/this week/this month going", "what kinds of things happened", or any period-wide activity-volume question. For the actual text description of specific events, use search_activity_log afterward — it returns one paginated page of raw entries per call and will NOT give a full picture of a broad range on its own.',
    input_schema: {
      type: 'object',
      properties: {
        start_date: { type: 'string', description: 'Optional ISO date.' },
        end_date: { type: 'string', description: 'Optional ISO date.' },
      },
    },
  },
  {
    name: 'search_activity_log',
    description: 'Recent clinic activity (appointments/clients/payments/documents changed), optionally filtered by category and date range. Returns ONE PAGE of raw entries per call (with entity IDs/metadata; appointment rows also include an appointment_lookup snapshot) — use get_activity_summary first for any broad "how is the period going" question, since a single page here cannot represent a whole day/week/month.',
    input_schema: {
      type: 'object',
      properties: {
        entity_type: { type: 'string', description: 'One of: appointment, client, payment, document.' },
        start_date: { type: 'string' },
        end_date: { type: 'string' },
        limit: { type: 'number', description: 'Rows per page; range-aware max. For broad ranges, paginate or narrow filters.' },
        offset: { type: 'number', description: 'Zero-based row offset for pagination.' },
      },
    },
  },
  {
    name: 'get_therapist_summary',
    description: 'A therapist\'s appointment counts and revenue for a date range (defaults to the last 90 days).',
    input_schema: {
      type: 'object',
      properties: {
        therapist_id: { type: 'string', description: 'From search_therapists.' },
        start_date: { type: 'string' },
        end_date: { type: 'string' },
      },
      required: ['therapist_id'],
    },
  },
  {
    name: 'search_therapists',
    description: 'Look up a therapist by name to get their id.',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query'],
    },
  },
  {
    name: 'get_therapist_compensation_config',
    description: 'Each therapist\'s actual live compensation policy: compensation type, commission percentage or fixed session amount, retention rate, and incentive threshold/bonus. Use this for direct policy questions like "what is Carlos\'s commission rate" or "what triggers Sebastián\'s incentive bonus" — get_payroll_summary only returns computed dollar RESULTS for a period, never these raw settings. Omit therapist_id to get every therapist\'s config at once.',
    input_schema: {
      type: 'object',
      properties: {
        therapist_id: { type: 'string', description: 'From search_therapists. Omit to get all therapists.' },
      },
    },
  },
  {
    name: 'search_treatments',
    description: 'Look up the clinic\'s treatments/services by name.',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query'],
    },
  },
];

const toolHandlers = {
  get_current_clinic_datetime: async (_supabase, _clinicId, _input, clinicTimezone) => {
    const timezone = clinicTimezone || 'UTC';
    const now = new Date();
    return {
      timezone,
      date: new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now),
      weekday: new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'long' }).format(now),
      time: new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(now),
      iso_utc: now.toISOString(),
    };
  },

  // The one deliberate exception to this file's read-only invariant — every other
  // handler here may only .select(). Scoped tightly: clinic-wide fact storage only,
  // triggered only when the model is explicitly asked to remember something.
  remember_fact: async (supabase, clinicId, input, _clinicTimezone, userId) => {
    const fact = String(input?.fact || '').trim();
    if (!fact) return { error: 'fact is required' };
    if (fact.length > 500) return { error: 'fact is too long (max 500 characters) — summarize it more concisely' };

    const { data, error } = await supabase
      .from('ai_clinic_memory')
      .insert({ clinic_id: clinicId, fact, created_by: userId || null })
      .select('id, fact, created_at')
      .single();
    if (error) return { error: error.message };

    return { remembered: true, id: data.id, fact: data.fact, created_at: data.created_at };
  },

  // Second and last deliberate write exception — scoped delete-by-id-and-clinic only,
  // so it can never remove another clinic's memory even if a wrong id were somehow passed.
  forget_fact: async (supabase, clinicId, input) => {
    const factId = String(input?.fact_id || '').trim();
    if (!factId) return { error: 'fact_id is required' };

    const { data, error } = await supabase
      .from('ai_clinic_memory')
      .delete()
      .eq('id', factId)
      .eq('clinic_id', clinicId)
      .select('id, fact')
      .maybeSingle();
    if (error) return { error: error.message };
    if (!data) return { error: 'No remembered fact found with that id for this clinic.' };

    return { forgotten: true, id: data.id, fact: data.fact };
  },

  search_clients: async (supabase, clinicId, input) => {
    const query = String(input?.query || '').trim();
    if (!query) return { error: 'query is required' };
    const normalizedQuery = normalizeSearchText(query);
    const queryTokens = tokenizeSearchText(query);
    const queryDigits = digitsOnly(query);

    // Gather a broad candidate set server-side, then rank locally with normalized
    // full-name/token matching so "caps/lowercaps/keywords" and mixed-name input
    // behave more predictably.
    const likeTerms = [query, ...queryTokens]
      .map((term) => sanitizeLikeTerm(term))
      .filter(Boolean);
    const orClauses = [];
    likeTerms.forEach((term) => {
      orClauses.push(`first_name.ilike.%${term}%`);
      orClauses.push(`last_name.ilike.%${term}%`);
      orClauses.push(`email.ilike.%${term}%`);
    });
    if (queryDigits) {
      orClauses.push(`phone.ilike.%${queryDigits}%`);
    }

    let candidatesQuery = supabase
      .from('clients')
      .select('id, first_name, last_name, email, phone, is_active, archived')
      .eq('clinic_id', clinicId)
      .limit(120);
    if (orClauses.length > 0) {
      candidatesQuery = candidatesQuery.or([...new Set(orClauses)].join(','));
    }

    const { data, error } = await candidatesQuery;
    if (error) return { error: error.message };

    const ranked = (data || [])
      .map((client) => ({
        client,
        score: scoreClientMatch(client, normalizedQuery, queryTokens, queryDigits),
      }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score || (fullName(a.client) || '').localeCompare(fullName(b.client) || ''))
      .slice(0, DEFAULT_LIST_LIMIT)
      .map((row) => row.client);
    const fallback = (data || [])
      .slice(0, DEFAULT_LIST_LIMIT);
    const finalClients = ranked.length > 0 ? ranked : fallback;

    const balances = await computeClientBalancesBatch(supabase, clinicId, finalClients.map((c) => c.id));

    return {
      clients: finalClients.map((c) => {
        const balance = balances[c.id]?.balance ?? 0;
        return {
          id: c.id,
          name: fullName(c),
          email: c.email,
          phone: c.phone,
          is_active: c.is_active,
          archived: !!c.archived,
          balance,
          balance_note: balance >= 0 ? 'positive = credit in their favor' : 'negative = amount they owe',
        };
      }),
    };
  },

  list_clients: async (supabase, clinicId, input) => {
    const limit = clampLimit(input?.limit, CLIENTS_LIST_MAX_LIMIT, CLIENTS_LIST_DEFAULT_LIMIT);
    const offset = clampOffset(input?.offset);
    const archived = typeof input?.archived === 'boolean' ? input.archived : false;

    let query = supabase
      .from('clients')
      .select('id, first_name, last_name, email, phone, is_active, archived, pay_therapist_in_full')
      .eq('clinic_id', clinicId)
      .eq('archived', archived)
      .limit(CLIENTS_LIST_SCAN_CAP);
    if (typeof input?.is_active === 'boolean') query = query.eq('is_active', input.is_active);
    if (typeof input?.pay_therapist_in_full === 'boolean') query = query.eq('pay_therapist_in_full', input.pay_therapist_in_full);

    const { data, error } = await query;
    if (error) return { error: error.message };
    const clients = data || [];
    const scanTruncated = clients.length >= CLIENTS_LIST_SCAN_CAP;

    const balances = await computeClientBalancesBatch(supabase, clinicId, clients.map((c) => c.id));

    let enriched = clients.map((c) => {
      const balance = balances[c.id]?.balance ?? 0;
      return {
        id: c.id,
        name: fullName(c),
        email: c.email,
        phone: c.phone,
        is_active: c.is_active,
        archived: !!c.archived,
        pay_therapist_in_full: !!c.pay_therapist_in_full,
        balance,
        balance_note: balance >= 0 ? 'positive = credit in their favor' : 'negative = amount they owe',
      };
    });

    if (input?.balance_filter === 'owes') enriched = enriched.filter((c) => c.balance < 0);
    else if (input?.balance_filter === 'has_credit') enriched = enriched.filter((c) => c.balance > 0);
    else if (input?.balance_filter === 'zero') enriched = enriched.filter((c) => c.balance === 0);

    if (input?.sort_by === 'balance_asc') enriched.sort((a, b) => a.balance - b.balance);
    else if (input?.sort_by === 'balance_desc') enriched.sort((a, b) => b.balance - a.balance);
    else enriched.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    const totalMatching = enriched.length;
    const pageRows = enriched.slice(offset, offset + limit);
    const pagination = buildPaginationMeta({ offset, limit, totalMatching, returnedCount: pageRows.length });

    return {
      total_matching: totalMatching,
      truncated: scanTruncated,
      pagination,
      warning: scanTruncated
        ? `Only the first ${CLIENTS_LIST_SCAN_CAP} clients (by id) were scanned before filtering — results may be incomplete. Narrow with is_active/archived/pay_therapist_in_full, or search_clients for a specific patient.`
        : undefined,
      clients: pageRows,
    };
  },

  get_client_details: async (supabase, clinicId, input) => {
    const clientId = input?.client_id;
    if (!clientId) return { error: 'client_id is required' };
    const { data: client, error } = await supabase
      .from('clients')
      .select('id, first_name, last_name, email, phone, birth_date, gender, address, medical_notes, is_active, archived, charge_amount, pay_therapist_in_full, emergency_contact_name, emergency_contact_phone, rfc, tax_regime, cfdi_email, cfdi_use')
      .eq('id', clientId)
      .eq('clinic_id', clinicId)
      .single();
    if (error || !client) return { error: 'Client not found' };

    const balance = await computeClientBalance(supabase, clinicId, clientId);

    return {
      id: client.id,
      name: fullName(client),
      email: client.email,
      phone: client.phone,
      birth_date: client.birth_date,
      gender: client.gender,
      address: client.address,
      medical_notes: client.medical_notes ? String(client.medical_notes).slice(0, 500) : null,
      is_active: client.is_active,
      archived: !!client.archived,
      charge_amount: client.charge_amount,
      pay_therapist_in_full: !!client.pay_therapist_in_full,
      pay_therapist_in_full_note: 'If true, the therapist is compensated 100% of this client\'s pre-IVA appointment revenue by default — this does NOT mean the client themself owes/paid nothing.',
      emergency_contact_name: client.emergency_contact_name,
      emergency_contact_phone: client.emergency_contact_phone,
      rfc: client.rfc,
      tax_regime: client.tax_regime,
      cfdi_email: client.cfdi_email,
      cfdi_use: client.cfdi_use,
      balance: balance.balance,
      balance_note: balance.balance >= 0 ? 'positive = credit in their favor' : 'negative = amount they owe',
    };
  },

  get_client_appointments: async (supabase, clinicId, input, clinicTimezone) => {
    const timezone = clinicTimezone || 'UTC';
    const clientId = input?.client_id;
    if (!clientId) return { error: 'client_id is required' };
    const { start, end, span } = resolveDateRange(input?.start_date, input?.end_date);
    const { limit, offset, policy } = resolvePagination({
      requestedLimit: input?.limit,
      requestedOffset: input?.offset,
      spanKind: span.kind,
      baseDefaultLimit: DEFAULT_LIST_LIMIT,
      baseMaxLimit: BASE_APPOINTMENTS_LIMIT,
      hardMaxLimit: HARD_MAX_APPOINTMENTS_LIMIT,
    });

    const { data, error } = await supabase
      .from('appointments')
      .select('id, start_time, end_time, status, payment_amount, payment_status, pay_therapist_in_full, treatments(name), therapists(first_name, last_name)')
      .eq('client_id', clientId)
      .eq('clinic_id', clinicId)
      .gte('start_time', start)
      .lte('start_time', end)
      .order('start_time', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) return { error: error.message };
    const rows = data || [];
    const totalMatching = null;
    const pagination = buildPaginationMeta({ offset, limit, totalMatching, returnedCount: rows.length });

    return {
      range: { start, end, span_kind: span.kind, span_days: span.day_span },
      total_matching: totalMatching,
      truncated: pagination.has_more,
      pagination,
      limit_policy: policy,
      appointments: rows.map((a) => ({
        id: a.id,
        start_time: a.start_time,
        end_time: a.end_time,
        start_time_local: localDateTime(a.start_time, timezone),
        end_time_local: localDateTime(a.end_time, timezone),
        status: a.status,
        payment_amount: a.payment_amount,
        payment_status: a.payment_status,
        pay_therapist_in_full: !!a.pay_therapist_in_full,
        treatment: a.treatments?.name || null,
        therapist: fullName(a.therapists),
      })),
    };
  },

  get_client_documents: async (supabase, clinicId, input) => {
    const clientId = input?.client_id;
    if (!clientId) return { error: 'client_id is required' };
    const { data, error } = await supabase
      .from('document_instances')
      .select('id, status, created_at, data')
      .eq('client_id', clientId)
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false })
      .limit(DEFAULT_LIST_LIMIT);
    if (error) return { error: error.message };
    return {
      documents: (data || []).map((d) => ({
        id: d.id,
        template_name: d.data?.templateName || null,
        status: d.status,
        created_at: d.created_at,
      })),
    };
  },

  get_document_details: async (supabase, clinicId, input) => {
    const documentId = input?.document_id;
    if (!documentId) return { error: 'document_id is required' };
    const { data, error } = await supabase
      .from('document_instances')
      .select('id, status, created_at, data')
      .eq('id', documentId)
      .eq('clinic_id', clinicId)
      .single();
    if (error || !data) return { error: 'Document not found' };

    return {
      id: data.id,
      template_name: data.data?.templateName || null,
      status: data.status,
      created_at: data.created_at,
      patient: data.data?.variables?.clientFullName || null,
      responsible: data.data?.variables?.responsibleName || null,
      fields: buildFieldSummary(data.data?.schema, data.data?.values),
    };
  },

  get_financial_summary: async (supabase, clinicId, input) => {
    if (!input?.start_date || !input?.end_date) return { error: 'start_date and end_date are required' };
    const { start, end } = resolveDateRange(input.start_date, input.end_date);

    const [{ data: payments, error: paymentsError }, { data: expenses, error: expensesError }] = await Promise.all([
      supabase
        .from('payments')
        .select('amount, method')
        .eq('clinic_id', clinicId)
        .gte('payment_date', start)
        .lte('payment_date', end),
      supabase
        .from('expenses')
        .select('amount, category, payment_method')
        .eq('clinic_id', clinicId)
        .gte('date', start.slice(0, 10))
        .lte('date', end.slice(0, 10)),
    ]);
    if (paymentsError) return { error: paymentsError.message };
    if (expensesError) return { error: expensesError.message };

    const isTangibleRevenue = (method) => method !== 'balance' && method !== 'adjustment';
    const totalRevenue = (payments || [])
      .filter((p) => isTangibleRevenue(p.method))
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const totalCash = (payments || []).filter((p) => p.method === 'cash').reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const totalIntangible = (payments || [])
      .filter((p) => p.method !== 'cash' && !['balance', 'adjustment'].includes(p.method))
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const totalExpenses = (expenses || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);
    // Only expenses actually paid out of the physical register affect the cash-drawer
    // figure — a big non-cash expense (e.g. an INFONAVIT payment via bank transfer)
    // must not deflate amount_in_cashier just because it happened the same period.
    const totalCashExpenses = (expenses || [])
      .filter((e) => (e.payment_method || 'cash') === 'cash')
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);

    const revenueByMethod = {};
    const paymentCountByMethod = {};
    (payments || []).forEach((p) => {
      revenueByMethod[p.method] = (revenueByMethod[p.method] || 0) + Number(p.amount || 0);
      paymentCountByMethod[p.method] = (paymentCountByMethod[p.method] || 0) + 1;
    });
    const totalPaymentCount = (payments || []).length;
    // Percentages computed here, not left for the model to derive — do not recompute these.
    const paymentMethodBreakdown = Object.keys(revenueByMethod)
      .map((method) => ({
        method,
        amount: revenueByMethod[method],
        count: paymentCountByMethod[method],
        percent_of_payment_count: totalPaymentCount ? Number(((paymentCountByMethod[method] / totalPaymentCount) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const expensesByCategory = {};
    (expenses || []).forEach((e) => {
      const key = e.category || 'uncategorized';
      expensesByCategory[key] = (expensesByCategory[key] || 0) + Number(e.amount || 0);
    });
    const expenseCategoryBreakdown = Object.keys(expensesByCategory)
      .map((category) => ({
        category,
        amount: expensesByCategory[category],
        percent_of_expenses: totalExpenses ? Number(((expensesByCategory[category] / totalExpenses) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const expensesByPaymentMethod = {};
    (expenses || []).forEach((e) => {
      const key = e.payment_method || 'cash';
      expensesByPaymentMethod[key] = (expensesByPaymentMethod[key] || 0) + Number(e.amount || 0);
    });
    const expensePaymentMethodBreakdown = Object.keys(expensesByPaymentMethod)
      .map((method) => ({
        method,
        amount: expensesByPaymentMethod[method],
        percent_of_expenses: totalExpenses ? Number(((expensesByPaymentMethod[method] / totalExpenses) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      range: { start, end },
      total_revenue: totalRevenue,
      total_cash: totalCash,
      total_intangible: totalIntangible,
      total_expenses: totalExpenses,
      total_cash_expenses: totalCashExpenses,
      // Physical cash-drawer reconciliation: cash revenue minus only cash-paid expenses.
      // This is NOT total_cash minus total_expenses — non-cash expenses (card/transfer/
      // cheque, e.g. a bank-transferred INFONAVIT payment) never touch the drawer.
      amount_in_cashier: totalCash - totalCashExpenses,
      net_profit: totalRevenue - totalExpenses,
      total_payment_count: totalPaymentCount,
      // Already-computed percentages — use these values verbatim, do not recompute.
      payment_method_breakdown: paymentMethodBreakdown,
      expense_category_breakdown: expenseCategoryBreakdown,
      expense_payment_method_breakdown: expensePaymentMethodBreakdown,
      revenue_by_method: revenueByMethod,
      expenses_by_category: expensesByCategory,
    };
  },

  list_payments: async (supabase, clinicId, input) => {
    const { start, end, span } = resolveDateRange(input?.start_date, input?.end_date);
    const { limit, offset, policy } = resolvePagination({
      requestedLimit: input?.limit,
      requestedOffset: input?.offset,
      spanKind: span.kind,
      baseDefaultLimit: DEFAULT_LIST_LIMIT,
      baseMaxLimit: BASE_LEDGER_LIMIT,
      hardMaxLimit: HARD_MAX_LEDGER_LIMIT,
    });

    let query = supabase
      .from('payments')
      .select('id, amount, method, description, payment_date, facturado, iva_amount, invoice_state, refund_amount, refunded_at, appointment_id, clients(first_name, last_name), profiles:received_by(first_name, last_name)')
      .eq('clinic_id', clinicId)
      .gte('payment_date', start)
      .lte('payment_date', end)
      .order('payment_date', { ascending: false })
      .range(offset, offset + limit - 1);
    if (input?.client_id) query = query.eq('client_id', input.client_id);
    if (input?.method) query = query.eq('method', input.method);
    if (input?.standalone_only) query = query.is('appointment_id', null);

    const { data, error } = await query;
    if (error) return { error: error.message };
    const rows = data || [];
    const totalMatching = null;
    const pagination = buildPaginationMeta({ offset, limit, totalMatching, returnedCount: rows.length });
    return {
      range: { start, end, span_kind: span.kind, span_days: span.day_span },
      total_matching: totalMatching,
      truncated: pagination.has_more,
      pagination,
      limit_policy: policy,
      payments: rows.map((p) => ({
        id: p.id,
        amount: p.amount,
        method: p.method,
        description: p.description,
        payment_date: p.payment_date,
        facturado: p.facturado,
        iva_amount: p.iva_amount,
        invoice_state: p.invoice_state,
        refund_amount: p.refund_amount,
        refunded_at: p.refunded_at,
        standalone: !p.appointment_id,
        appointment_id: p.appointment_id,
        client: fullName(p.clients),
        received_by: fullName(p.profiles),
      })),
    };
  },

  list_expenses: async (supabase, clinicId, input) => {
    const { start, end, span } = resolveDateRange(input?.start_date, input?.end_date);
    const { limit, offset, policy } = resolvePagination({
      requestedLimit: input?.limit,
      requestedOffset: input?.offset,
      spanKind: span.kind,
      baseDefaultLimit: DEFAULT_LIST_LIMIT,
      baseMaxLimit: BASE_LEDGER_LIMIT,
      hardMaxLimit: HARD_MAX_LEDGER_LIMIT,
    });

    let query = supabase
      .from('expenses')
      .select('id, amount, description, category, date, payment_method, therapists(first_name, last_name), suppliers(name), profiles:recorded_by(first_name, last_name)')
      .eq('clinic_id', clinicId)
      .gte('date', start.slice(0, 10))
      .lte('date', end.slice(0, 10))
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1);
    if (input?.category) query = query.eq('category', input.category);
    if (input?.therapist_id) query = query.eq('therapist_id', input.therapist_id);
    if (input?.payment_method) query = query.eq('payment_method', input.payment_method);

    const { data, error } = await query;
    if (error) return { error: error.message };
    const rows = data || [];
    const totalMatching = null;
    const pagination = buildPaginationMeta({ offset, limit, totalMatching, returnedCount: rows.length });
    return {
      range: { start, end, span_kind: span.kind, span_days: span.day_span },
      total_matching: totalMatching,
      truncated: pagination.has_more,
      pagination,
      limit_policy: policy,
      expenses: rows.map((e) => ({
        id: e.id,
        amount: e.amount,
        description: e.description,
        category: e.category,
        date: e.date,
        payment_method: e.payment_method || 'cash',
        therapist: fullName(e.therapists),
        supplier: e.suppliers?.name || null,
        recorded_by: fullName(e.profiles),
      })),
    };
  },

  get_payroll_summary: async (supabase, clinicId, input) => {
    let startDate;
    let endDate;
    if (input?.start_date && input?.end_date) {
      const parsedStart = parseDateOrNull(input.start_date);
      const parsedEnd = parseDateOrNull(input.end_date);
      if (!parsedStart || !parsedEnd) return { error: 'Invalid start_date or end_date' };
      startDate = parsedStart;
      endDate = parsedEnd;
    } else {
      const current = resolveCurrentPayPeriod();
      startDate = current.startDate;
      endDate = current.endDate;
    }
    if (startDate.getTime() > endDate.getTime()) {
      const tmp = startDate;
      startDate = endDate;
      endDate = tmp;
    }
    const maxSpanMs = MAX_DATE_RANGE_DAYS * 24 * 60 * 60 * 1000;
    if (endDate.getTime() - startDate.getTime() > maxSpanMs) {
      startDate = new Date(endDate.getTime() - maxSpanMs);
    }

    const quarter = getPayrollQuarterRange(startDate);

    let apptQuery = supabase
      .from('appointments')
      .select(`
        therapist_id, payment_amount, pay_therapist_in_full,
        therapists ( id, first_name, last_name, compensation_type, commission_percentage, fixed_session_amount, retention_enabled, retention_rate, incentive_enabled, incentive_threshold_sessions, incentive_percentage_bonus, incentive_fixed_bonus ),
        payments ( amount, facturado, iva_amount ),
        payroll_compensation_type, payroll_commission_percentage, payroll_fixed_session_amount, payroll_retention_enabled, payroll_retention_rate, payroll_incentive_enabled, payroll_incentive_threshold_sessions, payroll_incentive_percentage_bonus, payroll_incentive_fixed_bonus, payroll_snapshot_at
      `)
      .eq('clinic_id', clinicId)
      .eq('status', 'completed')
      .gte('start_time', startOfDayIso(startDate))
      .lte('start_time', endOfDayIso(endDate));
    if (input?.therapist_id) apptQuery = apptQuery.eq('therapist_id', input.therapist_id);

    const { data: appointments, error } = await apptQuery;
    if (error) return { error: error.message };

    const { data: quarterAppointments, error: quarterError } = await supabase
      .from('appointments')
      .select('therapist_id')
      .eq('clinic_id', clinicId)
      .eq('status', 'completed')
      .gte('start_time', startOfDayIso(quarter.startDate))
      .lte('start_time', endOfDayIso(quarter.endDate));
    if (quarterError) return { error: quarterError.message };

    const quarterSessionsByTherapist = {};
    (quarterAppointments || []).forEach((a) => {
      quarterSessionsByTherapist[a.therapist_id] = (quarterSessionsByTherapist[a.therapist_id] || 0) + 1;
    });

    const statsByTherapist = {};
    (appointments || []).forEach((appointment) => {
      const therapistId = appointment.therapist_id;
      const therapist = appointment.therapists;
      const quarterSessions = quarterSessionsByTherapist[therapistId] || 0;
      const liveConfig = {
        compensationType: therapist?.compensation_type,
        commissionPercentage: therapist?.commission_percentage,
        fixedSessionAmount: therapist?.fixed_session_amount,
        retentionEnabled: therapist?.retention_enabled,
        retentionRate: therapist?.retention_rate,
        incentiveEnabled: therapist?.incentive_enabled,
        incentiveThresholdSessions: therapist?.incentive_threshold_sessions,
        incentivePercentageBonus: therapist?.incentive_percentage_bonus,
        incentiveFixedBonus: therapist?.incentive_fixed_bonus,
      };
      const appointmentConfig = resolveAppointmentPayrollConfig(appointment, liveConfig);
      const paymentSummary = summarizeAppointmentPayments({
        payment_amount: appointment.payment_amount,
        payments: appointment.payments || [],
      });
      const payInFull = !!appointment.pay_therapist_in_full;
      const computed = computeTherapistPayroll({
        periodSessions: 1,
        periodPreIvaRevenue: paymentSummary.preIvaRevenue,
        quarterSessions,
        config: appointmentConfig,
        payInFull,
      });

      if (!statsByTherapist[therapistId]) {
        statsByTherapist[therapistId] = {
          id: therapistId,
          name: fullName(therapist),
          compensation_type: normalizeCompensationType(liveConfig.compensationType),
          total_appointments: 0,
          pay_in_full_appointments: 0,
          total_revenue_pre_iva: 0,
          gross_earnings: 0,
          retention_amount: 0,
          net_earnings: 0,
          clinic_earnings: 0,
        };
      }
      const s = statsByTherapist[therapistId];
      s.total_appointments += 1;
      if (payInFull) s.pay_in_full_appointments += 1;
      s.total_revenue_pre_iva += paymentSummary.preIvaRevenue;
      s.gross_earnings += computed.grossEarnings;
      s.retention_amount += computed.retentionAmount;
      s.net_earnings += computed.netEarnings;
      s.clinic_earnings += computed.clinicEarnings;
    });

    const { data: expenseRows, error: expenseError } = await supabase
      .from('expenses')
      .select('therapist_id, amount')
      .eq('clinic_id', clinicId)
      .not('therapist_id', 'is', null)
      .gte('date', toDateOnly(startDate))
      .lte('date', toDateOnly(endDate));
    if (expenseError) return { error: expenseError.message };
    const expensesByTherapist = {};
    (expenseRows || []).forEach((e) => {
      expensesByTherapist[e.therapist_id] = (expensesByTherapist[e.therapist_id] || 0) + Number(e.amount || 0);
    });

    const therapists = Object.values(statsByTherapist)
      .map((s) => {
        const attributedExpenses = Number(expensesByTherapist[s.id] || 0);
        const payInFullPercentage = s.total_appointments
          ? Number(((s.pay_in_full_appointments / s.total_appointments) * 100).toFixed(1))
          : 0;
        const retentionEffect = describeRetentionEffect(s.retention_amount);
        return {
          ...s,
          pay_in_full_percentage: payInFullPercentage,
          retention_effect: retentionEffect,
          attributed_expenses: attributedExpenses,
          net_payable: s.net_earnings - attributedExpenses,
        };
      })
      .slice(0, 20);

    const completedAppointments = (appointments || []).length;
    const paidInFullAppointments = (appointments || []).reduce(
      (sum, appointment) => sum + (appointment.pay_therapist_in_full ? 1 : 0),
      0,
    );
    const paidInFullPercentage = completedAppointments
      ? Number(((paidInFullAppointments / completedAppointments) * 100).toFixed(1))
      : 0;

    return {
      period: { start: toDateOnly(startDate), end: toDateOnly(endDate) },
      payroll_rules: PAYROLL_RULES_NOTE,
      paid_in_full_overview: {
        completed_appointments: completedAppointments,
        paid_in_full_appointments: paidInFullAppointments,
        paid_in_full_percentage: paidInFullPercentage,
        definition: PAYROLL_RULES_NOTE.pay_therapist_in_full,
      },
      therapists,
    };
  },

  list_therapist_payouts: async (supabase, clinicId, input) => {
    const { start, end, span } = resolveDateRange(input?.start_date, input?.end_date);
    const { limit, offset, policy } = resolvePagination({
      requestedLimit: input?.limit,
      requestedOffset: input?.offset,
      spanKind: span.kind,
      baseDefaultLimit: DEFAULT_LIST_LIMIT,
      baseMaxLimit: BASE_PAYOUT_LIMIT,
      hardMaxLimit: HARD_MAX_PAYOUT_LIMIT,
    });

    let query = supabase
      .from('therapist_payouts')
      .select('id, therapist_id, period_start, period_end, payout_date, amount, payment_method, status, notes, therapists(first_name, last_name)')
      .eq('clinic_id', clinicId)
      .gte('payout_date', start.slice(0, 10))
      .lte('payout_date', end.slice(0, 10))
      .order('payout_date', { ascending: false })
      .range(offset, offset + limit - 1);
    if (input?.therapist_id) query = query.eq('therapist_id', input.therapist_id);

    const { data, error } = await query;
    if (error) return { error: error.message };
    const rows = data || [];
    const totalMatching = null;
    const pagination = buildPaginationMeta({ offset, limit, totalMatching, returnedCount: rows.length });
    return {
      range: { start, end, span_kind: span.kind, span_days: span.day_span },
      total_matching: totalMatching,
      truncated: pagination.has_more,
      pagination,
      limit_policy: policy,
      payouts: rows.map((p) => ({
        id: p.id,
        therapist: fullName(p.therapists),
        period_start: p.period_start,
        period_end: p.period_end,
        payout_date: p.payout_date,
        amount: p.amount,
        payment_method: p.payment_method,
        status: p.status,
        notes: p.notes,
      })),
    };
  },

  get_appointments_overview: async (supabase, clinicId, input, clinicTimezone) => {
    const { start, end, span } = resolveDateRange(input?.start_date, input?.end_date);
    const timezone = clinicTimezone || 'UTC';
    const rows = [];
    const targetRows = Math.min(OVERVIEW_HARD_SCAN_MAX, OVERVIEW_TARGET_ROWS_BY_SPAN[span.kind] || OVERVIEW_TARGET_ROWS_BY_SPAN.long);
    const pageSize = Math.min(OVERVIEW_PAGE_SIZE, targetRows);
    let hasMoreRows = false;
    let offset = 0;
    let pagesFetched = 0;
    let queryError = null;
    let lastPageWasFull = false;

    while (offset < targetRows && pagesFetched < OVERVIEW_MAX_PAGES) {
      const to = Math.min(offset + pageSize - 1, targetRows - 1);
      const { data, error } = await supabase
        .from('appointments')
        .select('start_time, status')
        .eq('clinic_id', clinicId)
        .gte('start_time', start)
        .lte('start_time', end)
        .order('start_time', { ascending: true })
        .range(offset, to);

      if (error) {
        queryError = error;
        break;
      }

      const pageRows = data || [];
      if (pageRows.length === 0) break;
      lastPageWasFull = pageRows.length === pageSize;

      const remainingSlots = targetRows - rows.length;
      rows.push(...pageRows.slice(0, remainingSlots));
      pagesFetched += 1;
      if (pageRows.length < pageSize || rows.length >= targetRows) break;
      offset += pageRows.length;
    }

    if (queryError) return { error: queryError.message };
    const hitPageBudget = pagesFetched >= OVERVIEW_MAX_PAGES && offset < targetRows;
    const hitRowBudget = rows.length >= targetRows;

    // Cheap one-row probe when we stopped on a full page to confirm whether more
    // appointments exist, without paying for a full exact COUNT on every call.
    if (!hitPageBudget && !hitRowBudget && lastPageWasFull && rows.length > 0) {
      const { data: probeRows, error: probeError } = await supabase
        .from('appointments')
        .select('start_time')
        .eq('clinic_id', clinicId)
        .gte('start_time', start)
        .lte('start_time', end)
        .order('start_time', { ascending: true })
        .range(rows.length, rows.length);
      if (probeError) return { error: probeError.message };
      hasMoreRows = (probeRows || []).length > 0;
    } else {
      hasMoreRows = hitPageBudget || hitRowBudget;
    }

    const byStatus = {};
    const byDay = {};
    rows.forEach((a) => {
      byStatus[a.status] = (byStatus[a.status] || 0) + 1;
      // Bucket by the CLINIC'S LOCAL calendar day, not the raw UTC date — an evening
      // appointment can fall on a different UTC date than the local date it belongs to.
      const { date: day, weekday } = localDateAndWeekday(a.start_time, timezone);
      if (!byDay[day]) byDay[day] = { date: day, weekday, completed: 0, cancelled: 0, no_show: 0, scheduled: 0, other: 0, total_appointments: 0 };
      const bucket = byDay[day];
      bucket.total_appointments += 1;
      if (Object.prototype.hasOwnProperty.call(bucket, a.status)) bucket[a.status] += 1;
      else bucket.other += 1;
    });

    const dailyBreakdown = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
    const busiestCompletedDay = dailyBreakdown.reduce((best, d) => (!best || d.completed > best.completed ? d : best), null);
    const truncated = hasMoreRows;
    const spanPolicy = RANGE_LIMIT_MULTIPLIERS[span.kind] || RANGE_LIMIT_MULTIPLIERS.long;
    const warningReasons = [];
    if (hitRowBudget) warningReasons.push(`row safety target (${targetRows}) reached`);
    if (hitPageBudget) warningReasons.push(`page safety cap (${OVERVIEW_MAX_PAGES}) reached`);
    if (!hitPageBudget && !hitRowBudget && hasMoreRows) warningReasons.push('additional matching rows detected beyond scanned window');

    return {
      range: { start, end, span_kind: span.kind, span_days: span.day_span },
      timezone,
      total_matching: truncated ? null : rows.length,
      truncated,
      warning: truncated
        ? `Overview is partial: ${warningReasons.join(' and ') || 'not all matching rows were scanned'}. Narrow the date range for exhaustive coverage.`
        : undefined,
      range_policy: {
        should_fully_aggregate: spanPolicy.shouldFullyAggregate,
      },
      counts_by_status: byStatus,
      // "weekday" and "date" here are already computed correctly in the clinic's local
      // timezone — always use these values verbatim rather than computing/guessing the
      // day of week from the date yourself; that computation is unreliable for you.
      daily_breakdown: dailyBreakdown,
      busiest_completed_day: busiestCompletedDay,
    };
  },

  list_appointments: async (supabase, clinicId, input, clinicTimezone) => {
    const timezone = clinicTimezone || 'UTC';
    let startDateInput = input?.start_date;
    let endDateInput = input?.end_date;
    if (!startDateInput && !endDateInput) {
      const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
      const bounds = clinicLocalDayBoundsUtc(todayStr, timezone);
      startDateInput = bounds.startUtcIso;
      endDateInput = bounds.endUtcIso;
    }
    const { start, end, span } = resolveDateRange(startDateInput, endDateInput);
    const { limit, offset, policy } = resolvePagination({
      requestedLimit: input?.limit,
      requestedOffset: input?.offset,
      spanKind: span.kind,
      baseDefaultLimit: DEFAULT_LIST_LIMIT,
      baseMaxLimit: BASE_APPOINTMENTS_LIMIT,
      hardMaxLimit: HARD_MAX_APPOINTMENTS_LIMIT,
    });

    let query = supabase
      .from('appointments')
      .select('id, start_time, end_time, status, payment_amount, payment_status, pay_therapist_in_full, clients(first_name, last_name), therapists(first_name, last_name), treatments(name)')
      .eq('clinic_id', clinicId)
      .gte('start_time', start)
      .lte('start_time', end)
      .order('start_time', { ascending: true })
      .range(offset, offset + limit - 1);
    if (input?.therapist_id) query = query.eq('therapist_id', input.therapist_id);
    if (input?.status) query = query.eq('status', input.status);

    const { data, error } = await query;
    if (error) return { error: error.message };
    const rows = data || [];
    const totalMatching = null;
    const pagination = buildPaginationMeta({ offset, limit, totalMatching, returnedCount: rows.length });

    return {
      range: { start, end, span_kind: span.kind, span_days: span.day_span },
      timezone,
      total_matching: totalMatching,
      truncated: pagination.has_more,
      pagination,
      limit_policy: policy,
      warning: pagination.has_more
        ? `Only ${rows.length} appointments are shown from offset ${offset}. Paginate for more rows before summarizing the full range.`
        : undefined,
      appointments: rows.map((a) => ({
        id: a.id,
        patient: fullName(a.clients),
        therapist: fullName(a.therapists),
        treatment: a.treatments?.name || null,
        status: a.status,
        payment_amount: a.payment_amount,
        payment_status: a.payment_status,
        pay_therapist_in_full: !!a.pay_therapist_in_full,
        start_time_local: localDateTime(a.start_time, timezone),
        end_time_local: localDateTime(a.end_time, timezone),
      })),
    };
  },

  get_activity_summary: async (supabase, clinicId, input, clinicTimezone) => {
    const { start, end, span } = resolveDateRange(input?.start_date, input?.end_date);
    const timezone = clinicTimezone || 'UTC';
    const rows = [];
    const targetRows = Math.min(OVERVIEW_HARD_SCAN_MAX, OVERVIEW_TARGET_ROWS_BY_SPAN[span.kind] || OVERVIEW_TARGET_ROWS_BY_SPAN.long);
    const pageSize = Math.min(OVERVIEW_PAGE_SIZE, targetRows);
    let hasMoreRows = false;
    let offset = 0;
    let pagesFetched = 0;
    let queryError = null;
    let lastPageWasFull = false;

    while (offset < targetRows && pagesFetched < OVERVIEW_MAX_PAGES) {
      const to = Math.min(offset + pageSize - 1, targetRows - 1);
      const { data, error } = await supabase
        .from('activity_log')
        .select('entity_type, action_type, created_at')
        .eq('clinic_id', clinicId)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: true })
        .range(offset, to);

      if (error) {
        queryError = error;
        break;
      }

      const pageRows = data || [];
      if (pageRows.length === 0) break;
      lastPageWasFull = pageRows.length === pageSize;

      const remainingSlots = targetRows - rows.length;
      rows.push(...pageRows.slice(0, remainingSlots));
      pagesFetched += 1;
      if (pageRows.length < pageSize || rows.length >= targetRows) break;
      offset += pageRows.length;
    }

    if (queryError) return { error: queryError.message };
    const hitPageBudget = pagesFetched >= OVERVIEW_MAX_PAGES && offset < targetRows;
    const hitRowBudget = rows.length >= targetRows;

    // Cheap one-row probe when we stopped on a full page to confirm whether more
    // entries exist, without paying for a full exact COUNT on every call.
    if (!hitPageBudget && !hitRowBudget && lastPageWasFull && rows.length > 0) {
      const { data: probeRows, error: probeError } = await supabase
        .from('activity_log')
        .select('id')
        .eq('clinic_id', clinicId)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: true })
        .range(rows.length, rows.length);
      if (probeError) return { error: probeError.message };
      hasMoreRows = (probeRows || []).length > 0;
    } else {
      hasMoreRows = hitPageBudget || hitRowBudget;
    }

    const byEntityType = {};
    const byActionType = {};
    const byDay = {};
    rows.forEach((entry) => {
      byEntityType[entry.entity_type] = (byEntityType[entry.entity_type] || 0) + 1;
      byActionType[entry.action_type] = (byActionType[entry.action_type] || 0) + 1;
      // Bucket by the CLINIC'S LOCAL calendar day, not the raw UTC date — same reasoning
      // as get_appointments_overview's daily_breakdown.
      const { date: day, weekday } = localDateAndWeekday(entry.created_at, timezone);
      if (!byDay[day]) byDay[day] = { date: day, weekday, total_events: 0, by_entity_type: {} };
      const bucket = byDay[day];
      bucket.total_events += 1;
      bucket.by_entity_type[entry.entity_type] = (bucket.by_entity_type[entry.entity_type] || 0) + 1;
    });

    const dailyBreakdown = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
    const busiestDay = dailyBreakdown.reduce((best, d) => (!best || d.total_events > best.total_events ? d : best), null);
    const truncated = hasMoreRows;
    const warningReasons = [];
    if (hitRowBudget) warningReasons.push(`row safety target (${targetRows}) reached`);
    if (hitPageBudget) warningReasons.push(`page safety cap (${OVERVIEW_MAX_PAGES}) reached`);
    if (!hitPageBudget && !hitRowBudget && hasMoreRows) warningReasons.push('additional matching rows detected beyond scanned window');

    return {
      range: { start, end, span_kind: span.kind, span_days: span.day_span },
      timezone,
      total_matching: truncated ? null : rows.length,
      truncated,
      warning: truncated
        ? `Activity summary is partial: ${warningReasons.join(' and ') || 'not all matching rows were scanned'}. Narrow the date range for exhaustive coverage, or use search_activity_log to inspect specific events.`
        : undefined,
      counts_by_entity_type: byEntityType,
      counts_by_action_type: byActionType,
      // "weekday" here is already computed correctly in the clinic's local timezone —
      // always use it verbatim rather than computing/guessing the day of week yourself.
      daily_breakdown: dailyBreakdown,
      busiest_day: busiestDay,
    };
  },

  search_activity_log: async (supabase, clinicId, input, clinicTimezone) => {
    const timezone = clinicTimezone || 'UTC';
    const { start, end, span } = resolveDateRange(input?.start_date, input?.end_date);
    const { limit, offset, policy } = resolvePagination({
      requestedLimit: input?.limit,
      requestedOffset: input?.offset,
      spanKind: span.kind,
      baseDefaultLimit: DEFAULT_LIST_LIMIT,
      baseMaxLimit: BASE_LEDGER_LIMIT,
      hardMaxLimit: HARD_MAX_LEDGER_LIMIT,
    });

    let query = supabase
      .from('activity_log')
      .select('id, description, action_type, entity_type, entity_id, metadata, user_email, created_at')
      .eq('clinic_id', clinicId)
      .gte('created_at', start)
      .lte('created_at', end)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (input?.entity_type) query = query.eq('entity_type', input.entity_type);

    const { data, error } = await query;
    if (error) return { error: error.message };
    const entries = data || [];
    const totalMatching = null;
    const pagination = buildPaginationMeta({ offset, limit, totalMatching, returnedCount: entries.length });
    const truncated = pagination.has_more;
    const appointmentIds = [...new Set(
      entries
        .filter((entry) => entry.entity_type === 'appointment' && entry.entity_id)
        .map((entry) => entry.entity_id),
    )];
    const appointmentStateById = {};
    const appointmentRecentActionsById = {};
    entries.forEach((entry) => {
      if (entry.entity_type !== 'appointment' || !entry.entity_id) return;
      if (!appointmentRecentActionsById[entry.entity_id]) appointmentRecentActionsById[entry.entity_id] = [];
      if (appointmentRecentActionsById[entry.entity_id].length < 5) {
        appointmentRecentActionsById[entry.entity_id].push(entry.action_type);
      }
    });

    if (appointmentIds.length > 0) {
      const { data: appointmentRows, error: appointmentRowsError } = await supabase
        .from('appointments')
        .select('id, status, payment_status, start_time, end_time, payment_amount, clients(first_name, last_name)')
        .eq('clinic_id', clinicId)
        .in('id', appointmentIds);
      if (appointmentRowsError) return { error: appointmentRowsError.message };
      (appointmentRows || []).forEach((appointment) => {
        appointmentStateById[appointment.id] = {
          exists: true,
          current_status: appointment.status,
          current_payment_status: appointment.payment_status,
          current_start_time: appointment.start_time,
          current_end_time: appointment.end_time,
          current_start_time_local: localDateTime(appointment.start_time, timezone),
          current_end_time_local: localDateTime(appointment.end_time, timezone),
          current_payment_amount: appointment.payment_amount,
          current_client: fullName(appointment.clients),
        };
      });
    }

    const mappedEntries = entries.map((entry) => {
      const isDocument = entry.entity_type === 'document';
      const isAppointment = entry.entity_type === 'appointment';
      const metadata = compactActivityMetadata(entry.metadata);
      const appointmentState = isAppointment && entry.entity_id
        ? (appointmentStateById[entry.entity_id] || { exists: false })
        : undefined;
      const appointmentRecentActions = isAppointment && entry.entity_id
        ? (appointmentRecentActionsById[entry.entity_id] || [])
        : undefined;
      return {
        id: entry.id,
        description: entry.description,
        action_type: entry.action_type,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id,
        metadata,
        user_email: entry.user_email,
        created_at: entry.created_at,
        created_at_local: localDateTime(entry.created_at, timezone),
        document_lookup: isDocument
          ? {
            can_open_directly: !!entry.entity_id,
            document_id: entry.entity_id || null,
          }
          : undefined,
        appointment_lookup: isAppointment
          ? {
            appointment_id: entry.entity_id || null,
            exists_in_current_table: !!appointmentState?.exists,
            current_state: appointmentState,
            recent_actions_for_same_appointment: appointmentRecentActions,
          }
          : undefined,
      };
    });

    return {
      range: { start, end, span_kind: span.kind, span_days: span.day_span },
      total_matching: totalMatching,
      truncated,
      pagination,
      limit_policy: policy,
      warning: truncated
        ? `Only ${entries.length} entries are shown from offset ${offset}. Paginate for more rows before inferring full-range patterns.`
        : undefined,
      timing_note: 'Use created_at_local and current_start_time_local/current_end_time_local verbatim for anything about when something happened — do not reformat or reinterpret created_at or current_start_time/current_end_time yourself.',
      entries: mappedEntries,
    };
  },

  get_therapist_summary: async (supabase, clinicId, input) => {
    const therapistId = input?.therapist_id;
    if (!therapistId) return { error: 'therapist_id is required' };
    const { start, end } = resolveDateRange(input?.start_date, input?.end_date);

    const { data: therapist, error: therapistError } = await supabase
      .from('therapists')
      .select('id, first_name, last_name')
      .eq('id', therapistId)
      .eq('clinic_id', clinicId)
      .single();
    if (therapistError || !therapist) return { error: 'Therapist not found' };

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('status, payment_amount')
      .eq('therapist_id', therapistId)
      .eq('clinic_id', clinicId)
      .gte('start_time', start)
      .lte('start_time', end);
    if (error) return { error: error.message };

    const byStatus = {};
    let revenue = 0;
    (appointments || []).forEach((a) => {
      byStatus[a.status] = (byStatus[a.status] || 0) + 1;
      if (a.status === 'completed') revenue += Number(a.payment_amount || 0);
    });

    return {
      therapist: fullName(therapist),
      range: { start, end },
      appointment_counts_by_status: byStatus,
      completed_revenue: revenue,
    };
  },

  get_therapist_compensation_config: async (supabase, clinicId, input) => {
    let query = supabase
      .from('therapists')
      .select('id, first_name, last_name, archived, is_active, compensation_type, commission_percentage, fixed_session_amount, retention_enabled, retention_rate, incentive_enabled, incentive_threshold_sessions, incentive_percentage_bonus, incentive_fixed_bonus')
      .eq('clinic_id', clinicId);
    if (input?.therapist_id) {
      query = query.eq('id', input.therapist_id);
    } else {
      query = query.order('first_name', { ascending: true }).limit(100);
    }

    const { data, error } = await query;
    if (error) return { error: error.message };
    if (!data || data.length === 0) return { error: 'Therapist not found' };

    const configs = data.map((t) => {
      const compensationType = normalizeCompensationType(t.compensation_type);
      const retentionRate = t.retention_enabled ? Number(t.retention_rate || 0) : null;
      return {
        id: t.id,
        name: fullName(t),
        archived: !!t.archived,
        is_active: t.is_active,
        compensation_type: compensationType,
        commission_percentage: compensationType === 'percentage' ? Number(t.commission_percentage || 0) : null,
        fixed_session_amount: compensationType === 'fixed_per_session' ? Number(t.fixed_session_amount || 0) : null,
        retention_enabled: !!t.retention_enabled,
        retention_rate: retentionRate,
        retention_effect: t.retention_enabled ? describeRetentionEffect(retentionRate) : 'no_effect',
        incentive_enabled: !!t.incentive_enabled,
        incentive_threshold_sessions: t.incentive_enabled ? t.incentive_threshold_sessions : null,
        incentive_percentage_bonus: t.incentive_enabled && compensationType === 'percentage' ? Number(t.incentive_percentage_bonus || 0) : null,
        incentive_fixed_bonus: t.incentive_enabled && compensationType === 'fixed_per_session' ? Number(t.incentive_fixed_bonus || 0) : null,
      };
    });

    return {
      payroll_rules: PAYROLL_RULES_NOTE,
      therapists: input?.therapist_id ? configs[0] : configs,
    };
  },

  search_therapists: async (supabase, clinicId, input) => {
    const query = String(input?.query || '').trim();
    if (!query) return { error: 'query is required' };
    const { data, error } = await supabase
      .from('therapists')
      .select('id, first_name, last_name, specialties')
      .eq('clinic_id', clinicId)
      .eq('archived', false)
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
      .limit(DEFAULT_LIST_LIMIT);
    if (error) return { error: error.message };
    return { therapists: (data || []).map((t) => ({ id: t.id, name: fullName(t), specialties: t.specialties })) };
  },

  search_treatments: async (supabase, clinicId, input) => {
    const query = String(input?.query || '').trim();
    if (!query) return { error: 'query is required' };
    const { data, error } = await supabase
      .from('treatments')
      .select('id, name, price, duration_minutes')
      .eq('clinic_id', clinicId)
      .eq('is_active', true)
      .ilike('name', `%${query}%`)
      .limit(DEFAULT_LIST_LIMIT);
    if (error) return { error: error.message };
    return { treatments: data || [] };
  },
};

module.exports = { toolDefinitions, toolHandlers, buildFieldSummary, computeClientBalance };
