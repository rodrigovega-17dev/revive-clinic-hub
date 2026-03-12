import React, { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isToday, parseISO } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar, Clock, User, MoreHorizontal, DollarSign, TrendingUp, TrendingDown, Download, Filter, Plus, Minus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppointmentsByMonth } from '@/hooks/useAppointments';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/hooks/useLanguage';
import { formatCurrency } from '@/lib/utils';
import AppointmentDetails from './AppointmentDetails';
import { useClinicSettings } from '@/hooks/useClinic';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';

interface MonthlyAppointmentsViewProps {
  currentDate: Date;
  onDateSelect?: (date: Date) => void;
  searchTerm?: string;
}

// Google Calendar default colors
const GOOGLE_CALENDAR_COLORS = [
  { id: '1', name: 'Lavender', background: '#7986cb', foreground: '#ffffff' },
  { id: '2', name: 'Sage', background: '#33b679', foreground: '#ffffff' },
  { id: '3', name: 'Grape', background: '#8e63ce', foreground: '#ffffff' },
  { id: '4', name: 'Flamingo', background: '#e67c73', foreground: '#ffffff' },
  { id: '5', name: 'Banana', background: '#f6c026', foreground: '#000000' },
  { id: '6', name: 'Tangerine', background: '#f4791f', foreground: '#ffffff' },
  { id: '7', name: 'Peacock', background: '#039be5', foreground: '#ffffff' },
  { id: '8', name: 'Graphite', background: '#616161', foreground: '#ffffff' },
  { id: '9', name: 'Blueberry', background: '#3f51b5', foreground: '#ffffff' },
  { id: '10', name: 'Basil', background: '#0b8043', foreground: '#ffffff' },
  { id: '11', name: 'Tomato', background: '#d60000', foreground: '#ffffff' },
];

// Utility function to get therapist color
const getTherapistColor = (colorId?: string) => {
  return GOOGLE_CALENDAR_COLORS.find(color => color.id === colorId) || GOOGLE_CALENDAR_COLORS[0];
};

