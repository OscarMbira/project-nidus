-- ================================================
-- End Project Report RLS Policies
-- SQL Version: v193
-- Date: 2026-01-20
-- Related: v192_end_project_report_enhancement.sql
-- ================================================

-- ================================================
-- GRANT PERMISSIONS
-- ================================================

-- Grant permissions on enhanced end_project_reports table
GRANT SELECT, INSERT, UPDATE ON end_project_reports TO authenticated;

-- Grant permissions on all supporting tables
GRANT SELECT, INSERT, UPDATE ON end_project_report_revision_history TO authenticated;
GRANT SELECT, INSERT, UPDATE ON end_project_report_approvals TO authenticated;
GRANT SELECT, INSERT, UPDATE ON end_project_report_distribution TO authenticated;
GRANT SELECT, INSERT, UPDATE ON end_project_report_business_case_review TO authenticated;
GRANT SELECT, INSERT, UPDATE ON end_project_report_objectives_review TO authenticated;
GRANT SELECT, INSERT, UPDATE ON end_project_report_team_performance TO authenticated;
GRANT SELECT, INSERT, UPDATE ON end_project_report_quality_records TO authenticated;
GRANT SELECT, INSERT, UPDATE ON end_project_report_approval_records TO authenticated;
GRANT SELECT, INSERT, UPDATE ON end_project_report_off_specifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON end_project_report_lessons TO authenticated;
GRANT SELECT, INSERT, UPDATE ON end_project_report_follow_on_actions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON end_project_report_quality_checks TO authenticated;

-- ================================================
-- ENABLE ROW LEVEL SECURITY
-- ================================================

ALTER TABLE end_project_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE end_project_report_revision_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE end_project_report_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE end_project_report_distribution ENABLE ROW LEVEL SECURITY;
ALTER TABLE end_project_report_business_case_review ENABLE ROW LEVEL SECURITY;
ALTER TABLE end_project_report_objectives_review ENABLE ROW LEVEL SECURITY;
ALTER TABLE end_project_report_team_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE end_project_report_quality_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE end_project_report_approval_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE end_project_report_off_specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE end_project_report_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE end_project_report_follow_on_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE end_project_report_quality_checks ENABLE ROW LEVEL SECURITY;

-- ================================================
-- RLS POLICIES: end_project_reports
-- ================================================

-- SELECT: Users can view reports for projects they're members of
DROP POLICY IF EXISTS policy_end_project_reports_auth_select ON end_project_reports;
CREATE POLICY policy_end_project_reports_auth_select ON end_project_reports
    FOR SELECT
    TO authenticated
    USING (
        is_deleted = FALSE AND
        (
            -- Project members can view
            EXISTS (
                SELECT 1 FROM project_members pm
                WHERE pm.project_id = end_project_reports.project_id
                  AND pm.user_id = auth.uid()
                  AND pm.is_deleted = FALSE
            )
            OR
            -- Report author/owner/client can view
            author_id = auth.uid()
            OR owner_id = auth.uid()
            OR client_id = auth.uid()
            OR
            -- PMO Admins can view all
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON r.id = ur.role_id
                WHERE ur.user_id = auth.uid()
                  AND r.role_code = 'pmo_admin'
                  AND ur.is_deleted = FALSE
            )
        )
    );

-- INSERT: Project Managers can create reports for their projects
DROP POLICY IF EXISTS policy_end_project_reports_auth_insert ON end_project_reports;
CREATE POLICY policy_end_project_reports_auth_insert ON end_project_reports
    FOR INSERT
    TO authenticated
    WITH CHECK (
        is_deleted = FALSE AND
        (
            -- Project Manager can create
            EXISTS (
                SELECT 1 FROM projects p
                WHERE p.id = end_project_reports.project_id
                  AND p.project_manager_id = auth.uid()
                  AND p.is_deleted = FALSE
            )
            OR
            -- PMO Admins can create
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON r.id = ur.role_id
                WHERE ur.user_id = auth.uid()
                  AND r.role_code = 'pmo_admin'
                  AND ur.is_deleted = FALSE
            )
        )
    );

