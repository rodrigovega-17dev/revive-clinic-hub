import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/lib/utils';
import { useClinicSettings } from '@/hooks/useClinic';
import { useTodayStats, useUpcomingAppointments } from '@/hooks/useAppointments';
import { DollarSign, Users, Calendar, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const DashboardStats: React.FC = () => {
  const { t } = useTranslation();
  const { currency } = useClinicSettings();
  const { data: todayStats, isLoading: todayLoading } = useTodayStats();
  const { data: upcoming, isLoading: upcomingLoading } = useUpcomingAppointments();

  const formatCurrencyWithClinic = (value: number) => {
    return formatCurrency(value, 2, currency);
  };

  const isLoading = todayLoading;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t('dashboard.todaysRevenue')}
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className="text-2xl font-bold">{formatCurrencyWithClinic(todayStats?.todayRevenue ?? 0)}</div>
          )}
          <p className="text-xs text-muted-foreground">
            {t('dashboard.totalPaymentsReceived')}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t('dashboard.clientsWithAppointmentsToday')}
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-12" />
          ) : (
            <div className="text-2xl font-bold">{todayStats?.clientsWithAppointmentsToday ?? 0}</div>
          )}
          <p className="text-xs text-muted-foreground">
            {t('dashboard.clientsWithAppointmentsTodayDesc')}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t('dashboard.todaysAppointments')}
          </CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-12" />
          ) : (
            <div className="text-2xl font-bold">{todayStats?.totalAppointments ?? 0}</div>
          )}
          <p className="text-xs text-muted-foreground">
            {t('dashboard.scheduledForToday')}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t('dashboard.pendingAppointments')}
          </CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {upcomingLoading ? (
            <Skeleton className="h-8 w-12" />
          ) : (
            <div className="text-2xl font-bold">{upcoming?.length ?? 0}</div>
          )}
          <p className="text-xs text-muted-foreground">
            {t('dashboard.nextScheduledSessions')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardStats;
