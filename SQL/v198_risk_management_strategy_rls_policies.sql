-- ============================================================================
-- Risk Management Strategy RLS Policies
-- Version: v198
-- Description: Row Level Security policies for Risk Management Strategy module
-- Date: 2026-01-19
-- ============================================================================
--
-- Purpose:
-- Implements Row Level Security (RLS) for all RMS tables to ensure
-- users can only access RMS for projects they're members of
-- or have appropriate permissions for.
--
-- Prerequisites:
-- - v197_risk_management_strategy_tables.sql must be run first
-- - All tables must exist
--
-- ============================================================================
-- SECTION 1: GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON risk_management_strategies TO authenticated;
GRANT SELECT, INSERT, UPDATE ON rms_risk_standards TO authenticated;
GRANT SELECT, INSERT, UPDATE ON rms_identification_methods TO authenticated;
GRANT SELECT, INSERT, UPDATE ON rms_assessment_scales TO authenticated;
GRANT SELECT, INSERT, UPDATE ON rms_risk_matrix TO authenticated;
GRANT SELECT, INSERT, UPDATE ON rms_response_strategies TO authenticated;
GRANT SELECT, INSERT, UPDATE ON rms_tools_techniques TO authenticated;
GRANT SELECT, INSERT, UPDATE ON rms_templates_forms TO authenticated;
GRANT SELECT, INSERT, UPDATE ON rms_records TO authenticated;
GRANT SELECT, INSERT, UPDATE ON rms_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE ON rms_scheduled_activities TO authenticated;
GRANT SELECT, INSERT, UPDATE ON rms_roles_responsibilities TO authenticated;
GRANT SELECT, INSERT, UPDATE ON rms_revision_history TO authenticated;
GRANT SELECT, INSERT, UPDATE ON rms_approvals TO authenticated;
GRANT SELECT, INSERT, UPDATE ON rms_distribution TO authenticated;

-- ============================================================================
-- SECTION 2: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE risk_management_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE rms_risk_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE rms_identification_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE rms_assessment_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE rms_risk_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE rms_response_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE rms_tools_techniques ENABLE ROW LEVEL SECURITY;
ALTER TABLE rms_templates_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE rms_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE rms_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE rms_scheduled_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE rms_roles_responsibilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE rms_revision_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE rms_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE rms_distribution ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 3: RISK_MANAGEMENT_STRATEGIES RLS POLICIES
-- ============================================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS policy_rms_select ON risk_management_strategies;
DROP POLICY IF EXISTS policy_rms_insert ON risk_management_strategies;
DROP POLICY IF EXISTS policy_rms_update ON risk_management_strategies;
DROP POLICY IF EXISTS policy_rms_pmo_admin ON risk_management_strategies;

