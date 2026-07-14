import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const invalidateExpenseQueries = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: ['expenses'] });
  queryClient.invalidateQueries({ queryKey: ['daily-expenses'] });
  queryClient.invalidateQueries({ queryKey: ['monthly-expenses'] });
  queryClient.invalidateQueries({ queryKey: ['todays-expenses'] });
  queryClient.invalidateQueries({ queryKey: ['stats'] });
  queryClient.invalidateQueries({ queryKey: ['payroll'] });
};

export interface ExpenseUpdate {
  id: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  therapist_id: string | null;
  payment_method: string;
}

export const useUpdateExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ExpenseUpdate) => {
      const { error } = await supabase.from('expenses').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateExpenseQueries(queryClient),
  });
};

export const useDeleteExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateExpenseQueries(queryClient),
  });
};
