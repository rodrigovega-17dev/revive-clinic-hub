import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { useAuth } from './useAuth';
import { useClinic } from './useClinic';

type UserPreferences = Database['public']['Tables']['user_preferences']['Row'];
type UpdateUserPreferencesData = Partial<Database['public']['Tables']['user_preferences']['Update']>;

export const useUserPreferences = () => {
  const [data, setData] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { data: clinic } = useClinic();

  // Fetch user preferences
  const fetchPreferences = async () => {
    if (!user || !clinic) return;

    try {
      setLoading(true);
      setError(null);

      const { data: preferences, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .eq('clinic_id', clinic.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No preferences found, create default ones
          const defaultPreferences = {
            user_id: user.id,
            clinic_id: clinic.id,
            email_notifications: true,
            push_notifications: true,
            appointment_reminders: true,
            payment_reminders: true,
            theme: 'system',
            language: 'en',
            default_dashboard_view: 'overview',
            show_quick_stats: true,
            show_recent_activity: true,
            calendar_view: 'week',
            show_past_appointments: false,
          };

          const { data: newPreferences, error: createError } = await supabase
            .from('user_preferences')
            .insert(defaultPreferences)
            .select()
            .single();

          if (createError) {
            throw createError;
          }

          setData(newPreferences);
        } else {
          throw error;
        }
      } else {
        setData(preferences);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch preferences');
    } finally {
      setLoading(false);
    }
  };

  // Update user preferences
  const updatePreferences = async (updates: UpdateUserPreferencesData) => {
    if (!user || !clinic || !data) return;

    try {
      setError(null);

      const { data: updatedPreferences, error } = await supabase
        .from('user_preferences')
        .update(updates)
        .eq('user_id', user.id)
        .eq('clinic_id', clinic.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      setData(updatedPreferences);
      return { data: updatedPreferences, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update preferences';
      setError(errorMessage);
      return { data: null, error: { message: errorMessage } };
    }
  };

  // Update specific preference
  const updatePreference = async <K extends keyof UpdateUserPreferencesData>(
    key: K,
    value: UpdateUserPreferencesData[K]
  ) => {
    return updatePreferences({ [key]: value } as UpdateUserPreferencesData);
  };

  // Reset preferences to defaults
  const resetPreferences = async () => {
    const defaultPreferences: UpdateUserPreferencesData = {
      email_notifications: true,
      push_notifications: true,
      appointment_reminders: true,
      payment_reminders: true,
      theme: 'system',
      language: 'en',
      default_dashboard_view: 'overview',
      show_quick_stats: true,
      show_recent_activity: true,
      calendar_view: 'week',
      show_past_appointments: false,
    };

    return updatePreferences(defaultPreferences);
  };

  // Fetch preferences when user or clinic changes
  useEffect(() => {
    fetchPreferences();
  }, [user?.id, clinic?.id]);

  return {
    data,
    loading,
    error,
    updatePreferences,
    updatePreference,
    resetPreferences,
    refetch: fetchPreferences,
  };
}; 