import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import TherapistOption from '@/components/TherapistOption';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useUpdateAppointment, useTherapistAvailability } from '@/hooks/useAppointments';
import { useClientBalance } from '@/hooks/useClientBalance';
import { useTherapists } from '@/hooks/useTherapists';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { Loader2, Calendar, User, Clock, DollarSign, CreditCard, CalendarDays, ExternalLink, AlertTriangle, CheckCircle, FileText, Upload, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/utils';
import { useClinicGoogleCalendar } from '@/hooks/useClinicGoogleCalendar';
import { useDeleteAppointment } from '@/hooks/useAppointments';
import { useLanguage } from '@/hooks/useLanguage';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useClinicSettings } from '@/hooks/useClinic';
import { useAuth } from '@/hooks/useAuth';
import PaymentForm from './PaymentForm';
import { facturapiService } from '@/integrations/facturapi/service';
import { useUpdateClient } from '@/hooks/useClients';
import { TAX_REGIMES, CFDI_USES, isValidRfcFormat } from '@/lib/cfdi-catalogs';
import { useClinicFacturapiConfig } from '@/hooks/useClinicFacturapiConfig';
import { CfdiUploadModal } from './CfdiUploadModal';
import { DocumentSection } from '@/components/DocumentSection';
import { openWhatsApp, formatPhoneForWhatsApp } from '@/lib/whatsapp';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface AppointmentDetailsProps {
  appointment: any;
  open: boolean;
  onClose: () => void;
}

