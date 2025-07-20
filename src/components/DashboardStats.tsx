import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from "@/lib/utils";
import { useClinicSettings } from '@/hooks/useClinic';
import { TrendingUp, TrendingDown, DollarSign, Users, Calendar, Clock } from 'lucide-react';

const DashboardStats: React.FC = () => {
  const { t } = useTranslation();
  const { currency } = useClinicSettings();

  // Mock data for now - in a real app this would come from hooks
  const stats = {
    todayRevenue: 0,
    totalClients: 0,
    todayAppointments: 0,
    pendingAppointments: 0,
  };

  const formatCurrencyWithClinic = (value: number) => {
    return formatCurrency(value, 2, currency);
  };

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
          <div className="text-2xl font-bold">{formatCurrencyWithClinic(stats?.todayRevenue)}</div>
          <p className="text-xs text-muted-foreground">
            {t('dashboard.totalPaymentsReceived')}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t('dashboard.totalClientsTitle')}
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.totalClients || 0}</div>
          <p className="text-xs text-muted-foreground">
            {t('dashboard.activeClientRecords')}
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
          <div className="text-2xl font-bold">{stats?.todayAppointments || 0}</div>
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
          <div className="text-2xl font-bold">{stats?.pendingAppointments || 0}</div>
          <p className="text-xs text-muted-foreground">
            {t('dashboard.nextScheduledSessions')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardStats;
