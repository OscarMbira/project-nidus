-- ============================================================================
-- Quality Management Strategy RLS Policies
-- Version: v181
-- Description: Row Level Security policies for Quality Management Strategy module
-- Date: 2026-01-19
-- ============================================================================
--
-- Purpose:
-- Implements Row Level Security (RLS) for all QMS tables to ensure
-- users can only access QMS for projects they're members of
-- or have appropriate permissions for.
--
-- Prerequisites:
-- - v180_quality_management_strategy_tables.sql must be run first
-- - All tables must exist
--
-- ============================================================================
-- SECTION 1: GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON quality_management_strategies TO authenticated;
GRANT SELECT, INSERT, UPDATE ON qms_quality_standards TO authenticated;
GRANT SELECT, INSERT, UPDATE ON qms_quality_methods TO authenticated;
GRANT SELECT, INSERT, UPDATE ON qms_quality_metrics TO authenticated;
GRANT SELECT, INSERT, UPDATE ON qms_templates_forms TO authenticated;
GRANT SELECT, INSERT, UPDATE ON qms_tools_techniques TO authenticated;
GRANT SELECT, INSERT, UPDATE ON qms_records TO authenticated;
GRANT SELECT, INSERT, UPDATE ON qms_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE ON qms_scheduled_activities TO authenticated;
GRANT SELECT, INSERT, UPDATE ON qms_roles_responsibilities TO authenticated;
GRANT SELECT, INSERT, UPDATE ON qms_revision_history TO authenticated;
GRANT SELECT, INSERT, UPDATE ON qms_approvals TO authenticated;
GRANT SELECT, INSERT, UPDATE ON qms_distribution TO authenticated;

-- ============================================================================
-- SECTION 2: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE quality_management_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE qms_quality_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE qms_quality_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE qms_quality_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE qms_templates_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE qms_tools_techniques ENABLE ROW LEVEL SECURITY;
ALTER TABLE qms_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE qms_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE qms_scheduled_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE qms_roles_responsibilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE qms_revision_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE qms_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE qms_distribution ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 3: QUALITY_MANAGEMENT_STRATEGIES RLS POLICIES
-- ============================================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS policy_qms_select ON quality_management_strategies;
DROP POLICY IF EXISTS policy_qms_insert ON quality_management_strategies;
DROP POLICY IF EXISTS policy_qms_update ON quality_management_strategies;
DROP POLICY IF EXISTS policy_qms_pmo_admin ON quality_management_strategies;

-- Policy: Users can view QMS for projects they're members of
CREATE POLICY policy_qms_select ON quality_management_strategies
    FOR SELECT
    USING (
        is_deleted = FALSE
        AND (
            -- User is member of project
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE up.project_id = quality_management_strategies.project_id
                  AND u.auth_user_id = auth.uid()
                  AND up.is_deleted = FALSE
            )
            -- OR user is PMO admin
            OR EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN users u ON ur.user_id = u.id
                JOIN roles r ON ur.role_id = r.id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name IN ('pmo_admin', 'System Admin')
                  AND ur.is_active = TRUE
                  AND ur.is_deleted = FALSE
            )
        )
    );

-- Policy: Project Manager can create QMS for their projects
CREATE POLICY policy_qms_insert ON quality_management_strategies
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_projects up
            JOIN users u ON up.user_id = u.id
            WHERE up.project_id = quality_management_strategies.project_id
              AND u.auth_user_id = auth.uid()
              AND up.access_level IN ('owner', 'admin')
              AND up.is_deleted = FALSE
        )
        OR EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN users u ON ur.user_id = u.id
            JOIN roles r ON ur.role_id = r.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name IN ('pmo_admin', 'System Admin')
              AND ur.is_active = TRUE
              AND ur.is_deleted = FALSE
        )
    );

-- Policy: Project Manager can update QMS in draft/under_review, PMO Admin can update any
CREATE POLICY policy_qms_update ON quality_management_strategies
    FOR UPDATE
    USING (
        is_deleted = FALSE
        AND (
            -- PM can update if draft or under_review
            (
                status IN ('draft', 'under_review')
                AND EXISTS (
                    SELECT 1 FROM user_projects up
                    JOIN users u ON up.user_id = u.id
                    WHERE up.project_id = quality_management_strategies.project_id
                      AND u.auth_user_id = auth.uid()
                      AND up.access_level IN ('owner', 'admin')
                      AND up.is_deleted = FALSE
                )
            )
            -- OR PMO admin can update any
            OR EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN users u ON ur.user_id = u.id
                JOIN roles r ON ur.role_id = r.id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name IN ('pmo_admin', 'System Admin')
                  AND ur.is_active = TRUE
                  AND ur.is_deleted = FALSE
            )
        )
    );

