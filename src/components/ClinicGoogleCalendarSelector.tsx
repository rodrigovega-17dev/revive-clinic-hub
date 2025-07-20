import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, RefreshCw, CheckCircle } from 'lucide-react';
import { useClinicGoogleCalendar } from '@/hooks/useClinicGoogleCalendar';

const ClinicGoogleCalendarSelector: React.FC = () => {
  const { t } = useTranslation();
  const {
    calendars,
    selectedCalendar,
    setSelectedCalendar,
    refreshCalendars,
    isRefreshing,
    isSettingCalendar,
  } = useClinicGoogleCalendar();

  const handleCalendarChange = (calendarId: string) => {
    setSelectedCalendar(calendarId);
  };

  if (!calendars || calendars.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground mb-4">
          {t('googleCalendar.noCalendarsAvailable')}
        </p>
        <Button onClick={() => refreshCalendars()} disabled={isRefreshing} size="sm">
          {isRefreshing && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
          {t('googleCalendar.refreshCalendars')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Calendar Selection Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium">{t('googleCalendar.calendarSelection')}</h4>
          <p className="text-xs text-muted-foreground">
            {t('googleCalendar.selectCalendarDescription')}
          </p>
        </div>
        <Button
          onClick={() => refreshCalendars()}
          variant="outline"
          size="sm"
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Calendar Selector */}
      <div className="space-y-2">
        <Select
          value={selectedCalendar?.id || ''}
          onValueChange={handleCalendarChange}
          disabled={isSettingCalendar}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('googleCalendar.selectCalendarPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {calendars.map((calendar) => (
              <SelectItem key={calendar.id} value={calendar.id}>
                <div className="flex items-center space-x-2">
                  <span>{calendar.summary}</span>
                  {calendar.primary && (
                    <Badge variant="secondary" className="text-xs">
                      {t('googleCalendar.primary')}
                    </Badge>
                  )}
                  {calendar.selected && (
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Selected Calendar Info */}
      {selectedCalendar && (
        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                {t('googleCalendar.syncingTo')}: {selectedCalendar.summary}
              </p>
              {selectedCalendar.description && (
                <p className="text-xs text-blue-600 dark:text-blue-300">
                  {selectedCalendar.description}
                </p>
              )}
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {selectedCalendar.accessRole}
                </Badge>
                {selectedCalendar.primary && (
                  <Badge variant="secondary" className="text-xs">
                    {t('googleCalendar.primary')}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        <p>{t('googleCalendar.calendarSelectionNote')}</p>
      </div>
    </div>
  );
};

export default ClinicGoogleCalendarSelector; 