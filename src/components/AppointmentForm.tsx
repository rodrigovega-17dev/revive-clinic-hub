import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DatePicker from '@/components/ui/date-picker';
import { supabase } from '@/integrations/supabase/client';
import { useClients } from '@/hooks/useClients';
import { useTherapists } from '@/hooks/useTherapists';
import { useTreatments } from '@/hooks/useTreatments';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';

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
  const { data: clients } = useClients();
  const { data: therapists } = useTherapists();
  const { data: treatments } = useTreatments();
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  // Calculate end time based on start hour and duration
  const calculateEndTime = (hour: string, duration: string) => {
    const startHourNum = parseInt(hour);
    const durationNum = parseInt(duration);
    const endHourNum = startHourNum + Math.floor(durationNum / 60);
    return endHourNum.toString().padStart(2, '0') + ':00';
  };

  const startTime = `${startHour}:00`;
  const endTime = calculateEndTime(startHour, sessionDuration);

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

      const { data, error } = await supabase
        .from('appointments')
        .insert([appointmentData])
        .select(`
          *,
          clients (first_name, last_name),
          therapists (first_name, last_name),
          treatments (name, price)
        `)
        .single();

      if (error) {
        console.error('Error creating appointment:', error);
        throw error;
      }

      console.log('Appointment created:', data);

      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointments-by-date'] });
      
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
      
      onClose();
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="client">{t('appointments.client')} *</Label>
            <Select value={clientId} onValueChange={handleClientChange} required>
              <SelectTrigger className="bg-input border-border text-foreground">
                <SelectValue placeholder={t('common.selectClient')} />
              </SelectTrigger>
              <SelectContent>
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
            <Select value={therapistId} onValueChange={setTherapistId} required>
              <SelectTrigger className="bg-input border-border text-foreground">
                <SelectValue placeholder={t('common.selectTherapist')} />
              </SelectTrigger>
              <SelectContent>
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
              <SelectTrigger className="bg-input border-border text-foreground">
                <SelectValue placeholder={t('common.selectTreatment')} />
              </SelectTrigger>
              <SelectContent>
                {treatments?.map((treatment) => (
                  <SelectItem key={treatment.id} value={treatment.id}>
                    {treatment.name} - {formatCurrency(treatment.price)}
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
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-input border-border text-foreground"
                required
              />
            </div>

            <div>
              <Label htmlFor="startHour">{t('common.startTime')} *</Label>
              <Select value={startHour} onValueChange={setStartHour} required>
                <SelectTrigger className="bg-input border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
                <SelectTrigger className="bg-input border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 {t('common.duration')}</SelectItem>
                  <SelectItem value="60">60 {t('common.duration')}</SelectItem>
                  <SelectItem value="90">90 {t('common.duration')}</SelectItem>
                  <SelectItem value="120">120 {t('common.duration')}</SelectItem>
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
              className="bg-input border-border text-foreground min-h-[80px]"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit">
              {t('common.scheduleAppointment')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentForm;
