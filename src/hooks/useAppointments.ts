import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { useClinicGoogleCalendar } from '@/hooks/useClinicGoogleCalendar';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from './useAuth';
import { useClinic } from './useClinic';
import { createClinicGoogleCalendarService } from '@/integrations/google-calendar/clinic-service';
import type { GoogleCalendarEvent } from '@/integrations/google-calendar/types';

type Appointment = Tables<'appointments'>;
type AppointmentInsert = TablesInsert<'appointments'>;
type AppointmentUpdate = TablesUpdate<'appointments'> & { id: string };

export const useUpcomingAppointments = () => {
  const { clinicId } = useAuth();
  
  return useQuery({
    queryKey: ['appointments', 'upcoming', clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          clients (first_name, last_name),
          therapists (id, first_name, last_name, calendar_color_id),
          treatments (name, duration_minutes)
        `)
        .eq('clinic_id', clinicId)
        .gte('start_time', new Date().toISOString())
        .eq('status', 'scheduled')
        .order('start_time', { ascending: true })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    enabled: !!clinicId,
  });
};

export const useAppointmentsByDate = (selectedDate: string, enabled = true) => {
  const { clinicId } = useAuth();

  return useQuery({
    queryKey: ['appointments', 'by-date', selectedDate, clinicId],
    queryFn: async () => {
      if (!clinicId) return {};
      
      // Parse the date properly to avoid timezone issues
      const [year, month, day] = selectedDate.split('-').map(Number);
      const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
      const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          clients (first_name, last_name, phone),
          therapists (id, first_name, last_name, calendar_color_id),
          treatments (name, duration_minutes, price)
        `)
        .eq('clinic_id', clinicId)
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString())
        .order('therapist_id')
        .order('start_time', { ascending: true });
      
      if (error) throw error;
      
      // Group appointments by therapist
      const groupedAppointments = data?.reduce((groups, appointment) => {
        const therapistId = appointment.therapist_id;
        if (!groups[therapistId]) {
          groups[therapistId] = {
            therapist: appointment.therapists,
            appointments: []
          };
        }
        groups[therapistId].appointments.push(appointment);
        return groups;
      }, {} as Record<string, { therapist: any; appointments: any[] }>);

      return groupedAppointments || {};
    },
    enabled: !!clinicId && enabled,
  });
};

/** Appointments for the week (Mon–Sun) containing date. For stats when view is weekly. */
export const useAppointmentsByWeek = (date: Date, enabled = true) => {
  const { clinicId } = useAuth();
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });

  return useQuery({
    queryKey: ['appointments', 'by-week', format(weekStart, 'yyyy-MM-dd'), clinicId],
    queryFn: async () => {
      if (!clinicId) return [];

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          clients (first_name, last_name, phone),
          therapists (id, first_name, last_name, calendar_color_id),
          treatments (name, duration_minutes, price)
        `)
        .eq('clinic_id', clinicId)
        .gte('start_time', weekStart.toISOString())
        .lte('start_time', weekEnd.toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!clinicId && enabled,
  });
};

export const useAllAppointments = () => {
  const { clinicId } = useAuth();
  
  return useQuery({
    queryKey: ['appointments', 'all', clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          clients (first_name, last_name, phone),
          therapists (id, first_name, last_name, calendar_color_id),
          treatments (name, duration_minutes, price)
        `)
        .eq('clinic_id', clinicId)
        .order('start_time', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!clinicId,
  });
};

