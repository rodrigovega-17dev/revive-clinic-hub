

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."appointment_status" AS ENUM (
    'scheduled',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled',
    'no_show'
);


ALTER TYPE "public"."appointment_status" OWNER TO "postgres";


CREATE TYPE "public"."gender_type" AS ENUM (
    'male',
    'female',
    'other'
);


ALTER TYPE "public"."gender_type" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'admin',
    'therapist',
    'reception'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_backup_codes"() RETURNS "text"[]
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."generate_backup_codes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_clinic_id"() RETURNS "uuid"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT clinic_id FROM public.profiles WHERE id = auth.uid();
$$;


ALTER FUNCTION "public"."get_user_clinic_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role"() RETURNS "public"."user_role"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;


ALTER FUNCTION "public"."get_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_therapist_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT t.id FROM public.therapists t 
  JOIN public.profiles p ON t.user_id = p.id 
  WHERE p.id = auth.uid();
$$;


ALTER FUNCTION "public"."get_user_therapist_id"() OWNER TO "postgres";


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


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_clinic_owner"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT is_clinic_owner FROM public.profiles WHERE id = auth.uid();
$$;


ALTER FUNCTION "public"."is_clinic_owner"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."appointments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "therapist_id" "uuid" NOT NULL,
    "treatment_id" "uuid",
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone NOT NULL,
    "status" "public"."appointment_status" DEFAULT 'scheduled'::"public"."appointment_status",
    "notes" "text",
    "clinic_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "sync_status" "text" DEFAULT 'pending'::"text",
    "last_synced_at" timestamp with time zone,
    "sync_error_message" "text",
    "google_calendar_version" "text",
    "local_version" integer DEFAULT 1,
    "payment_status" "text" DEFAULT 'pending'::"text",
    "payment_amount" numeric DEFAULT 0,
    "payment_method" "text",
    "payment_date" timestamp with time zone
);


ALTER TABLE "public"."appointments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "birth_date" "date",
    "gender" "public"."gender_type",
    "address" "text",
    "emergency_contact_name" "text",
    "emergency_contact_phone" "text",
    "medical_notes" "text",
    "charge_amount" numeric DEFAULT 0,
    "clinic_id" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


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


ALTER TABLE "public"."clinic_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clinics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "address" "text",
    "phone" "text",
    "email" "text",
    "timezone" "text" DEFAULT 'UTC'::"text",
    "currency" "text" DEFAULT 'USD'::"text",
    "logo_url" "text",
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "google_calendar_auth" "jsonb",
    "google_calendar_selected_id" "text",
    "google_calendar_enabled" boolean DEFAULT false,
    "google_calendar_sync_settings" "jsonb" DEFAULT '{}'::"jsonb",
    "subscription_status" character varying(50) DEFAULT 'trial'::character varying,
    "trial_ends_at" timestamp with time zone,
    "subscription_plan_id" "uuid",
    "stripe_customer_id" character varying(255),
    "stripe_subscription_id" character varying(255)
);


ALTER TABLE "public"."clinics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_cash_summary" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" "date" NOT NULL,
    "opening_cash" numeric DEFAULT 0,
    "closing_cash" numeric DEFAULT 0,
    "total_revenue" numeric DEFAULT 0,
    "total_expenses" numeric DEFAULT 0,
    "cash_payments" numeric DEFAULT 0,
    "clinic_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."daily_cash_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "description" "text" NOT NULL,
    "amount" numeric NOT NULL,
    "date" "date" NOT NULL,
    "category" "text",
    "supplier_id" "uuid",
    "clinic_id" "uuid" NOT NULL,
    "recorded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."expenses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "appointment_id" "uuid",
    "amount" numeric NOT NULL,
    "payment_method" "text" NOT NULL,
    "payment_date" timestamp with time zone DEFAULT "now"(),
    "received_by" "uuid",
    "clinic_id" "uuid" NOT NULL,
    "shift_id" "uuid",
    "facturado" boolean DEFAULT false,
    "iva_amount" numeric(10,2) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "first_name" "text" DEFAULT ''::"text",
    "last_name" "text" DEFAULT ''::"text",
    "role" "public"."user_role" DEFAULT 'admin'::"public"."user_role",
    "clinic_id" "uuid",
    "is_clinic_owner" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


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


