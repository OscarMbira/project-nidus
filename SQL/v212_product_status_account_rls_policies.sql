-- ============================================================================
-- Product Status Account RLS Policies
-- Version: v212
-- Description: Row Level Security policies for Product Status Account tables
-- Date: 2026-01-20
-- ============================================================================
--
-- Purpose:
-- Implements Row Level Security (RLS) for all Product Status Account tables to ensure
-- proper access control based on project membership and user roles.
--
-- Prerequisites:
-- - v211_product_status_account_tables.sql must be run first
-- - user_projects table must exist
-- - roles table must exist
-- - user_roles table must exist
--
-- Access Rules:
-- - Project members can view Product Status Accounts for their projects
-- - Product owners and Project Managers can create/edit Product Status Accounts
-- - Product Status Accounts are read-only for team members (except status updates)
-- - PMO Admins can view all Product Status Accounts in their organization
-- - Project Board members can view Product Status Accounts for reporting
--
-- ============================================================================
-- SECTION 1: GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions to authenticated role
GRANT SELECT, INSERT, UPDATE ON product_status_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON psa_status_history TO authenticated;
GRANT SELECT, INSERT, UPDATE ON psa_progress_snapshots TO authenticated;
GRANT SELECT, INSERT, UPDATE ON psa_linked_issues TO authenticated;
GRANT SELECT, INSERT, UPDATE ON psa_quality_checks TO authenticated;
GRANT SELECT, INSERT, UPDATE ON psa_acceptance_checks TO authenticated;
GRANT SELECT, INSERT, UPDATE ON psa_milestones TO authenticated;
GRANT SELECT, INSERT, UPDATE ON psa_dependencies TO authenticated;

-- ============================================================================
-- SECTION 2: ENABLE RLS
-- ============================================================================

ALTER TABLE product_status_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE psa_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE psa_progress_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE psa_linked_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE psa_quality_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE psa_acceptance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE psa_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE psa_dependencies ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 3: HELPER FUNCTION - Check Product Status Account Access
-- ============================================================================

CREATE OR REPLACE FUNCTION check_psa_access(p_psa_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_project_id UUID;
BEGIN
    -- Get project_id from Product Status Account
    SELECT project_id INTO v_project_id
    FROM product_status_accounts
    WHERE id = p_psa_id
    AND is_deleted = false;
    
    IF v_project_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if user is project member
    RETURN EXISTS (
        SELECT 1 FROM user_projects up
        JOIN users u ON up.user_id = u.id
        WHERE u.auth_user_id = auth.uid()
        AND up.project_id = v_project_id
        AND up.is_deleted = FALSE
    )
    OR EXISTS (
        -- PMO Admin or System Admin
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND r.role_name IN ('pmo_admin', 'System Admin')
        AND ur.is_active = TRUE
        AND ur.is_deleted = FALSE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog, auth;

-- ============================================================================
-- SECTION 4: PRODUCT_STATUS_ACCOUNTS RLS POLICIES
-- ============================================================================

-- SELECT Policy: Project members, PMO Admins, System Admins
DROP POLICY IF EXISTS policy_product_status_accounts_select ON product_status_accounts;
CREATE POLICY policy_product_status_accounts_select ON product_status_accounts
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_projects up
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
            AND up.project_id = product_status_accounts.project_id
            AND up.is_deleted = FALSE
        )
        OR EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
            AND r.role_name IN ('pmo_admin', 'System Admin')
            AND ur.is_active = TRUE
            AND ur.is_deleted = FALSE
        )
    );

-- INSERT Policy: Project members
DROP POLICY IF EXISTS policy_product_status_accounts_insert ON product_status_accounts;
CREATE POLICY policy_product_status_accounts_insert ON product_status_accounts
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_projects up
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
            AND up.project_id = product_status_accounts.project_id
            AND up.is_deleted = FALSE
        )
    );

-- UPDATE Policy: Product owner, Project Manager, PMO Admins
DROP POLICY IF EXISTS policy_product_status_accounts_update ON product_status_accounts;
CREATE POLICY policy_product_status_accounts_update ON product_status_accounts
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_projects up
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
            AND up.project_id = product_status_accounts.project_id
            AND up.is_deleted = FALSE
            AND (
                up.project_role IN ('Project Manager', 'Product Owner')
                OR up.access_level IN ('owner', 'admin')
                OR product_status_accounts.assigned_to_id = u.id
            )
        )
        OR EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
            AND r.role_name IN ('pmo_admin', 'System Admin')
            AND ur.is_active = TRUE
            AND ur.is_deleted = FALSE
        )
    );

-- DELETE Policy: Only soft delete (is_deleted flag)
DROP POLICY IF EXISTS policy_product_status_accounts_delete ON product_status_accounts;
CREATE POLICY policy_product_status_accounts_delete ON product_status_accounts
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_projects up
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
            AND up.project_id = product_status_accounts.project_id
            AND up.is_deleted = FALSE
            AND (up.project_role IN ('Project Manager', 'Product Owner') OR up.access_level IN ('owner', 'admin'))
        )
        OR EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
            AND r.role_name IN ('pmo_admin', 'System Admin')
            AND ur.is_active = TRUE
            AND ur.is_deleted = FALSE
        )
    );