-- UPDATE: Only draft/rejected reports can be edited by author/owner
DROP POLICY IF EXISTS policy_end_project_reports_auth_update ON end_project_reports;
CREATE POLICY policy_end_project_reports_auth_update ON end_project_reports
    FOR UPDATE
    TO authenticated
    USING (
        is_deleted = FALSE AND
        (
            -- Author/Owner can edit draft/rejected reports
            (
                (author_id = auth.uid() OR owner_id = auth.uid())
                AND approval_status IN ('draft', 'rejected')
            )
            OR
            -- PMO Admins can edit
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON r.id = ur.role_id
                WHERE ur.user_id = auth.uid()
                  AND r.role_code = 'pmo_admin'
                  AND ur.is_deleted = FALSE
            )
        )
    );

-- ================================================
-- RLS POLICIES: end_project_report_revision_history
-- ================================================

DROP POLICY IF EXISTS policy_epr_revision_history_auth_select ON end_project_report_revision_history;
CREATE POLICY policy_epr_revision_history_auth_select ON end_project_report_revision_history
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM end_project_reports epr
            WHERE epr.id = end_project_report_revision_history.end_project_report_id
              AND epr.is_deleted = FALSE
              AND (
                  EXISTS (
                      SELECT 1 FROM project_members pm
                      WHERE pm.project_id = epr.project_id
                        AND pm.user_id = auth.uid()
                        AND pm.is_deleted = FALSE
                  )
                  OR
                  EXISTS (
                      SELECT 1 FROM user_roles ur
                      JOIN roles r ON r.id = ur.role_id
                      WHERE ur.user_id = auth.uid()
                        AND r.role_code = 'pmo_admin'
                        AND ur.is_deleted = FALSE
                  )
              )
        )
    );

DROP POLICY IF EXISTS policy_epr_revision_history_auth_insert ON end_project_report_revision_history;
CREATE POLICY policy_epr_revision_history_auth_insert ON end_project_report_revision_history
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM end_project_reports epr
            WHERE epr.id = end_project_report_revision_history.end_project_report_id
              AND epr.is_deleted = FALSE
              AND (epr.author_id = auth.uid() OR epr.owner_id = auth.uid())
        )
    );

-- ================================================
-- RLS POLICIES: end_project_report_approvals
-- ================================================

DROP POLICY IF EXISTS policy_epr_approvals_auth_select ON end_project_report_approvals;
CREATE POLICY policy_epr_approvals_auth_select ON end_project_report_approvals
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM end_project_reports epr
            WHERE epr.id = end_project_report_approvals.end_project_report_id
              AND epr.is_deleted = FALSE
              AND (
                  EXISTS (
                      SELECT 1 FROM project_members pm
                      WHERE pm.project_id = epr.project_id
                        AND pm.user_id = auth.uid()
                        AND pm.is_deleted = FALSE
                  )
                  OR approver_id = auth.uid()
              )
        )
    );

DROP POLICY IF EXISTS policy_epr_approvals_auth_insert ON end_project_report_approvals;
CREATE POLICY policy_epr_approvals_auth_insert ON end_project_report_approvals
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM end_project_reports epr
            WHERE epr.id = end_project_report_approvals.end_project_report_id
              AND epr.is_deleted = FALSE
              AND (epr.author_id = auth.uid() OR epr.owner_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS policy_epr_approvals_auth_update ON end_project_report_approvals;
CREATE POLICY policy_epr_approvals_auth_update ON end_project_report_approvals
    FOR UPDATE
    TO authenticated
    USING (
        approver_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM end_project_reports epr
            WHERE epr.id = end_project_report_approvals.end_project_report_id
              AND epr.is_deleted = FALSE
              AND EXISTS (
                  SELECT 1 FROM user_roles ur
                  JOIN roles r ON r.id = ur.role_id
                  WHERE ur.user_id = auth.uid()
                    AND r.role_code = 'pmo_admin'
                    AND ur.is_deleted = FALSE
              )
        )
    );

