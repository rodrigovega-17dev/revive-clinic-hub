import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { useAuth } from './useAuth';
import { useClinic } from './useClinic';

type SecuritySettings = Database['public']['Tables']['security_settings']['Row'];
type UpdateSecuritySettingsData = Partial<Database['public']['Tables']['security_settings']['Update']>;

export const useSecurity = () => {
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings | null>(null);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { data: clinic } = useClinic();

  // Fetch security settings
  const fetchSecuritySettings = async () => {
    if (!user || !clinic) return;

    try {
      setLoading(true);
      setError(null);

      const { data: settings, error } = await supabase
        .from('security_settings')
        .select('*')
        .eq('user_id', user.id)
        .eq('clinic_id', clinic.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No settings found, create default ones
          const defaultSettings = {
            user_id: user.id,
            clinic_id: clinic.id,
            two_factor_enabled: false,
            two_factor_method: 'email',
            backup_codes: null,
            password_changed_at: new Date().toISOString(),
            require_password_change: false,
            max_concurrent_sessions: 5,
            session_timeout_minutes: 480,
            login_notifications: true,
            suspicious_activity_alerts: true,
          };

          const { data: newSettings, error: createError } = await supabase
            .from('security_settings')
            .insert(defaultSettings)
            .select()
            .single();

          if (createError) {
            throw createError;
          }

          setSecuritySettings(newSettings);
        } else {
          throw error;
        }
      } else {
        setSecuritySettings(settings);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch security settings');
    } finally {
      setLoading(false);
    }
  };

  // Get current session from Supabase
  const fetchCurrentSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        throw error;
      }
      setCurrentSession(session);
    } catch (err) {
      console.error('Error fetching current session:', err);
    }
  };

  // Update security settings
  const updateSecuritySettings = async (updates: UpdateSecuritySettingsData) => {
    if (!user || !clinic || !securitySettings) return;

    try {
      setError(null);

      const { data: updatedSettings, error } = await supabase
        .from('security_settings')
        .update(updates)
        .eq('user_id', user.id)
        .eq('clinic_id', clinic.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      setSecuritySettings(updatedSettings);
      return { data: updatedSettings, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update security settings';
      setError(errorMessage);
      return { data: null, error: { message: errorMessage } };
    }
  };

  // Enable/disable two-factor authentication
  const toggleTwoFactor = async (enabled: boolean, method: 'email' | 'sms' | 'app' = 'email') => {
    const updates: UpdateSecuritySettingsData = {
      two_factor_enabled: enabled,
      two_factor_method: method,
    };

    if (enabled) {
      // Generate backup codes when enabling 2FA
      const { data: backupCodes } = await supabase.rpc('generate_backup_codes');
      updates.backup_codes = backupCodes as string[];
    } else {
      // Clear backup codes when disabling 2FA
      updates.backup_codes = null;
    }

    return updateSecuritySettings(updates);
  };

  // Change password using Supabase Auth
  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!user) return { error: { message: 'User not authenticated' } };

    try {
      // First, verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
      });

      if (signInError) {
        return { error: { message: 'Current password is incorrect' } };
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        return { error: updateError };
      }

      // Update password changed timestamp
      await updateSecuritySettings({
        password_changed_at: new Date().toISOString(),
        require_password_change: false,
      });

      return { data: null, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to change password';
      return { data: null, error: { message: errorMessage } };
    }
  };

  // Sign out from current device only
  const signOutCurrentDevice = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      return { data: null, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign out';
      return { data: null, error: { message: errorMessage } };
    }
  };

  // Sign out from all devices (global sign out)
  const signOutFromAllDevices = async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) {
        throw error;
      }
      return { data: null, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign out from all devices';
      return { data: null, error: { message: errorMessage } };
    }
  };

  // Get session information
  const getSessionInfo = () => {
    if (!currentSession) return null;

    // Safely parse dates with fallbacks
    const created_at = currentSession.created_at 
      ? new Date(currentSession.created_at).toISOString()
      : new Date().toISOString();
    
    const expires_at = currentSession.expires_at 
      ? new Date(currentSession.expires_at).toISOString()
      : new Date(Date.now() + 3600000).toISOString(); // Default 1 hour from now

    return {
      id: currentSession.access_token,
      created_at,
      expires_at,
      user_agent: navigator.userAgent,
      ip_address: 'Current device', // Would need server-side to get real IP
      is_current: true,
    };
  };

  // Fetch data when user or clinic changes
  useEffect(() => {
    fetchSecuritySettings();
    fetchCurrentSession();
  }, [user?.id, clinic?.id]);

  return {
    securitySettings,
    currentSession,
    sessionInfo: getSessionInfo(),
    loading,
    error,
    updateSecuritySettings,
    toggleTwoFactor,
    changePassword,
    signOutCurrentDevice,
    signOutFromAllDevices,
    refetch: () => {
      fetchSecuritySettings();
      fetchCurrentSession();
    },
  };
}; 