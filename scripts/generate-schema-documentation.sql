-- Generate comprehensive schema documentation
-- This script creates detailed documentation of the current database schema

-- 1. Generate table documentation with relationships
WITH table_info AS (
    SELECT 
        t.table_name,
        string_agg(
            c.column_name || ' ' || 
            UPPER(c.data_type) ||
            CASE 
                WHEN c.character_maximum_length IS NOT NULL 
                THEN '(' || c.character_maximum_length || ')'
                WHEN c.numeric_precision IS NOT NULL 
                THEN '(' || c.numeric_precision || ',' || c.numeric_scale || ')'
                ELSE ''
            END ||
            CASE WHEN c.is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
            CASE WHEN c.column_default IS NOT NULL THEN ' DEFAULT ' || c.column_default ELSE '' END,
            E',\n    '
            ORDER BY c.ordinal_position
        ) as columns
    FROM information_schema.tables t
    JOIN information_schema.columns c ON t.table_name = c.table_name
    WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
    GROUP BY t.table_name
),
foreign_keys AS (
    SELECT 
        tc.table_name,
        string_agg(
            'FOREIGN KEY (' || kcu.column_name || ') REFERENCES ' || 
            ccu.table_name || '(' || ccu.column_name || ')',
            E',\n    '
        ) as fk_constraints
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name
    WHERE tc.table_schema = 'public' 
        AND tc.constraint_type = 'FOREIGN KEY'
    GROUP BY tc.table_name
)
SELECT 
    'CREATE TABLE ' || ti.table_name || ' (' || E'\n    ' ||
    ti.columns ||
    CASE 
        WHEN fk.fk_constraints IS NOT NULL 
        THEN E',\n    ' || fk.fk_constraints 
        ELSE '' 
    END ||
    E'\n);' as table_definition
FROM table_info ti
LEFT JOIN foreign_keys fk ON ti.table_name = fk.table_name
ORDER BY ti.table_name;

-- 2. Generate enum types documentation
SELECT 
    'CREATE TYPE ' || t.typname || ' AS ENUM (' ||
    string_agg('''' || e.enumlabel || '''', ', ' ORDER BY e.enumsortorder) ||
    ');' as enum_definition
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
GROUP BY t.typname
ORDER BY t.typname;

-- 3. Generate function documentation
SELECT 
    'CREATE OR REPLACE FUNCTION ' || routine_name || '() RETURNS ' || 
    data_type || ' AS $' || routine_name || '$' || E'\n' ||
    routine_definition || E'\n' ||
    '$' || routine_name || '$;' as function_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- 4. Generate index documentation
SELECT 
    indexdef || ';' as index_definition
FROM pg_indexes
WHERE schemaname = 'public'
    AND indexname NOT LIKE '%_pkey'  -- Exclude primary key indexes
ORDER BY tablename, indexname;

-- 5. Generate RLS policy documentation
SELECT 
    'CREATE POLICY "' || policyname || '" ON ' || tablename || 
    ' FOR ' || cmd || 
    CASE 
        WHEN roles IS NOT NULL AND roles != '{}'
        THEN ' TO ' || array_to_string(roles, ', ')
        ELSE ''
    END ||
    CASE 
        WHEN qual IS NOT NULL 
        THEN ' USING (' || qual || ')'
        ELSE ''
    END || ';' as policy_definition
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;