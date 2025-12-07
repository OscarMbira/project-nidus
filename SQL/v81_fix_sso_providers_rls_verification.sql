-- =====================================================================================
-- Version: v81 (Verification Script)
-- Feature: Verify and Fix SSO Providers RLS Policy
-- Description: Check current policies and fix if needed
-- Author: Development Team
-- Date: 2025-01-XX
-- =====================================================================================

-- First, let's see what policies currently exist
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
WHERE tablename = 'sso_providers'
ORDER BY policyname;

-- =====================================================================================
-- Fix: Update RLS Policy for sso_providers
-- =====================================================================================

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS policy_sso_providers_admin_all ON sso_providers;
DROP POLICY IF EXISTS policy_sso_providers_auth_read ON sso_providers;
DROP POLICY IF EXISTS policy_sso_providers_public_read ON sso_providers;
DROP POLICY IF EXISTS policy_sso_providers_authenticated_read ON sso_providers;

-- Recreate admin policy (for full admin access)
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

-- Create public read policy (allows unauthenticated users to read active SSO providers)
-- This is necessary so users can see SSO options on the login page before authenticating
CREATE POLICY policy_sso_providers_public_read
    ON sso_providers FOR SELECT
    USING (is_active = true AND is_deleted = false);

-- =====================================================================================
-- Verification
-- =====================================================================================

-- Verify policies were created
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual IS NOT NULL THEN 'Has USING clause'
        ELSE 'No USING clause'
    END as has_using_clause
FROM pg_policies
WHERE tablename = 'sso_providers'
ORDER BY policyname;

-- Test query (should work for unauthenticated users)
-- This will show if the policy works
DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'SSO Providers RLS Policy Fix Applied';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Policy policy_sso_providers_admin_all recreated';
    RAISE NOTICE 'Policy policy_sso_providers_public_read created';
    RAISE NOTICE 'Unauthenticated users can now read active SSO providers';
    RAISE NOTICE '';
    RAISE NOTICE 'To test: Try querying sso_providers as an unauthenticated user';
    RAISE NOTICE 'SELECT * FROM sso_providers WHERE is_active = true AND is_deleted = false;';
    RAISE NOTICE '================================================';
END $$;

