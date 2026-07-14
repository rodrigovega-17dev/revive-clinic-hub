export type CompensationType = 'percentage' | 'fixed_per_session';

type PaymentLike = {
  amount?: number | null;
  facturado?: boolean | null;
  iva_amount?: number | null;
};

type AppointmentLike = {
  payment_amount?: number | null;
  payments?: PaymentLike[] | null;
};

export type TherapistCompensationConfig = {
  compensationType?: string | null;
  commissionPercentage?: number | null;
  fixedSessionAmount?: number | null;
  retentionEnabled?: boolean | null;
  retentionRate?: number | null;
  incentiveEnabled?: boolean | null;
  incentiveThresholdSessions?: number | null;
  incentivePercentageBonus?: number | null;
  incentiveFixedBonus?: number | null;
  reinvestmentEnabled?: boolean | null;
  reinvestmentPercentage?: number | null;
};

export type PayrollComputationInput = {
  periodSessions: number;
  periodPreIvaRevenue: number;
  quarterSessions: number;
  config: TherapistCompensationConfig;
  /** When true, bypass commission/fixed compensation and pay the therapist 100% of
   * periodPreIvaRevenue instead (retention, if enabled, still applies). */
  payInFull?: boolean;
};

export type PayrollComputationResult = {
  compensationType: CompensationType;
  effectiveCommissionPercentage: number;
  effectiveFixedSessionAmount: number;
  incentiveApplied: boolean;
  grossEarnings: number;
  retentionAmount: number;
  retentionRateApplied: number;
  reinvestmentAmount: number;
  reinvestmentPercentageApplied: number;
  netEarnings: number;
  clinicEarnings: number;
};

const clampPercent = (value: number) => {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
};

/**
 * Retention rate can go negative: some clinics use it to gross up a
 * therapist's pay (e.g. -16%) as a way to fiscally support them, rather than
 * withhold from it. Same 100-point range, just mirrored below zero.
 */
const clampRetentionPercent = (value: number) => {
  if (Number.isNaN(value)) return 0;
  if (value < -100) return -100;
  if (value > 100) return 100;
  return value;
};

export const normalizeCompensationType = (value?: string | null): CompensationType =>
  value === 'fixed_per_session' ? 'fixed_per_session' : 'percentage';

export const summarizeAppointmentPayments = (appointment: AppointmentLike) => {
  const paymentRows = (appointment.payments || []).filter((payment) => Number(payment?.amount || 0) > 0);

  if (paymentRows.length === 0) {
    const fallback = Number(appointment.payment_amount || 0);
    return {
      totalCollected: fallback,
      preIvaRevenue: fallback,
      totalIva: 0,
    };
  }

  const summary = paymentRows.reduce(
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

  return summary;
};

export type AppointmentPayrollFields = {
  payroll_snapshot_at?: string | null;
  payroll_compensation_type?: string | null;
  payroll_commission_percentage?: number | null;
  payroll_fixed_session_amount?: number | null;
  payroll_retention_enabled?: boolean | null;
  payroll_retention_rate?: number | null;
  payroll_incentive_enabled?: boolean | null;
  payroll_incentive_threshold_sessions?: number | null;
  payroll_incentive_percentage_bonus?: number | null;
  payroll_incentive_fixed_bonus?: number | null;
  payroll_reinvestment_enabled?: boolean | null;
  payroll_reinvestment_percentage?: number | null;
};

/**
 * An appointment's payroll terms come from its frozen snapshot once one exists
 * (i.e. a payout has been registered that covered it); otherwise it uses the
 * therapist's current live compensation config. This is what makes payroll
 * non-retroactive from the moment of payout, while still reflecting config
 * changes for anything not yet paid out.
 */
export const resolveAppointmentPayrollConfig = (
  appointment: AppointmentPayrollFields,
  liveConfig: TherapistCompensationConfig,
): TherapistCompensationConfig => {
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
    reinvestmentEnabled: appointment.payroll_reinvestment_enabled,
    reinvestmentPercentage: appointment.payroll_reinvestment_percentage,
  };
};

