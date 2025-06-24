-- Add clinic_id to sync_logs table (initially nullable)
ALTER TABLE public.sync_logs 
ADD COLUMN clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_sync_logs_clinic_id ON public.sync_logs (clinic_id);

-- Update existing sync_logs records to belong to the default clinic
UPDATE public.sync_logs 
SET clinic_id = (SELECT id FROM public.clinics WHERE slug = 'default-clinic')
WHERE clinic_id IS NULL;

-- Now make clinic_id NOT NULL after all records have been updated
ALTER TABLE public.sync_logs 
ALTER COLUMN clinic_id SET NOT NULL;

-- Drop existing RLS policies for sync_logs
DROP POLICY IF EXISTS "Authenticated users can view sync logs" ON public.sync_logs;
DROP POLICY IF EXISTS "Authenticated users can create sync logs" ON public.sync_logs;
DROP POLICY IF EXISTS "Admins can manage sync logs" ON public.sync_logs;

-- Create new clinic-scoped RLS policies for sync_logs
CREATE POLICY "Users can only access their clinic's sync logs" ON public.sync_logs
  FOR ALL USING (
    clinic_id = public.get_user_clinic_id()
  ); 