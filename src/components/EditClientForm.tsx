
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateClient } from '@/hooks/useClients';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';
import type { Tables } from '@/integrations/supabase/types';

type Gender = Database['public']['Enums']['gender'];
type Client = Tables<'clients'>;

interface EditClientFormProps {
  open: boolean;
  onClose: () => void;
  client: Client;
}

const EditClientForm = ({ open, onClose, client }: EditClientFormProps) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    birth_date: '',
    gender: '' as Gender | '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    medical_notes: '',
    charge_amount: '',
  });
  
  const updateClient = useUpdateClient();
  const { toast } = useToast();

  // Populate form with client data when modal opens
  useEffect(() => {
    if (client && open) {
      setFormData({
        first_name: client.first_name || '',
        last_name: client.last_name || '',
        email: client.email || '',
        phone: client.phone || '',
        birth_date: client.birth_date || '',
        gender: client.gender || '',
        address: client.address || '',
        emergency_contact_name: client.emergency_contact_name || '',
        emergency_contact_phone: client.emergency_contact_phone || '',
        medical_notes: client.medical_notes || '',
        charge_amount: client.charge_amount?.toString() || '',
      });
    }
  }, [client, open]);

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
      await updateClient.mutateAsync({
        id: client.id,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        birth_date: formData.birth_date || null,
        gender: (formData.gender as Gender) || null,
        address: formData.address.trim() || null,
        emergency_contact_name: formData.emergency_contact_name.trim() || null,
        emergency_contact_phone: formData.emergency_contact_phone.trim() || null,
        medical_notes: formData.medical_notes.trim() || null,
        charge_amount: formData.charge_amount ? parseFloat(formData.charge_amount) : 0,
      });

      toast({
        title: 'Success',
        description: 'Client updated successfully!',
      });
      
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update client. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">Edit Client</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Update client information and medical details
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name" className="text-sm font-medium text-foreground">First Name *</Label>
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
              <Label htmlFor="last_name" className="text-sm font-medium text-foreground">Last Name *</Label>
              <Input
                id="last_name"
                placeholder="Enter last name"
                value={formData.last_name}
                onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                className="bg-input border-border text-foreground"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="bg-input border-border text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium text-foreground">Phone</Label>
              <Input
                id="phone"
                placeholder="Enter phone number"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="bg-input border-border text-foreground"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="birth_date" className="text-sm font-medium text-foreground">Birth Date</Label>
              <Input
                id="birth_date"
                type="date"
                value={formData.birth_date}
                onChange={(e) => setFormData(prev => ({ ...prev, birth_date: e.target.value }))}
                className="bg-input border-border text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender" className="text-sm font-medium text-foreground">Gender</Label>
              <Select value={formData.gender} onValueChange={(value: Gender) => setFormData(prev => ({ ...prev, gender: value }))}>
                <SelectTrigger className="bg-input border-border text-foreground">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="male" className="text-foreground">Male</SelectItem>
                  <SelectItem value="female" className="text-foreground">Female</SelectItem>
                  <SelectItem value="other" className="text-foreground">Other</SelectItem>
                  <SelectItem value="prefer_not_to_say" className="text-foreground">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="charge_amount" className="text-sm font-medium text-foreground">Charge Amount</Label>
              <Input
                id="charge_amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.charge_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, charge_amount: e.target.value }))}
                className="bg-input border-border text-foreground"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="text-sm font-medium text-foreground">Address</Label>
            <Textarea
              id="address"
              placeholder="Enter full address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              className="bg-input border-border text-foreground"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="emergency_contact_name" className="text-sm font-medium text-foreground">Emergency Contact Name</Label>
              <Input
                id="emergency_contact_name"
                placeholder="Enter emergency contact name"
                value={formData.emergency_contact_name}
                onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact_name: e.target.value }))}
                className="bg-input border-border text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergency_contact_phone" className="text-sm font-medium text-foreground">Emergency Contact Phone</Label>
              <Input
                id="emergency_contact_phone"
                placeholder="Enter emergency contact phone"
                value={formData.emergency_contact_phone}
                onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact_phone: e.target.value }))}
                className="bg-input border-border text-foreground"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="medical_notes" className="text-sm font-medium text-foreground">Medical Notes</Label>
            <Textarea
              id="medical_notes"
              placeholder="Enter any relevant medical notes or conditions"
              value={formData.medical_notes}
              onChange={(e) => setFormData(prev => ({ ...prev, medical_notes: e.target.value }))}
              className="bg-input border-border text-foreground"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateClient.isPending}>
              {updateClient.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Client
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditClientForm;
