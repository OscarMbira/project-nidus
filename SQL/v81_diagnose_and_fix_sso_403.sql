-- =====================================================================================
-- DIAGNOSTIC AND FIX FOR SSO_PROVIDERS 403 ERROR
-- This script will diagnose the exact issue and apply the correct fix
-- =====================================================================================

-- STEP 1: Check if table exists and in which schema
DO $$
DECLARE
    table_exists BOOLEAN;
    table_schema_name TEXT;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'sso_providers'
    ) INTO table_exists;

    IF table_exists THEN
        RAISE NOTICE '✓ Table sso_providers EXISTS in public schema';

        SELECT table_schema INTO table_schema_name
        FROM information_schema.tables
        WHERE table_name = 'sso_providers' AND table_schema = 'public';

        RAISE NOTICE '  Schema: %', table_schema_name;
    ELSE
        RAISE NOTICE '✗ Table sso_providers DOES NOT EXIST in public schema';
        RAISE NOTICE '  You need to run v51_sso_integration.sql first!';
    END IF;
END $$;

-- STEP 2: Check RLS status
DO $$
DECLARE
    rls_enabled BOOLEAN;
BEGIN
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE relname = 'sso_providers' AND relnamespace = 'public'::regnamespace;

    IF rls_enabled IS NOT NULL THEN
        RAISE NOTICE '✓ RLS Status: %', CASE WHEN rls_enabled THEN 'ENABLED' ELSE 'DISABLED' END;
    END IF;
END $$;

-- STEP 3: Check current policies
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'sso_providers';

    RAISE NOTICE '✓ Current policies count: %', policy_count;

    IF policy_count > 0 THEN
        RAISE NOTICE '  Existing policies:';
        FOR policy_rec IN (
            SELECT policyname, cmd, roles
            FROM pg_policies
            WHERE schemaname = 'public' AND tablename = 'sso_providers'
        ) LOOP
            RAISE NOTICE '    - % (%, roles: %)', policy_rec.policyname, policy_rec.cmd, policy_rec.roles;
        END LOOP;
    END IF;
END $$;

-- STEP 4: Check table permissions for anon and authenticated roles
DO $$
BEGIN
    RAISE NOTICE '✓ Checking table permissions:';
    RAISE NOTICE '  anon SELECT: %', has_table_privilege('anon', 'public.sso_providers', 'SELECT');
    RAISE NOTICE '  authenticated SELECT: %', has_table_privilege('authenticated', 'public.sso_providers', 'SELECT');
    RAISE NOTICE '  authenticated INSERT: %', has_table_privilege('authenticated', 'public.sso_providers', 'INSERT');
END $$;

-- STEP 5: Check if table has any data
DO $$
DECLARE
    row_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO row_count FROM sso_providers;
    RAISE NOTICE '✓ Total rows in sso_providers: %', row_count;
END $$;

RAISE NOTICE '';
RAISE NOTICE '================================================';
RAISE NOTICE 'APPLYING FIX...';
RAISE NOTICE '================================================';

-- STEP 6: Apply the comprehensive fix
-- First, completely disable RLS
ALTER TABLE IF EXISTS sso_providers DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DO $$
BEGIN
    DROP POLICY IF EXISTS policy_sso_providers_admin_all ON sso_providers;
    DROP POLICY IF EXISTS policy_sso_providers_auth_read ON sso_providers;
    DROP POLICY IF EXISTS policy_sso_providers_public_read ON sso_providers;
    DROP POLICY IF EXISTS policy_sso_providers_authenticated_read ON sso_providers;
    DROP POLICY IF EXISTS policy_sso_providers_select ON sso_providers;
    DROP POLICY IF EXISTS policy_sso_providers_anon_read ON sso_providers;
    RAISE NOTICE '✓ All old policies dropped';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '! Error dropping policies (table might not exist): %', SQLERRM;
END $$;

