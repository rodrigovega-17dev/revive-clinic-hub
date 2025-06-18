
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useClients } from '@/hooks/useClients';
import { useTreatments } from '@/hooks/useTreatments';
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
    treatment_id: '',
    start_time: '',
    notes: '',
  });
  
  const { data: clients } = useClients();
  const { data: treatments } = useTreatments();
  const createAppointment = useCreateAppointment();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.client_id || !formData.treatment_id || !formData.start_time) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    const selectedTreatment = treatments?.find(t => t.id === formData.treatment_id);
    const startTime = new Date(formData.start_time);
    const endTime = new Date(startTime.getTime() + (selectedTreatment?.duration_minutes || 60) * 60000);

    try {
      await createAppointment.mutateAsync({
        client_id: formData.client_id,
        treatment_id: formData.treatment_id,
        therapist_id: 'temp-therapist-id', // This should come from the current user or be selected
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        notes: formData.notes,
        status: 'scheduled' as const,
      });

      toast({
        title: 'Success',
        description: 'Appointment created successfully!',
      });
      
      onClose();
      setFormData({
        client_id: '',
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule New Appointment</DialogTitle>
          <DialogDescription>
            Create a new appointment for a client
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client">Client *</Label>
            <Select value={formData.client_id} onValueChange={(value) => 
              setFormData(prev => ({ ...prev, client_id: value }))
            }>
              <SelectTrigger>
                <SelectValue placeholder="Select a client" />
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

          <div className="space-y-2">
            <Label htmlFor="treatment">Treatment *</Label>
            <Select value={formData.treatment_id} onValueChange={(value) => 
              setFormData(prev => ({ ...prev, treatment_id: value }))
            }>
              <SelectTrigger>
                <SelectValue placeholder="Select a treatment" />
              </SelectTrigger>
              <SelectContent>
                {treatments?.map((treatment) => (
                  <SelectItem key={treatment.id} value={treatment.id}>
                    {treatment.name} ({treatment.duration_minutes}min)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="start_time">Date & Time *</Label>
            <Input
              id="start_time"
              type="datetime-local"
              value={formData.start_time}
              onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
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
