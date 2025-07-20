-- Backup Verification Script
-- This script verifies database backup integrity and prepares for safe migrations

-- 1. Verify all tables exist and have expected row counts
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_rows,
    n_dead_tup as dead_rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Check for any active connections that might interfere with migration
SELECT 
    pid,
    usename,
    application_name,
    client_addr,
    state,
    query_start,
    state_change
FROM pg_stat_activity
WHERE datname = current_database()
    AND state = 'active'
    AND pid != pg_backend_pid();

-- 3. Verify critical data integrity before migration
-- Check that all foreign key relationships are valid
SELECT 
    conname as constraint_name,
    conrelid::regclass as table_name,
    confrelid::regclass as referenced_table,
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM pg_constraint c2 
            WHERE c2.oid = c.oid 
            AND pg_constraint_is_valid(c2.oid)
        ) 
        THEN 'INVALID' 
        ELSE 'VALID' 
    END as constraint_status
FROM pg_constraint c
WHERE contype = 'f'
    AND connamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 4. Check for any orphaned records that might cause migration issues
-- Profiles without corresponding auth users
SELECT 'profiles_without_auth_users' as issue_type, COUNT(*) as count
FROM profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = p.id
)
UNION ALL
-- Appointments without valid clients
SELECT 'appointments_without_clients' as issue_type, COUNT(*) as count
FROM appointments a
WHERE NOT EXISTS (
    SELECT 1 FROM clients c WHERE c.id = a.client_id
)
UNION ALL
-- Appointments without valid therapists
SELECT 'appointments_without_therapists' as issue_type, COUNT(*) as count
FROM appointments a
WHERE NOT EXISTS (
    SELECT 1 FROM therapists t WHERE t.id = a.therapist_id
)
UNION ALL
-- Therapists without valid clinics
SELECT 'therapists_without_clinics' as issue_type, COUNT(*) as count
FROM therapists t
WHERE NOT EXISTS (
    SELECT 1 FROM clinics c WHERE c.id = t.clinic_id
);

-- 5. Verify subscription system integrity
SELECT 
    'subscription_plans' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE is_active = true) as active_records
FROM subscription_plans
UNION ALL
SELECT 
    'clinic_subscriptions' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE status = 'active') as active_records
FROM clinic_subscriptions
UNION ALL
SELECT 
    'clinics' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE subscription_status IN ('active', 'trial')) as active_records
FROM clinics;

-- 6. Check for any locks that might prevent migration
SELECT 
    locktype,
    database,
    relation::regclass,
    page,
    tuple,
    virtualxid,
    transactionid,
    classid,
    objid,
    objsubid,
    virtualtransaction,
    pid,
    mode,
    granted,
    fastpath
FROM pg_locks
WHERE database = (SELECT oid FROM pg_database WHERE datname = current_database())
    AND locktype IN ('relation', 'extend', 'page', 'tuple')
ORDER BY relation, mode;

-- 7. Generate backup command for current state
SELECT 
    'pg_dump --verbose --clean --no-acl --no-owner -h ' || 
    COALESCE(current_setting('listen_addresses', true), 'localhost') || 
    ' -U ' || current_user || 
    ' -d ' || current_database() || 
    ' > backup_' || to_char(now(), 'YYYY_MM_DD_HH24_MI_SS') || '.sql' as backup_command;