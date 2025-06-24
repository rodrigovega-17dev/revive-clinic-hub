import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar, DollarSign, TrendingUp, TrendingDown, Receipt, CreditCard, Eye, ArrowLeftRight, Shield } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useClinicSettings } from '@/hooks/useClinic';
import { DateFilter } from '@/components/DateFilter';
import { PaymentForm } from './PaymentForm';
import { ExpenseForm } from './ExpenseForm';

interface DailyFinanceSectionProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

const DailyFinanceSection = ({ selectedDate, onDateChange }: DailyFinanceSectionProps) => {
  const { t } = useTranslation();
  const { clinicId } = useAuth();
  const { currency } = useClinicSettings();
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

  const totalRevenue = payments?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;
  const totalExpenses = expenses?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;
  const netProfit = totalRevenue - totalExpenses;
  
  // Calculate specific financial metrics
  const totalCash = payments?.filter(p => p.method === 'cash').reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const totalIntangible = payments?.filter(p => p.method !== 'cash').reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const amountInCashier = totalCash - totalExpenses;

  // Clinic-aware currency formatting
  const formatCurrencyWithClinic = (value: number) => {
    return formatCurrency(value, 2, currency);
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return <DollarSign className="h-4 w-4 text-green-600" />;
      case 'card':
        return <CreditCard className="h-4 w-4 text-blue-600" />;
      case 'transfer':
        return <ArrowLeftRight className="h-4 w-4 text-purple-600" />;
      case 'insurance':
        return <Shield className="h-4 w-4 text-orange-600" />;
      default:
        return <DollarSign className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'cash': return t('finance.cash');
      case 'card': return t('finance.card');
      case 'transfer': return t('finance.transfer');
      case 'insurance': return t('finance.insurance');
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
          <div className="flex items-center space-x-4">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">{t('finance.selectedDate')}</p>
              <p className="text-sm text-muted-foreground">{format(selectedDate, 'MMMM d, yyyy')}</p>
            </div>
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
                {showAllPayments ? t('finance.allPayments') : t('finance.paymentsReceivedOn', { date: format(selectedDate, 'MMMM d, yyyy') })}
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
                      {format(new Date(payment.payment_date), 'HH:mm')}
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
                      <span className="font-medium text-green-600">
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
                  : t('finance.noPaymentsOnDate', { date: format(selectedDate, 'MMMM d, yyyy') })
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
            {t('finance.expensesRecordedOn', { date: format(selectedDate, 'MMMM d, yyyy') })}
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
                      {format(new Date(expense.created_at), 'HH:mm')}
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
                {t('finance.noExpensesOnDate', { date: format(selectedDate, 'MMMM d, yyyy') })}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DailyFinanceSection;
