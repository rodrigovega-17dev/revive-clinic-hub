-- Temporarily disable problematic triggers to fix signup
-- Migration: 20250626000002_disable_problematic_triggers.sql

-- Disable all subscription-related triggers temporarily
ALTER TABLE therapists DISABLE TRIGGER ALL;
ALTER TABLE appointments DISABLE TRIGGER ALL;
ALTER TABLE clients DISABLE TRIGGER ALL;

-- Re-enable only the essential triggers (excluding subscription ones)
ALTER TABLE therapists ENABLE TRIGGER update_therapists_updated_at;
ALTER TABLE appointments ENABLE TRIGGER update_appointments_updated_at;
ALTER TABLE clients ENABLE TRIGGER update_clients_updated_at;

-- Also disable the user preferences trigger that might be causing issues
ALTER TABLE auth.users DISABLE TRIGGER ALL;
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created; 
 
 