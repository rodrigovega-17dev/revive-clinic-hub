import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { computeTherapistPayroll, getPayrollQuarterRange, summarizeAppointmentPayments } from '@/lib/payroll';

/** Escape value for CSV (wrap in quotes if contains comma, newline, or quote). */
function csvEscape(val: unknown): string {
  const s = val === null || val === undefined ? '' : String(val);
  if (/[,"\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Convert array of objects to CSV string. */
function toCsv<T extends Record<string, unknown>>(rows: T[], columns: (keyof T)[]): string {
  const header = columns.map((c) => csvEscape(c)).join(',');
  const lines = rows.map((row) =>
    columns.map((col) => csvEscape(row[col])).join(',')
  );
  return [header, ...lines].join('\n');
}

/** Trigger browser download of a string as file. */
function downloadFile(content: string, filename: string, mimeType = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Hook for CSV data export (clients, appointments, payments). */
export function useDataExport() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState<'clients' | 'appointments' | 'payments' | 'expenses' | 'payroll' | null>(null);

  const exportClientsToCsv = async (clinicId: string) => {
    setIsExporting('clients');
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('first_name, last_name, email, phone, birth_date, rfc, address, created_at')
        .eq('clinic_id', clinicId)
        .eq('is_active', true)
        .eq('archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const columns = ['first_name', 'last_name', 'email', 'phone', 'birth_date', 'rfc', 'address', 'created_at'] as const;
      const rows = (data || []).map((r) => ({ ...r }) as Record<string, unknown>);
      const csv = toCsv(rows, columns as (keyof typeof rows[0])[]);
      const date = new Date().toISOString().slice(0, 10);
      downloadFile(csv, `clientes_${date}.csv`);
      toast({ title: t('common.success'), description: t('settings.exportClientsSuccess', 'Clientes exportados correctamente.') });
    } catch (e) {
      toast({ title: t('common.error'), description: (e as Error).message, variant: 'destructive' });
    } finally {
      setIsExporting(null);
    }
  };

  const exportAppointmentsToCsv = async (clinicId: string) => {
    setIsExporting('appointments');
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          start_time,
          end_time,
          status,
          payment_amount,
          notes,
          clients (first_name, last_name),
          therapists (first_name, last_name),
          treatments (name)
        `)
        .eq('clinic_id', clinicId)
        .order('start_time', { ascending: false });

      if (error) throw error;

      const rows = (data || []).map((a: any) => ({
        client_name: a.clients ? `${a.clients.first_name ?? ''} ${a.clients.last_name ?? ''}`.trim() : '',
        therapist_name: a.therapists ? `${a.therapists.first_name ?? ''} ${a.therapists.last_name ?? ''}`.trim() : '',
        treatment_name: a.treatments?.name ?? '',
        start_time: a.start_time ?? '',
        end_time: a.end_time ?? '',
        status: a.status ?? '',
        payment_amount: a.payment_amount ?? '',
        notes: a.notes ?? '',
      }));

      const columns = ['client_name', 'therapist_name', 'treatment_name', 'start_time', 'end_time', 'status', 'payment_amount', 'notes'] as const;
      const csv = toCsv(rows, columns);
      const date = new Date().toISOString().slice(0, 10);
      downloadFile(csv, `citas_${date}.csv`);
      toast({ title: t('common.success'), description: t('settings.exportAppointmentsSuccess', 'Citas exportadas correctamente.') });
    } catch (e) {
      toast({ title: t('common.error'), description: (e as Error).message, variant: 'destructive' });
    } finally {
      setIsExporting(null);
    }
  };

  const exportPaymentsToCsv = async (clinicId: string) => {
    setIsExporting('payments');
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          amount,
          payment_date,
          method,
          appointment_id,
          clients (first_name, last_name),
          appointments (start_time)
        `)
        .eq('clinic_id', clinicId)
        .order('payment_date', { ascending: false });

      if (error) throw error;

      const rows = (data || []).map((p: any) => ({
        client_name: p.clients ? `${p.clients.first_name ?? ''} ${p.clients.last_name ?? ''}`.trim() : '',
        amount: p.amount ?? '',
        payment_date: p.payment_date ?? '',
        method: p.method ?? '',
        appointment_start_time: p.appointments?.start_time ?? '',
      }));

      const columns = ['client_name', 'amount', 'payment_date', 'method', 'appointment_start_time'] as const;
      const csv = toCsv(rows, columns);
      const date = new Date().toISOString().slice(0, 10);
      downloadFile(csv, `pagos_${date}.csv`);
      toast({ title: t('common.success'), description: t('settings.exportPaymentsSuccess', 'Pagos exportados correctamente.') });
    } catch (e) {
      toast({ title: t('common.error'), description: (e as Error).message, variant: 'destructive' });
    } finally {
      setIsExporting(null);
    }
  };

  const exportExpensesToCsv = async (clinicId: string) => {
    setIsExporting('expenses');
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('description, amount, date, category, created_at')
        .eq('clinic_id', clinicId)
        .order('date', { ascending: false });

      if (error) throw error;

      const columns = ['description', 'amount', 'date', 'category', 'created_at'] as const;
      const rows = (data || []).map((r) => ({ ...r }) as Record<string, unknown>);
      const csv = toCsv(rows, columns);
      const date = new Date().toISOString().slice(0, 10);
      downloadFile(csv, `gastos_${date}.csv`);
      toast({ title: t('common.success'), description: t('settings.exportExpensesSuccess', 'Gastos exportados correctamente.') });
    } catch (e) {
      toast({ title: t('common.error'), description: (e as Error).message, variant: 'destructive' });
    } finally {
      setIsExporting(null);
    }
  };

  const exportPayrollReportToCsv = async (
    clinicId: string,
    periodStart: Date,
    periodEnd: Date,
    periodLabel: string
  ) => {
    setIsExporting('payroll');
    try {
      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          payment_amount, therapist_id,
          therapists (first_name, last_name),
          payroll_compensation_type,
          payroll_commission_percentage,
          payroll_fixed_session_amount,
          payroll_retention_enabled,
          payroll_retention_rate,
          payroll_incentive_enabled,
          payroll_incentive_threshold_sessions,
          payroll_incentive_percentage_bonus,
          payroll_incentive_fixed_bonus,
          payments (amount, facturado, iva_amount)
        `)
        .eq('clinic_id', clinicId)
        .eq('status', 'completed')
        .gte('start_time', periodStart.toISOString())
        .lte('start_time', periodEnd.toISOString());

      const quarterRange = getPayrollQuarterRange(periodStart);
      const { data: quarterAppointments } = await supabase
        .from('appointments')
        .select('therapist_id')
        .eq('clinic_id', clinicId)
        .eq('status', 'completed')
        .gte('start_time', quarterRange.startDate.toISOString())
        .lte('start_time', quarterRange.endDate.toISOString());

      const quarterSessionsByTherapist = (quarterAppointments || []).reduce((acc: Record<string, number>, appointment: any) => {
        const therapistId = String(appointment.therapist_id);
        acc[therapistId] = (acc[therapistId] || 0) + 1;
        return acc;
      }, {});

      const therapistStats: Record<string, any> = {};
      (appointments || []).forEach((apt: any) => {
        const tid = apt.therapist_id;
        const therapist = apt.therapists || {};
        const summary = summarizeAppointmentPayments({
          payment_amount: apt.payment_amount,
          payments: apt.payments || [],
        });
        if (!therapistStats[tid]) {
          therapistStats[tid] = {
            name: `${therapist.first_name ?? ''} ${therapist.last_name ?? ''}`.trim(),
            compensationType: apt.payroll_compensation_type || 'percentage',
            commissionPercentage: Number(apt.payroll_commission_percentage || 0),
            fixedSessionAmount: Number(apt.payroll_fixed_session_amount || 0),
            retentionEnabled: !!apt.payroll_retention_enabled,
            retentionRate: Number(apt.payroll_retention_rate || 0),
            incentiveEnabled: !!apt.payroll_incentive_enabled,
            incentiveThresholdSessions: Number(apt.payroll_incentive_threshold_sessions || 0),
            incentivePercentageBonus: Number(apt.payroll_incentive_percentage_bonus || 0),
            incentiveFixedBonus: Number(apt.payroll_incentive_fixed_bonus || 0),
            sessions: 0,
            revenue: 0,
            revenueBeforeIva: 0,
            ivaTotal: 0,
          };
        }
        therapistStats[tid].sessions += 1;
        therapistStats[tid].revenue += summary.totalCollected;
        therapistStats[tid].revenueBeforeIva += summary.preIvaRevenue;
        therapistStats[tid].ivaTotal += summary.totalIva;
      });
      Object.entries(therapistStats).forEach(([tid, s]: any) => {
        const computed = computeTherapistPayroll({
          periodSessions: s.sessions,
          periodPreIvaRevenue: s.revenueBeforeIva,
          quarterSessions: quarterSessionsByTherapist[tid] || s.sessions,
          config: {
            compensationType: s.compensationType,
            commissionPercentage: s.commissionPercentage,
            fixedSessionAmount: s.fixedSessionAmount,
            retentionEnabled: s.retentionEnabled,
            retentionRate: s.retentionRate,
            incentiveEnabled: s.incentiveEnabled,
            incentiveThresholdSessions: s.incentiveThresholdSessions,
            incentivePercentageBonus: s.incentivePercentageBonus,
            incentiveFixedBonus: s.incentiveFixedBonus,
          },
        });
        s.effectiveCommissionPercentage = computed.effectiveCommissionPercentage;
        s.effectiveFixedSessionAmount = computed.effectiveFixedSessionAmount;
        s.therapistEarnings = computed.grossEarnings;
        s.retentionAmount = computed.retentionAmount;
        s.therapistEarningsNet = computed.netEarnings;
        s.clinicEarnings = computed.clinicEarnings;
        s.incentiveApplied = computed.incentiveApplied;
      });

      const { data: payouts } = await supabase
        .from('therapist_payouts')
        .select('therapist_id, amount')
        .eq('clinic_id', clinicId)
        .eq('period_start', periodStart.toISOString().slice(0, 10))
        .eq('period_end', periodEnd.toISOString().slice(0, 10));

      const paidByTherapist: Record<string, number> = {};
      (payouts || []).forEach((p: any) => {
        paidByTherapist[p.therapist_id] = (paidByTherapist[p.therapist_id] || 0) + Number(p.amount);
      });

      const rows = Object.entries(therapistStats).map(([tid, s]) => ({
        therapist_name: s.name,
        sessions: s.sessions,
        total_revenue: s.revenue,
        revenue_pre_iva: s.revenueBeforeIva,
        total_iva: s.ivaTotal,
        compensation_model:
          s.compensationType === 'percentage'
            ? `${Number(s.effectiveCommissionPercentage || 0).toFixed(2)}%`
            : `fixed ${Number(s.effectiveFixedSessionAmount || 0).toFixed(2)}`,
        therapist_earnings_gross: s.therapistEarnings,
        therapist_retention: s.retentionAmount,
        therapist_earnings_net: s.therapistEarningsNet,
        clinic_earnings: s.clinicEarnings,
        total_paid: paidByTherapist[tid] || 0,
        remaining: Math.max(0, (s.therapistEarningsNet || 0) - (paidByTherapist[tid] || 0)),
      }));

      const columns = [
        'therapist_name',
        'sessions',
        'total_revenue',
        'revenue_pre_iva',
        'total_iva',
        'compensation_model',
        'therapist_earnings_gross',
        'therapist_retention',
        'therapist_earnings_net',
        'clinic_earnings',
        'total_paid',
        'remaining',
      ] as const;
      const csv = toCsv(rows, columns as (keyof typeof rows[0])[]);
      const safeLabel = periodLabel.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 30);
      downloadFile(csv, `nómina_${safeLabel}.csv`);
      toast({ title: t('common.success'), description: t('payroll.exportReportSuccess', 'Reporte de nómina exportado.') });
    } catch (e) {
      toast({ title: t('common.error'), description: (e as Error).message, variant: 'destructive' });
    } finally {
      setIsExporting(null);
    }
  };

  return {
    exportClientsToCsv,
    exportAppointmentsToCsv,
    exportPaymentsToCsv,
    exportExpensesToCsv,
    exportPayrollReportToCsv,
    isExporting,
  };
}
