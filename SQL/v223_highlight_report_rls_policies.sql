-- ============================================================================
-- Highlight Report RLS Policies
-- SQL Version: v223
-- Date: 2026-01-20
-- Related: v222_highlight_report_enhancement.sql
-- ============================================================================

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON highlight_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE ON highlight_report_revision_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON highlight_report_products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON highlight_report_risks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON highlight_report_issues TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON highlight_report_change_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE ON highlight_report_tolerances TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON highlight_report_decisions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON highlight_report_distribution TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON highlight_report_lessons TO authenticated;

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE highlight_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE highlight_report_revision_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE highlight_report_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE highlight_report_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE highlight_report_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE highlight_report_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE highlight_report_tolerances ENABLE ROW LEVEL SECURITY;
ALTER TABLE highlight_report_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE highlight_report_distribution ENABLE ROW LEVEL SECURITY;
ALTER TABLE highlight_report_lessons ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: highlight_reports
-- ============================================================================

DROP POLICY IF EXISTS policy_highlight_reports_auth_select ON highlight_reports;
DROP POLICY IF EXISTS policy_highlight_reports_auth_insert ON highlight_reports;
DROP POLICY IF EXISTS policy_highlight_reports_auth_update ON highlight_reports;
DROP POLICY IF EXISTS policy_highlight_reports_auth_delete ON highlight_reports;

CREATE POLICY policy_highlight_reports_auth_select ON highlight_reports
    FOR SELECT
    TO authenticated
    USING (
        is_deleted = FALSE AND (
            EXISTS (
                SELECT 1 FROM project_memberships pm
                WHERE pm.project_id = highlight_reports.project_id
                  AND pm.user_id = auth.uid()
                  AND pm.is_active = TRUE
            )
            OR
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON r.id = ur.role_id
                WHERE ur.user_id = auth.uid()
                  AND r.role_name = 'pmo_admin'
            )
            OR
            EXISTS (
                SELECT 1 FROM users u
                WHERE u.id = highlight_reports.prepared_by_user_id
                  AND u.auth_user_id = auth.uid()
                  AND u.is_deleted = FALSE
            )
        )
    );

CREATE POLICY policy_highlight_reports_auth_insert ON highlight_reports
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM project_memberships pm
            WHERE pm.project_id = highlight_reports.project_id
              AND pm.user_id = auth.uid()
              AND pm.is_active = TRUE
        )
        OR
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = auth.uid()
              AND r.role_name = 'pmo_admin'
        )
    );

CREATE POLICY policy_highlight_reports_auth_update ON highlight_reports
    FOR UPDATE
    TO authenticated
    USING (
        is_deleted = FALSE AND (
            (COALESCE(approval_workflow_status, status) IN ('draft', 'submitted')
             AND (
                EXISTS (
                    SELECT 1 FROM users u
                    WHERE u.id = highlight_reports.prepared_by_user_id
                      AND u.auth_user_id = auth.uid()
                      AND u.is_deleted = FALSE
                )
                OR EXISTS (
                    SELECT 1 FROM users u
                    WHERE u.id = highlight_reports.created_by
                      AND u.auth_user_id = auth.uid()
                      AND u.is_deleted = FALSE
                )
             ))
            OR
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON r.id = ur.role_id
                WHERE ur.user_id = auth.uid()
                  AND r.role_name = 'pmo_admin'
            )
        )
    );

CREATE POLICY policy_highlight_reports_auth_delete ON highlight_reports
    FOR DELETE
    TO authenticated
    USING (
        is_deleted = FALSE
        AND COALESCE(approval_workflow_status, status) = 'draft'
        AND (
            EXISTS (
                SELECT 1 FROM users u
                WHERE (u.id = highlight_reports.prepared_by_user_id OR u.id = highlight_reports.created_by)
                  AND u.auth_user_id = auth.uid()
                  AND u.is_deleted = FALSE
            )
            OR
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON r.id = ur.role_id
                WHERE ur.user_id = auth.uid()
                  AND r.role_name = 'pmo_admin'
            )
        )
    );

-- ============================================================================
-- Helper: policy for child tables (select via parent project)
-- ============================================================================

CREATE OR REPLACE FUNCTION hlr_can_access_report(p_hr_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM highlight_reports hr
        WHERE hr.id = p_hr_id AND hr.is_deleted = FALSE
          AND (
              EXISTS (
                  SELECT 1 FROM project_memberships pm
                  WHERE pm.project_id = hr.project_id
                    AND pm.user_id = auth.uid()
                    AND pm.is_active = TRUE
              )
              OR EXISTS (
                  SELECT 1 FROM user_roles ur
                  JOIN roles r ON r.id = ur.role_id
                  WHERE ur.user_id = auth.uid() AND r.role_name = 'pmo_admin'
              )
          )
    );
