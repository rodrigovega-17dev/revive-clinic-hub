-- Initial Schema Migration
-- This migration creates the core database structure

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

CREATE TABLE IF NOT EXISTS "public"."shifts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "therapist_id" "uuid" NOT NULL,
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone NOT NULL,
    "clinic_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

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

-- Create essential functions
CREATE OR REPLACE FUNCTION "public"."get_user_clinic_id"() RETURNS "uuid"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT clinic_id FROM public.profiles WHERE id = auth.uid();

CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  clinic_id UUID;

CREATE OR REPLACE FUNCTION "public"."is_clinic_owner"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT is_clinic_owner FROM public.profiles WHERE id = auth.uid();

CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();

