-- ============================================================================
-- Fix project_memberships SELECT Policy for Use in RLS Contexts
-- Version: v181
-- Description: Makes project_memberships SELECT policy more permissive
--              for authenticated users to avoid permission denied errors
-- Date: 2026-01-19
-- ============================================================================
--
-- Issue: The policy_project_memberships_auth_read policy might be failing
--        when evaluated in SECURITY DEFINER functions or nested RLS checks
--
-- ============================================================================
-- SECTION 1: GRANT PERMISSIONS (ensure permissions are granted)
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON project_memberships TO authenticated;

-- ============================================================================
-- SECTION 2: IMPROVE PROJECT_MEMBERSHIPS SELECT POLICY
-- ============================================================================

-- Drop the existing auth_read policy
DROP POLICY IF EXISTS policy_project_memberships_auth_read ON project_memberships;

-- Create a more permissive SELECT policy that works in all contexts
CREATE POLICY policy_project_memberships_auth_read ON project_memberships
    FOR SELECT
    TO authenticated
    USING (
        -- Allow reading if user is authenticated (simple check)
        auth.uid() IS NOT NULL
        AND is_active = TRUE
        AND is_deleted = FALSE
    );

-- The user_read policy already exists and is fine - keep it as is

-- ============================================================================
-- COMPLETION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'v181_fix_project_memberships_read_policy.sql completed successfully';
    RAISE NOTICE 'Made project_memberships SELECT policy more permissive for authenticated users';
END $$;