-- ================================================
-- RLS POLICIES: end_project_report_distribution
-- ================================================

DROP POLICY IF EXISTS policy_epr_distribution_auth_select ON end_project_report_distribution;
CREATE POLICY policy_epr_distribution_auth_select ON end_project_report_distribution
    FOR SELECT
    TO authenticated
    USING (
        recipient_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM end_project_reports epr
            WHERE epr.id = end_project_report_distribution.end_project_report_id
              AND epr.is_deleted = FALSE
              AND (
                  EXISTS (
                      SELECT 1 FROM project_members pm
                      WHERE pm.project_id = epr.project_id
                        AND pm.user_id = auth.uid()
                        AND pm.is_deleted = FALSE
                  )
                  OR epr.author_id = auth.uid()
                  OR epr.owner_id = auth.uid()
              )
        )
    );

DROP POLICY IF EXISTS policy_epr_distribution_auth_insert ON end_project_report_distribution;
CREATE POLICY policy_epr_distribution_auth_insert ON end_project_report_distribution
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM end_project_reports epr
            WHERE epr.id = end_project_report_distribution.end_project_report_id
              AND epr.is_deleted = FALSE
              AND (epr.author_id = auth.uid() OR epr.owner_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS policy_epr_distribution_auth_update ON end_project_report_distribution;
CREATE POLICY policy_epr_distribution_auth_update ON end_project_report_distribution
    FOR UPDATE
    TO authenticated
    USING (
        recipient_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM end_project_reports epr
            WHERE epr.id = end_project_report_distribution.end_project_report_id
              AND epr.is_deleted = FALSE
              AND (epr.author_id = auth.uid() OR epr.owner_id = auth.uid())
        )
    );

-- ================================================
-- RLS POLICIES: end_project_report_business_case_review
-- ================================================

DROP POLICY IF EXISTS policy_epr_bc_review_auth_select ON end_project_report_business_case_review;
CREATE POLICY policy_epr_bc_review_auth_select ON end_project_report_business_case_review
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM end_project_reports epr
            WHERE epr.id = end_project_report_business_case_review.end_project_report_id
              AND epr.is_deleted = FALSE
              AND EXISTS (
                  SELECT 1 FROM project_members pm
                  WHERE pm.project_id = epr.project_id
                    AND pm.user_id = auth.uid()
                    AND pm.is_deleted = FALSE
              )
        )
    );

DROP POLICY IF EXISTS policy_epr_bc_review_auth_insert ON end_project_report_business_case_review;
CREATE POLICY policy_epr_bc_review_auth_insert ON end_project_report_business_case_review
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM end_project_reports epr
            WHERE epr.id = end_project_report_business_case_review.end_project_report_id
              AND epr.is_deleted = FALSE
              AND (epr.author_id = auth.uid() OR epr.owner_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS policy_epr_bc_review_auth_update ON end_project_report_business_case_review;
CREATE POLICY policy_epr_bc_review_auth_update ON end_project_report_business_case_review
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM end_project_reports epr
            WHERE epr.id = end_project_report_business_case_review.end_project_report_id
              AND epr.is_deleted = FALSE
              AND (epr.author_id = auth.uid() OR epr.owner_id = auth.uid())
        )
    );

-- ================================================
-- RLS POLICIES: end_project_report_objectives_review
-- ================================================

DROP POLICY IF EXISTS policy_epr_objectives_review_auth_select ON end_project_report_objectives_review;
CREATE POLICY policy_epr_objectives_review_auth_select ON end_project_report_objectives_review
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM end_project_reports epr
            WHERE epr.id = end_project_report_objectives_review.end_project_report_id
              AND epr.is_deleted = FALSE
              AND EXISTS (
                  SELECT 1 FROM project_members pm
                  WHERE pm.project_id = epr.project_id
                    AND pm.user_id = auth.uid()
                    AND pm.is_deleted = FALSE
              )
        )
    );

