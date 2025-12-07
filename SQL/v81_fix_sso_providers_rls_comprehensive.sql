-- =====================================================================================
-- Version: v81 (COMPREHENSIVE FIX)
-- Feature: Fix SSO Providers 403 Error - Complete Solution
-- Description: Completely fix RLS for sso_providers table to allow public read access
-- Author: Development Team
-- Date: 2025-11-27
-- =====================================================================================

-- IMPORTANT: This script completely fixes the 403 error for sso_providers
-- It ensures RLS is properly configured for both authenticated and anonymous users
-- =====================================================================================

-- Step 1: Disable RLS temporarily to ensure we can modify the table
ALTER TABLE sso_providers DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies (completely clean slate)
DROP POLICY IF EXISTS policy_sso_providers_admin_all ON sso_providers;
DROP POLICY IF EXISTS policy_sso_providers_auth_read ON sso_providers;
DROP POLICY IF EXISTS policy_sso_providers_public_read ON sso_providers;
DROP POLICY IF EXISTS policy_sso_providers_authenticated_read ON sso_providers;
DROP POLICY IF EXISTS policy_sso_providers_select ON sso_providers;
DROP POLICY IF EXISTS policy_sso_providers_anon_read ON sso_providers;

-- Step 3: Re-enable RLS on the table
ALTER TABLE sso_providers ENABLE ROW LEVEL SECURITY;

-- Step 4: Create admin policy FIRST (for full CRUD access)
-- Admins can do everything (SELECT, INSERT, UPDATE, DELETE)
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

-- Step 5: Create public read policy for EVERYONE (authenticated AND anonymous)
-- This is CRITICAL - it allows unauthenticated users to see SSO providers on login page
-- We explicitly grant to 'public' role which includes both 'anon' and 'authenticated'
CREATE POLICY policy_sso_providers_public_read
    ON sso_providers
    FOR SELECT
    TO public  -- This includes both 'anon' (unauthenticated) and 'authenticated' users
    USING (
        is_active = true
        AND is_deleted = false
    );

-- Step 6: Grant explicit table permissions to anon and authenticated roles
-- This is often the missing piece - RLS policies alone aren't enough!
GRANT SELECT ON sso_providers TO anon;
GRANT SELECT ON sso_providers TO authenticated;
GRANT ALL ON sso_providers TO authenticated;  -- For admins

-- Step 7: Verify the setup
DO $$
DECLARE
    rls_enabled BOOLEAN;
    policy_count INTEGER;
    anon_can_select BOOLEAN;
BEGIN
    -- Check if RLS is enabled
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE relname = 'sso_providers';

    -- Count policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'sso_providers';

    -- Check anon permissions
    SELECT has_table_privilege('anon', 'sso_providers', 'SELECT') INTO anon_can_select;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'SSO Providers RLS Comprehensive Fix Complete';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'RLS Enabled: %', rls_enabled;
    RAISE NOTICE 'Total Policies: %', policy_count;
    RAISE NOTICE 'Anon Can SELECT: %', anon_can_select;
    RAISE NOTICE '';
    RAISE NOTICE 'Policies Created:';
    RAISE NOTICE '  1. policy_sso_providers_admin_all';
    RAISE NOTICE '     - Role: authenticated';
    RAISE NOTICE '     - Operation: ALL (SELECT, INSERT, UPDATE, DELETE)';
    RAISE NOTICE '     - Applies to: System Admins only';
    RAISE NOTICE '';
    RAISE NOTICE '  2. policy_sso_providers_public_read';
    RAISE NOTICE '     - Role: public (anon + authenticated)';
    RAISE NOTICE '     - Operation: SELECT';
    RAISE NOTICE '     - Applies to: Everyone (including unauthenticated users)';
    RAISE NOTICE '     - Condition: is_active=true AND is_deleted=false';
    RAISE NOTICE '';
    RAISE NOTICE 'Table Permissions Granted:';
    RAISE NOTICE '  - SELECT granted to: anon, authenticated';
    RAISE NOTICE '  - ALL granted to: authenticated';
    RAISE NOTICE '';
    RAISE NOTICE 'Test Query (should work for anonymous users):';
    RAISE NOTICE '  SELECT * FROM sso_providers WHERE is_active = true AND is_deleted = false;';
    RAISE NOTICE '================================================';

    -- Raise error if setup is incorrect
    IF NOT rls_enabled THEN
        RAISE EXCEPTION 'RLS is not enabled on sso_providers!';
    END IF;

    IF policy_count < 2 THEN
        RAISE EXCEPTION 'Not all policies were created! Expected 2, got %', policy_count;
    END IF;

    IF NOT anon_can_select THEN
        RAISE WARNING 'Anon role does not have SELECT permission! This may cause 403 errors.';
    END IF;
END $$;

-- Step 8: Show all policies
SELECT
    policyname AS "Policy Name",
    cmd AS "Operation",
    roles AS "Roles",
    CASE
        WHEN qual IS NOT NULL THEN 'Yes'
        ELSE 'No'
    END AS "Has Conditions"
FROM pg_policies
WHERE tablename = 'sso_providers'
ORDER BY policyname;

-- Step 9: Show table permissions
SELECT
    grantee AS "Role",
    privilege_type AS "Permission"
FROM information_schema.role_table_grants
WHERE table_name = 'sso_providers'
AND table_schema = 'public'
ORDER BY grantee, privilege_type;

-- =====================================================================================
-- IMPORTANT: After running this script, refresh your application
-- The 403 error should be completely resolved
-- =====================================================================================
