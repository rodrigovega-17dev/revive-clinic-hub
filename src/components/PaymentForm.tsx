import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClients } from '@/hooks/useClients';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useClinicSettings } from '@/hooks/useClinic';
import { Loader2, DollarSign, CreditCard, Banknote } from 'lucide-react';
import ClientSearchSelect from '@/components/ClientSearchSelect';
import { useUpdateStandalonePayment } from '@/hooks/usePayments';

/** A standalone payment (no appointment_id) being edited, as loaded from the finance tables. */
export interface EditablePayment {
  id: string;
  amount: number;
  description: string | null;
  client_id: string | null;
  method: string;
  payment_date: string;
}

interface PaymentFormProps {
  open: boolean;
  onClose: () => void;
  editingPayment?: EditablePayment | null;
}

export default function PaymentForm({ open, onClose, editingPayment }: PaymentFormProps) {
  const { t } = useTranslation();
  const { clinicId, user } = useAuth();
  const isEditing = !!editingPayment;
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState<string>('none');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'cheque' | 'insurance'>('cash');
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: clients } = useClients();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currency } = useClinicSettings();
  const updateStandalonePayment = useUpdateStandalonePayment();

  useEffect(() => {
    if (!open) return;
    if (editingPayment) {
      setAmount(String(editingPayment.amount));
      setDescription(editingPayment.description || '');
      setClientId(editingPayment.client_id || 'none');
      setPaymentMethod(editingPayment.method as any);
      setPaymentDate(format(new Date(editingPayment.payment_date), 'yyyy-MM-dd'));
    } else {
      setAmount('');
      setDescription('');
      setClientId('none');
      setPaymentMethod('cash');
      setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
    }
  }, [open, editingPayment]);

  // Clinic-aware currency formatting
  const formatCurrencyWithClinic = (value: number) => {
    return formatCurrency(value, 2, currency);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clinicId) {
      toast({
        title: t('common.error'),
        description: t('common.noClinicAccess'),
        variant: 'destructive',
      });
      return;
    }
    
    if (!amount || !description) {
      toast({
        title: t('finance.validationError'),
        description: t('finance.fillRequiredFields'),
        variant: 'destructive',
      });
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({
        title: t('finance.invalidAmount'),
        description: t('finance.enterValidAmount'),
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Combine the selected date with a time-of-day: the original payment's time when
      // editing (so just fixing the amount doesn't silently shift its timestamp), or now
      // when recording a new one.
      const d = new Date(paymentDate + 'T00:00:00');
      const timeSource = isEditing && editingPayment ? new Date(editingPayment.payment_date) : new Date();
      d.setHours(timeSource.getHours(), timeSource.getMinutes(), timeSource.getSeconds(), timeSource.getMilliseconds());

      if (isEditing && editingPayment) {
        await updateStandalonePayment.mutateAsync({
          id: editingPayment.id,
          amount: numAmount,
          description,
          client_id: clientId === 'none' ? null : clientId,
          method: paymentMethod,
          payment_date: d.toISOString(),
        });

        toast({
          title: t('finance.paymentUpdated'),
          description: t('finance.paymentUpdatedSuccess', { amount: formatCurrencyWithClinic(numAmount) }),
        });
      } else {
        const paymentData = {
          amount: numAmount,
          description,
          client_id: clientId === 'none' ? null : clientId,
          clinic_id: clinicId,
          method: paymentMethod,
          payment_date: d.toISOString(),
          received_by: user?.id || null,
        };

        const { error } = await supabase
          .from('payments')
          .insert(paymentData);

        if (error) throw error;

        toast({
          title: t('finance.paymentRecorded'),
          description: t('finance.paymentRecordedSuccess', { amount: formatCurrencyWithClinic(numAmount) }),
        });
      }

      onClose();

      // Invalidate client-scoped, finance, and payroll queries so ClientDetails / Finance / Payroll refresh
      queryClient.invalidateQueries({ queryKey: ['client-balance'] });
      queryClient.invalidateQueries({ queryKey: ['all-client-balances'] });
      queryClient.invalidateQueries({ queryKey: ['client-payments'] });
      queryClient.invalidateQueries({ queryKey: ['client-pending-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['client-appointments-history'] });
      queryClient.invalidateQueries({ queryKey: ['daily-payments'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-payments'] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    } catch (error) {
      console.error('Error recording payment:', error);
      toast({
        title: t('common.error'),
        description: t('finance.failedToRecordPayment'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? t('finance.editPaymentTitle') : t('finance.recordPaymentTitle')}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount */}
          <div className="space-y-2">
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

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t('finance.concept')} *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('finance.paymentDescription')}
              className="bg-input border-border text-foreground"
              required
            />
          </div>

          {/* Client (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="client">{t('finance.clientOptional')}</Label>
            <ClientSearchSelect
              value={clientId}
              onValueChange={setClientId}
              clients={clients || []}
              allowNone
              noneValue="none"
              noneLabel={t('finance.noClient')}
              placeholder={t('finance.selectClient')}
            />
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="method">{t('finance.paymentMethod')}</Label>
            <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
              <SelectTrigger className="bg-input border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">{t('finance.cash')}</SelectItem>
                <SelectItem value="card">{t('finance.card')}</SelectItem>
                <SelectItem value="transfer">{t('finance.transfer')}</SelectItem>
                <SelectItem value="cheque">{t('finance.cheque')}</SelectItem>
                <SelectItem value="insurance">{t('finance.insurance')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment Date */}
          <div className="space-y-2">
            <Label htmlFor="date">{t('finance.paymentDate')}</Label>
            <Input
              id="date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="bg-input border-border text-foreground"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('finance.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? (isEditing ? t('finance.saving') : t('finance.recording'))
                : (isEditing ? t('common.save') : t('finance.recordPayment'))}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 