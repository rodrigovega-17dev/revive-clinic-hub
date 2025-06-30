-- Fix user signup triggers to prevent conflicts
-- Migration: 20250626000003_fix_user_signup_triggers.sql

-- Drop all existing triggers on auth.users to start fresh
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS create_user_preferences_trigger ON auth.users;
DROP TRIGGER IF EXISTS create_security_settings_trigger ON auth.users;

-- Drop the conflicting functions
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS create_user_preferences();
DROP FUNCTION IF EXISTS create_security_settings();

-- Create a single comprehensive function to handle all user creation tasks
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clinic_id UUID;
  clinic_name TEXT;
  clinic_slug TEXT;
  counter INTEGER := 0;
  base_slug TEXT;
BEGIN
  -- Generate clinic name from user's name
  clinic_name := COALESCE(NEW.raw_user_meta_data->>'first_name', 'User') || '''s Clinic';
  
  -- Generate base slug from email (before @)
  base_slug := LOWER(REGEXP_REPLACE(
    SPLIT_PART(NEW.email, '@', 1), 
    '[^a-zA-Z0-9]', 
    '-', 
    'g'
  ));
  
  -- Ensure slug is unique by adding counter if needed
  clinic_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.clinics WHERE slug = clinic_slug) LOOP
    counter := counter + 1;
    clinic_slug := base_slug || '-' || counter::TEXT;
  END LOOP;
  
  -- Create the clinic
  INSERT INTO public.clinics (name, slug, email, timezone, currency, subscription_status)
  VALUES (
    clinic_name,
    clinic_slug,
    NEW.email,
    'UTC',
    'USD',
    'trial'
  )
  RETURNING id INTO clinic_id;
  
  -- Create the user profile and link to the clinic
  INSERT INTO public.profiles (id, email, first_name, last_name, clinic_id, is_clinic_owner)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    clinic_id,
    true  -- New users are owners of their clinic
  );
  
  -- Create user preferences
  INSERT INTO user_preferences (
    user_id, 
    clinic_id,
    email_notifications,
    push_notifications,
    appointment_reminders,
    payment_reminders,
    theme,
    language,
    default_dashboard_view,
    show_quick_stats,
    show_recent_activity,
    calendar_view,
    show_past_appointments
  )
  VALUES (
    NEW.id,
    clinic_id,
    true,
    true,
    true,
    true,
    'system',
    'en',
    'overview',
    true,
    true,
    'week',
    false
  );
  
  -- Create security settings
  INSERT INTO security_settings (
    user_id,
    clinic_id,
    two_factor_enabled,
    backup_codes,
    login_notifications,
    session_timeout_minutes,
    max_login_attempts,
    password_expiry_days
  )
  VALUES (
    NEW.id,
    clinic_id,
    false,
    generate_backup_codes(),
    true,
    480, -- 8 hours
    5,
    90
  );
  
  RETURN NEW;
END;
$$;

-- Create a single trigger for all user creation tasks
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user(); 
 
 