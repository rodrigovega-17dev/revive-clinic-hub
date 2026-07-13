/**
 * Read-only tool set for the AI Clinic Chat feature. Every handler receives the
 * clinic_id resolved server-side from the caller's JWT (never trust one from the
 * model's tool input) and only ever runs `.select()` queries — no handler here may
 * insert/update/delete anything.
 */

const DEFAULT_LIST_LIMIT = 10;
const MAX_APPOINTMENTS_LIMIT = 50;
const MAX_LEDGER_LIMIT = 30;
const MAX_DATE_RANGE_DAYS = 366;

const clampLimit = (requested, max) => {
  const n = Number(requested);
  if (!Number.isFinite(n) || n <= 0) return Math.min(DEFAULT_LIST_LIMIT, max);
  return Math.min(Math.floor(n), max);
};

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

/** Clamp a [start,end] range to MAX_DATE_RANGE_DAYS, defaulting to the last 90 days. */
const resolveDateRange = (startDate, endDate) => {
  const end = endDate ? new Date(endDate) : new Date();
  const defaultStart = new Date(end);
  defaultStart.setDate(defaultStart.getDate() - 90);
  const start = startDate ? new Date(startDate) : defaultStart;

  const maxSpanMs = MAX_DATE_RANGE_DAYS * 24 * 60 * 60 * 1000;
  const clampedStart = end.getTime() - start.getTime() > maxSpanMs
    ? new Date(end.getTime() - maxSpanMs)
    : start;

  return { start: clampedStart.toISOString(), end: end.toISOString() };
};