-- ============================================================================
-- SECTION 5: CHILD TABLES RLS POLICIES (using check_psa_access)
-- ============================================================================

-- psa_status_history
CREATE POLICY psa_status_history_select ON psa_status_history
    FOR SELECT
    USING (check_psa_access(product_status_account_id));

CREATE POLICY psa_status_history_insert ON psa_status_history
    FOR INSERT
    WITH CHECK (check_psa_access(product_status_account_id));

CREATE POLICY psa_status_history_update ON psa_status_history
    FOR UPDATE
    USING (check_psa_access(product_status_account_id));

CREATE POLICY psa_status_history_delete ON psa_status_history
    FOR DELETE
    USING (check_psa_access(product_status_account_id));

-- psa_progress_snapshots
CREATE POLICY psa_progress_snapshots_select ON psa_progress_snapshots
    FOR SELECT
    USING (check_psa_access(product_status_account_id));

CREATE POLICY psa_progress_snapshots_insert ON psa_progress_snapshots
    FOR INSERT
    WITH CHECK (check_psa_access(product_status_account_id));

CREATE POLICY psa_progress_snapshots_update ON psa_progress_snapshots
    FOR UPDATE
    USING (check_psa_access(product_status_account_id));

CREATE POLICY psa_progress_snapshots_delete ON psa_progress_snapshots
    FOR DELETE
    USING (check_psa_access(product_status_account_id));

-- psa_linked_issues
CREATE POLICY psa_linked_issues_select ON psa_linked_issues
    FOR SELECT
    USING (check_psa_access(product_status_account_id));

CREATE POLICY psa_linked_issues_insert ON psa_linked_issues
    FOR INSERT
    WITH CHECK (check_psa_access(product_status_account_id));

CREATE POLICY psa_linked_issues_update ON psa_linked_issues
    FOR UPDATE
    USING (check_psa_access(product_status_account_id));

CREATE POLICY psa_linked_issues_delete ON psa_linked_issues
    FOR DELETE
    USING (check_psa_access(product_status_account_id));

-- psa_quality_checks
CREATE POLICY psa_quality_checks_select ON psa_quality_checks
    FOR SELECT
    USING (check_psa_access(product_status_account_id));

CREATE POLICY psa_quality_checks_insert ON psa_quality_checks
    FOR INSERT
    WITH CHECK (check_psa_access(product_status_account_id));

CREATE POLICY psa_quality_checks_update ON psa_quality_checks
    FOR UPDATE
    USING (check_psa_access(product_status_account_id));

CREATE POLICY psa_quality_checks_delete ON psa_quality_checks
    FOR DELETE
    USING (check_psa_access(product_status_account_id));

-- psa_acceptance_checks
CREATE POLICY psa_acceptance_checks_select ON psa_acceptance_checks
    FOR SELECT
    USING (check_psa_access(product_status_account_id));

CREATE POLICY psa_acceptance_checks_insert ON psa_acceptance_checks
    FOR INSERT
    WITH CHECK (check_psa_access(product_status_account_id));

CREATE POLICY psa_acceptance_checks_update ON psa_acceptance_checks
    FOR UPDATE
    USING (check_psa_access(product_status_account_id));

CREATE POLICY psa_acceptance_checks_delete ON psa_acceptance_checks
    FOR DELETE
    USING (check_psa_access(product_status_account_id));

-- psa_milestones
CREATE POLICY psa_milestones_select ON psa_milestones
    FOR SELECT
    USING (check_psa_access(product_status_account_id));

CREATE POLICY psa_milestones_insert ON psa_milestones
    FOR INSERT
    WITH CHECK (check_psa_access(product_status_account_id));

CREATE POLICY psa_milestones_update ON psa_milestones
    FOR UPDATE
    USING (check_psa_access(product_status_account_id));

CREATE POLICY psa_milestones_delete ON psa_milestones
    FOR DELETE
    USING (check_psa_access(product_status_account_id));

-- psa_dependencies
CREATE POLICY psa_dependencies_select ON psa_dependencies
    FOR SELECT
    USING (check_psa_access(product_status_account_id));

CREATE POLICY psa_dependencies_insert ON psa_dependencies
    FOR INSERT
    WITH CHECK (check_psa_access(product_status_account_id));

CREATE POLICY psa_dependencies_update ON psa_dependencies
    FOR UPDATE
    USING (check_psa_access(product_status_account_id));

CREATE POLICY psa_dependencies_delete ON psa_dependencies
    FOR DELETE
    USING (check_psa_access(product_status_account_id));

-- ============================================================================
-- COMPLETION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Product Status Account RLS policies created';
END $$;
