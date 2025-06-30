-- Fix subscription trigger functions
-- Migration: 20250626000001_fix_subscription_triggers.sql

-- Drop problematic triggers first
DROP TRIGGER IF EXISTS update_usage_on_therapist_change ON therapists;
DROP TRIGGER IF EXISTS update_usage_on_appointment_change ON appointments;
DROP TRIGGER IF EXISTS update_usage_on_client_change ON clients;
DROP TRIGGER IF EXISTS enforce_therapist_limits ON therapists;

-- Drop problematic functions
DROP FUNCTION IF EXISTS update_subscription_usage();
DROP FUNCTION IF EXISTS check_subscription_limits();

-- Create fixed function to check subscription limits
CREATE OR REPLACE FUNCTION check_subscription_limits()
RETURNS TRIGGER AS $$
DECLARE
  current_therapist_count INTEGER;
  max_therapists INTEGER;
  clinic_subscription_status VARCHAR(50);
BEGIN
  -- Only check on INSERT, not UPDATE
  IF TG_OP = 'UPDATE' THEN
    RETURN NEW;
  END IF;

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

-- Create fixed function to update subscription usage
CREATE OR REPLACE FUNCTION update_subscription_usage()
RETURNS TRIGGER AS $$
DECLARE
  usage_date DATE := CURRENT_DATE;
  therapist_count INTEGER;
  appointment_count INTEGER;
  client_count INTEGER;
  clinic_uuid UUID;
BEGIN
  -- Determine clinic_id based on operation
  IF TG_OP = 'DELETE' THEN
    clinic_uuid := OLD.clinic_id;
  ELSE
    clinic_uuid := NEW.clinic_id;
  END IF;

  -- Skip if no clinic_id
  IF clinic_uuid IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Get current counts for the clinic
  SELECT 
    COUNT(*) FILTER (WHERE is_active = true),
    (SELECT COUNT(*) FROM appointments WHERE clinic_id = clinic_uuid AND DATE(start_time) = usage_date),
    (SELECT COUNT(*) FROM clients WHERE clinic_id = clinic_uuid AND is_active = true)
  INTO therapist_count, appointment_count, client_count
  FROM therapists
  WHERE clinic_id = clinic_uuid;
  
  -- Only update if there's an active subscription
  INSERT INTO subscription_usage (clinic_id, subscription_id, date, therapist_count, appointment_count, client_count)
  SELECT 
    clinic_uuid,
    cs.id,
    usage_date,
    therapist_count,
    appointment_count,
    client_count
  FROM clinic_subscriptions cs
  WHERE cs.clinic_id = clinic_uuid AND cs.status = 'active'
  ON CONFLICT (clinic_id, date) DO UPDATE SET
    therapist_count = EXCLUDED.therapist_count,
    appointment_count = EXCLUDED.appointment_count,
    client_count = EXCLUDED.client_count,
    updated_at = NOW();
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recreate triggers with proper conditions
CREATE TRIGGER enforce_therapist_limits
  BEFORE INSERT ON therapists
  FOR EACH ROW
  EXECUTE FUNCTION check_subscription_limits();

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
 
 