
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useUpdateTherapist } from '@/hooks/useTherapists';
import { useToast } from '@/hooks/use-toast';
import { Loader2, X } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Therapist = Tables<'therapists'>;

interface EditTherapistFormProps {
  open: boolean;
  onClose: () => void;
  therapist: Therapist;
}

const EditTherapistForm = ({ open, onClose, therapist }: EditTherapistFormProps) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    license_number: '',
    specialties: [] as string[],
    newSpecialty: '',
  });
  
  const updateTherapist = useUpdateTherapist();
  const { toast } = useToast();

  // Populate form with therapist data when modal opens
  useEffect(() => {
    if (therapist && open) {
      setFormData({
        first_name: therapist.first_name || '',
        last_name: therapist.last_name || '',
        license_number: therapist.license_number || '',
        specialties: therapist.specialties || [],
        newSpecialty: '',
      });
    }
  }, [therapist, open]);

  const handleAddSpecialty = () => {
    if (formData.newSpecialty.trim() && !formData.specialties.includes(formData.newSpecialty.trim())) {
      setFormData(prev => ({
        ...prev,
        specialties: [...prev.specialties, prev.newSpecialty.trim()],
        newSpecialty: '',
      }));
    }
  };

  const handleRemoveSpecialty = (specialty: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.filter(s => s !== specialty),
    }));
  };

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
      await updateTherapist.mutateAsync({
        id: therapist.id,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        license_number: formData.license_number.trim() || null,
        specialties: formData.specialties.length > 0 ? formData.specialties : null,
      });

      toast({
        title: 'Success',
        description: 'Therapist updated successfully!',
      });
      
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update therapist. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Edit Therapist</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Update therapist profile information
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

          <div className="space-y-2">
            <Label className="text-foreground">Specialties</Label>
            <div className="flex space-x-2">
              <Input
                placeholder="Add specialty"
                value={formData.newSpecialty}
                onChange={(e) => setFormData(prev => ({ ...prev, newSpecialty: e.target.value }))}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSpecialty())}
                className="bg-input border-border text-foreground"
              />
              <Button type="button" onClick={handleAddSpecialty} variant="outline" size="sm">
                Add
              </Button>
            </div>
            {formData.specialties.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.specialties.map((specialty) => (
                  <Badge key={specialty} variant="secondary" className="flex items-center gap-1">
                    {specialty}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => handleRemoveSpecialty(specialty)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateTherapist.isPending}>
              {updateTherapist.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Therapist
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditTherapistForm;
