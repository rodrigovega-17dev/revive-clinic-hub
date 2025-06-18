
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

type Therapist = Tables<'therapists'>;
type TherapistInsert = TablesInsert<'therapists'>;

export const useTherapists = () => {
  return useQuery({
    queryKey: ['therapists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('therapists')
        .select(`
          *,
          profiles (first_name, last_name, email, phone)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
};

export const useCreateTherapist = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (therapist: TherapistInsert) => {
      const { data, error } = await supabase
        .from('therapists')
        .insert(therapist)
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
    mutationFn: async ({ id, ...updates }: Partial<Therapist> & { id: string }) => {
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
