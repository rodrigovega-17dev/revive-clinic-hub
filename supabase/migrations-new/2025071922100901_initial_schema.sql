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