$$;

-- ============================================================================
-- RLS POLICIES: highlight_report_revision_history
-- ============================================================================

DROP POLICY IF EXISTS policy_hlr_revision_select ON highlight_report_revision_history;
DROP POLICY IF EXISTS policy_hlr_revision_insert ON highlight_report_revision_history;

CREATE POLICY policy_hlr_revision_select ON highlight_report_revision_history
    FOR SELECT TO authenticated
    USING (hlr_can_access_report(highlight_report_id));

CREATE POLICY policy_hlr_revision_insert ON highlight_report_revision_history
    FOR INSERT TO authenticated
    WITH CHECK (hlr_can_access_report(highlight_report_id));

-- ============================================================================
-- RLS POLICIES: highlight_report_products
-- ============================================================================

DROP POLICY IF EXISTS policy_hlr_products_select ON highlight_report_products;
DROP POLICY IF EXISTS policy_hlr_products_insert ON highlight_report_products;
DROP POLICY IF EXISTS policy_hlr_products_update ON highlight_report_products;

CREATE POLICY policy_hlr_products_select ON highlight_report_products
    FOR SELECT TO authenticated
    USING (hlr_can_access_report(highlight_report_id));

CREATE POLICY policy_hlr_products_insert ON highlight_report_products
    FOR INSERT TO authenticated
    WITH CHECK (hlr_can_access_report(highlight_report_id));

CREATE POLICY policy_hlr_products_update ON highlight_report_products
    FOR UPDATE TO authenticated
    USING (hlr_can_access_report(highlight_report_id));

DROP POLICY IF EXISTS policy_hlr_products_delete ON highlight_report_products;
CREATE POLICY policy_hlr_products_delete ON highlight_report_products
    FOR DELETE TO authenticated
    USING (hlr_can_access_report(highlight_report_id));

-- ============================================================================
-- RLS POLICIES: highlight_report_risks
-- ============================================================================

DROP POLICY IF EXISTS policy_hlr_risks_select ON highlight_report_risks;
DROP POLICY IF EXISTS policy_hlr_risks_insert ON highlight_report_risks;
DROP POLICY IF EXISTS policy_hlr_risks_update ON highlight_report_risks;

CREATE POLICY policy_hlr_risks_select ON highlight_report_risks
    FOR SELECT TO authenticated
    USING (hlr_can_access_report(highlight_report_id));

CREATE POLICY policy_hlr_risks_insert ON highlight_report_risks
    FOR INSERT TO authenticated
    WITH CHECK (hlr_can_access_report(highlight_report_id));

CREATE POLICY policy_hlr_risks_update ON highlight_report_risks
    FOR UPDATE TO authenticated
    USING (hlr_can_access_report(highlight_report_id));

DROP POLICY IF EXISTS policy_hlr_risks_delete ON highlight_report_risks;
CREATE POLICY policy_hlr_risks_delete ON highlight_report_risks
    FOR DELETE TO authenticated
    USING (hlr_can_access_report(highlight_report_id));

-- ============================================================================
-- RLS POLICIES: highlight_report_issues
-- ============================================================================

DROP POLICY IF EXISTS policy_hlr_issues_select ON highlight_report_issues;
DROP POLICY IF EXISTS policy_hlr_issues_insert ON highlight_report_issues;
DROP POLICY IF EXISTS policy_hlr_issues_update ON highlight_report_issues;

CREATE POLICY policy_hlr_issues_select ON highlight_report_issues
    FOR SELECT TO authenticated
    USING (hlr_can_access_report(highlight_report_id));

CREATE POLICY policy_hlr_issues_insert ON highlight_report_issues
    FOR INSERT TO authenticated
    WITH CHECK (hlr_can_access_report(highlight_report_id));

CREATE POLICY policy_hlr_issues_update ON highlight_report_issues
    FOR UPDATE TO authenticated
    USING (hlr_can_access_report(highlight_report_id));

DROP POLICY IF EXISTS policy_hlr_issues_delete ON highlight_report_issues;
CREATE POLICY policy_hlr_issues_delete ON highlight_report_issues
    FOR DELETE TO authenticated
    USING (hlr_can_access_report(highlight_report_id));

-- ============================================================================
-- RLS POLICIES: highlight_report_change_requests
-- ============================================================================

DROP POLICY IF EXISTS policy_hlr_changes_select ON highlight_report_change_requests;
DROP POLICY IF EXISTS policy_hlr_changes_insert ON highlight_report_change_requests;
DROP POLICY IF EXISTS policy_hlr_changes_update ON highlight_report_change_requests;

CREATE POLICY policy_hlr_changes_select ON highlight_report_change_requests
    FOR SELECT TO authenticated
    USING (hlr_can_access_report(highlight_report_id));

