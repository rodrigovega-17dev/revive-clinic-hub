/**
 * Modal to edit treatment CFDI/tax fields: SAT code, unit code, VAT-exempt.
 * Product and unit are dropdowns from SAT catalogs; default product = physiotherapy.
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
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateTreatment } from '@/hooks/useTreatments';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import {
  SAT_PRODUCT_SERVICE,
  SAT_PRODUCT_SERVICE_DEFAULT,
  SAT_UNIT,
  SAT_UNIT_DEFAULT,
} from '@/lib/cfdi-catalogs';
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
  const [satCode, setSatCode] = useState(SAT_PRODUCT_SERVICE_DEFAULT);
  const [unitCode, setUnitCode] = useState(SAT_UNIT_DEFAULT);
  const [vatExempt, setVatExempt] = useState(false);

  useEffect(() => {
    if (treatment && open) {
      const rawProduct = treatment.sat_product_service_code ?? SAT_PRODUCT_SERVICE_DEFAULT;
      const rawUnit = treatment.sat_unit_code ?? SAT_UNIT_DEFAULT;
      setSatCode(SAT_PRODUCT_SERVICE.some((x) => x.value === rawProduct) ? rawProduct : SAT_PRODUCT_SERVICE_DEFAULT);
      setUnitCode(SAT_UNIT.some((x) => x.value === rawUnit) ? rawUnit : SAT_UNIT_DEFAULT);
      setVatExempt(treatment.vat_exempt ?? false);
    }
  }, [treatment, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!treatment) return;
    try {
      await updateTreatment.mutateAsync({
        id: treatment.id,
        sat_product_service_code: satCode || null,
        sat_unit_code: unitCode || null,
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
            <Select value={satCode} onValueChange={setSatCode}>
              <SelectTrigger>
                <SelectValue placeholder={t('settings.satProductCode')} />
              </SelectTrigger>
              <SelectContent>
                {SAT_PRODUCT_SERVICE.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {t(opt.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('settings.satUnitCode')}</Label>
            <Select value={unitCode} onValueChange={setUnitCode}>
              <SelectTrigger>
                <SelectValue placeholder={t('settings.satUnitCode')} />
              </SelectTrigger>
              <SelectContent>
                {SAT_UNIT.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {t(opt.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
