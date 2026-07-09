import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar, DollarSign, TrendingUp, TrendingDown, Receipt, CreditCard, Eye, ArrowLeftRight, Shield, Printer, Landmark } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useClinic, useClinicSettings } from '@/hooks/useClinic';
import { useLanguage } from '@/hooks/useLanguage';
import { openFinanceReport, FinanceReportTable } from '@/lib/finance-report';
import DateFilter from '@/components/DateFilter';
import PaymentForm from './PaymentForm';
import ExpenseForm from './ExpenseForm';

interface DailyFinanceSectionProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

const DailyFinanceSection = ({ selectedDate, onDateChange }: DailyFinanceSectionProps) => {
  const { t } = useTranslation();
  const { clinicId } = useAuth();
  const { data: clinic } = useClinic();
  const { currency, timezone } = useClinicSettings();
  const { currentLanguage } = useLanguage();
  const locale = currentLanguage === 'es' ? es : enUS;
  const [showAllPayments, setShowAllPayments] = useState(false);

  // Fetch daily payments
  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['daily-payments', selectedDate, showAllPayments, clinicId],
    queryFn: async () => {
      if (!clinicId) return [];

      let query = supabase
        .from('payments')
        .select(`
          *,
          clients (
            first_name,
            last_name
          ),
          appointments (
            start_time,
            therapists (
              first_name,
              last_name,
              calendar_color_id,
              email
            )
          )
        `)
        .eq('clinic_id', clinicId)
        .order('payment_date', { ascending: false });

      if (!showAllPayments) {
        const startDate = startOfDay(selectedDate);
        const endDate = endOfDay(selectedDate);
        
        query = query
          .gte('payment_date', startDate.toISOString())
          .lte('payment_date', endDate.toISOString());
      }
      
      const { data, error } = await query;

      if (error) {
        console.error('Error fetching payments:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!clinicId,
  });

  // Fetch daily expenses
  const { data: expenses, isLoading: expensesLoading } = useQuery({
    queryKey: ['daily-expenses', selectedDate, clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('date', format(selectedDate, 'yyyy-MM-dd'))
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!clinicId,
  });

  // Fetch daily appointments (for the report's appointment summary)
  const { data: dayAppointments } = useQuery({
    queryKey: ['daily-appointments-stats', selectedDate, clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      const startDate = startOfDay(selectedDate);
      const endDate = endOfDay(selectedDate);

      const { data, error } = await supabase
        .from('appointments')
        .select('status')
        .eq('clinic_id', clinicId)
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString());

      if (error) throw error;
      return data || [];
    },
    enabled: !!clinicId,
  });

  // Revenue = only real money received today; exclude balance (credit) payments and
  // adjustment entries (prior-debt bookkeeping, not cash actually collected today).
  const totalRevenue = payments?.reduce((sum, p) => (p.method === 'balance' || p.method === 'adjustment' ? sum : sum + Number(p.amount)), 0) || 0;
  const totalExpenses = expenses?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;
  const netProfit = totalRevenue - totalExpenses;

  const totalCash = payments?.filter(p => p.method === 'cash' || p.method === 'cheque').reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const totalIntangible = payments?.filter(p => p.method !== 'cash' && p.method !== 'cheque' && p.method !== 'balance' && p.method !== 'adjustment').reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const amountInCashier = totalCash - totalExpenses;

  // Appointment counts for the day (for the printable report)
  const apptTotal = dayAppointments?.length || 0;
  const apptCompleted = dayAppointments?.filter(a => a.status === 'completed').length || 0;
  const apptCancelled = dayAppointments?.filter(a => a.status === 'cancelled').length || 0;
  const apptNoShow = dayAppointments?.filter(a => a.status === 'no_show').length || 0;
  const apptActive = dayAppointments?.filter(a => ['scheduled', 'confirmed', 'in_progress', 'waiting_checkout'].includes(a.status)).length || 0;

  // Clinic-aware currency formatting
  const formatCurrencyWithClinic = (value: number) => {
    return formatCurrency(value, 2, currency);
  };

  const formatReportTime = (value: string) =>
    new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: timezone,
    }).format(new Date(value));

  const handlePrintReport = () => {
    // Keep the printable "corte del dia" strictly scoped to the selected date,
    // even if the on-screen table is toggled to "Show All".
    const reportDayStart = startOfDay(selectedDate);
    const reportDayEnd = endOfDay(selectedDate);
    const reportPayments = (payments || []).filter((payment) => {
      const paymentDate = new Date(payment.payment_date);
      return paymentDate >= reportDayStart && paymentDate <= reportDayEnd;
    });

    const reportTotalRevenue = reportPayments.reduce(
      (sum, payment) => (payment.method === 'balance' || payment.method === 'adjustment' ? sum : sum + Number(payment.amount)),
      0,
    );
    const reportTotalCash = reportPayments
      .filter((payment) => payment.method === 'cash' || payment.method === 'cheque')
      .reduce((sum, payment) => sum + Number(payment.amount), 0);
    const reportTotalIntangible = reportPayments
      .filter((payment) => payment.method !== 'cash' && payment.method !== 'cheque' && payment.method !== 'balance' && payment.method !== 'adjustment')
      .reduce((sum, payment) => sum + Number(payment.amount), 0);
    const reportAmountInCashier = reportTotalCash - totalExpenses;
    const reportNetProfit = reportTotalRevenue - totalExpenses;

    const paymentsTable: FinanceReportTable = {
      title: t('finance.dailyPayments'),
      columns: [t('finance.time'), t('finance.client'), t('finance.therapist'), t('finance.method'), t('finance.amount')],
      numericColumns: [4],
      emptyText: t('finance.noPaymentsToday'),
      rows: reportPayments.map((p) => [
        formatReportTime(p.payment_date),
        p.clients ? `${p.clients.first_name} ${p.clients.last_name}` : 'N/A',
        p.appointments?.therapists ? `${p.appointments.therapists.first_name} ${p.appointments.therapists.last_name}` : 'N/A',
        getPaymentMethodText(p.method),
        formatCurrencyWithClinic(p.amount),
      ]),
      mutedRows: reportPayments.map((p) => p.method === 'balance' || p.method === 'adjustment'),
      note: reportPayments.some((p) => p.method === 'balance' || p.method === 'adjustment')
        ? t('finance.reportExcludedNote')
        : undefined,
      footer: [t('finance.totalEarnings'), '', '', '', formatCurrencyWithClinic(reportTotalRevenue)],
    };

    const expensesTable: FinanceReportTable = {
      title: t('finance.dailyExpenses'),
      columns: [t('finance.time'), t('finance.description'), t('finance.category'), t('finance.amount')],
      numericColumns: [3],
      emptyText: t('finance.noExpensesToday'),
      rows: (expenses || []).map((e) => [
        formatReportTime(e.created_at),
        e.description || '-',
        e.category || 'general',
        formatCurrencyWithClinic(e.amount),
      ]),
      footer: [t('finance.expensesCash'), '', '', formatCurrencyWithClinic(totalExpenses)],
    };

    openFinanceReport({
      clinicName: clinic?.name || t('finance.title'),
      clinicLogoUrl: clinic?.logo_url,
      reportTitle: t('finance.reportDailyTitle'),
      periodLabel: format(selectedDate, 'PPPP', { locale }),
      generatedLabel: `${t('finance.reportGenerated')}: ${format(new Date(), 'PPpp', { locale })}`,
      appointmentsTitle: t('finance.appointmentsSummary'),
      appointmentStats: [
        { label: t('finance.totalAppointments'), value: String(apptTotal) },
        { label: t('finance.completedAppointments'), value: String(apptCompleted) },
        { label: t('finance.activeAppointments'), value: String(apptActive) },
        { label: t('finance.cancelledAppointments'), value: String(apptCancelled) },
        { label: t('finance.noShowAppointments'), value: String(apptNoShow) },
      ],
      financialTitle: t('finance.financialSummary'),
      financialStats: [
        { label: t('finance.totalEarnings'), value: formatCurrencyWithClinic(reportTotalRevenue) },
        { label: t('finance.totalCash'), value: formatCurrencyWithClinic(reportTotalCash) },
        { label: t('finance.totalIntangible'), value: formatCurrencyWithClinic(reportTotalIntangible) },
        { label: t('finance.expensesCash'), value: formatCurrencyWithClinic(totalExpenses) },
        { label: t('finance.amountInCashier'), value: formatCurrencyWithClinic(reportAmountInCashier), highlight: true },
        { label: t('finance.netProfit'), value: formatCurrencyWithClinic(reportNetProfit), highlight: true },
      ],
      tables: [paymentsTable, expensesTable],
    });
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return <DollarSign className="h-4 w-4 text-green-600" />;
      case 'card':
        return <CreditCard className="h-4 w-4 text-blue-600" />;
      case 'transfer':
        return <ArrowLeftRight className="h-4 w-4 text-purple-600" />;
      case 'cheque':
        return <Landmark className="h-4 w-4 text-teal-600" />;
      case 'insurance':
        return <Shield className="h-4 w-4 text-orange-600" />;
      case 'adjustment':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <DollarSign className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'cash': return t('finance.cash');
      case 'card': return t('finance.card');
      case 'transfer': return t('finance.transfer');
      case 'cheque': return t('finance.cheque');
      case 'insurance': return t('finance.insurance');
      case 'adjustment': return t('finance.adjustment');
      default: return method;
    }
  };

  if (paymentsLoading || expensesLoading) {
    return (
      <div className="space-y-6">
        <div className="h-32 w-full bg-muted animate-pulse rounded" />
        <div className="h-64 w-full bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Selector */}
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <DateFilter
              selectedDate={format(selectedDate, 'yyyy-MM-dd')}
              onDateChange={(dateString) => {
                const newDate = new Date(dateString + 'T00:00:00');
                onDateChange(newDate);
              }}
            />
            <Button variant="outline" size="sm" onClick={handlePrintReport} className="w-full sm:w-auto">
              <Printer className="h-4 w-4 mr-2" />
              {t('finance.printDailyReport')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Daily Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('finance.totalEarnings')}</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrencyWithClinic(totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-4 w-4 text-blue-400" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('finance.totalIntangible')}</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrencyWithClinic(totalIntangible)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('finance.totalCash')}</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrencyWithClinic(totalCash)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <TrendingDown className="h-4 w-4 text-red-400" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('finance.expensesCash')}</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrencyWithClinic(totalExpenses)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('finance.amountInCashier')}</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrencyWithClinic(amountInCashier)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground">{t('finance.dailyPayments')}</CardTitle>
              <CardDescription className="text-muted-foreground">
                {showAllPayments ? t('finance.allPayments') : t('finance.paymentsReceivedOn', { date: format(selectedDate, 'MMMM d, yyyy', { locale }) })}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAllPayments(!showAllPayments)}
            >
              <Eye className="h-4 w-4 mr-2" />
              {showAllPayments ? t('finance.showDaily') : t('finance.showAll')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {payments && payments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-foreground">{t('finance.time')}</TableHead>
                  <TableHead className="text-foreground">{t('finance.client')}</TableHead>
                  <TableHead className="text-foreground">{t('finance.therapist')}</TableHead>
                  <TableHead className="text-foreground">{t('finance.amount')}</TableHead>
                  <TableHead className="text-foreground">{t('finance.method')}</TableHead>
                  <TableHead className="text-foreground">{t('finance.description')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id} className="hover:bg-muted/50 border-border">
                    <TableCell className="text-foreground">
                      {new Intl.DateTimeFormat('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                        timeZone: timezone,
                      }).format(new Date(payment.payment_date))}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {payment.clients ? 
                        `${payment.clients.first_name} ${payment.clients.last_name}` : 
                        'N/A'
                      }
                    </TableCell>
                    <TableCell className="text-foreground">
                      {payment.appointments?.therapists ? 
                        `${payment.appointments.therapists.first_name} ${payment.appointments.therapists.last_name}` : 
                        'N/A'
                      }
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${payment.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrencyWithClinic(payment.amount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getPaymentMethodIcon(payment.method)}
                        <Badge variant="outline" className="capitalize">
                          {getPaymentMethodText(payment.method)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {payment.description || t('finance.paymentReceived')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {showAllPayments ? t('finance.noPaymentsFound') : t('finance.noPaymentsToday')}
              </h3>
              <p className="text-muted-foreground">
                {showAllPayments 
                  ? t('finance.noPaymentsRecorded')
                  : t('finance.noPaymentsOnDate', { date: format(selectedDate, 'MMMM d, yyyy', { locale }) })
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">{t('finance.dailyExpenses')}</CardTitle>
          <CardDescription className="text-muted-foreground">
            {t('finance.expensesRecordedOn', { date: format(selectedDate, 'MMMM d, yyyy', { locale }) })}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {expenses && expenses.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-foreground">{t('finance.description')}</TableHead>
                  <TableHead className="text-foreground">{t('finance.category')}</TableHead>
                  <TableHead className="text-foreground">{t('finance.amount')}</TableHead>
                  <TableHead className="text-foreground">{t('finance.time')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id} className="hover:bg-muted/50 border-border">
                    <TableCell className="text-foreground">{expense.description}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {expense.category || 'general'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-red-600">
                        -{formatCurrencyWithClinic(expense.amount)}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Intl.DateTimeFormat('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                        timeZone: timezone,
                      }).format(new Date(expense.created_at))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">{t('finance.noExpensesToday')}</h3>
              <p className="text-muted-foreground">
                {t('finance.noExpensesOnDate', { date: format(selectedDate, 'MMMM d, yyyy', { locale }) })}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DailyFinanceSection;