-- Re-enable RLS
ALTER TABLE IF EXISTS sso_providers ENABLE ROW LEVEL SECURITY;
RAISE NOTICE '✓ RLS enabled';

-- Revoke all existing permissions first
DO $$
BEGIN
    REVOKE ALL ON sso_providers FROM anon;
    REVOKE ALL ON sso_providers FROM authenticated;
    REVOKE ALL ON sso_providers FROM public;
    RAISE NOTICE '✓ Revoked all existing permissions';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '! Error revoking permissions: %', SQLERRM;
END $$;

-- Grant explicit permissions (THIS IS CRITICAL!)
GRANT SELECT ON sso_providers TO anon;
GRANT SELECT ON sso_providers TO authenticated;
GRANT ALL ON sso_providers TO authenticated;
RAISE NOTICE '✓ Granted SELECT to anon and authenticated';

-- Create admin policy
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
RAISE NOTICE '✓ Created admin policy';

-- Create PUBLIC READ policy (this is the key!)
-- This policy allows ANYONE (including unauthenticated users) to read active SSO providers
CREATE POLICY policy_sso_providers_public_read
    ON sso_providers
    FOR SELECT
    TO anon, authenticated  -- Explicitly specify both roles
    USING (
        is_active = true
        AND is_deleted = false
    );
RAISE NOTICE '✓ Created public read policy';

RAISE NOTICE '';
RAISE NOTICE '================================================';
RAISE NOTICE 'FIX APPLIED - VERIFICATION';
RAISE NOTICE '================================================';

-- Final verification
DO $$
DECLARE
    rls_enabled BOOLEAN;
    policy_count INTEGER;
    anon_can_select BOOLEAN;
    auth_can_select BOOLEAN;
BEGIN
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE relname = 'sso_providers';

    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'sso_providers';

    SELECT has_table_privilege('anon', 'public.sso_providers', 'SELECT') INTO anon_can_select;
    SELECT has_table_privilege('authenticated', 'public.sso_providers', 'SELECT') INTO auth_can_select;

    RAISE NOTICE 'RLS Enabled: %', rls_enabled;
    RAISE NOTICE 'Policy Count: %', policy_count;
    RAISE NOTICE 'Anon Can SELECT: %', anon_can_select;
    RAISE NOTICE 'Authenticated Can SELECT: %', auth_can_select;
    RAISE NOTICE '';

    IF anon_can_select AND auth_can_select AND policy_count >= 2 THEN
        RAISE NOTICE '✓✓✓ SUCCESS! The 403 error should now be fixed! ✓✓✓';
        RAISE NOTICE '';
        RAISE NOTICE 'Next steps:';
        RAISE NOTICE '1. Refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)';
        RAISE NOTICE '2. Clear browser cache if needed';
        RAISE NOTICE '3. Check browser console - 403 error should be gone';
    ELSE
        RAISE WARNING 'Setup incomplete! Check the values above.';
        IF NOT anon_can_select THEN
            RAISE WARNING '  - anon role cannot SELECT (this will cause 403!)';
        END IF;
        IF policy_count < 2 THEN
            RAISE WARNING '  - Missing policies (expected 2, got %)', policy_count;
        END IF;
    END IF;
END $$;

-- Show final policies
SELECT
    schemaname AS schema,
    policyname AS policy,
    cmd AS operation,
    roles AS "for_roles"
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'sso_providers'
ORDER BY policyname;

RAISE NOTICE '================================================';
RAISE NOTICE 'If you still get 403 errors after this:';
RAISE NOTICE '1. The table might not exist - run v51_sso_integration.sql';
RAISE NOTICE '2. Try disabling RLS entirely as a test:';
RAISE NOTICE '   ALTER TABLE sso_providers DISABLE ROW LEVEL SECURITY;';
RAISE NOTICE '3. Clear Supabase PostgREST cache (restart project in dashboard)';
RAISE NOTICE '================================================';