export const useCreateAppointment = () => {
  const queryClient = useQueryClient();
  const { clinicId } = useAuth();
  
  return useMutation({
    mutationFn: async (appointment: Omit<AppointmentInsert, 'clinic_id'>) => {
      if (!clinicId) throw new Error('No clinic ID available');
      
      const appointmentWithClinic: AppointmentInsert = {
        ...appointment,
        clinic_id: clinicId,
      };

      // Server-side conflict check to prevent double-booking races
      const { data: hasConflict, error: conflictError } = await supabase.rpc(
        'has_appointment_conflict',
        {
          therapist_id: appointmentWithClinic.therapist_id,
          start_time: appointmentWithClinic.start_time,
          end_time: appointmentWithClinic.end_time,
          exclude_appointment_id: null,
        }
      );

      if (conflictError) throw conflictError;
      if (hasConflict) {
        throw new Error('Appointment time conflicts with an existing booking');
      }
      
      const { data, error } = await supabase
        .from('appointments')
        .insert(appointmentWithClinic)
        .select(`
          *,
          clients (first_name, last_name, email, phone),
          therapists (first_name, last_name, calendar_color_id, email),
          treatments (name, price)
        `)
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (createdAppointment) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({
        queryKey: ['appointments-by-month'],
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: ['weekly-appointments'],
        exact: false,
      });
      const cid = createdAppointment?.client_id;
      if (cid && clinicId) {
        queryClient.invalidateQueries({ queryKey: ['client-appointments-history', cid, clinicId] });
        queryClient.invalidateQueries({ queryKey: ['client-pending-appointments', cid, clinicId] });
      }
    },
  });
};

