-- Fix RLS policies for payments table to allow proper access
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can only access their clinic's payments" ON public.payments;
DROP POLICY IF EXISTS "Users can view clinic payments" ON public.payments;
DROP POLICY IF EXISTS "Clinic owners can manage payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Users can view payments they received" ON public.payments;
DROP POLICY IF EXISTS "Authenticated users can create payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can manage all payments" ON public.payments;

-- Create new comprehensive RLS policies for payments
-- Allow users to view payments for their clinic
CREATE POLICY "Users can view clinic payments" ON public.payments
  FOR SELECT USING (
    clinic_id = public.get_user_clinic_id()
  );

-- Allow authenticated users to create payments for their clinic
CREATE POLICY "Users can create clinic payments" ON public.payments
  FOR INSERT WITH CHECK (
    clinic_id = public.get_user_clinic_id()
  );

-- Allow authenticated users to update payments for their clinic
CREATE POLICY "Users can update clinic payments" ON public.payments
  FOR UPDATE USING (
    clinic_id = public.get_user_clinic_id()
  );

-- Allow authenticated users to delete payments for their clinic
CREATE POLICY "Users can delete clinic payments" ON public.payments
  FOR DELETE USING (
    clinic_id = public.get_user_clinic_id()
  ); 
 
 