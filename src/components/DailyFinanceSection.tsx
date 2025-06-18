
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar, DollarSign, TrendingUp, TrendingDown, Receipt, CreditCard } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { format, startOfDay, endOfDay } from 'date-fns';
import DateSelector from '@/components/DateSelector';

interface DailyFinanceSectionProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

const DailyFinanceSection = ({ selectedDate, onDateChange }: DailyFinanceSectionProps) => {
  // Fetch daily payments
  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['daily-payments', selectedDate],
    queryFn: async () => {
      console.log('Fetching payments for date:', selectedDate);
      const startDate = startOfDay(selectedDate);
      const endDate = endOfDay(selectedDate);
      
      const { data, error } = await supabase
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
              last_name
            )
          )
        `)
        .gte('payment_date', startDate.toISOString())
        .lte('payment_date', endDate.toISOString())
        .order('payment_date', { ascending: false });

      if (error) {
        console.error('Error fetching payments:', error);
        throw error;
      }

      console.log('Fetched payments:', data);
      return data || [];
    },
  });

  // Fetch daily expenses
  const { data: expenses, isLoading: expensesLoading } = useQuery({
    queryKey: ['daily-expenses', selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('date', format(selectedDate, 'yyyy-MM-dd'))
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const totalRevenue = payments?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;
  const totalExpenses = expenses?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;
  const netProfit = totalRevenue - totalExpenses;

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return <DollarSign className="h-4 w-4" />;
      case 'card':
        return <CreditCard className="h-4 w-4" />;
      default:
        return <Receipt className="h-4 w-4" />;
    }
  };

  if (paymentsLoading || expensesLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
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
              <p className="text-sm font-medium text-foreground">Selected Date</p>
              <DateSelector selectedDate={selectedDate} onDateChange={onDateChange} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Revenue</p>
                <p className="text-2xl font-bold text-foreground">${totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <TrendingDown className="h-4 w-4 text-red-400" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Expenses</p>
                <p className="text-2xl font-bold text-foreground">${totalExpenses.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <DollarSign className={`h-4 w-4 ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`} />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Net Profit</p>
                <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${netProfit.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Daily Payments</CardTitle>
          <CardDescription className="text-muted-foreground">
            All payments received on {format(selectedDate, 'MMMM d, yyyy')}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {payments && payments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-foreground">Time</TableHead>
                  <TableHead className="text-foreground">Client</TableHead>
                  <TableHead className="text-foreground">Therapist</TableHead>
                  <TableHead className="text-foreground">Amount</TableHead>
                  <TableHead className="text-foreground">Method</TableHead>
                  <TableHead className="text-foreground">Description</TableHead>
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
                        ${Number(payment.amount).toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getPaymentMethodIcon(payment.method)}
                        <Badge variant="outline" className="capitalize">
                          {payment.method}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {payment.description || 'Payment received'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No payments today</h3>
              <p className="text-muted-foreground">
                No payments were received on {format(selectedDate, 'MMMM d, yyyy')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Daily Expenses</CardTitle>
          <CardDescription className="text-muted-foreground">
            All expenses recorded on {format(selectedDate, 'MMMM d, yyyy')}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {expenses && expenses.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-foreground">Description</TableHead>
                  <TableHead className="text-foreground">Category</TableHead>
                  <TableHead className="text-foreground">Amount</TableHead>
                  <TableHead className="text-foreground">Time</TableHead>
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
                        -${Number(expense.amount).toFixed(2)}
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
              <h3 className="text-lg font-medium text-foreground mb-2">No expenses today</h3>
              <p className="text-muted-foreground">
                No expenses were recorded on {format(selectedDate, 'MMMM d, yyyy')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DailyFinanceSection;
