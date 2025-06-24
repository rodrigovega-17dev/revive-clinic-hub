-- Add clinic_id to suppliers table (initially nullable)
ALTER TABLE public.suppliers 
ADD COLUMN clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_suppliers_clinic_id ON public.suppliers (clinic_id);

-- Update existing suppliers to belong to the default clinic
UPDATE public.suppliers 
SET clinic_id = (SELECT id FROM public.clinics WHERE slug = 'default-clinic')
WHERE clinic_id IS NULL;

-- Now make clinic_id NOT NULL after all records have been updated
ALTER TABLE public.suppliers 
ALTER COLUMN clinic_id SET NOT NULL;

-- Drop existing RLS policies for suppliers
DROP POLICY IF EXISTS "Authenticated users can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins can manage suppliers" ON public.suppliers;

-- Create new clinic-scoped RLS policies for suppliers
CREATE POLICY "Users can only access their clinic's suppliers" ON public.suppliers
  FOR ALL USING (
    clinic_id = public.get_user_clinic_id()
  ); 