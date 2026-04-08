-- ============================================================================
-- Work Package RLS Policies
-- Version: v217
-- Description: Row Level Security policies for Work Package module
-- Date: 2026-01-20
-- ============================================================================
--
-- Purpose:
-- Implements Row Level Security (RLS) for all Work Package tables to ensure
-- users can only access Work Packages for projects they're members of
-- or have appropriate permissions for.
--
-- Prerequisites:
-- - v216_work_package_enhancement.sql must be run first
-- - All tables must exist
--
-- ============================================================================
-- SECTION 1: GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON work_packages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON wp_products TO authenticated;
GRANT SELECT, INSERT, UPDATE ON wp_quality_criteria TO authenticated;
GRANT SELECT, INSERT, UPDATE ON wp_acceptance_criteria TO authenticated;
GRANT SELECT, INSERT, UPDATE ON wp_resources TO authenticated;
GRANT SELECT, INSERT, UPDATE ON wp_reporting_arrangements TO authenticated;
GRANT SELECT, INSERT, UPDATE ON wp_status_history TO authenticated;
GRANT SELECT, INSERT, UPDATE ON wp_progress_snapshots TO authenticated;
GRANT SELECT, INSERT, UPDATE ON wp_acceptances TO authenticated;

-- ============================================================================
-- SECTION 2: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE work_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE wp_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE wp_quality_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE wp_acceptance_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE wp_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE wp_reporting_arrangements ENABLE ROW LEVEL SECURITY;
ALTER TABLE wp_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE wp_progress_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE wp_acceptances ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 3: HELPER FUNCTION - check_wp_access
-- ============================================================================

CREATE OR REPLACE FUNCTION check_wp_access(p_wp_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_project_id UUID;
    v_assigned_to_id UUID;
BEGIN
    -- Get project_id and assigned_to_user_id from Work Package
    SELECT project_id, assigned_to_user_id INTO v_project_id, v_assigned_to_id
    FROM work_packages
    WHERE id = p_wp_id
      AND is_deleted = false;
    
    IF v_project_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check if user is project member or PMO/System Admin
    IF EXISTS (
        SELECT 1 FROM user_projects up
        JOIN users u ON up.user_id = u.id
        WHERE u.auth_user_id = auth.uid()
          AND up.project_id = v_project_id
          AND up.is_deleted = false
    ) OR EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
          AND r.role_name IN ('pmo_admin', 'System Admin')
          AND ur.is_active = true
          AND ur.is_deleted = false
    ) THEN
        RETURN true;
    END IF;
    
    -- Check if user is assigned to this work package
    IF v_assigned_to_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = v_assigned_to_id
              AND u.auth_user_id = auth.uid()
              AND u.is_deleted = false
        ) THEN
            RETURN true;
        END IF;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_wp_access(UUID) IS 'Checks if user has access to Work Package based on project membership, admin role, or assignment';

-- ============================================================================
-- SECTION 4: work_packages RLS POLICIES
-- ============================================================================

-- SELECT Policy: Project members, PMO Admins, System Admins, Assigned Team Manager
DROP POLICY IF EXISTS policy_work_packages_select ON work_packages;
CREATE POLICY policy_work_packages_select ON work_packages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_projects up
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND up.project_id = work_packages.project_id
              AND up.is_deleted = false
        )
        OR EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
              AND r.role_name IN ('pmo_admin', 'System Admin')
              AND ur.is_active = true
              AND ur.is_deleted = false
        )
        OR EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = work_packages.assigned_to_user_id
              AND u.auth_user_id = auth.uid()
              AND u.is_deleted = false
        )
    );

-- INSERT Policy: Project Manager, Project Director, PMO Admins
DROP POLICY IF EXISTS policy_work_packages_insert ON work_packages;
CREATE POLICY policy_work_packages_insert ON work_packages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_projects up
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND up.project_id = work_packages.project_id
              AND up.is_deleted = false
              AND (
                  up.project_role IN ('Project Manager', 'Project Director')
                  OR up.access_level IN ('owner', 'admin')
              )
        )
        OR EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
              AND r.role_name IN ('pmo_admin', 'System Admin')
              AND ur.is_active = true
              AND ur.is_deleted = false
        )
    );

