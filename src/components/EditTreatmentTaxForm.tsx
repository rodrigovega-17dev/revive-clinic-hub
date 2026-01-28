/**
 * Modal to edit treatment CFDI/tax fields: SAT code, unit code, VAT-exempt.
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useUpdateTreatment } from '@/hooks/useTreatments';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Treatment = Tables<'treatments'>;

interface EditTreatmentTaxFormProps {
  open: boolean;
  onClose: () => void;
  treatment: Treatment | null;
}

export default function EditTreatmentTaxForm({
  open,
  onClose,
  treatment,
}: EditTreatmentTaxFormProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const updateTreatment = useUpdateTreatment();
  const [satCode, setSatCode] = useState('');
  const [unitCode, setUnitCode] = useState('');
  const [vatExempt, setVatExempt] = useState(false);

  useEffect(() => {
    if (treatment && open) {
      setSatCode(treatment.sat_product_service_code ?? '85121608');
      setUnitCode(treatment.sat_unit_code ?? 'E48');
      setVatExempt(treatment.vat_exempt ?? false);
    }
  }, [treatment, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!treatment) return;
    try {
      await updateTreatment.mutateAsync({
        id: treatment.id,
        sat_product_service_code: satCode.trim() || null,
        sat_unit_code: unitCode.trim() || null,
        vat_exempt: vatExempt,
      });
      toast({ title: t('common.success'), description: t('common.updatedSuccessfully', { item: treatment.name }) });
      onClose();
    } catch {
      toast({
        title: t('common.error'),
        description: t('common.failedToUpdate', { item: t('common.treatment') }),
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('settings.treatmentTaxCodes')}</DialogTitle>
          <DialogDescription>
            {treatment?.name}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t('settings.satProductCode')}</Label>
            <Input
              value={satCode}
              onChange={(e) => setSatCode(e.target.value)}
              placeholder="85121608"
            />
          </div>
          <div className="space-y-2">
            <Label>{t('settings.satUnitCode')}</Label>
            <Input
              value={unitCode}
              onChange={(e) => setUnitCode(e.target.value)}
              placeholder="E48"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>{t('settings.vatExempt')}</Label>
            <Switch checked={vatExempt} onCheckedChange={setVatExempt} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={updateTreatment.isPending}>
              {updateTreatment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
