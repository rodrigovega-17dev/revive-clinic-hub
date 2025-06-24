import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

type Therapist = Tables<'therapists'>;
type TherapistInsert = TablesInsert<'therapists'>;
type TherapistUpdate = TablesUpdate<'therapists'>;

export const useTherapists = () => {
  const { clinicId } = useAuth();
  
  return useQuery({
    queryKey: ['therapists', clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      
      const { data, error } = await supabase
        .from('therapists')
        .select(`
          *,
          profiles (first_name, last_name, email, phone)
        `)
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!clinicId,
  });
};

export const useCreateTherapist = () => {
  const queryClient = useQueryClient();
  const { clinicId } = useAuth();
  
  return useMutation({
    mutationFn: async (therapist: Omit<TherapistInsert, 'clinic_id'>) => {
      if (!clinicId) throw new Error('No clinic ID available');
      
      const therapistWithClinic: TherapistInsert = {
        ...therapist,
        clinic_id: clinicId,
      };
      
      const { data, error } = await supabase
        .from('therapists')
        .insert(therapistWithClinic)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['therapists'] });
    },
  });
};

export const useUpdateTherapist = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<TherapistUpdate>) => {
      const { data, error } = await supabase
        .from('therapists')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['therapists'] });
    },
  });
};
