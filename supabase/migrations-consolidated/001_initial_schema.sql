-- Initial Schema Migration
-- This migration creates the core database structure with essential tables, types, and functions

-- Create custom types
CREATE TYPE "public"."appointment_status" AS ENUM (
    'scheduled',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled',
    'no_show'
);

CREATE TYPE "public"."gender_type" AS ENUM (
    'male',
    'female',
    'other'
);

CREATE TYPE "public"."user_role" AS ENUM (
    'admin',
    'therapist',
    'reception'
);

-- Create core tables

-- Profiles table (links to auth.users)
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

-- Clinics table
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

-- Therapists table
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

-- Clients table
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

-- Treatments table
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

-- Appointments table
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

-- Suppliers table
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

-- Expenses table
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

-- Payments table
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

-- Shifts table
CREATE TABLE IF NOT EXISTS "public"."shifts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "therapist_id" "uuid" NOT NULL,
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone NOT NULL,
    "clinic_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

-- Sync logs table
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

-- Daily cash summary table
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

-- Add primary key constraints
ALTER TABLE ONLY "public"."profiles" ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."clinics" ADD CONSTRAINT "clinics_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."therapists" ADD CONSTRAINT "therapists_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."clients" ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."treatments" ADD CONSTRAINT "treatments_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."appointments" ADD CONSTRAINT "appointments_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."suppliers" ADD CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."expenses" ADD CONSTRAINT "expenses_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."payments" ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."shifts" ADD CONSTRAINT "shifts_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."sync_logs" ADD CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."daily_cash_summary" ADD CONSTRAINT "daily_cash_summary_pkey" PRIMARY KEY ("id");

-- Add unique constraints
ALTER TABLE ONLY "public"."clinics" ADD CONSTRAINT "clinics_slug_key" UNIQUE ("slug");
ALTER TABLE ONLY "public"."daily_cash_summary" ADD CONSTRAINT "daily_cash_summary_date_key" UNIQUE ("date");

-- Add foreign key constraints
ALTER TABLE ONLY "public"."profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."therapists" ADD CONSTRAINT "therapists_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."therapists" ADD CONSTRAINT "therapists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."clients" ADD CONSTRAINT "clients_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."treatments" ADD CONSTRAINT "treatments_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."appointments" ADD CONSTRAINT "appointments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."appointments" ADD CONSTRAINT "appointments_therapist_id_fkey" FOREIGN KEY ("therapist_id") REFERENCES "public"."therapists"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."appointments" ADD CONSTRAINT "appointments_treatment_id_fkey" FOREIGN KEY ("treatment_id") REFERENCES "public"."treatments"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."appointments" ADD CONSTRAINT "appointments_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."suppliers" ADD CONSTRAINT "suppliers_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."expenses" ADD CONSTRAINT "expenses_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."expenses" ADD CONSTRAINT "expenses_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."expenses" ADD CONSTRAINT "expenses_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."payments" ADD CONSTRAINT "payments_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."payments" ADD CONSTRAINT "payments_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."payments" ADD CONSTRAINT "payments_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."payments" ADD CONSTRAINT "payments_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."shifts" ADD CONSTRAINT "shifts_therapist_id_fkey" FOREIGN KEY ("therapist_id") REFERENCES "public"."therapists"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."shifts" ADD CONSTRAINT "shifts_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."sync_logs" ADD CONSTRAINT "sync_logs_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."sync_logs" ADD CONSTRAINT "sync_logs_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."daily_cash_summary" ADD CONSTRAINT "daily_cash_summary_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;

-- Create essential functions
CREATE OR REPLACE FUNCTION "public"."get_user_clinic_id"() RETURNS "uuid"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT clinic_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION "public"."is_clinic_owner"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT is_clinic_owner FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION "public"."get_user_role"() RETURNS "public"."user_role"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION "public"."get_user_therapist_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT t.id FROM public.therapists t 
  JOIN public.profiles p ON t.user_id = p.id 
  WHERE p.id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

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

-- Create basic indexes for performance
CREATE INDEX IF NOT EXISTS "idx_profiles_clinic_id" ON "public"."profiles" USING "btree" ("clinic_id");
CREATE INDEX IF NOT EXISTS "idx_profiles_is_clinic_owner" ON "public"."profiles" USING "btree" ("is_clinic_owner");
CREATE INDEX IF NOT EXISTS "idx_clinics_slug" ON "public"."clinics" USING "btree" ("slug");
CREATE INDEX IF NOT EXISTS "idx_clinics_is_active" ON "public"."clinics" USING "btree" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_therapists_clinic_id" ON "public"."therapists" USING "btree" ("clinic_id");
CREATE INDEX IF NOT EXISTS "idx_clients_clinic_id" ON "public"."clients" USING "btree" ("clinic_id");
CREATE INDEX IF NOT EXISTS "idx_treatments_clinic_id" ON "public"."treatments" USING "btree" ("clinic_id");
CREATE INDEX IF NOT EXISTS "idx_appointments_clinic_id" ON "public"."appointments" USING "btree" ("clinic_id");
CREATE INDEX IF NOT EXISTS "idx_appointments_start_time" ON "public"."appointments" USING "btree" ("start_time");
CREATE INDEX IF NOT EXISTS "idx_appointments_therapist_start_time" ON "public"."appointments" USING "btree" ("therapist_id", "start_time");
CREATE INDEX IF NOT EXISTS "idx_suppliers_clinic_id" ON "public"."suppliers" USING "btree" ("clinic_id");
CREATE INDEX IF NOT EXISTS "idx_expenses_clinic_id" ON "public"."expenses" USING "btree" ("clinic_id");
CREATE INDEX IF NOT EXISTS "idx_payments_clinic_id" ON "public"."payments" USING "btree" ("clinic_id");
CREATE INDEX IF NOT EXISTS "idx_shifts_clinic_id" ON "public"."shifts" USING "btree" ("clinic_id");
CREATE INDEX IF NOT EXISTS "idx_sync_logs_clinic_id" ON "public"."sync_logs" USING "btree" ("clinic_id");
CREATE INDEX IF NOT EXISTS "idx_daily_cash_summary_clinic_id" ON "public"."daily_cash_summary" USING "btree" ("clinic_id");

-- Create update triggers
CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_clinics_updated_at" BEFORE UPDATE ON "public"."clinics" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_therapists_updated_at" BEFORE UPDATE ON "public"."therapists" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_clients_updated_at" BEFORE UPDATE ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_treatments_updated_at" BEFORE UPDATE ON "public"."treatments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_appointments_updated_at" BEFORE UPDATE ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_suppliers_updated_at" BEFORE UPDATE ON "public"."suppliers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_expenses_updated_at" BEFORE UPDATE ON "public"."expenses" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_payments_updated_at" BEFORE UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_shifts_updated_at" BEFORE UPDATE ON "public"."shifts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_daily_cash_summary_updated_at" BEFORE UPDATE ON "public"."daily_cash_summary" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();