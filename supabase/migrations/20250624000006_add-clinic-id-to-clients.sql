-- Add clinic_id to clients table (initially nullable)
ALTER TABLE public.clients 
ADD COLUMN clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_clients_clinic_id ON public.clients (clinic_id);

-- Update existing clients to belong to the default clinic
UPDATE public.clients 
SET clinic_id = (SELECT id FROM public.clinics WHERE slug = 'default-clinic')
WHERE clinic_id IS NULL;

-- Now make clinic_id NOT NULL after all records have been updated
ALTER TABLE public.clients 
ALTER COLUMN clinic_id SET NOT NULL;

-- Drop existing RLS policies for clients
DROP POLICY IF EXISTS "Admins and reception can view all clients" ON public.clients;
DROP POLICY IF EXISTS "Therapists can view their assigned clients" ON public.clients;
DROP POLICY IF EXISTS "Admins and reception can manage clients" ON public.clients;

-- Create new clinic-scoped RLS policies for clients
CREATE POLICY "Users can only access their clinic's clients" ON public.clients
  FOR ALL USING (
    clinic_id = public.get_user_clinic_id()
  ); 