-- Fix payments table structure
-- Add missing client_id field
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE;

-- Add missing description field
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Rename payment_method to method to match original schema
ALTER TABLE public.payments 
RENAME COLUMN payment_method TO method;

-- Update existing payments to link to clients through appointments if client_id is null
UPDATE public.payments 
SET client_id = (
  SELECT client_id 
  FROM public.appointments 
  WHERE appointments.id = payments.appointment_id
)
WHERE client_id IS NULL AND appointment_id IS NOT NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_payments_client_id ON public.payments (client_id);

-- Update RLS policies for payments to allow proper access
DROP POLICY IF EXISTS "Users can only access their clinic's payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Users can view payments they received" ON public.payments;
DROP POLICY IF EXISTS "Authenticated users can create payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can manage all payments" ON public.payments;

-- Create new clinic-scoped RLS policies for payments
CREATE POLICY "Users can only access their clinic's payments" ON public.payments
  FOR ALL USING (
    clinic_id = public.get_user_clinic_id()
  ); 
 
 