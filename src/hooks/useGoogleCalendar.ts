import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { googleCalendarService } from '@/integrations/google-calendar/service';
import { GoogleCalendarSyncOptions, GoogleCalendar } from '@/integrations/google-calendar/types';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';

export const useGoogleCalendar = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);

  // Check authentication status
  const { data: isAuthenticated, refetch: refetchAuthStatus } = useQuery({
    queryKey: ['google-calendar', 'auth-status'],
    queryFn: () => googleCalendarService.isAuthenticated(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get auth data
  const { data: authData } = useQuery({
    queryKey: ['google-calendar', 'auth-data'],
    queryFn: () => googleCalendarService.getAuthData(),
    enabled: isAuthenticated,
  });

  // Get available calendars
  const { data: calendars, refetch: refetchCalendars } = useQuery({
    queryKey: ['google-calendar', 'calendars'],
    queryFn: () => googleCalendarService.getCalendars(),
    enabled: isAuthenticated,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Get selected calendar
  const { data: selectedCalendar, refetch: refetchSelectedCalendar } = useQuery({
    queryKey: ['google-calendar', 'selected-calendar'],
    queryFn: () => googleCalendarService.getSelectedCalendar(),
    enabled: isAuthenticated,
  });

  // Handle OAuth callback
  const handleAuthCallback = useCallback(async (code: string) => {
    setIsConnecting(true);
    try {
      await googleCalendarService.authenticate(code);
      await refetchAuthStatus();
      await refetchCalendars();
      await refetchSelectedCalendar();
      toast({
        title: t('googleCalendar.connected'),
        description: t('googleCalendar.connectedSuccessfully'),
      });
    } catch (error) {
      console.error('Google Calendar auth error:', error);
      toast({
        title: t('googleCalendar.connectionFailed'),
        description: t('googleCalendar.connectionError'),
        variant: 'destructive',
      });
    } finally {
      setIsConnecting(false);
    }
  }, [refetchAuthStatus, refetchCalendars, refetchSelectedCalendar, toast, t]);

  // Disconnect from Google Calendar
  const disconnectMutation = useMutation({
    mutationFn: () => googleCalendarService.disconnect(),
    onSuccess: async () => {
      await refetchAuthStatus();
      queryClient.invalidateQueries({ queryKey: ['google-calendar'] });
      toast({
        title: t('googleCalendar.disconnected'),
        description: t('googleCalendar.disconnectedSuccessfully'),
      });
    },
    onError: (error) => {
      console.error('Google Calendar disconnect error:', error);
      toast({
        title: t('googleCalendar.disconnectFailed'),
        description: t('googleCalendar.disconnectError'),
        variant: 'destructive',
      });
    },
  });

  // Set selected calendar
  const setSelectedCalendarMutation = useMutation({
    mutationFn: (calendarId: string) => googleCalendarService.setSelectedCalendar(calendarId),
    onSuccess: async () => {
      await refetchCalendars();
      await refetchSelectedCalendar();
      toast({
        title: t('googleCalendar.calendarSelected'),
        description: t('googleCalendar.calendarSelectedSuccess'),
      });
    },
    onError: (error) => {
      console.error('Google Calendar set calendar error:', error);
      toast({
        title: t('googleCalendar.calendarSelectionFailed'),
        description: t('googleCalendar.calendarSelectionError'),
        variant: 'destructive',
      });
    },
  });

  // Refresh calendars
  const refreshCalendarsMutation = useMutation({
    mutationFn: async () => {
      await refetchCalendars();
      await refetchSelectedCalendar();
    },
    onSuccess: () => {
      toast({
        title: t('googleCalendar.calendarsRefreshed'),
        description: t('googleCalendar.calendarsRefreshedSuccess'),
      });
    },
    onError: (error) => {
      console.error('Google Calendar refresh error:', error);
      toast({
        title: t('googleCalendar.calendarsRefreshFailed'),
        description: t('googleCalendar.calendarsRefreshError'),
        variant: 'destructive',
      });
    },
  });

  // Sync appointment to Google Calendar
  const syncAppointmentMutation = useMutation({
    mutationFn: async ({ 
      appointment, 
      options = {} 
    }: { 
      appointment: any; 
      options?: GoogleCalendarSyncOptions;
    }) => {
      if (!appointment.google_calendar_event_id) {
        // Create new event
        const eventId = await googleCalendarService.createEvent(appointment, options);
        return { action: 'created', eventId };
      } else {
        // Update existing event
        await googleCalendarService.updateEvent(appointment.google_calendar_event_id, appointment, options);
        return { action: 'updated', eventId: appointment.google_calendar_event_id };
      }
    },
    onSuccess: (result, variables) => {
      // Invalidate queries to refresh appointment data
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      
      // Invalidate weekly appointments queries to ensure weekly view updates
      queryClient.invalidateQueries({ 
        queryKey: ['weekly-appointments'],
        exact: false 
      });
      
      toast({
        title: t('googleCalendar.syncSuccess'),
        description: t(`googleCalendar.${result.action}Success`),
      });
    },
    onError: (error) => {
      console.error('Google Calendar sync error:', error);
      toast({
        title: t('googleCalendar.syncFailed'),
        description: t('googleCalendar.syncError'),
        variant: 'destructive',
      });
    },
  });

  // Delete appointment from Google Calendar
  const deleteAppointmentMutation = useMutation({
    mutationFn: async ({ googleEventId, options = {} }: { googleEventId: string; options?: GoogleCalendarSyncOptions }) => {
      await googleCalendarService.deleteEvent(googleEventId, options);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      
      // Invalidate weekly appointments queries to ensure weekly view updates
      queryClient.invalidateQueries({ 
        queryKey: ['weekly-appointments'],
        exact: false 
      });
      
      toast({
        title: t('googleCalendar.deleteSuccess'),
        description: t('googleCalendar.deleteSuccessDescription'),
      });
    },
    onError: (error) => {
      console.error('Google Calendar delete error:', error);
      toast({
        title: t('googleCalendar.deleteFailed'),
        description: t('googleCalendar.deleteError'),
        variant: 'destructive',
      });
    },
  });

  // Get Google OAuth URL
  const getOAuthUrl = useCallback(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI || 'http://localhost:5173/google-auth-callback';
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ];

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes.join(' '),
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }, []);

  // Auto-sync appointment when created/updated
  const autoSyncAppointment = useCallback(async (appointment: any) => {
    if (!isAuthenticated) return;

    console.log('Auto-sync triggered for appointment:', {
      id: appointment.id,
      status: appointment.status,
      hasGoogleEventId: !!appointment.google_calendar_event_id,
      googleEventId: appointment.google_calendar_event_id
    });

    try {
      // If appointment is cancelled and has a Google Calendar event ID, delete it
      if (appointment.status === 'cancelled' && appointment.google_calendar_event_id) {
        console.log('Deleting cancelled appointment from Google Calendar:', appointment.google_calendar_event_id);
        
        try {
          await deleteAppointmentMutation.mutateAsync({ 
            googleEventId: appointment.google_calendar_event_id,
            options: {
              sendInvites: true,
            }
          });
          console.log('Successfully deleted from Google Calendar');
        } catch (error) {
          console.warn('Failed to delete from Google Calendar, but continuing with local update:', error);
          // Continue with clearing the event ID even if Google Calendar deletion fails
        }
        
        // Clear the Google Calendar event ID from the database
        await googleCalendarService.clearGoogleEventId(appointment.id);
        console.log('Cleared Google Calendar event ID from database');
          
        return;
      }

      // For non-cancelled appointments, sync normally
      console.log('Syncing appointment to Google Calendar');
      await syncAppointmentMutation.mutateAsync({ 
        appointment,
        options: {
          sendInvites: true,
          reminderMinutes: 15,
        }
      });
      console.log('Successfully synced appointment to Google Calendar');
    } catch (error) {
      console.error('Auto-sync failed:', error);
      // Don't show error toast for auto-sync to avoid spam
    }
  }, [isAuthenticated, syncAppointmentMutation, deleteAppointmentMutation]);

  return {
    // State
    isAuthenticated,
    isConnecting,
    authData,
    calendars,
    selectedCalendar,
    
    // Actions
    handleAuthCallback,
    disconnect: disconnectMutation.mutate,
    setSelectedCalendar: setSelectedCalendarMutation.mutate,
    syncAppointment: syncAppointmentMutation.mutate,
    deleteAppointment: deleteAppointmentMutation.mutate,
    autoSyncAppointment,
    getOAuthUrl,
    refreshCalendars: refreshCalendarsMutation.mutate,
    
    // Loading states
    isDisconnecting: disconnectMutation.isPending,
    isSettingCalendar: setSelectedCalendarMutation.isPending,
    isSyncing: syncAppointmentMutation.isPending,
    isDeleting: deleteAppointmentMutation.isPending,
    isRefreshingCalendars: refreshCalendarsMutation.isPending,
  };
}; 