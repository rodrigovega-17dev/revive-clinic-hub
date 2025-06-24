import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useUpdateAppointment, useTherapistAvailability } from '@/hooks/useAppointments';
import { useTherapists } from '@/hooks/useTherapists';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { Loader2, Calendar, User, Clock, DollarSign, CreditCard, CalendarDays, ExternalLink, AlertTriangle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/utils';
import { useClinicGoogleCalendar } from '@/hooks/useClinicGoogleCalendar';
import { useDeleteAppointment } from '@/hooks/useAppointments';
import { useLanguage } from '@/hooks/useLanguage';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useClinicSettings } from '@/hooks/useClinic';
import { useAuth } from '@/hooks/useAuth';
import PaymentForm from './PaymentForm';

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
  const [paymentData, setPaymentData] = useState({
    amount: appointment?.payment_amount || 0,
    method: appointment?.payment_method || '',
    facturado: false,
  });
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
    parseInt(rescheduleData.duration)
  );
  
  const updateAppointment = useUpdateAppointment();
  const { data: therapists } = useTherapists();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated, syncAppointment, deleteAppointment } = useClinicGoogleCalendar();
  const deleteAppointmentMutation = useDeleteAppointment();
  const { clinicSettings } = useClinicSettings();
  const { auth } = useAuth();
  const { currency } = useClinicSettings();
  const { clinicId } = useAuth();

  // Clinic-aware currency formatting
  const formatCurrencyWithClinic = (value: number) => {
    return formatCurrency(value, 2, currency);
  };

  // Calculate IVA amount (16%)
  const ivaAmount = paymentData.facturado ? paymentData.amount * 0.16 : 0;
  const totalWithIva = paymentData.amount + ivaAmount;

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled': return t('appointments.scheduled');
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
      default: return method;
    }
  };

  const handleMarkAsPaid = async () => {
    if (!paymentData.method) {
      toast({
        title: t('appointments.error'),
        description: t('appointments.pleaseSelectPaymentMethod'),
        variant: 'destructive',
      });
      return;
    }

    try {
      // Update appointment with payment information
      await updateAppointment.mutateAsync({
        id: appointment.id,
        payment_status: 'paid',
        payment_method: paymentData.method,
        payment_amount: paymentData.amount,
        payment_date: new Date().toISOString(),
      });

      // Create payment record in payments table
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          appointment_id: appointment.id,
          client_id: appointment.client_id,
          amount: paymentData.facturado ? totalWithIva : paymentData.amount,
          method: paymentData.method,
          payment_date: new Date().toISOString(),
          description: `Payment for ${appointment.treatments?.name || 'appointment'} session${paymentData.facturado ? ' (Facturado + IVA 16%)' : ''}`,
          facturado: paymentData.facturado,
          iva_amount: paymentData.facturado ? ivaAmount : 0,
        });

      if (paymentError) {
        console.error('Error creating payment record:', paymentError);
        // Don't throw error here as appointment was already updated
        toast({
          title: t('appointments.warning'),
          description: t('appointments.paymentRecordedWarning'),
          variant: 'destructive',
        });
      } else {
        // Invalidate payments queries to refresh Finance page
        queryClient.invalidateQueries({ queryKey: ['daily-payments'] });
        queryClient.invalidateQueries({ queryKey: ['monthly-payments'] });
        queryClient.invalidateQueries({ queryKey: ['stats'] });
        
        toast({
          title: t('appointments.success'),
          description: t('appointments.paymentRecorded'),
        });
      }
      
      onClose();
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

  const handleMarkAsCompleted = async () => {
    try {
      await updateAppointment.mutateAsync({
        id: appointment.id,
        status: 'completed',
      });

      toast({
        title: t('appointments.success'),
        description: t('appointments.appointmentCompleted'),
      });
      
      onClose();
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
      // If appointment has a Google Calendar event ID, delete it first
      if (appointment.google_calendar_event_id) {
        try {
          await deleteAppointment({ googleEventId: appointment.google_calendar_event_id });
        } catch (error) {
          console.warn('Failed to delete from Google Calendar, but continuing with local deletion:', error);
          // Continue with local deletion even if Google Calendar fails
        }
      }
      
      // Delete from database
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointment.id);
      
      if (error) throw error;

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

  if (!appointment) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">{t('appointments.appointmentDetails')}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t('appointments.manageAppointmentStatus')}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">{t('appointments.details')}</TabsTrigger>
            <TabsTrigger value="payment">{t('appointments.payment')}</TabsTrigger>
            <TabsTrigger value="reschedule">{t('appointments.reschedule')}</TabsTrigger>
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
                      {appointment.clients?.first_name} {appointment.clients?.last_name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">
                      {format(new Date(appointment.start_time), 'PPP')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">
                      {format(new Date(appointment.start_time), 'p')} - {format(new Date(appointment.end_time), 'p')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">
                      {formatCurrencyWithClinic(appointment.payment_amount || 0)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">
                      {t('appointments.therapist')}: {appointment.therapists?.first_name} {appointment.therapists?.last_name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">
                      {t('appointments.treatment')}: {appointment.treatments?.name}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-muted-foreground">{t('appointments.status')}:</span>
                    <Badge variant={appointment.status === 'completed' ? 'default' : 
                                   appointment.status === 'cancelled' ? 'destructive' : 'secondary'}>
                      {getStatusText(appointment.status)}
                    </Badge>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-muted-foreground">{t('appointments.payment')}:</span>
                    <Badge variant={appointment.payment_status === 'paid' ? 'default' : 'secondary'}>
                      {getPaymentStatusText(appointment.payment_status || 'pending')}
                    </Badge>
                  </div>
                </div>

                {/* Google Calendar Sync Status */}
                {isAuthenticated && (
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {appointment.google_calendar_event_id ? (
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
                    
                    {!appointment.google_calendar_event_id && (
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

                {appointment.notes && (
                  <div className="pt-4 border-t border-border">
                    <h4 className="font-medium text-foreground mb-2">{t('appointments.notes')}</h4>
                    <p className="text-muted-foreground">{appointment.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between space-x-3">
              {appointment.status === 'cancelled' ? (
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteAppointment}
                  disabled={updateAppointment.isPending}
                >
                  {t('appointments.deleteAppointment')}
                </Button>
              ) : appointment.status === 'completed' ? (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-green-600 font-medium">{t('appointments.completed')}</span>
                </div>
              ) : (
                <div className="flex space-x-2">
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
              
              <Button variant="outline" onClick={onClose}>
                {t('appointments.close')}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="payment" className="space-y-4">
            {appointment.payment_status !== 'paid' && appointment.status !== 'cancelled' ? (
              <Card className="bg-muted/20 border-border">
                <CardHeader>
                  <CardTitle className="text-lg text-foreground">{t('appointments.recordPayment')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount" className="text-foreground">{t('appointments.amount')}</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={paymentData.amount}
                        onChange={(e) => setPaymentData(prev => ({ ...prev, amount: parseFloat(e.target.value) }))}
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
                      id="facturado"
                      checked={paymentData.facturado}
                      onCheckedChange={(checked) => 
                        setPaymentData(prev => ({ ...prev, facturado: checked as boolean }))
                      }
                    />
                    <Label htmlFor="facturado" className="text-foreground">{t('appointments.facturado')}</Label>
                  </div>

                  {paymentData.facturado && (
                    <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                      <div className="flex justify-between">
                        <span className="text-foreground">{t('appointments.baseAmount')}:</span>
                        <span className="text-foreground">{formatCurrencyWithClinic(paymentData.amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-foreground">{t('appointments.ivaAmount')}:</span>
                        <span className="text-foreground">{formatCurrencyWithClinic(ivaAmount)}</span>
                      </div>
                      <div className="flex justify-between font-semibold border-t pt-2">
                        <span className="text-foreground">{t('appointments.total')}:</span>
                        <span className="text-foreground">{formatCurrencyWithClinic(totalWithIva)}</span>
                      </div>
                    </div>
                  )}

                  <Button 
                    onClick={handleMarkAsPaid} 
                    disabled={updateAppointment.isPending}
                    className="w-full"
                  >
                    {updateAppointment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <CreditCard className="mr-2 h-4 w-4" />
                    {t('appointments.markAsPaid')} {paymentData.facturado && `(${formatCurrencyWithClinic(totalWithIva)})`}
                  </Button>

                  {/* Mark as Completed button for better workflow */}
                  {appointment.status !== 'completed' && (
                    <Button 
                    variant="outline"
                    onClick={handleMarkAsCompleted} 
                    disabled={updateAppointment.isPending}
                    className="w-full"
                  >
                    {updateAppointment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {t('appointments.markAsCompleted')}
                  </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-muted/20 border-border">
                <CardContent className="pt-6 text-center">
                  <div className="text-lg font-medium text-foreground mb-2">
                    {appointment.payment_status === 'paid' ? t('appointments.paymentCompleted') : t('appointments.paymentNotAvailable')}
                  </div>
                  <div className="text-muted-foreground mb-4">
                    {appointment.payment_status === 'paid' 
                      ? `${t('appointments.paidVia')} ${getPaymentMethodText(appointment.payment_method)} ${t('appointments.on')} ${format(new Date(appointment.payment_date), 'PPP')}`
                      : t('appointments.paymentCannotBeProcessed')
                    }
                  </div>
                  
                  {/* Mark as Completed button for paid appointments */}
                  {appointment.payment_status === 'paid' && appointment.status !== 'completed' && (
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
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="reschedule" className="space-y-4">
            {appointment.status !== 'cancelled' && appointment.status !== 'completed' ? (
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
                              {therapist.first_name} {therapist.last_name}
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
                    {appointment.status === 'completed' 
                      ? t('appointments.completedCannotReschedule')
                      : t('appointments.cancelledCannotReschedule')
                    }
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentDetails;
