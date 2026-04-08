-- ============================================================================
-- PMO Admin Permissions for Project Types and Project Statuses
-- Version: v154
-- Description: Grants INSERT/UPDATE/DELETE permissions to pmo_admin role
--              for project_types and project_statuses tables
--              Also fixes SELECT policies to use Supabase-compatible syntax
-- Date: 2025-01-27
-- ============================================================================
--
-- Purpose:
-- Allows users with pmo_admin role to manage project_types and project_statuses
-- through the PMO Admin interface. These are lookup/reference tables that
-- should be manageable by PMO administrators.
--
-- Prerequisites:
-- - v09_rls_policies.sql (RLS policies must exist)
-- - v142_rename_org_admin_to_pmo_admin.sql (pmo_admin role must exist)
-- - v153_pmo_admin_project_types_statuses_menu.sql (Menu items exist)
--
-- ============================================================================
-- PROJECT TYPES - Fix SELECT Policy (Supabase-compatible syntax)
-- ============================================================================

-- Drop the old SELECT policy that uses auth.role() syntax (doesn't work in Supabase)
DROP POLICY IF EXISTS policy_project_types_auth_read ON project_types;

-- Create new SELECT policy with correct Supabase syntax
CREATE POLICY policy_project_types_auth_read
    ON project_types
    FOR SELECT
    TO authenticated
    USING (true);

COMMENT ON POLICY policy_project_types_auth_read ON project_types IS
'All authenticated users can read project types (lookup table)';

-- ============================================================================
-- PROJECT STATUSES - Fix SELECT Policy (Supabase-compatible syntax)
-- ============================================================================

-- Drop the old SELECT policy that uses auth.role() syntax (doesn't work in Supabase)
DROP POLICY IF EXISTS policy_project_statuses_auth_read ON project_statuses;

-- Create new SELECT policy with correct Supabase syntax
CREATE POLICY policy_project_statuses_auth_read
    ON project_statuses
    FOR SELECT
    TO authenticated
    USING (true);

COMMENT ON POLICY policy_project_statuses_auth_read ON project_statuses IS
'All authenticated users can read project statuses (lookup table)';

-- ============================================================================
-- PROJECT TYPES - PMO Admin Full Access (INSERT/UPDATE/DELETE)
-- ============================================================================

-- Drop existing policy if it exists (to allow recreation)
DROP POLICY IF EXISTS policy_project_types_pmo_admin_all ON project_types;

-- Create policy for PMO Admin to have full access (INSERT/UPDATE/DELETE)
CREATE POLICY policy_project_types_pmo_admin_all
    ON project_types FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            JOIN users u ON ur.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name = 'pmo_admin'
              AND ur.is_deleted = FALSE
              AND ur.is_active = TRUE
              AND r.is_deleted = FALSE
              AND r.is_active = TRUE
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            JOIN users u ON ur.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name = 'pmo_admin'
              AND ur.is_deleted = FALSE
              AND ur.is_active = TRUE
              AND r.is_deleted = FALSE
              AND r.is_active = TRUE
        )
    );

COMMENT ON POLICY policy_project_types_pmo_admin_all ON project_types IS
'PMO Admin role can INSERT, UPDATE, and DELETE project types for PMO administration';

-- ============================================================================
-- PROJECT STATUSES - PMO Admin Full Access
-- ============================================================================

-- Drop existing policy if it exists (to allow recreation)
DROP POLICY IF EXISTS policy_project_statuses_pmo_admin_all ON project_statuses;

-- Create policy for PMO Admin to have full access (INSERT/UPDATE/DELETE)
CREATE POLICY policy_project_statuses_pmo_admin_all
    ON project_statuses FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            JOIN users u ON ur.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name = 'pmo_admin'
              AND ur.is_deleted = FALSE
              AND ur.is_active = TRUE
              AND r.is_deleted = FALSE
              AND r.is_active = TRUE
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            JOIN users u ON ur.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name = 'pmo_admin'
              AND ur.is_deleted = FALSE
              AND ur.is_active = TRUE
              AND r.is_deleted = FALSE
              AND r.is_active = TRUE
        )
    );

COMMENT ON POLICY policy_project_statuses_pmo_admin_all ON project_statuses IS
'PMO Admin role can INSERT, UPDATE, and DELETE project statuses for PMO administration';

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'PMO Admin permissions added for project_types and project_statuses';
    RAISE NOTICE 'PMO Admin users can now INSERT, UPDATE, and DELETE records in these tables';
END $$;
