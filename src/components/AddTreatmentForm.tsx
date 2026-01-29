/**
 * Modal to add a new treatment (Settings → Clinic).
 * Name required; price and duration optional. SAT product/unit from dropdowns; default physiotherapy.
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateTreatment } from '@/hooks/useTreatments';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import {
  SAT_PRODUCT_SERVICE,
  SAT_PRODUCT_SERVICE_DEFAULT,
  SAT_UNIT,
  SAT_UNIT_DEFAULT,
} from '@/lib/cfdi-catalogs';

interface AddTreatmentFormProps {
  open: boolean;
  onClose: () => void;
}

const DEFAULT_DURATION = 60;

export default function AddTreatmentForm({ open, onClose }: AddTreatmentFormProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const createTreatment = useCreateTreatment();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState(String(DEFAULT_DURATION));
  const [satProduct, setSatProduct] = useState(SAT_PRODUCT_SERVICE_DEFAULT);
  const [satUnit, setSatUnit] = useState(SAT_UNIT_DEFAULT);

  useEffect(() => {
    if (open) {
      setName('');
      setPrice('');
      setDuration(String(DEFAULT_DURATION));
      setSatProduct(SAT_PRODUCT_SERVICE_DEFAULT);
      setSatUnit(SAT_UNIT_DEFAULT);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast({
        title: t('common.validationError'),
        description: t('settings.treatmentNameRequired'),
        variant: 'destructive',
      });
      return;
    }
    const numPrice = price === '' ? null : parseFloat(price);
    if (price !== '' && (isNaN(numPrice!) || numPrice! < 0)) {
      toast({
        title: t('common.validationError'),
        description: t('finance.enterValidAmount'),
        variant: 'destructive',
      });
      return;
    }
    const numDuration = duration === '' ? DEFAULT_DURATION : parseInt(duration, 10);
    if (isNaN(numDuration) || numDuration <= 0) {
      toast({
        title: t('common.validationError'),
        description: t('settings.treatmentDurationInvalid'),
        variant: 'destructive',
      });
      return;
    }
    try {
      await createTreatment.mutateAsync({
        name: trimmed,
        price: numPrice,
        duration_minutes: numDuration,
        sat_product_service_code: satProduct,
        sat_unit_code: satUnit,
        vat_exempt: false,
      });
      toast({
        title: t('common.success'),
        description: t('common.createdSuccessfully', { item: trimmed }),
      });
      onClose();
    } catch {
      toast({
        title: t('common.error'),
        description: t('common.failedToCreate', { item: t('common.treatment').toLowerCase() }),
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('settings.addTreatment')}</DialogTitle>
          <DialogDescription>{t('settings.addTreatmentDesc')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="treatment-name">{t('settings.treatmentName')} *</Label>
            <Input
              id="treatment-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('settings.treatmentNamePlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="treatment-price">{t('settings.treatmentPrice')}</Label>
            <Input
              id="treatment-price"
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="treatment-duration">{t('settings.treatmentDurationMinutes')}</Label>
            <Input
              id="treatment-duration"
              type="number"
              min={1}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder={String(DEFAULT_DURATION)}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('settings.satProductCode')}</Label>
            <Select value={satProduct} onValueChange={setSatProduct}>
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
            <Select value={satUnit} onValueChange={setSatUnit}>
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
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={createTreatment.isPending}>
              {createTreatment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.add')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