ALTER TABLE "public"."security_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shifts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "therapist_id" "uuid" NOT NULL,
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone NOT NULL,
    "clinic_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."shifts" OWNER TO "postgres";


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


ALTER TABLE "public"."subscription_invoices" OWNER TO "postgres";


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


ALTER TABLE "public"."subscription_plans" OWNER TO "postgres";


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


ALTER TABLE "public"."subscription_usage" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."suppliers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "contact_person" "text",
    "email" "text",
    "phone" "text",
    "address" "text",
    "clinic_id" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."suppliers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sync_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "appointment_id" "uuid",
    "sync_type" "text" NOT NULL,
    "status" "text" NOT NULL,
    "error_message" "text",
    "clinic_id" "uuid" NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sync_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."therapists" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "clinic_id" "uuid" NOT NULL,
    "first_name" "text" DEFAULT ''::"text",
    "last_name" "text" DEFAULT ''::"text",
    "email" "text",
    "phone" "text",
    "percentage" numeric(5,2) DEFAULT 70.00,
    "calendar_color" "text" DEFAULT '#3B82F6'::"text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."therapists" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."treatments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "duration_minutes" integer DEFAULT 60,
    "price" numeric(10,2) DEFAULT 0,
    "clinic_id" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."treatments" OWNER TO "postgres";


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


ALTER TABLE "public"."user_preferences" OWNER TO "postgres";


ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clinic_subscriptions"
    ADD CONSTRAINT "clinic_subscriptions_clinic_id_key" UNIQUE ("clinic_id");



ALTER TABLE ONLY "public"."clinic_subscriptions"
    ADD CONSTRAINT "clinic_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clinics"
    ADD CONSTRAINT "clinics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clinics"
    ADD CONSTRAINT "clinics_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."daily_cash_summary"
    ADD CONSTRAINT "daily_cash_summary_date_key" UNIQUE ("date");



ALTER TABLE ONLY "public"."daily_cash_summary"
    ADD CONSTRAINT "daily_cash_summary_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."security_settings"
    ADD CONSTRAINT "security_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."security_settings"
    ADD CONSTRAINT "security_settings_user_id_clinic_id_key" UNIQUE ("user_id", "clinic_id");



ALTER TABLE ONLY "public"."shifts"
    ADD CONSTRAINT "shifts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_invoices"
    ADD CONSTRAINT "subscription_invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_invoices"
    ADD CONSTRAINT "subscription_invoices_stripe_invoice_id_key" UNIQUE ("stripe_invoice_id");



ALTER TABLE ONLY "public"."subscription_plans"
    ADD CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_plans"
    ADD CONSTRAINT "subscription_plans_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."subscription_usage"
    ADD CONSTRAINT "subscription_usage_clinic_id_date_key" UNIQUE ("clinic_id", "date");



ALTER TABLE ONLY "public"."subscription_usage"
    ADD CONSTRAINT "subscription_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sync_logs"
    ADD CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."therapists"
    ADD CONSTRAINT "therapists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."treatments"
    ADD CONSTRAINT "treatments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_clinic_id_key" UNIQUE ("user_id", "clinic_id");



CREATE INDEX "idx_appointments_clinic_id" ON "public"."appointments" USING "btree" ("clinic_id");



CREATE INDEX "idx_appointments_start_time" ON "public"."appointments" USING "btree" ("start_time");



CREATE INDEX "idx_appointments_therapist_start_time" ON "public"."appointments" USING "btree" ("therapist_id", "start_time");



CREATE INDEX "idx_clients_clinic_id" ON "public"."clients" USING "btree" ("clinic_id");



