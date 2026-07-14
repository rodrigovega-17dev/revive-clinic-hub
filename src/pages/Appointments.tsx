import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, User, Phone, Plus } from 'lucide-react';
import { useAppointmentsByDate, useAppointmentsByWeek, useAppointmentsByMonth } from '@/hooks/useAppointments';
import { useClients } from '@/hooks/useClients';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import AppointmentForm from '@/components/AppointmentForm';
import AppointmentDetails from '@/components/AppointmentDetails';
import DateFilter from '@/components/DateFilter';
import AppointmentTable from '@/components/AppointmentTable';
import MonthlyAppointmentsView from '@/components/MonthlyAppointmentsView';
import WeeklyAppointmentsView from '@/components/WeeklyAppointmentsView';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import ClientSearchSelect from '@/components/ClientSearchSelect';
import { formatPersonName } from '@/lib/names';

const Appointments = () => {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedView, setSelectedView] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [searchTerm, setSearchTerm] = useState('');
  const [clientSearchValue, setClientSearchValue] = useState('all');
  const [searchParams] = useSearchParams();
  
  const locale = currentLanguage === 'es' ? es : enUS;
  
  const useDaily = selectedView === 'daily';
  const useWeekly = selectedView === 'weekly';
  const useMonthly = selectedView === 'monthly';

  const { data: groupedAppointments, isLoading: dailyLoading } = useAppointmentsByDate(
    format(selectedDate, 'yyyy-MM-dd'),
    useDaily
  );
  const { data: weekAppointments, isLoading: weeklyLoading } = useAppointmentsByWeek(selectedDate, useWeekly);
  const { data: monthGrouped, isLoading: monthlyLoading } = useAppointmentsByMonth(
    selectedDate.getFullYear(),
    selectedDate.getMonth() + 1,
    useMonthly
  );

  const appointmentsLoading = (useDaily && dailyLoading) || (useWeekly && weeklyLoading) || (useMonthly && monthlyLoading);
  const { data: clients } = useClients();

  // Stats for current view (day / week / month)
  const statsSource = useDaily
    ? Object.values(groupedAppointments || {}).flatMap((g) => g.appointments)
    : useWeekly
      ? weekAppointments || []
      : Object.values(monthGrouped || {}).flat();
  const totalAppointments = statsSource.length;
  const completedToday = statsSource.filter((a) => a.status === 'completed').length;
  const pendingToday = statsSource.filter((a) => a.status === 'scheduled').length;
  const cancelledToday = statsSource.filter((a) => a.status === 'cancelled' || a.status === 'no_show').length;

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

  const handleDateChange = (dateStr: string) => {
    // Create date with time set to midnight to avoid timezone issues
    const date = new Date(dateStr + 'T00:00:00');
    setSelectedDate(date);
  };

  const handleMonthlyDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleClientSearchSelect = (value: string) => {
    setClientSearchValue(value);
    if (value === 'all') {
      setSearchTerm('');
      return;
    }

    const selectedClient = clients?.find((client) => client.id === value);
    setSearchTerm(formatPersonName(selectedClient?.first_name, selectedClient?.last_name));
  };

  const filteredGroupedAppointments = useMemo(() => {
    if (!groupedAppointments || !searchTerm.trim()) {
      return groupedAppointments || {};
    }

    const normalized = searchTerm.trim().toLowerCase();
    return Object.entries(groupedAppointments).reduce((acc, [therapistId, group]) => {
      const filtered = group.appointments.filter((appointment: any) => {
        const clientName = `${appointment.clients?.first_name || ''} ${appointment.clients?.last_name || ''}`.toLowerCase();
        return clientName.includes(normalized);
      });

      if (filtered.length > 0) {
        acc[therapistId] = {
          therapist: group.therapist,
          appointments: filtered,
        };
      }
      return acc;
    }, {} as Record<string, { therapist: any; appointments: any[] }>);
  }, [groupedAppointments, searchTerm]);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{t('appointments.title')}</h1>
          <p className="text-muted-foreground">{t('common.manageAppointments')}</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('appointments.newAppointment')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
          {useDaily && (
            <DateFilter
              selectedDate={format(selectedDate, 'yyyy-MM-dd')}
              onDateChange={handleDateChange}
            />
          )}
          <div className="space-y-2 w-full sm:w-[240px]">
            <Label className="text-sm text-foreground">{t('appointments.searchByClient')}</Label>
            <ClientSearchSelect
              value={clientSearchValue}
              onValueChange={handleClientSearchSelect}
              clients={clients || []}
              allowNone
              noneValue="all"
              noneLabel={t('common.all')}
              placeholder={t('appointments.searchByClient')}
            />
          </div>
        </div>

        {/* Quick Stats for selected period */}
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
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{cancelledToday}</div>
                <div className="text-sm text-muted-foreground">{t('appointments.cancelledOrNoShow')}</div>
          </div>
        </div>
      </div>

      {/* View Selector */}
      <Tabs value={selectedView} onValueChange={(value) => setSelectedView(value as 'daily' | 'weekly' | 'monthly')}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="daily">{t('appointments.dailyView')}</TabsTrigger>
          <TabsTrigger value="weekly">{t('appointments.weeklyView')}</TabsTrigger>
          <TabsTrigger value="monthly">{t('appointments.monthlyView')}</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-6">

      {/* Appointments by Therapist */}
      {Object.keys(filteredGroupedAppointments || {}).length > 0 ? (
        <AppointmentTable 
          groupedAppointments={filteredGroupedAppointments || {}}
          onAppointmentClick={handleAppointmentClick}
        />
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
                  {t('appointments.noAppointmentsForDate', { 
                    date: format(selectedDate, 'MMMM d, yyyy', { locale })
                  })}
            </h3>
            <p className="text-muted-foreground mb-4">
                  {t('appointments.selectDifferentDate')}
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
                  {t('appointments.scheduleNewAppointment')}
            </Button>
          </CardContent>
        </Card>
      )}
        </TabsContent>

        <TabsContent value="weekly" className="space-y-6">
          <WeeklyAppointmentsView
            currentDate={selectedDate}
            onDateSelect={handleMonthlyDateSelect}
            searchTerm={searchTerm}
          />
        </TabsContent>

        <TabsContent value="monthly" className="space-y-6">
          <MonthlyAppointmentsView
            currentDate={selectedDate}
            onDateSelect={handleMonthlyDateSelect}
            searchTerm={searchTerm}
          />
        </TabsContent>
      </Tabs>

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
