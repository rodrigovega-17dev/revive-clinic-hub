import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

/**
 * Fetch all clinic staff (non-therapist users) for the current clinic.
 * Used for document responsible person selection.
 */
export const useClinicStaff = () => {
  const { clinicId } = useAuth();

  return useQuery({
    queryKey: ['clinic-staff', clinicId],
    queryFn: async () => {
      if (!clinicId) return [] as Profile[];

      // Get all profiles that belong to this clinic
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, signature_image_url')
        .eq('clinic_id', clinicId)
        .eq('is_active', true)
        .order('first_name', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!clinicId,
  });
};
