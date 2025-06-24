-- Add subscription system tables and functionality
-- Migration: 20250626000000_add-subscription-system.sql

-- Create subscription plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
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

-- Create clinic subscriptions table
CREATE TABLE IF NOT EXISTS clinic_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, past_due, canceled, incomplete, incomplete_expired, trialing, unpaid
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

-- Create subscription usage tracking table
CREATE TABLE IF NOT EXISTS subscription_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES clinic_subscriptions(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  therapist_count INTEGER NOT NULL DEFAULT 0,
  appointment_count INTEGER NOT NULL DEFAULT 0,
  client_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(clinic_id, date)
);

-- Create subscription invoices table
CREATE TABLE IF NOT EXISTS subscription_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES clinic_subscriptions(id) ON DELETE CASCADE,
  stripe_invoice_id VARCHAR(255) UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) NOT NULL, -- draft, open, paid, uncollectible, void
  invoice_date TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add subscription fields to clinics table
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'trial';
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS subscription_plan_id UUID REFERENCES subscription_plans(id);
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscription_plans_slug ON subscription_plans(slug);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_clinic_subscriptions_clinic_id ON clinic_subscriptions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_subscriptions_status ON clinic_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_clinic_subscriptions_stripe_customer_id ON clinic_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_clinic_subscriptions_stripe_subscription_id ON clinic_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_clinic_date ON subscription_usage(clinic_id, date);
CREATE INDEX IF NOT EXISTS idx_subscription_invoices_clinic_id ON subscription_invoices(clinic_id);
CREATE INDEX IF NOT EXISTS idx_subscription_invoices_stripe_id ON subscription_invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_clinics_subscription_status ON clinics(subscription_status);
CREATE INDEX IF NOT EXISTS idx_clinics_stripe_customer_id ON clinics(stripe_customer_id);

-- Insert default subscription plans
INSERT INTO subscription_plans (name, slug, description, price_monthly, price_yearly, max_therapists, features, is_popular, sort_order) VALUES
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
);

-- Create function to check subscription limits
CREATE OR REPLACE FUNCTION check_subscription_limits()
RETURNS TRIGGER AS $$
DECLARE
  current_therapist_count INTEGER;
  max_therapists INTEGER;
  clinic_subscription_status VARCHAR(50);
BEGIN
  -- Get current therapist count for the clinic
  SELECT COUNT(*) INTO current_therapist_count
  FROM therapists
  WHERE clinic_id = NEW.clinic_id AND is_active = true;
  
  -- Get clinic subscription status
  SELECT subscription_status INTO clinic_subscription_status
  FROM clinics
  WHERE id = NEW.clinic_id;
  
  -- If clinic is on trial, allow up to 3 therapists
  IF clinic_subscription_status = 'trial' THEN
    max_therapists := 3;
  ELSE
    -- Get max therapists from subscription plan
    SELECT sp.max_therapists INTO max_therapists
    FROM clinics c
    JOIN subscription_plans sp ON c.subscription_plan_id = sp.id
    WHERE c.id = NEW.clinic_id;
    
    -- Default to 3 if no plan found
    IF max_therapists IS NULL THEN
      max_therapists := 3;
    END IF;
  END IF;
  
  -- Check if adding this therapist would exceed the limit
  IF current_therapist_count >= max_therapists THEN
    RAISE EXCEPTION 'Therapist limit exceeded. Current plan allows % therapists. Please upgrade your subscription.', max_therapists;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce therapist limits
CREATE TRIGGER enforce_therapist_limits
  BEFORE INSERT ON therapists
  FOR EACH ROW
  EXECUTE FUNCTION check_subscription_limits();

-- Create function to update subscription usage
CREATE OR REPLACE FUNCTION update_subscription_usage()
RETURNS TRIGGER AS $$
DECLARE
  usage_date DATE := CURRENT_DATE;
  therapist_count INTEGER;
  appointment_count INTEGER;
  client_count INTEGER;
BEGIN
  -- Get current counts for the clinic
  SELECT 
    COUNT(*) FILTER (WHERE is_active = true),
    (SELECT COUNT(*) FROM appointments WHERE clinic_id = NEW.clinic_id AND DATE(start_time) = usage_date),
    (SELECT COUNT(*) FROM clients WHERE clinic_id = NEW.clinic_id AND is_active = true)
  INTO therapist_count, appointment_count, client_count
  FROM therapists
  WHERE clinic_id = NEW.clinic_id;
  
  -- Insert or update usage record
  INSERT INTO subscription_usage (clinic_id, subscription_id, date, therapist_count, appointment_count, client_count)
  SELECT 
    NEW.clinic_id,
    cs.id,
    usage_date,
    therapist_count,
    appointment_count,
    client_count
  FROM clinic_subscriptions cs
  WHERE cs.clinic_id = NEW.clinic_id AND cs.status = 'active'
  ON CONFLICT (clinic_id, date) DO UPDATE SET
    therapist_count = EXCLUDED.therapist_count,
    appointment_count = EXCLUDED.appointment_count,
    client_count = EXCLUDED.client_count,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to update usage when data changes
CREATE TRIGGER update_usage_on_therapist_change
  AFTER INSERT OR UPDATE OR DELETE ON therapists
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_usage();

CREATE TRIGGER update_usage_on_appointment_change
  AFTER INSERT OR UPDATE OR DELETE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_usage();

CREATE TRIGGER update_usage_on_client_change
  AFTER INSERT OR UPDATE OR DELETE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_usage();

-- Create function to get subscription status
CREATE OR REPLACE FUNCTION get_clinic_subscription_status(clinic_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'status', c.subscription_status,
    'trial_ends_at', c.trial_ends_at,
    'plan', json_build_object(
      'id', sp.id,
      'name', sp.name,
      'slug', sp.slug,
      'max_therapists', sp.max_therapists,
      'price_monthly', sp.price_monthly,
      'price_yearly', sp.price_yearly
    ),
    'subscription', json_build_object(
      'id', cs.id,
      'status', cs.status,
      'current_period_end', cs.current_period_end,
      'cancel_at_period_end', cs.cancel_at_period_end
    ),
    'usage', json_build_object(
      'therapist_count', (SELECT COUNT(*) FROM therapists WHERE clinic_id = clinic_uuid AND is_active = true),
      'appointment_count', (SELECT COUNT(*) FROM appointments WHERE clinic_id = clinic_uuid AND DATE(start_time) = CURRENT_DATE),
      'client_count', (SELECT COUNT(*) FROM clients WHERE clinic_id = clinic_uuid AND is_active = true)
    )
  ) INTO result
  FROM clinics c
  LEFT JOIN subscription_plans sp ON c.subscription_plan_id = sp.id
  LEFT JOIN clinic_subscriptions cs ON c.id = cs.clinic_id
  WHERE c.id = clinic_uuid;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clinic_subscriptions_updated_at
  BEFORE UPDATE ON clinic_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_invoices_updated_at
  BEFORE UPDATE ON subscription_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 