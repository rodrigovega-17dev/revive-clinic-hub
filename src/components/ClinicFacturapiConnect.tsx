/**
 * Per-clinic Facturapi (CFDI) config. Test/live API keys, use-live toggle.
 * Saves via facturapi-config Netlify function; keys never stored in client.
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { FileText, CheckCircle, Loader2 } from 'lucide-react';
import { useClinicFacturapiConfig } from '@/hooks/useClinicFacturapiConfig';
import { useToast } from '@/hooks/use-toast';

const ClinicFacturapiConnect: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { configured, useLive, isLoading, saveConfig, isSaving, refetch } = useClinicFacturapiConfig();

  const [testSecret, setTestSecret] = useState('');
  const [liveSecret, setLiveSecret] = useState('');
  const [useLiveToggle, setUseLiveToggle] = useState(false);
  const [webhookSecret, setWebhookSecret] = useState('');

  useEffect(() => {
    setUseLiveToggle(useLive);
  }, [useLive]);

  const handleSave = async () => {
    try {
      const payload: {
        facturapiTestSecret?: string;
        facturapiLiveSecret?: string;
        facturapiUseLive?: boolean;
        facturapiWebhookSecret?: string;
      } = { facturapiUseLive: useLiveToggle };
      if (testSecret.trim()) payload.facturapiTestSecret = testSecret.trim();
      if (liveSecret.trim()) payload.facturapiLiveSecret = liveSecret.trim();
      if (webhookSecret.trim()) payload.facturapiWebhookSecret = webhookSecret.trim();
      await saveConfig(payload);
      if (testSecret.trim()) setTestSecret('');
      if (liveSecret.trim()) setLiveSecret('');
      if (webhookSecret.trim()) setWebhookSecret('');
      refetch();
      toast({ title: t('common.success'), description: t('settings.facturapiConfigSaved') });
    } catch (e) {
      toast({
        title: t('common.error'),
        description: (e as Error).message,
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('settings.facturapi')}
          </CardTitle>
          <CardDescription>{t('settings.facturapiDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <span>{t('settings.facturapi')}</span>
            {configured && (
              <Badge variant="default" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                {t('settings.facturapiConfigured')}
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>{t('settings.facturapiDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="facturapi-test">{t('settings.facturapiTestKey')}</Label>
            <Input
              id="facturapi-test"
              type="password"
              autoComplete="off"
              placeholder={configured ? '••••••••' : t('settings.facturapiTestKeyPlaceholder')}
              value={testSecret}
              onChange={(e) => setTestSecret(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="facturapi-live">{t('settings.facturapiLiveKey')}</Label>
            <Input
              id="facturapi-live"
              type="password"
              autoComplete="off"
              placeholder={configured ? '••••••••' : t('settings.facturapiLiveKeyPlaceholder')}
              value={liveSecret}
              onChange={(e) => setLiveSecret(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label htmlFor="facturapi-live-mode">{t('settings.facturapiUseLive')}</Label>
            <p className="text-sm text-muted-foreground">{t('settings.facturapiUseLiveDesc')}</p>
          </div>
          <Switch
            id="facturapi-live-mode"
            checked={useLiveToggle}
            onCheckedChange={setUseLiveToggle}
          />
        </div>
        {/* Webhook secret hidden for now
        <div className="space-y-2">
          <Label htmlFor="facturapi-webhook">{t('settings.facturapiWebhookSecret')}</Label>
          <Input
            id="facturapi-webhook"
            type="password"
            autoComplete="off"
            placeholder={t('settings.facturapiWebhookSecretPlaceholder')}
            value={webhookSecret}
            onChange={(e) => setWebhookSecret(e.target.value)}
            className="font-mono text-sm"
          />
        </div>
        */}
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('common.save')}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ClinicFacturapiConnect;