export const useUpdateAppointment = () => {
  const queryClient = useQueryClient();
  const { clinicId } = useAuth();
  const { syncAppointment, deleteAppointment, isAuthenticated } = useClinicGoogleCalendar();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<AppointmentUpdate>) => {
      const { data, error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          clients (first_name, last_name, email, phone),
          therapists (first_name, last_name, calendar_color_id, email),
          treatments (name, price)
        `)
        .single();
      
      if (error) throw error;
      return { data, updates };
    },
    onSuccess: async ({ data: updatedAppointment, updates }) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({
        queryKey: ['appointments-by-month'],
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: ['weekly-appointments'],
        exact: false,
      });
      const cid = updatedAppointment?.client_id;
      if (cid && clinicId) {
        queryClient.invalidateQueries({ queryKey: ['client-appointments-history', cid, clinicId] });
        queryClient.invalidateQueries({ queryKey: ['client-pending-appointments', cid, clinicId] });
      }

      // Debug: Log the updated appointment data
      console.log('Updated appointment data:', {
        id: updatedAppointment.id,
        hasGoogleEventId: !!updatedAppointment.google_calendar_event_id,
        googleEventId: updatedAppointment.google_calendar_event_id,
        status: updatedAppointment.status,
        start_time: updatedAppointment.start_time,
        updatedFields: Object.keys(updates)
      });
      
      // Only sync to Google Calendar if connected, authenticated, NOT cancelled, and relevant fields updated
      const shouldSyncToGoogle = isAuthenticated &&
        updatedAppointment.status !== 'cancelled' &&
        (
          'start_time' in updates ||
          'end_time' in updates ||
          'therapist_id' in updates
        );

      const shouldDeleteFromGoogle =
        isAuthenticated &&
        updates.status === 'cancelled' &&
        !!updatedAppointment.google_calendar_event_id;
      
      if (shouldDeleteFromGoogle) {
        try {
          await deleteAppointment({ googleEventId: updatedAppointment.google_calendar_event_id });
          await supabase
            .from('appointments')
            .update({ google_calendar_event_id: null })
            .eq('id', updatedAppointment.id);
        } catch (error) {
          console.error('Failed to delete appointment from Google Calendar:', error);
        }
        return;
      }

      if (shouldSyncToGoogle) {
        try {
          syncAppointment({ appointment: updatedAppointment });
        } catch (error) {
          console.error('Failed to sync appointment to Google Calendar:', error);
          // Don't throw error here as the appointment was already updated successfully
        }
      } else {
        console.log('Skipping Google Calendar sync - no relevant fields updated');
      }
    },
  });
};

export const useDeleteAppointment = () => {
  const queryClient = useQueryClient();
  const { clinicId } = useAuth();
  const { deleteAppointment: deleteGoogleEvent } = useClinicGoogleCalendar();

  return useMutation({
    mutationFn: async (appointment: any) => {
      // Delete from Google Calendar first if event exists
      if (appointment.google_calendar_event_id) {
        try {
          await deleteGoogleEvent({ googleEventId: appointment.google_calendar_event_id });
        } catch (error) {
          console.error('Failed to delete from Google Calendar:', error);
          // Continue with local deletion even if Google Calendar fails
        }
      }
      
      // Delete from database
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointment.id);
      
      if (error) throw error;
      return appointment;
    },
    onSuccess: (deletedAppointment) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({
        queryKey: ['appointments-by-month'],
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: ['weekly-appointments'],
        exact: false,
      });
      const cid = deletedAppointment?.client_id;
      if (cid && clinicId) {
        queryClient.invalidateQueries({ queryKey: ['client-appointments-history', cid, clinicId] });
        queryClient.invalidateQueries({ queryKey: ['client-pending-appointments', cid, clinicId] });
      }
    },
  });
};

export const useTodayStats = () => {
  const { clinicId } = useAuth();
  
  return useQuery({
    queryKey: ['stats', 'today', clinicId],
    queryFn: async () => {
      if (!clinicId) return {
        totalAppointments: 0,
        completedAppointments: 0,
        todayRevenue: 0,
        clientsWithAppointmentsToday: 0,
      };

      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      // Get today's appointments (status + client_id for unique clients count)
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('status, client_id')
        .eq('clinic_id', clinicId)
        .gte('start_time', startOfDay)
        .lte('start_time', endOfDay);

      if (appointmentsError) throw appointmentsError;

      // Get today's payments
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount')
        .eq('clinic_id', clinicId)
        .gte('payment_date', startOfDay)
        .lte('payment_date', endOfDay);

      if (paymentsError) throw paymentsError;

      const totalAppointments = appointments?.length || 0;
      const completedAppointments = appointments?.filter(a => a.status === 'completed').length || 0;
      const todayRevenue = payments?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;
      const uniqueClientIds = new Set((appointments || []).map((a) => a.client_id).filter(Boolean));
      const clientsWithAppointmentsToday = uniqueClientIds.size;

      return {
        totalAppointments,
        completedAppointments,
        todayRevenue,
        clientsWithAppointmentsToday,
      };
    },
    enabled: !!clinicId,
  });
};

export const useAppointmentsByMonth = (year: number, month: number, enabled = true) => {
  const { clinicId } = useAuth();

  return useQuery({
    queryKey: ['appointments-by-month', year, month, clinicId],
    queryFn: async () => {
      if (!clinicId) return {};

      // Use date-fns to properly get start and end of month
      const monthDate = new Date(year, month - 1, 1);
      const startDate = startOfMonth(monthDate).toISOString();
      const endDate = endOfMonth(monthDate).toISOString();

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          clients (
            id,
            first_name,
            last_name,
            phone
          ),
          therapists (
            id,
            first_name,
            last_name,
            calendar_color_id
          ),
          treatments (
            id,
            name,
            duration_minutes
          )
        `)
        .eq('clinic_id', clinicId)
        .gte('start_time', startDate)
        .lte('start_time', endDate)
        .order('start_time', { ascending: true });

      if (error) throw error;

      // Group appointments by date
      const groupedByDate: Record<string, any[]> = {};
      
      data?.forEach(appointment => {
        const date = format(new Date(appointment.start_time), 'yyyy-MM-dd');
        if (!groupedByDate[date]) {
          groupedByDate[date] = [];
        }
        groupedByDate[date].push(appointment);
      });

      return groupedByDate;
    },
    enabled: !!clinicId && enabled,
  });
};