-- UPDATE Policy: Project Manager, Project Director, PMO Admins, Assigned Team Manager (for their assigned WPs)
DROP POLICY IF EXISTS policy_work_packages_update ON work_packages;
CREATE POLICY policy_work_packages_update ON work_packages
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_projects up
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND up.project_id = work_packages.project_id
              AND up.is_deleted = false
              AND (
                  up.project_role IN ('Project Manager', 'Project Director')
                  OR up.access_level IN ('owner', 'admin')
              )
        )
        OR EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
              AND r.role_name IN ('pmo_admin', 'System Admin')
              AND ur.is_active = true
              AND ur.is_deleted = false
        )
        OR EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = work_packages.assigned_to_user_id
              AND u.auth_user_id = auth.uid()
              AND u.is_deleted = false
              AND work_packages.status IN ('accepted', 'in_progress')
        )
    );

-- DELETE Policy: Only drafts, Project Manager, Project Director, PMO Admins
DROP POLICY IF EXISTS policy_work_packages_delete ON work_packages;
CREATE POLICY policy_work_packages_delete ON work_packages
    FOR DELETE
    USING (
        (status = 'draft' OR status IS NULL)
        AND (
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.project_id = work_packages.project_id
                  AND up.is_deleted = false
                  AND (
                      up.project_role IN ('Project Manager', 'Project Director')
                      OR up.access_level IN ('owner', 'admin')
                  )
            )
            OR EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
                  AND r.role_name IN ('pmo_admin', 'System Admin')
                  AND ur.is_active = true
                  AND ur.is_deleted = false
            )
        )
    );

-- ============================================================================
-- SECTION 5: wp_products RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS policy_wp_products_select ON wp_products;
CREATE POLICY policy_wp_products_select ON wp_products
    FOR SELECT
    USING (check_wp_access(work_package_id) AND is_deleted = false);

DROP POLICY IF EXISTS policy_wp_products_insert ON wp_products;
CREATE POLICY policy_wp_products_insert ON wp_products
    FOR INSERT
    WITH CHECK (check_wp_access(work_package_id));

DROP POLICY IF EXISTS policy_wp_products_update ON wp_products;
CREATE POLICY policy_wp_products_update ON wp_products
    FOR UPDATE
    USING (check_wp_access(work_package_id) AND is_deleted = false);

DROP POLICY IF EXISTS policy_wp_products_delete ON wp_products;
CREATE POLICY policy_wp_products_delete ON wp_products
    FOR DELETE
    USING (check_wp_access(work_package_id) AND is_deleted = false);

-- ============================================================================
-- SECTION 6: wp_quality_criteria RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS policy_wp_quality_criteria_select ON wp_quality_criteria;
CREATE POLICY policy_wp_quality_criteria_select ON wp_quality_criteria
    FOR SELECT
    USING (check_wp_access(work_package_id) AND is_deleted = false);

DROP POLICY IF EXISTS policy_wp_quality_criteria_insert ON wp_quality_criteria;
CREATE POLICY policy_wp_quality_criteria_insert ON wp_quality_criteria
    FOR INSERT
    WITH CHECK (check_wp_access(work_package_id));

DROP POLICY IF EXISTS policy_wp_quality_criteria_update ON wp_quality_criteria;
CREATE POLICY policy_wp_quality_criteria_update ON wp_quality_criteria
    FOR UPDATE
    USING (check_wp_access(work_package_id) AND is_deleted = false);

DROP POLICY IF EXISTS policy_wp_quality_criteria_delete ON wp_quality_criteria;
CREATE POLICY policy_wp_quality_criteria_delete ON wp_quality_criteria
    FOR DELETE
    USING (check_wp_access(work_package_id) AND is_deleted = false);

-- ============================================================================
-- SECTION 7: wp_acceptance_criteria RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS policy_wp_acceptance_criteria_select ON wp_acceptance_criteria;
CREATE POLICY policy_wp_acceptance_criteria_select ON wp_acceptance_criteria
    FOR SELECT
    USING (check_wp_access(work_package_id) AND is_deleted = false);

DROP POLICY IF EXISTS policy_wp_acceptance_criteria_insert ON wp_acceptance_criteria;
CREATE POLICY policy_wp_acceptance_criteria_insert ON wp_acceptance_criteria
    FOR INSERT
    WITH CHECK (check_wp_access(work_package_id));

DROP POLICY IF EXISTS policy_wp_acceptance_criteria_update ON wp_acceptance_criteria;
CREATE POLICY policy_wp_acceptance_criteria_update ON wp_acceptance_criteria
    FOR UPDATE
    USING (check_wp_access(work_package_id) AND is_deleted = false);

