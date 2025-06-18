
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Calendar, CreditCard, Minus, Wallet, Receipt } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import DateSelector from '@/components/DateSelector';
import { Skeleton } from '@/components/ui/skeleton';

interface DailyFinanceSectionProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

const DailyFinanceSection = ({ selectedDate, onDateChange }: DailyFinanceSectionProps) => {
  const selectedDateStart = startOfDay(selectedDate);
  const selectedDateEnd = endOfDay(selectedDate);

  // Fetch selected date's payments
  const { data: selectedDatePayments, isLoading: selectedDatePaymentsLoading } = useQuery({
    queryKey: ['selected-date-payments', format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          clients (first_name, last_name),
          appointments (start_time, therapists (first_name, last_name))
        `)
        .gte('payment_date', selectedDateStart.toISOString())
        .lte('payment_date', selectedDateEnd.toISOString())
        .order('payment_date', { ascending: false });
      
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
        .eq('date', format(selectedDate, 'yyyy-MM-dd'))
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Calculate daily totals
  const selectedDateTotalRevenue = selectedDatePayments?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;
  const selectedDateCashRevenue = selectedDatePayments?.filter(p => p.method === 'cash').reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;
  const selectedDateIntangibleRevenue = selectedDateTotalRevenue - selectedDateCashRevenue;
  const selectedDateTotalExpenses = selectedDateExpenses?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;
  const expectedCashInCashier = selectedDateCashRevenue - selectedDateTotalExpenses;

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'cash': return 'bg-green-100 text-green-800';
      case 'card': return 'bg-blue-100 text-blue-800';
      case 'transfer': return 'bg-purple-100 text-purple-800';
      case 'insurance': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (selectedDatePaymentsLoading || selectedDateExpensesLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Daily Summary */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-foreground flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Daily Financial Summary
            </CardTitle>
            <DateSelector 
              selectedDate={selectedDate} 
              onDateChange={onDateChange} 
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

      {/* Daily Transactions */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Daily Transactions</CardTitle>
          <CardDescription className="text-muted-foreground">
            All payments and expenses for {format(selectedDate, 'MMMM d, yyyy')}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {(selectedDatePayments && selectedDatePayments.length > 0) || (selectedDateExpenses && selectedDateExpenses.length > 0) ? (
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-foreground">Time</TableHead>
                  <TableHead className="text-foreground">Type</TableHead>
                  <TableHead className="text-foreground">Client/Description</TableHead>
                  <TableHead className="text-foreground">Amount</TableHead>
                  <TableHead className="text-foreground">Method/Category</TableHead>
                  <TableHead className="text-foreground">Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Payments */}
                {selectedDatePayments?.map((payment) => (
                  <TableRow key={`payment-${payment.id}`} className="hover:bg-muted/50 border-border">
                    <TableCell className="text-foreground">
                      {format(new Date(payment.payment_date), 'HH:mm')}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-800">Payment</Badge>
                    </TableCell>
                    <TableCell className="text-foreground">
                      {payment.clients ? 
                        `${payment.clients.first_name} ${payment.clients.last_name}` : 
                        'N/A'
                      }
                    </TableCell>
                    <TableCell className="font-medium text-green-600">
                      +${Number(payment.amount).toFixed(2)}
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
                
                {/* Expenses */}
                {selectedDateExpenses?.map((expense) => (
                  <TableRow key={`expense-${expense.id}`} className="hover:bg-muted/50 border-border">
                    <TableCell className="text-foreground">
                      {format(new Date(expense.created_at), 'HH:mm')}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-red-100 text-red-800">Expense</Badge>
                    </TableCell>
                    <TableCell className="text-foreground">
                      {expense.description}
                    </TableCell>
                    <TableCell className="font-medium text-red-600">
                      -${Number(expense.amount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {expense.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      Business expense
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No transactions for this date</h3>
              <p className="text-muted-foreground">
                No payments or expenses recorded for {format(selectedDate, 'MMMM d, yyyy')}.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DailyFinanceSection;
