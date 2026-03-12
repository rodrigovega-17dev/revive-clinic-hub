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

      // All completed appointments (charges for services delivered)
      const { data: completedAppointments, error: completedError } = await supabase
        .from('appointments')
        .select('id, payment_amount, payment_status')
        .eq('client_id', clientId)
        .eq('clinic_id', clinicId)
        .eq('status', 'completed');

      if (completedError) throw completedError;

      const pendingAppointments = completedAppointments?.filter(
        (a) => a.payment_status == null || a.payment_status === 'pending'
      ) || [];

      // Total charges: for each completed appointment, use amount actually paid (if any), else obligation (payment_amount).
      // This matches payments (which can include IVA) so balance doesn't show IVA as false credit.
      const totalCharges = (completedAppointments || []).reduce((sum, apt) => {
        const paidTowardApt = (payments || [])
          .filter((p) => p.appointment_id === apt.id)
          .reduce((s, p) => s + (p.method === 'balance' ? Math.abs(Number(p.amount || 0)) : Number(p.amount || 0)), 0);
        return sum + (paidTowardApt > 0 ? paidTowardApt : apt.payment_amount || 0);
      }, 0);
      // Money received (cash, card, etc.); balance payments are excluded (credit is applied, not new money)
      const totalPayments = payments?.reduce((sum, payment) => {
        if (payment.method === 'balance') return sum;
        return sum + (payment.amount || 0);
      }, 0) || 0;
      const pendingPayments = pendingAppointments.reduce((sum, apt) => sum + (apt.payment_amount || 0), 0);

      // Balance = money in − charges. totalCharges already includes amount paid via balance, so using credit reduces balance.
      const balance = totalPayments - totalCharges;
      
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

      // All completed appointments (for total charges per client)
      const { data: completedAppointments, error: completedError } = await supabase
        .from('appointments')
        .select('id, client_id, payment_amount, payment_status')
        .eq('clinic_id', clinicId)
        .eq('status', 'completed');

      if (completedError) throw completedError;

      // Calculate balances: totalCharges = per-apt amount paid (or payment_amount if unpaid)
      const clientBalances = clients?.map(client => {
        const clientPayments = payments?.filter(p => p.client_id === client.id) || [];
        const clientCompleted = completedAppointments?.filter(a => a.client_id === client.id) || [];
        const clientPending = clientCompleted.filter(
          (a) => a.payment_status == null || a.payment_status === 'pending'
        );

        const totalCharges = clientCompleted.reduce((sum, apt) => {
          const paidTowardApt = clientPayments
            .filter((p) => p.appointment_id === apt.id)
            .reduce((s, p) => s + (p.method === 'balance' ? Math.abs(Number(p.amount || 0)) : Number(p.amount || 0)), 0);
          return sum + (paidTowardApt > 0 ? paidTowardApt : apt.payment_amount || 0);
        }, 0);
        const totalPayments = clientPayments.reduce((sum, p) => {
          if (p.method === 'balance') return sum;
          return sum + (p.amount || 0);
        }, 0);
        const pendingPayments = clientPending.reduce((sum, a) => sum + (a.payment_amount || 0), 0);
        const balance = totalPayments - totalCharges;

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