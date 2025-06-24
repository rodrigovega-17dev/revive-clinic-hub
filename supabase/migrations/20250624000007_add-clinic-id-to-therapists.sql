-- Add clinic_id to therapists table (initially nullable)
ALTER TABLE public.therapists 
ADD COLUMN clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_therapists_clinic_id ON public.therapists (clinic_id);

-- Update existing therapists to belong to the default clinic
UPDATE public.therapists 
SET clinic_id = (SELECT id FROM public.clinics WHERE slug = 'default-clinic')
WHERE clinic_id IS NULL;

-- Now make clinic_id NOT NULL after all records have been updated
ALTER TABLE public.therapists 
ALTER COLUMN clinic_id SET NOT NULL;

-- Drop existing RLS policies for therapists
DROP POLICY IF EXISTS "Authenticated users can view therapists" ON public.therapists;
DROP POLICY IF EXISTS "Admins can manage all therapists" ON public.therapists;
DROP POLICY IF EXISTS "Reception can manage all therapists" ON public.therapists;
DROP POLICY IF EXISTS "Therapists can view their own record" ON public.therapists;
DROP POLICY IF EXISTS "Therapists can update their own record" ON public.therapists;

-- Create new clinic-scoped RLS policies for therapists
CREATE POLICY "Users can only access their clinic's therapists" ON public.therapists
  FOR ALL USING (
    clinic_id = public.get_user_clinic_id()
  ); 