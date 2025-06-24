-- Migration to auto-create clinic for new users
-- This replaces the existing handle_new_user function to create a clinic for each new user

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved function to handle new user registration with clinic creation
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
  INSERT INTO public.clinics (name, slug, email, timezone, currency)
  VALUES (
    clinic_name,
    clinic_slug,
    NEW.email,
    'UTC',
    'USD'
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
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update existing users to be owners of their clinics (optional - for existing default clinic users)
UPDATE public.profiles 
SET is_clinic_owner = true 
WHERE clinic_id = (SELECT id FROM public.clinics WHERE slug = 'default-clinic'); 