-- Policy: Users can view RMS for projects they're members of
CREATE POLICY policy_rms_select ON risk_management_strategies
    FOR SELECT
    USING (
        is_deleted = FALSE
        AND (
            -- User is member of project
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE up.project_id = risk_management_strategies.project_id
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

-- Policy: Project Manager can create RMS for their projects
CREATE POLICY policy_rms_insert ON risk_management_strategies
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_projects up
            JOIN users u ON up.user_id = u.id
            WHERE up.project_id = risk_management_strategies.project_id
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

-- Policy: Project Manager can update RMS in draft/under_review, PMO Admin can update any
CREATE POLICY policy_rms_update ON risk_management_strategies
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
                    WHERE up.project_id = risk_management_strategies.project_id
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
CREATE POLICY policy_rms_pmo_admin ON risk_management_strategies
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
    );

-- ============================================================================
-- SECTION 4: CHILD TABLES RLS POLICIES
-- ============================================================================

-- Helper function to check if user has access to RMS
CREATE OR REPLACE FUNCTION user_has_rms_access(p_rms_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM risk_management_strategies rms
        WHERE rms.id = p_rms_id
          AND rms.is_deleted = FALSE
          AND (
              EXISTS (
                  SELECT 1 FROM user_projects up
                  JOIN users u ON up.user_id = u.id
                  WHERE up.project_id = rms.project_id
                    AND u.auth_user_id = auth.uid()
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
          )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for rms_risk_standards
DROP POLICY IF EXISTS policy_rms_standards_select ON rms_risk_standards;
DROP POLICY IF EXISTS policy_rms_standards_modify ON rms_risk_standards;

CREATE POLICY policy_rms_standards_select ON rms_risk_standards
    FOR SELECT
    USING (user_has_rms_access(rms_id));

CREATE POLICY policy_rms_standards_modify ON rms_risk_standards
    FOR ALL
    USING (user_has_rms_access(rms_id))
    WITH CHECK (user_has_rms_access(rms_id));

-- Policies for rms_identification_methods
DROP POLICY IF EXISTS policy_rms_methods_select ON rms_identification_methods;
DROP POLICY IF EXISTS policy_rms_methods_modify ON rms_identification_methods;

CREATE POLICY policy_rms_methods_select ON rms_identification_methods
    FOR SELECT
    USING (user_has_rms_access(rms_id));

CREATE POLICY policy_rms_methods_modify ON rms_identification_methods
    FOR ALL
    USING (user_has_rms_access(rms_id))
    WITH CHECK (user_has_rms_access(rms_id));

-- Policies for rms_assessment_scales
DROP POLICY IF EXISTS policy_rms_scales_select ON rms_assessment_scales;
DROP POLICY IF EXISTS policy_rms_scales_modify ON rms_assessment_scales;

CREATE POLICY policy_rms_scales_select ON rms_assessment_scales
    FOR SELECT
    USING (user_has_rms_access(rms_id));

CREATE POLICY policy_rms_scales_modify ON rms_assessment_scales
    FOR ALL
    USING (user_has_rms_access(rms_id))
    WITH CHECK (user_has_rms_access(rms_id));

-- Policies for rms_risk_matrix
DROP POLICY IF EXISTS policy_rms_matrix_select ON rms_risk_matrix;
DROP POLICY IF EXISTS policy_rms_matrix_modify ON rms_risk_matrix;

CREATE POLICY policy_rms_matrix_select ON rms_risk_matrix
    FOR SELECT
    USING (user_has_rms_access(rms_id));

CREATE POLICY policy_rms_matrix_modify ON rms_risk_matrix
    FOR ALL
    USING (user_has_rms_access(rms_id))
    WITH CHECK (user_has_rms_access(rms_id));

-- Policies for rms_response_strategies
DROP POLICY IF EXISTS policy_rms_response_select ON rms_response_strategies;
DROP POLICY IF EXISTS policy_rms_response_modify ON rms_response_strategies;

CREATE POLICY policy_rms_response_select ON rms_response_strategies
    FOR SELECT
    USING (user_has_rms_access(rms_id));

CREATE POLICY policy_rms_response_modify ON rms_response_strategies
    FOR ALL
    USING (user_has_rms_access(rms_id))
    WITH CHECK (user_has_rms_access(rms_id));

-- Policies for rms_tools_techniques
DROP POLICY IF EXISTS policy_rms_tools_select ON rms_tools_techniques;
DROP POLICY IF EXISTS policy_rms_tools_modify ON rms_tools_techniques;

CREATE POLICY policy_rms_tools_select ON rms_tools_techniques
    FOR SELECT
    USING (user_has_rms_access(rms_id));

CREATE POLICY policy_rms_tools_modify ON rms_tools_techniques
    FOR ALL
    USING (user_has_rms_access(rms_id))
    WITH CHECK (user_has_rms_access(rms_id));

-- Policies for rms_templates_forms
DROP POLICY IF EXISTS policy_rms_templates_select ON rms_templates_forms;
DROP POLICY IF EXISTS policy_rms_templates_modify ON rms_templates_forms;

CREATE POLICY policy_rms_templates_select ON rms_templates_forms
    FOR SELECT
    USING (user_has_rms_access(rms_id));

CREATE POLICY policy_rms_templates_modify ON rms_templates_forms
    FOR ALL
    USING (user_has_rms_access(rms_id))
    WITH CHECK (user_has_rms_access(rms_id));

-- Policies for rms_records
DROP POLICY IF EXISTS policy_rms_records_select ON rms_records;
DROP POLICY IF EXISTS policy_rms_records_modify ON rms_records;

CREATE POLICY policy_rms_records_select ON rms_records
    FOR SELECT
    USING (user_has_rms_access(rms_id));

CREATE POLICY policy_rms_records_modify ON rms_records
    FOR ALL
    USING (user_has_rms_access(rms_id))
    WITH CHECK (user_has_rms_access(rms_id));

-- Policies for rms_reports
DROP POLICY IF EXISTS policy_rms_reports_select ON rms_reports;
DROP POLICY IF EXISTS policy_rms_reports_modify ON rms_reports;

CREATE POLICY policy_rms_reports_select ON rms_reports
    FOR SELECT
    USING (user_has_rms_access(rms_id));

CREATE POLICY policy_rms_reports_modify ON rms_reports
    FOR ALL
    USING (user_has_rms_access(rms_id))
    WITH CHECK (user_has_rms_access(rms_id));

-- Policies for rms_scheduled_activities
DROP POLICY IF EXISTS policy_rms_activities_select ON rms_scheduled_activities;
DROP POLICY IF EXISTS policy_rms_activities_modify ON rms_scheduled_activities;

CREATE POLICY policy_rms_activities_select ON rms_scheduled_activities
    FOR SELECT
    USING (user_has_rms_access(rms_id));

CREATE POLICY policy_rms_activities_modify ON rms_scheduled_activities
    FOR ALL
    USING (user_has_rms_access(rms_id))
    WITH CHECK (user_has_rms_access(rms_id));

-- Policies for rms_roles_responsibilities
DROP POLICY IF EXISTS policy_rms_roles_select ON rms_roles_responsibilities;
DROP POLICY IF EXISTS policy_rms_roles_modify ON rms_roles_responsibilities;

CREATE POLICY policy_rms_roles_select ON rms_roles_responsibilities
    FOR SELECT
    USING (user_has_rms_access(rms_id));

CREATE POLICY policy_rms_roles_modify ON rms_roles_responsibilities
    FOR ALL
    USING (user_has_rms_access(rms_id))
    WITH CHECK (user_has_rms_access(rms_id));

-- Policies for rms_revision_history (read-only for most users)
DROP POLICY IF EXISTS policy_rms_revision_select ON rms_revision_history;
DROP POLICY IF EXISTS policy_rms_revision_insert ON rms_revision_history;

CREATE POLICY policy_rms_revision_select ON rms_revision_history
    FOR SELECT
    USING (user_has_rms_access(rms_id));

CREATE POLICY policy_rms_revision_insert ON rms_revision_history
    FOR INSERT
    WITH CHECK (user_has_rms_access(rms_id));

-- Policies for rms_approvals
DROP POLICY IF EXISTS policy_rms_approvals_select ON rms_approvals;
DROP POLICY IF EXISTS policy_rms_approvals_modify ON rms_approvals;

CREATE POLICY policy_rms_approvals_select ON rms_approvals
    FOR SELECT
    USING (
        is_deleted = FALSE
        AND user_has_rms_access(rms_id)
    );

CREATE POLICY policy_rms_approvals_modify ON rms_approvals
    FOR ALL
    USING (
        is_deleted = FALSE
        AND user_has_rms_access(rms_id)
    )
    WITH CHECK (
        is_deleted = FALSE
        AND user_has_rms_access(rms_id)
    );

-- Policies for rms_distribution
DROP POLICY IF EXISTS policy_rms_distribution_select ON rms_distribution;
DROP POLICY IF EXISTS policy_rms_distribution_modify ON rms_distribution;

CREATE POLICY policy_rms_distribution_select ON rms_distribution
    FOR SELECT
    USING (
        is_deleted = FALSE
        AND user_has_rms_access(rms_id)
    );

CREATE POLICY policy_rms_distribution_modify ON rms_distribution
    FOR ALL
    USING (
        is_deleted = FALSE
        AND user_has_rms_access(rms_id)
    )
    WITH CHECK (
        is_deleted = FALSE
        AND user_has_rms_access(rms_id)
    );

DO $$
BEGIN
    RAISE NOTICE 'v198_risk_management_strategy_rls_policies.sql completed successfully';
END $$;
