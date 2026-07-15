import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, DollarSign, TrendingUp, Users, Download, Loader2, FileText, Paperclip, Info, Printer } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useClinic, useClinicSettings } from '@/hooks/useClinic';
import { useLanguage } from '@/hooks/useLanguage';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useDataExport } from '@/hooks/useDataExport';
import { CfdiUploadModal } from '@/components/CfdiUploadModal';
import { parseCfdiXml } from '@/lib/cfdi-xml';
import { getCfdiFileUrl } from '@/hooks/useCfdiFileUrl';
import { openFinanceReport, type FinanceReportTable } from '@/lib/finance-report';
import {
  computeTherapistPayroll,
  getPayrollQuarterRange,
  summarizeAppointmentPayments,
  resolveAppointmentPayrollConfig,
  buildPayrollSnapshotColumns,
  type TherapistCompensationConfig,
} from '@/lib/payroll';

const Payroll = () => {
  const { t } = useTranslation();
  const { clinicId, user } = useAuth();
  const { currency } = useClinicSettings();
  const { data: clinic } = useClinic();
  const { currentLanguage } = useLanguage();
  const locale = currentLanguage === 'es' ? es : enUS;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const defaultPeriod = `first-${currentYear}-${currentMonth + 1}`;
  
  const [selectedPeriod, setSelectedPeriod] = useState(defaultPeriod);
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [payoutTherapist, setPayoutTherapist] = useState<any | null>(null);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState<'cash' | 'transfer' | 'card'>('transfer');
  const [payoutDate, setPayoutDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [payoutNotes, setPayoutNotes] = useState('');
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);
  const [payoutRemaining, setPayoutRemaining] = useState(0);
  const [cfdiXmlFile, setCfdiXmlFile] = useState<File | null>(null);
  const [cfdiPdfFile, setCfdiPdfFile] = useState<File | null>(null);
  const [attachCfdiPayoutId, setAttachCfdiPayoutId] = useState<string | null>(null);
  const { exportPayrollReportToCsv, isExporting } = useDataExport();

  // Clinic-aware currency formatting
  const formatCurrencyWithClinic = (value: number) => {
    return formatCurrency(value, 2, currency);
  };

  // Update current date every minute to check for new periods
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const newDefaultPeriod = `first-${currentYear}-${currentMonth + 1}`;
      
      // Update current date and default period if month/year changed
      if (currentMonth !== currentDate.getMonth() || currentYear !== currentDate.getFullYear()) {
        setCurrentDate(now);
        setSelectedPeriod(newDefaultPeriod);
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [currentDate]);

  // Generate 15-day periods starting from the 1st of each month
  const periods = useMemo(() => {
    const periods = [];
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Generate periods for current and previous months (12 months total)
    for (let i = 0; i < 12; i++) {
      let month = currentMonth - i;
      let year = currentYear;
      
      // Handle year rollover
      if (month < 0) {
        month += 12;
        year -= 1;
      }
      
      // First period of the month (1st to 15th)
      const firstPeriodStart = new Date(year, month, 1);
      const firstPeriodEnd = new Date(year, month, 15);
      
      // Second period of the month (16th to end of month)
      const secondPeriodStart = new Date(year, month, 16);
      const secondPeriodEnd = new Date(year, month + 1, 0); // Last day of the month
      
      // Add first period (1st-15th)
      periods.push({
        value: `first-${year}-${month + 1}`,
        label: `${format(firstPeriodStart, 'MMM 1-15, yyyy')}`,
        startDate: firstPeriodStart,
        endDate: firstPeriodEnd,
        isCurrent: i === 0 && new Date().getDate() <= 15,
        isPast: i > 0 || (i === 0 && new Date().getDate() > 15),
      });
      
      // Add second period (16th-end of month)
      periods.push({
        value: `second-${year}-${month + 1}`,
        label: `${format(secondPeriodStart, 'MMM 16-')}${format(secondPeriodEnd, 'd, yyyy')}`,
        startDate: secondPeriodStart,
        endDate: secondPeriodEnd,
        isCurrent: i === 0 && new Date().getDate() > 15,
        isPast: i > 0 || (i === 0 && new Date().getDate() > secondPeriodEnd.getDate()),
      });
    }
    
    // Sort periods by date (newest first)
    return periods.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
  }, [currentDate]);

  const currentPeriod = periods.find(p => p.value === selectedPeriod) || periods[0];
  const todayStart = startOfDay(new Date());
  const isPastPeriod = endOfDay(currentPeriod.endDate) < todayStart;
  const currentQuarter = useMemo(() => getPayrollQuarterRange(currentPeriod.startDate), [currentPeriod.startDate]);

  // Fetch payroll data
  const { data: payrollData, isLoading } = useQuery({
    queryKey: ['payroll', currentPeriod.startDate, currentPeriod.endDate, currentQuarter.startDate, currentQuarter.endDate, clinicId],
    queryFn: async () => {
      if (!clinicId) return {
        therapistStats: [],
        totals: {
          totalRevenue: 0,
          totalRevenueBeforeIVA: 0,
          totalIVA: 0,
          totalTherapistEarnings: 0,
          totalTherapistRetention: 0,
          totalTherapistReinvestment: 0,
          totalTherapistIVAWithheld: 0,
          totalTherapistEarningsNet: 0,
          totalClinicEarnings: 0,
          totalAppointments: 0
        }
      };

      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          *,
          therapists (
            id,
            first_name,
            last_name,
            compensation_type,
            commission_percentage,
            fixed_session_amount,
            retention_enabled,
            retention_rate,
            incentive_enabled,
            incentive_threshold_sessions,
            incentive_percentage_bonus,
            incentive_fixed_bonus,
            reinvestment_enabled,
            reinvestment_percentage
          ),
          clients (
            first_name,
            last_name
          ),
          payments (
            id,
            amount,
            facturado,
            iva_amount,
            method
          ),
          payroll_compensation_type,
          payroll_commission_percentage,
          payroll_fixed_session_amount,
          payroll_retention_enabled,
          payroll_retention_rate,
          payroll_incentive_enabled,
          payroll_incentive_threshold_sessions,
          payroll_incentive_percentage_bonus,
          payroll_incentive_fixed_bonus,
          payroll_reinvestment_enabled,
          payroll_reinvestment_percentage,
          payroll_snapshot_at
        `)
        .eq('clinic_id', clinicId)
        .eq('status', 'completed')
        .gte('start_time', startOfDay(currentPeriod.startDate).toISOString())
        .lte('start_time', endOfDay(currentPeriod.endDate).toISOString());

      if (error) throw error;

      const { data: quarterAppointments, error: quarterError } = await supabase
        .from('appointments')
        .select('therapist_id')
        .eq('clinic_id', clinicId)
        .eq('status', 'completed')
        .gte('start_time', startOfDay(currentQuarter.startDate).toISOString())
        .lte('start_time', endOfDay(currentQuarter.endDate).toISOString());

      if (quarterError) throw quarterError;

      const quarterSessionsByTherapist = (quarterAppointments || []).reduce((acc: Record<string, number>, appointment) => {
        const therapistId = String(appointment.therapist_id);
        acc[therapistId] = (acc[therapistId] || 0) + 1;
        return acc;
      }, {});

      // Calculate payroll data by therapist. Each appointment's payroll terms come from its
      // frozen snapshot if one exists (i.e. it was already covered by a payout), otherwise
      // from the therapist's current live config — so pending/unpaid sessions always reflect
      // the latest compensation settings, and only actually-paid-out sessions stay frozen.
      const therapistStats = appointments.reduce((acc: Record<string, any>, appointment) => {
        const therapistId = appointment.therapist_id;
        const therapist = appointment.therapists;
        const therapistName = `${therapist?.first_name || ''} ${therapist?.last_name || ''}`.trim();
        const quarterSessions = quarterSessionsByTherapist[therapistId] || 0;

        const liveConfig: TherapistCompensationConfig = {
          compensationType: therapist?.compensation_type,
          commissionPercentage: therapist?.commission_percentage,
          fixedSessionAmount: therapist?.fixed_session_amount,
          retentionEnabled: therapist?.retention_enabled,
          retentionRate: therapist?.retention_rate,
          incentiveEnabled: therapist?.incentive_enabled,
          incentiveThresholdSessions: therapist?.incentive_threshold_sessions,
          incentivePercentageBonus: therapist?.incentive_percentage_bonus,
          incentiveFixedBonus: therapist?.incentive_fixed_bonus,
          reinvestmentEnabled: therapist?.reinvestment_enabled,
          reinvestmentPercentage: therapist?.reinvestment_percentage,
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

        if (!acc[therapistId]) {
          acc[therapistId] = {
            id: therapistId,
            name: therapistName,
            liveConfig,
            quarterSessions,
            totalAppointments: 0,
            totalRevenue: 0,
            totalRevenueBeforeIVA: 0,
            totalIVA: 0,
            therapistEarnings: 0,
            therapistRetentionAmount: 0,
            therapistReinvestmentAmount: 0,
            therapistEarningsNet: 0,
            clinicEarnings: 0,
            fullPayAppointments: 0,
            fullPayAmount: 0,
            fullPayDetails: [],
            appointments: []
          };
        }

        acc[therapistId].totalAppointments += 1;
        acc[therapistId].totalRevenue += paymentSummary.totalCollected;
        acc[therapistId].totalRevenueBeforeIVA += paymentSummary.preIvaRevenue;
        acc[therapistId].totalIVA += paymentSummary.totalIva;
        acc[therapistId].therapistEarnings += computed.grossEarnings;
        acc[therapistId].therapistRetentionAmount += computed.retentionAmount;
        acc[therapistId].therapistReinvestmentAmount += computed.reinvestmentAmount;
        acc[therapistId].therapistEarningsNet += computed.netEarnings;
        acc[therapistId].clinicEarnings += computed.clinicEarnings;
        if (payInFull) {
          acc[therapistId].fullPayAppointments += 1;
          acc[therapistId].fullPayAmount += computed.grossEarnings;
          acc[therapistId].fullPayDetails.push({
            clientName: `${appointment.clients?.first_name || ''} ${appointment.clients?.last_name || ''}`.trim(),
            amount: computed.grossEarnings,
          });
        }
        acc[therapistId].appointments.push(appointment);

        return acc;
      }, {});

      // Derive display-only fields (current compensation model, whether the incentive is
      // currently active) from each therapist's live config — these represent "what applies
      // going forward", independent of how individual past appointments were computed above.
      Object.values(therapistStats).forEach((stats: any) => {
        const display = computeTherapistPayroll({
          periodSessions: 0,
          periodPreIvaRevenue: 0,
          quarterSessions: stats.quarterSessions,
          config: stats.liveConfig,
        });

        stats.compensationType = display.compensationType;
        stats.effectiveCommissionPercentage = display.effectiveCommissionPercentage;
        stats.effectiveFixedSessionAmount = display.effectiveFixedSessionAmount;
        stats.incentiveApplied = display.incentiveApplied;
        stats.therapistRetentionRateApplied = stats.liveConfig.retentionEnabled
          ? Number(stats.liveConfig.retentionRate || 0)
          : 0;
        stats.reinvestmentPercentageApplied = stats.liveConfig.reinvestmentEnabled
          ? Number(stats.liveConfig.reinvestmentPercentage || 0)
          : 0;
      });

      const totalRevenue = Object.values(therapistStats).reduce((sum, stats: any) => sum + stats.totalRevenue, 0);
      const totalRevenueBeforeIVA = Object.values(therapistStats).reduce((sum, stats: any) => sum + stats.totalRevenueBeforeIVA, 0);
      const totalIVA = Object.values(therapistStats).reduce((sum, stats: any) => sum + stats.totalIVA, 0);
      const totalTherapistEarnings = Object.values(therapistStats).reduce((sum, stats: any) => sum + stats.therapistEarnings, 0);
      const totalTherapistRetention = Object.values(therapistStats).reduce((sum, stats: any) => sum + stats.therapistRetentionAmount, 0);
      const totalTherapistReinvestment = Object.values(therapistStats).reduce((sum, stats: any) => sum + stats.therapistReinvestmentAmount, 0);
      const totalTherapistEarningsNet = Object.values(therapistStats).reduce((sum, stats: any) => sum + stats.therapistEarningsNet, 0);
      const totalClinicEarnings = Object.values(therapistStats).reduce((sum, stats: any) => sum + stats.clinicEarnings, 0);

      return {
        therapistStats: Object.values(therapistStats),
        totals: {
          totalRevenue,
          totalRevenueBeforeIVA,
          totalIVA,
          totalTherapistEarnings,
          totalTherapistRetention,
          totalTherapistReinvestment,
          // Legacy key kept to avoid breaking older UI references.
          totalTherapistIVAWithheld: totalTherapistRetention,
          totalTherapistEarningsNet,
          totalClinicEarnings,
          totalAppointments: appointments.length
        }
      };
    },
    enabled: !!clinicId,
  });

  const { data: payoutRecords } = useQuery({
    queryKey: ['therapist-payouts', clinicId, currentPeriod.startDate, currentPeriod.endDate],
    queryFn: async () => {
      if (!clinicId) return [];

      const { data, error } = await supabase
        .from('therapist_payouts')
        .select(`
          *,
          cfdi_invoices (id, uuid, folio, pdf_url, xml_url, source),
          therapists (first_name, last_name)
        `)
        .eq('clinic_id', clinicId)
        .eq('period_start', format(currentPeriod.startDate, 'yyyy-MM-dd'))
        .eq('period_end', format(currentPeriod.endDate, 'yyyy-MM-dd'))
        .order('payout_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!clinicId,
  });

  // Therapist-attributed expenses within this period, summed per therapist.
  // Key starts with 'expenses' so it refreshes when the expenses cache is invalidated.
  const { data: therapistExpenses } = useQuery({
    queryKey: ['expenses', 'by-therapist', clinicId, format(currentPeriod.startDate, 'yyyy-MM-dd'), format(currentPeriod.endDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!clinicId) return {} as Record<string, number>;
      const { data, error } = await supabase
        .from('expenses')
        .select('therapist_id, amount')
        .eq('clinic_id', clinicId)
        .not('therapist_id', 'is', null)
        .gte('date', format(currentPeriod.startDate, 'yyyy-MM-dd'))
        .lte('date', format(currentPeriod.endDate, 'yyyy-MM-dd'));
      if (error) throw error;
      return (data || []).reduce((acc: Record<string, number>, e: any) => {
        acc[e.therapist_id] = (acc[e.therapist_id] || 0) + Number(e.amount || 0);
        return acc;
      }, {} as Record<string, number>);
    },
    enabled: !!clinicId,
  });

  // Therapist-attributed standalone payments within this period (e.g. a therapist reimbursing
  // the clinic directly for an expense already attributed to them), summed per therapist.
  const { data: therapistPayments } = useQuery({
    queryKey: ['payments', 'by-therapist', clinicId, format(currentPeriod.startDate, 'yyyy-MM-dd'), format(currentPeriod.endDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!clinicId) return {} as Record<string, number>;
      const { data, error } = await supabase
        .from('payments')
        .select('therapist_id, amount')
        .eq('clinic_id', clinicId)
        .not('therapist_id', 'is', null)
        .gte('payment_date', startOfDay(currentPeriod.startDate).toISOString())
        .lte('payment_date', endOfDay(currentPeriod.endDate).toISOString());
      if (error) throw error;
      return (data || []).reduce((acc: Record<string, number>, p: any) => {
        acc[p.therapist_id] = (acc[p.therapist_id] || 0) + Number(p.amount || 0);
        return acc;
      }, {} as Record<string, number>);
    },
    enabled: !!clinicId,
  });

  const getAttributedExpenses = (therapistId: string) => Number(therapistExpenses?.[therapistId] || 0);
  const getAttributedTherapistPayments = (therapistId: string) => Number(therapistPayments?.[therapistId] || 0);
  // Final payout = gross earnings − configured retention − therapist-attributed expenses,
  // offset by any standalone payments the therapist made back to the clinic this period
  // (e.g. reimbursing that same expense directly) — floored at zero so an overpayment
  // never becomes a bonus.
  const getNetPayable = (therapist: any) => {
    const netDeduction = Math.max(0, getAttributedExpenses(therapist?.id) - getAttributedTherapistPayments(therapist?.id));
    return Number(therapist?.therapistEarningsNet || 0) - netDeduction;
  };

  const payoutsByTherapist = (payoutRecords || []).reduce((acc: Map<string, { total: number }>, payout: any) => {
    const existing = acc.get(payout.therapist_id);
    const nextTotal = (existing?.total || 0) + Number(payout.amount || 0);
    acc.set(payout.therapist_id, { total: nextTotal });
    return acc;
  }, new Map());

  const getTotalPaid = (therapistId: string) => {
    return payoutsByTherapist.get(therapistId)?.total || 0;
  };

  const getRemainingAmount = (therapistId: string, earnings: number) => {
    return Math.max(0, Number(earnings || 0) - getTotalPaid(therapistId));
  };

  const handlePrintPayrollReport = () => {
    if (!payrollData) return;
    const therapistStats = payrollData.therapistStats as any[];

    const totalExpensesDeducted = Object.values(therapistExpenses || {}).reduce(
      (sum: number, value) => sum + Number(value || 0), 0,
    );
    const totalTherapistPaymentsOffset = Object.values(therapistPayments || {}).reduce(
      (sum: number, value) => sum + Number(value || 0), 0,
    );
    const totalNetPayable = therapistStats.reduce((sum, therapist) => sum + getNetPayable(therapist), 0);
    const totalPaidAll = therapistStats.reduce((sum, therapist) => sum + getTotalPaid(therapist.id), 0);
    const totalRemainingAll = therapistStats.reduce(
      (sum, therapist) => sum + getRemainingAmount(therapist.id, getNetPayable(therapist)), 0,
    );

    const payrollTable: FinanceReportTable = {
      title: t('payroll.byTherapistTable'),
      columns: [
        t('payroll.therapist'),
        t('common.sessions'),
        t('payroll.grossLabel'),
        t('payroll.therapistNetPayout'),
        t('payroll.payoutPaidSoFar'),
        t('payroll.payoutRemaining'),
        t('payroll.clinicEarnings'),
      ],
      numericColumns: [2, 3, 4, 5, 6],
      emptyText: t('payroll.noPayrollData'),
      rows: therapistStats.map((therapist) => {
        const netPayable = getNetPayable(therapist);
        return [
          therapist.name,
          String(therapist.totalAppointments || 0),
          formatCurrencyWithClinic(Number(therapist.therapistEarnings || 0)),
          formatCurrencyWithClinic(netPayable),
          formatCurrencyWithClinic(getTotalPaid(therapist.id)),
          formatCurrencyWithClinic(getRemainingAmount(therapist.id, netPayable)),
          formatCurrencyWithClinic(Number(therapist.clinicEarnings || 0)),
        ];
      }),
      footer: [
        t('common.total'), '',
        formatCurrencyWithClinic(payrollData.totals.totalTherapistEarnings),
        formatCurrencyWithClinic(totalNetPayable),
        formatCurrencyWithClinic(totalPaidAll),
        formatCurrencyWithClinic(totalRemainingAll),
        formatCurrencyWithClinic(payrollData.totals.totalClinicEarnings),
      ],
    };

    openFinanceReport({
      clinicName: clinic?.name || t('payroll.title'),
      clinicLogoUrl: clinic?.logo_url,
      reportTitle: t('payroll.reportTitle'),
      periodLabel: currentPeriod.label,
      generatedLabel: `${t('finance.reportGenerated')}: ${format(new Date(), 'PPpp', { locale })}`,
      appointmentsTitle: t('payroll.periodOverview'),
      appointmentStats: [
        { label: t('payroll.totalSessions'), value: String(payrollData.totals.totalAppointments) },
        { label: t('payroll.therapistsIncluded'), value: String(therapistStats.length) },
      ],
      financialTitle: t('payroll.financialSummary'),
      financialStats: [
        { label: t('payroll.totalRevenue'), value: formatCurrencyWithClinic(payrollData.totals.totalRevenue) },
        { label: t('payroll.therapistEarnings'), value: formatCurrencyWithClinic(payrollData.totals.totalTherapistEarnings) },
        { label: t('payroll.retentionLabel'), value: formatCurrencyWithClinic(payrollData.totals.totalTherapistRetention) },
        { label: t('payroll.totalReinvestedLabel'), value: formatCurrencyWithClinic(payrollData.totals.totalTherapistReinvestment) },
        { label: t('payroll.totalExpensesDeducted'), value: formatCurrencyWithClinic(totalExpensesDeducted) },
        { label: t('payroll.therapistPaymentsLabel'), value: formatCurrencyWithClinic(totalTherapistPaymentsOffset) },
        { label: t('payroll.therapistNetPayout'), value: formatCurrencyWithClinic(totalNetPayable), highlight: true },
        { label: t('payroll.clinicEarnings'), value: formatCurrencyWithClinic(payrollData.totals.totalClinicEarnings), highlight: true },
      ],
      tables: [payrollTable],
    });
  };

  const openPayoutDialog = (therapist: any) => {
    const remaining = getRemainingAmount(therapist.id, getNetPayable(therapist));
    setPayoutTherapist(therapist);
    setPayoutAmount(String(Number(remaining).toFixed(2)));
    setPayoutMethod('transfer');
    setPayoutDate(format(new Date(), 'yyyy-MM-dd'));
    setPayoutNotes('');
    setPayoutRemaining(remaining);
    setCfdiXmlFile(null);
    setCfdiPdfFile(null);
    setPayoutDialogOpen(true);
  };

  const handleRegisterPayout = async () => {
    if (!clinicId || !user?.id || !payoutTherapist) {
      toast({
        title: t('common.error'),
        description: t('common.noClinicAccess'),
        variant: 'destructive',
      });
      return;
    }

    const numericAmount = Number(payoutAmount);
    if (!numericAmount || numericAmount <= 0) {
      toast({
        title: t('payroll.invalidPayout'),
        description: t('payroll.invalidPayoutDesc'),
        variant: 'destructive',
      });
      return;
    }

    if (numericAmount > payoutRemaining) {
      toast({
        title: t('payroll.invalidPayout'),
        description: t('payroll.invalidPayoutOver'),
        variant: 'destructive',
      });
      return;
    }

    setIsSubmittingPayout(true);
    try {
      let cfdiInvoiceId: string | null = null;
      if (cfdiXmlFile) {
        const xmlText = await cfdiXmlFile.text();
        const parsed = parseCfdiXml(xmlText);
        if (parsed.type !== 'egreso') {
          throw new Error(t('payroll.cfdiMustBeEgreso'));
        }
        const { data: inserted, error: insErr } = await supabase
          .from('cfdi_invoices')
          .insert({
            clinic_id: clinicId,
            source: 'uploaded',
            facturapi_id: null,
            uuid: parsed.uuid,
            folio: parsed.folio,
            type: parsed.type,
            status: 'issued',
            total: parsed.total,
            subtotal: parsed.subtotal,
            tax: parsed.tax,
            currency: 'MXN',
            emitted_at: parsed.emitted_at,
          })
          .select('id')
          .single();
        if (insErr) {
          if (insErr.code === '23505') throw new Error('CFDI UUID already registered');
          throw new Error(insErr.message);
        }
        cfdiInvoiceId = inserted.id;
        const prefix = `${clinicId}/${inserted.id}`;
        const { error: xmlUpErr } = await supabase.storage
          .from('cfdi-uploads')
          .upload(`${prefix}/cfdi.xml`, cfdiXmlFile, { upsert: true });
        if (xmlUpErr) throw new Error('Failed to upload XML: ' + xmlUpErr.message);
        let pdfPath: string | null = null;
        if (cfdiPdfFile) {
          await supabase.storage.from('cfdi-uploads').upload(`${prefix}/cfdi.pdf`, cfdiPdfFile, { upsert: true });
          pdfPath = `${prefix}/cfdi.pdf`;
        }
        await supabase
          .from('cfdi_invoices')
          .update({ xml_url: `${prefix}/cfdi.xml`, pdf_url: pdfPath })
          .eq('id', inserted.id);
      }

      const { data: payoutData, error: payoutError } = await supabase
        .from('therapist_payouts')
        .insert({
          clinic_id: clinicId,
          therapist_id: payoutTherapist.id,
          period_start: format(currentPeriod.startDate, 'yyyy-MM-dd'),
          period_end: format(currentPeriod.endDate, 'yyyy-MM-dd'),
          payout_date: payoutDate,
          amount: numericAmount,
          payment_method: payoutMethod,
          notes: payoutNotes || null,
          status: 'paid',
          created_by: user.id,
          cfdi_invoice_id: cfdiInvoiceId,
        })
        .select()
        .single();

      if (payoutError) throw payoutError;

      // Freeze payroll terms on any not-yet-frozen appointments covered by this payout, using
      // the therapist's live config at this exact moment. This is the one point where payroll
      // becomes non-retroactive: once paid out, later compensation edits won't change these
      // sessions' numbers, but anything still unpaid keeps following live config.
      const unfrozenAppointmentIds = (payoutTherapist.appointments || [])
        .filter((apt: any) => !apt.payroll_snapshot_at)
        .map((apt: any) => apt.id);

      if (unfrozenAppointmentIds.length > 0) {
        const { data: freshTherapist, error: therapistFetchError } = await supabase
          .from('therapists')
          .select(`
            compensation_type,
            commission_percentage,
            fixed_session_amount,
            retention_enabled,
            retention_rate,
            incentive_enabled,
            incentive_threshold_sessions,
            incentive_percentage_bonus,
            incentive_fixed_bonus,
            reinvestment_enabled,
            reinvestment_percentage
          `)
          .eq('id', payoutTherapist.id)
          .single();

        if (therapistFetchError) throw therapistFetchError;

        const snapshotColumns = buildPayrollSnapshotColumns({
          compensationType: freshTherapist.compensation_type,
          commissionPercentage: freshTherapist.commission_percentage,
          fixedSessionAmount: freshTherapist.fixed_session_amount,
          retentionEnabled: freshTherapist.retention_enabled,
          retentionRate: freshTherapist.retention_rate,
          incentiveEnabled: freshTherapist.incentive_enabled,
          incentiveThresholdSessions: freshTherapist.incentive_threshold_sessions,
          incentivePercentageBonus: freshTherapist.incentive_percentage_bonus,
          incentiveFixedBonus: freshTherapist.incentive_fixed_bonus,
          reinvestmentEnabled: freshTherapist.reinvestment_enabled,
          reinvestmentPercentage: freshTherapist.reinvestment_percentage,
        });

        const { error: freezeError } = await supabase
          .from('appointments')
          .update(snapshotColumns)
          .in('id', unfrozenAppointmentIds);

        if (freezeError) throw freezeError;
      }

      const expenseDescription = t('payroll.payoutExpenseDescription', {
        therapist: payoutTherapist.name,
        period: currentPeriod.label,
      });

      const { error: expenseError } = await supabase
        .from('expenses')
        .insert({
          description: expenseDescription,
          amount: numericAmount,
          date: payoutDate,
          category: 'Payroll',
          payment_method: payoutMethod,
          clinic_id: clinicId,
          recorded_by: user.id,
        });

      if (expenseError) {
        await supabase.from('therapist_payouts').delete().eq('id', payoutData.id);
        throw expenseError;
      }

      toast({
        title: t('payroll.payoutRecorded'),
        description: t('payroll.payoutRecordedDesc'),
      });

      setPayoutDialogOpen(false);
      setPayoutTherapist(null);
      queryClient.invalidateQueries({ queryKey: ['therapist-payouts'] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['daily-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-expenses'] });
    } catch (error) {
      console.error('Error registering payout:', error);
      toast({
        title: t('common.error'),
        description: t('payroll.payoutFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  const getPayoutStatus = (therapistId: string) => {
    const therapist = payrollData?.therapistStats?.find((item: any) => item.id === therapistId);
    const earnings = therapist ? getNetPayable(therapist) : 0;
    const totalPaid = getTotalPaid(therapistId);

    if (earnings > 0 && totalPaid >= earnings) return 'paid';
    if (totalPaid > 0 && totalPaid < earnings) return 'partial';
    if (isPastPeriod && earnings > 0) return 'delayed';
    return 'pending';
  };

  const getStatusBadge = (status: string) => {
    if (status === 'paid') {
      return <Badge className="bg-green-600 text-white">{t('payroll.statusPaid')}</Badge>;
    }
    if (status === 'partial') {
      return <Badge className="bg-amber-500 text-white">{t('payroll.statusPartial')}</Badge>;
    }
    if (status === 'delayed') {
      return <Badge className="bg-red-500 text-white">{t('payroll.statusDelayed')}</Badge>;
    }
    return <Badge variant="secondary">{t('payroll.statusPending')}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t('payroll.title')}</h1>
            <p className="text-muted-foreground">{t('payroll.managePayroll')}</p>
          </div>
        </div>
        
        <div className="grid gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('payroll.title')}</h1>
          <p className="text-muted-foreground">
            {t('payroll.managePayrollFor', { period: currentPeriod.label })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!!isExporting || !clinicId}
            onClick={() =>
              clinicId &&
              exportPayrollReportToCsv(
                clinicId,
                startOfDay(currentPeriod.startDate),
                endOfDay(currentPeriod.endDate),
                currentPeriod.label
              )
            }
          >
            {isExporting === 'payroll' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {t('payroll.exportReport')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!payrollData || !clinicId}
            onClick={handlePrintPayrollReport}
          >
            <Printer className="h-4 w-4 mr-2" />
            {t('payroll.printReport')}
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">{t('payroll.payPeriod')}</p>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-64 bg-input border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((period) => (
                    <SelectItem 
                      key={period.value} 
                      value={period.value}
                      className={period.isCurrent ? "font-semibold text-blue-600" : ""}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{period.label}</span>
                        {period.isCurrent && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            {t('common.current')}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-green-400" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('payroll.totalRevenue')}</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrencyWithClinic(Number(payrollData?.totals.totalRevenue || 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-blue-400" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('payroll.revenuePreIVA')}</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrencyWithClinic(Number(payrollData?.totals.totalRevenueBeforeIVA || 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-purple-400" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('payroll.totalIVA')}</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrencyWithClinic(Number(payrollData?.totals.totalIVA || 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-yellow-400" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('payroll.therapistNetPayout')}</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrencyWithClinic(
                    Number(payrollData?.totals.totalTherapistEarningsNet || 0) -
                    Object.values(therapistExpenses || {}).reduce((s: number, v: any) => s + Number(v || 0), 0)
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-orange-400" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('payroll.clinicEarnings')}</p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="text-2xl font-bold text-foreground inline-flex items-center gap-1 cursor-help decoration-dotted underline underline-offset-4">
                      {formatCurrencyWithClinic(Number(payrollData?.totals.totalClinicEarnings || 0))}
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </p>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('payroll.totalReinvestedLabel')}: {formatCurrencyWithClinic(Number(payrollData?.totals.totalTherapistReinvestment || 0))}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-red-400" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('payroll.totalSessions')}</p>
                <p className="text-2xl font-bold text-foreground">
                  {payrollData?.totals.totalAppointments || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Therapist Payroll Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">{t('payroll.therapistEarningsBreakdown')}</CardTitle>
          <CardDescription className="text-muted-foreground">
            {t('payroll.individualPerformance', { period: currentPeriod.label })}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {payrollData?.therapistStats && payrollData.therapistStats.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-foreground">{t('payroll.therapist')}</TableHead>
                  <TableHead className="text-foreground">{t('common.sessions')}</TableHead>
                  <TableHead className="text-foreground">{t('payroll.totalRevenue')}</TableHead>
                  <TableHead className="text-foreground">{t('payroll.therapistShare')}</TableHead>
                  <TableHead className="text-foreground">{t('payroll.clinicShare')}</TableHead>
                  <TableHead className="text-foreground">{t('common.status')}</TableHead>
                  <TableHead className="text-foreground">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollData.therapistStats.map((therapist: any) => (
                  (() => {
                    const status = getPayoutStatus(therapist.id);
                    const gross = Number(therapist.therapistEarnings || 0);
                    // Full-pay (100%) sessions are exempt from both the commission rate and
                    // retention — they pass straight through on top of the commission-based
                    // gross. Split out here so the tooltip can make that explicit instead of
                    // presenting one blended "Gross" figure.
                    const fullPayAmount = Number(therapist.fullPayAmount || 0);
                    const commissionOnlyGross = gross - fullPayAmount;
                    const retentionAmount = Number(therapist.therapistRetentionAmount || 0);
                    const retentionRate = Number(therapist.therapistRetentionRateApplied || 0);
                    const attributedExpenses = getAttributedExpenses(therapist.id);
                    const attributedTherapistPayments = getAttributedTherapistPayments(therapist.id);
                    const netPayable = getNetPayable(therapist);
                    const remainingAmount = getRemainingAmount(therapist.id, netPayable);
                    const hasEarnings = netPayable > 0;
                    return (
                  <TableRow key={therapist.id} className="hover:bg-muted/50 border-border">
                    <TableCell>
                      <div className="font-medium text-foreground">
                        {therapist.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {therapist.compensationType === 'percentage'
                          ? `${Number(therapist.effectiveCommissionPercentage || 0).toFixed(0)}% ${t('payroll.commissionShort')}`
                          : `${formatCurrencyWithClinic(Number(therapist.effectiveFixedSessionAmount || 0))}/${t('common.sessions')}`}
                        {therapist.incentiveApplied && ` · ${t('payroll.incentiveApplied')}`}
                      </div>
                      {therapist.fullPayAppointments > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge className="mt-1 cursor-help bg-purple-600 text-white hover:bg-purple-600">
                              {t('payroll.fullPayBadge', { count: therapist.fullPayAppointments })}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            {therapist.fullPayDetails.map((detail: { clientName: string; amount: number }, i: number) => (
                              <p key={i}>{detail.clientName}: {formatCurrencyWithClinic(detail.amount)}</p>
                            ))}
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {therapist.therapistReinvestmentAmount > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge className="mt-1 ml-1 cursor-help bg-teal-600 text-white hover:bg-teal-600">
                              {t('payroll.reinvestmentBadge', { percentage: Number(therapist.reinvestmentPercentageApplied || 0).toFixed(0) })}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t('payroll.reinvestmentAmountLabel')}: {formatCurrencyWithClinic(Number(therapist.therapistReinvestmentAmount || 0))}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {therapist.totalAppointments}
                    </TableCell>
                    <TableCell className="text-foreground">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center gap-1 cursor-help decoration-dotted underline underline-offset-4">
                            {formatCurrencyWithClinic(Number(therapist.totalRevenue))}
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{t('payroll.revenuePreIVA')}: {formatCurrencyWithClinic(Number(therapist.totalRevenueBeforeIVA))}</p>
                          <p>{t('payroll.totalIVA')}: {formatCurrencyWithClinic(Number(therapist.totalIVA))}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="font-medium text-green-600 inline-flex items-center gap-1 cursor-help decoration-dotted underline underline-offset-4">
                            {formatCurrencyWithClinic(netPayable)}
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {fullPayAmount > 0 ? (
                            <>
                              <p>
                                {t('payroll.grossCommissionLabel')}
                                {therapist.compensationType === 'percentage' && ` (${Number(therapist.effectiveCommissionPercentage || 0).toFixed(0)}%)`}
                                : {formatCurrencyWithClinic(commissionOnlyGross)}
                              </p>
                              <p>
                                {t('payroll.retentionLabel')} ({retentionRate.toFixed(0)}%, {t('payroll.retentionCommissionOnlyNote')}): {retentionAmount >= 0 ? '−' : '+'}{formatCurrencyWithClinic(Math.abs(retentionAmount))}
                              </p>
                              <p>
                                {t('payroll.grossFullPayLabel', { count: therapist.fullPayAppointments })}: +{formatCurrencyWithClinic(fullPayAmount)}
                              </p>
                            </>
                          ) : (
                            <>
                              <p>{t('payroll.grossLabel')}: {formatCurrencyWithClinic(gross)}</p>
                              <p>{t('payroll.retentionLabel')} ({retentionRate.toFixed(0)}%): {retentionAmount >= 0 ? '−' : '+'}{formatCurrencyWithClinic(Math.abs(retentionAmount))}</p>
                            </>
                          )}
                          {attributedExpenses > 0 && (
                            <p>{t('payroll.expensesShort')}: −{formatCurrencyWithClinic(attributedExpenses)}</p>
                          )}
                          {attributedTherapistPayments > 0 && (
                            <p>{t('payroll.therapistPaymentsLabel')}: +{formatCurrencyWithClinic(attributedTherapistPayments)}</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatCurrencyWithClinic(Number(therapist.clinicEarnings))}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(status)}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!hasEarnings || remainingAmount <= 0}
                        onClick={() => openPayoutDialog(therapist)}
                      >
                        {t('payroll.registerPayout')}
                      </Button>
                    </TableCell>
                  </TableRow>
                    );
                  })()
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">{t('payroll.noPayrollData')}</h3>
              <p className="text-muted-foreground">
                {t('payroll.noCompletedAppointments')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payouts recorded this period */}
      {(payoutRecords?.length ?? 0) > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">{t('payroll.payoutsRecorded', 'Pagos registrados')}</CardTitle>
            <CardDescription className="text-muted-foreground">
              {t('payroll.payoutsRecordedDesc', 'Pagos de terapeutas con estado de CFDI.')}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-foreground">{t('payroll.therapist')}</TableHead>
                  <TableHead className="text-foreground">{t('payroll.payoutAmount')}</TableHead>
                  <TableHead className="text-foreground">{t('payroll.payoutDate')}</TableHead>
                  <TableHead className="text-foreground">{t('payroll.payoutMethod')}</TableHead>
                  <TableHead className="text-foreground">{t('payroll.cfdiStatus', 'CFDI')}</TableHead>
                  <TableHead className="text-foreground text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payoutRecords!.map((payout: any) => {
                  const therapistName = payout.therapists
                    ? `${payout.therapists.first_name ?? ''} ${payout.therapists.last_name ?? ''}`.trim()
                    : '-';
                  const hasCfdi = !!payout.cfdi_invoice_id && payout.cfdi_invoices;
                  return (
                    <TableRow key={payout.id} className="border-border">
                      <TableCell className="text-foreground">{therapistName}</TableCell>
                      <TableCell className="text-foreground">
                        {formatCurrencyWithClinic(Number(payout.amount))}
                      </TableCell>
                      <TableCell className="text-foreground">{payout.payout_date}</TableCell>
                      <TableCell className="text-foreground capitalize">{payout.payment_method}</TableCell>
                      <TableCell>
                        {hasCfdi ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            {t('payroll.cfdiAttached')}
                          </Badge>
                        ) : (
                          <Badge variant="outline">{t('payroll.noCfdi')}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {hasCfdi ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8"
                            onClick={async () => {
                              const inv = payout.cfdi_invoices;
                              if (!inv) return;
                              const url = await getCfdiFileUrl(inv, 'pdf');
                              if (url) window.open(url, '_blank');
                            }}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            PDF
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8"
                            onClick={() => setAttachCfdiPayoutId(payout.id)}
                          >
                            <Paperclip className="h-4 w-4 mr-1" />
                            {t('payroll.attachCfdi')}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{t('payroll.registerPayout')}</DialogTitle>
            <DialogDescription>
              {payoutTherapist?.name ? t('payroll.registerPayoutFor', { therapist: payoutTherapist.name }) : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {payoutTherapist && (
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>{t('payroll.payoutPaidSoFar')}</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrencyWithClinic(getTotalPaid(payoutTherapist.id))}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span>{t('payroll.payoutRemaining')}</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrencyWithClinic(payoutRemaining)}
                  </span>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="payoutAmount">{t('payroll.payoutAmount')}</Label>
              <Input
                id="payoutAmount"
                type="number"
                min="0"
                step="0.01"
                value={payoutAmount}
                onChange={(event) => setPayoutAmount(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payoutMethod">{t('payroll.payoutMethod')}</Label>
              <Select value={payoutMethod} onValueChange={(value) => setPayoutMethod(value as any)}>
                <SelectTrigger id="payoutMethod">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transfer">{t('finance.transfer')}</SelectItem>
                  <SelectItem value="cash">{t('finance.cash')}</SelectItem>
                  <SelectItem value="card">{t('finance.card')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payoutDate">{t('payroll.payoutDate')}</Label>
              <Input
                id="payoutDate"
                type="date"
                value={payoutDate}
                onChange={(event) => setPayoutDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payoutNotes">{t('payroll.payoutNotes')}</Label>
              <Textarea
                id="payoutNotes"
                value={payoutNotes}
                onChange={(event) => setPayoutNotes(event.target.value)}
                placeholder={t('payroll.payoutNotesPlaceholder')}
              />
            </div>
            <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
              <Label className="text-sm">{t('payroll.cfdiOptional')}</Label>
              <p className="text-xs text-muted-foreground">{t('payroll.cfdiPayoutHint', 'XML (egreso) y PDF opcional.')}</p>
              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  accept=".xml,application/xml"
                  className="text-sm file:mr-2 file:rounded file:border file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground"
                  onChange={(e) => setCfdiXmlFile(e.target.files?.[0] ?? null)}
                />
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  className="text-sm file:mr-2 file:rounded file:border file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground"
                  onChange={(e) => setCfdiPdfFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPayoutDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleRegisterPayout} disabled={isSubmittingPayout}>
              {isSubmittingPayout && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('payroll.confirmPayout')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Attach CFDI to existing payout */}
      {clinicId && (
        <CfdiUploadModal
          open={!!attachCfdiPayoutId}
          onClose={() => setAttachCfdiPayoutId(null)}
          onSuccess={() => setAttachCfdiPayoutId(null)}
          clinicId={clinicId}
          mode="payout"
          therapistPayoutId={attachCfdiPayoutId ?? undefined}
        />
      )}
    </div>
  );
};

export default Payroll;