DROP POLICY IF EXISTS policy_wp_acceptance_criteria_delete ON wp_acceptance_criteria;
CREATE POLICY policy_wp_acceptance_criteria_delete ON wp_acceptance_criteria
    FOR DELETE
    USING (check_wp_access(work_package_id) AND is_deleted = false);

-- ============================================================================
-- SECTION 8: wp_resources RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS policy_wp_resources_select ON wp_resources;
CREATE POLICY policy_wp_resources_select ON wp_resources
    FOR SELECT
    USING (check_wp_access(work_package_id) AND is_deleted = false);

DROP POLICY IF EXISTS policy_wp_resources_insert ON wp_resources;
CREATE POLICY policy_wp_resources_insert ON wp_resources
    FOR INSERT
    WITH CHECK (check_wp_access(work_package_id));

DROP POLICY IF EXISTS policy_wp_resources_update ON wp_resources;
CREATE POLICY policy_wp_resources_update ON wp_resources
    FOR UPDATE
    USING (check_wp_access(work_package_id) AND is_deleted = false);

DROP POLICY IF EXISTS policy_wp_resources_delete ON wp_resources;
CREATE POLICY policy_wp_resources_delete ON wp_resources
    FOR DELETE
    USING (check_wp_access(work_package_id) AND is_deleted = false);

-- ============================================================================
-- SECTION 9: wp_reporting_arrangements RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS policy_wp_reporting_arrangements_select ON wp_reporting_arrangements;
CREATE POLICY policy_wp_reporting_arrangements_select ON wp_reporting_arrangements
    FOR SELECT
    USING (check_wp_access(work_package_id) AND is_deleted = false);

DROP POLICY IF EXISTS policy_wp_reporting_arrangements_insert ON wp_reporting_arrangements;
CREATE POLICY policy_wp_reporting_arrangements_insert ON wp_reporting_arrangements
    FOR INSERT
    WITH CHECK (check_wp_access(work_package_id));

DROP POLICY IF EXISTS policy_wp_reporting_arrangements_update ON wp_reporting_arrangements;
CREATE POLICY policy_wp_reporting_arrangements_update ON wp_reporting_arrangements
    FOR UPDATE
    USING (check_wp_access(work_package_id) AND is_deleted = false);

DROP POLICY IF EXISTS policy_wp_reporting_arrangements_delete ON wp_reporting_arrangements;
CREATE POLICY policy_wp_reporting_arrangements_delete ON wp_reporting_arrangements
    FOR DELETE
    USING (check_wp_access(work_package_id) AND is_deleted = false);

-- ============================================================================
-- SECTION 10: wp_status_history RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS policy_wp_status_history_select ON wp_status_history;
CREATE POLICY policy_wp_status_history_select ON wp_status_history
    FOR SELECT
    USING (check_wp_access(work_package_id));

DROP POLICY IF EXISTS policy_wp_status_history_insert ON wp_status_history;
CREATE POLICY policy_wp_status_history_insert ON wp_status_history
    FOR INSERT
    WITH CHECK (check_wp_access(work_package_id));

-- ============================================================================
-- SECTION 11: wp_progress_snapshots RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS policy_wp_progress_snapshots_select ON wp_progress_snapshots;
CREATE POLICY policy_wp_progress_snapshots_select ON wp_progress_snapshots
    FOR SELECT
    USING (check_wp_access(work_package_id));

DROP POLICY IF EXISTS policy_wp_progress_snapshots_insert ON wp_progress_snapshots;
CREATE POLICY policy_wp_progress_snapshots_insert ON wp_progress_snapshots
    FOR INSERT
    WITH CHECK (check_wp_access(work_package_id));

-- ============================================================================
-- SECTION 12: wp_acceptances RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS policy_wp_acceptances_select ON wp_acceptances;
CREATE POLICY policy_wp_acceptances_select ON wp_acceptances
    FOR SELECT
    USING (check_wp_access(work_package_id));

DROP POLICY IF EXISTS policy_wp_acceptances_insert ON wp_acceptances;
CREATE POLICY policy_wp_acceptances_insert ON wp_acceptances
    FOR INSERT
    WITH CHECK (check_wp_access(work_package_id));

DO $$
BEGIN
    RAISE NOTICE 'v217_work_package_rls_policies.sql completed successfully';
END $$;