DROP POLICY IF EXISTS policy_epr_objectives_review_auth_insert ON end_project_report_objectives_review;
CREATE POLICY policy_epr_objectives_review_auth_insert ON end_project_report_objectives_review
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM end_project_reports epr
            WHERE epr.id = end_project_report_objectives_review.end_project_report_id
              AND epr.is_deleted = FALSE
              AND (epr.author_id = auth.uid() OR epr.owner_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS policy_epr_objectives_review_auth_update ON end_project_report_objectives_review;
CREATE POLICY policy_epr_objectives_review_auth_update ON end_project_report_objectives_review
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM end_project_reports epr
            WHERE epr.id = end_project_report_objectives_review.end_project_report_id
              AND epr.is_deleted = FALSE
              AND (epr.author_id = auth.uid() OR epr.owner_id = auth.uid())
        )
    );

-- ================================================
-- RLS POLICIES: end_project_report_team_performance
-- ================================================

DROP POLICY IF EXISTS policy_epr_team_perf_auth_select ON end_project_report_team_performance;
CREATE POLICY policy_epr_team_perf_auth_select ON end_project_report_team_performance
    FOR SELECT
    TO authenticated
    USING (
        team_member_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM end_project_reports epr
            WHERE epr.id = end_project_report_team_performance.end_project_report_id
              AND epr.is_deleted = FALSE
              AND EXISTS (
                  SELECT 1 FROM project_members pm
                  WHERE pm.project_id = epr.project_id
                    AND pm.user_id = auth.uid()
                    AND pm.is_deleted = FALSE
              )
        )
    );

DROP POLICY IF EXISTS policy_epr_team_perf_auth_insert ON end_project_report_team_performance;
CREATE POLICY policy_epr_team_perf_auth_insert ON end_project_report_team_performance
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM end_project_reports epr
            WHERE epr.id = end_project_report_team_performance.end_project_report_id
              AND epr.is_deleted = FALSE
              AND (epr.author_id = auth.uid() OR epr.owner_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS policy_epr_team_perf_auth_update ON end_project_report_team_performance;
CREATE POLICY policy_epr_team_perf_auth_update ON end_project_report_team_performance
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM end_project_reports epr
            WHERE epr.id = end_project_report_team_performance.end_project_report_id
              AND epr.is_deleted = FALSE
              AND (epr.author_id = auth.uid() OR epr.owner_id = auth.uid())
        )
    );

-- ================================================
-- RLS POLICIES: end_project_report_quality_records
-- ================================================

DROP POLICY IF EXISTS policy_epr_quality_records_auth_select ON end_project_report_quality_records;
CREATE POLICY policy_epr_quality_records_auth_select ON end_project_report_quality_records
    FOR SELECT
    TO authenticated
    USING (
        reviewer_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM end_project_reports epr
            WHERE epr.id = end_project_report_quality_records.end_project_report_id
              AND epr.is_deleted = FALSE
              AND EXISTS (
                  SELECT 1 FROM project_members pm
                  WHERE pm.project_id = epr.project_id
                    AND pm.user_id = auth.uid()
                    AND pm.is_deleted = FALSE
              )
        )
    );

DROP POLICY IF EXISTS policy_epr_quality_records_auth_insert ON end_project_report_quality_records;
CREATE POLICY policy_epr_quality_records_auth_insert ON end_project_report_quality_records
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM end_project_reports epr
            WHERE epr.id = end_project_report_quality_records.end_project_report_id
              AND epr.is_deleted = FALSE
              AND (epr.author_id = auth.uid() OR epr.owner_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS policy_epr_quality_records_auth_update ON end_project_report_quality_records;
CREATE POLICY policy_epr_quality_records_auth_update ON end_project_report_quality_records
    FOR UPDATE
    TO authenticated
    USING (
        reviewer_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM end_project_reports epr
            WHERE epr.id = end_project_report_quality_records.end_project_report_id
              AND epr.is_deleted = FALSE
              AND (epr.author_id = auth.uid() OR epr.owner_id = auth.uid())
        )
    );

-- ================================================
-- RLS POLICIES: end_project_report_approval_records
-- ================================================

