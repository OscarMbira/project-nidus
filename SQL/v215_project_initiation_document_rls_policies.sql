-- ============================================================================
-- Project Initiation Document RLS Policies
-- Version: v215
-- Description: Row Level Security policies for Project Initiation Document module
-- Date: 2026-01-20
-- ============================================================================
--
-- Purpose:
-- Implements Row Level Security (RLS) for all PID tables to ensure
-- users can only access PIDs for projects they're members of
-- or have appropriate permissions for.
--
-- Prerequisites:
-- - v214_project_initiation_document_enhancement.sql must be run first
-- - All tables must exist
--
-- ============================================================================
-- SECTION 1: GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON project_initiation_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE ON pid_objectives TO authenticated;
GRANT SELECT, INSERT, UPDATE ON pid_interfaces TO authenticated;
GRANT SELECT, INSERT, UPDATE ON pid_dependencies TO authenticated;
GRANT SELECT, INSERT, UPDATE ON pid_team_structure TO authenticated;
GRANT SELECT, INSERT, UPDATE ON pid_tolerances TO authenticated;
GRANT SELECT, INSERT, UPDATE ON pid_reporting_arrangements TO authenticated;
GRANT SELECT, INSERT, UPDATE ON pid_revision_history TO authenticated;
GRANT SELECT, INSERT, UPDATE ON pid_approvals TO authenticated;
GRANT SELECT, INSERT, UPDATE ON pid_distribution TO authenticated;

-- ============================================================================
-- SECTION 2: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE project_initiation_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE pid_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE pid_interfaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE pid_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE pid_team_structure ENABLE ROW LEVEL SECURITY;
ALTER TABLE pid_tolerances ENABLE ROW LEVEL SECURITY;
ALTER TABLE pid_reporting_arrangements ENABLE ROW LEVEL SECURITY;
ALTER TABLE pid_revision_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE pid_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE pid_distribution ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 3: HELPER FUNCTION - check_pid_access
-- ============================================================================

