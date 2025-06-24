-- Add clinic_id to expenses table (initially nullable)
ALTER TABLE public.expenses 
ADD COLUMN clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_expenses_clinic_id ON public.expenses (clinic_id);

-- Update existing expenses to belong to the default clinic
UPDATE public.expenses 
SET clinic_id = (SELECT id FROM public.clinics WHERE slug = 'default-clinic')
WHERE clinic_id IS NULL;

-- Now make clinic_id NOT NULL after all records have been updated
ALTER TABLE public.expenses 
ALTER COLUMN clinic_id SET NOT NULL;

-- Drop existing RLS policies for expenses
DROP POLICY IF EXISTS "Users can view all expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can create expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can update expenses" ON public.expenses;

-- Create new clinic-scoped RLS policies for expenses
CREATE POLICY "Users can only access their clinic's expenses" ON public.expenses
  FOR ALL USING (
    clinic_id = public.get_user_clinic_id()
  ); 