CREATE INDEX "idx_clinic_subscriptions_clinic_id" ON "public"."clinic_subscriptions" USING "btree" ("clinic_id");



CREATE INDEX "idx_clinic_subscriptions_status" ON "public"."clinic_subscriptions" USING "btree" ("status");



CREATE INDEX "idx_clinics_is_active" ON "public"."clinics" USING "btree" ("is_active");



CREATE INDEX "idx_clinics_slug" ON "public"."clinics" USING "btree" ("slug");



CREATE INDEX "idx_daily_cash_summary_clinic_id" ON "public"."daily_cash_summary" USING "btree" ("clinic_id");



CREATE INDEX "idx_expenses_clinic_id" ON "public"."expenses" USING "btree" ("clinic_id");



CREATE INDEX "idx_payments_clinic_id" ON "public"."payments" USING "btree" ("clinic_id");



CREATE INDEX "idx_profiles_clinic_id" ON "public"."profiles" USING "btree" ("clinic_id");



CREATE INDEX "idx_profiles_is_clinic_owner" ON "public"."profiles" USING "btree" ("is_clinic_owner");



CREATE INDEX "idx_security_settings_clinic_id" ON "public"."security_settings" USING "btree" ("clinic_id");



CREATE INDEX "idx_security_settings_user_id" ON "public"."security_settings" USING "btree" ("user_id");



CREATE INDEX "idx_shifts_clinic_id" ON "public"."shifts" USING "btree" ("clinic_id");



CREATE INDEX "idx_subscription_invoices_clinic_id" ON "public"."subscription_invoices" USING "btree" ("clinic_id");



CREATE INDEX "idx_subscription_plans_active" ON "public"."subscription_plans" USING "btree" ("is_active");



CREATE INDEX "idx_subscription_plans_slug" ON "public"."subscription_plans" USING "btree" ("slug");



CREATE INDEX "idx_subscription_usage_clinic_date" ON "public"."subscription_usage" USING "btree" ("clinic_id", "date");



CREATE INDEX "idx_suppliers_clinic_id" ON "public"."suppliers" USING "btree" ("clinic_id");



CREATE INDEX "idx_sync_logs_clinic_id" ON "public"."sync_logs" USING "btree" ("clinic_id");



CREATE INDEX "idx_therapists_clinic_id" ON "public"."therapists" USING "btree" ("clinic_id");



CREATE INDEX "idx_treatments_clinic_id" ON "public"."treatments" USING "btree" ("clinic_id");



CREATE INDEX "idx_user_preferences_clinic_id" ON "public"."user_preferences" USING "btree" ("clinic_id");



CREATE INDEX "idx_user_preferences_user_id" ON "public"."user_preferences" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "update_appointments_updated_at" BEFORE UPDATE ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_clients_updated_at" BEFORE UPDATE ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_clinic_subscriptions_updated_at" BEFORE UPDATE ON "public"."clinic_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_clinics_updated_at" BEFORE UPDATE ON "public"."clinics" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_daily_cash_summary_updated_at" BEFORE UPDATE ON "public"."daily_cash_summary" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_expenses_updated_at" BEFORE UPDATE ON "public"."expenses" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_payments_updated_at" BEFORE UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_security_settings_updated_at_trigger" BEFORE UPDATE ON "public"."security_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_shifts_updated_at" BEFORE UPDATE ON "public"."shifts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_subscription_invoices_updated_at" BEFORE UPDATE ON "public"."subscription_invoices" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_subscription_plans_updated_at" BEFORE UPDATE ON "public"."subscription_plans" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_suppliers_updated_at" BEFORE UPDATE ON "public"."suppliers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_therapists_updated_at" BEFORE UPDATE ON "public"."therapists" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_treatments_updated_at" BEFORE UPDATE ON "public"."treatments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_preferences_updated_at_trigger" BEFORE UPDATE ON "public"."user_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_therapist_id_fkey" FOREIGN KEY ("therapist_id") REFERENCES "public"."therapists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_treatment_id_fkey" FOREIGN KEY ("treatment_id") REFERENCES "public"."treatments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clinic_subscriptions"
    ADD CONSTRAINT "clinic_subscriptions_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clinic_subscriptions"
    ADD CONSTRAINT "clinic_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id");



