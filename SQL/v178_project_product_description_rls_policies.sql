-- ============================================================================
-- Project Product Description RLS Policies
-- Version: v178
-- Description: Row Level Security policies for Project Product Description module
-- Date: 2026-01-19
-- ============================================================================
--
-- Purpose:
-- Implements Row Level Security (RLS) for all PPD tables to ensure
-- users can only access PPDs for projects they're members of
-- or have appropriate permissions for.
--
-- Prerequisites:
-- - v177_project_product_description_tables.sql must be run first
-- - All tables must exist
--
-- ============================================================================
-- SECTION 1: GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON project_product_descriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ppd_composition_items TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ppd_derivations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ppd_acceptance_criteria TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ppd_quality_expectations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ppd_skills_required TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ppd_acceptance_responsibilities TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ppd_revision_history TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ppd_approvals TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ppd_distribution TO authenticated;

-- ============================================================================
-- SECTION 2: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE project_product_descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppd_composition_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppd_derivations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppd_acceptance_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppd_quality_expectations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppd_skills_required ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppd_acceptance_responsibilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppd_revision_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppd_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppd_distribution ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 3: PROJECT_PRODUCT_DESCRIPTIONS RLS POLICIES
-- ============================================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS policy_ppd_select ON project_product_descriptions;
DROP POLICY IF EXISTS policy_ppd_insert ON project_product_descriptions;
DROP POLICY IF EXISTS policy_ppd_update ON project_product_descriptions;
DROP POLICY IF EXISTS policy_ppd_pmo_admin ON project_product_descriptions;