-- Policy: PMO Admin has full access
CREATE POLICY policy_qms_pmo_admin ON quality_management_strategies
    FOR ALL
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
    )
    WITH CHECK (
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
-- SECTION 4: CHILD TABLES RLS POLICIES
-- ============================================================================

-- Helper function to check QMS access
CREATE OR REPLACE FUNCTION check_qms_access(p_qms_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM quality_management_strategies qms
        WHERE qms.id = p_qms_id
          AND qms.is_deleted = FALSE
          AND (
              -- User is member of project
              EXISTS (
                  SELECT 1 FROM user_projects up
                  JOIN users u ON up.user_id = u.id
                  WHERE up.project_id = qms.project_id
                    AND u.auth_user_id = auth.uid()
                    AND up.is_deleted = FALSE
              )
              -- OR user is PMO admin
              OR EXISTS (
                  SELECT 1 FROM user_roles ur
                  JOIN users u ON ur.user_id = u.id
                  JOIN roles r ON ur.role_id = r.id
                  WHERE u.auth_user_id = auth.uid()
                    AND r.role_name IN ('pmo_admin', 'System Admin')
                    AND ur.is_active = TRUE
                    AND ur.is_deleted = FALSE
              )
          )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Quality Standards Policies
DROP POLICY IF EXISTS policy_qms_standards_select ON qms_quality_standards;
DROP POLICY IF EXISTS policy_qms_standards_insert ON qms_quality_standards;
DROP POLICY IF EXISTS policy_qms_standards_update ON qms_quality_standards;

CREATE POLICY policy_qms_standards_select ON qms_quality_standards
    FOR SELECT
    USING (check_qms_access(qms_id));

CREATE POLICY policy_qms_standards_insert ON qms_quality_standards
    FOR INSERT
    WITH CHECK (check_qms_access(qms_id));

CREATE POLICY policy_qms_standards_update ON qms_quality_standards
    FOR UPDATE
    USING (check_qms_access(qms_id))
    WITH CHECK (check_qms_access(qms_id));

-- Quality Methods Policies
DROP POLICY IF EXISTS policy_qms_methods_select ON qms_quality_methods;
DROP POLICY IF EXISTS policy_qms_methods_insert ON qms_quality_methods;
DROP POLICY IF EXISTS policy_qms_methods_update ON qms_quality_methods;

CREATE POLICY policy_qms_methods_select ON qms_quality_methods
    FOR SELECT
    USING (check_qms_access(qms_id));

CREATE POLICY policy_qms_methods_insert ON qms_quality_methods
    FOR INSERT
    WITH CHECK (check_qms_access(qms_id));

CREATE POLICY policy_qms_methods_update ON qms_quality_methods
    FOR UPDATE
    USING (check_qms_access(qms_id))
    WITH CHECK (check_qms_access(qms_id));

-- Quality Metrics Policies
DROP POLICY IF EXISTS policy_qms_metrics_select ON qms_quality_metrics;
DROP POLICY IF EXISTS policy_qms_metrics_insert ON qms_quality_metrics;
DROP POLICY IF EXISTS policy_qms_metrics_update ON qms_quality_metrics;

CREATE POLICY policy_qms_metrics_select ON qms_quality_metrics
    FOR SELECT
    USING (check_qms_access(qms_id));

CREATE POLICY policy_qms_metrics_insert ON qms_quality_metrics
    FOR INSERT
    WITH CHECK (check_qms_access(qms_id));

CREATE POLICY policy_qms_metrics_update ON qms_quality_metrics
    FOR UPDATE
    USING (check_qms_access(qms_id))
    WITH CHECK (check_qms_access(qms_id));

-- Templates & Forms Policies
DROP POLICY IF EXISTS policy_qms_templates_select ON qms_templates_forms;
DROP POLICY IF EXISTS policy_qms_templates_insert ON qms_templates_forms;
DROP POLICY IF EXISTS policy_qms_templates_update ON qms_templates_forms;

CREATE POLICY policy_qms_templates_select ON qms_templates_forms
    FOR SELECT
    USING (check_qms_access(qms_id));

CREATE POLICY policy_qms_templates_insert ON qms_templates_forms
    FOR INSERT
    WITH CHECK (check_qms_access(qms_id));

CREATE POLICY policy_qms_templates_update ON qms_templates_forms
    FOR UPDATE
    USING (check_qms_access(qms_id))
    WITH CHECK (check_qms_access(qms_id));

-- Tools & Techniques Policies
DROP POLICY IF EXISTS policy_qms_tools_select ON qms_tools_techniques;
DROP POLICY IF EXISTS policy_qms_tools_insert ON qms_tools_techniques;
DROP POLICY IF EXISTS policy_qms_tools_update ON qms_tools_techniques;

CREATE POLICY policy_qms_tools_select ON qms_tools_techniques
    FOR SELECT
    USING (check_qms_access(qms_id));

CREATE POLICY policy_qms_tools_insert ON qms_tools_techniques
    FOR INSERT
    WITH CHECK (check_qms_access(qms_id));

CREATE POLICY policy_qms_tools_update ON qms_tools_techniques
    FOR UPDATE
    USING (check_qms_access(qms_id))
    WITH CHECK (check_qms_access(qms_id));

-- Records Policies
DROP POLICY IF EXISTS policy_qms_records_select ON qms_records;
DROP POLICY IF EXISTS policy_qms_records_insert ON qms_records;
DROP POLICY IF EXISTS policy_qms_records_update ON qms_records;

CREATE POLICY policy_qms_records_select ON qms_records
    FOR SELECT
    USING (check_qms_access(qms_id));

CREATE POLICY policy_qms_records_insert ON qms_records
    FOR INSERT
    WITH CHECK (check_qms_access(qms_id));

CREATE POLICY policy_qms_records_update ON qms_records
    FOR UPDATE
    USING (check_qms_access(qms_id))
    WITH CHECK (check_qms_access(qms_id));

-- Reports Policies
DROP POLICY IF EXISTS policy_qms_reports_select ON qms_reports;
DROP POLICY IF EXISTS policy_qms_reports_insert ON qms_reports;
DROP POLICY IF EXISTS policy_qms_reports_update ON qms_reports;

CREATE POLICY policy_qms_reports_select ON qms_reports
    FOR SELECT
    USING (check_qms_access(qms_id));

CREATE POLICY policy_qms_reports_insert ON qms_reports
    FOR INSERT
    WITH CHECK (check_qms_access(qms_id));

CREATE POLICY policy_qms_reports_update ON qms_reports
    FOR UPDATE
    USING (check_qms_access(qms_id))
    WITH CHECK (check_qms_access(qms_id));

-- Scheduled Activities Policies
DROP POLICY IF EXISTS policy_qms_activities_select ON qms_scheduled_activities;
DROP POLICY IF EXISTS policy_qms_activities_insert ON qms_scheduled_activities;
DROP POLICY IF EXISTS policy_qms_activities_update ON qms_scheduled_activities;

CREATE POLICY policy_qms_activities_select ON qms_scheduled_activities
    FOR SELECT
    USING (check_qms_access(qms_id));

CREATE POLICY policy_qms_activities_insert ON qms_scheduled_activities
    FOR INSERT
    WITH CHECK (check_qms_access(qms_id));

CREATE POLICY policy_qms_activities_update ON qms_scheduled_activities
    FOR UPDATE
    USING (check_qms_access(qms_id))
    WITH CHECK (check_qms_access(qms_id));

-- Roles & Responsibilities Policies
DROP POLICY IF EXISTS policy_qms_roles_select ON qms_roles_responsibilities;
DROP POLICY IF EXISTS policy_qms_roles_insert ON qms_roles_responsibilities;
DROP POLICY IF EXISTS policy_qms_roles_update ON qms_roles_responsibilities;

CREATE POLICY policy_qms_roles_select ON qms_roles_responsibilities
    FOR SELECT
    USING (check_qms_access(qms_id));

CREATE POLICY policy_qms_roles_insert ON qms_roles_responsibilities
    FOR INSERT
    WITH CHECK (check_qms_access(qms_id));

CREATE POLICY policy_qms_roles_update ON qms_roles_responsibilities
    FOR UPDATE
    USING (check_qms_access(qms_id))
    WITH CHECK (check_qms_access(qms_id));

-- Revision History Policies (read-only for most users)
DROP POLICY IF EXISTS policy_qms_revision_select ON qms_revision_history;
DROP POLICY IF EXISTS policy_qms_revision_insert ON qms_revision_history;

CREATE POLICY policy_qms_revision_select ON qms_revision_history
    FOR SELECT
    USING (check_qms_access(qms_id));

CREATE POLICY policy_qms_revision_insert ON qms_revision_history
    FOR INSERT
    WITH CHECK (check_qms_access(qms_id));

-- Approvals Policies
DROP POLICY IF EXISTS policy_qms_approvals_select ON qms_approvals;
DROP POLICY IF EXISTS policy_qms_approvals_insert ON qms_approvals;
DROP POLICY IF EXISTS policy_qms_approvals_update ON qms_approvals;

CREATE POLICY policy_qms_approvals_select ON qms_approvals
    FOR SELECT
    USING (is_deleted = FALSE AND check_qms_access(qms_id));

CREATE POLICY policy_qms_approvals_insert ON qms_approvals
    FOR INSERT
    WITH CHECK (check_qms_access(qms_id));

CREATE POLICY policy_qms_approvals_update ON qms_approvals
    FOR UPDATE
    USING (is_deleted = FALSE AND check_qms_access(qms_id))
    WITH CHECK (check_qms_access(qms_id));

-- Distribution Policies
DROP POLICY IF EXISTS policy_qms_distribution_select ON qms_distribution;
DROP POLICY IF EXISTS policy_qms_distribution_insert ON qms_distribution;

CREATE POLICY policy_qms_distribution_select ON qms_distribution
    FOR SELECT
    USING (is_deleted = FALSE AND check_qms_access(qms_id));

CREATE POLICY policy_qms_distribution_insert ON qms_distribution
    FOR INSERT
    WITH CHECK (check_qms_access(qms_id));

-- ============================================================================
-- COMPLETION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'v181_quality_management_strategy_rls_policies.sql completed successfully';
END $$;
