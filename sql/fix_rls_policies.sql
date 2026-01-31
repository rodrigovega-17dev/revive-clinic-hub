-- Fix RLS policies for payments to allow proper access
-- Run this in the Supabase SQL Editor

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Users can view payments they received" ON public.payments;
DROP POLICY IF EXISTS "Authenticated users can create payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can manage all payments" ON public.payments;

-- Create new, more permissive policies
CREATE POLICY "Authenticated users can view all payments" ON public.payments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create payments" ON public.payments
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admins and reception can manage payments" ON public.payments
  FOR ALL USING (public.get_user_role() IN ('admin', 'reception'));

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'payments'; 