ALTER TABLE ONLY "public"."daily_cash_summary"
    ADD CONSTRAINT "daily_cash_summary_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."security_settings"
    ADD CONSTRAINT "security_settings_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."security_settings"
    ADD CONSTRAINT "security_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shifts"
    ADD CONSTRAINT "shifts_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shifts"
    ADD CONSTRAINT "shifts_therapist_id_fkey" FOREIGN KEY ("therapist_id") REFERENCES "public"."therapists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription_invoices"
    ADD CONSTRAINT "subscription_invoices_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription_invoices"
    ADD CONSTRAINT "subscription_invoices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."clinic_subscriptions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription_usage"
    ADD CONSTRAINT "subscription_usage_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription_usage"
    ADD CONSTRAINT "subscription_usage_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."clinic_subscriptions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sync_logs"
    ADD CONSTRAINT "sync_logs_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sync_logs"
    ADD CONSTRAINT "sync_logs_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."therapists"
    ADD CONSTRAINT "therapists_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."therapists"
    ADD CONSTRAINT "therapists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."treatments"
    ADD CONSTRAINT "treatments_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Authenticated users can view subscription plans" ON "public"."subscription_plans" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Clinic owners can manage appointments" ON "public"."appointments" USING ((("clinic_id" = "public"."get_user_clinic_id"()) AND "public"."is_clinic_owner"()));



CREATE POLICY "Clinic owners can manage clients" ON "public"."clients" USING ((("clinic_id" = "public"."get_user_clinic_id"()) AND "public"."is_clinic_owner"()));



CREATE POLICY "Clinic owners can manage daily cash summary" ON "public"."daily_cash_summary" USING ((("clinic_id" = "public"."get_user_clinic_id"()) AND "public"."is_clinic_owner"()));



CREATE POLICY "Clinic owners can manage expenses" ON "public"."expenses" USING ((("clinic_id" = "public"."get_user_clinic_id"()) AND "public"."is_clinic_owner"()));



CREATE POLICY "Clinic owners can manage invoices" ON "public"."subscription_invoices" USING ((("clinic_id" = "public"."get_user_clinic_id"()) AND "public"."is_clinic_owner"()));



CREATE POLICY "Clinic owners can manage payments" ON "public"."payments" USING ((("clinic_id" = "public"."get_user_clinic_id"()) AND "public"."is_clinic_owner"()));



CREATE POLICY "Clinic owners can manage shifts" ON "public"."shifts" USING ((("clinic_id" = "public"."get_user_clinic_id"()) AND "public"."is_clinic_owner"()));



CREATE POLICY "Clinic owners can manage subscriptions" ON "public"."clinic_subscriptions" USING ((("clinic_id" = "public"."get_user_clinic_id"()) AND "public"."is_clinic_owner"()));



CREATE POLICY "Clinic owners can manage suppliers" ON "public"."suppliers" USING ((("clinic_id" = "public"."get_user_clinic_id"()) AND "public"."is_clinic_owner"()));



CREATE POLICY "Clinic owners can manage sync logs" ON "public"."sync_logs" USING ((("clinic_id" = "public"."get_user_clinic_id"()) AND "public"."is_clinic_owner"()));



