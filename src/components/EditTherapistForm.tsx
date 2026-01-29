import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useUpdateTherapist,
  useTherapistScheduleRules,
  useUpsertTherapistScheduleRules,
  createDefaultScheduleRules,
  type TherapistScheduleRuleInput,
} from '@/hooks/useTherapists';
import { useToast } from '@/hooks/use-toast';
import { Loader2, X } from 'lucide-react';
import CalendarColorPicker from './CalendarColorPicker';
import type { Tables } from '@/integrations/supabase/types';
import TherapistScheduleRulesEditor from './TherapistScheduleRulesEditor';

type Therapist = Tables<'therapists'>;

interface EditTherapistFormProps {
  therapist: Therapist | null;
  open: boolean;
  onClose: () => void;
}

const EditTherapistForm = ({ therapist, open, onClose }: EditTherapistFormProps) => {
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [commissionPercentage, setCommissionPercentage] = useState('0');
  const [calendarColorId, setCalendarColorId] = useState('1');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [scheduleRules, setScheduleRules] = useState<TherapistScheduleRuleInput[]>(
    createDefaultScheduleRules()
  );
  
  const updateTherapist = useUpdateTherapist();
  const scheduleRulesQuery = useTherapistScheduleRules(therapist?.id);
  const upsertScheduleRules = useUpsertTherapistScheduleRules();
  const { toast } = useToast();

  useEffect(() => {
    if (therapist) {
      setFirstName(therapist.first_name || '');
      setLastName(therapist.last_name || '');
      setEmail(therapist.email || '');
      setLicenseNumber(therapist.license_number || '');
      setCommissionPercentage(therapist.commission_percentage?.toString() || '0');
      setCalendarColorId(therapist.calendar_color_id || '1');
      setSpecialties(therapist.specialties || []);
    }
  }, [therapist]);

  useEffect(() => {
    if (open && scheduleRulesQuery.data) {
      setScheduleRules(scheduleRulesQuery.data);
    }
  }, [open, scheduleRulesQuery.data]);

  const hasInvalidSchedule = scheduleRules.some(
    (rule) => rule.is_active && rule.start_time >= rule.end_time
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!therapist) return;
    
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast({
        title: t('common.validationError'),
        description: t('common.firstNameRequired'),
        variant: 'destructive',
      });
      return;
    }

    try {
      if (hasInvalidSchedule) {
        toast({
          title: t('common.validationError'),
          description: t('therapists.invalidScheduleTime'),
          variant: 'destructive',
        });
        return;
      }

      await updateTherapist.mutateAsync({
        id: therapist.id,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        license_number: licenseNumber.trim() || null,
        commission_percentage: parseFloat(commissionPercentage) || 0,
        calendar_color_id: calendarColorId,
        specialties: null,
      });

      await upsertScheduleRules.mutateAsync({
        therapistId: therapist.id,
        rules: scheduleRules,
      });

      toast({
        title: t('common.success'),
        description: t('therapists.therapistUpdated'),
      });
      
      onClose();
    } catch (error) {
      const msg = (error as Error)?.message;
      toast({
        title: t('common.error'),
        description: msg || t('common.failedToUpdate', { item: t('therapists.title').toLowerCase() }),
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    if (!updateTherapist.isPending) {
      onClose();
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

  if (!therapist) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('therapists.updateTherapist')}</DialogTitle>
          <DialogDescription>
            {t('therapists.updateTherapistProfile')}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info">{t('therapists.infoTab')}</TabsTrigger>
              <TabsTrigger value="schedule">{t('therapists.scheduleTab')}</TabsTrigger>
            </TabsList>
            <TabsContent value="info" className="space-y-4 pt-4">
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
            </TabsContent>
            <TabsContent value="schedule" className="pt-4">
              <TherapistScheduleRulesEditor
                rules={scheduleRules}
                onChange={setScheduleRules}
                disabled={scheduleRulesQuery.isLoading}
              />
            </TabsContent>
          </Tabs>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={updateTherapist.isPending || upsertScheduleRules.isPending}>
              {(updateTherapist.isPending || upsertScheduleRules.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t('therapists.updateTherapist')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditTherapistForm;
