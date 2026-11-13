import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAllRows';
import { useAuth } from './useAuth';

interface ClientBalance {
  totalPayments: number;
  pendingPayments: number;
  balance: number;
  lastPaymentDate: string | null;
}

// Balance rules live in the get_client_balances DB function (see its migration):
// money in (excl. IVA and applied credit) − charges for paid completed sessions.
// Positive = credit in the client's favor, negative = amount owed.
export function useClientBalance(clientId: string | null) {
  const { clinicId } = useAuth();

  return useQuery({
    queryKey: ['client-balance', clientId, clinicId],
    queryFn: async (): Promise<ClientBalance> => {
      if (!clientId || !clinicId) {
        return { totalPayments: 0, pendingPayments: 0, balance: 0, lastPaymentDate: null };
      }

      const { data, error } = await supabase.rpc('get_client_balances', {
        p_clinic_id: clinicId,
        p_client_ids: [clientId],
      });
      if (error) throw error;

      const row = data?.[0];
      return {
        totalPayments: Number(row?.total_payments ?? 0),
        pendingPayments: Number(row?.pending_payments ?? 0),
        balance: Number(row?.balance ?? 0),
        lastPaymentDate: row?.last_payment_date ?? null,
      };
    },
    enabled: !!clientId && !!clinicId,
  });
}

export function useAllClientBalances() {
  const { clinicId } = useAuth();

  return useQuery({
    queryKey: ['all-client-balances', clinicId],
    queryFn: async () => {
      if (!clinicId) return [];

      const rows = await fetchAllRows((from, to) =>
        supabase
          .rpc('get_client_balances', { p_clinic_id: clinicId })
          .order('client_id')
          .range(from, to)
      );

      return rows.map((row) => ({
        clientId: row.client_id,
        totalPayments: Number(row.total_payments),
        pendingPayments: Number(row.pending_payments),
        balance: Number(row.balance),
      }));
    },
    enabled: !!clinicId,
  });
}
