-- Current State Migration
-- This migration adds RLS policies, user preferences, security settings, and final configurations

-- Create user preferences table
CREATE TABLE IF NOT EXISTS "public"."user_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "clinic_id" "uuid" NOT NULL,
    "email_notifications" boolean DEFAULT true,
    "push_notifications" boolean DEFAULT true,
    "appointment_reminders" boolean DEFAULT true,
    "payment_reminders" boolean DEFAULT true,
    "theme" "text" DEFAULT 'system'::"text",
    "language" "text" DEFAULT 'en'::"text",
    "default_dashboard_view" "text" DEFAULT 'overview'::"text",
    "show_quick_stats" boolean DEFAULT true,
    "show_recent_activity" boolean DEFAULT true,
    "calendar_view" "text" DEFAULT 'week'::"text",
    "show_past_appointments" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

-- Create security settings table
CREATE TABLE IF NOT EXISTS "public"."security_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "clinic_id" "uuid" NOT NULL,
    "two_factor_enabled" boolean DEFAULT false,
    "backup_codes" "text"[],
    "login_notifications" boolean DEFAULT true,
    "session_timeout_minutes" integer DEFAULT 480,
    "max_login_attempts" integer DEFAULT 5,
    "password_expiry_days" integer DEFAULT 90,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

-- Add primary key constraints
ALTER TABLE ONLY "public"."user_preferences" ADD CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."security_settings" ADD CONSTRAINT "security_settings_pkey" PRIMARY KEY ("id");

-- Add unique constraints
ALTER TABLE ONLY "public"."user_preferences" ADD CONSTRAINT "user_preferences_user_id_clinic_id_key" UNIQUE ("user_id", "clinic_id");
ALTER TABLE ONLY "public"."security_settings" ADD CONSTRAINT "security_settings_user_id_clinic_id_key" UNIQUE ("user_id", "clinic_id");

-- Add foreign key constraints
ALTER TABLE ONLY "public"."user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."user_preferences" ADD CONSTRAINT "user_preferences_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."security_settings" ADD CONSTRAINT "security_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."security_settings" ADD CONSTRAINT "security_settings_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;

-- Create indexes for user preferences and security settings
CREATE INDEX IF NOT EXISTS "idx_user_preferences_user_id" ON "public"."user_preferences" USING "btree" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_preferences_clinic_id" ON "public"."user_preferences" USING "btree" ("clinic_id");
CREATE INDEX IF NOT EXISTS "idx_security_settings_user_id" ON "public"."security_settings" USING "btree" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_security_settings_clinic_id" ON "public"."security_settings" USING "btree" ("clinic_id");

-- Create update triggers
CREATE OR REPLACE TRIGGER "update_user_preferences_updated_at_trigger" BEFORE UPDATE ON "public"."user_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_security_settings_updated_at_trigger" BEFORE UPDATE ON "public"."security_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

-- Create the user signup function
CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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

-- Create the auth trigger
CREATE OR REPLACE TRIGGER "on_auth_user_created"
  AFTER INSERT ON "auth"."users"
  FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();

-- Enable Row Level Security on all tables
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."clinics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."therapists" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."treatments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."appointments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."expenses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."shifts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."sync_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."daily_cash_summary" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."security_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."subscription_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."clinic_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."subscription_usage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."subscription_invoices" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT USING ("auth"."uid"() = "id");
CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING ("auth"."uid"() = "id");

-- Clinics policies
CREATE POLICY "Users can view their own clinic" ON "public"."clinics" FOR SELECT USING ("id" IN (SELECT "clinic_id" FROM "public"."profiles" WHERE "id" = "auth"."uid"()));
CREATE POLICY "Clinic owners can manage their clinic" ON "public"."clinics" FOR ALL USING ("id" IN (SELECT "clinic_id" FROM "public"."profiles" WHERE "id" = "auth"."uid"() AND "is_clinic_owner" = true));

