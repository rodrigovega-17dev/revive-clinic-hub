import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { isValidPin } from '@/lib/financePin';

interface FinancePinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSetPin: (currentPassword: string, newPin: string) => Promise<{ data?: unknown; error?: { message: string } }>;
  mode: 'set' | 'change';
}

export const FinancePinDialog: React.FC<FinancePinDialogProps> = ({
  open,
  onOpenChange,
  onSetPin,
  mode,
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!currentPassword || !newPin || !confirmPin) {
      setError(t('security.allFieldsRequired'));
      return;
    }
    if (!isValidPin(newPin)) {
      setError(t('security.financePinMustBe4Digits'));
      return;
    }
    if (newPin !== confirmPin) {
      setError(t('security.financePinMismatch'));
      return;
    }
    setLoading(true);
    try {
      const result = await onSetPin(currentPassword, newPin);
      if (result.error) {
        setError(result.error.message);
      } else {
        toast({
          title: t('notifications.success'),
          description: mode === 'set' ? t('security.financePinSetSuccess') : t('security.financePinChangedSuccess'),
        });
        onOpenChange(false);
        resetForm();
      }
    } catch {
      setError(t('security.unexpectedError'));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentPassword('');
    setNewPin('');
    setConfirmPin('');
    setError(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) resetForm();
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {mode === 'set' ? t('security.financePinSetTitle') : t('security.financePinChangeTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('security.financePinDialogDescription')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="finance-pin-password">{t('security.currentPassword')}</Label>
            <div className="relative">
              <Input
                id="finance-pin-password"
                type={showPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={t('security.enterCurrentPassword')}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="finance-pin-new">{t('security.financePinNew')}</Label>
            <Input
              id="finance-pin-new"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              required
            />
            <p className="text-xs text-muted-foreground">{t('security.financePin4DigitsHint')}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="finance-pin-confirm">{t('security.financePinConfirm')}</Label>
            <Input
              id="finance-pin-confirm"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'set' ? t('security.financePinSet') : t('security.financePinChange')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
