import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface ClientBalance {
  totalPayments: number;
  pendingPayments: number;
  balance: number;
  lastPaymentDate: string | null;
}

export function useClientBalance(clientId: string | null) {
  const { clinicId } = useAuth();
  
  return useQuery({
    queryKey: ['client-balance', clientId, clinicId],
    queryFn: async (): Promise<ClientBalance> => {
      if (!clientId || !clinicId) {
        return {
          totalPayments: 0,
          pendingPayments: 0,
          balance: 0,
          lastPaymentDate: null,
        };
      }

      // Get all payments made by this client
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount, payment_date, appointment_id, method')
        .eq('client_id', clientId)
        .eq('clinic_id', clinicId);

      if (paymentsError) throw paymentsError;

      // Get pending payments from completed appointments that haven't been paid
      const { data: pendingAppointments, error: pendingError } = await supabase
        .from('appointments')
        .select('payment_amount, payment_status')
        .eq('client_id', clientId)
        .eq('clinic_id', clinicId)
        .eq('status', 'completed')
        .or('payment_status.is.null,payment_status.eq.pending');

      if (pendingError) throw pendingError;

      // Total payments = all real money received (exclude 'balance' = applying existing credit)
      const totalPayments = payments?.reduce((sum, payment) => {
        if (payment.method === 'balance') return sum;
        return sum + (payment.amount || 0);
      }, 0) || 0;
      const pendingPayments = pendingAppointments?.reduce((sum, apt) => sum + (apt.payment_amount || 0), 0) || 0;
      // Balance = total paid minus applied credit (balance payments); for now same as totalPayments
      const balance = totalPayments;
      
      const lastPaymentDate = payments && payments.length > 0 
        ? payments.reduce((latest, payment) => 
            payment.payment_date > latest ? payment.payment_date : latest, 
            payments[0].payment_date
          )
        : null;

      return {
        totalPayments,
        pendingPayments,
        balance,
        lastPaymentDate,
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

      // Get all clients
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, first_name, last_name')
        .eq('clinic_id', clinicId);

      if (clientsError) throw clientsError;

      // Get all payments
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('client_id, amount, payment_date, appointment_id, method')
        .eq('clinic_id', clinicId);

      if (paymentsError) throw paymentsError;

      // Get all completed appointments with pending payments
      const { data: pendingAppointments, error: pendingError } = await supabase
        .from('appointments')
        .select('client_id, payment_amount, payment_status')
        .eq('clinic_id', clinicId)
        .eq('status', 'completed')
        .or('payment_status.is.null,payment_status.eq.pending');

      if (pendingError) throw pendingError;

      // Calculate balances for each client
      const clientBalances = clients?.map(client => {
        const clientPayments = payments?.filter(p => p.client_id === client.id) || [];
        const clientPending = pendingAppointments?.filter(a => a.client_id === client.id) || [];
        
        const totalPayments = clientPayments.reduce((sum, p) => {
          if (p.method === 'balance') return sum;
          return sum + (p.amount || 0);
        }, 0);
        const pendingPayments = clientPending.reduce((sum, a) => sum + (a.payment_amount || 0), 0);
        const balance = totalPayments;

        return {
          clientId: client.id,
          clientName: `${client.first_name} ${client.last_name}`,
          totalPayments,
          pendingPayments,
          balance,
        };
      }) || [];

      return clientBalances;
    },
    enabled: !!clinicId,
  });
} 