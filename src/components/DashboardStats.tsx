import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from "@/lib/utils";
import { useClinicSettings } from '@/hooks/useClinic';
import { TrendingUp, TrendingDown, DollarSign, Users, Calendar, Clock } from 'lucide-react';

interface DashboardStatsProps {
  stats: {
    todayRevenue: number;
    totalClients: number;
    todayAppointments: number;
    pendingAppointments: number;
  } | null;
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ stats }) => {
  const { t } = useTranslation();
  const { currency } = useClinicSettings();

  const formatCurrencyWithClinic = (value: number) => {
    return formatCurrency(value, 2, currency);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t('dashboard.todayRevenue')}
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrencyWithClinic(stats?.todayRevenue)}</div>
          <p className="text-xs text-muted-foreground">
            {t('dashboard.todayRevenueDesc')}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t('dashboard.totalClients')}
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.totalClients || 0}</div>
          <p className="text-xs text-muted-foreground">
            {t('dashboard.totalClientsDesc')}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t('dashboard.todayAppointments')}
          </CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.todayAppointments || 0}</div>
          <p className="text-xs text-muted-foreground">
            {t('dashboard.todayAppointmentsDesc')}
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
            {t('dashboard.pendingAppointmentsDesc')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardStats;
