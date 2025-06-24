-- Add clinics table for multi-tenant support
CREATE TABLE public.clinics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- For subdomain routing
  address TEXT,
  phone TEXT,
  email TEXT,
  timezone TEXT DEFAULT 'UTC',
  currency TEXT DEFAULT 'USD',
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add clinic_id to profiles table
ALTER TABLE public.profiles 
ADD COLUMN clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
ADD COLUMN is_clinic_owner BOOLEAN DEFAULT false;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clinics_slug ON public.clinics (slug);
CREATE INDEX IF NOT EXISTS idx_clinics_is_active ON public.clinics (is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_clinic_id ON public.profiles (clinic_id);
CREATE INDEX IF NOT EXISTS idx_profiles_is_clinic_owner ON public.profiles (is_clinic_owner);

-- Enable RLS on clinics table
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for clinics
CREATE POLICY "Users can view their own clinic" ON public.clinics
  FOR SELECT USING (
    id IN (
      SELECT clinic_id FROM public.profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Clinic owners can manage their clinic" ON public.clinics
  FOR ALL USING (
    id IN (
      SELECT clinic_id FROM public.profiles 
      WHERE id = auth.uid() AND is_clinic_owner = true
    )
  );

-- Create function to get current user's clinic ID
CREATE OR REPLACE FUNCTION public.get_user_clinic_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT clinic_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Create function to check if user is clinic owner
CREATE OR REPLACE FUNCTION public.is_clinic_owner()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT is_clinic_owner FROM public.profiles WHERE id = auth.uid();
$$;

-- Add trigger for updated_at
CREATE TRIGGER update_clinics_updated_at 
  BEFORE UPDATE ON public.clinics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert a default clinic for existing users (will be updated later)
INSERT INTO public.clinics (name, slug, email, timezone, currency)
VALUES ('Default Clinic', 'default-clinic', 'admin@reviveclinic.com', 'UTC', 'USD')
ON CONFLICT (slug) DO NOTHING;

-- Update existing profiles to belong to the default clinic
UPDATE public.profiles 
SET clinic_id = (SELECT id FROM public.clinics WHERE slug = 'default-clinic'),
    is_clinic_owner = true
WHERE clinic_id IS NULL; 