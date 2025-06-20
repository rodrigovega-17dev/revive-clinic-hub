import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Download, RefreshCw, DollarSign } from 'lucide-react';
import ExpenseForm from '@/components/ExpenseForm';
import PaymentForm from '@/components/PaymentForm';
import DailyFinanceSection from '@/components/DailyFinanceSection';
import MonthlyFinanceSection from '@/components/MonthlyFinanceSection';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'react-router-dom';

const Finance = () => {
  const { t } = useTranslation();
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  // Set default date to 3 days ago to show sample payments
  const [selectedDate, setSelectedDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 3);
    return date;
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const handleSyncPayments = async () => {
    setIsSyncing(true);
    try {
      // Find appointments that are marked as paid but don't have payment records
      const { data: paidAppointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          id,
          client_id,
          payment_amount,
          payment_method,
          payment_date,
          treatments (name)
        `)
        .eq('payment_status', 'paid')
        .not('payment_amount', 'is', null);

      if (appointmentsError) throw appointmentsError;

      // Get existing payment records to avoid duplicates
      const { data: existingPayments, error: paymentsError } = await supabase
        .from('payments')
        .select('appointment_id')
        .not('appointment_id', 'is', null);

      if (paymentsError) throw paymentsError;

      const existingAppointmentIds = new Set(existingPayments?.map(p => p.appointment_id) || []);

      // Create payment records for appointments that don't have them
      const appointmentsToSync = paidAppointments?.filter(apt => !existingAppointmentIds.has(apt.id)) || [];

      if (appointmentsToSync.length === 0) {
        toast({
          title: t('finance.noSyncNeeded'),
          description: t('finance.allPaymentsSynced'),
        });
        return;
      }

      const paymentRecords = appointmentsToSync.map(apt => ({
        appointment_id: apt.id,
        client_id: apt.client_id,
        amount: apt.payment_amount,
        method: (apt.payment_method as 'cash' | 'card' | 'transfer' | 'insurance') || 'cash',
        payment_date: apt.payment_date || new Date().toISOString(),
        description: t('finance.paymentForSession', { treatment: apt.treatments?.name || 'appointment' }),
      }));

      const { error: insertError } = await supabase
        .from('payments')
        .insert(paymentRecords);

      if (insertError) throw insertError;

      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['daily-payments'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-payments'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });

      toast({
        title: t('finance.syncCompleted'),
        description: t('finance.paymentRecordsCreated', { count: appointmentsToSync.length }),
      });

    } catch (error) {
      console.error('Error syncing payments:', error);
      toast({
        title: t('finance.syncFailed'),
        description: t('finance.syncFailedDesc'),
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Check URL parameters to auto-open form
  useEffect(() => {
    if (searchParams.get('showExpenseForm') === 'true') {
      setShowExpenseForm(true);
      // Clean up the URL parameter
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('showExpenseForm');
      window.history.replaceState({}, '', newUrl.toString());
    }
    if (searchParams.get('showPaymentForm') === 'true') {
      setShowPaymentForm(true);
      // Clean up the URL parameter
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('showPaymentForm');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [searchParams]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('finance.title')}</h1>
          <p className="text-muted-foreground">{t('finance.trackFinance')}</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleSyncPayments} 
            variant="outline" 
            size="sm"
            disabled={isSyncing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? t('common.syncing') : t('finance.syncPayments')}
          </Button>
          <Button onClick={() => setShowPaymentForm(true)} variant="outline" size="sm">
            <DollarSign className="h-4 w-4 mr-2" />
            {t('finance.addPayment')}
          </Button>
          <Button onClick={() => setShowExpenseForm(true)} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {t('finance.addExpense')}
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            {t('common.export')}
          </Button>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <Tabs defaultValue="daily" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="daily">{t('finance.dailyFinance')}</TabsTrigger>
          <TabsTrigger value="monthly">{t('finance.monthlyFinance')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="daily" className="space-y-6">
          <DailyFinanceSection 
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />
        </TabsContent>
        
        <TabsContent value="monthly" className="space-y-6">
          <MonthlyFinanceSection />
        </TabsContent>
      </Tabs>

      {/* Expense Form Modal */}
      <ExpenseForm 
        open={showExpenseForm} 
        onClose={() => setShowExpenseForm(false)} 
      />

      {/* Payment Form Modal */}
      <PaymentForm 
        open={showPaymentForm} 
        onClose={() => setShowPaymentForm(false)} 
      />
    </div>
  );
};

export default Finance;
