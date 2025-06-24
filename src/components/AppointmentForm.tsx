import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import DatePicker from '@/components/ui/date-picker';
import { supabase } from '@/integrations/supabase/client';
import { useClients } from '@/hooks/useClients';
import { useTherapists } from '@/hooks/useTherapists';
import { useTreatments } from '@/hooks/useTreatments';
import { useTherapistAvailability, useCreateAppointment } from '@/hooks/useAppointments';
import { useQueryClient } from '@tanstack/react-query';
import { format, addMinutes, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { useClinicGoogleCalendar } from '@/hooks/useClinicGoogleCalendar';
import { AlertTriangle, Clock, User, Stethoscope, DollarSign, MessageSquare, MapPin, Loader2, Plus, X } from 'lucide-react';
import { useClinicSettings } from '@/hooks/useClinic';
import { useAuth } from '@/hooks/useAuth';
import { es, enUS } from 'date-fns/locale';

interface AppointmentFormProps {
  open: boolean;
  onClose: () => void;
}

const AppointmentForm = ({ open, onClose }: AppointmentFormProps) => {
  const { t } = useTranslation();
  const [clientId, setClientId] = useState('');
  const [therapistId, setTherapistId] = useState('');
  const [treatmentId, setTreatmentId] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startHour, setStartHour] = useState('09');
  const [sessionDuration, setSessionDuration] = useState('60');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [showConflictResolution, setShowConflictResolution] = useState(false);
  
  const { data: clients } = useClients();
  const { data: therapists } = useTherapists();
  const { data: treatments } = useTreatments();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { syncAppointment } = useClinicGoogleCalendar();
  const createAppointmentMutation = useCreateAppointment();
  const { data: clinicSettings } = useClinicSettings();
  const { data: authData } = useAuth();
  const { currency } = useClinicSettings();
  const { clinicId } = useAuth();

  // Check for therapist availability
  const { data: availability, isLoading: checkingAvailability } = useTherapistAvailability(
    therapistId,
    startDate,
    startHour,
    parseInt(sessionDuration)
  );

  // Debug logging
  console.log('AppointmentForm: Availability check', {
    therapistId,
    startDate,
    startHour,
    sessionDuration,
    availability,
    checkingAvailability
  });

  const treatmentPrice = treatments?.find(treatment => treatment.id === treatmentId)?.price || 0;
  const selectedClient = clients?.find(client => client.id === clientId);
  const clientDefaultAmount = selectedClient?.charge_amount || 0;

  // Update payment amount when client or treatment changes
  const handleClientChange = (newClientId: string) => {
    setClientId(newClientId);
    const client = clients?.find(c => c.id === newClientId);
    if (client?.charge_amount) {
      setPaymentAmount(client.charge_amount.toString());
    } else if (treatmentPrice > 0) {
      setPaymentAmount(treatmentPrice.toString());
    } else {
      setPaymentAmount('');
    }
  };

  const handleTreatmentChange = (newTreatmentId: string) => {
    setTreatmentId(newTreatmentId);
    const treatment = treatments?.find(t => t.id === newTreatmentId);
    if (treatment?.price) {
      setPaymentAmount(treatment.price.toString());
    } else if (clientDefaultAmount > 0) {
      setPaymentAmount(clientDefaultAmount.toString());
    } else {
      setPaymentAmount('');
    }
  };

  const handleTherapistChange = (newTherapistId: string) => {
    setTherapistId(newTherapistId);
    // Reset conflict resolution when therapist changes
    setShowConflictResolution(false);
  };

  const handleDateChange = (newDate: string) => {
    setStartDate(newDate);
    // Reset conflict resolution when date changes
    setShowConflictResolution(false);
  };

  const handleTimeChange = (newTime: string) => {
    setStartHour(newTime);
    // Reset conflict resolution when time changes
    setShowConflictResolution(false);
  };

  // Handle alternative time slot selection
  const handleAlternativeTimeSelect = (timeSlot: { time: string; label: string }) => {
    const selectedTime = new Date(timeSlot.time);
    setStartDate(format(selectedTime, 'yyyy-MM-dd'));
    setStartHour(selectedTime.getHours().toString().padStart(2, '0'));
    setShowConflictResolution(false);
  };

  // Calculate end time based on start hour and duration
  const calculateEndTime = (hour: string, duration: string) => {
    const startHourNum = parseInt(hour);
    const durationNum = parseInt(duration);
    const endHourNum = startHourNum + Math.floor(durationNum / 60);
    return endHourNum.toString().padStart(2, '0') + ':00';
  };

  const startTime = `${startHour}:00`;
  const endTime = calculateEndTime(startHour, sessionDuration);

  // Clinic-aware currency formatting
  const formatCurrencyWithClinic = (value: number) => {
    return formatCurrency(value, 2, currency);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clientId || !therapistId || !startDate || !startHour || !sessionDuration || !paymentAmount) {
      toast({
        title: t('common.error'),
        description: t('common.fillRequiredFields'),
        variant: "destructive",
      });
      return;
    }

    // Check for conflicts before submitting
    if (availability?.hasConflict) {
      toast({
        title: t('common.error'),
        description: t('appointments.conflictDetected'),
        variant: "destructive",
      });
      return;
    }

    try {
      // Create proper datetime objects in local timezone
      // Use a more explicit approach to avoid timezone issues
      const [year, month, day] = startDate.split('-').map(Number);
      const [hour] = startTime.split(':').map(Number);
      const [endHour] = endTime.split(':').map(Number);
      
      const startDateTime = new Date(year, month - 1, day, hour, 0, 0);
      const endDateTime = new Date(year, month - 1, day, endHour, 0, 0);
      
      // Validate times
      if (endDateTime <= startDateTime) {
        toast({
          title: t('common.error'),
          description: t('common.endTimeAfterStart'),
          variant: "destructive",
        });
        return;
      }

      const appointmentData = {
        client_id: clientId,
        therapist_id: therapistId,
        treatment_id: treatmentId || null,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        notes: notes || null,
        payment_amount: parseFloat(paymentAmount) || treatmentPrice || 0,
        payment_status: 'pending',
      };

      console.log('Creating appointment with data:', appointmentData);

      const data = await createAppointmentMutation.mutateAsync(appointmentData);

      console.log('Appointment created:', data);
      
      toast({
        title: t('common.success'),
        description: t('common.appointmentCreated'),
      });

      // Reset form
      setClientId('');
      setTherapistId('');
      setTreatmentId('');
      setStartDate(format(new Date(), 'yyyy-MM-dd'));
      setStartHour('09');
      setSessionDuration('60');
      setPaymentAmount('');
      setNotes('');
      setShowConflictResolution(false);
      
      onClose();

      syncAppointment({ appointment: data });
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      toast({
        title: t('common.error'),
        description: error.message || t('common.failedToCreateAppointment'),
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">{t('common.scheduleAppointment')}</DialogTitle>
        </DialogHeader>
        
        {/* Conflict Resolution Section */}
        {availability?.hasConflict && (
          <Card className="mb-4 border-destructive/20 bg-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                {t('appointments.schedulingConflict')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-destructive/80 mb-2">{t('appointments.therapistUnavailable')}</p>
                <div className="space-y-2">
                  {availability.conflicts.map((conflict: any) => (
                    <div key={conflict.id} className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-destructive/70" />
                      <span className="text-foreground">
                        {format(new Date(conflict.start_time), 'h:mm a')} - {format(new Date(conflict.end_time), 'h:mm a')}
                      </span>
                      <span className="text-muted-foreground">
                        ({conflict.clients?.first_name} {conflict.clients?.last_name})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              {availability.availableSlots.length > 0 && (
                <div>
                  <p className="text-destructive/80 mb-2 font-medium">
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
                        onClick={() => handleAlternativeTimeSelect(availability.availableSlots[0])}
                      >
                        {availability.availableSlots[0].label}
                      </Button>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-3 gap-2">
                    {availability.availableSlots.slice(1).map((slot, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => handleAlternativeTimeSelect(slot)}
                        className="text-xs"
                      >
                        {slot.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-destructive/20">
                <Button
                  variant="outline"
                  onClick={() => setShowConflictResolution(false)}
                  className="text-destructive border-destructive/30 hover:bg-destructive/5"
                >
                  {t('appointments.chooseDifferentTime')}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowConflictResolution(false)}
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Availability Check Indicator */}
        {therapistId && startDate && startHour && checkingAvailability && (
          <Alert className="mb-4">
            <Clock className="h-4 w-4" />
            <AlertDescription>
              {t('appointments.checkingAvailability')}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="client">{t('appointments.client')} *</Label>
            <Select value={clientId} onValueChange={handleClientChange} required>
              <SelectTrigger className="!bg-input !border-border text-foreground focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:!border-primary">
                <SelectValue placeholder={t('common.selectClient')} />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {clients?.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.first_name} {client.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="therapist">{t('appointments.therapist')} *</Label>
            <Select value={therapistId} onValueChange={handleTherapistChange} required>
              <SelectTrigger className="!bg-input !border-border text-foreground focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:!border-primary">
                <SelectValue placeholder={t('common.selectTherapist')} />
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

          <div>
            <Label htmlFor="treatment">{t('appointments.treatment')}</Label>
            <Select value={treatmentId} onValueChange={handleTreatmentChange}>
              <SelectTrigger className="!bg-input !border-border text-foreground focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:!border-primary">
                <SelectValue placeholder={t('common.selectTreatment')} />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {treatments?.map((treatment) => (
                  <SelectItem key={treatment.id} value={treatment.id}>
                    {treatment.name} - {formatCurrencyWithClinic(treatment.price)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
              <Label htmlFor="startDate">{t('common.startDate')} *</Label>
            <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => handleDateChange(e.target.value)}
              className="bg-input border-border text-foreground"
                  required
                />
              </div>
              
              <div>
              <Label htmlFor="startHour">{t('common.startTime')} *</Label>
                <Select value={startHour} onValueChange={handleTimeChange} required>
                  <SelectTrigger className="!bg-input !border-border text-foreground focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:!border-primary">
                  <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                  {Array.from({ length: 12 }, (_, i) => {
                    const hour = (i + 8).toString().padStart(2, '0');
                    return (
                      <SelectItem key={hour} value={hour}>
                        {hour}:00
                      </SelectItem>
                    );
                  })}
                  </SelectContent>
                </Select>
              </div>

              <div>
              <Label htmlFor="sessionDuration">{t('common.sessionDuration')} *</Label>
                <Select value={sessionDuration} onValueChange={setSessionDuration} required>
                  <SelectTrigger className="!bg-input !border-border text-foreground focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:!border-primary">
                  <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                  <SelectItem value="60">60 {t('appointments.minutes')}</SelectItem>
                  <SelectItem value="120">120 {t('appointments.minutes')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
          <div>
            <Label htmlFor="paymentAmount">{t('common.paymentAmount')} *</Label>
            <Input
              id="paymentAmount"
              type="number"
              step="0.01"
              placeholder={t('common.enterAmount')}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="bg-input border-border text-foreground"
              required
            />
          </div>

          <div>
            <Label htmlFor="notes">{t('appointments.notes')}</Label>
            <Textarea
              id="notes"
              placeholder={t('common.enterDescription')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-input border-border text-foreground min-h-[80px] focus:!ring-2 focus:!ring-primary focus:!ring-offset-2 focus:!border-primary"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button 
              type="submit"
              disabled={availability?.hasConflict && !showConflictResolution}
            >
              {t('common.scheduleAppointment')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentForm;
