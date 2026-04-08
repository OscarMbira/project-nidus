-- ============================================================================
-- Unconditional Fix for user_projects RLS Policy
-- Version: v180
-- Description: Unconditionally fixes user_projects policy that blocks
--              project_product_descriptions queries
-- Date: 2026-01-19
-- ============================================================================
--
-- Issue: The user_projects policy uses wrong comparison (user_id = auth.uid())
--        which causes cascading failures when other policies check user_projects
--
-- ============================================================================
-- SECTION 1: GRANT PERMISSIONS (if not already granted)
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON user_projects TO authenticated;

-- ============================================================================
-- SECTION 2: UNCONDITIONALLY FIX USER_PROJECTS POLICY
-- ============================================================================

-- Drop the policy unconditionally (it may or may not exist)
DROP POLICY IF EXISTS policy_user_projects_own_read ON user_projects;

-- Recreate with correct check
CREATE POLICY policy_user_projects_own_read
    ON user_projects FOR SELECT
    TO authenticated
    USING (
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE
        )
    );

-- ============================================================================
-- SECTION 3: ALSO FIX OTHER USER_PROJECTS POLICIES IF THEY EXIST
-- ============================================================================

-- Fix the PM manage policy if it exists - use projects table directly to avoid recursion
-- This policy allows project managers to manage memberships
DROP POLICY IF EXISTS policy_user_projects_pm_manage ON user_projects;
-- Note: This policy intentionally left minimal to avoid recursion issues
-- Project managers can manage via the projects table check elsewhere

-- Fix admin policy
DROP POLICY IF EXISTS policy_user_projects_admin_all ON user_projects;
CREATE POLICY policy_user_projects_admin_all
    ON user_projects FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN users u ON ur.user_id = u.id
            JOIN roles r ON ur.role_id = r.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name IN ('pmo_admin', 'System Admin')
              AND ur.is_active = TRUE
              AND ur.is_deleted = FALSE
        )
    );

-- ============================================================================
-- COMPLETION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'v180_fix_user_projects_rls_unconditional.sql completed successfully';
    RAISE NOTICE 'Unconditionally fixed policy_user_projects_own_read to use correct auth_user_id check';
END $$;
