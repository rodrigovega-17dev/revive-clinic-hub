import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, User, Phone, Plus } from 'lucide-react';
import { useAppointmentsByDate } from '@/hooks/useAppointments';
import { useClients } from '@/hooks/useClients';
import { format } from 'date-fns';
import AppointmentForm from '@/components/AppointmentForm';
import AppointmentDetails from '@/components/AppointmentDetails';
import DateFilter from '@/components/DateFilter';
import AppointmentTable from '@/components/AppointmentTable';
import { Skeleton } from '@/components/ui/skeleton';
import { useSearchParams } from 'react-router-dom';

const Appointments = () => {
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [searchParams] = useSearchParams();
  
  const { data: groupedAppointments, isLoading: appointmentsLoading } = useAppointmentsByDate(selectedDate);
  const { data: clients } = useClients();

  // Check URL parameters to auto-open form
  useEffect(() => {
    if (searchParams.get('showForm') === 'true') {
      setShowForm(true);
      // Clean up the URL parameter
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('showForm');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [searchParams]);

  const handleAppointmentClick = (appointment: any) => {
    setSelectedAppointment(appointment);
  };

  if (appointmentsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('appointments.title')}</h1>
            <p className="text-muted-foreground">{t('common.manageAppointments')}</p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t('appointments.newAppointment')}
          </Button>
        </div>
        
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
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

  const totalAppointments = Object.values(groupedAppointments || {}).reduce(
    (total, group) => total + group.appointments.length, 0
  );

  const completedToday = Object.values(groupedAppointments || {}).reduce(
    (total, group) => total + group.appointments.filter(apt => apt.status === 'completed').length, 0
  );

  const pendingToday = Object.values(groupedAppointments || {}).reduce(
    (total, group) => total + group.appointments.filter(apt => apt.status === 'scheduled').length, 0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('appointments.title')}</h1>
          <p className="text-muted-foreground">{t('common.manageAppointments')}</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('appointments.newAppointment')}
        </Button>
      </div>

      {/* Date Filter */}
      <div className="flex items-center justify-between">
        <DateFilter 
          selectedDate={selectedDate} 
          onDateChange={setSelectedDate} 
        />
        
        {/* Quick Stats for selected date */}
        <div className="flex gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{totalAppointments}</div>
            <div className="text-sm text-muted-foreground">{t('common.total')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{completedToday}</div>
            <div className="text-sm text-muted-foreground">{t('appointments.completed')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{pendingToday}</div>
            <div className="text-sm text-muted-foreground">{t('appointments.scheduled')}</div>
          </div>
        </div>
      </div>

      {/* Appointments by Therapist */}
      {Object.keys(groupedAppointments || {}).length > 0 ? (
        <AppointmentTable 
          groupedAppointments={groupedAppointments || {}}
          onAppointmentClick={handleAppointmentClick}
        />
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {t('common.noAppointmentsForDate', { 
                date: (() => {
                  const [year, month, day] = selectedDate.split('-').map(Number);
                  const date = new Date(year, month - 1, day);
                  return format(date, 'MMMM d, yyyy');
                })()
              })}
            </h3>
            <p className="text-muted-foreground mb-4">
              {t('common.selectDifferentDate')}
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('common.scheduleNewAppointment')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Appointment Form Modal */}
      {showForm && (
        <AppointmentForm 
          open={showForm} 
          onClose={() => setShowForm(false)} 
        />
      )}

      {/* Appointment Details Modal */}
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

export default Appointments;
