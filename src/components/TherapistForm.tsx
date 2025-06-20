import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [commissionPercentage, setCommissionPercentage] = useState('0');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const createTherapist = useCreateTherapist();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName.trim() || !lastName.trim()) {
      toast({
        title: t('common.validationError'),
        description: t('common.firstNameRequired'),
        variant: 'destructive',
      });
      return;
    }

    try {
      await createTherapist.mutateAsync({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        license_number: licenseNumber.trim() || null,
        commission_percentage: parseFloat(commissionPercentage) || 0,
        specialties: specialties.length > 0 ? specialties : null,
        user_id: null,
      });

      toast({
        title: t('common.success'),
        description: t('therapists.therapistCreated'),
      });
      
      onClose();
      setFirstName('');
      setLastName('');
      setLicenseNumber('');
      setCommissionPercentage('0');
      setSpecialties([]);
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('common.failedToCreate', { item: t('therapists.title').toLowerCase() }),
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">{t('therapists.addNewTherapist')}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t('therapists.createTherapistProfile')}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="first_name" className="text-foreground">
              {t('common.firstName')} *
            </Label>
            <Input
              id="first_name"
              placeholder={t('common.enterFirstName')}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="bg-input border-border text-foreground"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="last_name" className="text-foreground">
              {t('common.lastName')} *
            </Label>
            <Input
              id="last_name"
              placeholder={t('common.enterLastName')}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="bg-input border-border text-foreground"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="license_number" className="text-foreground">
              {t('common.licenseNumber')}
            </Label>
            <Input
              id="license_number"
              placeholder={t('common.enterLicenseNumber')}
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              className="bg-input border-border text-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="commission_percentage" className="text-foreground">
              {t('common.commissionPercentage')}
            </Label>
            <Input
              id="commission_percentage"
              placeholder={t('common.enterCommissionPercentage')}
              value={commissionPercentage}
              onChange={(e) => setCommissionPercentage(e.target.value)}
              className="bg-input border-border text-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialties" className="text-foreground">
              {t('common.specialties')}
            </Label>
            <Input
              id="specialties"
              placeholder={t('common.enterSpecialties')}
              value={specialties.join(', ')}
              onChange={(e) => setSpecialties(e.target.value.split(',').map(s => s.trim()))}
              className="bg-input border-border text-foreground"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={createTherapist.isPending}>
              {createTherapist.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('therapists.createTherapist')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TherapistForm;
