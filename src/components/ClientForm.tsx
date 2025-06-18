
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateClient } from '@/hooks/useClients';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface ClientFormProps {
  open: boolean;
  onClose: () => void;
}

const ClientForm = ({ open, onClose }: ClientFormProps) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    birth_date: '',
    gender: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    medical_notes: '',
  });
  
  const createClient = useCreateClient();
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
      await createClient.mutateAsync({
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        birth_date: formData.birth_date || null,
        gender: formData.gender || null,
        address: formData.address.trim() || null,
        emergency_contact_name: formData.emergency_contact_name.trim() || null,
        emergency_contact_phone: formData.emergency_contact_phone.trim() || null,
        medical_notes: formData.medical_notes.trim() || null,
        is_active: true,
      });

      toast({
        title: 'Success',
        description: 'Client created successfully!',
      });
      
      onClose();
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        birth_date: '',
        gender: '',
        address: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        medical_notes: '',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create client. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Add New Client</DialogTitle>
          <DialogDescription>
            Create a new client profile with their personal and medical information
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name" className="text-sm font-medium">First Name *</Label>
              <Input
                id="first_name"
                placeholder="Enter first name"
                value={formData.first_name}
                onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name" className="text-sm font-medium">Last Name *</Label>
              <Input
                id="last_name"
                placeholder="Enter last name"
                value={formData.last_name}
                onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium">Phone</Label>
              <Input
                id="phone"
                placeholder="Enter phone number"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="birth_date" className="text-sm font-medium">Birth Date</Label>
              <Input
                id="birth_date"
                type="date"
                value={formData.birth_date}
                onChange={(e) => setFormData(prev => ({ ...prev, birth_date: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender" className="text-sm font-medium">Gender</Label>
              <Select value={formData.gender} onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="text-sm font-medium">Address</Label>
            <Textarea
              id="address"
              placeholder="Enter full address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="emergency_contact_name" className="text-sm font-medium">Emergency Contact Name</Label>
              <Input
                id="emergency_contact_name"
                placeholder="Enter emergency contact name"
                value={formData.emergency_contact_name}
                onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact_name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergency_contact_phone" className="text-sm font-medium">Emergency Contact Phone</Label>
              <Input
                id="emergency_contact_phone"
                placeholder="Enter emergency contact phone"
                value={formData.emergency_contact_phone}
                onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact_phone: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="medical_notes" className="text-sm font-medium">Medical Notes</Label>
            <Textarea
              id="medical_notes"
              placeholder="Enter any relevant medical notes or conditions"
              value={formData.medical_notes}
              onChange={(e) => setFormData(prev => ({ ...prev, medical_notes: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createClient.isPending}>
              {createClient.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Client
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ClientForm;
