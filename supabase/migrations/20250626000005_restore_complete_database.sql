-- Restore complete database structure
-- Migration: 20250626000005_restore_complete_database.sql

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT DEFAULT '',
  last_name TEXT DEFAULT '',
  role user_role DEFAULT 'admin',
  clinic_id UUID,
  is_clinic_owner BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create clinics table
CREATE TABLE IF NOT EXISTS public.clinics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  timezone TEXT DEFAULT 'UTC',
  currency TEXT DEFAULT 'USD',
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  google_calendar_auth JSONB,
  google_calendar_selected_id TEXT,
  google_calendar_enabled BOOLEAN DEFAULT false,
  google_calendar_sync_settings JSONB DEFAULT '{}',
  subscription_status VARCHAR(50) DEFAULT 'trial',
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  subscription_plan_id UUID,
  stripe_customer_id VARCHAR(255)
);

-- Create therapists table
CREATE TABLE IF NOT EXISTS public.therapists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  first_name TEXT DEFAULT '',
  last_name TEXT DEFAULT '',
  email TEXT,
  phone TEXT,
  percentage DECIMAL(5,2) DEFAULT 70.00,
  calendar_color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create treatments table
CREATE TABLE IF NOT EXISTS public.treatments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER DEFAULT 60,
  price DECIMAL(10,2) DEFAULT 0,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create clients table
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  birth_date DATE,
  gender gender_type,
  address TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  medical_notes TEXT,
  charge_amount NUMERIC DEFAULT 0,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES public.therapists(id) ON DELETE CASCADE,
  treatment_id UUID REFERENCES public.treatments(id) ON DELETE SET NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status appointment_status DEFAULT 'scheduled',
  notes TEXT,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sync_status TEXT DEFAULT 'pending',
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_error_message TEXT,
  google_calendar_version TEXT,
  local_version INTEGER DEFAULT 1,
  payment_status TEXT DEFAULT 'pending',
  payment_amount NUMERIC DEFAULT 0,
  payment_method TEXT,
  payment_date TIMESTAMP WITH TIME ZONE
);

-- Create suppliers table
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL,
  category TEXT,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shifts table
CREATE TABLE IF NOT EXISTS public.shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  therapist_id UUID NOT NULL REFERENCES public.therapists(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  received_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL,
  facturado BOOLEAN DEFAULT false,
  iva_amount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sync_logs table
CREATE TABLE IF NOT EXISTS public.sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create daily_cash_summary table
CREATE TABLE IF NOT EXISTS public.daily_cash_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  opening_cash NUMERIC DEFAULT 0,
  closing_cash NUMERIC DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  total_expenses NUMERIC DEFAULT 0,
  cash_payments NUMERIC DEFAULT 0,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  appointment_reminders BOOLEAN DEFAULT true,
  payment_reminders BOOLEAN DEFAULT true,
  theme TEXT DEFAULT 'system',
  language TEXT DEFAULT 'en',
  default_dashboard_view TEXT DEFAULT 'overview',
  show_quick_stats BOOLEAN DEFAULT true,
  show_recent_activity BOOLEAN DEFAULT true,
  calendar_view TEXT DEFAULT 'week',
  show_past_appointments BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, clinic_id)
);

-- Create security_settings table
CREATE TABLE IF NOT EXISTS public.security_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  two_factor_enabled BOOLEAN DEFAULT false,
  backup_codes TEXT[],
  login_notifications BOOLEAN DEFAULT true,
  session_timeout_minutes INTEGER DEFAULT 480,
  max_login_attempts INTEGER DEFAULT 5,
  password_expiry_days INTEGER DEFAULT 90,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, clinic_id)
);

-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2) NOT NULL,
  price_yearly DECIMAL(10,2) NOT NULL,
  max_therapists INTEGER NOT NULL,
  features JSONB NOT NULL DEFAULT '[]',
  stripe_monthly_price_id VARCHAR(255),
  stripe_yearly_price_id VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  is_popular BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create clinic_subscriptions table
CREATE TABLE IF NOT EXISTS public.clinic_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMP WITH TIME ZONE,
  trial_start TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(clinic_id)
);

-- Create subscription_usage table
CREATE TABLE IF NOT EXISTS public.subscription_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES public.clinic_subscriptions(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  therapist_count INTEGER NOT NULL DEFAULT 0,
  appointment_count INTEGER NOT NULL DEFAULT 0,
  client_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(clinic_id, date)
);

-- Create subscription_invoices table
CREATE TABLE IF NOT EXISTS public.subscription_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES public.clinic_subscriptions(id) ON DELETE CASCADE,
  stripe_invoice_id VARCHAR(255) UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) NOT NULL,
  invoice_date TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create custom types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'therapist', 'reception');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE appointment_status AS ENUM ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_clinic_id ON public.profiles (clinic_id);