const AppointmentDetails = ({ appointment, open, onClose }: AppointmentDetailsProps) => {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const locale = currentLanguage === 'es' ? es : enUS;
  const [activeTab, setActiveTab] = useState('details');
  const [displayAppointment, setDisplayAppointment] = useState<any>(null);
  const [paymentData, setPaymentData] = useState({
    amount: appointment?.payment_amount || 0,
    method: appointment?.payment_method || '',
  });
  const [useBalanceCredit, setUseBalanceCredit] = useState(false);
  const [balanceApplied, setBalanceApplied] = useState(0);
  const [requiereFactura, setRequiereFactura] = useState(false);
  const [rescheduleData, setRescheduleData] = useState({
    start_time: appointment ? format(new Date(appointment.start_time), "yyyy-MM-dd'T'HH:mm") : '',
    duration: appointment ? 
      Math.round((new Date(appointment.end_time).getTime() - new Date(appointment.start_time).getTime()) / 60000).toString() : 
      '60',
    therapist_id: appointment?.therapist_id || '',
  });
  
  // Extract date and time for availability check
  const [rescheduleDate, rescheduleTime] = rescheduleData.start_time.split('T');
  const rescheduleHour = rescheduleTime ? rescheduleTime.split(':')[0] : '';
  
  // Check for therapist availability when rescheduling
  const { data: availability, isLoading: checkingAvailability } = useTherapistAvailability(
    rescheduleData.therapist_id || appointment?.therapist_id,
    rescheduleDate,
    rescheduleHour,
    parseInt(rescheduleData.duration),
    appointment?.id, // Exclude the current appointment from conflict check
    t, // translation function
    locale === es ? 'es-ES' : 'en-US' // locale
  );
  
  const updateAppointment = useUpdateAppointment();
  const { data: therapists } = useTherapists();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated, syncAppointment } = useClinicGoogleCalendar();
  const deleteAppointmentMutation = useDeleteAppointment();
  const { currency, timezone } = useClinicSettings();
  const { clinicId } = useAuth();
  const { data: clientBalance } = useClientBalance(appointment?.client_id || null);
  const [requestingCfdi, setRequestingCfdi] = useState(false);
  const [showInlineFiscalForm, setShowInlineFiscalForm] = useState(false);
  const [showCfdiUploadModal, setShowCfdiUploadModal] = useState(false);
  const [inlineFiscalData, setInlineFiscalData] = useState({ rfc: '', tax_regime: '', cfdi_use: '', cfdi_email: '' });
  const updateClient = useUpdateClient();
  const { configured: facturapiConfigured } = useClinicFacturapiConfig();

  const apt = displayAppointment ?? appointment;
  const { data: appointmentPayments } = useQuery({
    queryKey: ['appointment-payments', appointment?.id, clinicId],
    queryFn: async () => {
      if (!clinicId || !appointment?.id) return [];
      const { data, error } = await supabase
        .from('payments')
        .select('id, amount, facturado, invoice_state')
        .eq('appointment_id', appointment.id)
        .eq('clinic_id', clinicId)
        .gte('amount', 0);
      if (error) throw error;
      return data || [];
    },
    enabled: !!appointment?.id && !!clinicId && apt?.payment_status === 'paid',
  });

  const cfdiEligiblePayments = (appointmentPayments || []).filter(
    (p) => p.invoice_state === 'non_invoiced'
  );

  const registeredAmount = (appointmentPayments || [])
    .filter((p) => p.amount > 0)
    .reduce((sum, p) => sum + Number(p.amount), 0);

  // Clinic-aware currency formatting
  const formatCurrencyWithClinic = (value: number) => {
    return formatCurrency(value, 2, currency);
  };

  const appointmentAmount = Number(apt?.payment_amount || 0);

  const formatClinicDate = (value: string | Date, options: Intl.DateTimeFormatOptions) => {
    const date = typeof value === 'string' ? new Date(value) : value;
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      ...options,
    }).format(date);
  };
  const availableCredit = Math.max(0, Number(clientBalance?.balance || 0));
  const maxApplicableCredit = Math.min(availableCredit, appointmentAmount);
  const appliedCredit = useBalanceCredit ? maxApplicableCredit : 0;
  const amountDue = Math.max(0, appointmentAmount - appliedCredit);
  const effectiveAmount = useBalanceCredit ? amountDue : paymentData.amount;
  // IVA (16%) only when the payment requires an invoice (factura); added on top of the base.
  const ivaAmount = requiereFactura ? effectiveAmount * 0.16 : 0;
  const totalWithIva = effectiveAmount + ivaAmount;

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled': return t('appointments.scheduled');
      case 'confirmed': return t('appointments.confirmed');
      case 'in_progress': return t('appointments.inProgress');
      case 'completed': return t('appointments.completed');
      case 'cancelled': return t('appointments.cancelled');
      case 'no_show': return t('appointments.noShow');
      default: return status;
    }
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'paid': return t('appointments.paid');
      case 'pending': return t('appointments.pending');
      case 'overdue': return t('appointments.overdue');
      default: return t('appointments.pending');
    }
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'cash': return t('appointments.cash');
      case 'card': return t('appointments.card');
      case 'transfer': return t('appointments.transfer');
      case 'insurance': return t('appointments.insurance');
      case 'balance': return t('appointments.balance');
      default: return method;
    }
  };

  const handleMarkAsPaid = async () => {
    if (amountDue > 0 && !paymentData.method) {
      toast({
        title: t('appointments.error'),
        description: t('appointments.pleaseSelectPaymentMethod'),
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data } = await updateAppointment.mutateAsync({
        id: appointment.id,
        payment_status: 'paid',
        payment_method: amountDue > 0 ? paymentData.method : 'balance',
        payment_date: new Date().toISOString(),
      });
      setDisplayAppointment(data);

      let paymentError = null;
      const paymentDate = new Date().toISOString();
      const paymentInserts: any[] = [];

      // Store credit applied as positive amount; method='balance' marks it as non-cash so it's excluded from revenue
      if (useBalanceCredit && appliedCredit > 0) {
        paymentInserts.push({
          appointment_id: appointment.id,
          client_id: appointment.client_id,
          clinic_id: clinicId,
          amount: Math.abs(appliedCredit),
          method: 'balance',
          payment_date: paymentDate,
          description: `Balance applied to ${appointment.treatments?.name || 'appointment'} session`,
          facturado: false,
          iva_amount: 0,
        });
      }

      if (amountDue > 0) {
        paymentInserts.push({
          appointment_id: appointment.id,
          client_id: appointment.client_id,
          clinic_id: clinicId,
          amount: totalWithIva,
          method: paymentData.method,
          payment_date: paymentDate,
          description: `Payment for ${appointment.treatments?.name || 'appointment'} session${requiereFactura ? ' (IVA 16%)' : ''}`,
          facturado: requiereFactura,
          iva_amount: ivaAmount,
        });
      }

      if (paymentInserts.length > 0) {
        const { error } = await supabase
          .from('payments')
          .insert(paymentInserts);
        paymentError = error;
      }

      if (paymentError) {
        console.error('Error creating payment record:', paymentError);
        // Don't throw error here as appointment was already updated
        toast({
          title: t('appointments.warning'),
          description: t('appointments.paymentRecordedWarning'),
          variant: 'destructive',
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ['daily-payments'] });
        queryClient.invalidateQueries({ queryKey: ['monthly-payments'] });
        queryClient.invalidateQueries({ queryKey: ['stats'] });
        queryClient.invalidateQueries({ queryKey: ['client-balance'] });
        queryClient.invalidateQueries({ queryKey: ['all-client-balances'] });
        queryClient.invalidateQueries({ queryKey: ['client-pending-appointments'] });
        queryClient.invalidateQueries({ queryKey: ['client-payments', appointment.client_id, clinicId] });
        queryClient.invalidateQueries({ queryKey: ['client-appointments-history', appointment.client_id, clinicId] });
        queryClient.invalidateQueries({ queryKey: ['appointment-payments', appointment.id, clinicId] });
        queryClient.invalidateQueries({ queryKey: ['payroll'] });
        toast({
          title: t('appointments.success'),
          description: t('appointments.paymentRecorded'),
        });
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      toast({
        title: t('appointments.error'),
        description: t('appointments.failedToRecordPayment'),
        variant: 'destructive',
      });
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleData.start_time) {
      toast({
        title: t('appointments.error'),
        description: t('appointments.pleaseSelectNewDateTime'),
        variant: 'destructive',
      });
      return;
    }

    // Check for conflicts before submitting
    if (availability?.hasConflict) {
      toast({
        title: t('appointments.error'),
        description: t('appointments.conflictDetected'),
        variant: "destructive",
      });
      return;
    }

    try {
      const startTime = new Date(rescheduleData.start_time);
      const durationMinutes = parseInt(rescheduleData.duration);
      const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

      await updateAppointment.mutateAsync({
        id: appointment.id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        therapist_id: rescheduleData.therapist_id || appointment.therapist_id,
      });

      toast({
        title: t('appointments.success'),
        description: t('appointments.appointmentRescheduled'),
      });
      
      onClose();
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      toast({
        title: t('appointments.error'),
        description: t('appointments.failedToReschedule'),
        variant: 'destructive',
      });
    }
  };

  const handleCancelAppointment = async () => {
    try {
      await updateAppointment.mutateAsync({
        id: appointment.id,
        status: 'cancelled',
      });

      toast({
        title: t('appointments.success'),
        description: t('appointments.appointmentCancelled'),
      });
      
      onClose();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast({
        title: t('appointments.error'),
        description: t('appointments.failedToCancel'),
        variant: 'destructive',
      });
    }
  };

  const handleMarkInProgress = async () => {
    try {
      const { data } = await updateAppointment.mutateAsync({
        id: appointment.id,
        status: 'in_progress',
      });
      setDisplayAppointment(data);
      toast({
        title: t('appointments.success'),
        description: t('appointments.appointmentInProgress'),
      });
    } catch (error) {
      console.error('Error marking appointment in progress:', error);
      toast({
        title: t('appointments.error'),
        description: t('appointments.failedToUpdate'),
        variant: 'destructive',
      });
    }
  };

  const handleMarkAsCompleted = async () => {
    try {
      const { data } = await updateAppointment.mutateAsync({
        id: appointment.id,
        status: 'completed',
      });
      setDisplayAppointment(data);

      toast({
        title: t('appointments.success'),
        description: t('appointments.appointmentCompleted'),
      });

      queryClient.invalidateQueries({ queryKey: ['client-balance'] });
      queryClient.invalidateQueries({ queryKey: ['all-client-balances'] });
      queryClient.invalidateQueries({ queryKey: ['client-pending-appointments'] });
      if (appointment?.client_id && clinicId) {
        queryClient.invalidateQueries({ queryKey: ['client-appointments-history', appointment.client_id, clinicId] });
      }
      queryClient.invalidateQueries({ queryKey: ['payroll'] });

      setActiveTab('payment');
    } catch (error) {
      console.error('Error marking appointment as completed:', error);
      toast({
        title: t('appointments.error'),
        description: t('appointments.failedToComplete'),
        variant: 'destructive',
      });
    }
  };

  const handleManualSync = async () => {
    try {
      await syncAppointment({ 
        appointment,
        options: {
          sendInvites: true,
          reminderMinutes: 15,
        }
      });
      
      toast({
        title: t('appointments.success'),
        description: t('appointments.syncedToGoogleCalendar'),
      });
    } catch (error) {
      console.error('Manual sync failed:', error);
      toast({
        title: t('appointments.error'),
        description: t('appointments.failedToSync'),
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAppointment = async () => {
    try {
      await deleteAppointmentMutation.mutateAsync(appointment);

      toast({
        title: t('appointments.success'),
        description: t('appointments.appointmentDeleted'),
      });
      
      onClose();
    } catch (error) {
      console.error('Error deleting appointment:', error);
      toast({
        title: t('appointments.error'),
        description: t('appointments.failedToDelete'),
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (!appointment) return;
    const keeping = displayAppointment?.id === appointment.id;
    // Always use latest appointment from parent so sync status (e.g. google_calendar_event_id) updates without reload
    setDisplayAppointment(appointment);
    setPaymentData({
      amount: appointment.payment_amount || 0,
      method: appointment.payment_method || '',
    });
    setUseBalanceCredit(false);
    setBalanceApplied(0);
    if (!keeping) {
      if (appointment.status === 'completed' && appointment.payment_status !== 'paid') {
        setActiveTab('payment');
      } else {
        setActiveTab('details');
      }
    }
  }, [appointment?.id, appointment, displayAppointment?.id]);

  useEffect(() => {
    if (!useBalanceCredit) return;
    setBalanceApplied(maxApplicableCredit);
  }, [useBalanceCredit, maxApplicableCredit]);

  const handleRequestCfdi = async () => {
    if (!clinicId || !appointment?.client_id || !cfdiEligiblePayments.length) return;
    setRequestingCfdi(true);
    setShowInlineFiscalForm(false);
    try {
      const { data: client } = await supabase
        .from('clients')
        .select('id, rfc, tax_regime, cfdi_use, cfdi_email, email')
        .eq('id', appointment.client_id)
        .eq('clinic_id', clinicId)
        .single();
      const hasRfc = !!(client?.rfc?.trim());
      const hasRegime = !!(client?.tax_regime?.trim());
      const hasUse = !!(client?.cfdi_use?.trim());
      const email = (client?.cfdi_email || client?.email || '').trim();
      const hasEmail = !!email;
      if (!hasRfc || !hasRegime || !hasUse || !hasEmail) {
        setInlineFiscalData({
          rfc: client?.rfc || '',
          tax_regime: client?.tax_regime || '',
          cfdi_use: client?.cfdi_use || '',
          cfdi_email: client?.cfdi_email || client?.email || '',
        });
        setShowInlineFiscalForm(true);
        return;
      }
      const result = await facturapiService.issueIndividualInvoice({
        clinicId,
        clientId: appointment.client_id,
        paymentIds: cfdiEligiblePayments.map((p) => p.id),
      });
      queryClient.invalidateQueries({ queryKey: ['appointment-payments', appointment.id, clinicId] });
      queryClient.invalidateQueries({ queryKey: ['client-payments', appointment.client_id, clinicId] });
      queryClient.invalidateQueries({ queryKey: ['client-cfdi-invoices', appointment.client_id, clinicId] });
      toast({ title: t('common.success'), description: t('cfdi.requestCfdiSuccess') });
      if (result.pdf_url) window.open(result.pdf_url, '_blank');
    } catch (e) {
      toast({
        title: t('common.error'),
        description: (e as Error).message || 'Failed to issue CFDI',
        variant: 'destructive',
      });
    } finally {
      setRequestingCfdi(false);
    }
  };

  const handleSaveInlineFiscal = async () => {
    const rfc = inlineFiscalData.rfc.trim() || null;
    if (rfc && !isValidRfcFormat(rfc)) {
      toast({ title: t('common.validationError'), description: t('clients.invalidRfc'), variant: 'destructive' });
      return;
    }
    const cfdiEmail = inlineFiscalData.cfdi_email.trim() || null;
    if (rfc && !cfdiEmail) {
      toast({ title: t('common.validationError'), description: t('clients.emailRequiredForRfc'), variant: 'destructive' });
      return;
    }
    if (!rfc || !inlineFiscalData.tax_regime.trim() || !inlineFiscalData.cfdi_use.trim()) {
      toast({ title: t('common.validationError'), description: t('cfdi.clientMissingTaxInfo'), variant: 'destructive' });
      return;
    }
    try {
      await updateClient.mutateAsync({
        id: appointment.client_id,
        rfc: rfc || undefined,
        tax_regime: inlineFiscalData.tax_regime.trim() || undefined,
        cfdi_use: inlineFiscalData.cfdi_use.trim() || undefined,
        cfdi_email: cfdiEmail || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setShowInlineFiscalForm(false);
      toast({ title: t('common.success'), description: t('common.updatedSuccessfully', { item: t('clients.title').toLowerCase() }) });
    } catch {
      toast({ title: t('common.error'), description: t('common.failedToUpdate', { item: t('clients.title').toLowerCase() }), variant: 'destructive' });
    }
  };

  if (!appointment) return null;

  return (
    <>
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">{t('appointments.appointmentDetails')}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t('appointments.manageAppointmentStatus')}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">{t('appointments.details')}</TabsTrigger>
            <TabsTrigger value="payment">{t('appointments.payment')}</TabsTrigger>
            <TabsTrigger value="reschedule">{t('appointments.reschedule')}</TabsTrigger>
            <TabsTrigger value="documents">{t('documents.tabTitle', 'Documentos')}</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <Card className="bg-muted/20 border-border">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">{t('appointments.appointmentInformation')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">
                      {apt.clients?.first_name} {apt.clients?.last_name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">
                      {formatClinicDate(apt.start_time, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">
                      {formatClinicDate(apt.start_time, { hour: 'numeric', minute: '2-digit' })}{' '}
                      -{' '}
                      {formatClinicDate(apt.end_time, { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">
                      {formatCurrencyWithClinic(apt.payment_amount || 0)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">
                      {t('appointments.therapist')}: {apt.therapists?.first_name} {apt.therapists?.last_name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">
                      {t('appointments.treatment')}: {apt.treatments?.name}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-muted-foreground">{t('appointments.status')}:</span>
                    <Badge variant={apt.status === 'completed' ? 'default' : 
                                   apt.status === 'cancelled' ? 'destructive' : 'secondary'}>
                      {getStatusText(apt.status)}
                    </Badge>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-muted-foreground">{t('appointments.payment')}:</span>
                    <Badge variant={apt.payment_status === 'paid' ? 'default' : 'secondary'}>
                      {getPaymentStatusText(apt.payment_status || 'pending')}
                    </Badge>
                  </div>
                </div>

                {/* Google Calendar Sync Status */}
                {isAuthenticated && (
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {apt.google_calendar_event_id ? (
                          <span className="flex items-center space-x-1">
                            <span className="text-primary">✓</span>
                            <span>{t('appointments.syncedWithGoogleCalendar')}</span>
                            <ExternalLink className="h-3 w-3" />
                          </span>
                        ) : (
                          <span className="text-destructive">{t('appointments.notSyncedWithGoogleCalendar')}</span>
                        )}
                      </span>
                    </div>
                    
                    {/* Sync button: hidden for cancelled appointments - they cannot be re-synced */}
                    {!apt.google_calendar_event_id && apt.status !== 'cancelled' && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={handleManualSync}
                        className="text-xs"
                      >
                        <Calendar className="h-3 w-3 mr-1" />
                        {t('appointments.syncToGoogleCalendar')}
                      </Button>
                    )}
                  </div>
                )}

                {apt.notes && (
                  <div className="pt-4 border-t border-border">
                    <h4 className="font-medium text-foreground mb-2">{t('appointments.notes')}</h4>
                    <p className="text-muted-foreground">{apt.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between space-x-3">
              <div className="flex items-center gap-2">
                {apt.status === 'cancelled' ? (
                  <Button 
                    variant="destructive" 
                    onClick={handleDeleteAppointment}
                    disabled={updateAppointment.isPending}
                  >
                    {t('appointments.deleteAppointment')}
                  </Button>
                ) : apt.status === 'completed' ? (
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-green-600 font-medium">{t('appointments.completed')}</span>
                  </div>
                ) : (
                  <div className="flex space-x-2">
                    {apt.status !== 'in_progress' && (
                      <Button
                        variant="secondary"
                        onClick={handleMarkInProgress}
                        disabled={updateAppointment.isPending}
                      >
                        {t('appointments.markInProgress')}
                      </Button>
                    )}
                    <Button
                      variant="default"
                      onClick={handleMarkAsCompleted}
                      disabled={updateAppointment.isPending}
                    >
                      {updateAppointment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <CheckCircle className="mr-2 h-4 w-4" />
                      {t('appointments.markAsCompleted')}
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={handleCancelAppointment}
                      disabled={updateAppointment.isPending}
                    >
                      {t('appointments.cancelAppointment')}
                    </Button>
                  </div>
                )}
                {formatPhoneForWhatsApp(apt.clients?.phone || '') && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700 dark:border-green-800 dark:hover:bg-green-950/50">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        {t('whatsapp.send')}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {/* Confirmation: for scheduled, completed, or no_show */}
                      {(apt.status === 'scheduled' || apt.status === 'completed' || apt.status === 'no_show') && (
                        <DropdownMenuItem
                          onClick={() => {
                            const msg = t('whatsapp.messageConfirmation', {
                              name: `${apt.clients?.first_name || ''} ${apt.clients?.last_name || ''}`.trim(),
                              date: formatClinicDate(apt.start_time, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              }),
                              time: formatClinicDate(apt.start_time, {
                                hour: 'numeric',
                                minute: '2-digit',
                              }),
                              therapist: `${apt.therapists?.first_name || ''} ${apt.therapists?.last_name || ''}`.trim(),
                              treatment: apt.treatments?.name || '',
                            });
                            openWhatsApp(apt.clients?.phone || '', msg);
                          }}
                        >
                          {t('whatsapp.confirmation')}
                        </DropdownMenuItem>
                      )}
                      {/* Reschedule: only for scheduled (not cancelled/completed) */}
                      {apt.status === 'scheduled' && (
                        <DropdownMenuItem
                          onClick={() => {
                            const msg = t('whatsapp.messageReschedule', {
                              name: `${apt.clients?.first_name || ''} ${apt.clients?.last_name || ''}`.trim(),
                              date: formatClinicDate(apt.start_time, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              }),
                              time: formatClinicDate(apt.start_time, {
                                hour: 'numeric',
                                minute: '2-digit',
                              }),
                              therapist: `${apt.therapists?.first_name || ''} ${apt.therapists?.last_name || ''}`.trim(),
                            });
                            openWhatsApp(apt.clients?.phone || '', msg);
                          }}
                        >
                          {t('whatsapp.reschedule')}
                        </DropdownMenuItem>
                      )}
                      {/* Cancellation: only for scheduled or cancelled (send cancellation notice) */}
                      {(apt.status === 'scheduled' || apt.status === 'cancelled') && (
                        <DropdownMenuItem
                          onClick={() => {
                            const msg = t('whatsapp.messageCancellation', {
                              name: `${apt.clients?.first_name || ''} ${apt.clients?.last_name || ''}`.trim(),
                              date: formatClinicDate(apt.start_time, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              }),
                              time: formatClinicDate(apt.start_time, {
                                hour: 'numeric',
                                minute: '2-digit',
                              }),
                            });
                            openWhatsApp(apt.clients?.phone || '', msg);
                          }}
                        >
                          {t('whatsapp.cancellation')}
                        </DropdownMenuItem>
                      )}
                      {/* Reminder: only for scheduled (upcoming appointment) */}
                      {apt.status === 'scheduled' && (
                        <DropdownMenuItem
                          onClick={() => {
                            const msg = t('whatsapp.messageReminder', {
                              name: `${apt.clients?.first_name || ''} ${apt.clients?.last_name || ''}`.trim(),
                              date: formatClinicDate(apt.start_time, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              }),
                              time: formatClinicDate(apt.start_time, {
                                hour: 'numeric',
                                minute: '2-digit',
                              }),
                              therapist: `${apt.therapists?.first_name || ''} ${apt.therapists?.last_name || ''}`.trim(),
                            });
                            openWhatsApp(apt.clients?.phone || '', msg);
                          }}
                        >
                          {t('whatsapp.reminder')}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                {!formatPhoneForWhatsApp(apt.clients?.phone || '') && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" disabled className="opacity-50">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        {t('whatsapp.send')}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('whatsapp.noPhone')}</TooltipContent>
                  </Tooltip>
                )}
              </div>
              
              <Button variant="outline" onClick={onClose}>
                {t('appointments.close')}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="payment" className="space-y-4">
            {apt.payment_status !== 'paid' && apt.status !== 'cancelled' ? (
              <Card className="bg-muted/20 border-border">
                <CardHeader>
                  <CardTitle className="text-lg text-foreground">{t('appointments.recordPayment')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{t('appointments.currentBalance')}</span>
                      <span className={`font-semibold ${clientBalance?.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {clientBalance?.balance >= 0 ? '+' : ''}
                        {formatCurrencyWithClinic(Number(clientBalance?.balance || 0))}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{t('appointments.balanceDescription')}</p>
                    {availableCredit > 0 && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="useBalance"
                            checked={useBalanceCredit}
                            onCheckedChange={(checked) => {
                              const enabled = checked === true;
                              setUseBalanceCredit(enabled);
                              setBalanceApplied(enabled ? maxApplicableCredit : 0);
                            }}
                          />
                          <Label htmlFor="useBalance" className="text-foreground">
                            {t('appointments.useBalance')}
                          </Label>
                        </div>
                        {useBalanceCredit && (
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label className="text-foreground">
                                {t('appointments.balanceApplied')}
                              </Label>
                              <div className="rounded-md border border-border bg-background px-3 py-2 text-foreground">
                                {formatCurrencyWithClinic(appliedCredit)}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-foreground">{t('appointments.amountDue')}</Label>
                              <div className="rounded-md border border-border bg-background px-3 py-2 text-foreground">
                                {formatCurrencyWithClinic(amountDue)}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount" className="text-foreground">{t('appointments.amount')}</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={useBalanceCredit ? amountDue : paymentData.amount}
                        onChange={(e) => setPaymentData(prev => ({ ...prev, amount: parseFloat(e.target.value) }))}
                        disabled={useBalanceCredit}
                        className="bg-input border-border text-foreground"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="method" className="text-foreground">{t('appointments.paymentMethod')}</Label>
                      <Select value={paymentData.method} onValueChange={(value) => 
                        setPaymentData(prev => ({ ...prev, method: value }))
                      }>
                        <SelectTrigger className="bg-input border-border text-foreground">
                          <SelectValue placeholder={t('appointments.selectMethod')} />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                          <SelectItem value="cash" className="text-foreground">{t('appointments.cash')}</SelectItem>
                          <SelectItem value="card" className="text-foreground">{t('appointments.card')}</SelectItem>
                          <SelectItem value="transfer" className="text-foreground">{t('appointments.transfer')}</SelectItem>
                          <SelectItem value="insurance" className="text-foreground">{t('appointments.insurance')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="requiereFactura"
                      checked={requiereFactura}
                      onCheckedChange={(checked) => setRequiereFactura(checked === true)}
                    />
                    <Label htmlFor="requiereFactura" className="text-foreground">
                      {t('appointments.requiereFactura')}
                    </Label>
                  </div>

                  <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-foreground">{t('appointments.baseAmount')}:</span>
                      <span className="text-foreground">{formatCurrencyWithClinic(effectiveAmount)}</span>
                    </div>
                    {requiereFactura && (
                      <div className="flex justify-between">
                        <span className="text-foreground">{t('appointments.ivaAmount')}:</span>
                        <span className="text-foreground">{formatCurrencyWithClinic(ivaAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span className="text-foreground">{t('appointments.total')}:</span>
                      <span className="text-foreground">{formatCurrencyWithClinic(totalWithIva)}</span>
                    </div>
                  </div>

                  <Button 
                    onClick={handleMarkAsPaid} 
                    disabled={updateAppointment.isPending}
                    className="w-full"
                  >
                    {updateAppointment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <CreditCard className="mr-2 h-4 w-4" />
                    {t('appointments.markAsPaid')} ({formatCurrencyWithClinic(totalWithIva)})
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-muted/20 border-border">
                <CardContent className="pt-6 text-center">
                  <div className="text-lg font-medium text-foreground mb-2">
                    {apt.payment_status === 'paid'
                      ? `${t('appointments.paymentCompleted')}${registeredAmount > 0 ? ` · ${formatCurrencyWithClinic(registeredAmount)}` : ''}`
                      : t('appointments.paymentNotAvailable')}
                  </div>
                  <div className="text-muted-foreground mb-4">
                    {apt.payment_status === 'paid'
                      ? `${t('appointments.paidVia')} ${getPaymentMethodText(apt.payment_method)} ${t('appointments.on')} ${formatClinicDate(apt.payment_date, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}`
                      : t('appointments.paymentCannotBeProcessed')
                    }
                  </div>
                  
                  {apt.payment_status === 'paid' && apt.status !== 'completed' && (
                    <Button 
                      variant="default"
                      onClick={handleMarkAsCompleted} 
                      disabled={updateAppointment.isPending}
                      className="w-full"
                    >
                      {updateAppointment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <CheckCircle className="mr-2 h-4 w-4" />
                      {t('appointments.markAsCompleted')}
                    </Button>
                  )}
                  {apt.payment_status === 'paid' && apt.status === 'completed' && cfdiEligiblePayments.length > 0 && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => setShowCfdiUploadModal(true)}
                        className="w-full mt-2"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {t('cfdi.uploadCfdi')}
                      </Button>
                      {facturapiConfigured ? (
                        <Button
                          variant="outline"
                          onClick={handleRequestCfdi}
                          disabled={requestingCfdi}
                          className="w-full mt-2"
                        >
                          {requestingCfdi && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          <FileText className="mr-2 h-4 w-4" />
                          {t('cfdi.requestCfdi')}
                        </Button>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-2">{t('cfdi.generateRequiresFacturapi')}</p>
                      )}
                    </>
                  )}
                  {showInlineFiscalForm && (
                    <div className="mt-4 p-4 border border-border rounded-lg space-y-4 text-left">
                      <h4 className="text-sm font-medium text-foreground">{t('cfdi.addFiscalDataForCfdi')}</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-foreground">{t('clients.rfc')}</Label>
                          <Input
                            value={inlineFiscalData.rfc}
                            onChange={(e) => setInlineFiscalData((p) => ({ ...p, rfc: e.target.value.toUpperCase() }))}
                            placeholder="XAXX010101000"
                            className="uppercase"
                            maxLength={13}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-foreground">{t('clients.cfdiEmail')}</Label>
                          <Input
                            type="email"
                            value={inlineFiscalData.cfdi_email}
                            onChange={(e) => setInlineFiscalData((p) => ({ ...p, cfdi_email: e.target.value }))}
                            placeholder={t('common.enterEmail')}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-foreground">{t('clients.taxRegime')}</Label>
                          <Select value={inlineFiscalData.tax_regime} onValueChange={(v) => setInlineFiscalData((p) => ({ ...p, tax_regime: v }))}>
                            <SelectTrigger className="bg-input border-border text-foreground">
                              <SelectValue placeholder={t('common.optional')} />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border-border">
                              {TAX_REGIMES.map((r) => (
                                <SelectItem key={r.value} value={r.value} className="text-foreground">{t(r.labelKey)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-foreground">{t('clients.cfdiUse')}</Label>
                          <Select value={inlineFiscalData.cfdi_use} onValueChange={(v) => setInlineFiscalData((p) => ({ ...p, cfdi_use: v }))}>
                            <SelectTrigger className="bg-input border-border text-foreground">
                              <SelectValue placeholder={t('common.optional')} />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border-border">
                              {CFDI_USES.map((u) => (
                                <SelectItem key={u.value} value={u.value} className="text-foreground">{t(u.labelKey)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => setShowInlineFiscalForm(false)}>
                          {t('common.cancel')}
                        </Button>
                        <Button size="sm" onClick={handleSaveInlineFiscal} disabled={updateClient.isPending}>
                          {updateClient.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {t('common.save')}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="reschedule" className="space-y-4">
            {apt.status !== 'cancelled' && apt.status !== 'completed' && apt.status !== 'in_progress' ? (
              <Card className="bg-muted/20 border-border">
                <CardHeader>
                  <CardTitle className="text-lg text-foreground">{t('appointments.rescheduleAppointment')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="new_datetime" className="text-foreground">{t('appointments.newDateTime')}</Label>
                      <Input
                        id="new_datetime"
                        type="datetime-local"
                        value={rescheduleData.start_time}
                        onChange={(e) => setRescheduleData(prev => ({ ...prev, start_time: e.target.value }))}
                        className="bg-input border-border text-foreground"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="duration" className="text-foreground">{t('appointments.duration')}</Label>
                      <Select value={rescheduleData.duration} onValueChange={(value) => 
                        setRescheduleData(prev => ({ ...prev, duration: value }))
                      }>
                        <SelectTrigger className="bg-input border-border text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                          <SelectItem value="60" className="text-foreground">60 {t('appointments.minutes')}</SelectItem>
                          <SelectItem value="120" className="text-foreground">120 {t('appointments.minutes')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="therapist" className="text-foreground">{t('appointments.therapist')}</Label>
                      <Select value={rescheduleData.therapist_id} onValueChange={(value) => 
                        setRescheduleData(prev => ({ ...prev, therapist_id: value }))
                      }>
                        <SelectTrigger className="bg-input border-border text-foreground">
                          <SelectValue placeholder={t('appointments.selectTherapist')} />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                          {therapists?.map((therapist) => (
                            <SelectItem key={therapist.id} value={therapist.id}>
                              <TherapistOption therapist={therapist} />
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Availability Check Indicator */}
                  {rescheduleDate && rescheduleHour && checkingAvailability && (
                    <Alert className="mb-4">
                      <Clock className="h-4 w-4" />
                      <AlertDescription>
                        {t('appointments.checkingAvailability')}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Conflict Warning */}
                  {availability?.hasConflict && (
                    <div className="space-y-3">
                      <Alert className="border-destructive/20 bg-destructive/5">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        <AlertDescription className="text-destructive/80">
                          {t('appointments.therapistUnavailable')}
                        </AlertDescription>
                      </Alert>
                      
                      <div className="space-y-2 text-sm">
                        <p className="font-medium text-destructive/80">{t('appointments.conflictingAppointments')}:</p>
                        {availability.conflicts.map((conflict: any) => (
                          <div key={conflict.id} className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-destructive/70" />
                            <span className="text-foreground">
                              {format(new Date(conflict.start_time), 'h:mm a', { locale })} - {format(new Date(conflict.end_time), 'h:mm a', { locale })}
                            </span>
                            <span className="text-muted-foreground">
                              ({conflict.clients?.first_name} {conflict.clients?.last_name})
                            </span>
                          </div>
                        ))}
                      </div>
                      
                      {availability.availableSlots.length > 0 && (
                        <div className="space-y-2">
                          <p className="font-medium text-destructive/80">
                            {t('appointments.alternativeTimes')} ({availability.availableSlots.length} {t('appointments.available')})
                          </p>
                          
                          {/* Show next available time prominently */}
                          {availability.availableSlots[0] && (
                            <div className="mb-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                              <p className="text-primary/80 text-sm font-medium mb-1">
                                {t('appointments.nextAvailable')}:
                              </p>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => {
                                  const selectedTime = new Date(availability.availableSlots[0].time);
                                  setRescheduleData(prev => ({
                                    ...prev,
                                    start_time: format(selectedTime, "yyyy-MM-dd'T'HH:mm")
                                  }));
                                }}
                              >
                                {availability.availableSlots[0].label}
                              </Button>
                            </div>
                          )}
                          
                          <div className="grid grid-cols-3 gap-2">
                            {availability.availableSlots.slice(1).map((slot: any, index: number) => (
                              <Button
                                key={index}
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const selectedTime = new Date(slot.time);
                                  setRescheduleData(prev => ({
                                    ...prev,
                                    start_time: format(selectedTime, "yyyy-MM-dd'T'HH:mm")
                                  }));
                                }}
                                className="text-xs"
                              >
                                {slot.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <Button 
                    onClick={handleReschedule} 
                    disabled={updateAppointment.isPending}
                    className="w-full"
                  >
                    {updateAppointment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {t('appointments.rescheduleAppointment')}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-muted/20 border-border">
                <CardContent className="pt-6 text-center">
                  <div className="text-lg font-medium text-foreground mb-2">
                    {t('appointments.reschedulingNotAvailable')}
                  </div>
                  <div className="text-muted-foreground">
                    {apt.status === 'completed' 
                      ? t('appointments.completedCannotReschedule')
                      : t('appointments.cancelledCannotReschedule')
                    }
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <DocumentSection
              context="appointment"
              clientId={apt.client_id}
              appointmentId={apt.id}
              clientPhone={apt.clients?.phone}
              clientName={`${apt.clients?.first_name || ''} ${apt.clients?.last_name || ''}`.trim()}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                {t('appointments.close')}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
    {clinicId && (
      <CfdiUploadModal
        open={showCfdiUploadModal}
        onClose={() => setShowCfdiUploadModal(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['appointment-payments', appointment?.id, clinicId] });
        }}
        clinicId={clinicId}
        mode="individual"
        paymentIds={cfdiEligiblePayments.map((p) => p.id)}
      />
    )}
    </>
  );
};

export default AppointmentDetails;
