-- Check if tables exist and their structure
SELECT table_name, column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name IN ('clinics', 'profiles', 'subscription_plans', 'clinic_subscriptions')
ORDER BY table_name, ordinal_position;

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('clinics', 'profiles', 'subscription_plans', 'clinic_subscriptions');

-- Check if there are any clinics
SELECT COUNT(*) as clinic_count FROM clinics;

-- Check if there are any profiles
SELECT COUNT(*) as profile_count FROM profiles;

-- Check if there are any subscription plans
SELECT COUNT(*) as plan_count FROM subscription_plans;

-- Check the latest clinic created
SELECT id, name, created_at, subscription_status, subscription_plan_id 
FROM clinics 
ORDER BY created_at DESC 
LIMIT 5;

-- Check if the subscription_plans table has the required columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'subscription_plans' 
AND column_name IN ('stripe_price_id_monthly', 'stripe_price_id_yearly')
ORDER BY ordinal_position; 
 
 