import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
        title: t('common.validationError'),
        description: t('common.firstNameRequired'),
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
        title: t('common.success'),
        description: t('clients.clientUpdated'),
      });
      
      onClose();
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('common.failedToUpdate', { item: t('clients.title').toLowerCase() }),
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">{t('common.editClient')}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t('common.updateClientProfile')}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name" className="text-sm font-medium text-foreground">
                {t('common.firstName')} *
              </Label>
              <Input
                id="first_name"
                placeholder={t('common.enterFirstName')}
                value={formData.first_name}
                onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                className="bg-input border-border text-foreground"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name" className="text-sm font-medium text-foreground">
                {t('common.lastName')} *
              </Label>
              <Input
                id="last_name"
                placeholder={t('common.enterLastName')}
                value={formData.last_name}
                onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                className="bg-input border-border text-foreground"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">{t('common.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('common.enterEmail')}
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="bg-input border-border text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium text-foreground">{t('common.phone')}</Label>
              <Input
                id="phone"
                placeholder={t('common.enterPhone')}
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="bg-input border-border text-foreground"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="birth_date" className="text-sm font-medium text-foreground">{t('common.birthDate')}</Label>
              <Input
                id="birth_date"
                type="date"
                value={formData.birth_date}
                onChange={(e) => setFormData(prev => ({ ...prev, birth_date: e.target.value }))}
                className="bg-input border-border text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender" className="text-sm font-medium text-foreground">{t('common.gender')}</Label>
              <Select value={formData.gender} onValueChange={(value: Gender) => setFormData(prev => ({ ...prev, gender: value }))}>
                <SelectTrigger className="bg-input border-border text-foreground">
                  <SelectValue placeholder={t('common.selectGender')} />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="male" className="text-foreground">{t('common.male')}</SelectItem>
                  <SelectItem value="female" className="text-foreground">{t('common.female')}</SelectItem>
                  <SelectItem value="other" className="text-foreground">{t('common.other')}</SelectItem>
                  <SelectItem value="prefer_not_to_say" className="text-foreground">{t('common.preferNotToSay')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="charge_amount" className="text-sm font-medium text-foreground">{t('common.chargeAmount')}</Label>
              <Input
                id="charge_amount"
                type="number"
                step="0.01"
                placeholder={t('common.enterChargeAmount')}
                value={formData.charge_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, charge_amount: e.target.value }))}
                className="bg-input border-border text-foreground"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="text-sm font-medium text-foreground">{t('common.address')}</Label>
            <Textarea
              id="address"
              placeholder={t('common.enterAddress')}
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              className="bg-input border-border text-foreground min-h-[80px]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="emergency_contact_name" className="text-sm font-medium text-foreground">
                {t('common.emergencyContactName')}
              </Label>
              <Input
                id="emergency_contact_name"
                placeholder={t('common.enterEmergencyContactName')}
                value={formData.emergency_contact_name}
                onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact_name: e.target.value }))}
                className="bg-input border-border text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergency_contact_phone" className="text-sm font-medium text-foreground">
                {t('common.emergencyContactPhone')}
              </Label>
              <Input
                id="emergency_contact_phone"
                placeholder={t('common.enterEmergencyContactPhone')}
                value={formData.emergency_contact_phone}
                onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact_phone: e.target.value }))}
                className="bg-input border-border text-foreground"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="medical_notes" className="text-sm font-medium text-foreground">{t('common.medicalNotes')}</Label>
            <Textarea
              id="medical_notes"
              placeholder={t('common.enterMedicalNotes')}
              value={formData.medical_notes}
              onChange={(e) => setFormData(prev => ({ ...prev, medical_notes: e.target.value }))}
              className="bg-input border-border text-foreground min-h-[100px]"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={updateClient.isPending}>
              {updateClient.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.updateClient')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditClientForm;