CREATE POLICY policy_hlr_changes_insert ON highlight_report_change_requests
    FOR INSERT TO authenticated
    WITH CHECK (hlr_can_access_report(highlight_report_id));

CREATE POLICY policy_hlr_changes_update ON highlight_report_change_requests
    FOR UPDATE TO authenticated
    USING (hlr_can_access_report(highlight_report_id));

DROP POLICY IF EXISTS policy_hlr_changes_delete ON highlight_report_change_requests;
CREATE POLICY policy_hlr_changes_delete ON highlight_report_change_requests
    FOR DELETE TO authenticated
    USING (hlr_can_access_report(highlight_report_id));

-- ============================================================================
-- RLS POLICIES: highlight_report_tolerances
-- ============================================================================

DROP POLICY IF EXISTS policy_hlr_tolerances_select ON highlight_report_tolerances;
DROP POLICY IF EXISTS policy_hlr_tolerances_insert ON highlight_report_tolerances;
DROP POLICY IF EXISTS policy_hlr_tolerances_update ON highlight_report_tolerances;

CREATE POLICY policy_hlr_tolerances_select ON highlight_report_tolerances
    FOR SELECT TO authenticated
    USING (hlr_can_access_report(highlight_report_id));

CREATE POLICY policy_hlr_tolerances_insert ON highlight_report_tolerances
    FOR INSERT TO authenticated
    WITH CHECK (hlr_can_access_report(highlight_report_id));

CREATE POLICY policy_hlr_tolerances_update ON highlight_report_tolerances
    FOR UPDATE TO authenticated
    USING (hlr_can_access_report(highlight_report_id));

-- ============================================================================
-- RLS POLICIES: highlight_report_decisions
-- ============================================================================

DROP POLICY IF EXISTS policy_hlr_decisions_select ON highlight_report_decisions;
DROP POLICY IF EXISTS policy_hlr_decisions_insert ON highlight_report_decisions;
DROP POLICY IF EXISTS policy_hlr_decisions_update ON highlight_report_decisions;

CREATE POLICY policy_hlr_decisions_select ON highlight_report_decisions
    FOR SELECT TO authenticated
    USING (hlr_can_access_report(highlight_report_id));

CREATE POLICY policy_hlr_decisions_insert ON highlight_report_decisions
    FOR INSERT TO authenticated
    WITH CHECK (hlr_can_access_report(highlight_report_id));

CREATE POLICY policy_hlr_decisions_update ON highlight_report_decisions
    FOR UPDATE TO authenticated
    USING (hlr_can_access_report(highlight_report_id));

-- ============================================================================
-- RLS POLICIES: highlight_report_distribution
-- ============================================================================

DROP POLICY IF EXISTS policy_hlr_distribution_select ON highlight_report_distribution;
DROP POLICY IF EXISTS policy_hlr_distribution_insert ON highlight_report_distribution;
DROP POLICY IF EXISTS policy_hlr_distribution_update ON highlight_report_distribution;

CREATE POLICY policy_hlr_distribution_select ON highlight_report_distribution
    FOR SELECT TO authenticated
    USING (hlr_can_access_report(highlight_report_id));

CREATE POLICY policy_hlr_distribution_insert ON highlight_report_distribution
    FOR INSERT TO authenticated
    WITH CHECK (hlr_can_access_report(highlight_report_id));

CREATE POLICY policy_hlr_distribution_update ON highlight_report_distribution
    FOR UPDATE TO authenticated
    USING (hlr_can_access_report(highlight_report_id));

-- ============================================================================
-- RLS POLICIES: highlight_report_lessons
-- ============================================================================

DROP POLICY IF EXISTS policy_hlr_lessons_select ON highlight_report_lessons;
DROP POLICY IF EXISTS policy_hlr_lessons_insert ON highlight_report_lessons;
DROP POLICY IF EXISTS policy_hlr_lessons_update ON highlight_report_lessons;

CREATE POLICY policy_hlr_lessons_select ON highlight_report_lessons
    FOR SELECT TO authenticated
    USING (hlr_can_access_report(highlight_report_id));

CREATE POLICY policy_hlr_lessons_insert ON highlight_report_lessons
    FOR INSERT TO authenticated
    WITH CHECK (hlr_can_access_report(highlight_report_id));

CREATE POLICY policy_hlr_lessons_update ON highlight_report_lessons
    FOR UPDATE TO authenticated
    USING (hlr_can_access_report(highlight_report_id));

DROP POLICY IF EXISTS policy_hlr_lessons_delete ON highlight_report_lessons;
CREATE POLICY policy_hlr_lessons_delete ON highlight_report_lessons
    FOR DELETE TO authenticated
    USING (hlr_can_access_report(highlight_report_id));

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'v223_highlight_report_rls_policies: RLS enabled on highlight_reports and 9 child tables';
END;
$$;
