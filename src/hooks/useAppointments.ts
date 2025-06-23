import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/hooks/useLanguage';

type AppointmentInsert = TablesInsert<'appointments'>;
type AppointmentUpdate = TablesUpdate<'appointments'> & { id: string };

export const useUpcomingAppointments = () => {
  return useQuery({
    queryKey: ['appointments', 'upcoming'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          clients (first_name, last_name),
          therapists (id, first_name, last_name, calendar_color_id),
          treatments (name, duration_minutes)
        `)
        .gte('start_time', new Date().toISOString())
        .eq('status', 'scheduled')
        .order('start_time', { ascending: true })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
  });
};

export const useAppointmentsByDate = (selectedDate: string) => {
  return useQuery({
    queryKey: ['appointments', 'by-date', selectedDate],
    queryFn: async () => {
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
  });
};

export const useAllAppointments = () => {
  return useQuery({
    queryKey: ['appointments', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          clients (first_name, last_name, phone),
          therapists (id, first_name, last_name, calendar_color_id),
          treatments (name, duration_minutes, price)
        `)
        .order('start_time', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
};

export const useCreateAppointment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (appointment: AppointmentInsert) => {
      const { data, error } = await supabase
        .from('appointments')
        .insert(appointment)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      
      // Invalidate all monthly view queries to ensure calendar updates
      queryClient.invalidateQueries({ 
        queryKey: ['appointments-by-month'],
        exact: false 
      });
    },
  });
};

