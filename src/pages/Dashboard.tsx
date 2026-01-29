import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardStats from '@/components/DashboardStats';
import UpcomingAppointments from '@/components/UpcomingAppointments';
import { QuickActions } from '@/components/QuickActions';
import AppointmentDetails from '@/components/AppointmentDetails';

const Dashboard = () => {
  const { t } = useTranslation();
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="fade-in">
        <h1 className="text-3xl font-bold text-foreground mb-2">{t('dashboard.title')}</h1>
        <p className="text-muted-foreground">{t('dashboard.welcome')}</p>
      </div>

      {/* Stats */}
      <DashboardStats />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <UpcomingAppointments onAppointmentClick={setSelectedAppointment} />
        </div>
        <div>
          <QuickActions />
        </div>
      </div>

      {selectedAppointment && (
        <AppointmentDetails
          appointment={selectedAppointment}
          open={!!selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;
