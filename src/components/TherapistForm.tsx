
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateTherapist } from '@/hooks/useTherapists';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface TherapistFormProps {
  open: boolean;
  onClose: () => void;
}

const TherapistForm = ({ open, onClose }: TherapistFormProps) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    license_number: '',
  });
  
  const createTherapist = useCreateTherapist();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'First name and last name are required.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createTherapist.mutateAsync({
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        license_number: formData.license_number.trim() || null,
        user_id: null,
      });

      toast({
        title: 'Success',
        description: 'Therapist created successfully!',
      });
      
      onClose();
      setFormData({
        first_name: '',
        last_name: '',
        license_number: '',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create therapist. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Add New Therapist</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Create a new therapist profile
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="first_name" className="text-foreground">First Name *</Label>
            <Input
              id="first_name"
              placeholder="Enter first name"
              value={formData.first_name}
              onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
              className="bg-input border-border text-foreground"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="last_name" className="text-foreground">Last Name *</Label>
            <Input
              id="last_name"
              placeholder="Enter last name"
              value={formData.last_name}
              onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
              className="bg-input border-border text-foreground"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="license_number" className="text-foreground">License Number</Label>
            <Input
              id="license_number"
              placeholder="Enter license number"
              value={formData.license_number}
              onChange={(e) => setFormData(prev => ({ ...prev, license_number: e.target.value }))}
              className="bg-input border-border text-foreground"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTherapist.isPending}>
              {createTherapist.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Therapist
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TherapistForm;
