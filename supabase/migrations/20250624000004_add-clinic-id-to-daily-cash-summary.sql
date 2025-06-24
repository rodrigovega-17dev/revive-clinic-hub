-- Add clinic_id to daily_cash_summary table (initially nullable)
ALTER TABLE public.daily_cash_summary 
ADD COLUMN clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_daily_cash_summary_clinic_id ON public.daily_cash_summary (clinic_id);

-- Update existing daily_cash_summary records to belong to the default clinic
UPDATE public.daily_cash_summary 
SET clinic_id = (SELECT id FROM public.clinics WHERE slug = 'default-clinic')
WHERE clinic_id IS NULL;

-- Now make clinic_id NOT NULL after all records have been updated
ALTER TABLE public.daily_cash_summary 
ALTER COLUMN clinic_id SET NOT NULL;

-- Drop existing RLS policies for daily_cash_summary
DROP POLICY IF EXISTS "Authenticated users can view daily cash summaries" ON public.daily_cash_summary;
DROP POLICY IF EXISTS "Admins and reception can manage daily cash summaries" ON public.daily_cash_summary;

-- Create new clinic-scoped RLS policies for daily_cash_summary
CREATE POLICY "Users can only access their clinic's daily cash summaries" ON public.daily_cash_summary
  FOR ALL USING (
    clinic_id = public.get_user_clinic_id()
  ); 