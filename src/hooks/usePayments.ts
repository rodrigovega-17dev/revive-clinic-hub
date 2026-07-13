import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const invalidateFinanceQueries = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: ['daily-payments'] });
  queryClient.invalidateQueries({ queryKey: ['monthly-payments'] });
  queryClient.invalidateQueries({ queryKey: ['stats'] });
  queryClient.invalidateQueries({ queryKey: ['client-balance'] });
  queryClient.invalidateQueries({ queryKey: ['all-client-balances'] });
  queryClient.invalidateQueries({ queryKey: ['client-pending-appointments'] });
  queryClient.invalidateQueries({ queryKey: ['client-payments'] });
  queryClient.invalidateQueries({ queryKey: ['client-appointments-history'] });
  queryClient.invalidateQueries({ queryKey: ['payroll'] });
};

export interface StandalonePaymentUpdate {
  id: string;
  amount: number;
  description: string;
  client_id: string | null;
  method: string;
  payment_date: string;
}

/**
 * Update a standalone payment (one recorded directly from Finance, not tied to an
 * appointment). Appointment-tied payments have their own guarded revert flow
 * (useRevertPayment) — this refuses to touch a payment that has an appointment_id.
 */
export const useUpdateStandalonePayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: StandalonePaymentUpdate) => {
      const { data: existing, error: fetchError } = await supabase
        .from('payments')
        .select('appointment_id')
        .eq('id', id)
        .single();
      if (fetchError) throw fetchError;
      if (existing.appointment_id) {
        throw new Error('linked_to_appointment');
      }

      const { error } = await supabase.from('payments').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateFinanceQueries(queryClient),
  });
};

/** Delete a standalone payment (no appointment_id). See useUpdateStandalonePayment. */
export const useDeleteStandalonePayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: existing, error: fetchError } = await supabase
        .from('payments')
        .select('appointment_id')
        .eq('id', id)
        .single();
      if (fetchError) throw fetchError;
      if (existing.appointment_id) {
        throw new Error('linked_to_appointment');
      }

      const { error } = await supabase.from('payments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateFinanceQueries(queryClient),
  });
};

/**
 * Reverts a single payment: deletes the payment row, and if it was the appointment's
 * last remaining payment, resets the appointment back to unpaid/pending.
 *
 * Re-checks both guards server-side (defense in depth, in case the caller's cached data
 * is stale):
 *  - the payment must not already have a CFDI (invoice_state !== 'non_invoiced')
 *  - the appointment must not already be frozen into a paid-out payroll period
 *    (payroll_snapshot_at set)
 */
export const useRevertPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ paymentId, appointmentId }: { paymentId: string; appointmentId: string }) => {
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('id, invoice_state')
        .eq('id', paymentId)
        .single();
      if (paymentError) throw paymentError;
      if (payment.invoice_state !== 'non_invoiced') {
        throw new Error('already_invoiced');
      }

      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .select('id, payroll_snapshot_at')
        .eq('id', appointmentId)
        .single();
      if (appointmentError) throw appointmentError;
      if (appointment.payroll_snapshot_at) {
        throw new Error('payroll_frozen');
      }

      const { error: deleteError } = await supabase.from('payments').delete().eq('id', paymentId);
      if (deleteError) throw deleteError;

      const { data: remaining, error: remainingError } = await supabase
        .from('payments')
        .select('id')
        .eq('appointment_id', appointmentId);
      if (remainingError) throw remainingError;

      if (!remaining || remaining.length === 0) {
        const { error: updateError } = await supabase
          .from('appointments')
          .update({
            payment_status: 'pending',
            payment_method: null,
            payment_date: null,
            pay_therapist_in_full: false,
          })
          .eq('id', appointmentId);
        if (updateError) throw updateError;
      }

      return { appointmentId };
    },
    onSuccess: ({ appointmentId }) => {
      queryClient.invalidateQueries({ queryKey: ['daily-payments'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-payments'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['client-balance'] });
      queryClient.invalidateQueries({ queryKey: ['all-client-balances'] });
      queryClient.invalidateQueries({ queryKey: ['client-pending-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['client-payments'] });
      queryClient.invalidateQueries({ queryKey: ['client-appointments-history'] });
      queryClient.invalidateQueries({ queryKey: ['appointment-payments', appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
      queryClient.invalidateQueries({ queryKey: ['activity-log'] });
    },
  });
};
