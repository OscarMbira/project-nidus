-- ============================================================================
-- Comprehensive Fix for RLS Infinite Recursion
-- Version: v93
-- Date: 2025-12-09
-- Purpose: Fix infinite recursion between users and user_projects tables
-- ============================================================================

-- Prerequisites:
-- - v09_rls_policies.sql must have been run
-- - v83_fix_users_table_access.sql must have been run
-- - v92_fix_user_projects_rls_recursion.sql must have been run

-- Purpose:
-- Fix the infinite recursion error (42P17) that occurs when:
-- 1. Accessing users table triggers user_projects RLS check
-- 2. user_projects RLS policy checks users table
-- 3. This creates an infinite loop

-- ============================================================================
-- STEP 1: Fix users table RLS policies to avoid checking user_projects
-- ============================================================================

-- Disable RLS temporarily
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS policy_users_own_read ON users;
DROP POLICY IF EXISTS policy_users_own_update ON users;
DROP POLICY IF EXISTS policy_users_own_insert ON users;
DROP POLICY IF EXISTS policy_users_own_all ON users;
DROP POLICY IF EXISTS policy_users_project_read ON users;
DROP POLICY IF EXISTS policy_users_admin_all ON users;

-- Re-enable RLS
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;

-- Create simple policies that ONLY check auth_user_id (no table joins)
-- This prevents any recursion with user_projects
CREATE POLICY policy_users_own_read
    ON users FOR SELECT
    TO authenticated
    USING (auth_user_id = auth.uid());

CREATE POLICY policy_users_own_update
    ON users FOR UPDATE
    TO authenticated
    USING (auth_user_id = auth.uid())
    WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY policy_users_own_insert
    ON users FOR INSERT
    TO authenticated
    WITH CHECK (auth_user_id = auth.uid());

-- ============================================================================
-- STEP 2: Fix user_projects RLS policies to avoid recursion
-- ============================================================================

-- Disable RLS temporarily
ALTER TABLE IF EXISTS user_projects DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS policy_user_projects_own_read ON user_projects;
DROP POLICY IF EXISTS policy_user_projects_pm_manage ON user_projects;
DROP POLICY IF EXISTS policy_user_projects_admin_all ON user_projects;

-- Re-enable RLS
ALTER TABLE IF EXISTS user_projects ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON user_projects TO authenticated;

-- Create policies that use a SECURITY DEFINER function to avoid recursion
-- This function bypasses RLS when checking users table
CREATE OR REPLACE FUNCTION get_user_id_from_auth(auth_uid UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    internal_user_id UUID;
BEGIN
    -- This function runs with SECURITY DEFINER, so it bypasses RLS
    SELECT id INTO internal_user_id
    FROM users
    WHERE auth_user_id = auth_uid
    LIMIT 1;
    
    RETURN internal_user_id;
END;
$$;

-- Users: Read own project assignments
-- Use the SECURITY DEFINER function to avoid recursion
CREATE POLICY policy_user_projects_own_read
    ON user_projects FOR SELECT
    TO authenticated
    USING (
        user_id = get_user_id_from_auth(auth.uid())
    );

-- Project Managers: Manage assignments in their projects
-- Use projects table directly (no user_projects recursion)
CREATE POLICY policy_user_projects_pm_manage
    ON user_projects FOR ALL
    TO authenticated
    USING (
        -- Check if user is project manager via projects table
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = user_projects.project_id
            AND p.project_manager_user_id = get_user_id_from_auth(auth.uid())
            AND p.is_deleted = FALSE
        )
        OR
        -- Check via project_memberships if it exists
        EXISTS (
            SELECT 1 FROM project_memberships pm
            JOIN project_roles pr ON pr.id = pm.project_role_id
            WHERE pm.project_id = user_projects.project_id
            AND pm.user_id = get_user_id_from_auth(auth.uid())
            AND pr.role_name IN ('project_manager', 'programme_manager')
            AND pm.is_active = TRUE
        )
        OR
        -- Allow if user is assigning themselves
        user_id = get_user_id_from_auth(auth.uid())
    )
    WITH CHECK (
        -- Same conditions for INSERT/UPDATE
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = user_projects.project_id
            AND p.project_manager_user_id = get_user_id_from_auth(auth.uid())
            AND p.is_deleted = FALSE
        )
        OR
        EXISTS (
            SELECT 1 FROM project_memberships pm
            JOIN project_roles pr ON pr.id = pm.project_role_id
            WHERE pm.project_id = user_projects.project_id
            AND pm.user_id = get_user_id_from_auth(auth.uid())
            AND pr.role_name IN ('project_manager', 'programme_manager')
            AND pm.is_active = TRUE
        )
        OR
        user_id = get_user_id_from_auth(auth.uid())
    );

-- Admins: Full access (using SECURITY DEFINER function)
CREATE POLICY policy_user_projects_admin_all
    ON user_projects FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = get_user_id_from_auth(auth.uid())
            AND r.role_name = 'account_owner'
            AND ur.is_active = TRUE
            AND ur.is_deleted = FALSE
        )
    );

-- ============================================================================
-- STEP 3: Add comment explaining the SECURITY DEFINER function
-- ============================================================================

COMMENT ON FUNCTION get_user_id_from_auth IS 'Helper function to get internal user ID from auth user ID. Uses SECURITY DEFINER to bypass RLS and prevent infinite recursion when checking users table from user_projects RLS policies.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

