import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

type Client = Tables<'clients'>;
type ClientInsert = TablesInsert<'clients'>;
type ClientUpdate = TablesUpdate<'clients'>;

export const useClients = () => {
  const { clinicId } = useAuth();
  
  return useQuery({
    queryKey: ['clients', clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!clinicId,
  });
};

export const useCreateClient = () => {
  const queryClient = useQueryClient();
  const { clinicId } = useAuth();
  
  return useMutation({
    mutationFn: async (client: Omit<ClientInsert, 'clinic_id'>) => {
      if (!clinicId) throw new Error('No clinic ID available');
      
      const clientWithClinic: ClientInsert = {
        ...client,
        clinic_id: clinicId,
      };
      
      const { data, error } = await supabase
        .from('clients')
        .insert(clientWithClinic)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
};

export const useUpdateClient = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<ClientUpdate>) => {
      const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
};
