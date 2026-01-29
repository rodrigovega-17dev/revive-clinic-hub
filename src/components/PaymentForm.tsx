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

interface PaymentFormProps {
  open: boolean;
  onClose: () => void;
}

export default function PaymentForm({ open, onClose }: PaymentFormProps) {
  const { t } = useTranslation();
  const { clinicId, user } = useAuth();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState<string>('none');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'insurance'>('cash');
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { data: clients } = useClients();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currency } = useClinicSettings();

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
      // Use selected date with current time (not 00:00) so Finance reflects actual recording time
      const d = new Date(paymentDate + 'T00:00:00');
      const now = new Date();
      d.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

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

      // Reset form
      setAmount('');
      setDescription('');
      setClientId('none');
      setPaymentMethod('cash');
      setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
      
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
          <DialogTitle>{t('finance.recordPaymentTitle')}</DialogTitle>
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
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="bg-input border-border text-foreground">
                <SelectValue placeholder={t('finance.selectClient')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('finance.noClient')}</SelectItem>
                {clients?.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.first_name} {client.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              {isSubmitting ? t('finance.recording') : t('finance.recordPayment')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 