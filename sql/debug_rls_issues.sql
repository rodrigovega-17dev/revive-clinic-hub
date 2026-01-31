-- Check if RLS is enabled on clinics table
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'clinics';

-- Check if policies exist for clinics table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'clinics';

-- Check if the helper functions exist
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name IN ('get_user_clinic_id', 'is_clinic_owner')
AND routine_schema = 'public';

-- Test the get_user_clinic_id function (this will show the current user's clinic_id)
SELECT public.get_user_clinic_id() as current_user_clinic_id;

-- Test the is_clinic_owner function
SELECT public.is_clinic_owner() as is_owner;

-- Check if the current user has a profile
SELECT id, email, clinic_id, is_clinic_owner 
FROM public.profiles 
WHERE id = auth.uid();

-- Check if the clinic exists for the current user
SELECT c.id, c.name, c.subscription_status, p.id as profile_id
FROM public.clinics c
JOIN public.profiles p ON c.id = p.clinic_id
WHERE p.id = auth.uid();

-- Check RLS policies for all tables
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename; 
 
 