export const useTherapistAvailability = (
  therapistId: string, 
  date: string, 
  startTime: string, 
  duration: number, 
  excludeAppointmentId?: string,
  t?: (key: string) => string,
  locale?: string
) => {
  const { clinicId } = useAuth();
  const { data: clinic } = useClinic();

  return useQuery({
    queryKey: [
      'therapist-availability',
      therapistId,
      date,
      startTime,
      duration,
      excludeAppointmentId,
      clinicId,
      clinic?.google_calendar_enabled,
      clinic?.google_calendar_selected_id,
    ],
    queryFn: async () => {
      if (!therapistId || !date || !startTime || !clinicId) {
        return { hasConflict: false, conflicts: [], availableSlots: [] };
      }

      // Load schedule rules (therapist-specific overrides clinic defaults)
      const { data: rules, error: rulesError } = await supabase
        .from('therapist_schedule_rules')
        .select('therapist_id, weekday, start_time, end_time, slot_minutes, buffer_minutes, is_active')
        .eq('clinic_id', clinicId)
        .eq('is_active', true)
        .or(`therapist_id.eq.${therapistId},therapist_id.is.null`);

      if (rulesError) throw rulesError;

      const rulesByWeekday = buildRulesByWeekday(rules || [], therapistId);

      // Parse the requested appointment time
      const [year, month, day] = date.split('-').map(Number);
      const [hourValue, minuteValue = '0'] = startTime.includes(':')
        ? startTime.split(':')
        : [startTime, '0'];
      const requestedStart = new Date(
        year,
        month - 1,
        day,
        parseInt(hourValue, 10),
        parseInt(minuteValue, 10),
        0
      );
      const requestedEnd = new Date(requestedStart.getTime() + duration * 60000);
      const requestRule = rulesByWeekday[requestedStart.getDay()];
      const bufferMinutes = requestRule?.buffer_minutes ?? 0;

      // Get all appointments for this therapist on the selected date
      const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
      const endOfRange = new Date(year, month - 1, day + MAX_SUGGESTION_DAYS, 23, 59, 59, 999);

      const { data: existingAppointments, error } = await supabase
        .from('appointments')
        .select(`
          id,
          start_time,
          end_time,
          status,
          google_calendar_event_id,
          clients (first_name, last_name)
        `)
        .eq('therapist_id', therapistId)
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfRange.toISOString())
        .neq('status', 'cancelled')
        .order('start_time');

      if (error) throw error;

      // Pull Google Calendar events (shared calendar filtered by therapist_id)
      const googleEvents = await fetchGoogleEvents({
        clinicId,
        clinicEnabled: clinic?.google_calendar_enabled,
        calendarId: clinic?.google_calendar_selected_id,
        therapistId,
        startTime: startOfDay,
        endTime: endOfRange,
      });

      const existingGoogleEventIds = new Set(
        (existingAppointments || [])
          .map((appointment) => appointment.google_calendar_event_id)
          .filter(Boolean)
      );
      const normalizedGoogleEvents = normalizeGoogleEvents(
        googleEvents.filter((event) => !event.id || !existingGoogleEventIds.has(event.id))
      );
      const combinedAppointments = [...(existingAppointments || []), ...normalizedGoogleEvents];

      // Check for conflicts, excluding the specified appointment if provided
      const conflicts = combinedAppointments.filter(appointment => {
        // Skip the appointment being excluded (for rescheduling)
        if (excludeAppointmentId && appointment.id === excludeAppointmentId) {
          return false;
        }
        
        const appointmentStart = new Date(appointment.start_time);
        const appointmentEnd = new Date(appointment.end_time);
        
        // Check if there's any overlap (with buffer time)
        return hasTimeConflict({
          requestedStart,
          requestedEnd,
          existingStart: appointmentStart,
          existingEnd: appointmentEnd,
          bufferMinutes,
        });
      }) || [];

      const isWithinWorkingHours = requestRule
        ? isWithinRuleWindow(requestedStart, requestedEnd, requestRule)
        : true;
      const hasConflict = conflicts.length > 0 || !isWithinWorkingHours;

      // Generate alternative time slots to help guide scheduling
      const availableSlots = generateAlternativeSlots(
        combinedAppointments,
        requestedStart,
        duration,
        year,
        month - 1,
        day,
        rulesByWeekday,
        t,
        locale
      );

      return {
        hasConflict,
        conflicts,
        availableSlots,
      };
    },
    enabled: !!therapistId && !!date && !!startTime && !!clinicId,
  });
};

