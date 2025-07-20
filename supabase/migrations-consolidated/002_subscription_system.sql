-- Subscription System Migration
-- This migration adds subscription and billing functionality

-- Create subscription plans table
CREATE TABLE IF NOT EXISTS "public"."subscription_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "slug" character varying(50) NOT NULL,
    "description" "text",
    "price_monthly" numeric(10,2) NOT NULL,
    "price_yearly" numeric(10,2) NOT NULL,
    "max_therapists" integer NOT NULL,
    "features" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "stripe_monthly_price_id" character varying(255),
    "stripe_yearly_price_id" character varying(255),
    "is_active" boolean DEFAULT true,
    "is_popular" boolean DEFAULT false,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

-- Create clinic subscriptions table
CREATE TABLE IF NOT EXISTS "public"."clinic_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clinic_id" "uuid" NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "stripe_customer_id" character varying(255),
    "stripe_subscription_id" character varying(255),
    "status" character varying(50) DEFAULT 'active'::character varying NOT NULL,
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "cancel_at_period_end" boolean DEFAULT false,
    "canceled_at" timestamp with time zone,
    "trial_start" timestamp with time zone,
    "trial_end" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

-- Create subscription usage table
CREATE TABLE IF NOT EXISTS "public"."subscription_usage" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clinic_id" "uuid" NOT NULL,
    "subscription_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "therapist_count" integer DEFAULT 0 NOT NULL,
    "appointment_count" integer DEFAULT 0 NOT NULL,
    "client_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);

-- Create subscription invoices table
CREATE TABLE IF NOT EXISTS "public"."subscription_invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clinic_id" "uuid" NOT NULL,
    "subscription_id" "uuid" NOT NULL,
    "stripe_invoice_id" character varying(255),
    "amount" numeric(10,2) NOT NULL,
    "currency" character varying(3) DEFAULT 'USD'::character varying,
    "status" character varying(50) NOT NULL,
    "invoice_date" timestamp with time zone,
    "due_date" timestamp with time zone,
    "paid_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

-- Add primary key constraints
ALTER TABLE ONLY "public"."subscription_plans" ADD CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."clinic_subscriptions" ADD CONSTRAINT "clinic_subscriptions_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."subscription_usage" ADD CONSTRAINT "subscription_usage_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."subscription_invoices" ADD CONSTRAINT "subscription_invoices_pkey" PRIMARY KEY ("id");

-- Add unique constraints
ALTER TABLE ONLY "public"."subscription_plans" ADD CONSTRAINT "subscription_plans_slug_key" UNIQUE ("slug");
ALTER TABLE ONLY "public"."clinic_subscriptions" ADD CONSTRAINT "clinic_subscriptions_clinic_id_key" UNIQUE ("clinic_id");
ALTER TABLE ONLY "public"."subscription_usage" ADD CONSTRAINT "subscription_usage_clinic_id_date_key" UNIQUE ("clinic_id", "date");
ALTER TABLE ONLY "public"."subscription_invoices" ADD CONSTRAINT "subscription_invoices_stripe_invoice_id_key" UNIQUE ("stripe_invoice_id");

-- Add foreign key constraints
ALTER TABLE ONLY "public"."clinic_subscriptions" ADD CONSTRAINT "clinic_subscriptions_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."clinic_subscriptions" ADD CONSTRAINT "clinic_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id");
ALTER TABLE ONLY "public"."subscription_usage" ADD CONSTRAINT "subscription_usage_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."subscription_usage" ADD CONSTRAINT "subscription_usage_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."clinic_subscriptions"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."subscription_invoices" ADD CONSTRAINT "subscription_invoices_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."subscription_invoices" ADD CONSTRAINT "subscription_invoices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."clinic_subscriptions"("id") ON DELETE CASCADE;

-- Create performance indexes for subscription queries
CREATE INDEX IF NOT EXISTS "idx_subscription_plans_slug" ON "public"."subscription_plans" USING "btree" ("slug");
CREATE INDEX IF NOT EXISTS "idx_subscription_plans_active" ON "public"."subscription_plans" USING "btree" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_subscription_plans_active_sorted" ON "public"."subscription_plans" USING "btree" ("is_active", "sort_order") WHERE "is_active" = true;
CREATE INDEX IF NOT EXISTS "idx_clinic_subscriptions_clinic_id" ON "public"."clinic_subscriptions" USING "btree" ("clinic_id");
CREATE INDEX IF NOT EXISTS "idx_clinic_subscriptions_status" ON "public"."clinic_subscriptions" USING "btree" ("status");
CREATE INDEX IF NOT EXISTS "idx_subscription_usage_clinic_date" ON "public"."subscription_usage" USING "btree" ("clinic_id", "date");
CREATE INDEX IF NOT EXISTS "idx_subscription_invoices_clinic_id" ON "public"."subscription_invoices" USING "btree" ("clinic_id");

-- Create update triggers for subscription tables
CREATE OR REPLACE TRIGGER "update_subscription_plans_updated_at" BEFORE UPDATE ON "public"."subscription_plans" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_clinic_subscriptions_updated_at" BEFORE UPDATE ON "public"."clinic_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_subscription_invoices_updated_at" BEFORE UPDATE ON "public"."subscription_invoices" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

