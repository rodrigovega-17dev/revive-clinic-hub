import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks, isToday } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useClinicSettings } from '@/hooks/useClinic';
import { Skeleton } from '@/components/ui/skeleton';
import AppointmentDetails from './AppointmentDetails';

interface WeeklyAppointmentsViewProps {
  currentDate: Date;
  onDateSelect: (date: Date) => void;
  searchTerm?: string;
}

interface Appointment {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string;
  clients?: {
    first_name: string;
    last_name: string;
    phone?: string;
  };
  therapists?: {
    first_name: string;
    last_name: string;
    calendar_color_id?: string;
    email?: string;
  };
  treatments?: {
    name: string;
  };
}

interface PositionedAppointment extends Appointment {
  column: number;
  columns: number;
  isAllDay?: boolean;
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

// Time slots from 00:00 to 23:00 (24 hours total)
const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => i); // 00:00 to 23:00
const INITIAL_SCROLL_HOUR = 7;
const ALL_DAY_HEIGHT = 40;
const TIME_SLOT_HEIGHT = 60;
const DAY_COLUMN_WIDTH = 160; // Day column width; horizontal scroll on narrow viewports
// Offset before time grid (header + all-day) – used so initial scroll shows 7am at top
const HEADER_ESTIMATE_PX = 52;
const SCROLL_OFFSET_TO_7AM = HEADER_ESTIMATE_PX + ALL_DAY_HEIGHT + INITIAL_SCROLL_HOUR * TIME_SLOT_HEIGHT;

function computePositionedAppointments(dayAppointments: Appointment[]): PositionedAppointment[] {
  // Separate all-day and timed appointments
  const allDayAppointments: Appointment[] = [];
  const timedAppointments: Appointment[] = [];

  dayAppointments.forEach(apt => {
    const start = new Date(apt.start_time);
    const end = new Date(apt.end_time);
    const startHour = start.getHours();
    const endHour = end.getHours();
    // Consider all-day if it spans more than 12 hours or starts at midnight
    if (startHour === 0 && endHour >= 12 || (end.getTime() - start.getTime()) > 12 * 60 * 60 * 1000) {
      allDayAppointments.push(apt);
    } else {
      timedAppointments.push(apt);
    }
  });

  // Position all-day appointments
  const positionedAllDay = allDayAppointments.map((apt, index) => ({
    ...apt,
    column: index,
    columns: allDayAppointments.length,
    isAllDay: true
  }));

  // Sort by start time
  const sorted = [...timedAppointments].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  const positioned: PositionedAppointment[] = [];

  // Helper to check overlap
  function isOverlap(a: Appointment, b: Appointment) {
    const aStart = new Date(a.start_time).getTime();
    const aEnd = new Date(a.end_time).getTime();
    const bStart = new Date(b.start_time).getTime();
    const bEnd = new Date(b.end_time).getTime();
    return aStart < bEnd && bStart < aEnd;
  }

  // Find clusters of overlapping appointments
  let clusters: Appointment[][] = [];
  let currentCluster: Appointment[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const apt = sorted[i];
    if (currentCluster.length === 0) {
      currentCluster.push(apt);
    } else {
      // If overlaps with any in current cluster, add to cluster
      if (currentCluster.some(other => isOverlap(apt, other))) {
        currentCluster.push(apt);
      } else {
        clusters.push(currentCluster);
        currentCluster = [apt];
      }
    }
  }
  if (currentCluster.length > 0) clusters.push(currentCluster);

  // For each cluster, assign columns compactly
  for (const cluster of clusters) {
    // For each appointment in cluster, assign the leftmost available column
    const clusterPositioned: PositionedAppointment[] = [];
    for (const apt of cluster) {
      const aptStart = new Date(apt.start_time).getTime();
      const aptEnd = new Date(apt.end_time).getTime();
      // Find the leftmost available column
      let col = 0;
      while (true) {
        // Check if this column is occupied by any overlapping appointment
        const conflict = clusterPositioned.some(
          p => p.column === col && !(new Date(p.end_time).getTime() <= aptStart || new Date(p.start_time).getTime() >= aptEnd)
        );
        if (!conflict) break;
        col++;
      }
      clusterPositioned.push({ ...apt, column: col, columns: 1, isAllDay: false });
    }
    // Find the max column used in this cluster
    const maxCol = Math.max(...clusterPositioned.map(p => p.column));
    // Set columns for each appointment in this cluster
    for (const p of clusterPositioned) {
      p.columns = maxCol + 1;
      positioned.push(p);
    }
  }

  return [...positionedAllDay, ...positioned];
}

