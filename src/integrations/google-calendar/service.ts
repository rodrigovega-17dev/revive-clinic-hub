import { GoogleCalendarEvent, GoogleCalendarAuth, GoogleCalendarSyncOptions, GoogleCalendar, GoogleCalendarColors } from './types';
import { supabase } from '@/integrations/supabase/client';

class GoogleCalendarService {
  private auth: GoogleCalendarAuth | null = null;
  private readonly baseUrl = 'https://www.googleapis.com/calendar/v3';

  constructor() {
    // Load auth from localStorage on initialization
    this.loadAuth();
  }

  private loadAuth(): void {
    const stored = localStorage.getItem('googleCalendarAuth');
    if (stored) {
      this.auth = JSON.parse(stored);
    }
  }

  private saveAuth(auth: GoogleCalendarAuth): void {
    this.auth = auth;
    localStorage.setItem('googleCalendarAuth', JSON.stringify(auth));
  }

  private clearAuth(): void {
    this.auth = null;
    localStorage.removeItem('googleCalendarAuth');
  }

  private async refreshTokenIfNeeded(): Promise<void> {
    if (!this.auth) return;

    // Check if token is expired (with 5 minute buffer)
    if (Date.now() > this.auth.expiresAt - 5 * 60 * 1000) {
      await this.refreshAccessToken();
    }
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.auth) throw new Error('No auth data available');

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
        client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '',
        refresh_token: this.auth.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh access token');
    }

    const data = await response.json();
    this.auth.accessToken = data.access_token;
    this.auth.expiresAt = Date.now() + data.expires_in * 1000;
    this.saveAuth(this.auth);
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    await this.refreshTokenIfNeeded();

    if (!this.auth) {
      throw new Error('Not authenticated with Google Calendar');
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.auth.accessToken}`,
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
  private getSelectedCalendarId(options?: GoogleCalendarSyncOptions): string {
    return options?.calendarId || this.auth?.selectedCalendarId || this.auth?.calendarId || 'primary';
  }

  // Convert appointment to Google Calendar event
  private appointmentToGoogleEvent(appointment: any, options: GoogleCalendarSyncOptions = {}): GoogleCalendarEvent {
    const startTime = new Date(appointment.start_time);
    const endTime = new Date(appointment.end_time);
    const timeZone = options.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;

    const event: GoogleCalendarEvent = {
      summary: `${appointment.clients?.first_name} ${appointment.clients?.last_name} - ${appointment.therapists?.first_name} ${appointment.therapists?.last_name}`,
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

    // Add attendees (both client and therapist)
    const attendees = [];
    
    // Add client if they have an email
    if (appointment.clients?.email) {
      attendees.push({
        email: appointment.clients.email,
        displayName: `${appointment.clients.first_name} ${appointment.clients.last_name}`,
      });
    }
    
    // Add therapist if they have an email
    if (appointment.therapists?.email) {
      attendees.push({
        email: appointment.therapists.email,
        displayName: `${appointment.therapists.first_name} ${appointment.therapists.last_name}`,
      });
    }
    
    // Only set attendees if we have any
    if (attendees.length > 0) {
      event.attendees = attendees;
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

    return event;
  }

  private generateEventDescription(appointment: any): string {
    const parts = [];

    // Add treatment info
    if (appointment.treatments?.name) {
      parts.push(`Treatment: ${appointment.treatments.name}`);
    }

    // Add therapist info
    if (appointment.therapists?.first_name) {
      parts.push(`Therapist: ${appointment.therapists.first_name} ${appointment.therapists.last_name}`);
    }

    // Add client info
    if (appointment.clients?.phone) {
      parts.push(`Client Phone: ${appointment.clients.phone}`);
    }

    // Add notes
    if (appointment.notes) {
      parts.push(`Notes: ${appointment.notes}`);
    }

    // Add payment info
    if (appointment.payment_amount) {
      parts.push(`Payment: $${appointment.payment_amount}`);
    }

    return parts.join('\n');
  }

  // Public methods

  public isAuthenticated(): boolean {
    return this.auth !== null;
  }

  public getAuthData(): GoogleCalendarAuth | null {
    return this.auth;
  }

  public async authenticate(code: string): Promise<void> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
        client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '',
        code,
        grant_type: 'authorization_code',
        redirect_uri: import.meta.env.VITE_GOOGLE_REDIRECT_URI || 'http://localhost:5173/google-auth-callback',
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
    
    const auth: GoogleCalendarAuth = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
      calendarId: calendarData.id,
      selectedCalendarId: calendarData.id, // Default to primary calendar
    };

    this.saveAuth(auth);
  }

  public async disconnect(): Promise<void> {
    if (this.auth) {
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${this.auth.accessToken}`, {
          method: 'POST',
        });
      } catch (error) {
        console.warn('Failed to revoke token:', error);
      }
    }
    this.clearAuth();
  }

  // Get available colors for events
  public async getColors(): Promise<GoogleCalendarColors> {
    return await this.makeRequest('/colors');
  }

  // Get list of available calendars
  public async getCalendars(): Promise<GoogleCalendar[]> {
    const response = await this.makeRequest('/users/me/calendarList');
    
    return response.items?.map((calendar: any) => ({
      id: calendar.id,
      summary: calendar.summary,
      description: calendar.description,
      primary: calendar.primary,
      accessRole: calendar.accessRole,
      selected: calendar.id === this.auth?.selectedCalendarId,
    })) || [];
  }

  // Set the selected calendar
  public async setSelectedCalendar(calendarId: string): Promise<void> {
    if (!this.auth) throw new Error('Not authenticated');

    // Verify the calendar exists and user has write access
    const calendars = await this.getCalendars();
    const calendar = calendars.find(cal => cal.id === calendarId);
    
    if (!calendar) {
      throw new Error('Calendar not found');
    }

    if (calendar.accessRole === 'reader' || calendar.accessRole === 'freeBusyReader') {
      throw new Error('No write access to this calendar');
    }

    this.auth.selectedCalendarId = calendarId;
    this.saveAuth(this.auth);
  }

  // Get the currently selected calendar
  public getSelectedCalendar(): GoogleCalendar | null {
    if (!this.auth?.selectedCalendarId) return null;
    
    // This would ideally be cached or fetched, but for now we'll return basic info
    return {
      id: this.auth.selectedCalendarId,
      summary: this.auth.selectedCalendarId === 'primary' ? 'Primary Calendar' : this.auth.selectedCalendarId,
      primary: this.auth.selectedCalendarId === 'primary',
      accessRole: 'owner', // Assume owner for selected calendar
    };
  }

  public async createEvent(appointment: any, options: GoogleCalendarSyncOptions = {}): Promise<string> {
    const event = this.appointmentToGoogleEvent(appointment, options);
    const calendarId = this.getSelectedCalendarId(options);
    
    const response = await this.makeRequest(`/calendars/${calendarId}/events`, {
      method: 'POST',
      body: JSON.stringify({
        ...event,
        sendUpdates: options.sendInvites ? 'all' : 'none',
      }),
    });

    // Save the Google Calendar event ID to the appointment
    await this.saveGoogleEventId(appointment.id, response.id);

    return response.id;
  }

  public async updateEvent(googleEventId: string, appointment: any, options: GoogleCalendarSyncOptions = {}): Promise<void> {
    const event = this.appointmentToGoogleEvent(appointment, options);
    const calendarId = this.getSelectedCalendarId(options);
    
    await this.makeRequest(`/calendars/${calendarId}/events/${googleEventId}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...event,
        sendUpdates: options.sendInvites ? 'all' : 'none',
      }),
    });
  }

  public async deleteEvent(googleEventId: string, options: GoogleCalendarSyncOptions = {}): Promise<void> {
    const calendarId = this.getSelectedCalendarId(options);
    const response = await this.makeRequest(`/calendars/${calendarId}/events/${googleEventId}`, {
      method: 'DELETE',
    });
    
    // DELETE requests return null, which is expected
    return;
  }

  public async getEvent(googleEventId: string, options: GoogleCalendarSyncOptions = {}): Promise<GoogleCalendarEvent> {
    const calendarId = this.getSelectedCalendarId(options);
    return await this.makeRequest(`/calendars/${calendarId}/events/${googleEventId}`);
  }

  public async listEvents(timeMin: Date, timeMax: Date, options: GoogleCalendarSyncOptions = {}): Promise<GoogleCalendarEvent[]> {
    const calendarId = this.getSelectedCalendarId(options);
    const response = await this.makeRequest(
      `/calendars/${calendarId}/events?` +
      `timeMin=${timeMin.toISOString()}&` +
      `timeMax=${timeMax.toISOString()}&` +
      'singleEvents=true&' +
      'orderBy=startTime'
    );

    return response.items || [];
  }

  // Helper method to save Google Calendar event ID to appointment
  private async saveGoogleEventId(appointmentId: string, googleEventId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ google_calendar_event_id: googleEventId })
        .eq('id', appointmentId);

      if (error) {
        console.error('Failed to save Google Calendar event ID:', error);
      }
    } catch (error) {
      console.error('Error saving Google Calendar event ID:', error);
    }
  }

  // Helper method to clear Google Calendar event ID from appointment
  public async clearGoogleEventId(appointmentId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ google_calendar_event_id: null })
        .eq('id', appointmentId);

      if (error) {
        console.error('Failed to clear Google Calendar event ID:', error);
      }
    } catch (error) {
      console.error('Error clearing Google Calendar event ID:', error);
    }
  }
}

export const googleCalendarService = new GoogleCalendarService(); 