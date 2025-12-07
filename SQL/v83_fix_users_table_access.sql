-- =====================================================================================
-- Fix Users Table 500 Error
-- Fixes RLS policies to prevent infinite recursion
-- =====================================================================================

-- Step 1: Check current status
SELECT
    'Users table exists: ' || CASE WHEN EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'users'
    ) THEN 'YES' ELSE 'NO' END AS table_status;

-- Step 2: Disable RLS temporarily to make changes
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;

-- Step 3: Drop ALL existing policies that might cause recursion
DROP POLICY IF EXISTS policy_users_own_read ON users;
DROP POLICY IF EXISTS policy_users_own_update ON users;
DROP POLICY IF EXISTS policy_users_public_read ON users;
DROP POLICY IF EXISTS policy_users_authenticated_read ON users;
DROP POLICY IF EXISTS policy_users_admin_all ON users;
DROP POLICY IF EXISTS policy_users_select ON users;

-- Step 4: Re-enable RLS
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;

-- Step 5: Grant permissions BEFORE creating policies
GRANT SELECT ON users TO authenticated;
GRANT INSERT ON users TO authenticated;
GRANT UPDATE ON users TO authenticated;

-- Step 6: Create simple policies WITHOUT recursion
-- Users can read their own record
CREATE POLICY policy_users_own_read
    ON users
    FOR SELECT
    TO authenticated
    USING (auth_user_id = auth.uid());

-- Users can update their own record
CREATE POLICY policy_users_own_update
    ON users
    FOR UPDATE
    TO authenticated
    USING (auth_user_id = auth.uid())
    WITH CHECK (auth_user_id = auth.uid());

-- Users can insert their own record (for registration)
CREATE POLICY policy_users_own_insert
    ON users
    FOR INSERT
    TO authenticated
    WITH CHECK (auth_user_id = auth.uid());

-- Verification
SELECT 'RLS enabled: ' || CASE WHEN relrowsecurity THEN 'YES' ELSE 'NO' END AS rls_status
FROM pg_class WHERE relname = 'users';

SELECT 'Policies count: ' || COUNT(*)::TEXT AS policies
FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users';

SELECT 'Authenticated can SELECT: ' ||
    CASE WHEN has_table_privilege('authenticated', 'public.users', 'SELECT')
    THEN 'YES ✓' ELSE 'NO ✗' END AS select_permission;

-- Show policies
SELECT policyname AS "Policy Name", cmd AS "Operation"
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'users'
ORDER BY policyname;
