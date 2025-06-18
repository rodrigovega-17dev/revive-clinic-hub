
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useCreateTherapist } from '@/hooks/useTherapists';
import { useToast } = '@/hooks/use-toast';
import { Loader2, X, Plus } from 'lucide-react';

interface TherapistFormProps {
  open: boolean;
  onClose: () => void;
}

const TherapistForm = ({ open, onClose }: TherapistFormProps) => {
  const [formData, setFormData] = useState({
    license_number: '',
    specialties: [] as string[],
    specialty_input: '',
  });
  
  const createTherapist = useCreateTherapist();
  const { toast } = useToast();

  const addSpecialty = () => {
    if (formData.specialty_input.trim() && !formData.specialties.includes(formData.specialty_input.trim())) {
      setFormData(prev => ({
        ...prev,
        specialties: [...prev.specialties, prev.specialty_input.trim()],
        specialty_input: '',
      }));
    }
  };

  const removeSpecialty = (index: number) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createTherapist.mutateAsync({
        license_number: formData.license_number || null,
        specialties: formData.specialties.length > 0 ? formData.specialties : null,
        user_id: null, // This should be set when linking to a user
      });

      toast({
        title: 'Success',
        description: 'Therapist created successfully!',
      });
      
      onClose();
      setFormData({
        license_number: '',
        specialties: [],
        specialty_input: '',
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Therapist</DialogTitle>
          <DialogDescription>
            Create a new therapist profile
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="license_number">License Number</Label>
            <Input
              id="license_number"
              placeholder="Enter license number"
              value={formData.license_number}
              onChange={(e) => setFormData(prev => ({ ...prev, license_number: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialties">Specialties</Label>
            <div className="flex space-x-2">
              <Input
                id="specialties"
                placeholder="Add specialty"
                value={formData.specialty_input}
                onChange={(e) => setFormData(prev => ({ ...prev, specialty_input: e.target.value }))}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialty())}
              />
              <Button type="button" onClick={addSpecialty} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            {formData.specialties.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.specialties.map((specialty, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {specialty}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeSpecialty(index)}
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
