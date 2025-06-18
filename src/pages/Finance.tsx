
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, TrendingUp, Calendar, CreditCard, Clock, Receipt, Download, Plus, Minus, Wallet } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import SearchInput from '@/components/SearchInput';
import ExpenseForm from '@/components/ExpenseForm';
import DateSelector from '@/components/DateSelector';

const Finance = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('current');
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Get current month range
  const currentMonth = new Date();
  const previousMonth = subMonths(currentMonth, 1);
  
  const periodRanges = {
    current: { start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) },
    previous: { start: startOfMonth(previousMonth), end: endOfMonth(previousMonth) },
  };

  const currentRange = periodRanges[selectedPeriod as keyof typeof periodRanges];

  // Define today's date ranges
  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);

  // Selected date range for daily metrics
  const selectedDateStart = startOfDay(selectedDate);
  const selectedDateEnd = endOfDay(selectedDate);

  // Fetch selected date's payments for daily metrics
  const { data: selectedDatePayments, isLoading: selectedDatePaymentsLoading } = useQuery({
    queryKey: ['selected-date-payments', format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .gte('payment_date', selectedDateStart.toISOString())
        .lte('payment_date', selectedDateEnd.toISOString());
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch selected date's expenses
  const { data: selectedDateExpenses, isLoading: selectedDateExpensesLoading } = useQuery({
    queryKey: ['selected-date-expenses', format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('date', format(selectedDate, 'yyyy-MM-dd'));
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch today's payments for daily metrics
  const { data: todaysPayments, isLoading: todaysPaymentsLoading } = useQuery({
    queryKey: ['todays-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .gte('payment_date', todayStart.toISOString())
        .lte('payment_date', todayEnd.toISOString());
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch today's expenses
  const { data: todaysExpenses, isLoading: todaysExpensesLoading } = useQuery({
    queryKey: ['todays-expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('date', format(today, 'yyyy-MM-dd'));
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch financial data
  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['payments', selectedPeriod],
    queryFn: async () => {
      console.log('Fetching payments for period:', selectedPeriod);
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
      return data;
    },
  });

  // Fetch expenses
  const { data: expenses, isLoading: expensesLoading } = useQuery({
    queryKey: ['expenses', selectedPeriod],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .gte('date', format(currentRange.start, 'yyyy-MM-dd'))
        .lte('date', format(currentRange.end, 'yyyy-MM-dd'))
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch daily cash summaries
  const { data: dailyCashSummaries, isLoading: cashSummariesLoading } = useQuery({
    queryKey: ['daily-cash-summaries', selectedPeriod],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_cash_summary')
        .select('*')
        .gte('date', format(currentRange.start, 'yyyy-MM-dd'))
        .lte('date', format(currentRange.end, 'yyyy-MM-dd'))
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: appointmentStats, isLoading: statsLoading } = useQuery({
    queryKey: ['appointment-stats', selectedPeriod],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('payment_amount, payment_status, status')
        .gte('start_time', currentRange.start.toISOString())
        .lte('start_time', currentRange.end.toISOString());
      
      if (error) throw error;
      
      const totalRevenue = data?.reduce((sum, apt) => sum + (Number(apt.payment_amount) || 0), 0) || 0;
      const paidAppointments = data?.filter(apt => apt.payment_status === 'paid').length || 0;
      const pendingPayments = data?.filter(apt => apt.payment_status === 'pending').length || 0;
      const totalAppointments = data?.length || 0;
      
      return {
        totalRevenue,
        paidAppointments,
        pendingPayments,
        totalAppointments,
      };
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

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'cash': return 'bg-green-100 text-green-800';
      case 'card': return 'bg-blue-100 text-blue-800';
      case 'transfer': return 'bg-purple-100 text-purple-800';
      case 'insurance': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Calculate daily totals for selected date
  const selectedDateTotalRevenue = selectedDatePayments?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;
  const selectedDateCashRevenue = selectedDatePayments?.filter(p => p.method === 'cash').reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;
  const selectedDateIntangibleRevenue = selectedDateTotalRevenue - selectedDateCashRevenue;
  const selectedDateTotalExpenses = selectedDateExpenses?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;
  const expectedCashInCashier = selectedDateCashRevenue - selectedDateTotalExpenses;

  // Calculate monthly totals
  const totalPayments = payments?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;
  const totalExpenses = expenses?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;
  const cashPayments = payments?.filter(p => p.method === 'cash').reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;

  if (paymentsLoading || statsLoading || expensesLoading || cashSummariesLoading || selectedDatePaymentsLoading || selectedDateExpensesLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Finance</h1>
          <p className="text-muted-foreground">Track payments, revenue, and financial reports</p>
        </div>
        
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Finance</h1>
          <p className="text-muted-foreground">Track payments, revenue, and financial reports</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowExpenseForm(true)} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Daily Financial Summary with Date Selector */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-foreground flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Daily Financial Summary
            </CardTitle>
            <DateSelector 
              selectedDate={selectedDate} 
              onDateChange={setSelectedDate} 
            />
          </div>
          <CardDescription className="text-muted-foreground">
            Financial overview for {format(selectedDate, 'MMMM d, yyyy')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <p className="text-sm font-medium text-blue-600">Total Revenue</p>
              <p className="text-2xl font-bold text-blue-700">${selectedDateTotalRevenue.toFixed(2)}</p>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <CreditCard className="h-6 w-6 text-purple-600" />
              </div>
              <p className="text-sm font-medium text-purple-600">Total Intangible</p>
              <p className="text-2xl font-bold text-purple-700">${selectedDateIntangibleRevenue.toFixed(2)}</p>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Wallet className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-sm font-medium text-green-600">Total in Cash</p>
              <p className="text-2xl font-bold text-green-700">${selectedDateCashRevenue.toFixed(2)}</p>
            </div>
            
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Minus className="h-6 w-6 text-red-600" />
              </div>
              <p className="text-sm font-medium text-red-600">Expenses</p>
              <p className="text-2xl font-bold text-red-700">${selectedDateTotalExpenses.toFixed(2)}</p>
            </div>
            
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Receipt className="h-6 w-6 text-orange-600" />
              </div>
              <p className="text-sm font-medium text-orange-600">Expected in Cashier</p>
              <p className="text-2xl font-bold text-orange-700">${expectedCashInCashier.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

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

      {/* Daily Cash Summary */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Daily Cash Summary</CardTitle>
          <CardDescription className="text-muted-foreground">
            Daily revenue, expenses, and expected cash totals
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {dailyCashSummaries && dailyCashSummaries.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-foreground">Date</TableHead>
                  <TableHead className="text-foreground">Opening Cash</TableHead>
                  <TableHead className="text-foreground">Revenue</TableHead>
                  <TableHead className="text-foreground">Expenses</TableHead>
                  <TableHead className="text-foreground">Expected Cash</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyCashSummaries.map((summary) => (
                  <TableRow key={summary.id} className="hover:bg-muted/50 border-border">
                    <TableCell className="text-foreground">
                      {format(new Date(summary.date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-foreground">
                      ${Number(summary.opening_cash || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-green-600 font-medium">
                      ${Number(summary.total_revenue || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-red-600 font-medium">
                      ${Number(summary.total_expenses || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      ${(Number(summary.opening_cash || 0) + Number(summary.total_revenue || 0) - Number(summary.total_expenses || 0)).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No daily summaries yet</h3>
              <p className="text-muted-foreground">
                Daily summaries will be automatically generated based on your transactions.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

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

      {/* Expense Form Modal */}
      <ExpenseForm 
        open={showExpenseForm} 
        onClose={() => setShowExpenseForm(false)} 
      />
    </div>
  );
};

export default Finance;