const MonthlyAppointmentsView: React.FC<MonthlyAppointmentsViewProps> = ({
  currentDate,
  onDateSelect,
  searchTerm
}) => {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const { currency, timezone } = useClinicSettings();
  const [selectedMonth, setSelectedMonth] = useState(currentDate);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDayPopup, setShowDayPopup] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);

  const year = selectedMonth.getFullYear();
  const month = selectedMonth.getMonth() + 1;
  const { data: appointmentsByDate, isLoading } = useAppointmentsByMonth(year, month);
  const normalizedSearch = searchTerm?.trim().toLowerCase() || '';

  const filteredAppointmentsByDate = useMemo(() => {
    if (!appointmentsByDate || !normalizedSearch) return appointmentsByDate || {};
    return Object.entries(appointmentsByDate).reduce((acc, [dateKey, appointments]) => {
      const filtered = (appointments as any[]).filter((appointment) => {
        const clientName = `${appointment.clients?.first_name || ''} ${appointment.clients?.last_name || ''}`.toLowerCase();
        return clientName.includes(normalizedSearch);
      });
      if (filtered.length > 0) {
        acc[dateKey] = filtered;
      }
      return acc;
    }, {} as Record<string, any[]>);
  }, [appointmentsByDate, normalizedSearch]);

  const locale = currentLanguage === 'es' ? es : enUS;

  // Get the start and end of the month
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);

  // Get the start and end of the week that contains the month start
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 }); // Sunday

  // Generate all days for the calendar
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Get day names for header
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handlePreviousMonth = () => {
    setSelectedMonth(subMonths(selectedMonth, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(addMonths(selectedMonth, 1));
  };

  const handleDateClick = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const dayAppointments = filteredAppointmentsByDate?.[dateKey] || [];
    
    if (dayAppointments.length > 0) {
      setSelectedDate(date);
      setShowDayPopup(true);
    }
  };

  const handleAppointmentClick = (appointment: any) => {
    setSelectedAppointment(appointment);
    setShowAppointmentDetails(true);
    setShowDayPopup(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'no_show':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return t('appointments.statusCompleted');
      case 'cancelled':
        return t('appointments.statusCancelled');
      case 'no_show':
        return t('appointments.statusNoShow');
      default:
        return t('appointments.statusScheduled');
    }
  };

  // Clinic-aware currency formatting
  const formatCurrencyWithClinic = (value: number) => {
    return formatCurrency(value, 2, currency);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousMonth}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <h2 className="text-xl font-semibold text-foreground">
            {format(selectedMonth, 'MMMM yyyy', { locale })}
          </h2>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextMonth}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedMonth(new Date())}
          className="text-sm"
        >
          {t('appointments.today')}
        </Button>
      </div>

      {/* Calendar Grid */}
      <Card className="border-border bg-card">
        <CardContent className="p-0">
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-border">
            {dayNames.map((day) => (
              <div
                key={day}
                className="p-3 text-center text-sm font-medium text-muted-foreground bg-muted/30"
              >
                {t(`appointments.days.${day.toLowerCase()}`)}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayAppointments = filteredAppointmentsByDate?.[dateKey] || [];
              const isCurrentMonth = isSameMonth(day, selectedMonth);
              const isCurrentDay = isToday(day);
              const hasAppointments = dayAppointments.length > 0;

              return (
                <div
                  key={day.toString()}
                  className={`
                    min-h-[120px] p-2 border-r border-b border-border cursor-pointer
                    transition-colors duration-200
                    ${isCurrentMonth ? 'bg-card' : 'bg-muted/20'}
                    ${isCurrentDay ? 'bg-primary/10 border-primary/20' : ''}
                    ${hasAppointments ? 'hover:bg-muted/50' : 'hover:bg-muted/30'}
                  `}
                  onClick={() => handleDateClick(day)}
                >
                  {/* Date Number */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`
                        text-sm font-medium
                        ${isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}
                        ${isCurrentDay ? 'bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center' : ''}
                      `}
                    >
                      {format(day, 'd')}
                    </span>
                    
                    {hasAppointments && (
                      <Badge 
                        variant="secondary" 
                        className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary border-primary/20"
                      >
                        {dayAppointments.length}
                      </Badge>
                    )}
                  </div>

                  {/* Appointments Preview */}
                  <div className="space-y-1">
                    {dayAppointments.slice(0, 2).map((appointment: any) => (
                      <div
                        key={appointment.id}
                        className={`
                          text-xs p-1 rounded cursor-pointer
                          ${getStatusColor(appointment.status)}
                          hover:opacity-80 transition-opacity
                        `}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAppointmentClick(appointment);
                        }}
                      >
                        <div className="flex items-center space-x-1">
                          <Clock className="h-2.5 w-2.5" />
                          <span className="font-medium">
                            {new Intl.DateTimeFormat('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false,
                              timeZone: timezone,
                            }).format(parseISO(appointment.start_time))}
                          </span>
                        </div>
                        <div className="truncate font-medium">
                          {appointment.clients?.first_name} {appointment.clients?.last_name}
                        </div>
                        <div className="text-xs opacity-75">
                          <div className="flex items-center gap-1">
                            <div
                              className="w-2 h-2 rounded-full border border-border"
                              style={{ backgroundColor: getTherapistColor(appointment.therapists?.calendar_color_id).background }}
                            />
                            {appointment.therapists?.first_name} {appointment.therapists?.last_name}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {dayAppointments.length > 2 && (
                      <div
                        className="text-xs text-muted-foreground hover:text-foreground cursor-pointer p-1 rounded hover:bg-muted/50 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDateClick(day);
                        }}
                      >
                        <MoreHorizontal className="h-3 w-3 inline mr-1" />
                        {dayAppointments.length - 2} {t('appointments.more')}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Day Appointments Popup */}
      <Dialog open={showDayPopup} onOpenChange={setShowDayPopup}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-foreground">
              {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy', { locale })}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t('appointments.dailyView')}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3 p-4">
              {selectedDate && filteredAppointmentsByDate?.[format(selectedDate, 'yyyy-MM-dd')]?.map((appointment: any) => (
                <Card
                  key={appointment.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors border-border bg-card"
                  onClick={() => handleAppointmentClick(appointment)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-foreground">
                            {new Intl.DateTimeFormat('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false,
                              timeZone: timezone,
                            }).format(parseISO(appointment.start_time))}{' '}
                            -{' '}
                            {new Intl.DateTimeFormat('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false,
                              timeZone: timezone,
                            }).format(parseISO(appointment.end_time))}
                          </span>
                          <Badge 
                            variant="outline" 
                            className={getStatusColor(appointment.status)}
                          >
                            {getStatusText(appointment.status)}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-foreground font-medium">
                              {appointment.clients?.first_name} {appointment.clients?.last_name}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <div
                              className="w-4 h-4 rounded-full border border-border"
                              style={{ backgroundColor: getTherapistColor(appointment.therapists?.calendar_color_id).background }}
                            />
                            <span className="text-muted-foreground">
                              {appointment.treatments?.name}  {appointment.therapists?.first_name} {appointment.therapists?.last_name}
                            </span>
                          </div>
                          
                          {appointment.payment_amount && (
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-foreground">
                                {formatCurrencyWithClinic(appointment.payment_amount)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Appointment Details Dialog */}
      {selectedAppointment && (
        <AppointmentDetails
          appointment={selectedAppointment}
          open={showAppointmentDetails}
          onClose={() => {
            setShowAppointmentDetails(false);
            setSelectedAppointment(null);
          }}
        />
      )}
    </div>
  );
};

export default MonthlyAppointmentsView; 