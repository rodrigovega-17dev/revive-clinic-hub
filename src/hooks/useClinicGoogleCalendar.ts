import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClinicGoogleCalendarService } from '@/integrations/google-calendar/clinic-service';
import { GoogleCalendarSyncOptions, GoogleCalendar, ClinicGoogleCalendarData } from '@/integrations/google-calendar/types';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { useClinic } from '@/hooks/useClinic';

export const useClinicGoogleCalendar = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Get current clinic
  const { data: clinic } = useClinic();
  const clinicId = clinic?.id;

  // Create clinic-specific service
  const getService = useCallback(() => {
    if (!clinicId) throw new Error('No clinic ID available');
    return createClinicGoogleCalendarService(clinicId);
  }, [clinicId]);

  // Check authentication status
  const { data: isAuthenticated, refetch: refetchAuthStatus } = useQuery({
    queryKey: ['clinic-google-calendar', 'auth-status', clinicId],
    queryFn: () => getService().isAuthenticated(),
    enabled: !!clinicId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get auth data
  const { data: authData } = useQuery({
    queryKey: ['clinic-google-calendar', 'auth-data', clinicId],
    queryFn: () => getService().getAuthData(),
    enabled: !!clinicId && isAuthenticated,
  });

  // Get available calendars
  const { data: calendars, refetch: refetchCalendars } = useQuery({
    queryKey: ['clinic-google-calendar', 'calendars', clinicId],
    queryFn: () => getService().getCalendars(),
    enabled: !!clinicId && isAuthenticated,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Get selected calendar
  const { data: selectedCalendar, refetch: refetchSelectedCalendar } = useQuery({
    queryKey: ['clinic-google-calendar', 'selected-calendar', clinicId],
    queryFn: () => getService().getSelectedCalendar(),
    enabled: !!clinicId && isAuthenticated,
  });

  // Get complete clinic data
  const { data: clinicData, refetch: refetchClinicData } = useQuery({
    queryKey: ['clinic-google-calendar', 'clinic-data', clinicId],
    queryFn: () => getService().getClinicData(),
    enabled: !!clinicId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Handle OAuth callback
  const handleAuthCallback = useCallback(async (code: string) => {
    if (!clinicId) return;
    
    setIsConnecting(true);
    try {
      // Get current user ID from Supabase auth
      const { data: { user } } = await import('@/integrations/supabase/client').then(m => m.supabase.auth.getUser());
      if (!user) throw new Error('User not authenticated');

      await getService().authenticate(code, user.id);
      await refetchAuthStatus();
      await refetchCalendars();
      await refetchSelectedCalendar();
      await refetchClinicData();
      
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
  }, [clinicId, getService, refetchAuthStatus, refetchCalendars, refetchSelectedCalendar, refetchClinicData, toast, t]);

  // Disconnect from Google Calendar
  const disconnectMutation = useMutation({
    mutationFn: () => getService().disconnect(),
    onSuccess: async () => {
      await refetchAuthStatus();
      await refetchClinicData();
      queryClient.invalidateQueries({ queryKey: ['clinic-google-calendar', clinicId] });
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
    mutationFn: (calendarId: string) => getService().setSelectedCalendar(calendarId),
    onSuccess: async () => {
      await refetchCalendars();
      await refetchSelectedCalendar();
      await refetchClinicData();
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
      await refetchClinicData();
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
      // Cancelled appointments cannot be synced - they should stay removed from Google Calendar
      if (appointment?.status === 'cancelled') {
        throw new Error('Cancelled appointments cannot be synced to Google Calendar');
      }
      if (!appointment.google_calendar_event_id) {
        // Create new event
        const eventId = await getService().createEvent(appointment, options);
        return { action: 'created', eventId };
      } else {
        // Update existing event
        await getService().updateEvent(appointment.google_calendar_event_id, appointment, options);
        return { action: 'updated', eventId: appointment.google_calendar_event_id };
      }
    },
    onSuccess: (result, variables) => {
      // Invalidate queries to refresh appointment data
      queryClient.invalidateQueries({ queryKey: ['appointments', clinicId] });
      
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
      await getService().deleteEvent(googleEventId, options);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', clinicId] });
      
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
      const message = error instanceof Error ? error.message : String(error);
      const normalizedMessage = message.toLowerCase();
      if (normalizedMessage.includes('not found') || normalizedMessage.includes('notfound')) {
        return;
      }
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

  // Update sync settings (e.g. sendInvites to control calendar invitation emails)
  const updateSyncSettingsMutation = useMutation({
    mutationFn: async (partial: Partial<ClinicGoogleCalendarData['settings']['syncSettings']>) => {
      await getService().updateSyncSettings(partial);
      await refetchClinicData();
    },
    onSuccess: () => {
      toast({
        title: t('googleCalendar.settingsUpdated'),
        description: t('googleCalendar.settingsUpdatedSuccess'),
      });
    },
    onError: (error) => {
      console.error('Google Calendar settings update error:', error);
      toast({
        title: t('googleCalendar.settingsUpdateFailed'),
        description: t('googleCalendar.settingsUpdateError'),
        variant: 'destructive',
      });
    },
  });

  return {
    // State
    isAuthenticated,
    isConnecting,
    authData,
    selectedCalendar,
    calendars,
    clinicData,
    
    // Actions
    handleAuthCallback,
    disconnect: disconnectMutation.mutate,
    isDisconnecting: disconnectMutation.isPending,
    setSelectedCalendar: setSelectedCalendarMutation.mutate,
    isSettingCalendar: setSelectedCalendarMutation.isPending,
    refreshCalendars: refreshCalendarsMutation.mutate,
    isRefreshing: refreshCalendarsMutation.isPending,
    syncAppointment: syncAppointmentMutation.mutate,
    isSyncing: syncAppointmentMutation.isPending,
    deleteAppointment: deleteAppointmentMutation.mutate,
    isDeleting: deleteAppointmentMutation.isPending,
    updateSyncSettings: updateSyncSettingsMutation.mutate,
    isUpdatingSyncSettings: updateSyncSettingsMutation.isPending,
    
    // Utilities
    getOAuthUrl,
    
    // Refetch functions
    refetch: () => {
      refetchAuthStatus();
      refetchCalendars();
      refetchSelectedCalendar();
      refetchClinicData();
    },
  };
}; 