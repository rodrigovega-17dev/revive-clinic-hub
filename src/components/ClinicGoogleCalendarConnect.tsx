import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, ExternalLink, LogOut, CheckCircle, AlertCircle } from 'lucide-react';
import { useClinicGoogleCalendar } from '@/hooks/useClinicGoogleCalendar';
import ClinicGoogleCalendarSelector from './ClinicGoogleCalendarSelector';

const ClinicGoogleCalendarConnect: React.FC = () => {
  const { t } = useTranslation();
  const {
    isAuthenticated,
    isConnecting,
    authData,
    selectedCalendar,
    disconnect,
    getOAuthUrl,
    isDisconnecting,
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
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>{t('googleCalendar.title')}</span>
            <Badge variant="default" className="ml-2">
              <CheckCircle className="h-3 w-3 mr-1" />
              {t('googleCalendar.connected')}
            </Badge>
          </CardTitle>
          <CardDescription>
            {t('googleCalendar.syncDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Connection Info */}
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800 dark:text-green-200">
                  {t('googleCalendar.connectedSuccessfully')}
                </span>
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

            {/* Current Calendar Info */}
            {selectedCalendar && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    {t('googleCalendar.syncingTo')}: {selectedCalendar.summary}
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Calendar Selection */}
      <ClinicGoogleCalendarSelector />
    </div>
  );
};

export default ClinicGoogleCalendarConnect; 