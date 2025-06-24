-- Add clinic_id to shifts table (initially nullable)
ALTER TABLE public.shifts 
ADD COLUMN clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_shifts_clinic_id ON public.shifts (clinic_id);

-- Update existing shifts to belong to the default clinic
UPDATE public.shifts 
SET clinic_id = (SELECT id FROM public.clinics WHERE slug = 'default-clinic')
WHERE clinic_id IS NULL;

-- Now make clinic_id NOT NULL after all records have been updated
ALTER TABLE public.shifts 
ALTER COLUMN clinic_id SET NOT NULL;

-- Drop existing RLS policies for shifts
DROP POLICY IF EXISTS "Users can view their own shifts" ON public.shifts;
DROP POLICY IF EXISTS "Users can manage their own shifts" ON public.shifts;

-- Create new clinic-scoped RLS policies for shifts
CREATE POLICY "Users can only access their clinic's shifts" ON public.shifts
  FOR ALL USING (
    clinic_id = public.get_user_clinic_id()
  ); 