type ScheduleRule = {
  therapist_id: string | null;
  weekday: number;
  start_time: string;
  end_time: string;
  slot_minutes: number;
  buffer_minutes: number;
  is_active: boolean;
};

const DEFAULT_RULE: ScheduleRule = {
  therapist_id: null,
  weekday: 0,
  start_time: '08:00:00',
  end_time: '18:00:00',
  slot_minutes: 60,
  buffer_minutes: 0,
  is_active: true,
};

const MAX_SUGGESTION_DAYS = 14;

// Build weekday rules with therapist-specific overrides
const buildRulesByWeekday = (rules: ScheduleRule[], therapistId: string) => {
  const byWeekday: Record<number, ScheduleRule> = {};

  for (let weekday = 0; weekday <= 6; weekday += 1) {
    const therapistRule = rules.find(
      (rule) => rule.weekday === weekday && rule.therapist_id === therapistId
    );
    const clinicRule = rules.find(
      (rule) => rule.weekday === weekday && rule.therapist_id === null
    );

    byWeekday[weekday] = therapistRule || clinicRule || { ...DEFAULT_RULE, weekday };
  }

  return byWeekday;
};

const parseTimeParts = (timeValue: string) => {
  const [hour, minute = '0', second = '0'] = timeValue.split(':');
  return {
    hour: parseInt(hour, 10),
    minute: parseInt(minute, 10),
    second: parseInt(second, 10),
  };
};

const isWithinRuleWindow = (start: Date, end: Date, rule: ScheduleRule) => {
  const { hour: startHour, minute: startMinute, second: startSecond } = parseTimeParts(rule.start_time);
  const { hour: endHour, minute: endMinute, second: endSecond } = parseTimeParts(rule.end_time);

  const dayStart = new Date(start.getFullYear(), start.getMonth(), start.getDate(), startHour, startMinute, startSecond);
  const dayEnd = new Date(start.getFullYear(), start.getMonth(), start.getDate(), endHour, endMinute, endSecond);

  return start >= dayStart && end <= dayEnd;
};

const hasTimeConflict = ({
  requestedStart,
  requestedEnd,
  existingStart,
  existingEnd,
  bufferMinutes,
}: {
  requestedStart: Date;
  requestedEnd: Date;
  existingStart: Date;
  existingEnd: Date;
  bufferMinutes: number;
}) => {
  const bufferMs = bufferMinutes * 60 * 1000;
  const bufferedStart = new Date(existingStart.getTime() - bufferMs);
  const bufferedEnd = new Date(existingEnd.getTime() + bufferMs);

  return requestedStart < bufferedEnd && requestedEnd > bufferedStart;
};

const fetchGoogleEvents = async ({
  clinicId,
  clinicEnabled,
  calendarId,
  therapistId,
  startTime,
  endTime,
}: {
  clinicId: string;
  clinicEnabled?: boolean;
  calendarId?: string | null;
  therapistId: string;
  startTime: Date;
  endTime: Date;
}): Promise<GoogleCalendarEvent[]> => {
  if (!clinicEnabled) return [];

  try {
    const service = createClinicGoogleCalendarService(clinicId);
    return await service.listEventsForTherapist(startTime, endTime, therapistId, {
      calendarId: calendarId || undefined,
    });
  } catch (error) {
    console.warn('Failed to fetch Google Calendar events for availability:', error);
    return [];
  }
};

const normalizeGoogleEvents = (events: GoogleCalendarEvent[]) => {
  return events
    .map((event) => {
      const start = event.start?.dateTime || event.start?.date;
      const end = event.end?.dateTime || event.end?.date;

      if (!start || !end) {
        return null;
      }

      return {
        id: event.id || `google-${start}`,
        start_time: start,
        end_time: end,
        status: 'external',
        source: 'google',
      };
    })
    .filter(Boolean) as Array<{
      id: string;
      start_time: string;
      end_time: string;
      status: string;
      source: string;
    }>;
};

