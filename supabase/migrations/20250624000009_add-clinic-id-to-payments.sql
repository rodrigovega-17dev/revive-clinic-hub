-- Add clinic_id to payments table (initially nullable)
ALTER TABLE public.payments 
ADD COLUMN clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_payments_clinic_id ON public.payments (clinic_id);

-- Update existing payments to belong to the default clinic
UPDATE public.payments 
SET clinic_id = (SELECT id FROM public.clinics WHERE slug = 'default-clinic')
WHERE clinic_id IS NULL;

-- Now make clinic_id NOT NULL after all records have been updated
ALTER TABLE public.payments 
ALTER COLUMN clinic_id SET NOT NULL;

-- Drop existing RLS policies for payments
DROP POLICY IF EXISTS "Authenticated users can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated users can create payments" ON public.payments;
DROP POLICY IF EXISTS "Admins and reception can manage payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Users can view payments they received" ON public.payments;
DROP POLICY IF EXISTS "Admins can manage all payments" ON public.payments;

-- Create new clinic-scoped RLS policies for payments
CREATE POLICY "Users can only access their clinic's payments" ON public.payments
  FOR ALL USING (
    clinic_id = public.get_user_clinic_id()
  ); 