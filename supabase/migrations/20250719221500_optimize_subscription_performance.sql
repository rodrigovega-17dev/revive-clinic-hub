-- Subscription Performance Optimization Migration
-- This migration adds composite indexes and optimizations for subscription queries

-- Add composite index for subscription plans ordered by sort_order and filtered by is_active
-- This optimizes the main subscription plans query used in useSubscriptionPlans
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active_sorted 
ON subscription_plans (is_active, sort_order) 
WHERE is_active = true;

-- Add composite index for clinic subscription status checking
-- This optimizes the subscription status queries in useSubscriptionStatus
CREATE INDEX IF NOT EXISTS idx_clinic_subscriptions_clinic_status 
ON clinic_subscriptions (clinic_id, status);

-- Add composite index for active subscriptions with trial information
-- This optimizes queries that check for active/trialing subscriptions
CREATE INDEX IF NOT EXISTS idx_clinic_subscriptions_active_trial 
ON clinic_subscriptions (clinic_id, status, trial_end) 
WHERE status IN ('active', 'trialing');

-- Add index for subscription plan lookups by plan_id
-- This optimizes joins between clinic_subscriptions and subscription_plans
CREATE INDEX IF NOT EXISTS idx_clinic_subscriptions_plan_id 
ON clinic_subscriptions (plan_id);

-- Add composite index for subscription invoices by clinic and date
-- This optimizes the invoice history queries in useSubscriptionInvoices
CREATE INDEX IF NOT EXISTS idx_subscription_invoices_clinic_date 
ON subscription_invoices (clinic_id, created_at DESC);

-- Add index for subscription invoices by status for filtering
CREATE INDEX IF NOT EXISTS idx_subscription_invoices_status 
ON subscription_invoices (status);

-- Add composite index for therapist count queries
-- This optimizes the therapist counting in useTherapistCount
CREATE INDEX IF NOT EXISTS idx_therapists_clinic_active 
ON therapists (clinic_id, is_active) 
WHERE is_active = true;

-- Add composite index for appointment count queries (used in subscription status)
-- This optimizes daily appointment counting
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_date 
ON appointments (clinic_id, start_time);

-- Add composite index for client count queries
-- This optimizes active client counting
CREATE INDEX IF NOT EXISTS idx_clients_clinic_active 
ON clients (clinic_id, is_active) 
WHERE is_active = true;

-- Add index for subscription usage tracking
CREATE INDEX IF NOT EXISTS idx_subscription_usage_subscription_date 
ON subscription_usage (subscription_id, date DESC);

-- Create a partial index for current period subscriptions
-- This optimizes queries that check current subscription periods
CREATE INDEX IF NOT EXISTS idx_clinic_subscriptions_current_period 
ON clinic_subscriptions (clinic_id, current_period_end) 
WHERE status = 'active';

-- Add index for canceled subscriptions that haven't ended yet
CREATE INDEX IF NOT EXISTS idx_clinic_subscriptions_canceled_pending 
ON clinic_subscriptions (clinic_id, current_period_end) 
WHERE cancel_at_period_end = true;

-- Performance monitoring: Add a function to track slow subscription queries
CREATE OR REPLACE FUNCTION log_slow_subscription_query(
  query_name TEXT,
  execution_time_ms INTEGER,
  clinic_id UUID DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  -- Log slow queries for monitoring (only in development/staging)
  IF current_setting('app.environment', true) != 'production' THEN
    RAISE NOTICE 'SLOW_QUERY: % took %ms for clinic %', query_name, execution_time_ms, clinic_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add a view for subscription performance monitoring
CREATE OR REPLACE VIEW subscription_performance_stats AS
SELECT 
  'subscription_plans_active' as query_type,
  COUNT(*) as record_count,
  AVG(CASE WHEN is_active THEN 1 ELSE 0 END) as active_ratio
FROM subscription_plans
UNION ALL
SELECT 
  'clinic_subscriptions_active' as query_type,
  COUNT(*) as record_count,
  AVG(CASE WHEN status IN ('active', 'trialing') THEN 1 ELSE 0 END) as active_ratio
FROM clinic_subscriptions
UNION ALL
SELECT 
  'subscription_invoices_recent' as query_type,
  COUNT(*) as record_count,
  AVG(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END) as recent_ratio
FROM subscription_invoices;

-- Grant necessary permissions
GRANT SELECT ON subscription_performance_stats TO authenticated;

-- Add comments for documentation
COMMENT ON INDEX idx_subscription_plans_active_sorted IS 'Optimizes subscription plans loading with active filter and sort order';
COMMENT ON INDEX idx_clinic_subscriptions_clinic_status IS 'Optimizes subscription status checking by clinic';
COMMENT ON INDEX idx_clinic_subscriptions_active_trial IS 'Optimizes active/trialing subscription queries';
COMMENT ON INDEX idx_subscription_invoices_clinic_date IS 'Optimizes invoice history queries by clinic and date';
COMMENT ON INDEX idx_therapists_clinic_active IS 'Optimizes therapist count queries for subscription limits';
COMMENT ON INDEX idx_appointments_clinic_date IS 'Optimizes appointment count queries for usage tracking';
COMMENT ON INDEX idx_clients_clinic_active IS 'Optimizes client count queries for usage tracking';

-- Analyze tables to update statistics for the query planner
ANALYZE subscription_plans;
ANALYZE clinic_subscriptions;
ANALYZE subscription_invoices;
ANALYZE therapists;
ANALYZE appointments;
ANALYZE clients;