CREATE POLICY "Clinic owners can manage their clinic" ON "public"."clinics" USING (("id" IN ( SELECT "profiles"."clinic_id"
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_clinic_owner" = true)))));



CREATE POLICY "Clinic owners can manage therapists" ON "public"."therapists" USING ((("clinic_id" = "public"."get_user_clinic_id"()) AND "public"."is_clinic_owner"()));



CREATE POLICY "Clinic owners can manage treatments" ON "public"."treatments" USING ((("clinic_id" = "public"."get_user_clinic_id"()) AND "public"."is_clinic_owner"()));



CREATE POLICY "Clinic owners can manage usage" ON "public"."subscription_usage" USING ((("clinic_id" = "public"."get_user_clinic_id"()) AND "public"."is_clinic_owner"()));



CREATE POLICY "Clinic owners can update own clinic" ON "public"."clinics" FOR UPDATE USING ((("id" = "public"."get_user_clinic_id"()) AND "public"."is_clinic_owner"()));



CREATE POLICY "Users can manage own preferences" ON "public"."user_preferences" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can manage own security settings" ON "public"."security_settings" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can manage their own preferences" ON "public"."user_preferences" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can manage their own security settings" ON "public"."security_settings" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can only access their clinic's data" ON "public"."appointments" USING (("clinic_id" = ( SELECT "profiles"."clinic_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can only access their clinic's data" ON "public"."clients" USING (("clinic_id" = ( SELECT "profiles"."clinic_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can only access their clinic's data" ON "public"."daily_cash_summary" USING (("clinic_id" = ( SELECT "profiles"."clinic_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can only access their clinic's data" ON "public"."expenses" USING (("clinic_id" = ( SELECT "profiles"."clinic_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can only access their clinic's data" ON "public"."payments" USING (("clinic_id" = ( SELECT "profiles"."clinic_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can only access their clinic's data" ON "public"."shifts" USING (("clinic_id" = ( SELECT "profiles"."clinic_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can only access their clinic's data" ON "public"."suppliers" USING (("clinic_id" = ( SELECT "profiles"."clinic_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can only access their clinic's data" ON "public"."sync_logs" USING (("clinic_id" = ( SELECT "profiles"."clinic_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can only access their clinic's data" ON "public"."therapists" USING (("clinic_id" = ( SELECT "profiles"."clinic_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can only access their clinic's data" ON "public"."treatments" USING (("clinic_id" = ( SELECT "profiles"."clinic_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can only access their clinic's invoices" ON "public"."subscription_invoices" USING (("clinic_id" = ( SELECT "profiles"."clinic_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can only access their clinic's subscriptions" ON "public"."clinic_subscriptions" USING (("clinic_id" = ( SELECT "profiles"."clinic_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can only access their clinic's usage" ON "public"."subscription_usage" USING (("clinic_id" = ( SELECT "profiles"."clinic_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view clinic appointments" ON "public"."appointments" FOR SELECT USING (("clinic_id" = "public"."get_user_clinic_id"()));



CREATE POLICY "Users can view clinic clients" ON "public"."clients" FOR SELECT USING (("clinic_id" = "public"."get_user_clinic_id"()));



CREATE POLICY "Users can view clinic daily cash summary" ON "public"."daily_cash_summary" FOR SELECT USING (("clinic_id" = "public"."get_user_clinic_id"()));



CREATE POLICY "Users can view clinic expenses" ON "public"."expenses" FOR SELECT USING (("clinic_id" = "public"."get_user_clinic_id"()));



CREATE POLICY "Users can view clinic payments" ON "public"."payments" FOR SELECT USING (("clinic_id" = "public"."get_user_clinic_id"()));



CREATE POLICY "Users can view clinic shifts" ON "public"."shifts" FOR SELECT USING (("clinic_id" = "public"."get_user_clinic_id"()));



CREATE POLICY "Users can view clinic suppliers" ON "public"."suppliers" FOR SELECT USING (("clinic_id" = "public"."get_user_clinic_id"()));



CREATE POLICY "Users can view clinic sync logs" ON "public"."sync_logs" FOR SELECT USING (("clinic_id" = "public"."get_user_clinic_id"()));



CREATE POLICY "Users can view clinic therapists" ON "public"."therapists" FOR SELECT USING (("clinic_id" = "public"."get_user_clinic_id"()));



CREATE POLICY "Users can view clinic treatments" ON "public"."treatments" FOR SELECT USING (("clinic_id" = "public"."get_user_clinic_id"()));



CREATE POLICY "Users can view own clinic" ON "public"."clinics" FOR SELECT USING (("id" = "public"."get_user_clinic_id"()));



CREATE POLICY "Users can view own clinic invoices" ON "public"."subscription_invoices" FOR SELECT USING (("clinic_id" = "public"."get_user_clinic_id"()));



CREATE POLICY "Users can view own clinic subscriptions" ON "public"."clinic_subscriptions" FOR SELECT USING (("clinic_id" = "public"."get_user_clinic_id"()));



CREATE POLICY "Users can view own clinic usage" ON "public"."subscription_usage" FOR SELECT USING (("clinic_id" = "public"."get_user_clinic_id"()));



CREATE POLICY "Users can view own preferences" ON "public"."user_preferences" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own security settings" ON "public"."security_settings" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view subscription plans" ON "public"."subscription_plans" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Users can view their own clinic" ON "public"."clinics" FOR SELECT USING (("id" IN ( SELECT "profiles"."clinic_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view their own preferences" ON "public"."user_preferences" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own security settings" ON "public"."security_settings" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."appointments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clinic_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clinics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_cash_summary" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."expenses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."security_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shifts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscription_invoices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscription_plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscription_usage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sync_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."therapists" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."treatments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_preferences" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_backup_codes"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_backup_codes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_backup_codes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_clinic_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_clinic_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_clinic_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_therapist_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_therapist_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_therapist_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_clinic_owner"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_clinic_owner"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_clinic_owner"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."appointments" TO "anon";
GRANT ALL ON TABLE "public"."appointments" TO "authenticated";
GRANT ALL ON TABLE "public"."appointments" TO "service_role";



GRANT ALL ON TABLE "public"."clients" TO "anon";
GRANT ALL ON TABLE "public"."clients" TO "authenticated";
GRANT ALL ON TABLE "public"."clients" TO "service_role";



GRANT ALL ON TABLE "public"."clinic_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."clinic_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."clinic_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."clinics" TO "anon";
GRANT ALL ON TABLE "public"."clinics" TO "authenticated";
GRANT ALL ON TABLE "public"."clinics" TO "service_role";



GRANT ALL ON TABLE "public"."daily_cash_summary" TO "anon";
GRANT ALL ON TABLE "public"."daily_cash_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_cash_summary" TO "service_role";



GRANT ALL ON TABLE "public"."expenses" TO "anon";
GRANT ALL ON TABLE "public"."expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."expenses" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."security_settings" TO "anon";
GRANT ALL ON TABLE "public"."security_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."security_settings" TO "service_role";



GRANT ALL ON TABLE "public"."shifts" TO "anon";
GRANT ALL ON TABLE "public"."shifts" TO "authenticated";
GRANT ALL ON TABLE "public"."shifts" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_invoices" TO "anon";
GRANT ALL ON TABLE "public"."subscription_invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_invoices" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_plans" TO "anon";
GRANT ALL ON TABLE "public"."subscription_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_plans" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_usage" TO "anon";
GRANT ALL ON TABLE "public"."subscription_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_usage" TO "service_role";



GRANT ALL ON TABLE "public"."suppliers" TO "anon";
GRANT ALL ON TABLE "public"."suppliers" TO "authenticated";
GRANT ALL ON TABLE "public"."suppliers" TO "service_role";



GRANT ALL ON TABLE "public"."sync_logs" TO "anon";
GRANT ALL ON TABLE "public"."sync_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."sync_logs" TO "service_role";



GRANT ALL ON TABLE "public"."therapists" TO "anon";
GRANT ALL ON TABLE "public"."therapists" TO "authenticated";
GRANT ALL ON TABLE "public"."therapists" TO "service_role";



GRANT ALL ON TABLE "public"."treatments" TO "anon";
GRANT ALL ON TABLE "public"."treatments" TO "authenticated";
GRANT ALL ON TABLE "public"."treatments" TO "service_role";



GRANT ALL ON TABLE "public"."user_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_preferences" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






RESET ALL;