CREATE OR REPLACE FUNCTION check_pid_access(p_pid_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_project_id UUID;
BEGIN
    -- Get project_id from PID
    SELECT project_id INTO v_project_id
    FROM project_initiation_documents
    WHERE id = p_pid_id
      AND is_deleted = false;
    
    IF v_project_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check if user is project member or PMO/System Admin
    RETURN EXISTS (
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
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_pid_access(UUID) IS 'Checks if user has access to PID based on project membership or admin role';

-- ============================================================================
-- SECTION 4: PROJECT_INITIATION_DOCUMENTS RLS POLICIES
-- ============================================================================

-- SELECT Policy: Project members, PMO Admins, System Admins
DROP POLICY IF EXISTS policy_project_initiation_documents_select ON project_initiation_documents;
CREATE POLICY policy_project_initiation_documents_select ON project_initiation_documents
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_projects up
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND up.project_id = project_initiation_documents.project_id
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
    );

-- INSERT Policy: Project Manager, Project Director (if project exists)
DROP POLICY IF EXISTS policy_project_initiation_documents_insert ON project_initiation_documents;
CREATE POLICY policy_project_initiation_documents_insert ON project_initiation_documents
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_projects up
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND up.project_id = project_initiation_documents.project_id
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

-- UPDATE Policy: Project Manager, Project Director, PMO Admins (if not approved)
DROP POLICY IF EXISTS policy_project_initiation_documents_update ON project_initiation_documents;
CREATE POLICY policy_project_initiation_documents_update ON project_initiation_documents
    FOR UPDATE
    USING (
        (status != 'approved' OR status IS NULL)
        AND (
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.project_id = project_initiation_documents.project_id
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

-- DELETE Policy: Only drafts, Project Manager, Project Director, PMO Admins
DROP POLICY IF EXISTS policy_project_initiation_documents_delete ON project_initiation_documents;
CREATE POLICY policy_project_initiation_documents_delete ON project_initiation_documents
    FOR DELETE
    USING (
        (status = 'draft' OR status IS NULL)
        AND (
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.project_id = project_initiation_documents.project_id
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
-- SECTION 5: PID_OBJECTIVES RLS POLICIES
-- ============================================================================

-- SELECT Policy: Users with PID access
DROP POLICY IF EXISTS policy_pid_objectives_select ON pid_objectives;
CREATE POLICY policy_pid_objectives_select ON pid_objectives
    FOR SELECT
    USING (check_pid_access(pid_id) AND is_deleted = false);

-- INSERT Policy: Users with PID update access
DROP POLICY IF EXISTS policy_pid_objectives_insert ON pid_objectives;
CREATE POLICY policy_pid_objectives_insert ON pid_objectives
    FOR INSERT
    WITH CHECK (check_pid_access(pid_id));

-- UPDATE Policy: Users with PID update access
DROP POLICY IF EXISTS policy_pid_objectives_update ON pid_objectives;
CREATE POLICY policy_pid_objectives_update ON pid_objectives
    FOR UPDATE
    USING (check_pid_access(pid_id) AND is_deleted = false);

-- DELETE Policy: Users with PID update access (soft delete)
DROP POLICY IF EXISTS policy_pid_objectives_delete ON pid_objectives;
CREATE POLICY policy_pid_objectives_delete ON pid_objectives
    FOR DELETE
    USING (check_pid_access(pid_id) AND is_deleted = false);

-- ============================================================================
-- SECTION 6: PID_INTERFACES RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS policy_pid_interfaces_select ON pid_interfaces;
CREATE POLICY policy_pid_interfaces_select ON pid_interfaces
    FOR SELECT
    USING (check_pid_access(pid_id) AND is_deleted = false);

DROP POLICY IF EXISTS policy_pid_interfaces_insert ON pid_interfaces;
CREATE POLICY policy_pid_interfaces_insert ON pid_interfaces
    FOR INSERT
    WITH CHECK (check_pid_access(pid_id));

DROP POLICY IF EXISTS policy_pid_interfaces_update ON pid_interfaces;
CREATE POLICY policy_pid_interfaces_update ON pid_interfaces
    FOR UPDATE
    USING (check_pid_access(pid_id) AND is_deleted = false);

DROP POLICY IF EXISTS policy_pid_interfaces_delete ON pid_interfaces;
CREATE POLICY policy_pid_interfaces_delete ON pid_interfaces
    FOR DELETE
    USING (check_pid_access(pid_id) AND is_deleted = false);

-- ============================================================================
-- SECTION 7: PID_DEPENDENCIES RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS policy_pid_dependencies_select ON pid_dependencies;
CREATE POLICY policy_pid_dependencies_select ON pid_dependencies
    FOR SELECT
    USING (check_pid_access(pid_id) AND is_deleted = false);

DROP POLICY IF EXISTS policy_pid_dependencies_insert ON pid_dependencies;
CREATE POLICY policy_pid_dependencies_insert ON pid_dependencies
    FOR INSERT
    WITH CHECK (check_pid_access(pid_id));

DROP POLICY IF EXISTS policy_pid_dependencies_update ON pid_dependencies;
CREATE POLICY policy_pid_dependencies_update ON pid_dependencies
    FOR UPDATE
    USING (check_pid_access(pid_id) AND is_deleted = false);

DROP POLICY IF EXISTS policy_pid_dependencies_delete ON pid_dependencies;
CREATE POLICY policy_pid_dependencies_delete ON pid_dependencies
    FOR DELETE
    USING (check_pid_access(pid_id) AND is_deleted = false);

-- ============================================================================
-- SECTION 8: PID_TEAM_STRUCTURE RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS policy_pid_team_structure_select ON pid_team_structure;
CREATE POLICY policy_pid_team_structure_select ON pid_team_structure
    FOR SELECT
    USING (check_pid_access(pid_id) AND is_deleted = false);

DROP POLICY IF EXISTS policy_pid_team_structure_insert ON pid_team_structure;
CREATE POLICY policy_pid_team_structure_insert ON pid_team_structure
    FOR INSERT
    WITH CHECK (check_pid_access(pid_id));

DROP POLICY IF EXISTS policy_pid_team_structure_update ON pid_team_structure;
CREATE POLICY policy_pid_team_structure_update ON pid_team_structure
    FOR UPDATE
    USING (check_pid_access(pid_id) AND is_deleted = false);

DROP POLICY IF EXISTS policy_pid_team_structure_delete ON pid_team_structure;
CREATE POLICY policy_pid_team_structure_delete ON pid_team_structure
    FOR DELETE
    USING (check_pid_access(pid_id) AND is_deleted = false);

-- ============================================================================
-- SECTION 9: PID_TOLERANCES RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS policy_pid_tolerances_select ON pid_tolerances;
CREATE POLICY policy_pid_tolerances_select ON pid_tolerances
    FOR SELECT
    USING (check_pid_access(pid_id) AND is_deleted = false);

DROP POLICY IF EXISTS policy_pid_tolerances_insert ON pid_tolerances;
CREATE POLICY policy_pid_tolerances_insert ON pid_tolerances
    FOR INSERT
    WITH CHECK (check_pid_access(pid_id));

DROP POLICY IF EXISTS policy_pid_tolerances_update ON pid_tolerances;
CREATE POLICY policy_pid_tolerances_update ON pid_tolerances
    FOR UPDATE
    USING (check_pid_access(pid_id) AND is_deleted = false);

DROP POLICY IF EXISTS policy_pid_tolerances_delete ON pid_tolerances;
CREATE POLICY policy_pid_tolerances_delete ON pid_tolerances
    FOR DELETE
    USING (check_pid_access(pid_id) AND is_deleted = false);

-- ============================================================================
-- SECTION 10: PID_REPORTING_ARRANGEMENTS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS policy_pid_reporting_arrangements_select ON pid_reporting_arrangements;
CREATE POLICY policy_pid_reporting_arrangements_select ON pid_reporting_arrangements
    FOR SELECT
    USING (check_pid_access(pid_id) AND is_deleted = false);

DROP POLICY IF EXISTS policy_pid_reporting_arrangements_insert ON pid_reporting_arrangements;
CREATE POLICY policy_pid_reporting_arrangements_insert ON pid_reporting_arrangements
    FOR INSERT
    WITH CHECK (check_pid_access(pid_id));

DROP POLICY IF EXISTS policy_pid_reporting_arrangements_update ON pid_reporting_arrangements;
CREATE POLICY policy_pid_reporting_arrangements_update ON pid_reporting_arrangements
    FOR UPDATE
    USING (check_pid_access(pid_id) AND is_deleted = false);

DROP POLICY IF EXISTS policy_pid_reporting_arrangements_delete ON pid_reporting_arrangements;
CREATE POLICY policy_pid_reporting_arrangements_delete ON pid_reporting_arrangements
    FOR DELETE
    USING (check_pid_access(pid_id) AND is_deleted = false);

-- ============================================================================
-- SECTION 11: PID_REVISION_HISTORY RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS policy_pid_revision_history_select ON pid_revision_history;
CREATE POLICY policy_pid_revision_history_select ON pid_revision_history
    FOR SELECT
    USING (check_pid_access(pid_id));

DROP POLICY IF EXISTS policy_pid_revision_history_insert ON pid_revision_history;
CREATE POLICY policy_pid_revision_history_insert ON pid_revision_history
    FOR INSERT
    WITH CHECK (check_pid_access(pid_id));

-- ============================================================================
-- SECTION 12: PID_APPROVALS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS policy_pid_approvals_select ON pid_approvals;
CREATE POLICY policy_pid_approvals_select ON pid_approvals
    FOR SELECT
    USING (check_pid_access(pid_id));

DROP POLICY IF EXISTS policy_pid_approvals_insert ON pid_approvals;
CREATE POLICY policy_pid_approvals_insert ON pid_approvals
    FOR INSERT
    WITH CHECK (check_pid_access(pid_id));

DROP POLICY IF EXISTS policy_pid_approvals_update ON pid_approvals;
CREATE POLICY policy_pid_approvals_update ON pid_approvals
    FOR UPDATE
    USING (check_pid_access(pid_id));

-- ============================================================================
-- SECTION 13: PID_DISTRIBUTION RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS policy_pid_distribution_select ON pid_distribution;
CREATE POLICY policy_pid_distribution_select ON pid_distribution
    FOR SELECT
    USING (check_pid_access(pid_id));

DROP POLICY IF EXISTS policy_pid_distribution_insert ON pid_distribution;
CREATE POLICY policy_pid_distribution_insert ON pid_distribution
    FOR INSERT
    WITH CHECK (check_pid_access(pid_id));

DO $$
BEGIN
    RAISE NOTICE 'v215_project_initiation_document_rls_policies.sql completed successfully';
END $$;
