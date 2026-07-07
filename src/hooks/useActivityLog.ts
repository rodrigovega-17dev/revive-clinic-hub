import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ActivityLogEntry {
  id: string;
  clinic_id: string;
  user_id: string | null;
  user_email: string | null;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export const useActivityLog = (
  page = 0,
  entityType?: string,
  clientName?: string,
  therapistName?: string
) => {
  const { clinicId } = useAuth();
  const PAGE_SIZE = 50;

  return useQuery({
    queryKey: ['activity-log', clinicId, page, entityType, clientName, therapistName],
    queryFn: async () => {
      let q = supabase
        .from('activity_log')
        .select('*', { count: 'exact' })
        .eq('clinic_id', clinicId!)
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (entityType && entityType !== 'all') {
        q = q.eq('entity_type', entityType);
      }

      if (clientName) {
        q = q.ilike('description', `%${clientName}%`);
      }

      if (therapistName) {
        q = q.ilike('description', `%${therapistName}%`);
      }

      const { data, error, count } = await q;
      if (error) throw error;
      return { data: data as ActivityLogEntry[], count: count ?? 0 };
    },
    enabled: !!clinicId,
  });
};
