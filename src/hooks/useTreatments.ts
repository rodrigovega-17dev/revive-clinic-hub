import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

type Treatment = Tables<'treatments'>;
type TreatmentInsert = TablesInsert<'treatments'>;

export const useTreatments = () => {
  const { clinicId } = useAuth();
  
  return useQuery({
    queryKey: ['treatments', clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      
      const { data, error } = await supabase
        .from('treatments')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('is_active', true)
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!clinicId,
  });
};

export const useCreateTreatment = () => {
  const queryClient = useQueryClient();
  const { clinicId } = useAuth();
  
  return useMutation({
    mutationFn: async (treatment: Omit<TreatmentInsert, 'clinic_id'>) => {
      if (!clinicId) throw new Error('No clinic ID available');
      
      const treatmentWithClinic: TreatmentInsert = {
        ...treatment,
        clinic_id: clinicId,
      };
      
      const { data, error } = await supabase
        .from('treatments')
        .insert(treatmentWithClinic)
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
