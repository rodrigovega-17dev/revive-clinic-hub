import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Calendar, ExternalLink, LogOut, AlertCircle } from 'lucide-react';
import { useClinicGoogleCalendar } from '@/hooks/useClinicGoogleCalendar';
import ClinicGoogleCalendarSelector from './ClinicGoogleCalendarSelector';

const ClinicGoogleCalendarConnect: React.FC = () => {
  const { t } = useTranslation();
  const {
    isAuthenticated,
    isConnecting,
    authData,
    selectedCalendar,
    clinicData,
    disconnect,
    getOAuthUrl,
    isDisconnecting,
    updateSyncSettings,
    isUpdatingSyncSettings,
  } = useClinicGoogleCalendar();

  const handleConnect = () => {
    const oauthUrl = getOAuthUrl();
    window.location.href = oauthUrl;
  };

  const handleDisconnect = () => {
    disconnect();
  };

  if (isConnecting) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>{t('googleCalendar.title')}</span>
          </CardTitle>
          <CardDescription>
            {t('googleCalendar.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">
              {t('googleCalendar.oauthRedirect')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isAuthenticated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>{t('googleCalendar.title')}</span>
          </CardTitle>
          <CardDescription>
            {t('googleCalendar.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span>{t('googleCalendar.notConnected')}</span>
            </div>
            <Button onClick={handleConnect} className="w-full">
              <ExternalLink className="h-4 w-4 mr-2" />
              {t('googleCalendar.connect')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>{t('googleCalendar.title')}</span>
            <Badge className="ml-2 bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-950/30 dark:text-green-300 dark:hover:bg-green-950/30">
              {t('googleCalendar.connected')}
            </Badge>
          </div>
          <Button
            onClick={handleDisconnect}
            variant="outline"
            size="sm"
            disabled={isDisconnecting}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/20"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {t('googleCalendar.disconnect')}
          </Button>
        </div>
        <CardDescription>
          {t('googleCalendar.syncDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ClinicGoogleCalendarSelector />
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="google-cal-send-invites" className="cursor-pointer">
              {t('googleCalendar.sendInvitesLabel')}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t('googleCalendar.sendInvitesDescription')}
            </p>
          </div>
          <Switch
            id="google-cal-send-invites"
            checked={clinicData?.settings?.syncSettings?.sendInvites ?? true}
            onCheckedChange={(checked) => updateSyncSettings({ sendInvites: checked })}
            disabled={isUpdatingSyncSettings}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default ClinicGoogleCalendarConnect; 