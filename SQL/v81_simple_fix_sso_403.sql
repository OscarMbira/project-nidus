-- =====================================================================================
-- SIMPLE FIX FOR SSO_PROVIDERS 403 ERROR
-- Run this script to fix the 403 Forbidden error
-- =====================================================================================

-- Step 1: Check if table exists
SELECT
    CASE
        WHEN EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'sso_providers'
        ) THEN '✓ Table exists'
        ELSE '✗ Table does not exist - run v51_sso_integration.sql first!'
    END AS table_status;

-- Step 2: Disable RLS temporarily (safe operation)
ALTER TABLE IF EXISTS sso_providers DISABLE ROW LEVEL SECURITY;

-- Step 3: Drop all existing policies
DROP POLICY IF EXISTS policy_sso_providers_admin_all ON sso_providers;
DROP POLICY IF EXISTS policy_sso_providers_auth_read ON sso_providers;
DROP POLICY IF EXISTS policy_sso_providers_public_read ON sso_providers;
DROP POLICY IF EXISTS policy_sso_providers_authenticated_read ON sso_providers;
DROP POLICY IF EXISTS policy_sso_providers_select ON sso_providers;
DROP POLICY IF EXISTS policy_sso_providers_anon_read ON sso_providers;
DROP POLICY IF EXISTS "Allow public read access" ON sso_providers;

-- Step 4: Grant permissions BEFORE enabling RLS (this is critical!)
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON sso_providers TO anon;
GRANT SELECT ON sso_providers TO authenticated;
GRANT ALL ON sso_providers TO authenticated;

-- Step 5: Re-enable RLS
ALTER TABLE IF EXISTS sso_providers ENABLE ROW LEVEL SECURITY;

-- Step 6: Create admin policy (for System Admins)
CREATE POLICY policy_sso_providers_admin_all
    ON sso_providers
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_name = 'System Admin'
            AND ur.is_deleted = false
            AND r.is_deleted = false
        )
    );

-- Step 7: Create public read policy (for everyone including unauthenticated users)
-- This is the KEY policy that allows the login page to fetch SSO providers
CREATE POLICY policy_sso_providers_public_read
    ON sso_providers
    FOR SELECT
    USING (is_active = true AND is_deleted = false);

-- Step 8: Verify the fix
SELECT
    'RLS Status: ' || CASE WHEN relrowsecurity THEN 'ENABLED' ELSE 'DISABLED' END AS status
FROM pg_class
WHERE relname = 'sso_providers'
LIMIT 1;

SELECT
    'Policies Created: ' || COUNT(*)::TEXT AS policy_count
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'sso_providers';

SELECT
    'Anon Can Read: ' || CASE WHEN has_table_privilege('anon', 'public.sso_providers', 'SELECT') THEN 'YES ✓' ELSE 'NO ✗' END AS anon_permission;

SELECT
    'Authenticated Can Read: ' || CASE WHEN has_table_privilege('authenticated', 'public.sso_providers', 'SELECT') THEN 'YES ✓' ELSE 'NO ✗' END AS auth_permission;

-- Step 9: Show final policies
SELECT
    policyname AS "Policy Name",
    cmd AS "Operation",
    CASE
        WHEN qual IS NOT NULL THEN 'Has conditions'
        ELSE 'No conditions'
    END AS "Conditions"
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'sso_providers'
ORDER BY policyname;

-- =====================================================================================
-- EXPECTED RESULTS:
-- - RLS Status: ENABLED
-- - Policies Created: 2
-- - Anon Can Read: YES ✓
-- - Authenticated Can Read: YES ✓
--
-- If you see "YES ✓" for both anon and authenticated, the 403 error is FIXED!
-- Refresh your browser to verify.
-- =====================================================================================
