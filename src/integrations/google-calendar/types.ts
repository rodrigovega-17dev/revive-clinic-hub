export interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
  reminders?: {
    useDefault: boolean;
    overrides: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
  colorId?: string;
  extendedProperties?: {
    private?: Record<string, string>;
  };
  conferenceData?: {
    createRequest: {
      requestId: string;
      conferenceSolutionKey: {
        type: 'hangoutsMeet';
      };
    };
  };
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
  calendarId?: string;
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
  calendarId?: string;
  timeZone?: string;
  reminderMinutes?: number;
  sendInvites?: boolean;
  createMeetingLinks?: boolean;
}

export interface GoogleCalendarColor {
  id: string;
  background: string;
  foreground: string;
}

export interface GoogleCalendarColors {
  calendar: Record<string, { background: string; foreground: string }>;
  event: Record<string, { background: string; foreground: string }>;
}

// New types for multitenant implementation
export interface ClinicGoogleCalendarAuth {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  calendarId?: string;
  selectedCalendarId?: string;
  clinicId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicGoogleCalendarSettings {
  enabled: boolean;
  selectedCalendarId?: string;
  syncSettings: {
    autoSync: boolean;
    syncDirection: 'app_to_calendar' | 'calendar_to_app' | 'bidirectional';
    reminderMinutes: number;
    sendInvites: boolean;
    createMeetingLinks: boolean;
    syncPastAppointments: boolean;
    syncCancelledAppointments: boolean;
    colorMapping: Record<string, string>; // therapist_id -> color_id
  };
  lastSyncAt?: string;
  syncStatus: 'idle' | 'syncing' | 'error';
  lastError?: string;
}

export interface ClinicGoogleCalendarData {
  auth: ClinicGoogleCalendarAuth | null;
  settings: ClinicGoogleCalendarSettings;
  calendars: GoogleCalendar[];
  selectedCalendar: GoogleCalendar | null;
} 