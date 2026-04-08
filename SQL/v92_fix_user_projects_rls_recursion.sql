-- ============================================================================
-- Fix user_projects RLS Infinite Recursion
-- Version: v92
-- Date: 2025-12-09
-- Purpose: Fix infinite recursion in user_projects RLS policy
-- ============================================================================

-- Prerequisites:
-- - v09_rls_policies.sql must have been run
-- - user_projects table must exist

-- Purpose:
-- Fix the infinite recursion error in policy_user_projects_pm_manage
-- The policy was checking user_projects within its own USING clause

-- ============================================================================
-- STEP 1: Disable RLS temporarily
-- ============================================================================

ALTER TABLE IF EXISTS user_projects DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: Drop the problematic policy
-- ============================================================================

DROP POLICY IF EXISTS policy_user_projects_pm_manage ON user_projects;

-- ============================================================================
-- STEP 3: Re-enable RLS
-- ============================================================================

ALTER TABLE IF EXISTS user_projects ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: Create fixed policies (without recursion)
-- ============================================================================

-- Users: Read own project assignments
-- (Keep existing policy if it works, otherwise recreate)
DROP POLICY IF EXISTS policy_user_projects_own_read ON user_projects;
CREATE POLICY policy_user_projects_own_read
    ON user_projects FOR SELECT
    TO authenticated
    USING (
        -- Direct check using auth.uid() - no recursion
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

-- Project Managers: Manage assignments in their projects
-- Use project_memberships or a different approach to avoid recursion
-- For now, use a simpler approach: check if user is project manager via projects table
CREATE POLICY policy_user_projects_pm_manage
    ON user_projects FOR ALL
    TO authenticated
    USING (
        -- Check if user is project manager via projects table (no recursion)
        EXISTS (
            SELECT 1 FROM projects p
            JOIN users u ON u.id = p.project_manager_user_id
            WHERE p.id = user_projects.project_id
            AND u.auth_user_id = auth.uid()
            AND p.is_deleted = FALSE
        )
        OR
        -- Or check via project_memberships if it exists
        EXISTS (
            SELECT 1 FROM project_memberships pm
            JOIN users u ON u.id = pm.user_id
            JOIN project_roles pr ON pr.id = pm.project_role_id
            WHERE pm.project_id = user_projects.project_id
            AND u.auth_user_id = auth.uid()
            AND pr.role_name IN ('project_manager', 'programme_manager')
            AND pm.is_active = TRUE
        )
        OR
        -- Allow if user is assigning themselves (for self-assignment)
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    )
    WITH CHECK (
        -- Same conditions for INSERT/UPDATE
        EXISTS (
            SELECT 1 FROM projects p
            JOIN users u ON u.id = p.project_manager_user_id
            WHERE p.id = user_projects.project_id
            AND u.auth_user_id = auth.uid()
            AND p.is_deleted = FALSE
        )
        OR
        EXISTS (
            SELECT 1 FROM project_memberships pm
            JOIN users u ON u.id = pm.user_id
            JOIN project_roles pr ON pr.id = pm.project_role_id
            WHERE pm.project_id = user_projects.project_id
            AND u.auth_user_id = auth.uid()
            AND pr.role_name IN ('project_manager', 'programme_manager')
            AND pm.is_active = TRUE
        )
        OR
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

-- Admins: Full access (keep existing if it works)
DROP POLICY IF EXISTS policy_user_projects_admin_all ON user_projects;
CREATE POLICY policy_user_projects_admin_all
    ON user_projects FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            JOIN users u ON u.id = ur.user_id
            WHERE u.auth_user_id = auth.uid()
            AND r.role_name = 'account_owner'
            AND ur.is_active = TRUE
            AND ur.is_deleted = FALSE
        )
    );

-- ============================================================================
-- STEP 5: Grant necessary permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON user_projects TO authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

