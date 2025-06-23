export interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
  conferenceData?: {
    createRequest: {
      requestId: string;
      conferenceSolutionKey: {
        type: 'hangoutsMeet' | 'addOn';
      };
    };
  };
  colorId?: string;
}

export interface GoogleCalendar {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  accessRole: 'owner' | 'writer' | 'reader' | 'freeBusyReader';
  selected?: boolean;
}

export interface GoogleCalendarConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface GoogleCalendarAuth {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  calendarId: string;
  selectedCalendarId?: string;
}

export interface SyncStatus {
  appointmentId: string;
  googleEventId?: string;
  lastSyncedAt?: Date;
  syncStatus: 'pending' | 'synced' | 'failed' | 'conflict';
  errorMessage?: string;
}

export interface GoogleCalendarSyncOptions {
  createMeetingLinks?: boolean;
  sendInvites?: boolean;
  reminderMinutes?: number;
  timeZone?: string;
  calendarId?: string;
}

export interface GoogleCalendarColor {
  id: string;
  background: string;
  foreground: string;
}

export interface GoogleCalendarColors {
  calendar: Record<string, GoogleCalendarColor>;
  event: Record<string, GoogleCalendarColor>;
} 