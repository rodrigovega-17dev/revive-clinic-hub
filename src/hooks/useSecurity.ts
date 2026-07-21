import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { useAuth } from './useAuth';
import { useClinic } from './useClinic';
import { generateSalt, hashPin, verifyPin, isValidPin } from '@/lib/financePin';

type SecuritySettings = Database['public']['Tables']['security_settings']['Row'];
type UpdateSecuritySettingsData = Partial<Database['public']['Tables']['security_settings']['Update']>;

export const useSecurity = () => {
  const { t } = useTranslation();
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
            finance_pin_required: false,
            finance_pin_salt: null,
            finance_pin_hash: null,
            mask_payroll_expenses: false,
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
      setError(err instanceof Error ? err.message : t('errors.fetchSecuritySettingsFailed'));
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
      const errorMessage = err instanceof Error ? err.message : t('errors.updateSecuritySettingsFailed');
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

  // Set or update 4-digit finance PIN (requires current password)
  const setFinancePin = async (currentPassword: string, newPin: string) => {
    if (!user || !clinic) return { error: { message: t('errors.userNotAuthenticated') } };
    if (!isValidPin(newPin)) return { error: { message: t('security.financePinMustBe4Digits') } };
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
      });
      if (signInError) return { error: { message: t('errors.currentPasswordIncorrect') } };
      const salt = generateSalt();
      const pinHash = await hashPin(salt, newPin);
      const result = await updateSecuritySettings({
        finance_pin_required: true,
        finance_pin_salt: salt,
        finance_pin_hash: pinHash,
      });
      return result ?? { data: null, error: null };
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('errors.updateSecuritySettingsFailed');
      return { data: null, error: { message: msg } };
    }
  };

  /** Disable PIN requirement but keep salt/hash so re-enabling does not require setting the code again. */
  const clearFinancePin = async () => {
    const result = await updateSecuritySettings({
      finance_pin_required: false,
    });
    return result ?? { data: null, error: null };
  };

  /** Disable finance PIN; requires current password. */
  const clearFinancePinWithPassword = async (currentPassword: string) => {
    if (!user) return { error: { message: t('errors.userNotAuthenticated') } };
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
      });
      if (signInError) return { error: { message: t('errors.currentPasswordIncorrect') } };
      return await clearFinancePin();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('errors.updateSecuritySettingsFailed');
      return { data: null, error: { message: msg } };
    }
  };

  const verifyFinancePin = async (enteredPin: string): Promise<boolean> => {
    const salt = securitySettings?.finance_pin_salt;
    const hash = securitySettings?.finance_pin_hash;
    if (!salt || !hash) return false;
    return verifyPin(enteredPin, salt, hash);
  };

  // Change password using Supabase Auth
  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!user) return { error: { message: t('errors.userNotAuthenticated') } };

    try {
      // First, verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
      });

      if (signInError) {
        return { error: { message: t('errors.currentPasswordIncorrect') } };
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
      const errorMessage = err instanceof Error ? err.message : t('errors.changePasswordFailed');
      return { data: null, error: { message: errorMessage } };
    }
  };

  // Change account email using Supabase Auth (requires current password verification)
  const changeEmail = async (currentPassword: string, newEmail: string) => {
    if (!user) return { error: { message: t('errors.userNotAuthenticated') } };
    if (!user.email) return { error: { message: t('errors.authenticationFailed') } };

    try {
      const normalizedEmail = newEmail.trim().toLowerCase();
      if (!normalizedEmail) {
        return { error: { message: t('common.fillRequiredFields') } };
      }

      if (normalizedEmail === user.email.toLowerCase()) {
        return { error: { message: t('security.emailMustBeDifferent') } };
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        return { error: { message: t('errors.currentPasswordIncorrect') } };
      }

      const { error: updateError } = await supabase.auth.updateUser({
        email: normalizedEmail,
      });

      if (updateError) {
        return { error: updateError };
      }

      return { data: null, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('errors.authenticationFailed');
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
      const errorMessage = err instanceof Error ? err.message : t('errors.signOutFailed');
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
      const errorMessage = err instanceof Error ? err.message : t('errors.signOutAllFailed');
      return { data: null, error: { message: errorMessage } };
    }
  };

  // Get session information
  const getSessionInfo = () => {
    if (!currentSession) return null;

    // Debug: Log the session object to understand its structure
    console.log('Current session object:', currentSession);
    console.log('Session expires_at:', currentSession.expires_at);
    console.log('Session expires_at type:', typeof currentSession.expires_at);
    console.log('Access token expires_in:', currentSession.expires_in);
    console.log('Refresh token:', currentSession.refresh_token ? 'Present' : 'Missing');

    const now = new Date();
    
    // Handle expires_at - it could be Unix timestamp (seconds) or ISO string
    let sessionExpiresAt: Date;
    if (currentSession.expires_at) {
      // Check if it's a Unix timestamp (number) or ISO string
      if (typeof currentSession.expires_at === 'number') {
        sessionExpiresAt = new Date(currentSession.expires_at * 1000);
      } else {
        sessionExpiresAt = new Date(currentSession.expires_at);
      }
      
      // Validate the date - if it's invalid or in the past (like 1970), use a default
      if (isNaN(sessionExpiresAt.getTime()) || sessionExpiresAt.getFullYear() < 2020) {
        sessionExpiresAt = new Date(now.getTime() + (securitySettings?.session_timeout_minutes || 480) * 60 * 1000);
      }
    } else {
      // Default to session timeout from settings or 8 hours
      sessionExpiresAt = new Date(now.getTime() + (securitySettings?.session_timeout_minutes || 480) * 60 * 1000);
    }

    // Handle created_at - use user creation time or reasonable default
    let sessionCreatedAt: Date;
    if (currentSession.user?.created_at) {
      sessionCreatedAt = new Date(currentSession.user.created_at);
      // Validate the date
      if (isNaN(sessionCreatedAt.getTime()) || sessionCreatedAt.getFullYear() < 2020) {
        sessionCreatedAt = new Date(now.getTime() - 60000); // 1 minute ago
      }
    } else {
      // Default to 1 minute ago as session start
      sessionCreatedAt = new Date(now.getTime() - 60000);
    }

    return {
      id: currentSession.access_token?.substring(0, 8) || 'current',
      created_at: sessionCreatedAt.toISOString(),
      expires_at: sessionExpiresAt.toISOString(),
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
    changeEmail,
    setFinancePin,
    clearFinancePin,
    clearFinancePinWithPassword,
    verifyFinancePin,
    signOutCurrentDevice,
    signOutFromAllDevices,
    refetch: () => {
      fetchSecuritySettings();
      fetchCurrentSession();
    },
  };
}; 