
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useClients } from '@/hooks/useClients';
import { useTreatments } from '@/hooks/useTreatments';
import { useTherapists } from '@/hooks/useTherapists';
import { useCreateAppointment } from '@/hooks/useAppointments';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface AppointmentFormProps {
  open: boolean;
  onClose: () => void;
}

const AppointmentForm = ({ open, onClose }: AppointmentFormProps) => {
  const [formData, setFormData] = useState({
    client_id: '',
    therapist_id: '',
    treatment_id: '',
    start_time: '',
    notes: '',
  });
  
  const { data: clients } = useClients();
  const { data: treatments } = useTreatments();
  const { data: therapists } = useTherapists();
  const createAppointment = useCreateAppointment();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.client_id || !formData.therapist_id || !formData.treatment_id || !formData.start_time) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    const selectedTreatment = treatments?.find(t => t.id === formData.treatment_id);
    const selectedClient = clients?.find(c => c.id === formData.client_id);
    const startTime = new Date(formData.start_time);
    const endTime = new Date(startTime.getTime() + (selectedTreatment?.duration_minutes || 60) * 60000);

    try {
      await createAppointment.mutateAsync({
        client_id: formData.client_id,
        therapist_id: formData.therapist_id,
        treatment_id: formData.treatment_id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        notes: formData.notes,
        status: 'scheduled' as const,
        payment_amount: selectedClient?.charge_amount || 0,
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
        treatment_id: '',
        start_time: '',
        notes: '',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create appointment. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Schedule New Appointment</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Create a new appointment for a client
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="space-y-2">
            <Label htmlFor="treatment" className="text-foreground">Treatment *</Label>
            <Select value={formData.treatment_id} onValueChange={(value) => 
              setFormData(prev => ({ ...prev, treatment_id: value }))
            }>
              <SelectTrigger className="bg-input border-border text-foreground">
                <SelectValue placeholder="Select a treatment" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {treatments?.map((treatment) => (
                  <SelectItem key={treatment.id} value={treatment.id} className="text-foreground">
                    {treatment.name} ({treatment.duration_minutes}min)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="start_time" className="text-foreground">Date & Time *</Label>
            <Input
              id="start_time"
              type="datetime-local"
              value={formData.start_time}
              onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
              className="bg-input border-border text-foreground"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-foreground">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="bg-input border-border text-foreground"
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
