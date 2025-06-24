-- Add clinic_id to appointments table (initially nullable)
ALTER TABLE public.appointments 
ADD COLUMN clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id ON public.appointments (clinic_id);

-- Update existing appointments to belong to the default clinic
UPDATE public.appointments 
SET clinic_id = (SELECT id FROM public.clinics WHERE slug = 'default-clinic')
WHERE clinic_id IS NULL;

-- Now make clinic_id NOT NULL after all records have been updated
ALTER TABLE public.appointments 
ALTER COLUMN clinic_id SET NOT NULL;

-- Drop existing RLS policies for appointments
DROP POLICY IF EXISTS "Users can view relevant appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins and reception can manage appointments" ON public.appointments;
DROP POLICY IF EXISTS "Therapists can update their own appointments" ON public.appointments;

-- Create new clinic-scoped RLS policies for appointments
CREATE POLICY "Users can only access their clinic's appointments" ON public.appointments
  FOR ALL USING (
    clinic_id = public.get_user_clinic_id()
  ); 