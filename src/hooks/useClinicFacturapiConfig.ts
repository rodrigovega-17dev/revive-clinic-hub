/**
 * Hook for per-clinic Facturapi config. GET returns { configured, useLive } (no secrets).
 * Save sends keys + useLive to facturapi-config Netlify function.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { facturapiService } from '@/integrations/facturapi/service';

export function useClinicFacturapiConfig() {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['clinic-facturapi-config'],
    queryFn: () => facturapiService.getConfig(),
    staleTime: 60_000,
  });

  const saveMutation = useMutation({
    mutationFn: (payload: {
      facturapiTestSecret?: string;
      facturapiLiveSecret?: string;
      facturapiUseLive?: boolean;
      facturapiWebhookSecret?: string;
    }) => facturapiService.saveConfig(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-facturapi-config'] });
      queryClient.invalidateQueries({ queryKey: ['clinic'] });
    },
  });

  return {
    configured: data?.configured ?? false,
    useLive: data?.useLive ?? false,
    isLoading,
    error,
    refetch,
    saveConfig: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  };
}
