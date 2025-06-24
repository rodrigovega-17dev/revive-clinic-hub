import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Tables, TablesUpdate } from '@/integrations/supabase/types';

type Clinic = Tables<'clinics'>;
type ClinicUpdate = TablesUpdate<'clinics'>;

export const useClinic = () => {
  const { clinicId } = useAuth();
  
  return useQuery({
    queryKey: ['clinic', clinicId],
    queryFn: async () => {
      if (!clinicId) return null;
      
      const { data, error } = await supabase
        .from('clinics')
        .select('*')
        .eq('id', clinicId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!clinicId,
  });
};

export const useUpdateClinic = () => {
  const queryClient = useQueryClient();
  const { clinicId } = useAuth();
  
  return useMutation({
    mutationFn: async (updates: Partial<ClinicUpdate>) => {
      if (!clinicId) throw new Error('No clinic ID available');
      
      const { data, error } = await supabase
        .from('clinics')
        .update(updates)
        .eq('id', clinicId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic'] });
    },
  });
};

/**
 * Hook to get clinic settings (currency, timezone) for formatting
 */
export const useClinicSettings = () => {
  const { data: clinic, isLoading, error } = useClinic();
  
  return {
    currency: clinic?.currency || 'USD',
    timezone: clinic?.timezone || 'UTC',
    isLoading,
    error,
  };
}; 