-- Therapists policies
CREATE POLICY "Users can only access their clinic's data" ON "public"."therapists" FOR ALL USING ("clinic_id" = (SELECT "clinic_id" FROM "public"."profiles" WHERE "id" = "auth"."uid"()));

-- Clients policies
CREATE POLICY "Users can only access their clinic's data" ON "public"."clients" FOR ALL USING ("clinic_id" = (SELECT "clinic_id" FROM "public"."profiles" WHERE "id" = "auth"."uid"()));

-- Treatments policies
CREATE POLICY "Users can only access their clinic's data" ON "public"."treatments" FOR ALL USING ("clinic_id" = (SELECT "clinic_id" FROM "public"."profiles" WHERE "id" = "auth"."uid"()));

-- Appointments policies
CREATE POLICY "Users can only access their clinic's data" ON "public"."appointments" FOR ALL USING ("clinic_id" = (SELECT "clinic_id" FROM "public"."profiles" WHERE "id" = "auth"."uid"()));

-- Suppliers policies
CREATE POLICY "Users can only access their clinic's data" ON "public"."suppliers" FOR ALL USING ("clinic_id" = (SELECT "clinic_id" FROM "public"."profiles" WHERE "id" = "auth"."uid"()));

-- Expenses policies
CREATE POLICY "Users can only access their clinic's data" ON "public"."expenses" FOR ALL USING ("clinic_id" = (SELECT "clinic_id" FROM "public"."profiles" WHERE "id" = "auth"."uid"()));

-- Payments policies
CREATE POLICY "Users can only access their clinic's data" ON "public"."payments" FOR ALL USING ("clinic_id" = (SELECT "clinic_id" FROM "public"."profiles" WHERE "id" = "auth"."uid"()));

-- Shifts policies
CREATE POLICY "Users can only access their clinic's data" ON "public"."shifts" FOR ALL USING ("clinic_id" = (SELECT "clinic_id" FROM "public"."profiles" WHERE "id" = "auth"."uid"()));

-- Sync logs policies
CREATE POLICY "Users can only access their clinic's data" ON "public"."sync_logs" FOR ALL USING ("clinic_id" = (SELECT "clinic_id" FROM "public"."profiles" WHERE "id" = "auth"."uid"()));

-- Daily cash summary policies
CREATE POLICY "Users can only access their clinic's data" ON "public"."daily_cash_summary" FOR ALL USING ("clinic_id" = (SELECT "clinic_id" FROM "public"."profiles" WHERE "id" = "auth"."uid"()));

-- User preferences policies
CREATE POLICY "Users can view their own preferences" ON "public"."user_preferences" FOR SELECT USING ("user_id" = "auth"."uid"());
CREATE POLICY "Users can manage their own preferences" ON "public"."user_preferences" FOR ALL USING ("user_id" = "auth"."uid"());

-- Security settings policies
CREATE POLICY "Users can view their own security settings" ON "public"."security_settings" FOR SELECT USING ("user_id" = "auth"."uid"());
CREATE POLICY "Users can manage their own security settings" ON "public"."security_settings" FOR ALL USING ("user_id" = "auth"."uid"());

-- Subscription plans policies
CREATE POLICY "Authenticated users can view subscription plans" ON "public"."subscription_plans" FOR SELECT TO "authenticated" USING (true);

-- Clinic subscriptions policies
CREATE POLICY "Users can only access their clinic's subscriptions" ON "public"."clinic_subscriptions" FOR ALL USING ("clinic_id" = (SELECT "clinic_id" FROM "public"."profiles" WHERE "id" = "auth"."uid"()));

-- Subscription usage policies
CREATE POLICY "Users can only access their clinic's usage" ON "public"."subscription_usage" FOR ALL USING ("clinic_id" = (SELECT "clinic_id" FROM "public"."profiles" WHERE "id" = "auth"."uid"()));

-- Subscription invoices policies
CREATE POLICY "Users can only access their clinic's invoices" ON "public"."subscription_invoices" FOR ALL USING ("clinic_id" = (SELECT "clinic_id" FROM "public"."profiles" WHERE "id" = "auth"."uid"()));