
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useClients } from '@/hooks/useClients';
import { useTherapists } from '@/hooks/useTherapists';
import { useTreatments } from '@/hooks/useTreatments';
import { useCreateAppointment } from '@/hooks/useAppointments';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Clock, DollarSign } from 'lucide-react';
import DatePicker from '@/components/ui/date-picker';
import TimePicker from '@/components/ui/time-picker';
import { format } from 'date-fns';

interface AppointmentFormProps {
  open: boolean;
  onClose: () => void;
}

const AppointmentForm = ({ open, onClose }: AppointmentFormProps) => {
  const [formData, setFormData] = useState({
    client_id: '',
    therapist_id: '',
    duration: '60',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '09:00',
    charge_amount: 0,
    notes: '',
  });
  
  const { data: clients } = useClients();
  const { data: therapists } = useTherapists();
  const { data: treatments } = useTreatments();
  const createAppointment = useCreateAppointment();
  const { toast } = useToast();

  // Update charge amount when client changes
  useEffect(() => {
    if (formData.client_id && clients) {
      const selectedClient = clients.find(c => c.id === formData.client_id);
      if (selectedClient?.charge_amount) {
        setFormData(prev => ({ ...prev, charge_amount: selectedClient.charge_amount }));
      }
    }
  }, [formData.client_id, clients]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.client_id || !formData.therapist_id || !formData.date || !formData.time || !formData.duration) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    // Find the treatment based on duration
    const selectedTreatment = treatments?.find(t => t.duration_minutes === parseInt(formData.duration));
    
    // Create proper UTC datetime from date and time
    const startDateTime = new Date(`${formData.date}T${formData.time}:00`);
    const durationMinutes = parseInt(formData.duration);
    const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000);

    try {
      await createAppointment.mutateAsync({
        client_id: formData.client_id,
        therapist_id: formData.therapist_id,
        treatment_id: selectedTreatment?.id || null,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        notes: formData.notes,
        status: 'scheduled' as const,
        payment_amount: formData.charge_amount,
        payment_status: 'pending',
      });

      toast({
        title: 'Success',
        description: 'Appointment created successfully!',
      });
      
      onClose();
      setFormData({
        client_id: '',
        therapist_id: '',
        duration: '60',
        date: format(new Date(), 'yyyy-MM-dd'),
        time: '09:00',
        charge_amount: 0,
        notes: '',
      });
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast({
        title: 'Error',
        description: 'Failed to create appointment. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Schedule New Appointment</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Create a new appointment for a client
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client" className="text-foreground">Client *</Label>
              <Select value={formData.client_id} onValueChange={(value) => 
                setFormData(prev => ({ ...prev, client_id: value }))
              }>
                <SelectTrigger className="bg-input border-border text-foreground">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {clients?.map((client) => (
                    <SelectItem key={client.id} value={client.id} className="text-foreground">
                      {client.first_name} {client.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="therapist" className="text-foreground">Therapist *</Label>
              <Select value={formData.therapist_id} onValueChange={(value) => 
                setFormData(prev => ({ ...prev, therapist_id: value }))
              }>
                <SelectTrigger className="bg-input border-border text-foreground">
                  <SelectValue placeholder="Select a therapist" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {therapists?.map((therapist) => (
                    <SelectItem key={therapist.id} value={therapist.id} className="text-foreground">
                      {therapist.first_name} {therapist.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card className="bg-muted/20 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Session Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration" className="text-foreground">Duration *</Label>
                  <Select value={formData.duration} onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, duration: value }))
                  }>
                    <SelectTrigger className="bg-input border-border text-foreground">
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="60" className="text-foreground">60 minutes</SelectItem>
                      <SelectItem value="120" className="text-foreground">120 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="charge_amount" className="text-foreground flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Charge Amount
                  </Label>
                  <Input
                    id="charge_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.charge_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, charge_amount: parseFloat(e.target.value) || 0 }))}
                    className="bg-input border-border text-foreground"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <DatePicker
                  label="Date"
                  value={formData.date}
                  onChange={(value) => setFormData(prev => ({ ...prev, date: value }))}
                  required
                />
                <TimePicker
                  label="Time"
                  value={formData.time}
                  onChange={(value) => setFormData(prev => ({ ...prev, time: value }))}
                  required
                />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-foreground">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="bg-input border-border text-foreground"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createAppointment.isPending}>
              {createAppointment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Appointment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentForm;