const fullName = (row) => `${row?.first_name || ''} ${row?.last_name || ''}`.trim() || null;

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
    name: 'search_clients',
    description: 'Search the clinic\'s patients by name, email, or phone. Returns up to 10 matches.',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Name, email, or phone fragment to search for.' } },
      required: ['query'],
    },
  },
  {
    name: 'get_client_details',
    description: 'Full profile for one patient, including their current balance (positive = credit, negative = owed).',
    input_schema: {
      type: 'object',
      properties: { client_id: { type: 'string', description: 'The patient id, from search_clients.' } },
      required: ['client_id'],
    },
  },
  {
    name: 'get_client_appointments',
    description: 'A patient\'s appointment history (defaults to the last 90 days if no dates given).',
    input_schema: {
      type: 'object',
      properties: {
        client_id: { type: 'string' },
        start_date: { type: 'string', description: 'ISO date, e.g. 2026-01-01.' },
        end_date: { type: 'string', description: 'ISO date, e.g. 2026-12-31.' },
        limit: { type: 'number', description: 'Max rows to return, up to 50.' },
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
      properties: { document_id: { type: 'string', description: 'From get_client_documents.' } },
      required: ['document_id'],
    },
  },
  {
    name: 'get_financial_summary',
    description: 'Revenue and expense totals for a date range (max 366 days), broken down by payment method and expense category. Use list_payments/list_expenses for individual transactions.',
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
    description: 'Individual payment records for a date range (defaults to the last 90 days), optionally filtered by patient, payment method, or standalone-only (not tied to an appointment). Returns up to 30 rows.',
    input_schema: {
      type: 'object',
      properties: {
        start_date: { type: 'string', description: 'ISO date.' },
        end_date: { type: 'string', description: 'ISO date.' },
        client_id: { type: 'string', description: 'From search_clients, to filter to one patient.' },
        method: { type: 'string', description: 'One of: cash, card, transfer, cheque, insurance, balance, adjustment.' },
        standalone_only: { type: 'boolean', description: 'If true, only payments not tied to an appointment (manual finance movements).' },
        limit: { type: 'number', description: 'Max rows, up to 30.' },
      },
    },
  },
  {
    name: 'list_expenses',
    description: 'Individual expense records for a date range (defaults to the last 90 days), optionally filtered by category or attributed therapist. Returns up to 30 rows.',
    input_schema: {
      type: 'object',
      properties: {
        start_date: { type: 'string', description: 'ISO date.' },
        end_date: { type: 'string', description: 'ISO date.' },
        category: { type: 'string', description: 'e.g. supplies, office, maintenance, utilities, equipment, marketing, travel, food, general, Payroll.' },
        therapist_id: { type: 'string', description: 'From search_therapists, to filter to expenses attributed to one therapist.' },
        limit: { type: 'number', description: 'Max rows, up to 30.' },
      },
    },
  },
  {
    name: 'get_payroll_summary',
    description: 'Computed payroll for one or all therapists over a pay period (defaults to the current semi-monthly period): gross earnings, retention withheld, net earnings, therapist-attributed expenses, and final net payable. This mirrors exactly what the Payroll page shows, including commission/fixed-fee compensation and incentive bonuses.',
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
    description: 'Already-paid-out payroll records (actual payouts registered on the Payroll page), optionally filtered by therapist. Defaults to the last 90 days.',
    input_schema: {
      type: 'object',
      properties: {
        therapist_id: { type: 'string', description: 'From search_therapists.' },
        start_date: { type: 'string', description: 'ISO date.' },
        end_date: { type: 'string', description: 'ISO date.' },
        limit: { type: 'number', description: 'Max rows, up to 20.' },
      },
    },
  },
  {
    name: 'search_activity_log',
    description: 'Recent clinic activity (appointments/clients/payments/documents changed), optionally filtered by category and date range. Returns the most recent rows only — check the response\'s truncated/total_matching fields before drawing any conclusion about patterns over the full date range (e.g. never claim activity was "concentrated on one day" from this tool alone; use get_financial_summary or get_payroll_summary for period-wide totals instead).',
    input_schema: {
      type: 'object',
      properties: {
        entity_type: { type: 'string', description: 'One of: appointment, client, payment, document.' },
        start_date: { type: 'string' },
        end_date: { type: 'string' },
        limit: { type: 'number', description: 'Max rows, up to 30. For a broad date range, prefer a narrower entity_type/date filter over relying on this being complete.' },
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
  search_clients: async (supabase, clinicId, input) => {
    const query = String(input?.query || '').trim();
    if (!query) return { error: 'query is required' };
    const { data, error } = await supabase
      .from('clients')
      .select('id, first_name, last_name, email, phone, is_active')
      .eq('clinic_id', clinicId)
      .eq('archived', false)
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
      .limit(DEFAULT_LIST_LIMIT);
    if (error) return { error: error.message };
    return { clients: (data || []).map((c) => ({ id: c.id, name: fullName(c), email: c.email, phone: c.phone, is_active: c.is_active })) };
  },

  get_client_details: async (supabase, clinicId, input) => {
    const clientId = input?.client_id;
    if (!clientId) return { error: 'client_id is required' };
    const { data: client, error } = await supabase
      .from('clients')
      .select('id, first_name, last_name, email, phone, birth_date, gender, address, medical_notes, tags, is_active')
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
      tags: client.tags,
      is_active: client.is_active,
      balance: balance.balance,
      balance_note: balance.balance >= 0 ? 'positive = credit in their favor' : 'negative = amount they owe',
    };
  },

  get_client_appointments: async (supabase, clinicId, input) => {
    const clientId = input?.client_id;
    if (!clientId) return { error: 'client_id is required' };
    const { start, end } = resolveDateRange(input?.start_date, input?.end_date);
    const limit = clampLimit(input?.limit, MAX_APPOINTMENTS_LIMIT);

    const { data, error, count } = await supabase
      .from('appointments')
      .select('id, start_time, end_time, status, payment_amount, payment_status, treatments(name), therapists(first_name, last_name)', { count: 'exact' })
      .eq('client_id', clientId)
      .eq('clinic_id', clinicId)
      .gte('start_time', start)
      .lte('start_time', end)
      .order('start_time', { ascending: false })
      .limit(limit);
    if (error) return { error: error.message };

    return {
      range: { start, end },
      total_matching: count ?? (data || []).length,
      truncated: (count ?? 0) > (data || []).length,
      appointments: (data || []).map((a) => ({
        id: a.id,
        start_time: a.start_time,
        end_time: a.end_time,
        status: a.status,
        payment_amount: a.payment_amount,
        payment_status: a.payment_status,
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
        .select('amount, category')
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

    const revenueByMethod = {};
    (payments || []).forEach((p) => {
      revenueByMethod[p.method] = (revenueByMethod[p.method] || 0) + Number(p.amount || 0);
    });
    const expensesByCategory = {};
    (expenses || []).forEach((e) => {
      const key = e.category || 'uncategorized';
      expensesByCategory[key] = (expensesByCategory[key] || 0) + Number(e.amount || 0);
    });

    return {
      range: { start, end },
      total_revenue: totalRevenue,
      total_cash: totalCash,
      total_intangible: totalIntangible,
      total_expenses: totalExpenses,
      net_profit: totalRevenue - totalExpenses,
      revenue_by_method: revenueByMethod,
      expenses_by_category: expensesByCategory,
    };
  },

  list_payments: async (supabase, clinicId, input) => {
    const { start, end } = resolveDateRange(input?.start_date, input?.end_date);
    const limit = clampLimit(input?.limit, MAX_LEDGER_LIMIT);

    let query = supabase
      .from('payments')
      .select('id, amount, method, description, payment_date, facturado, invoice_state, appointment_id, clients(first_name, last_name)', { count: 'exact' })
      .eq('clinic_id', clinicId)
      .gte('payment_date', start)
      .lte('payment_date', end)
      .order('payment_date', { ascending: false })
      .limit(limit);
    if (input?.client_id) query = query.eq('client_id', input.client_id);
    if (input?.method) query = query.eq('method', input.method);
    if (input?.standalone_only) query = query.is('appointment_id', null);

    const { data, error, count } = await query;
    if (error) return { error: error.message };
    return {
      range: { start, end },
      total_matching: count ?? (data || []).length,
      truncated: (count ?? 0) > (data || []).length,
      payments: (data || []).map((p) => ({
        id: p.id,
        amount: p.amount,
        method: p.method,
        description: p.description,
        payment_date: p.payment_date,
        facturado: p.facturado,
        invoice_state: p.invoice_state,
        standalone: !p.appointment_id,
        client: fullName(p.clients),
      })),
    };
  },

  list_expenses: async (supabase, clinicId, input) => {
    const { start, end } = resolveDateRange(input?.start_date, input?.end_date);
    const limit = clampLimit(input?.limit, MAX_LEDGER_LIMIT);

    let query = supabase
      .from('expenses')
      .select('id, amount, description, category, date, therapists(first_name, last_name), suppliers(name)', { count: 'exact' })
      .eq('clinic_id', clinicId)
      .gte('date', start.slice(0, 10))
      .lte('date', end.slice(0, 10))
      .order('date', { ascending: false })
      .limit(limit);
    if (input?.category) query = query.eq('category', input.category);
    if (input?.therapist_id) query = query.eq('therapist_id', input.therapist_id);

    const { data, error, count } = await query;
    if (error) return { error: error.message };
    return {
      range: { start, end },
      total_matching: count ?? (data || []).length,
      truncated: (count ?? 0) > (data || []).length,
      expenses: (data || []).map((e) => ({
        id: e.id,
        amount: e.amount,
        description: e.description,
        category: e.category,
        date: e.date,
        therapist: fullName(e.therapists),
        supplier: e.suppliers?.name || null,
      })),
    };
  },

  get_payroll_summary: async (supabase, clinicId, input) => {
    let startDate;
    let endDate;
    if (input?.start_date && input?.end_date) {
      startDate = new Date(input.start_date);
      endDate = new Date(input.end_date);
    } else {
      const current = resolveCurrentPayPeriod();
      startDate = current.startDate;
      endDate = current.endDate;
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
          total_revenue_pre_iva: 0,
          gross_earnings: 0,
          retention_amount: 0,
          net_earnings: 0,
          clinic_earnings: 0,
        };
      }
      const s = statsByTherapist[therapistId];
      s.total_appointments += 1;
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
        return { ...s, attributed_expenses: attributedExpenses, net_payable: s.net_earnings - attributedExpenses };
      })
      .slice(0, 20);

    return {
      period: { start: toDateOnly(startDate), end: toDateOnly(endDate) },
      therapists,
    };
  },

  list_therapist_payouts: async (supabase, clinicId, input) => {
    const { start, end } = resolveDateRange(input?.start_date, input?.end_date);
    const limit = clampLimit(input?.limit, 20);

    let query = supabase
      .from('therapist_payouts')
      .select('id, therapist_id, period_start, period_end, payout_date, amount, payment_method, status, notes, therapists(first_name, last_name)')
      .eq('clinic_id', clinicId)
      .gte('payout_date', start.slice(0, 10))
      .lte('payout_date', end.slice(0, 10))
      .order('payout_date', { ascending: false })
      .limit(limit);
    if (input?.therapist_id) query = query.eq('therapist_id', input.therapist_id);

    const { data, error } = await query;
    if (error) return { error: error.message };
    return {
      range: { start, end },
      payouts: (data || []).map((p) => ({
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

  search_activity_log: async (supabase, clinicId, input) => {
    const { start, end } = resolveDateRange(input?.start_date, input?.end_date);
    const limit = clampLimit(input?.limit, MAX_LEDGER_LIMIT);

    let query = supabase
      .from('activity_log')
      .select('description, action_type, entity_type, user_email, created_at', { count: 'exact' })
      .eq('clinic_id', clinicId)
      .gte('created_at', start)
      .lte('created_at', end)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (input?.entity_type) query = query.eq('entity_type', input.entity_type);

    const { data, error, count } = await query;
    if (error) return { error: error.message };
    const entries = data || [];
    const truncated = (count ?? 0) > entries.length;
    return {
      range: { start, end },
      total_matching: count ?? entries.length,
      truncated,
      warning: truncated
        ? `Only the ${entries.length} most recent of ${count} matching entries are shown, all from the tail end of the range. Do not infer when things happened across the full range from this alone — the earlier part of the range is not represented here.`
        : undefined,
      entries,
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
