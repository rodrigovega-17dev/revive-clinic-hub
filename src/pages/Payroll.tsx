import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, DollarSign, TrendingUp, Users, Download } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { formatCurrency } from '@/lib/utils';

const Payroll = () => {
  const { t } = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const defaultPeriod = `first-${currentYear}-${currentMonth + 1}`;
  
  const [selectedPeriod, setSelectedPeriod] = useState(defaultPeriod);

  // Update current date every minute to check for new periods
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const newDefaultPeriod = `first-${currentYear}-${currentMonth + 1}`;
      
      // Update current date and default period if month/year changed
      if (currentMonth !== currentDate.getMonth() || currentYear !== currentDate.getFullYear()) {
        setCurrentDate(now);
        setSelectedPeriod(newDefaultPeriod);
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [currentDate]);

  // Generate 15-day periods starting from the 1st of each month
  const periods = useMemo(() => {
    const periods = [];
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Generate periods for current and previous months (12 months total)
    for (let i = 0; i < 12; i++) {
      let month = currentMonth - i;
      let year = currentYear;
      
      // Handle year rollover
      if (month < 0) {
        month += 12;
        year -= 1;
      }
      
      // First period of the month (1st to 15th)
      const firstPeriodStart = new Date(year, month, 1);
      const firstPeriodEnd = new Date(year, month, 15);
      
      // Second period of the month (16th to end of month)
      const secondPeriodStart = new Date(year, month, 16);
      const secondPeriodEnd = new Date(year, month + 1, 0); // Last day of the month
      
      // Add first period (1st-15th)
      periods.push({
        value: `first-${year}-${month + 1}`,
        label: `${format(firstPeriodStart, 'MMM 1-15, yyyy')}`,
        startDate: firstPeriodStart,
        endDate: firstPeriodEnd,
        isCurrent: i === 0 && new Date().getDate() <= 15,
        isPast: i > 0 || (i === 0 && new Date().getDate() > 15),
      });
      
      // Add second period (16th-end of month)
      periods.push({
        value: `second-${year}-${month + 1}`,
        label: `${format(secondPeriodStart, 'MMM 16-')}${format(secondPeriodEnd, 'd, yyyy')}`,
        startDate: secondPeriodStart,
        endDate: secondPeriodEnd,
        isCurrent: i === 0 && new Date().getDate() > 15,
        isPast: i > 0 || (i === 0 && new Date().getDate() > secondPeriodEnd.getDate()),
      });
    }
    
    // Sort periods by date (newest first)
    return periods.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
  }, [currentDate]);

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
            last_name,
            commission_percentage
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
        const commissionPercentage = appointment.therapists.commission_percentage || 0; // Default to 0% if not set
        
        // Calculate amount before IVA for commission calculations
        const amountBeforeIVA = appointment.facturado && appointment.iva_amount 
          ? Number(appointment.payment_amount || 0) - Number(appointment.iva_amount || 0)
          : Number(appointment.payment_amount || 0);
        
        if (!acc[therapistId]) {
          acc[therapistId] = {
            id: therapistId,
            name: therapistName,
            commissionPercentage,
            totalAppointments: 0,
            totalRevenue: 0,
            totalRevenueBeforeIVA: 0,
            totalIVA: 0,
            therapistEarnings: 0,
            clinicEarnings: 0,
            appointments: []
          };
        }
        
        acc[therapistId].totalAppointments += 1;
        acc[therapistId].totalRevenue += Number(appointment.payment_amount || 0);
        acc[therapistId].totalRevenueBeforeIVA += amountBeforeIVA;
        acc[therapistId].totalIVA += Number(appointment.iva_amount || 0);
        acc[therapistId].appointments.push(appointment);
        
        return acc;
      }, {});

      // Calculate earnings using individual therapist percentages (based on amount before IVA)
      Object.values(therapistStats).forEach((stats: any) => {
        const therapistPercentage = stats.commissionPercentage / 100;
        const clinicPercentage = 1 - therapistPercentage;
        stats.therapistEarnings = stats.totalRevenueBeforeIVA * therapistPercentage;
        stats.clinicEarnings = stats.totalRevenueBeforeIVA * clinicPercentage;
      });

      const totalRevenue = Object.values(therapistStats).reduce((sum, stats: any) => sum + stats.totalRevenue, 0);
      const totalRevenueBeforeIVA = Object.values(therapistStats).reduce((sum, stats: any) => sum + stats.totalRevenueBeforeIVA, 0);
      const totalIVA = Object.values(therapistStats).reduce((sum, stats: any) => sum + stats.totalIVA, 0);
      const totalTherapistEarnings = Object.values(therapistStats).reduce((sum, stats: any) => sum + stats.therapistEarnings, 0);
      const totalClinicEarnings = Object.values(therapistStats).reduce((sum, stats: any) => sum + stats.clinicEarnings, 0);

      return {
        therapistStats: Object.values(therapistStats),
        totals: {
          totalRevenue,
          totalRevenueBeforeIVA,
          totalIVA,
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
            <h1 className="text-3xl font-bold text-foreground">{t('payroll.title')}</h1>
            <p className="text-muted-foreground">{t('payroll.managePayroll')}</p>
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
          <h1 className="text-3xl font-bold text-foreground">{t('payroll.title')}</h1>
          <p className="text-muted-foreground">
            {t('payroll.managePayrollFor', { period: currentPeriod.label })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            {t('payroll.exportReport')}
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">{t('payroll.payPeriod')}</p>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-64 bg-input border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((period) => (
                    <SelectItem 
                      key={period.value} 
                      value={period.value}
                      className={period.isCurrent ? "font-semibold text-blue-600" : ""}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{period.label}</span>
                        {period.isCurrent && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            {t('common.current')}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-green-400" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('payroll.totalRevenue')}</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(Number(payrollData?.totals.totalRevenue || 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-blue-400" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('payroll.revenuePreIVA')}</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(Number(payrollData?.totals.totalRevenueBeforeIVA || 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-purple-400" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('payroll.totalIVA')}</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(Number(payrollData?.totals.totalIVA || 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-yellow-400" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('payroll.therapistEarnings')}</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(Number(payrollData?.totals.totalTherapistEarnings || 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-orange-400" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('payroll.clinicEarnings')}</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(Number(payrollData?.totals.totalClinicEarnings || 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-red-400" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('payroll.totalSessions')}</p>
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
          <CardTitle className="text-foreground">{t('payroll.therapistEarningsBreakdown')}</CardTitle>
          <CardDescription className="text-muted-foreground">
            {t('payroll.individualPerformance', { period: currentPeriod.label })}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {payrollData?.therapistStats && payrollData.therapistStats.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-foreground">{t('payroll.therapist')}</TableHead>
                  <TableHead className="text-foreground">{t('common.sessions')}</TableHead>
                  <TableHead className="text-foreground">{t('payroll.totalRevenue')}</TableHead>
                  <TableHead className="text-foreground">{t('payroll.revenuePreIVA')}</TableHead>
                  <TableHead className="text-foreground">{t('payroll.totalIVA')}</TableHead>
                  <TableHead className="text-foreground">{t('common.commission')} %</TableHead>
                  <TableHead className="text-foreground">{t('payroll.therapistShare')}</TableHead>
                  <TableHead className="text-foreground">{t('payroll.clinicShare')}</TableHead>
                  <TableHead className="text-foreground">{t('common.status')}</TableHead>
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
                      {formatCurrency(Number(therapist.totalRevenue))}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {formatCurrency(Number(therapist.totalRevenueBeforeIVA))} (Pre-IVA)
                    </TableCell>
                    <TableCell className="text-foreground">
                      {formatCurrency(Number(therapist.totalIVA))} (IVA)
                    </TableCell>
                    <TableCell className="text-foreground">
                      {therapist.commissionPercentage}%
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-green-600">
                        {formatCurrency(Number(therapist.therapistEarnings))}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatCurrency(Number(therapist.clinicEarnings))}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {t('common.pending')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">{t('payroll.noPayrollData')}</h3>
              <p className="text-muted-foreground">
                {t('payroll.noCompletedAppointments')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Payroll;