// Helper function to generate alternative time slots
const generateAlternativeSlots = (
  existingAppointments: any[],
  requestedStart: Date,
  duration: number,
  year: number,
  month: number,
  day: number,
  rulesByWeekday: Record<number, ScheduleRule>,
  t?: (key: string) => string,
  locale?: string
): Array<{ time: string; label: string }> => {
  const slots: Array<{ time: string; label: string }> = [];
  const now = new Date();
  const maxDaysToSearch = 14;
  
  // Generate slots for today and next days
  for (let dayOffset = 0; dayOffset <= maxDaysToSearch; dayOffset++) {
    const currentDay = new Date(year, month, day + dayOffset);
    const ruleForDay = rulesByWeekday[currentDay.getDay()] || DEFAULT_RULE;
    
    // Skip if this day is in the past
    if (currentDay < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
      continue;
    }
    
    const ruleStart = parseTimeParts(ruleForDay.start_time);
    const ruleEnd = parseTimeParts(ruleForDay.end_time);
    const slotIntervalMinutes = ruleForDay.slot_minutes || DEFAULT_RULE.slot_minutes;
    const bufferMinutes = ruleForDay.buffer_minutes || 0;

    let slotStart = new Date(
      currentDay.getFullYear(),
      currentDay.getMonth(),
      currentDay.getDate(),
      ruleStart.hour,
      ruleStart.minute,
      ruleStart.second
    );
    const ruleEndTime = new Date(
      currentDay.getFullYear(),
      currentDay.getMonth(),
      currentDay.getDate(),
      ruleEnd.hour,
      ruleEnd.minute,
      ruleEnd.second
    );

    // Generate slots in rule-based increments
    while (slotStart < ruleEndTime) {
      const slotEnd = new Date(slotStart.getTime() + duration * 60000);
      
      // Skip if slot falls outside the rule window
      if (slotEnd > ruleEndTime) {
        break;
      }

      // Skip if slot is in the past
      if (slotStart <= now) {
        slotStart = new Date(slotStart.getTime() + slotIntervalMinutes * 60000);
        continue;
      }
      
      // Skip the requested time
      if (Math.abs(slotStart.getTime() - requestedStart.getTime()) < 60000) {
        slotStart = new Date(slotStart.getTime() + slotIntervalMinutes * 60000);
        continue;
      }
      
      // Check if this slot conflicts with any existing appointment
      const hasConflict = existingAppointments.some(appointment => {
        const appointmentStart = new Date(appointment.start_time);
        const appointmentEnd = new Date(appointment.end_time);
        
        return hasTimeConflict({
          requestedStart: slotStart,
          requestedEnd: slotEnd,
          existingStart: appointmentStart,
          existingEnd: appointmentEnd,
          bufferMinutes,
        });
      });
      
      if (!hasConflict) {
        // Use locale-aware time formatting
        const timeString = slotStart.toLocaleTimeString(locale || 'en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
        
        // Add day information with proper internationalization
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrowStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), todayStart.getDate() + 1);
        const slotDayStart = new Date(slotStart.getFullYear(), slotStart.getMonth(), slotStart.getDate());

        let dayLabel = '';
        if (slotDayStart.getTime() === todayStart.getTime()) {
          dayLabel = t ? t('appointments.today') : 'Today';
        } else if (slotDayStart.getTime() === tomorrowStart.getTime()) {
          dayLabel = t ? t('appointments.tomorrow') : 'Tomorrow';
        } else {
          dayLabel = slotStart.toLocaleDateString(locale || 'en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
          });
        }
        
        slots.push({
          time: slotStart.toISOString(),
          label: `${dayLabel} ${timeString}`,
        });
      }

      slotStart = new Date(slotStart.getTime() + slotIntervalMinutes * 60000);
    }
  }

  // Sort slots by time and return only the first 10 available slots
  return slots
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
    .slice(0, 10);
};
