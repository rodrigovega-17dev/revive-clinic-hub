import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateTherapist } from '@/hooks/useTherapists';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import CalendarColorPicker from './CalendarColorPicker';

interface TherapistFormProps {
  open: boolean;
  onClose: () => void;
}

const TherapistForm = ({ open, onClose }: TherapistFormProps) => {
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [commissionPercentage, setCommissionPercentage] = useState('0');
  const [calendarColorId, setCalendarColorId] = useState('1');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const createTherapist = useCreateTherapist();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
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
        email: email.trim(),
        license_number: licenseNumber.trim() || null,
        commission_percentage: parseFloat(commissionPercentage) || 0,
        calendar_color_id: calendarColorId,
        user_id: null,
      });

      toast({
        title: t('common.success'),
        description: t('therapists.therapistCreated'),
      });
      
      onClose();
      setFirstName('');
      setLastName('');
      setEmail('');
      setLicenseNumber('');
      setCommissionPercentage('0');
      setCalendarColorId('1');
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('common.failedToCreate', { item: t('therapists.title').toLowerCase() }),
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      setFirstName('');
      setLastName('');
      setEmail('');
      setLicenseNumber('');
      setCommissionPercentage('0');
      setCalendarColorId('1');
    }
  };

  const addSpecialty = () => {
    const specialty = prompt(t('therapists.enterSpecialty'));
    if (specialty && specialty.trim()) {
      setSpecialties([...specialties, specialty.trim()]);
    }
  };

  const removeSpecialty = (index: number) => {
    setSpecialties(specialties.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('therapists.createTherapist')}</DialogTitle>
          <DialogDescription>
            {t('therapists.createTherapistProfile')}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
              <Label htmlFor="firstName">{t('common.firstName')}</Label>
            <Input
                id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
                placeholder={t('common.firstName')}
              required
              className="bg-input border-border text-foreground focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:border-primary"
            />
          </div>
          <div className="space-y-2">
              <Label htmlFor="lastName">{t('common.lastName')}</Label>
            <Input
                id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
                placeholder={t('common.lastName')}
              required
              className="bg-input border-border text-foreground focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:border-primary"
            />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t('common.email')}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('common.email')}
              required
              className="bg-input border-border text-foreground focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:border-primary"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="licenseNumber">{t('common.license')}</Label>
            <Input
              id="licenseNumber"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              placeholder={t('common.license')}
              className="bg-input border-border text-foreground focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:border-primary"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="commissionPercentage">{t('therapists.commissionPercentage')}</Label>
            <Input
              id="commissionPercentage"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={commissionPercentage}
              onChange={(e) => setCommissionPercentage(e.target.value)}
              placeholder="0"
              className="bg-input border-border text-foreground focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:border-primary"
            />
          </div>

          <CalendarColorPicker
            value={calendarColorId}
            onChange={setCalendarColorId}
            label={t('therapists.calendarColor')}
          />

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
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
