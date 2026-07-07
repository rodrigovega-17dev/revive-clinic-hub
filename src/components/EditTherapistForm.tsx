import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useUpdateTherapist,
  useTherapistScheduleRules,
  useUpsertTherapistScheduleRules,
  createDefaultScheduleRules,
  type TherapistScheduleRuleInput,
} from '@/hooks/useTherapists';
import { useToast } from '@/hooks/use-toast';
import { Loader2, X, Pencil } from 'lucide-react';
import CalendarColorPicker from './CalendarColorPicker';
import type { Tables } from '@/integrations/supabase/types';
import TherapistScheduleRulesEditor from './TherapistScheduleRulesEditor';
import { SignatureManager } from './SignatureManager';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

type Therapist = Tables<'therapists'>;

interface EditTherapistFormProps {
  therapist: Therapist | null;
  open: boolean;
  onClose: () => void;
}

const EditTherapistForm = ({ therapist, open, onClose }: EditTherapistFormProps) => {
  const { t } = useTranslation();
  const { clinicId } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [compensationType, setCompensationType] = useState<'percentage' | 'fixed_per_session'>('percentage');
  const [commissionPercentage, setCommissionPercentage] = useState('0');
  const [fixedSessionAmount, setFixedSessionAmount] = useState('');
  const [retentionEnabled, setRetentionEnabled] = useState(false);
  const [retentionRate, setRetentionRate] = useState('16');
  const [incentiveEnabled, setIncentiveEnabled] = useState(false);
  const [incentiveThresholdSessions, setIncentiveThresholdSessions] = useState('');
  const [incentivePercentageBonus, setIncentivePercentageBonus] = useState('');
  const [incentiveFixedBonus, setIncentiveFixedBonus] = useState('');
  const [calendarColorId, setCalendarColorId] = useState('1');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [scheduleRules, setScheduleRules] = useState<TherapistScheduleRuleInput[]>(
    createDefaultScheduleRules()
  );
  const [showSignatureManager, setShowSignatureManager] = useState(false);
  const [therapistSignature, setTherapistSignature] = useState<string | null>(null);
  
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
      setCompensationType((therapist.compensation_type as 'percentage' | 'fixed_per_session') || 'percentage');
      setCommissionPercentage(therapist.commission_percentage?.toString() || '0');
      setFixedSessionAmount(therapist.fixed_session_amount?.toString() || '');
      setRetentionEnabled(therapist.retention_enabled || false);
      setRetentionRate(therapist.retention_rate?.toString() || '16');
      setIncentiveEnabled(therapist.incentive_enabled || false);
      setIncentiveThresholdSessions(therapist.incentive_threshold_sessions?.toString() || '');
      setIncentivePercentageBonus(therapist.incentive_percentage_bonus?.toString() || '');
      setIncentiveFixedBonus(therapist.incentive_fixed_bonus?.toString() || '');
      setCalendarColorId(therapist.calendar_color_id || '1');
      setSpecialties(therapist.specialties || []);
      setTherapistSignature(therapist.signature_image_url || null);
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
      const parsedCommission = parseFloat(commissionPercentage);
      const parsedFixedAmount = parseFloat(fixedSessionAmount);
      const parsedRetentionRate = parseFloat(retentionRate);
      const safeRetentionRate = Number.isNaN(parsedRetentionRate) ? 16 : parsedRetentionRate;
      const parsedIncentiveThreshold = parseInt(incentiveThresholdSessions, 10);
      const parsedIncentivePercentageBonus = parseFloat(incentivePercentageBonus);
      const parsedIncentiveFixedBonus = parseFloat(incentiveFixedBonus);

      if (compensationType === 'percentage' && (Number.isNaN(parsedCommission) || parsedCommission < 0 || parsedCommission > 100)) {
        toast({
          title: t('common.validationError'),
          description: t('therapists.invalidCommissionPercentage'),
          variant: 'destructive',
        });
        return;
      }

      if (compensationType === 'fixed_per_session' && (Number.isNaN(parsedFixedAmount) || parsedFixedAmount <= 0)) {
        toast({
          title: t('common.validationError'),
          description: t('therapists.invalidFixedSessionAmount'),
          variant: 'destructive',
        });
        return;
      }

      if (retentionEnabled && (Number.isNaN(parsedRetentionRate) || parsedRetentionRate < 0 || parsedRetentionRate > 100)) {
        toast({
          title: t('common.validationError'),
          description: t('therapists.invalidRetentionRate'),
          variant: 'destructive',
        });
        return;
      }

      if (incentiveEnabled && (Number.isNaN(parsedIncentiveThreshold) || parsedIncentiveThreshold < 1)) {
        toast({
          title: t('common.validationError'),
          description: t('therapists.invalidIncentiveThreshold'),
          variant: 'destructive',
        });
        return;
      }

      if (incentiveEnabled && compensationType === 'percentage' && (Number.isNaN(parsedIncentivePercentageBonus) || parsedIncentivePercentageBonus <= 0)) {
        toast({
          title: t('common.validationError'),
          description: t('therapists.invalidIncentivePercentageBonus'),
          variant: 'destructive',
        });
        return;
      }

      if (incentiveEnabled && compensationType === 'fixed_per_session' && (Number.isNaN(parsedIncentiveFixedBonus) || parsedIncentiveFixedBonus <= 0)) {
        toast({
          title: t('common.validationError'),
          description: t('therapists.invalidIncentiveFixedBonus'),
          variant: 'destructive',
        });
        return;
      }

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
        compensation_type: compensationType,
        commission_percentage: compensationType === 'percentage' ? (parseFloat(commissionPercentage) || 0) : null,
        fixed_session_amount: compensationType === 'fixed_per_session' ? parsedFixedAmount : null,
        retention_enabled: retentionEnabled,
        retention_rate: safeRetentionRate,
        incentive_enabled: incentiveEnabled,
        incentive_threshold_sessions: incentiveEnabled ? parsedIncentiveThreshold : null,
        incentive_percentage_bonus:
          incentiveEnabled && compensationType === 'percentage' ? parsedIncentivePercentageBonus : null,
        incentive_fixed_bonus:
          incentiveEnabled && compensationType === 'fixed_per_session' ? parsedIncentiveFixedBonus : null,
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
                <Label>{t('therapists.compensationType')}</Label>
                <Select value={compensationType} onValueChange={(value) => setCompensationType(value as 'percentage' | 'fixed_per_session')}>
                  <SelectTrigger className="bg-input border-border text-foreground focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:border-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">{t('therapists.compensationPercentage')}</SelectItem>
                    <SelectItem value="fixed_per_session">{t('therapists.compensationFixedPerSession')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {compensationType === 'percentage' ? (
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
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="fixedSessionAmount">{t('therapists.fixedSessionAmount')}</Label>
                  <Input
                    id="fixedSessionAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={fixedSessionAmount}
                    onChange={(e) => setFixedSessionAmount(e.target.value)}
                    placeholder="0"
                    className="bg-input border-border text-foreground focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:border-primary"
                  />
                </div>
              )}

              <div className="rounded-md border border-border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="retentionEnabled">{t('therapists.retentionEnabled')}</Label>
                  <Switch id="retentionEnabled" checked={retentionEnabled} onCheckedChange={setRetentionEnabled} />
                </div>
                {retentionEnabled && (
                  <div className="space-y-2">
                    <Label htmlFor="retentionRate">{t('therapists.retentionRate')}</Label>
                    <Input
                      id="retentionRate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={retentionRate}
                      onChange={(e) => setRetentionRate(e.target.value)}
                      placeholder="16"
                      className="bg-input border-border text-foreground focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:border-primary"
                    />
                  </div>
                )}
              </div>

              <div className="rounded-md border border-border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="incentiveEnabled">{t('therapists.incentiveEnabled')}</Label>
                  <Switch id="incentiveEnabled" checked={incentiveEnabled} onCheckedChange={setIncentiveEnabled} />
                </div>
                {incentiveEnabled && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="incentiveThresholdSessions">{t('therapists.incentiveThresholdSessions')}</Label>
                      <Input
                        id="incentiveThresholdSessions"
                        type="number"
                        min="1"
                        step="1"
                        value={incentiveThresholdSessions}
                        onChange={(e) => setIncentiveThresholdSessions(e.target.value)}
                        placeholder="60"
                        className="bg-input border-border text-foreground focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:border-primary"
                      />
                    </div>
                    {compensationType === 'percentage' ? (
                      <div className="space-y-2">
                        <Label htmlFor="incentivePercentageBonus">{t('therapists.incentivePercentageBonus')}</Label>
                        <Input
                          id="incentivePercentageBonus"
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={incentivePercentageBonus}
                          onChange={(e) => setIncentivePercentageBonus(e.target.value)}
                          placeholder="5"
                          className="bg-input border-border text-foreground focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:border-primary"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="incentiveFixedBonus">{t('therapists.incentiveFixedBonus')}</Label>
                        <Input
                          id="incentiveFixedBonus"
                          type="number"
                          min="0"
                          step="0.01"
                          value={incentiveFixedBonus}
                          onChange={(e) => setIncentiveFixedBonus(e.target.value)}
                          placeholder="50"
                          className="bg-input border-border text-foreground focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:border-primary"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>

              <CalendarColorPicker
                value={calendarColorId}
                onChange={setCalendarColorId}
                label={t('therapists.calendarColor')}
              />

              <div className="space-y-2">
                <Label>{t('settings.signature', 'Signature')}</Label>
                {therapistSignature ? (
                  <div className="flex items-center gap-4">
                    <div className="border rounded-lg p-4 bg-muted/30">
                      <img 
                        src={therapistSignature} 
                        alt="Signature" 
                        className="max-w-[200px] max-h-[80px]"
                      />
                    </div>
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowSignatureManager(true)}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      {t('settings.editSignature', 'Edit')}
                    </Button>
                  </div>
                ) : (
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowSignatureManager(true)}
                  >
                    {t('settings.addSignature', 'Add Signature')}
                  </Button>
                )}
              </div>
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

        {/* Signature Manager Modal for Therapist */}
        {therapist && clinicId && (
          <SignatureManager
            open={showSignatureManager}
            onClose={() => setShowSignatureManager(false)}
            entityType="therapist"
            entityId={therapist.id}
            clinicId={clinicId}
            currentSignatureUrl={therapistSignature}
            onSave={(url) => setTherapistSignature(url)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EditTherapistForm;
