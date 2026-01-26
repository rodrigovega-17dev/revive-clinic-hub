import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, RefreshCw, CheckCircle, AlertCircle, Star } from 'lucide-react';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { GoogleCalendar } from '@/integrations/google-calendar/types';

const GoogleCalendarSelector: React.FC = () => {
  const { t } = useTranslation();
  const {
    calendars,
    selectedCalendar,
    setSelectedCalendar,
    isSettingCalendar,
    refreshCalendars,
    isRefreshingCalendars,
  } = useGoogleCalendar();

  const handleCalendarChange = (calendarId: string) => {
    setSelectedCalendar(calendarId);
  };

  const handleRefreshCalendars = async () => {
    refreshCalendars();
  };

  const getAccessRoleBadge = (accessRole: string) => {
    switch (accessRole) {
      case 'owner':
        return <Badge variant="default" className="text-xs">{t('googleCalendar.accessRoleOwner')}</Badge>;
      case 'writer':
        return <Badge variant="secondary" className="text-xs">{t('googleCalendar.accessRoleWriter')}</Badge>;
      case 'reader':
        return <Badge variant="outline" className="text-xs">{t('googleCalendar.accessRoleReader')}</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{accessRole}</Badge>;
    }
  };

  const canWriteToCalendar = (calendar: GoogleCalendar) => {
    return calendar.accessRole === 'owner' || calendar.accessRole === 'writer';
  };

  if (!calendars || calendars.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>{t('googleCalendar.selectCalendar')}</span>
          </CardTitle>
          <CardDescription>
            {t('googleCalendar.selectCalendarDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {t('googleCalendar.noCalendarsAvailable')}
            </p>
            <Button 
              onClick={handleRefreshCalendars} 
              variant="outline" 
              size="sm" 
              className="mt-2"
              disabled={isRefreshingCalendars}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshingCalendars ? 'animate-spin' : ''}`} />
              {t('googleCalendar.refreshCalendars')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>{t('googleCalendar.selectCalendar')}</span>
          </div>
          <Button 
            onClick={handleRefreshCalendars} 
            variant="outline" 
            size="sm"
            disabled={isRefreshingCalendars}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshingCalendars ? 'animate-spin' : ''}`} />
            {t('googleCalendar.refreshCalendars')}
          </Button>
        </CardTitle>
        <CardDescription>
          {t('googleCalendar.selectCalendarDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Single List of All Calendars */}
        <div className="space-y-2">
          {calendars.map((calendar) => (
            <div key={calendar.id} className="p-3 border rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    {selectedCalendar?.id === calendar.id && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    <span className="font-medium">
                      {calendar.summary}
                    </span>
                    {calendar.primary && (
                      <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/20 dark:text-yellow-300 dark:border-yellow-800">
                        <Star className="h-3 w-3 mr-1" />
                        {t('googleCalendar.primary')}
                      </Badge>
                    )}
                  </div>
                  {getAccessRoleBadge(calendar.accessRole)}
                </div>
                {canWriteToCalendar(calendar) ? (
                  <Button
                    variant={selectedCalendar?.id === calendar.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleCalendarChange(calendar.id)}
                    disabled={isSettingCalendar}
                  >
                    {selectedCalendar?.id === calendar.id
                      ? t('googleCalendar.selected')
                      : t('googleCalendar.select')}
                  </Button>
                ) : (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    {t('googleCalendar.noWriteAccess')}
                  </Badge>
                )}
              </div>
              {calendar.description && (
                <p className="text-xs text-muted-foreground mt-1 ml-6">
                  {calendar.description}
                </p>
              )}
            </div>
          ))}
        </div>


      </CardContent>
    </Card>
  );
};

export default GoogleCalendarSelector; 