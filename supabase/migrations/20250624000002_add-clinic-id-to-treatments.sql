-- Add clinic_id to treatments table (initially nullable)
ALTER TABLE public.treatments 
ADD COLUMN clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_treatments_clinic_id ON public.treatments (clinic_id);

-- Update existing treatments to belong to the default clinic
UPDATE public.treatments 
SET clinic_id = (SELECT id FROM public.clinics WHERE slug = 'default-clinic')
WHERE clinic_id IS NULL;

-- Now make clinic_id NOT NULL after all records have been updated
ALTER TABLE public.treatments 
ALTER COLUMN clinic_id SET NOT NULL;

-- Drop existing RLS policies for treatments
DROP POLICY IF EXISTS "Authenticated users can view treatments" ON public.treatments;
DROP POLICY IF EXISTS "Admins can manage treatments" ON public.treatments;

-- Create new clinic-scoped RLS policies for treatments
CREATE POLICY "Users can only access their clinic's treatments" ON public.treatments
  FOR ALL USING (
    clinic_id = public.get_user_clinic_id()
  ); 