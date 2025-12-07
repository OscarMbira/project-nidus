-- =====================================================================================
-- Version: v81 (FINAL FIX)
-- Feature: Fix SSO Providers RLS Policy
-- Description: Allow unauthenticated users to read active SSO providers for login page
-- Author: Development Team
-- Date: 2025-01-XX
-- =====================================================================================

-- Prerequisites:
-- - v51_sso_integration.sql must be run first

-- =====================================================================================
-- IMPORTANT: This script fixes the 403 Forbidden error for sso_providers
-- =====================================================================================

-- Step 1: Drop ALL existing policies to start completely fresh
DROP POLICY IF EXISTS policy_sso_providers_admin_all ON sso_providers;
DROP POLICY IF EXISTS policy_sso_providers_auth_read ON sso_providers;
DROP POLICY IF EXISTS policy_sso_providers_public_read ON sso_providers;
DROP POLICY IF EXISTS policy_sso_providers_authenticated_read ON sso_providers;

-- Step 2: Recreate admin policy (for full admin access - INSERT, UPDATE, DELETE)
-- This must come first to ensure admins have access
CREATE POLICY policy_sso_providers_admin_all
    ON sso_providers FOR ALL
    USING (EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.role_name = 'System Admin'
        AND ur.is_deleted = false
        AND r.is_deleted = false
    ));

-- Step 3: Create public read policy for anonymous/unauthenticated users
-- CRITICAL: This policy does NOT check auth.role() or auth.uid()
-- This allows Supabase's 'anon' role to access the table
-- The USING clause only checks the data conditions (is_active, is_deleted)
CREATE POLICY policy_sso_providers_public_read
    ON sso_providers FOR SELECT
    USING (is_active = true AND is_deleted = false);

-- =====================================================================================
-- Verification and Testing
-- =====================================================================================

-- Verify policies were created
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'sso_providers';
    
    RAISE NOTICE '================================================';
    RAISE NOTICE 'SSO Providers RLS Policy Fix Applied';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Total policies on sso_providers: %', policy_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Policies created:';
    RAISE NOTICE '  1. policy_sso_providers_admin_all (FOR ALL)';
    RAISE NOTICE '  2. policy_sso_providers_public_read (FOR SELECT)';
    RAISE NOTICE '';
    RAISE NOTICE 'The public_read policy allows:';
    RAISE NOTICE '  - Anonymous (unauthenticated) users';
    RAISE NOTICE '  - Authenticated users';
    RAISE NOTICE '  - All users to read active SSO providers';
    RAISE NOTICE '';
    RAISE NOTICE 'To test, try querying as anonymous user:';
    RAISE NOTICE '  SELECT * FROM sso_providers WHERE is_active = true AND is_deleted = false;';
    RAISE NOTICE '================================================';
END $$;

-- Show current policies
SELECT 
    policyname,
    cmd as operation,
    CASE 
        WHEN qual IS NOT NULL THEN 'Has USING clause'
        ELSE 'No USING clause'
    END as policy_details
FROM pg_policies
WHERE tablename = 'sso_providers'
ORDER BY policyname;


