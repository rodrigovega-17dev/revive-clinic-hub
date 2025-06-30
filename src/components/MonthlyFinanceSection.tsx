import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { useClinicSettings } from '@/hooks/useClinic';
import { DollarSign, TrendingUp, Minus, Receipt } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import SearchInput from '@/components/SearchInput';

const MonthlyFinanceSection = () => {
  const { t } = useTranslation();
  const { clinicId } = useAuth();
  const { currency } = useClinicSettings();
  const [selectedPeriod, setSelectedPeriod] = useState<'current' | 'previous'>('current');
  const [searchTerm, setSearchTerm] = useState('');

  // Get current month range
  const currentMonth = new Date();
  const previousMonth = subMonths(currentMonth, 1);
  
  const periodRanges = {
    current: { start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) },
    previous: { start: startOfMonth(previousMonth), end: endOfMonth(previousMonth) },
  };

  const currentRange = periodRanges[selectedPeriod as keyof typeof periodRanges];

  // Fetch financial data
  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['payments', selectedPeriod, clinicId],
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
    queryKey: ['expenses', selectedPeriod, clinicId],
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

  // Calculate monthly totals
  const totalPayments = payments?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;
  const totalExpenses = expenses?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;
  const cashPayments = payments?.filter(p => p.method === 'cash').reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'cash': return 'bg-green-100 text-green-800';
      case 'card': return 'bg-blue-100 text-blue-800';
      case 'transfer': return 'bg-purple-100 text-purple-800';
      case 'insurance': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
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

  // Clinic-aware currency formatting
  const formatCurrencyWithClinic = (value: number) => {
    return formatCurrency(value, 2, currency);
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
      <Tabs value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as 'current' | 'previous')}>
        <TabsList className="bg-muted">
          <TabsTrigger value="current">{t('finance.currentMonth')}</TabsTrigger>
          <TabsTrigger value="previous">{t('finance.previousMonth')}</TabsTrigger>
        </TabsList>
      </Tabs>

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
            {t('finance.allPaymentsFor', { period: format(currentRange.start, 'MMMM yyyy') })}
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => (
                  <TableRow key={payment.id} className="hover:bg-muted/50 border-border">
                    <TableCell className="text-foreground">
                      {format(new Date(payment.payment_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {payment.clients ? 
                        `${payment.clients.first_name} ${payment.clients.last_name}` : 
                        'N/A'
                      }
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
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
                  </TableRow>
                ))}
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
            {t('finance.allExpensesFor', { period: format(currentRange.start, 'MMMM yyyy') })}
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id} className="hover:bg-muted/50 border-border">
                    <TableCell className="text-foreground">
                      {format(new Date(expense.date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {expense.description}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {expense.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-red-600">
                      {formatCurrencyWithClinic(expense.amount)}
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
    </div>
  );
};

export default MonthlyFinanceSection;
