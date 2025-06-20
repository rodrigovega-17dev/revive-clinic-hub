import { useState } from 'react';
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

interface ExpenseFormProps {
  open: boolean;
  onClose: () => void;
}

const ExpenseForm = ({ open, onClose }: ExpenseFormProps) => {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const expenseCategories = [
    { value: 'supplies', label: t('finance.supplies') },
    { value: 'office', label: t('finance.office') },
    { value: 'maintenance', label: t('finance.maintenance') },
    { value: 'utilities', label: t('finance.utilities') },
    { value: 'equipment', label: t('finance.equipment') },
    { value: 'marketing', label: t('finance.marketing') },
    { value: 'travel', label: t('finance.travel') },
    { value: 'food', label: t('finance.food') },
    { value: 'general', label: t('finance.general') }
  ];

  const createExpenseMutation = useMutation({
    mutationFn: async (expenseData: any) => {
      const { data, error } = await supabase
        .from('expenses')
        .insert([expenseData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['todays-expenses'] });
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
    
    if (!amount || !description || !category) {
      toast({
        title: t('common.error'),
        description: t('finance.fillRequiredFields'),
        variant: "destructive",
      });
      return;
    }

    createExpenseMutation.mutate({
      amount: parseFloat(amount),
      description,
      category,
      date,
    });
  };

  const handleClose = () => {
    setAmount('');
    setDescription('');
    setCategory('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('finance.addExpenseTitle')}</DialogTitle>
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
              disabled={createExpenseMutation.isPending}
            >
              {createExpenseMutation.isPending ? t('finance.adding') : t('finance.addExpense')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ExpenseForm;
