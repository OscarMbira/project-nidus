-- ============================================================================
-- Quick Diagnostic: Check Project Mandates RLS Status
-- Run this to check if RLS is enabled and policies exist
-- ============================================================================

-- Check if RLS is enabled
SELECT 
    'RLS Enabled: ' || CASE WHEN relrowsecurity THEN 'YES' ELSE 'NO' END AS rls_status
FROM pg_class 
WHERE relname = 'project_mandates';

-- List all policies on project_mandates
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'project_mandates'
ORDER BY policyname;

-- Check table permissions
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges
WHERE table_name = 'project_mandates'
  AND grantee IN ('authenticated', 'anon')
ORDER BY grantee, privilege_type;

-- Check if user exists in users table (use your auth.uid())
-- This will show if the user mapping is working
SELECT 
    'Users table accessible: ' || CASE WHEN COUNT(*) > 0 THEN 'YES' ELSE 'NO' END AS users_status
FROM users
WHERE is_deleted = FALSE
LIMIT 1;