export const useUpdateAppointment = () => {
  const queryClient = useQueryClient();
  const { autoSyncAppointment } = useGoogleCalendar();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: AppointmentUpdate) => {
      const { data, error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          clients (first_name, last_name, email, phone),
          therapists (first_name, last_name, calendar_color_id),
          treatments (name, price)
        `)
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (updatedAppointment) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      
      // Invalidate all monthly view queries to ensure calendar updates
      queryClient.invalidateQueries({ 
        queryKey: ['appointments-by-month'],
        exact: false 
      });
      
      // Sync to Google Calendar if connected
      autoSyncAppointment(updatedAppointment);
    },
  });
};

export const useDeleteAppointment = () => {
  const queryClient = useQueryClient();
  const { deleteAppointment: deleteGoogleEvent } = useGoogleCalendar();
  
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      
      // Invalidate all monthly view queries to ensure calendar updates
      queryClient.invalidateQueries({ 
        queryKey: ['appointments-by-month'],
        exact: false 
      });
    },
  });
};

export const useTodayStats = () => {
  return useQuery({
    queryKey: ['stats', 'today'],
    queryFn: async () => {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      // Get today's appointments
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('status')
        .gte('start_time', startOfDay)
        .lte('start_time', endOfDay);

      if (appointmentsError) throw appointmentsError;

      // Get today's payments
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount')
        .gte('payment_date', startOfDay)
        .lte('payment_date', endOfDay);

      if (paymentsError) throw paymentsError;

      // Get total clients
      const { count: totalClients, error: clientsError } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      if (clientsError) throw clientsError;

      const totalAppointments = appointments?.length || 0;
      const completedAppointments = appointments?.filter(a => a.status === 'completed').length || 0;
      const todayRevenue = payments?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;

      return {
        totalAppointments,
        completedAppointments,
        todayRevenue,
        totalClients: totalClients || 0,
      };
    },
  });
};

export const useAppointmentsByMonth = (year: number, month: number) => {
  return useQuery({
    queryKey: ['appointments-by-month', year, month],
    queryFn: async () => {
      const startDate = new Date(year, month - 1, 1).toISOString();
      const endDate = new Date(year, month, 0).toISOString();

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
  });
};

export const useTherapistAvailability = (therapistId: string, date: string, startTime: string, duration: number) => {
  return useQuery({
    queryKey: ['therapist-availability', therapistId, date, startTime, duration],
    queryFn: async () => {
      if (!therapistId || !date || !startTime) {
        return { hasConflict: false, conflicts: [], availableSlots: [] };
      }

      // Parse the requested appointment time
      const [year, month, day] = date.split('-').map(Number);
      const hour = startTime.includes(':') ? startTime.split(':')[0] : startTime;
      const requestedStart = new Date(year, month - 1, day, parseInt(hour), 0, 0);
      const requestedEnd = new Date(requestedStart.getTime() + duration * 60000);

      // Get all appointments for this therapist on the selected date
      const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
      const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

      const { data: existingAppointments, error } = await supabase
        .from('appointments')
        .select(`
          id,
          start_time,
          end_time,
          status,
          clients (first_name, last_name)
        `)
        .eq('therapist_id', therapistId)
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString())
        .neq('status', 'cancelled')
        .order('start_time');

      if (error) throw error;

      // Check for conflicts
      const conflicts = existingAppointments?.filter(appointment => {
        const appointmentStart = new Date(appointment.start_time);
        const appointmentEnd = new Date(appointment.end_time);
        
        // Check if there's any overlap
        return (
          (requestedStart < appointmentEnd && requestedEnd > appointmentStart) ||
          (appointmentStart < requestedEnd && appointmentEnd > requestedStart)
        );
      }) || [];

      const hasConflict = conflicts.length > 0;

      // Generate alternative time slots if there's a conflict
      const availableSlots = hasConflict ? generateAlternativeSlots(
        existingAppointments || [],
        requestedStart,
        duration,
        year,
        month - 1,
        day
      ) : [];

      return {
        hasConflict,
        conflicts,
        availableSlots,
      };
    },
    enabled: !!therapistId && !!date && !!startTime,
  });
};

// Helper function to generate alternative time slots
const generateAlternativeSlots = (
  existingAppointments: any[],
  requestedStart: Date,
  duration: number,
  year: number,
  month: number,
  day: number
): Array<{ time: string; label: string }> => {
  const slots: Array<{ time: string; label: string }> = [];
  const now = new Date();
  const businessHours = { start: 8, end: 18 }; // 8 AM to 6 PM
  
  // Get current language for localization
  const { currentLanguage } = useLanguage();
  const { t } = useTranslation();
  const locale = currentLanguage === 'es' ? es : enUS;
  
  // Generate slots for today and next 7 days
  for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
    const currentDay = new Date(year, month, day + dayOffset);
    
    // Skip if this day is in the past
    if (currentDay < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
      continue;
    }
    
    // Determine start hour for this day
    let startHour = businessHours.start;
    if (dayOffset === 0) {
      // For today, start from current hour + 1, but not before business hours
      startHour = Math.max(businessHours.start, now.getHours() + 1);
    }
    
    // Generate slots every hour from start hour to end of business hours
    for (let hour = startHour; hour < businessHours.end; hour++) {
      const slotStart = new Date(currentDay.getFullYear(), currentDay.getMonth(), currentDay.getDate(), hour, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + duration * 60000);
      
      // Skip if slot is in the past
      if (slotStart <= now) {
        continue;
      }
      
      // Skip the requested time
      if (Math.abs(slotStart.getTime() - requestedStart.getTime()) < 60000) {
        continue;
      }
      
      // Check if this slot conflicts with any existing appointment
      const hasConflict = existingAppointments.some(appointment => {
        const appointmentStart = new Date(appointment.start_time);
        const appointmentEnd = new Date(appointment.end_time);
        
        // Check for any overlap
        return (
          (slotStart < appointmentEnd && slotEnd > appointmentStart) ||
          (appointmentStart < slotEnd && appointmentEnd > slotStart)
        );
      });
      
      if (!hasConflict) {
        const timeString = slotStart.toLocaleTimeString(currentLanguage === 'es' ? 'es-ES' : 'en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
        
        // Add day information with localization
        let dayLabel = '';
        if (dayOffset === 0) {
          dayLabel = t('appointments.today');
        } else if (dayOffset === 1) {
          dayLabel = t('appointments.tomorrow');
        } else {
          dayLabel = format(slotStart, 'EEE, MMM d', { locale });
        }
        
        slots.push({
          time: slotStart.toISOString(),
          label: `${dayLabel} ${timeString}`,
        });
      }
    }
  }

  // Sort slots by time and return only the first 10 available slots
  return slots
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
    .slice(0, 10);
};