-- Insert default subscription plans
INSERT INTO "public"."subscription_plans" ("name", "slug", "description", "price_monthly", "price_yearly", "max_therapists", "features", "is_popular", "sort_order") VALUES
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
ON CONFLICT ("slug") DO NOTHING;

-- Create function to check subscription limits
CREATE OR REPLACE FUNCTION "public"."check_subscription_limits"()
RETURNS TRIGGER AS $$
DECLARE
  current_therapist_count INTEGER;
  max_therapists INTEGER;
  clinic_subscription_id UUID;
BEGIN
  -- Get the clinic's subscription info
  SELECT cs.id, sp.max_therapists 
  INTO clinic_subscription_id, max_therapists
  FROM clinic_subscriptions cs
  JOIN subscription_plans sp ON cs.plan_id = sp.id
  WHERE cs.clinic_id = NEW.clinic_id
    AND cs.status = 'active';
  
  -- If no active subscription found, allow (trial period)
  IF max_therapists IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Count current active therapists
  SELECT COUNT(*)
  INTO current_therapist_count
  FROM therapists
  WHERE clinic_id = NEW.clinic_id
    AND is_active = true;
  
  -- Check if adding this therapist would exceed the limit
  IF TG_OP = 'INSERT' AND current_therapist_count >= max_therapists THEN
    RAISE EXCEPTION 'Subscription limit exceeded. Your plan allows up to % therapists.', max_therapists;
  END IF;
  
  -- Check if updating to active would exceed the limit
  IF TG_OP = 'UPDATE' AND NEW.is_active = true AND OLD.is_active = false THEN
    IF current_therapist_count >= max_therapists THEN
      RAISE EXCEPTION 'Subscription limit exceeded. Your plan allows up to % therapists.', max_therapists;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to update subscription usage
CREATE OR REPLACE FUNCTION "public"."update_subscription_usage"()
RETURNS TRIGGER AS $$
DECLARE
  clinic_uuid UUID;
  subscription_uuid UUID;
  usage_date DATE := CURRENT_DATE;
BEGIN
  -- Determine clinic_id based on the table
  IF TG_TABLE_NAME = 'therapists' THEN
    clinic_uuid := COALESCE(NEW.clinic_id, OLD.clinic_id);
  ELSIF TG_TABLE_NAME = 'appointments' THEN
    clinic_uuid := COALESCE(NEW.clinic_id, OLD.clinic_id);
  ELSIF TG_TABLE_NAME = 'clients' THEN
    clinic_uuid := COALESCE(NEW.clinic_id, OLD.clinic_id);
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Get subscription ID
  SELECT id INTO subscription_uuid
  FROM clinic_subscriptions
  WHERE clinic_id = clinic_uuid
    AND status = 'active';
  
  -- If no active subscription, skip usage tracking
  IF subscription_uuid IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Update or insert usage record
  INSERT INTO subscription_usage (
    clinic_id,
    subscription_id,
    date,
    therapist_count,
    appointment_count,
    client_count
  )
  VALUES (
    clinic_uuid,
    subscription_uuid,
    usage_date,
    (SELECT COUNT(*) FROM therapists WHERE clinic_id = clinic_uuid AND is_active = true),
    (SELECT COUNT(*) FROM appointments WHERE clinic_id = clinic_uuid AND DATE(created_at) = usage_date),
    (SELECT COUNT(*) FROM clients WHERE clinic_id = clinic_uuid AND is_active = true)
  )
  ON CONFLICT (clinic_id, date)
  DO UPDATE SET
    therapist_count = (SELECT COUNT(*) FROM therapists WHERE clinic_id = clinic_uuid AND is_active = true),
    appointment_count = (SELECT COUNT(*) FROM appointments WHERE clinic_id = clinic_uuid AND DATE(created_at) = usage_date),
    client_count = (SELECT COUNT(*) FROM clients WHERE clinic_id = clinic_uuid AND is_active = true);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for subscription limits and usage tracking
CREATE OR REPLACE TRIGGER "check_therapist_subscription_limits"
  BEFORE INSERT OR UPDATE ON "public"."therapists"
  FOR EACH ROW
  EXECUTE FUNCTION "public"."check_subscription_limits"();

CREATE OR REPLACE TRIGGER "update_usage_on_therapist_change"
  AFTER INSERT OR UPDATE OR DELETE ON "public"."therapists"
  FOR EACH ROW
  EXECUTE FUNCTION "public"."update_subscription_usage"();

CREATE OR REPLACE TRIGGER "update_usage_on_appointment_change"
  AFTER INSERT OR UPDATE OR DELETE ON "public"."appointments"
  FOR EACH ROW
  EXECUTE FUNCTION "public"."update_subscription_usage"();

CREATE OR REPLACE TRIGGER "update_usage_on_client_change"
  AFTER INSERT OR UPDATE OR DELETE ON "public"."clients"
  FOR EACH ROW
  EXECUTE FUNCTION "public"."update_subscription_usage"();