CREATE INDEX IF NOT EXISTS idx_profiles_is_clinic_owner ON public.profiles (is_clinic_owner);
CREATE INDEX IF NOT EXISTS idx_clinics_slug ON public.clinics (slug);
CREATE INDEX IF NOT EXISTS idx_clinics_is_active ON public.clinics (is_active);
CREATE INDEX IF NOT EXISTS idx_therapists_clinic_id ON public.therapists (clinic_id);
CREATE INDEX IF NOT EXISTS idx_treatments_clinic_id ON public.treatments (clinic_id);
CREATE INDEX IF NOT EXISTS idx_clients_clinic_id ON public.clients (clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id ON public.appointments (clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON public.appointments (start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_therapist_start_time ON public.appointments (therapist_id, start_time);
CREATE INDEX IF NOT EXISTS idx_suppliers_clinic_id ON public.suppliers (clinic_id);
CREATE INDEX IF NOT EXISTS idx_expenses_clinic_id ON public.expenses (clinic_id);
CREATE INDEX IF NOT EXISTS idx_shifts_clinic_id ON public.shifts (clinic_id);
CREATE INDEX IF NOT EXISTS idx_payments_clinic_id ON public.payments (clinic_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_clinic_id ON public.sync_logs (clinic_id);
CREATE INDEX IF NOT EXISTS idx_daily_cash_summary_clinic_id ON public.daily_cash_summary (clinic_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences (user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_clinic_id ON public.user_preferences (clinic_id);
CREATE INDEX IF NOT EXISTS idx_security_settings_user_id ON public.security_settings (user_id);
CREATE INDEX IF NOT EXISTS idx_security_settings_clinic_id ON public.security_settings (clinic_id);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_slug ON public.subscription_plans (slug);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON public.subscription_plans (is_active);
CREATE INDEX IF NOT EXISTS idx_clinic_subscriptions_clinic_id ON public.clinic_subscriptions (clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_subscriptions_status ON public.clinic_subscriptions (status);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_clinic_date ON public.subscription_usage (clinic_id, date);
CREATE INDEX IF NOT EXISTS idx_subscription_invoices_clinic_id ON public.subscription_invoices (clinic_id);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.therapists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_cash_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_invoices ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can view their own clinic" ON public.clinics FOR SELECT USING (id IN (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Clinic owners can manage their clinic" ON public.clinics FOR ALL USING (id IN (SELECT clinic_id FROM public.profiles WHERE id = auth.uid() AND is_clinic_owner = true));
CREATE POLICY "Users can only access their clinic's data" ON public.therapists FOR ALL USING (clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can only access their clinic's data" ON public.treatments FOR ALL USING (clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can only access their clinic's data" ON public.clients FOR ALL USING (clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can only access their clinic's data" ON public.appointments FOR ALL USING (clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can only access their clinic's data" ON public.suppliers FOR ALL USING (clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can only access their clinic's data" ON public.expenses FOR ALL USING (clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can only access their clinic's data" ON public.shifts FOR ALL USING (clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can only access their clinic's data" ON public.payments FOR ALL USING (clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can only access their clinic's data" ON public.sync_logs FOR ALL USING (clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can only access their clinic's data" ON public.daily_cash_summary FOR ALL USING (clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can view their own preferences" ON public.user_preferences FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can manage their own preferences" ON public.user_preferences FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can view their own security settings" ON public.security_settings FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can manage their own security settings" ON public.security_settings FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Authenticated users can view subscription plans" ON public.subscription_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can only access their clinic's subscriptions" ON public.clinic_subscriptions FOR ALL USING (clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can only access their clinic's usage" ON public.subscription_usage FOR ALL USING (clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can only access their clinic's invoices" ON public.subscription_invoices FOR ALL USING (clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()));

-- Create functions
CREATE OR REPLACE FUNCTION public.get_user_clinic_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT clinic_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_clinic_owner()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT is_clinic_owner FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_user_therapist_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT t.id FROM public.therapists t 
  JOIN public.profiles p ON t.user_id = p.id 
  WHERE p.id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION public.generate_backup_codes()
RETURNS TEXT[] AS $$
DECLARE
  codes TEXT[] := ARRAY[]::TEXT[];
  i INTEGER;
BEGIN
  FOR i IN 1..10 LOOP
    codes := array_append(codes, 
      upper(substring(md5(random()::text) from 1 for 8))
    );
  END LOOP;
  
  RETURN codes;
END;
$$ LANGUAGE plpgsql;

-- Create user creation function
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

-- Create triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clinics_updated_at BEFORE UPDATE ON public.clinics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_therapists_updated_at BEFORE UPDATE ON public.therapists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_treatments_updated_at BEFORE UPDATE ON public.treatments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shifts_updated_at BEFORE UPDATE ON public.shifts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_cash_summary_updated_at BEFORE UPDATE ON public.daily_cash_summary
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at_trigger BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_security_settings_updated_at_trigger BEFORE UPDATE ON public.security_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clinic_subscriptions_updated_at BEFORE UPDATE ON public.clinic_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscription_invoices_updated_at BEFORE UPDATE ON public.subscription_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default subscription plans
INSERT INTO public.subscription_plans (name, slug, description, price_monthly, price_yearly, max_therapists, features, is_popular, sort_order) VALUES
(
  'Starter',
  'starter',
  'Perfect for small clinics just getting started',
  29.00,
  290.00,
  3,
  '["Unlimited appointments", "Client management", "Basic reporting", "Email support"]',
  false,
  1
),
(
  'Professional',
  'professional',
  'Ideal for growing clinics with multiple therapists',
  49.00,
  490.00,
  5,
  '["Everything in Starter", "Advanced reporting", "Google Calendar sync", "Priority support", "Custom branding"]',
  true,
  2
),
(
  'Enterprise',
  'enterprise',
  'For established clinics with larger teams',
  89.00,
  890.00,
  10,
  '["Everything in Professional", "Advanced analytics", "API access", "Dedicated support", "Custom integrations"]',
  false,
  3
)
ON CONFLICT (slug) DO NOTHING; 
 
 