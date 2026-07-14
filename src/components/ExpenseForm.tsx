import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DatePicker from '@/components/ui/date-picker';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useTherapists } from '@/hooks/useTherapists';
import TherapistOption from '@/components/TherapistOption';
import { useUpdateExpense, type ExpenseUpdate } from '@/hooks/useExpenses';

export interface EditableExpense {
  id: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  therapist_id: string | null;
  payment_method: string;
}

interface ExpenseFormProps {
  open: boolean;
  onClose: () => void;
  editingExpense?: EditableExpense | null;
}

const ExpenseForm = ({ open, onClose, editingExpense }: ExpenseFormProps) => {
  const { t } = useTranslation();
  const { clinicId, user } = useAuth();
  const isEditing = !!editingExpense;
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [therapistId, setTherapistId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const { data: therapists = [] } = useTherapists();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateExpense = useUpdateExpense();

  useEffect(() => {
    if (!open) return;
    if (editingExpense) {
      setAmount(String(editingExpense.amount));
      setDescription(editingExpense.description);
      setCategory(editingExpense.category);
      setDate(editingExpense.date);
      setTherapistId(editingExpense.therapist_id || '');
      setPaymentMethod(editingExpense.payment_method || 'cash');
    } else {
      setAmount('');
      setDescription('');
      setCategory('');
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setTherapistId('');
      setPaymentMethod('cash');
    }
  }, [open, editingExpense]);

  const expenseCategories = [
    { value: 'supplies', label: t('finance.supplies') },
    { value: 'office', label: t('finance.office') },
    { value: 'maintenance', label: t('finance.maintenance') },
    { value: 'utilities', label: t('finance.utilities') },
    { value: 'equipment', label: t('finance.equipment') },
    { value: 'marketing', label: t('finance.marketing') },
    { value: 'travel', label: t('finance.travel') },
    { value: 'food', label: t('finance.food') },
    { value: 'taxes', label: t('finance.taxes') },
    { value: 'payroll_contributions', label: t('finance.payrollContributions') },
    { value: 'professional_services', label: t('finance.professionalServices') },
    { value: 'general', label: t('finance.general') }
  ];

  const createExpenseMutation = useMutation({
    mutationFn: async (expenseData: any) => {
      if (!clinicId) throw new Error('No clinic ID available');
      
      const { data, error } = await supabase
        .from('expenses')
        .insert([{
          ...expenseData,
          clinic_id: clinicId,
          recorded_by: user?.id || null,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['daily-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['todays-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      
      toast({
        title: t('common.success'),
        description: t('finance.expenseAdded'),
      });
      handleClose();
    },
    onError: (error) => {
      console.error('Error creating expense:', error);
      toast({
        title: t('common.error'),
        description: t('finance.failedToAddExpense'),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clinicId) {
      toast({
        title: t('common.error'),
        description: t('common.noClinicAccess'),
        variant: 'destructive',
      });
      return;
    }
    
    if (!amount || !description || !category) {
      toast({
        title: t('common.error'),
        description: t('finance.fillRequiredFields'),
        variant: "destructive",
      });
      return;
    }

    if (isEditing && editingExpense) {
      const update: ExpenseUpdate = {
        id: editingExpense.id,
        amount: parseFloat(amount),
        description,
        category,
        date,
        therapist_id: therapistId || null,
        payment_method: paymentMethod,
      };
      updateExpense.mutate(update, {
        onSuccess: () => {
          toast({ title: t('common.success'), description: t('finance.expenseUpdated') });
          handleClose();
        },
        onError: (error) => {
          console.error('Error updating expense:', error);
          toast({
            title: t('common.error'),
            description: t('finance.failedToUpdateExpense'),
            variant: 'destructive',
          });
        },
      });
      return;
    }

    createExpenseMutation.mutate({
      amount: parseFloat(amount),
      description,
      category,
      date,
      therapist_id: therapistId || null,
      payment_method: paymentMethod,
    });
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? t('finance.editExpenseTitle') : t('finance.addExpenseTitle')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="amount">{t('finance.amount')} *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="bg-input border-border text-foreground"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">{t('finance.description')} *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('finance.describeExpense')}
              className="bg-input border-border text-foreground"
              required
            />
          </div>

          <div>
            <Label htmlFor="category">{t('finance.category')} *</Label>
            <Select value={category} onValueChange={setCategory} required>
              <SelectTrigger className="bg-input border-border text-foreground">
                <SelectValue placeholder={t('finance.selectCategory')} />
              </SelectTrigger>
              <SelectContent>
                {expenseCategories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="expense-payment-method">{t('finance.paymentMethod')} *</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod} required>
              <SelectTrigger id="expense-payment-method" className="bg-input border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">{t('finance.cash')}</SelectItem>
                <SelectItem value="card">{t('finance.card')}</SelectItem>
                <SelectItem value="transfer">{t('finance.transfer')}</SelectItem>
                <SelectItem value="cheque">{t('finance.cheque')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="expense-therapist">{t('finance.therapist')}</Label>
            <Select
              value={therapistId || '__none__'}
              onValueChange={(v) => setTherapistId(v === '__none__' ? '' : v)}
            >
              <SelectTrigger className="bg-input border-border text-foreground">
                <SelectValue placeholder={t('finance.noTherapist')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t('finance.noTherapist')}</SelectItem>
                {therapists.map((th) => (
                  <SelectItem key={th.id} value={th.id}>
                    <TherapistOption therapist={th} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DatePicker
            label={t('finance.date')}
            value={date}
            onChange={setDate}
            required
          />

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              {t('finance.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={createExpenseMutation.isPending || updateExpense.isPending}
            >
              {isEditing
                ? (updateExpense.isPending ? t('finance.saving') : t('common.save'))
                : (createExpenseMutation.isPending ? t('finance.adding') : t('finance.addExpense'))}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ExpenseForm;
