import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

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
          therapists (id, first_name, last_name),
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
          therapists (id, first_name, last_name),
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
          therapists (id, first_name, last_name),
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
    },
  });
};

export const useUpdateAppointment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: AppointmentUpdate) => {
      const { data, error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
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
