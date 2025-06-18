
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

type Treatment = Tables<'treatments'>;
type TreatmentInsert = TablesInsert<'treatments'>;

export const useTreatments = () => {
  return useQuery({
    queryKey: ['treatments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('treatments')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });
};

export const useCreateTreatment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (treatment: TreatmentInsert) => {
      const { data, error } = await supabase
        .from('treatments')
        .insert(treatment)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treatments'] });
    },
  });
};

export const useUpdateTreatment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Treatment> & { id: string }) => {
      const { data, error } = await supabase
        .from('treatments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treatments'] });
    },
  });
};
