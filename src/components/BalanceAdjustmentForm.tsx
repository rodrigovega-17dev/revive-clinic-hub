import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { useClinicSettings } from '@/hooks/useClinic';
import { Loader2 } from 'lucide-react';

interface BalanceAdjustmentFormProps {
  clientId: string;
  clientName: string;
  open: boolean;
  onClose: () => void;
}

export default function BalanceAdjustmentForm({ clientId, clientName, open, onClose }: BalanceAdjustmentFormProps) {
  const { t } = useTranslation();
  const { clinicId, user } = useAuth();
  const { currency } = useClinicSettings();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [adjustmentDate, setAdjustmentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatCurrencyWithClinic = (value: number) => formatCurrency(value, 2, currency);

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setAdjustmentDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clinicId) {
      toast({ title: t('common.error'), description: t('common.noClinicAccess'), variant: 'destructive' });
      return;
    }

    if (!amount || !description.trim()) {
      toast({ title: t('finance.validationError'), description: t('finance.fillRequiredFields'), variant: 'destructive' });
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({ title: t('finance.invalidAmount'), description: t('finance.enterValidAmount'), variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const d = new Date(adjustmentDate + 'T00:00:00');
      const now = new Date();
      d.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

      const paymentData: any = {
        // Always stored negative: this represents debt the client owes, not money received.
        amount: -Math.abs(numAmount),
        description,
        client_id: clientId,
        clinic_id: clinicId,
        method: 'adjustment',
        payment_date: d.toISOString(),
        received_by: user?.id || null,
        facturado: false,
        iva_amount: 0,
      };

      const { error } = await supabase.from('payments').insert(paymentData);
      if (error) throw error;

      toast({
        title: t('clients.priorBalanceRecorded'),
        description: t('clients.priorBalanceRecordedDesc', { amount: formatCurrencyWithClinic(numAmount), name: clientName }),
      });

      resetForm();
      onClose();

      queryClient.invalidateQueries({ queryKey: ['client-balance'] });
      queryClient.invalidateQueries({ queryKey: ['all-client-balances'] });
      queryClient.invalidateQueries({ queryKey: ['client-payments'] });
      queryClient.invalidateQueries({ queryKey: ['daily-payments'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-payments'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    } catch (error) {
      console.error('Error recording balance adjustment:', error);
      toast({ title: t('common.error'), description: t('clients.failedToRecordPriorBalance'), variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('clients.recordPriorBalanceTitle')}</DialogTitle>
          <DialogDescription>{t('clients.recordPriorBalanceDescription', { name: clientName })}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="adjustment-amount">{t('clients.priorBalanceAmount')} *</Label>
            <Input
              id="adjustment-amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adjustment-description">{t('clients.priorBalanceReason')} *</Label>
            <Textarea
              id="adjustment-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('clients.priorBalanceReasonPlaceholder')}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adjustment-date">{t('clients.priorBalanceDate')}</Label>
            <Input
              id="adjustment-date"
              type="date"
              value={adjustmentDate}
              onChange={(e) => setAdjustmentDate(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('clients.recordPriorBalance')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
