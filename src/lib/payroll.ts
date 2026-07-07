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
};

export type PayrollComputationInput = {
  periodSessions: number;
  periodPreIvaRevenue: number;
  quarterSessions: number;
  config: TherapistCompensationConfig;
};

export type PayrollComputationResult = {
  compensationType: CompensationType;
  effectiveCommissionPercentage: number;
  effectiveFixedSessionAmount: number;
  incentiveApplied: boolean;
  grossEarnings: number;
  retentionAmount: number;
  retentionRateApplied: number;
  netEarnings: number;
  clinicEarnings: number;
};

const clampPercent = (value: number) => {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
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
}: PayrollComputationInput): PayrollComputationResult => {
  const compensationType = normalizeCompensationType(config.compensationType);

  const baseCommission = clampPercent(Number(config.commissionPercentage || 0));
  const baseFixedSessionAmount = Math.max(Number(config.fixedSessionAmount || 0), 0);
  const retentionEnabled = !!config.retentionEnabled;
  const retentionRate = clampPercent(Number(config.retentionRate || 0));
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

  const grossEarnings =
    compensationType === 'percentage'
      ? periodPreIvaRevenue * (effectiveCommissionPercentage / 100)
      : periodSessions * effectiveFixedSessionAmount;

  const retentionAmount = retentionEnabled ? grossEarnings * (retentionRate / 100) : 0;
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