DROP POLICY IF EXISTS policy_epr_approval_records_auth_select ON end_project_report_approval_records;
CREATE POLICY policy_epr_approval_records_auth_select ON end_project_report_approval_records
    FOR SELECT
    TO authenticated
    USING (
        approver_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM end_project_reports epr
            WHERE epr.id = end_project_report_approval_records.end_project_report_id
              AND epr.is_deleted = FALSE
              AND EXISTS (
                  SELECT 1 FROM project_members pm
                  WHERE pm.project_id = epr.project_id
                    AND pm.user_id = auth.uid()
                    AND pm.is_deleted = FALSE
              )
        )
    );

DROP POLICY IF EXISTS policy_epr_approval_records_auth_insert ON end_project_report_approval_records;
CREATE POLICY policy_epr_approval_records_auth_insert ON end_project_report_approval_records
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM end_project_reports epr
            WHERE epr.id = end_project_report_approval_records.end_project_report_id
              AND epr.is_deleted = FALSE
              AND (epr.author_id = auth.uid() OR epr.owner_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS policy_epr_approval_records_auth_update ON end_project_report_approval_records;
CREATE POLICY policy_epr_approval_records_auth_update ON end_project_report_approval_records
    FOR UPDATE
    TO authenticated
    USING (
        approver_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM end_project_reports epr
            WHERE epr.id = end_project_report_approval_records.end_project_report_id
              AND epr.is_deleted = FALSE
              AND (epr.author_id = auth.uid() OR epr.owner_id = auth.uid())
        )
    );

-- ================================================
-- RLS POLICIES: end_project_report_off_specifications
-- ================================================

DROP POLICY IF EXISTS policy_epr_off_specs_auth_select ON end_project_report_off_specifications;
CREATE POLICY policy_epr_off_specs_auth_select ON end_project_report_off_specifications
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM end_project_reports epr
            WHERE epr.id = end_project_report_off_specifications.end_project_report_id
              AND epr.is_deleted = FALSE
              AND EXISTS (
                  SELECT 1 FROM project_members pm
                  WHERE pm.project_id = epr.project_id
                    AND pm.user_id = auth.uid()
                    AND pm.is_deleted = FALSE
              )
        )
    );

DROP POLICY IF EXISTS policy_epr_off_specs_auth_insert ON end_project_report_off_specifications;
CREATE POLICY policy_epr_off_specs_auth_insert ON end_project_report_off_specifications
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM end_project_reports epr
            WHERE epr.id = end_project_report_off_specifications.end_project_report_id
              AND epr.is_deleted = FALSE
              AND (epr.author_id = auth.uid() OR epr.owner_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS policy_epr_off_specs_auth_update ON end_project_report_off_specifications;
CREATE POLICY policy_epr_off_specs_auth_update ON end_project_report_off_specifications
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM end_project_reports epr
            WHERE epr.id = end_project_report_off_specifications.end_project_report_id
              AND epr.is_deleted = FALSE
              AND (epr.author_id = auth.uid() OR epr.owner_id = auth.uid())
        )
    );

-- ================================================
-- RLS POLICIES: end_project_report_lessons
-- ================================================

DROP POLICY IF EXISTS policy_epr_lessons_auth_select ON end_project_report_lessons;
CREATE POLICY policy_epr_lessons_auth_select ON end_project_report_lessons
    FOR SELECT
    TO authenticated
    USING (
        identified_by = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM end_project_reports epr
            WHERE epr.id = end_project_report_lessons.end_project_report_id
              AND epr.is_deleted = FALSE
              AND EXISTS (
                  SELECT 1 FROM project_members pm
                  WHERE pm.project_id = epr.project_id
                    AND pm.user_id = auth.uid()
                    AND pm.is_deleted = FALSE
              )
        )
    );

DROP POLICY IF EXISTS policy_epr_lessons_auth_insert ON end_project_report_lessons;
CREATE POLICY policy_epr_lessons_auth_insert ON end_project_report_lessons
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM end_project_reports epr
            WHERE epr.id = end_project_report_lessons.end_project_report_id
              AND epr.is_deleted = FALSE
              AND EXISTS (
                  SELECT 1 FROM project_members pm
                  WHERE pm.project_id = epr.project_id
                    AND pm.user_id = auth.uid()
                    AND pm.is_deleted = FALSE
              )
        )
    );

