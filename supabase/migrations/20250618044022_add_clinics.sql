
-- Drop existing policies if they exist and recreate them properly
DROP POLICY IF EXISTS "Authenticated users can view therapists" ON public.therapists;
DROP POLICY IF EXISTS "Admins can manage all therapists" ON public.therapists;
DROP POLICY IF EXISTS "Reception can manage all therapists" ON public.therapists;
DROP POLICY IF EXISTS "Therapists can view their own record" ON public.therapists;
DROP POLICY IF EXISTS "Therapists can update their own record" ON public.therapists;

-- Create the RLS policies for therapists table
CREATE POLICY "Authenticated users can view therapists" ON public.therapists
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage all therapists" ON public.therapists
  FOR ALL TO authenticated USING (public.get_user_role() = 'admin');

CREATE POLICY "Reception can manage all therapists" ON public.therapists
  FOR ALL TO authenticated USING (public.get_user_role() = 'reception');

CREATE POLICY "Therapists can view their own record" ON public.therapists
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Therapists can update their own record" ON public.therapists
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
