import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle } from 'lucide-react';
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

      <div className="text-xs text-muted-foreground">
        <p>{t('googleCalendar.calendarSelectionNote')}</p>
      </div>
    </div>
  );
};

export default ClinicGoogleCalendarSelector; 