DROP POLICY IF EXISTS policy_epr_lessons_auth_update ON end_project_report_lessons;
CREATE POLICY policy_epr_lessons_auth_update ON end_project_report_lessons
    FOR UPDATE
    TO authenticated
    USING (
        identified_by = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM end_project_reports epr
            WHERE epr.id = end_project_report_lessons.end_project_report_id
              AND epr.is_deleted = FALSE
              AND (epr.author_id = auth.uid() OR epr.owner_id = auth.uid())
        )
    );

-- ================================================
-- RLS POLICIES: end_project_report_follow_on_actions
-- ================================================

DROP POLICY IF EXISTS policy_epr_follow_on_auth_select ON end_project_report_follow_on_actions;
CREATE POLICY policy_epr_follow_on_auth_select ON end_project_report_follow_on_actions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM end_project_reports epr
            WHERE epr.id = end_project_report_follow_on_actions.end_project_report_id
              AND epr.is_deleted = FALSE
              AND EXISTS (
                  SELECT 1 FROM project_members pm
                  WHERE pm.project_id = epr.project_id
                    AND pm.user_id = auth.uid()
                    AND pm.is_deleted = FALSE
              )
        )
    );

DROP POLICY IF EXISTS policy_epr_follow_on_auth_insert ON end_project_report_follow_on_actions;
CREATE POLICY policy_epr_follow_on_auth_insert ON end_project_report_follow_on_actions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM end_project_reports epr
            WHERE epr.id = end_project_report_follow_on_actions.end_project_report_id
              AND epr.is_deleted = FALSE
              AND (epr.author_id = auth.uid() OR epr.owner_id = auth.uid())
        )
    );

-- ================================================
-- RLS POLICIES: end_project_report_quality_checks
-- ================================================

DROP POLICY IF EXISTS policy_epr_quality_checks_auth_select ON end_project_report_quality_checks;
CREATE POLICY policy_epr_quality_checks_auth_select ON end_project_report_quality_checks
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM end_project_reports epr
            WHERE epr.id = end_project_report_quality_checks.end_project_report_id
              AND epr.is_deleted = FALSE
              AND EXISTS (
                  SELECT 1 FROM project_members pm
                  WHERE pm.project_id = epr.project_id
                    AND pm.user_id = auth.uid()
                    AND pm.is_deleted = FALSE
              )
        )
    );

DROP POLICY IF EXISTS policy_epr_quality_checks_auth_insert ON end_project_report_quality_checks;
CREATE POLICY policy_epr_quality_checks_auth_insert ON end_project_report_quality_checks
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM end_project_reports epr
            WHERE epr.id = end_project_report_quality_checks.end_project_report_id
              AND epr.is_deleted = FALSE
              AND (epr.author_id = auth.uid() OR epr.owner_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS policy_epr_quality_checks_auth_update ON end_project_report_quality_checks;
CREATE POLICY policy_epr_quality_checks_auth_update ON end_project_report_quality_checks
    FOR UPDATE
    TO authenticated
    USING (
        checked_by = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM end_project_reports epr
            WHERE epr.id = end_project_report_quality_checks.end_project_report_id
              AND epr.is_deleted = FALSE
              AND (epr.author_id = auth.uid() OR epr.owner_id = auth.uid())
        )
        OR
        EXISTS (
            SELECT 1 FROM end_project_reports epr
            WHERE epr.id = end_project_report_quality_checks.end_project_report_id
              AND epr.is_deleted = FALSE
              AND EXISTS (
                  SELECT 1 FROM user_roles ur
                  JOIN roles r ON r.id = ur.role_id
                  WHERE ur.user_id = auth.uid()
                    AND r.role_code IN ('pmo_admin', 'project_assurance')
                    AND ur.is_deleted = FALSE
              )
        )
    );