/** Build the payroll_* snapshot column values to freeze onto an appointment at payout time. */
export const buildPayrollSnapshotColumns = (liveConfig: TherapistCompensationConfig) => ({
  payroll_compensation_type: normalizeCompensationType(liveConfig.compensationType),
  payroll_commission_percentage: liveConfig.commissionPercentage ?? 0,
  payroll_fixed_session_amount: liveConfig.fixedSessionAmount ?? null,
  payroll_retention_enabled: !!liveConfig.retentionEnabled,
  payroll_retention_rate: liveConfig.retentionRate ?? 16,
  payroll_incentive_enabled: !!liveConfig.incentiveEnabled,
  payroll_incentive_threshold_sessions: liveConfig.incentiveThresholdSessions ?? null,
  payroll_incentive_percentage_bonus: liveConfig.incentivePercentageBonus ?? null,
  payroll_incentive_fixed_bonus: liveConfig.incentiveFixedBonus ?? null,
  payroll_reinvestment_enabled: !!liveConfig.reinvestmentEnabled,
  payroll_reinvestment_percentage: liveConfig.reinvestmentPercentage ?? 0,
  payroll_snapshot_at: new Date().toISOString(),
});

export const getPayrollQuarterRange = (periodStartDate: Date) => {
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

export const computeTherapistPayroll = ({
  periodSessions,
  periodPreIvaRevenue,
  quarterSessions,
  config,
  payInFull = false,
}: PayrollComputationInput): PayrollComputationResult => {
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

  // Reinvestment is scoped to percentage compensation — there's no "rate" to reduce for a
  // flat per-session fee.
  const reinvestmentEnabled = compensationType === 'percentage' && !!config.reinvestmentEnabled;
  const reinvestmentPercentage = clampPercent(Number(config.reinvestmentPercentage || 0));

  const preReinvestmentCommissionPercentage =
    compensationType === 'percentage'
      ? clampPercent(baseCommission + (incentiveApplied ? incentivePercentageBonus : 0))
      : 0;

  // Unlike retention (a post-hoc deduction from grossEarnings that never reaches
  // clinicEarnings — used today for tax gross-up, money set aside for the therapist),
  // reinvestment reduces the commission rate itself BEFORE grossEarnings is computed, so
  // the difference automatically becomes real clinic revenue via clinicEarnings below.
  const effectiveCommissionPercentage = reinvestmentEnabled
    ? clampPercent(preReinvestmentCommissionPercentage - reinvestmentPercentage)
    : preReinvestmentCommissionPercentage;

  const effectiveFixedSessionAmount =
    compensationType === 'fixed_per_session'
      ? baseFixedSessionAmount + (incentiveApplied ? incentiveFixedBonus : 0)
      : 0;

  const grossEarnings = payInFull
    ? periodPreIvaRevenue
    : compensationType === 'percentage'
      ? periodPreIvaRevenue * (effectiveCommissionPercentage / 100)
      : periodSessions * effectiveFixedSessionAmount;

  // Full-pay sessions are added on top, untouched by retention (whether it's a normal
  // withholding or, with a negative rate, a bonus) — it's a straight 100% pass-through.
  const retentionAmount = retentionEnabled && !payInFull ? grossEarnings * (retentionRate / 100) : 0;
  const netEarnings = grossEarnings - retentionAmount;
  const clinicEarnings = periodPreIvaRevenue - grossEarnings;

  // Diffed in percentage-point space (not a naive revenue*% calc) so this stays exact even
  // in the floor-clamp edge case (e.g. 5% base, 10% reinvestment requested — only 5 points
  // were actually available to give up). Guarded on !payInFull for the same reason
  // retention is: grossEarnings bypasses effectiveCommissionPercentage entirely in the
  // full-pay branch, so reinvestment "applying" there would be a reporting fiction.
  const reinvestmentPercentageApplied = reinvestmentEnabled && !payInFull
    ? preReinvestmentCommissionPercentage - effectiveCommissionPercentage
    : 0;
  const reinvestmentAmount = reinvestmentPercentageApplied > 0
    ? periodPreIvaRevenue * (reinvestmentPercentageApplied / 100)
    : 0;

  return {
    compensationType,
    effectiveCommissionPercentage,
    effectiveFixedSessionAmount,
    incentiveApplied,
    grossEarnings,
    retentionAmount,
    retentionRateApplied: retentionEnabled ? retentionRate : 0,
    reinvestmentAmount,
    reinvestmentPercentageApplied,
    netEarnings,
    clinicEarnings,
  };
};