-- Policy: Users can view PPDs for projects they're members of
CREATE POLICY policy_ppd_select ON project_product_descriptions
    FOR SELECT
    USING (
        is_deleted = false
        AND (
            -- User is member of project
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE up.project_id = project_product_descriptions.project_id
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

-- Policy: Project Manager can create PPDs for their projects
CREATE POLICY policy_ppd_insert ON project_product_descriptions
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_projects up
            JOIN users u ON up.user_id = u.id
            WHERE up.project_id = project_product_descriptions.project_id
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

-- Policy: Project Manager can update PPDs in draft/under_review, PMO Admin can update any
CREATE POLICY policy_ppd_update ON project_product_descriptions
    FOR UPDATE
    USING (
        is_deleted = false
        AND (
            -- PM can update if draft or under_review
            (
                status IN ('draft', 'under_review')
                AND EXISTS (
                    SELECT 1 FROM user_projects up
                    JOIN users u ON up.user_id = u.id
                    WHERE up.project_id = project_product_descriptions.project_id
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
CREATE POLICY policy_ppd_pmo_admin ON project_product_descriptions
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

-- Helper function to check PPD access
CREATE OR REPLACE FUNCTION check_ppd_access(p_ppd_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM project_product_descriptions ppd
        WHERE ppd.id = p_ppd_id
          AND ppd.is_deleted = FALSE
          AND (
              -- User is member of project
              EXISTS (
                  SELECT 1 FROM user_projects up
                  JOIN users u ON up.user_id = u.id
                  WHERE up.project_id = ppd.project_id
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

-- Composition Items Policies
DROP POLICY IF EXISTS policy_ppd_composition_select ON ppd_composition_items;
DROP POLICY IF EXISTS policy_ppd_composition_insert ON ppd_composition_items;
DROP POLICY IF EXISTS policy_ppd_composition_update ON ppd_composition_items;

CREATE POLICY policy_ppd_composition_select ON ppd_composition_items
    FOR SELECT
    USING (is_deleted = false AND check_ppd_access(ppd_id));

CREATE POLICY policy_ppd_composition_insert ON ppd_composition_items
    FOR INSERT
    WITH CHECK (check_ppd_access(ppd_id));

CREATE POLICY policy_ppd_composition_update ON ppd_composition_items
    FOR UPDATE
    USING (is_deleted = false AND check_ppd_access(ppd_id))
    WITH CHECK (check_ppd_access(ppd_id));

-- Derivations Policies
DROP POLICY IF EXISTS policy_ppd_derivations_select ON ppd_derivations;
DROP POLICY IF EXISTS policy_ppd_derivations_insert ON ppd_derivations;
DROP POLICY IF EXISTS policy_ppd_derivations_update ON ppd_derivations;

CREATE POLICY policy_ppd_derivations_select ON ppd_derivations
    FOR SELECT
    USING (is_deleted = false AND check_ppd_access(ppd_id));

CREATE POLICY policy_ppd_derivations_insert ON ppd_derivations
    FOR INSERT
    WITH CHECK (check_ppd_access(ppd_id));

CREATE POLICY policy_ppd_derivations_update ON ppd_derivations
    FOR UPDATE
    USING (is_deleted = false AND check_ppd_access(ppd_id))
    WITH CHECK (check_ppd_access(ppd_id));

-- Acceptance Criteria Policies
DROP POLICY IF EXISTS policy_ppd_criteria_select ON ppd_acceptance_criteria;
DROP POLICY IF EXISTS policy_ppd_criteria_insert ON ppd_acceptance_criteria;
DROP POLICY IF EXISTS policy_ppd_criteria_update ON ppd_acceptance_criteria;

CREATE POLICY policy_ppd_criteria_select ON ppd_acceptance_criteria
    FOR SELECT
    USING (is_deleted = false AND check_ppd_access(ppd_id));

CREATE POLICY policy_ppd_criteria_insert ON ppd_acceptance_criteria
    FOR INSERT
    WITH CHECK (check_ppd_access(ppd_id));

CREATE POLICY policy_ppd_criteria_update ON ppd_acceptance_criteria
    FOR UPDATE
    USING (is_deleted = false AND check_ppd_access(ppd_id))
    WITH CHECK (check_ppd_access(ppd_id));

-- Quality Expectations Policies
DROP POLICY IF EXISTS policy_ppd_quality_select ON ppd_quality_expectations;
DROP POLICY IF EXISTS policy_ppd_quality_insert ON ppd_quality_expectations;
DROP POLICY IF EXISTS policy_ppd_quality_update ON ppd_quality_expectations;

CREATE POLICY policy_ppd_quality_select ON ppd_quality_expectations
    FOR SELECT
    USING (is_deleted = false AND check_ppd_access(ppd_id));

CREATE POLICY policy_ppd_quality_insert ON ppd_quality_expectations
    FOR INSERT
    WITH CHECK (check_ppd_access(ppd_id));

CREATE POLICY policy_ppd_quality_update ON ppd_quality_expectations
    FOR UPDATE
    USING (is_deleted = false AND check_ppd_access(ppd_id))
    WITH CHECK (check_ppd_access(ppd_id));

-- Skills Required Policies
DROP POLICY IF EXISTS policy_ppd_skills_select ON ppd_skills_required;
DROP POLICY IF EXISTS policy_ppd_skills_insert ON ppd_skills_required;
DROP POLICY IF EXISTS policy_ppd_skills_update ON ppd_skills_required;

CREATE POLICY policy_ppd_skills_select ON ppd_skills_required
    FOR SELECT
    USING (is_deleted = false AND check_ppd_access(ppd_id));

CREATE POLICY policy_ppd_skills_insert ON ppd_skills_required
    FOR INSERT
    WITH CHECK (check_ppd_access(ppd_id));

CREATE POLICY policy_ppd_skills_update ON ppd_skills_required
    FOR UPDATE
    USING (is_deleted = false AND check_ppd_access(ppd_id))
    WITH CHECK (check_ppd_access(ppd_id));

-- Acceptance Responsibilities Policies
DROP POLICY IF EXISTS policy_ppd_responsibilities_select ON ppd_acceptance_responsibilities;
DROP POLICY IF EXISTS policy_ppd_responsibilities_insert ON ppd_acceptance_responsibilities;
DROP POLICY IF EXISTS policy_ppd_responsibilities_update ON ppd_acceptance_responsibilities;

CREATE POLICY policy_ppd_responsibilities_select ON ppd_acceptance_responsibilities
    FOR SELECT
    USING (is_deleted = false AND check_ppd_access(ppd_id));

CREATE POLICY policy_ppd_responsibilities_insert ON ppd_acceptance_responsibilities
    FOR INSERT
    WITH CHECK (check_ppd_access(ppd_id));

CREATE POLICY policy_ppd_responsibilities_update ON ppd_acceptance_responsibilities
    FOR UPDATE
    USING (is_deleted = false AND check_ppd_access(ppd_id))
    WITH CHECK (check_ppd_access(ppd_id));

-- Revision History Policies (read-only for most users)
DROP POLICY IF EXISTS policy_ppd_revision_select ON ppd_revision_history;
DROP POLICY IF EXISTS policy_ppd_revision_insert ON ppd_revision_history;

CREATE POLICY policy_ppd_revision_select ON ppd_revision_history
    FOR SELECT
    USING (check_ppd_access(ppd_id));

CREATE POLICY policy_ppd_revision_insert ON ppd_revision_history
    FOR INSERT
    WITH CHECK (check_ppd_access(ppd_id));

-- Approvals Policies
DROP POLICY IF EXISTS policy_ppd_approvals_select ON ppd_approvals;
DROP POLICY IF EXISTS policy_ppd_approvals_insert ON ppd_approvals;
DROP POLICY IF EXISTS policy_ppd_approvals_update ON ppd_approvals;

CREATE POLICY policy_ppd_approvals_select ON ppd_approvals
    FOR SELECT
    USING (is_deleted = false AND check_ppd_access(ppd_id));

CREATE POLICY policy_ppd_approvals_insert ON ppd_approvals
    FOR INSERT
    WITH CHECK (check_ppd_access(ppd_id));

CREATE POLICY policy_ppd_approvals_update ON ppd_approvals
    FOR UPDATE
    USING (is_deleted = false AND check_ppd_access(ppd_id))
    WITH CHECK (check_ppd_access(ppd_id));

-- Distribution Policies
DROP POLICY IF EXISTS policy_ppd_distribution_select ON ppd_distribution;
DROP POLICY IF EXISTS policy_ppd_distribution_insert ON ppd_distribution;

CREATE POLICY policy_ppd_distribution_select ON ppd_distribution
    FOR SELECT
    USING (is_deleted = false AND check_ppd_access(ppd_id));

CREATE POLICY policy_ppd_distribution_insert ON ppd_distribution
    FOR INSERT
    WITH CHECK (check_ppd_access(ppd_id));

-- ============================================================================
-- COMPLETION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'v178_project_product_description_rls_policies.sql completed successfully';
END $$;
