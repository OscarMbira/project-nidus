-- =====================================================
-- v141: Fix Role Permissions RLS Policy
-- =====================================================
-- Description: Fixes RLS policy for role_permissions table to allow authenticated users to read
-- Created: 2025-12-18
-- Author: System
-- Dependencies: v09_rls_policies.sql
-- =====================================================

-- Drop the existing policy that uses auth.role() which may not work correctly in Supabase
DROP POLICY IF EXISTS policy_role_permissions_auth_read ON role_permissions;

-- Recreate the policy using auth.uid() IS NOT NULL which is the correct way to check for authenticated users in Supabase
CREATE POLICY policy_role_permissions_auth_read
    ON role_permissions FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Grant explicit table permissions to authenticated role
-- This is often the missing piece - RLS policies alone aren't enough!
GRANT SELECT ON role_permissions TO authenticated;

-- Verify the policy was created and permissions granted
DO $$
DECLARE
    policy_exists BOOLEAN;
    has_select_perm BOOLEAN;
BEGIN
    -- Check if policy exists
    SELECT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'role_permissions'
        AND policyname = 'policy_role_permissions_auth_read'
    ) INTO policy_exists;
    
    -- Check if authenticated role has SELECT permission
    SELECT has_table_privilege('authenticated', 'public.role_permissions', 'SELECT') INTO has_select_perm;
    
    IF policy_exists AND has_select_perm THEN
        RAISE NOTICE '✅ v141: Role permissions RLS policy and permissions fixed successfully.';
    ELSIF policy_exists THEN
        RAISE WARNING '⚠️ v141: Policy created but SELECT permission may not be granted.';
    ELSE
        RAISE WARNING '⚠️ v141: Policy may not have been created. Please verify manually.';
    END IF;
END $$;

