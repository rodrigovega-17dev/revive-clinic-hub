
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, TrendingUp, Calendar, CreditCard, Clock, Receipt, Download } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import SearchInput from '@/components/SearchInput';

const Finance = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('current');

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
    queryKey: ['payments', selectedPeriod],
    queryFn: async () => {
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
      case 'bank_transfer': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (paymentsLoading || statsLoading) {
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
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <Tabs value={selectedPeriod} onValueChange={setSelectedPeriod}>
        <TabsList className="bg-muted">
          <TabsTrigger value="current">Current Month</TabsTrigger>
          <TabsTrigger value="previous">Previous Month</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Financial Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-green-400" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-foreground">
                  ${appointmentStats?.totalRevenue.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Receipt className="h-4 w-4 text-blue-400" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Paid Appointments</p>
                <p className="text-2xl font-bold text-foreground">
                  {appointmentStats?.paidAppointments || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-orange-400" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Payments</p>
                <p className="text-2xl font-bold text-foreground">
                  {appointmentStats?.pendingPayments || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-purple-400" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Appointments</p>
                <p className="text-2xl font-bold text-foreground">
                  {appointmentStats?.totalAppointments || 0}
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
                  <TableHead className="text-foreground">Therapist</TableHead>
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
                    <TableCell className="text-foreground">
                      {payment.appointments?.therapists ? 
                        `${payment.appointments.therapists.first_name} ${payment.appointments.therapists.last_name}` : 
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
    </div>
  );
};

export default Finance;
