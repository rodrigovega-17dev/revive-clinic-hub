import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { useClinic, useClinicSettings } from '@/hooks/useClinic';
import { DollarSign, TrendingUp, Minus, Receipt, Printer, Pencil, Trash2 } from 'lucide-react';
import { openFinanceReport, FinanceReportTable } from '@/lib/finance-report';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { useLanguage } from '@/hooks/useLanguage';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import SearchInput from '@/components/SearchInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { facturapiService } from '@/integrations/facturapi/service';
import { FileText, Loader2, Upload } from 'lucide-react';
import { useClinicFacturapiConfig } from '@/hooks/useClinicFacturapiConfig';
import { CfdiUploadModal } from '@/components/CfdiUploadModal';
import PaymentForm, { type EditablePayment } from './PaymentForm';
import ExpenseForm, { type EditableExpense } from './ExpenseForm';
import { useDeleteStandalonePayment } from '@/hooks/usePayments';
import { useDeleteExpense } from '@/hooks/useExpenses';

const MonthlyFinanceSection = () => {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const { clinicId } = useAuth();
  const { data: clinic } = useClinic();
  const { currency, timezone } = useClinicSettings();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPeriod, setSelectedPeriod] = useState<'current' | 'previous' | 'custom'>('current');
  const [searchTerm, setSearchTerm] = useState('');
  const [issuingGlobalCfdi, setIssuingGlobalCfdi] = useState(false);
  const [showCfdiUploadModal, setShowCfdiUploadModal] = useState(false);
  const { configured: facturapiConfigured } = useClinicFacturapiConfig();
  const [editingPayment, setEditingPayment] = useState<EditablePayment | null>(null);
  const [editingExpense, setEditingExpense] = useState<EditableExpense | null>(null);
  const deleteStandalonePayment = useDeleteStandalonePayment();
  const deleteExpense = useDeleteExpense();

  const handleDeletePayment = async (paymentId: string) => {
    if (!window.confirm(t('finance.confirmDeletePayment'))) return;
    try {
      await deleteStandalonePayment.mutateAsync(paymentId);
      toast({ title: t('common.success'), description: t('finance.paymentDeleted') });
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast({
        title: t('common.error'),
        description: t('finance.failedToDeletePayment'),
        variant: 'destructive',
      });
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!window.confirm(t('finance.confirmDeleteExpense'))) return;
    try {
      await deleteExpense.mutateAsync(expenseId);
      toast({ title: t('common.success'), description: t('finance.expenseDeleted') });
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast({
        title: t('common.error'),
        description: t('finance.failedToDeleteExpense'),
        variant: 'destructive',
      });
    }
  };

  // Get current month range
  const currentMonth = new Date();
  const previousMonth = subMonths(currentMonth, 1);
  const defaultCustomMonth = subMonths(currentMonth, 2);
  const [customMonth, setCustomMonth] = useState(defaultCustomMonth.getMonth());
  const [customYear, setCustomYear] = useState(defaultCustomMonth.getFullYear());
  const locale = currentLanguage === 'es' ? es : enUS;
  
  const periodRanges = {
    current: { start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) },
    previous: { start: startOfMonth(previousMonth), end: endOfMonth(previousMonth) },
    custom: { start: startOfMonth(new Date(customYear, customMonth, 1)), end: endOfMonth(new Date(customYear, customMonth, 1)) },
  };

  const currentRange = periodRanges[selectedPeriod as keyof typeof periodRanges];

  const { previousMonthYear, previousMonthIndex } = useMemo(() => ({
    previousMonthYear: previousMonth.getFullYear(),
    previousMonthIndex: previousMonth.getMonth(),
  }), [previousMonth]);

  const isCustomMonthAllowed = (year: number, monthIndex: number) => {
    if (year < previousMonthYear) return true;
    if (year > previousMonthYear) return false;
    return monthIndex < previousMonthIndex;
  };

  const availableYears = useMemo(() => {
    const maxYear = previousMonthYear;
    const years: number[] = [];
    for (let year = maxYear; year >= 1980; year -= 1) {
      years.push(year);
    }
    return years;
  }, [previousMonthYear]);

  // Fetch financial data
  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['payments', selectedPeriod, customMonth, customYear, clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          clients (first_name, last_name),
          appointments (start_time, therapists (first_name, last_name, calendar_color_id, email))
        `)
        .eq('clinic_id', clinicId)
        .gte('payment_date', currentRange.start.toISOString())
        .lte('payment_date', currentRange.end.toISOString())
        .order('payment_date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!clinicId,
  });

  // Fetch expenses
  const { data: expenses, isLoading: expensesLoading } = useQuery({
    queryKey: ['expenses', selectedPeriod, customMonth, customYear, clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('clinic_id', clinicId)
        .gte('date', format(currentRange.start, 'yyyy-MM-dd'))
        .lte('date', format(currentRange.end, 'yyyy-MM-dd'))
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!clinicId,
  });

  // Fetch appointments for the period (for the report's appointment summary)
  const { data: monthAppointments } = useQuery({
    queryKey: ['monthly-appointments-stats', selectedPeriod, customMonth, customYear, clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      const { data, error } = await supabase
        .from('appointments')
        .select('status')
        .eq('clinic_id', clinicId)
        .gte('start_time', currentRange.start.toISOString())
        .lte('start_time', currentRange.end.toISOString());

      if (error) throw error;
      return data || [];
    },
    enabled: !!clinicId,
  });

  const filteredPayments = payments?.filter(payment => {
    if (!searchTerm.trim()) return true;
    
    const searchableText = [
      payment.clients?.first_name,
      payment.clients?.last_name,
      payment.method,
      payment.description,
      payment.appointments?.therapists?.first_name,
      payment.appointments?.therapists?.last_name,
    ].filter(Boolean).join(' ').toLowerCase();
    
    return searchableText.includes(searchTerm.toLowerCase());
  }) || [];

  // Revenue = only real money; exclude balance (credit) payments and adjustment
  // entries (prior-debt bookkeeping, not cash actually collected this month).
  const totalPayments = payments?.reduce((sum, p) => (p.method === 'balance' || p.method === 'adjustment' ? sum : sum + Number(p.amount)), 0) || 0;
  const totalExpenses = expenses?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;
  const cashPayments = payments?.filter(p => p.method === 'cash').reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;
  const intangiblePayments = payments?.filter(p => p.method !== 'cash' && p.method !== 'balance' && p.method !== 'adjustment').reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'cash': return 'bg-green-100 text-green-800';
      case 'card': return 'bg-blue-100 text-blue-800';
      case 'transfer': return 'bg-purple-100 text-purple-800';
      case 'cheque': return 'bg-teal-100 text-teal-800';
      case 'insurance': return 'bg-orange-100 text-orange-800';
      case 'adjustment': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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

  const getExpenseCategoryText = (category: string) => {
    switch (category) {
      case 'supplies': return t('finance.supplies');
      case 'office': return t('finance.office');
      case 'maintenance': return t('finance.maintenance');
      case 'utilities': return t('finance.utilities');
      case 'equipment': return t('finance.equipment');
      case 'marketing': return t('finance.marketing');
      case 'travel': return t('finance.travel');
      case 'food': return t('finance.food');
      case 'taxes': return t('finance.taxes');
      case 'payroll_contributions': return t('finance.payrollContributions');
      case 'professional_services': return t('finance.professionalServices');
      case 'general': return t('finance.general');
      default: return category;
    }
  };

  // Clinic-aware currency formatting
  const formatCurrencyWithClinic = (value: number) => {
    return formatCurrency(value, 2, currency);
  };

  const formatReportDateTime = (value: string) =>
    new Intl.DateTimeFormat(currentLanguage === 'es' ? 'es-MX' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: timezone,
    }).format(new Date(value));

  const handlePrintReport = () => {
    const reportPayments = payments || [];
    const reportExpenses = expenses || [];

    const apptTotal = monthAppointments?.length || 0;
    const apptCompleted = monthAppointments?.filter((a) => a.status === 'completed').length || 0;
    const apptCancelled = monthAppointments?.filter((a) => a.status === 'cancelled').length || 0;
    const apptNoShow = monthAppointments?.filter((a) => a.status === 'no_show').length || 0;
    const apptActive = monthAppointments?.filter((a) => ['scheduled', 'confirmed', 'in_progress', 'waiting_checkout'].includes(a.status)).length || 0;

    const paymentsTable: FinanceReportTable = {
      title: t('finance.paymentHistory'),
      columns: [t('finance.date'), t('finance.client'), t('finance.therapist'), t('finance.method'), t('finance.amount')],
      numericColumns: [4],
      emptyText: t('finance.noPaymentsYet'),
      rows: reportPayments.map((payment) => [
        formatReportDateTime(payment.payment_date),
        payment.clients ? `${payment.clients.first_name} ${payment.clients.last_name}` : 'N/A',
        payment.appointments?.therapists
          ? `${payment.appointments.therapists.first_name} ${payment.appointments.therapists.last_name}`
          : 'N/A',
        getPaymentMethodText(payment.method),
        formatCurrencyWithClinic(payment.amount),
      ]),
      mutedRows: reportPayments.map((payment) => payment.method === 'balance' || payment.method === 'adjustment'),
      note: reportPayments.some((payment) => payment.method === 'balance' || payment.method === 'adjustment')
        ? t('finance.reportExcludedNote')
        : undefined,
      footer: [t('finance.totalRevenue'), '', '', '', formatCurrencyWithClinic(totalPayments)],
    };

    const expensesTable: FinanceReportTable = {
      title: t('finance.expenses'),
      columns: [t('finance.date'), t('finance.description'), t('finance.category'), t('finance.amount')],
      numericColumns: [3],
      emptyText: t('finance.noExpensesYet'),
      rows: reportExpenses.map((expense) => [
        formatReportDateTime(expense.created_at || expense.date),
        expense.description || '-',
        getExpenseCategoryText(expense.category || 'general'),
        formatCurrencyWithClinic(expense.amount),
      ]),
      footer: [t('finance.totalExpenses'), '', '', formatCurrencyWithClinic(totalExpenses)],
    };

    openFinanceReport({
      clinicName: clinic?.name || t('finance.title'),
      clinicLogoUrl: clinic?.logo_url,
      reportTitle: t('finance.reportMonthlyTitle'),
      periodLabel: format(currentRange.start, 'MMMM yyyy', { locale }),
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
        { label: t('finance.totalRevenue'), value: formatCurrencyWithClinic(totalPayments) },
        { label: t('finance.cashRevenue'), value: formatCurrencyWithClinic(cashPayments) },
        { label: t('finance.totalIntangible'), value: formatCurrencyWithClinic(intangiblePayments) },
        { label: t('finance.totalExpenses'), value: formatCurrencyWithClinic(totalExpenses) },
        { label: t('finance.netTotal'), value: formatCurrencyWithClinic(totalPayments - totalExpenses), highlight: true },
      ],
      tables: [paymentsTable, expensesTable],
    });
  };

  if (paymentsLoading || expensesLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Tabs value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as 'current' | 'previous' | 'custom')}>
          <TabsList className="bg-muted">
            <TabsTrigger value="current">{t('finance.currentMonth')}</TabsTrigger>
            <TabsTrigger value="previous">{t('finance.previousMonth')}</TabsTrigger>
            <TabsTrigger value="custom">{t('finance.customMonth')}</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button variant="outline" size="sm" onClick={handlePrintReport} className="w-full sm:w-auto">
          <Printer className="h-4 w-4 mr-2" />
          {t('finance.printMonthlyReport')}
        </Button>
      </div>

      {selectedPeriod === 'custom' && (
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label htmlFor="custom-month">{t('finance.selectMonth')}</Label>
            <Select
              value={String(customMonth)}
              onValueChange={(value) => setCustomMonth(Number(value))}
            >
              <SelectTrigger id="custom-month" className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, monthIndex) => {
                  const monthLabel = format(new Date(2000, monthIndex, 1), 'MMMM', { locale });
                  return (
                    <SelectItem
                      key={monthIndex}
                      value={String(monthIndex)}
                      disabled={!isCustomMonthAllowed(customYear, monthIndex)}
                    >
                      {monthLabel}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="custom-year">{t('finance.selectYear')}</Label>
            <Select
              value={String(customYear)}
              onValueChange={(value) => setCustomYear(Number(value))}
            >
              <SelectTrigger id="custom-year" className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Monthly Financial Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-green-400" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('finance.totalRevenue')}</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrencyWithClinic(totalPayments)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Minus className="h-4 w-4 text-red-400" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('finance.totalExpenses')}</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrencyWithClinic(totalExpenses)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-green-400" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('finance.cashRevenue')}</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrencyWithClinic(cashPayments)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-blue-400" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('finance.netTotal')}</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrencyWithClinic(totalPayments - totalExpenses)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-4">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder={t('finance.searchPayments')}
          className="max-w-md"
        />
        <div className="text-sm text-muted-foreground">
          {filteredPayments.length} {t('finance.ofPayments')} {payments?.length || 0}
        </div>
      </div>

      {/* Payments Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">{t('finance.paymentHistory')}</CardTitle>
          <CardDescription className="text-muted-foreground">
            {t('finance.allPaymentsFor', { period: format(currentRange.start, 'MMMM yyyy', { locale }) })}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {filteredPayments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-foreground">{t('finance.date')}</TableHead>
                  <TableHead className="text-foreground">{t('finance.client')}</TableHead>
                  <TableHead className="text-foreground">{t('finance.amount')}</TableHead>
                  <TableHead className="text-foreground">{t('finance.method')}</TableHead>
                  <TableHead className="text-foreground">{t('finance.description')}</TableHead>
                  <TableHead className="text-foreground text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => {
                  const isStandalone = !payment.appointment_id;
                  return (
                  <TableRow key={payment.id} className="hover:bg-muted/50 border-border">
                    <TableCell className="text-foreground">
                      {format(new Date(payment.payment_date), 'MMM d, yyyy', { locale })}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {payment.clients ?
                        `${payment.clients.first_name} ${payment.clients.last_name}` :
                        'N/A'
                      }
                    </TableCell>
                    <TableCell className={`font-medium ${payment.amount < 0 ? 'text-red-600' : 'text-foreground'}`}>
                      {formatCurrencyWithClinic(payment.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge className={getPaymentMethodColor(payment.method)}>
                        {getPaymentMethodText(payment.method)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {payment.description || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {isStandalone && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditingPayment(payment as unknown as EditablePayment)}
                            title={t('common.edit')}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDeletePayment(payment.id)}
                            title={t('common.delete')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {searchTerm ? t('finance.noPaymentsFound') : t('finance.noPaymentsYet')}
              </h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? t('finance.tryAdjustingSearch')
                  : t('finance.paymentsWillAppear')
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">{t('finance.expenses')}</CardTitle>
          <CardDescription className="text-muted-foreground">
            {t('finance.allExpensesFor', { period: format(currentRange.start, 'MMMM yyyy', { locale }) })}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {expenses && expenses.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-foreground">{t('finance.date')}</TableHead>
                  <TableHead className="text-foreground">{t('finance.description')}</TableHead>
                  <TableHead className="text-foreground">{t('finance.category')}</TableHead>
                  <TableHead className="text-foreground">{t('finance.amount')}</TableHead>
                  <TableHead className="text-foreground text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id} className="hover:bg-muted/50 border-border">
                    <TableCell className="text-foreground">
                      {format(new Date(expense.date), 'MMM d, yyyy', { locale })}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {expense.description}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getExpenseCategoryText(expense.category)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-red-600">
                      {formatCurrencyWithClinic(expense.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setEditingExpense(expense as unknown as EditableExpense)}
                          title={t('common.edit')}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDeleteExpense(expense.id)}
                          title={t('common.delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Minus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">{t('finance.noExpensesYet')}</h3>
              <p className="text-muted-foreground">
                {t('finance.expensesWillAppear')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Global CFDI – at bottom */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t('cfdi.issueGlobalCfdi')}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {format(currentRange.start, 'd MMM yyyy', { locale })} – {format(currentRange.end, 'd MMM yyyy', { locale })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!clinicId}
            onClick={() => setShowCfdiUploadModal(true)}
          >
            <Upload className="mr-2 h-4 w-4" />
            {t('cfdi.uploadGlobalCfdi')}
          </Button>
          {facturapiConfigured ? (
            <Button
              variant="outline"
              size="sm"
              disabled={issuingGlobalCfdi || !clinicId}
              onClick={async () => {
                if (!clinicId) return;
                setIssuingGlobalCfdi(true);
                try {
                  const result = await facturapiService.issueGlobalInvoice({
                    clinicId,
                    periodStart: format(currentRange.start, 'yyyy-MM-dd'),
                    periodEnd: format(currentRange.end, 'yyyy-MM-dd'),
                  });
                  queryClient.invalidateQueries({ queryKey: ['monthly-payments'] });
                  queryClient.invalidateQueries({ queryKey: ['payments'] });
                  toast({ title: t('common.success'), description: t('cfdi.issueGlobalCfdiSuccess') });
                  if (result.pdf_url) window.open(result.pdf_url, '_blank');
                } catch (e) {
                  toast({
                    title: t('common.error'),
                    description: (e as Error).message || 'Failed to issue global CFDI',
                    variant: 'destructive',
                  });
                } finally {
                  setIssuingGlobalCfdi(false);
                }
              }}
            >
              {issuingGlobalCfdi && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('cfdi.issueGlobalCfdi')}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">{t('cfdi.generateRequiresFacturapi')}</p>
          )}
        </CardContent>
      </Card>
      {clinicId && (
        <CfdiUploadModal
          open={showCfdiUploadModal}
          onClose={() => setShowCfdiUploadModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['monthly-payments'] });
            queryClient.invalidateQueries({ queryKey: ['payments'] });
          }}
          clinicId={clinicId}
          mode="global"
          periodStart={format(currentRange.start, 'yyyy-MM-dd')}
          periodEnd={format(currentRange.end, 'yyyy-MM-dd')}
        />
      )}

      <PaymentForm
        open={!!editingPayment}
        onClose={() => setEditingPayment(null)}
        editingPayment={editingPayment}
      />
      <ExpenseForm
        open={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        editingExpense={editingExpense}
      />
    </div>
  );
};

export default MonthlyFinanceSection;
