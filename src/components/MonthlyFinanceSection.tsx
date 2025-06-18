
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, TrendingUp, CreditCard, Minus, Receipt } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import SearchInput from '@/components/SearchInput';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';

const MonthlyFinanceSection = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('current');
  const [searchTerm, setSearchTerm] = useState('');

  // Get current month range
  const currentMonth = new Date();
  const previousMonth = subMonths(currentMonth, 1);
  
  const periodRanges = {
    current: { start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) },
    previous: { start: startOfMonth(previousMonth), end: endOfMonth(previousMonth) },
  };

  const currentRange = periodRanges[selectedPeriod as keyof typeof periodRanges];

  console.log('MonthlyFinanceSection - Date range:', {
    selectedPeriod,
    start: currentRange.start.toISOString(),
    end: currentRange.end.toISOString()
  });

  // Fetch financial data
  const { data: payments, isLoading: paymentsLoading, error: paymentsError } = useQuery({
    queryKey: ['payments', selectedPeriod, currentRange.start.toISOString(), currentRange.end.toISOString()],
    queryFn: async () => {
      console.log('Fetching payments for range:', {
        start: currentRange.start.toISOString(),
        end: currentRange.end.toISOString()
      });

      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          clients (first_name, last_name),
          appointments (start_time, therapists (first_name, last_name))
        `)
        .gte('payment_date', currentRange.start.toISOString())
        .lte('payment_date', currentRange.end.toISOString())
        .order('payment_date', { ascending: false });
      
      if (error) {
        console.error('Error fetching payments:', error);
        throw error;
      }
      
      console.log('Fetched payments:', data);
      return data || [];
    },
  });

  // Fetch expenses
  const { data: expenses, isLoading: expensesLoading } = useQuery({
    queryKey: ['expenses', selectedPeriod, currentRange.start.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .gte('date', format(currentRange.start, 'yyyy-MM-dd'))
        .lte('date', format(currentRange.end, 'yyyy-MM-dd'))
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Also fetch all payments to debug
  const { data: allPayments } = useQuery({
    queryKey: ['all-payments-debug'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('payment_date', { ascending: false });
      
      if (error) throw error;
      console.log('All payments in database:', data);
      return data || [];
    },
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
  const totalPayments = payments?.reduce((sum, payment) => sum + Number(payment.amount || 0), 0) || 0;
  const totalExpenses = expenses?.reduce((sum, expense) => sum + Number(expense.amount || 0), 0) || 0;
  const cashPayments = payments?.filter(p => p.method === 'cash').reduce((sum, payment) => sum + Number(payment.amount || 0), 0) || 0;

  console.log('Monthly totals:', {
    totalPayments,
    totalExpenses,
    cashPayments,
    paymentsCount: payments?.length || 0,
    expensesCount: expenses?.length || 0
  });

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'cash': return 'bg-green-100 text-green-800';
      case 'card': return 'bg-blue-100 text-blue-800';
      case 'transfer': return 'bg-purple-100 text-purple-800';
      case 'insurance': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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

  if (paymentsError) {
    console.error('Payments error:', paymentsError);
  }

  return (
    <div className="space-y-6">
      {/* Debug Info */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
        <p><strong>Debug Info:</strong></p>
        <p>Selected Period: {selectedPeriod}</p>
        <p>Date Range: {format(currentRange.start, 'yyyy-MM-dd')} to {format(currentRange.end, 'yyyy-MM-dd')}</p>
        <p>Payments Found: {payments?.length || 0}</p>
        <p>Total Payments in DB: {allPayments?.length || 0}</p>
        {paymentsError && <p className="text-red-600">Error: {paymentsError.message}</p>}
      </div>

      {/* Period Selector */}
      <Tabs value={selectedPeriod} onValueChange={setSelectedPeriod}>
        <TabsList className="bg-muted">
          <TabsTrigger value="current">Current Month</TabsTrigger>
          <TabsTrigger value="previous">Previous Month</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Monthly Financial Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-green-400" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-foreground">
                  ${totalPayments.toFixed(2)}
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
                <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold text-foreground">
                  ${totalExpenses.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-4 w-4 text-green-400" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cash Revenue</p>
                <p className="text-2xl font-bold text-foreground">
                  ${cashPayments.toFixed(2)}
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
                <p className="text-sm font-medium text-muted-foreground">Net Total</p>
                <p className="text-2xl font-bold text-foreground">
                  ${(totalPayments - totalExpenses).toFixed(2)}
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
          placeholder="Search payments by client, therapist, or method..."
          className="max-w-md"
        />
        <div className="text-sm text-muted-foreground">
          {filteredPayments.length} of {payments?.length || 0} payments
        </div>
      </div>

      {/* Payments Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Payment History</CardTitle>
          <CardDescription className="text-muted-foreground">
            All payments for {format(currentRange.start, 'MMMM yyyy')}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {filteredPayments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-foreground">Date</TableHead>
                  <TableHead className="text-foreground">Client</TableHead>
                  <TableHead className="text-foreground">Amount</TableHead>
                  <TableHead className="text-foreground">Method</TableHead>
                  <TableHead className="text-foreground">Description</TableHead>
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
                      ${Number(payment.amount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge className={getPaymentMethodColor(payment.method)}>
                        {payment.method.replace('_', ' ')}
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
                {searchTerm ? 'No payments found' : 'No payments yet'}
              </h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? 'Try adjusting your search terms.'
                  : 'Payments will appear here once appointments are completed.'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Expenses</CardTitle>
          <CardDescription className="text-muted-foreground">
            All expenses for {format(currentRange.start, 'MMMM yyyy')}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {expenses && expenses.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-foreground">Date</TableHead>
                  <TableHead className="text-foreground">Description</TableHead>
                  <TableHead className="text-foreground">Category</TableHead>
                  <TableHead className="text-foreground">Amount</TableHead>
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
                      ${Number(expense.amount).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Minus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No expenses yet</h3>
              <p className="text-muted-foreground">
                Expenses will appear here once they are recorded.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MonthlyFinanceSection;
