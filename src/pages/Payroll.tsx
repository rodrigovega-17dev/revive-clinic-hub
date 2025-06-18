
import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, DollarSign, TrendingUp, Users, Download } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { format, startOfMonth, endOfMonth, addDays, startOfDay, endOfDay } from 'date-fns';

const Payroll = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('current');

  // Generate 15-day periods starting from 1st and 16th of each month
  const periods = useMemo(() => {
    const periods = [];
    const today = new Date();
    
    // Generate periods for the last 6 months
    for (let monthOffset = 0; monthOffset < 6; monthOffset++) {
      const baseDate = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1);
      
      // First half of month (1st to 15th)
      const firstHalfStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
      const firstHalfEnd = new Date(baseDate.getFullYear(), baseDate.getMonth(), 15);
      
      // Second half of month (16th to end of month)
      const secondHalfStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), 16);
      const secondHalfEnd = endOfMonth(baseDate);
      
      // Add second half first (more recent)
      if (secondHalfStart <= today) {
        periods.push({
          value: `${baseDate.getFullYear()}-${baseDate.getMonth()}-2`,
          label: `${format(secondHalfStart, 'MMM d')} - ${format(secondHalfEnd, 'MMM d, yyyy')}`,
          startDate: secondHalfStart,
          endDate: secondHalfEnd,
        });
      }
      
      // Add first half
      periods.push({
        value: `${baseDate.getFullYear()}-${baseDate.getMonth()}-1`,
        label: `${format(firstHalfStart, 'MMM d')} - ${format(firstHalfEnd, 'MMM d, yyyy')}`,
        startDate: firstHalfStart,
        endDate: firstHalfEnd,
      });
    }
    
    return periods;
  }, []);

  const currentPeriod = periods.find(p => p.value === selectedPeriod) || periods[0];

  // Fetch payroll data
  const { data: payrollData, isLoading } = useQuery({
    queryKey: ['payroll', currentPeriod.startDate, currentPeriod.endDate],
    queryFn: async () => {
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          *,
          therapists (
            id,
            first_name,
            last_name
          ),
          clients (
            first_name,
            last_name
          )
        `)
        .eq('status', 'completed')
        .eq('payment_status', 'paid')
        .gte('start_time', startOfDay(currentPeriod.startDate).toISOString())
        .lte('start_time', endOfDay(currentPeriod.endDate).toISOString());

      if (error) throw error;

      // Calculate payroll data by therapist
      const therapistStats = appointments.reduce((acc, appointment) => {
        const therapistId = appointment.therapist_id;
        const therapistName = `${appointment.therapists.first_name} ${appointment.therapists.last_name}`;
        
        if (!acc[therapistId]) {
          acc[therapistId] = {
            id: therapistId,
            name: therapistName,
            totalAppointments: 0,
            totalRevenue: 0,
            therapistEarnings: 0,
            clinicEarnings: 0,
            appointments: []
          };
        }
        
        acc[therapistId].totalAppointments += 1;
        acc[therapistId].totalRevenue += Number(appointment.payment_amount || 0);
        acc[therapistId].appointments.push(appointment);
        
        return acc;
      }, {});

      // Calculate earnings (therapist gets 30%, clinic keeps 70%)
      Object.values(therapistStats).forEach((stats: any) => {
        stats.therapistEarnings = stats.totalRevenue * 0.3;
        stats.clinicEarnings = stats.totalRevenue * 0.7;
      });

      const totalRevenue = Object.values(therapistStats).reduce((sum, stats: any) => sum + stats.totalRevenue, 0);
      const totalTherapistEarnings = Object.values(therapistStats).reduce((sum, stats: any) => sum + stats.therapistEarnings, 0);
      const totalClinicEarnings = Object.values(therapistStats).reduce((sum, stats: any) => sum + stats.clinicEarnings, 0);

      return {
        therapistStats: Object.values(therapistStats),
        totals: {
          totalRevenue,
          totalTherapistEarnings,
          totalClinicEarnings,
          totalAppointments: appointments.length
        }
      };
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Payroll</h1>
            <p className="text-muted-foreground">Manage therapist payments and earnings</p>
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
          <h1 className="text-3xl font-bold text-foreground">Payroll</h1>
          <p className="text-muted-foreground">Manage therapist payments and earnings</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Pay Period</p>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((period) => (
                    <SelectItem key={period.value} value={period.value}>
                      {period.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-green-400" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-foreground">
                  ${Number(payrollData?.totals.totalRevenue || 0).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-400" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Therapist Earnings</p>
                <p className="text-2xl font-bold text-foreground">
                  ${Number(payrollData?.totals.totalTherapistEarnings || 0).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-purple-400" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Clinic Earnings</p>
                <p className="text-2xl font-bold text-foreground">
                  ${Number(payrollData?.totals.totalClinicEarnings || 0).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-orange-400" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Sessions</p>
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
          <CardTitle className="text-foreground">Therapist Earnings Breakdown</CardTitle>
          <CardDescription className="text-muted-foreground">
            Individual therapist performance for {currentPeriod.label}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {payrollData?.therapistStats && payrollData.therapistStats.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-foreground">Therapist</TableHead>
                  <TableHead className="text-foreground">Sessions</TableHead>
                  <TableHead className="text-foreground">Total Revenue</TableHead>
                  <TableHead className="text-foreground">Therapist Share (30%)</TableHead>
                  <TableHead className="text-foreground">Clinic Share (70%)</TableHead>
                  <TableHead className="text-foreground">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollData.therapistStats.map((therapist: any) => (
                  <TableRow key={therapist.id} className="hover:bg-muted/50 border-border">
                    <TableCell>
                      <div className="font-medium text-foreground">
                        {therapist.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground">
                      {therapist.totalAppointments}
                    </TableCell>
                    <TableCell className="text-foreground">
                      ${Number(therapist.totalRevenue).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-green-600">
                        ${Number(therapist.therapistEarnings).toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      ${Number(therapist.clinicEarnings).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        Pending
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No payroll data</h3>
              <p className="text-muted-foreground">
                No completed appointments found for the selected period.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Payroll;
