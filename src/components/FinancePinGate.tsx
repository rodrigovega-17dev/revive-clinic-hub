import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
import { useSecurity } from '@/hooks/useSecurity';
import { Lock, Loader2 } from 'lucide-react';

interface FinancePinGateProps {
  children: React.ReactNode;
}

export const FinancePinGate: React.FC<FinancePinGateProps> = ({ children }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { securitySettings, verifyFinancePin, loading: securityLoading } = useSecurity();
  const [pin, setPin] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isProtectedPath = pathname === '/payroll' || pathname === '/therapists';
  const required = Boolean(securitySettings?.finance_pin_required);

  const [unlocked, setUnlockedState] = useState(false);

  // When PIN is required, always require entry (no persistence). When not required, pass through.
  useEffect(() => {
    if (!isProtectedPath) return;
    if (securityLoading) return;
    if (!required) {
      setUnlockedState(true);
      return;
    }
    setUnlockedState(false);
  }, [isProtectedPath, required, securityLoading]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin || pin.length !== 4) {
      setError(t('security.financePinMustBe4Digits'));
      return;
    }
    setError(null);
    setVerifying(true);
    try {
      const ok = await verifyFinancePin(pin);
      if (ok) {
        setUnlockedState(true);
        setPin('');
      } else {
        setError(t('security.financePinWrong'));
      }
    } catch {
      setError(t('security.financePinWrong'));
    } finally {
      setVerifying(false);
    }
  };

  const handleCancel = () => {
    navigate('/dashboard');
  };

  // Not a protected path: render children
  if (!isProtectedPath) {
    return <>{children}</>;
  }
  // Still loading: block access until we know if PIN is required (avoids briefly showing content)
  if (securityLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  // Feature off: no PIN required
  if (!required) {
    return <>{children}</>;
  }
  // Already unlocked this session
  if (unlocked) {
    return <>{children}</>;
  }

  return (
    <>
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              {t('security.financePinEnterTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('security.financePinEnterDescription')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleVerify} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="finance-pin-gate">{t('security.financePinCode')}</Label>
              <Input
                id="finance-pin-gate"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                required
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleCancel} disabled={verifying}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={verifying || pin.length !== 4}>
                {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('security.financePinUnlock')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