const WeeklyAppointmentsView = ({ currentDate, onDateSelect, searchTerm }: WeeklyAppointmentsViewProps) => {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const { clinicId } = useAuth();
  const { timezone } = useClinicSettings();
  const [selectedWeek, setSelectedWeek] = useState(currentDate);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  
  const locale = currentLanguage === 'es' ? es : enUS;
  
  // Calculate week range
  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 }); // Monday start
  const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Fetch appointments for the week
  const { data: appointments, isLoading } = useQuery({
    queryKey: ['weekly-appointments', weekStart.toISOString(), weekEnd.toISOString(), clinicId],
    queryFn: async () => {
      if (!clinicId) return [];

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          clients (
            first_name,
            last_name,
            phone
          ),
          therapists (
            first_name,
            last_name,
            calendar_color_id,
            email
          ),
          treatments (
            name,
            price
          )
        `)
        .eq('clinic_id', clinicId)
        .gte('start_time', weekStart.toISOString())
        .lte('start_time', weekEnd.toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!clinicId,
  });

  const normalizedSearch = searchTerm?.trim().toLowerCase() || '';
  const filteredAppointments = useMemo(() => {
    if (!appointments || !normalizedSearch) return appointments || [];
    return appointments.filter((apt) => {
      const clientName = `${apt.clients?.first_name || ''} ${apt.clients?.last_name || ''}`.toLowerCase();
      return clientName.includes(normalizedSearch);
    });
  }, [appointments, normalizedSearch]);

  // Group appointments by day and compute positions
  const appointmentsByDay = useMemo(() => {
    if (!filteredAppointments) return {};
    return weekDays.reduce((acc, day) => {
      const dayKey = format(day, 'yyyy-MM-dd');
      const dayAppointments = filteredAppointments.filter(apt => isSameDay(new Date(apt.start_time), day));
      acc[dayKey] = computePositionedAppointments(dayAppointments);
      return acc;
    }, {} as Record<string, PositionedAppointment[]>);
  }, [filteredAppointments, weekDays]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = direction === 'next' 
      ? addWeeks(selectedWeek, 1) 
      : subWeeks(selectedWeek, 1);
    setSelectedWeek(newWeek);
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollTo7am = () => {
      el.scrollTop = SCROLL_OFFSET_TO_7AM;
    };
    requestAnimationFrame(() => {
      requestAnimationFrame(scrollTo7am);
    });
  }, [selectedWeek]);

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowAppointmentDetails(true);
  };

  const getTherapistColor = (colorId?: string) => {
    return GOOGLE_CALENDAR_COLORS.find(color => color.id === colorId) || GOOGLE_CALENDAR_COLORS[0];
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

  const getClinicTimeParts = (date: Date) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0');
    const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '0');
    return { hour, minute };
  };

  // 24-hour format for time column labels and appointment blocks
  const formatHourLabel = (hour: number) => {
    const normalized = hour % 24;
    return `${String(normalized).padStart(2, '0')}:00`;
  };

  const formatClinicTime = (isoString: string) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  };

  const getTimePosition = (startTime: string) => {
    const date = new Date(startTime);
    const { hour, minute } = getClinicTimeParts(date);
    return hour * TIME_SLOT_HEIGHT + (minute / 60) * TIME_SLOT_HEIGHT; // 00:00 is the start time
  };

  const getDuration = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end.getTime() - start.getTime();
    const durationMinutes = durationMs / (1000 * 60);
    return Math.max(30, durationMinutes / 60 * TIME_SLOT_HEIGHT); // Convert to pixels
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
        <Skeleton className="h-[800px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateWeek('prev')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateWeek('next')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold dark:text-white">
            {format(weekStart, 'MMMM d', { locale })} - {format(weekEnd, 'MMMM d, yyyy', { locale })}
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedWeek(new Date())}
          >
            {t('appointments.today')}
          </Button>
        </div>
      </div>

      {/* Google Calendar Style Weekly View */}
      <div className="border rounded-lg overflow-hidden bg-card border-border max-w-full">
        {/* Scrollable container: vertical (time) + horizontal (days). Initial scroll shows 7am. */}
        <div
          ref={scrollContainerRef}
          className="overflow-auto scrollbar-hide w-full"
          style={{ height: '700px', maxWidth: '100%' }}
        >
          <div style={{ width: `${80 + 7 * DAY_COLUMN_WIDTH}px` }}>
            {/* Header with day names */}
            <div className="grid border-b border-border sticky top-0 z-40" style={{ gridTemplateColumns: `80px repeat(7, ${DAY_COLUMN_WIDTH}px)` }}>
              <div className="w-20 border-r border-border sticky left-0 z-30" style={{ backgroundColor: 'var(--time-column-bg, #f6f8fb)' }}></div> {/* Time column header */}
              {weekDays.map((day) => {
                const isCurrentDay = isToday(day);
                return (
                  <div
                    key={format(day, 'yyyy-MM-dd')}
                    className={`p-2 text-center border-r last:border-r-0 border-border font-semibold`}
                    style={{
                      width: `${DAY_COLUMN_WIDTH}px`,
                      backgroundColor: isCurrentDay ? 'var(--weekly-header-current-bg)' : 'var(--weekly-header-bg)',
                      color: isCurrentDay ? '#2563eb' : 'var(--foreground)'
                    }}
                  >
                    <div className="text-xs font-medium">
                      {format(day, 'EEE', { locale })}
                    </div>
                    <div className={`text-lg`}>
                      {format(day, 'd')}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* All-day events section */}
            <div className="grid border-b border-border" style={{ gridTemplateColumns: `80px repeat(7, ${DAY_COLUMN_WIDTH}px)` }}>
              <div className="w-20 border-r border-border flex items-center justify-center text-xs text-muted-foreground font-medium sticky left-0 z-30" style={{ backgroundColor: 'var(--time-column-bg, #f6f8fb)' }}>
                {t('appointments.allDay')}
              </div>
              {weekDays.map((day) => {
                const dayKey = format(day, 'yyyy-MM-dd');
                const dayData = appointmentsByDay[dayKey] || [];
                const allDayEvents = dayData.filter(apt => apt.isAllDay);
                
                return (
                  <div
                    key={dayKey}
                    className="border-r last:border-r-0 relative border-border"
                    style={{ height: `${ALL_DAY_HEIGHT}px`, width: `${DAY_COLUMN_WIDTH}px` }}
                  >
                    {allDayEvents.map((apt) => {
                      const width = 100 / apt.columns;
                      const left = apt.column * width;
                      return (
                        <div
                          key={apt.id}
                          className={`absolute rounded text-xs cursor-pointer hover:shadow-md transition-all border border-border ${getStatusColor(apt.status)}`}
                          style={{
                            width: `${width}%`,
                            left: `${left}%`,
                            top: '2px',
                            bottom: '2px',
                            zIndex: 10,
                          }}
                          onClick={() => handleAppointmentClick(apt)}
                        >
                          <div className="rounded px-2 py-1 h-full flex items-center gap-2 overflow-hidden">
                            <span
                              className="w-2 h-2 rounded-full border border-border"
                              style={{ backgroundColor: getTherapistColor(apt.therapists?.calendar_color_id).background }}
                            />
                            <div className="truncate font-medium">
                              {apt.clients?.first_name} {apt.clients?.last_name}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Time grid */}
            <div className="grid bg-card" style={{ gridTemplateColumns: `80px repeat(7, ${DAY_COLUMN_WIDTH}px)` }}>
              {/* Time labels column */}
              <div className="w-20 border-r border-border sticky left-0 z-30" style={{ backgroundColor: 'var(--time-column-bg, #f6f8fb)' }}>
                {TIME_SLOTS.map((hour) => (
                  <div
                    key={hour}
                    className="text-xs text-muted-foreground text-right pr-2"
                    style={{ 
                      height: `${TIME_SLOT_HEIGHT}px`, 
                      lineHeight: `${TIME_SLOT_HEIGHT}px`,
                      backgroundColor: 'var(--time-column-bg, #f6f8fb)'
                    }}
                  >
                    {formatHourLabel(hour)}
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {weekDays.map((day) => {
                const dayKey = format(day, 'yyyy-MM-dd');
                const dayData = appointmentsByDay[dayKey] || [];
                const timedEvents = dayData.filter(apt => !apt.isAllDay);
                const isCurrentDay = isToday(day);

                return (
                  <div
                    key={dayKey}
                    className={`border-r last:border-r-0 relative border-border ${
                      isCurrentDay ? 'bg-primary/5' : ''
                    }`}
                    style={{ 
                      height: `${TIME_SLOTS.length * TIME_SLOT_HEIGHT}px`,
                      width: `${DAY_COLUMN_WIDTH}px`
                    }}
                  >
                    {/* Time grid lines */}
                    {TIME_SLOTS.map((hour) => (
                      <div
                        key={hour}
                        className="border-b border-border/50"
                        style={{ height: `${TIME_SLOT_HEIGHT}px` }}
                      />
                    ))}

                    {/* Current time indicator */}
                    {isCurrentDay && (() => {
                      const now = new Date();
                      const { hour: currentHour, minute: currentMinute } = getClinicTimeParts(now);
                      const currentPosition = currentHour * TIME_SLOT_HEIGHT + (currentMinute / 60) * TIME_SLOT_HEIGHT;
                      
                      if (currentHour >= 0 && currentHour <= 23) {
                        return (
                          <div
                            className="absolute left-0 right-0 z-20"
                            style={{ top: `${currentPosition}px` }}
                          >
                            <div className="w-3 h-3 bg-red-500 rounded-full -ml-1.5 -mt-1.5"></div>
                            <div className="h-px bg-red-500"></div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Timed appointments */}
                    {timedEvents.map((apt) => {
                      const startTime = formatClinicTime(apt.start_time);
                      const endTime = formatClinicTime(apt.end_time);
                      const top = getTimePosition(apt.start_time);
                      const height = getDuration(apt.start_time, apt.end_time);
                      const width = 100 / apt.columns;
                      const left = apt.column * width;

                      return (
                        <div
                          key={apt.id}
                          className={`absolute rounded text-xs cursor-pointer hover:shadow-lg transition-all border border-border ${getStatusColor(apt.status)}`}
                          style={{
                            width: `${width}%`,
                            left: `${left}%`,
                            top: `${top}px`,
                            height: `${height}px`,
                            minHeight: '20px',
                            zIndex: 10 + apt.column,
                          }}
                          onClick={() => handleAppointmentClick(apt)}
                        >
                          <div className="rounded p-1 h-full overflow-hidden">
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-xs mb-0.5">{startTime}</span>
                              <span
                                className="w-2 h-2 rounded-full border border-border"
                                style={{ backgroundColor: getTherapistColor(apt.therapists?.calendar_color_id).background }}
                              />
                            </div>
                            <div className="text-xs font-medium truncate">
                              {apt.clients?.first_name} {apt.clients?.last_name}
                            </div>
                            {height > 40 && (
                              <div className="text-xs opacity-90 truncate">
                                {apt.treatments?.name}
                              </div>
                            )}
                            {height > 60 && (
                              <div className="text-xs opacity-75 truncate">
                                {apt.therapists?.first_name} {apt.therapists?.last_name}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Appointment Details */}
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

export default WeeklyAppointmentsView; 