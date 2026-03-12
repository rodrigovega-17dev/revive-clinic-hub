import { 
  GoogleCalendarEvent, 
  GoogleCalendarAuth, 
  GoogleCalendarSyncOptions, 
  GoogleCalendar, 
  GoogleCalendarColors,
  ClinicGoogleCalendarAuth,
  ClinicGoogleCalendarSettings,
  ClinicGoogleCalendarData
} from './types';
import { supabase } from '@/integrations/supabase/client';

class ClinicGoogleCalendarService {
  private readonly baseUrl = 'https://www.googleapis.com/calendar/v3';
  private clinicId: string;

  constructor(clinicId: string) {
    this.clinicId = clinicId;
  }

  private async getAuthToken(): Promise<string> {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      throw new Error('User session is required for Google Calendar operations');
    }
    return token;
  }

  // Get clinic's Google Calendar authentication data
  private async getClinicAuth(): Promise<ClinicGoogleCalendarAuth | null> {
    try {
      const { data: clinic, error } = await supabase
        .from('clinics')
        .select('google_calendar_auth')
        .eq('id', this.clinicId)
        .single();

      if (error || !clinic?.google_calendar_auth) {
        return null;
      }

      return clinic.google_calendar_auth as ClinicGoogleCalendarAuth;
    } catch (error) {
      console.error('Error fetching clinic Google Calendar auth:', error);
      return null;
    }
  }

  // Save clinic's Google Calendar authentication data
  private async saveClinicAuth(auth: ClinicGoogleCalendarAuth): Promise<void> {
    try {
      const { error } = await supabase
        .from('clinics')
        .update({ 
          google_calendar_auth: auth,
          google_calendar_enabled: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.clinicId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error saving clinic Google Calendar auth:', error);
      throw error;
    }
  }

  // Clear clinic's Google Calendar authentication data
  private async clearClinicAuth(): Promise<void> {
    try {
      const { error } = await supabase
        .from('clinics')
        .update({ 
          google_calendar_auth: null,
          google_calendar_enabled: false,
          google_calendar_selected_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.clinicId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error clearing clinic Google Calendar auth:', error);
      throw error;
    }
  }

  // Get clinic's Google Calendar settings
  private async getClinicSettings(): Promise<ClinicGoogleCalendarSettings> {
    try {
      const { data: clinic, error } = await supabase
        .from('clinics')
        .select('google_calendar_enabled, google_calendar_selected_id, google_calendar_sync_settings')
        .eq('id', this.clinicId)
        .single();

      if (error) {
        throw error;
      }

      const defaultSettings: ClinicGoogleCalendarSettings = {
        enabled: false,
        selectedCalendarId: undefined,
        syncSettings: {
          autoSync: true,
          syncDirection: 'app_to_calendar',
          reminderMinutes: 15,
          sendInvites: true,
          createMeetingLinks: false,
          syncPastAppointments: false,
          syncCancelledAppointments: false,
          colorMapping: {},
        },
        syncStatus: 'idle',
      };

      if (!clinic) {
        return defaultSettings;
      }

      return {
        enabled: clinic.google_calendar_enabled || false,
        selectedCalendarId: clinic.google_calendar_selected_id || undefined,
        syncSettings: {
          ...defaultSettings.syncSettings,
          ...(clinic.google_calendar_sync_settings as Partial<ClinicGoogleCalendarSettings['syncSettings']>),
        },
        syncStatus: 'idle',
      };
    } catch (error) {
      console.error('Error fetching clinic Google Calendar settings:', error);
      throw error;
    }
  }

  // Update clinic's Google Calendar settings
  private async updateClinicSettings(settings: Partial<ClinicGoogleCalendarSettings>): Promise<void> {
    try {
      const currentSettings = await this.getClinicSettings();
      const updatedSettings = { ...currentSettings, ...settings };

      const { error } = await supabase
        .from('clinics')
        .update({
          google_calendar_enabled: updatedSettings.enabled,
          google_calendar_selected_id: updatedSettings.selectedCalendarId,
          google_calendar_sync_settings: updatedSettings.syncSettings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', this.clinicId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error updating clinic Google Calendar settings:', error);
      throw error;
    }
  }

  // Refresh access token if needed
  private async refreshTokenIfNeeded(): Promise<void> {
    const auth = await this.getClinicAuth();
    if (!auth) return;

    // Check if token is expired (with 5 minute buffer)
    if (Date.now() > auth.expiresAt - 5 * 60 * 1000) {
      await this.refreshAccessToken(auth);
    }
  }

  // Refresh access token
  private async refreshAccessToken(auth: ClinicGoogleCalendarAuth): Promise<void> {
    try {
      const token = await this.getAuthToken();
      const response = await fetch('/.netlify/functions/google-oauth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'refresh_token',
          payload: {
            refreshToken: auth.refreshToken,
            clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh access token');
      }

      const data = await response.json();
      const updatedAuth: ClinicGoogleCalendarAuth = {
        ...auth,
        accessToken: data.access_token,
        expiresAt: Date.now() + data.expires_in * 1000,
        updatedAt: new Date().toISOString(),
      };

      await this.saveClinicAuth(updatedAuth);
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw error;
    }
  }

  // Make authenticated request to Google Calendar API
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    await this.refreshTokenIfNeeded();

    const auth = await this.getClinicAuth();
    if (!auth) {
      throw new Error('Not authenticated with Google Calendar');
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${auth.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Google Calendar API error: ${error.error?.message || response.statusText}`);
    }

    // For DELETE requests, the response is empty, so don't try to parse JSON
    if (options.method === 'DELETE') {
      return null;
    }

    return response.json();
  }

  // Get the currently selected calendar ID
  private async getSelectedCalendarId(): Promise<string> {
    const settings = await this.getClinicSettings();
    return settings.selectedCalendarId || 'primary';
  }

  /** Convert appointment to Google Calendar event. When options.sendInvites is false, attendees are omitted so Google does not send invitation emails. */
  private appointmentToGoogleEvent(appointment: any, options: GoogleCalendarSyncOptions = {}): GoogleCalendarEvent {
    const startTime = new Date(appointment.start_time);
    const endTime = new Date(appointment.end_time);
    const timeZone = options.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Get client and therapist names with fallbacks
    const clientName = appointment.clients 
      ? `${appointment.clients.first_name || 'Unknown'} ${appointment.clients.last_name || 'Client'}`
      : 'Unknown Client';
    
    const therapistName = appointment.therapists
      ? `${appointment.therapists.first_name || 'Unknown'} ${appointment.therapists.last_name || 'Therapist'}`
      : 'Unknown Therapist';

    const event: GoogleCalendarEvent = {
      summary: `${clientName} - ${therapistName}`,
      description: this.generateEventDescription(appointment),
      start: {
        dateTime: startTime.toISOString(),
        timeZone,
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone,
      },
      reminders: {
        useDefault: false,
        overrides: [
          {
            method: 'popup',
            minutes: options.reminderMinutes || 15,
          },
        ],
      },
    };

    // Add color based on therapist if available
    if (appointment.therapists?.calendar_color_id) {
      event.colorId = appointment.therapists.calendar_color_id;
    }

    // Add attendees only when sendInvites is true (otherwise Google sends invitation emails to client/therapist)
    if (options.sendInvites !== false) {
      const attendees: Array<{ email: string; displayName?: string }> = [];
      if (appointment.clients?.email) {
        attendees.push({
          email: appointment.clients.email,
          displayName: `${appointment.clients.first_name} ${appointment.clients.last_name}`,
        });
      }
      if (appointment.therapists?.email) {
        attendees.push({
          email: appointment.therapists.email,
          displayName: `${appointment.therapists.first_name} ${appointment.therapists.last_name}`,
        });
      }
      if (attendees.length > 0) {
        event.attendees = attendees;
      }
    }

    // Add meeting link if requested
    if (options.createMeetingLinks) {
      event.conferenceData = {
        createRequest: {
          requestId: `meet-${appointment.id}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet',
          },
        },
      };
    }

    // Tag events by therapist for shared-calendar filtering
    if (appointment.therapist_id) {
      event.extendedProperties = {
        private: {
          therapist_id: appointment.therapist_id,
        },
      };
    }

    return event;
  }

  private generateEventDescription(appointment: any): string {
    const parts = [];

    // Add treatment info
    if (appointment.treatments?.name) {
      parts.push(`Treatment: ${appointment.treatments.name}`);
    }

    // Add therapist info
    if (appointment.therapists) {
      const therapistName = `${appointment.therapists.first_name || 'Unknown'} ${appointment.therapists.last_name || 'Therapist'}`;
      parts.push(`Therapist: ${therapistName}`);
    }

    // Add client info
    if (appointment.clients?.phone) {
      parts.push(`Client Phone: ${appointment.clients.phone}`);
    }

    // Add notes
    if (appointment.notes) {
      parts.push(`Notes: ${appointment.notes}`);
    }

    return parts.join('\n');
  }

  // Public API methods

  public async isAuthenticated(): Promise<boolean> {
    const auth = await this.getClinicAuth();
    return auth !== null;
  }

  public async getAuthData(): Promise<ClinicGoogleCalendarAuth | null> {
    return await this.getClinicAuth();
  }

  public async authenticate(code: string, userId: string): Promise<void> {
    try {
      const token = await this.getAuthToken();
      const response = await fetch('/.netlify/functions/google-oauth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'exchange_code',
          payload: {
            code,
            clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
            redirectUri: import.meta.env.VITE_GOOGLE_REDIRECT_URI || 'http://localhost:5173/google-auth-callback',
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to authenticate with Google');
      }

      const data = await response.json();
      
      // Get user's primary calendar
      const calendarResponse = await fetch(`${this.baseUrl}/users/me/calendarList/primary`, {
        headers: {
          'Authorization': `Bearer ${data.access_token}`,
        },
      });

      const calendarData = await calendarResponse.json();
      
      const auth: ClinicGoogleCalendarAuth = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + data.expires_in * 1000,
        calendarId: calendarData.id,
        selectedCalendarId: calendarData.id, // Default to primary calendar
        clinicId: this.clinicId,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await this.saveClinicAuth(auth);
      
      // Update settings to enable Google Calendar
      await this.updateClinicSettings({
        enabled: true,
        selectedCalendarId: calendarData.id,
      });
    } catch (error) {
      console.error('Error authenticating with Google Calendar:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    const auth = await this.getClinicAuth();
    if (auth) {
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${auth.accessToken}`, {
          method: 'POST',
        });
      } catch (error) {
        console.warn('Failed to revoke token:', error);
      }
    }
    await this.clearClinicAuth();
  }

  public async getColors(): Promise<GoogleCalendarColors> {
    return await this.makeRequest('/colors');
  }

  public async getCalendars(): Promise<GoogleCalendar[]> {
    const response = await this.makeRequest('/users/me/calendarList');
    const settings = await this.getClinicSettings();
    
    return response.items?.map((calendar: any) => ({
      id: calendar.id,
      summary: calendar.summary,
      description: calendar.description,
      primary: calendar.primary,
      accessRole: calendar.accessRole,
      selected: calendar.id === settings.selectedCalendarId,
    })) || [];
  }

  public async setSelectedCalendar(calendarId: string): Promise<void> {
    // Verify the calendar exists and user has write access
    const calendars = await this.getCalendars();
    const calendar = calendars.find(cal => cal.id === calendarId);
    
    if (!calendar) {
      throw new Error('Calendar not found');
    }

    if (calendar.accessRole === 'reader' || calendar.accessRole === 'freeBusyReader') {
      throw new Error('No write access to this calendar');
    }

    await this.updateClinicSettings({ selectedCalendarId: calendarId });
  }

  public async getSelectedCalendar(): Promise<GoogleCalendar | null> {
    const settings = await this.getClinicSettings();
    if (!settings.selectedCalendarId) return null;
    
    const calendars = await this.getCalendars();
    return calendars.find(cal => cal.id === settings.selectedCalendarId) || null;
  }

  public async createEvent(appointment: any, options: GoogleCalendarSyncOptions = {}): Promise<string> {
    const settings = await this.getClinicSettings();
    const opts: GoogleCalendarSyncOptions = {
      sendInvites: options.sendInvites ?? settings.syncSettings.sendInvites,
      reminderMinutes: options.reminderMinutes ?? settings.syncSettings.reminderMinutes,
      createMeetingLinks: options.createMeetingLinks ?? settings.syncSettings.createMeetingLinks,
      ...options,
    };
    const event = this.appointmentToGoogleEvent(appointment, opts);
    const calendarId = options.calendarId || await this.getSelectedCalendarId();

    const response = await this.makeRequest(`/calendars/${calendarId}/events`, {
      method: 'POST',
      body: JSON.stringify({
        ...event,
        sendUpdates: opts.sendInvites ? 'all' : 'none',
      }),
    });

    // Save the Google Calendar event ID to the appointment
    await this.saveGoogleEventId(appointment.id, response.id);

    return response.id;
  }

  public async updateEvent(googleEventId: string, appointment: any, options: GoogleCalendarSyncOptions = {}): Promise<void> {
    const settings = await this.getClinicSettings();
    const opts: GoogleCalendarSyncOptions = {
      sendInvites: options.sendInvites ?? settings.syncSettings.sendInvites,
      reminderMinutes: options.reminderMinutes ?? settings.syncSettings.reminderMinutes,
      createMeetingLinks: options.createMeetingLinks ?? settings.syncSettings.createMeetingLinks,
      ...options,
    };
    const event = this.appointmentToGoogleEvent(appointment, opts);
    const calendarId = options.calendarId || await this.getSelectedCalendarId();

    await this.makeRequest(`/calendars/${calendarId}/events/${googleEventId}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...event,
        sendUpdates: opts.sendInvites ? 'all' : 'none',
      }),
    });
  }

  public async deleteEvent(googleEventId: string, options: GoogleCalendarSyncOptions = {}): Promise<void> {
    const calendarId = options.calendarId || await this.getSelectedCalendarId();
    await this.makeRequest(`/calendars/${calendarId}/events/${googleEventId}`, {
      method: 'DELETE',
    });
  }

  public async getEvent(googleEventId: string, options: GoogleCalendarSyncOptions = {}): Promise<GoogleCalendarEvent> {
    const calendarId = options.calendarId || await this.getSelectedCalendarId();
    return await this.makeRequest(`/calendars/${calendarId}/events/${googleEventId}`);
  }

  public async listEvents(timeMin: Date, timeMax: Date, options: GoogleCalendarSyncOptions = {}): Promise<GoogleCalendarEvent[]> {
    const calendarId = options.calendarId || await this.getSelectedCalendarId();
    const response = await this.makeRequest(
      `/calendars/${calendarId}/events?` +
      `timeMin=${timeMin.toISOString()}&` +
      `timeMax=${timeMax.toISOString()}&` +
      'singleEvents=true&' +
      'orderBy=startTime'
    );

    return response.items || [];
  }

  public async listEventsForTherapist(
    timeMin: Date,
    timeMax: Date,
    therapistId: string,
    options: GoogleCalendarSyncOptions = {}
  ): Promise<GoogleCalendarEvent[]> {
    const calendarId = options.calendarId || await this.getSelectedCalendarId();
    const params = new URLSearchParams({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
    });

    // Filter events on the shared calendar by therapist_id
    params.append('privateExtendedProperty', `therapist_id=${therapistId}`);

    const response = await this.makeRequest(`/calendars/${calendarId}/events?${params.toString()}`);
    return response.items || [];
  }

  // Helper method to save Google Calendar event ID to appointment (with clinic filtering)
  private async saveGoogleEventId(appointmentId: string, googleEventId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ google_calendar_event_id: googleEventId })
        .eq('id', appointmentId)
        .eq('clinic_id', this.clinicId); // Ensure clinic filtering

      if (error) {
        console.error('Failed to save Google Calendar event ID:', error);
      }
    } catch (error) {
      console.error('Error saving Google Calendar event ID:', error);
    }
  }

  // Helper method to clear Google Calendar event ID from appointment (with clinic filtering)
  public async clearGoogleEventId(appointmentId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ google_calendar_event_id: null })
        .eq('id', appointmentId)
        .eq('clinic_id', this.clinicId); // Ensure clinic filtering

      if (error) {
        console.error('Failed to clear Google Calendar event ID:', error);
      }
    } catch (error) {
      console.error('Error clearing Google Calendar event ID:', error);
    }
  }

  /** Update only sync settings (e.g. sendInvites). Merges with current settings. */
  public async updateSyncSettings(partial: Partial<ClinicGoogleCalendarSettings['syncSettings']>): Promise<void> {
    const current = await this.getClinicSettings();
    await this.updateClinicSettings({
      syncSettings: { ...current.syncSettings, ...partial },
    });
  }

  // Get complete clinic Google Calendar data
  public async getClinicData(): Promise<ClinicGoogleCalendarData> {
    const [auth, settings, calendars, selectedCalendar] = await Promise.all([
      this.getClinicAuth(),
      this.getClinicSettings(),
      this.getCalendars(),
      this.getSelectedCalendar(),
    ]);

    return {
      auth,
      settings,
      calendars,
      selectedCalendar,
    };
  }
}

export const createClinicGoogleCalendarService = (clinicId: string) => {
  return new ClinicGoogleCalendarService(clinicId);
}; 