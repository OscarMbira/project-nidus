-- ================================================
-- Exception Report RLS Policies
-- SQL Version: v221
-- Date: 2026-01-20
-- Related: v220_exception_report_tables.sql
-- ================================================

-- ================================================
-- GRANT PERMISSIONS
-- ================================================

-- Grant permissions on exception_reports table
GRANT SELECT, INSERT, UPDATE ON exception_reports TO authenticated;

-- Grant permissions on all supporting tables
GRANT SELECT, INSERT, UPDATE ON exception_report_revision_history TO authenticated;
GRANT SELECT, INSERT, UPDATE ON exception_report_approvals TO authenticated;
GRANT SELECT, INSERT, UPDATE ON exception_report_distribution TO authenticated;
GRANT SELECT, INSERT, UPDATE ON exception_report_options TO authenticated;
GRANT SELECT, INSERT, UPDATE ON exception_report_lessons TO authenticated;
GRANT SELECT, INSERT, UPDATE ON exception_report_quality_checks TO authenticated;

-- ================================================
-- ENABLE ROW LEVEL SECURITY
-- ================================================

ALTER TABLE exception_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE exception_report_revision_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE exception_report_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE exception_report_distribution ENABLE ROW LEVEL SECURITY;
ALTER TABLE exception_report_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE exception_report_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE exception_report_quality_checks ENABLE ROW LEVEL SECURITY;

-- ================================================
-- RLS POLICIES: exception_reports
-- ================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS policy_exception_reports_auth_select ON exception_reports;
DROP POLICY IF EXISTS policy_exception_reports_auth_insert ON exception_reports;
DROP POLICY IF EXISTS policy_exception_reports_auth_update ON exception_reports;

-- Select: Users can view reports for projects they're members of
CREATE POLICY policy_exception_reports_auth_select ON exception_reports
    FOR SELECT
    TO authenticated
    USING (
        is_deleted = FALSE AND (
            -- Project members can view
            EXISTS (
                SELECT 1 FROM project_memberships pm
                WHERE pm.project_id = exception_reports.project_id
                  AND pm.user_id = auth.uid()
                  AND pm.is_active = TRUE
            )
            OR
            -- PMO Admins can view all
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON r.id = ur.role_id
                WHERE ur.user_id = auth.uid()
                  AND r.role_name = 'pmo_admin'
            )
            OR
            -- Project Board members can view (board membership is per project)
            EXISTS (
                SELECT 1 FROM project_board_members pbm
                WHERE pbm.project_id = exception_reports.project_id
                  AND pbm.user_id = auth.uid()
                  AND pbm.is_deleted = FALSE
                  AND (pbm.is_active = TRUE OR pbm.is_active IS NULL)
            )
        )
    );

-- Insert: Project Managers can create for their projects
CREATE POLICY policy_exception_reports_auth_insert ON exception_reports
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Project Managers can create for their projects
        EXISTS (
            SELECT 1 FROM project_memberships pm
            JOIN user_roles ur ON ur.user_id = pm.user_id
            JOIN roles r ON r.id = ur.role_id
            WHERE pm.project_id = exception_reports.project_id
              AND pm.user_id = auth.uid()
              AND r.role_name = 'project_manager'
              AND pm.is_active = TRUE
        )
        OR
        -- PMO Admins can create
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = auth.uid()
              AND r.role_name = 'pmo_admin'
        )
    );

-- Update: Authors, PMO Admins, or board members can update (if not approved)
CREATE POLICY policy_exception_reports_auth_update ON exception_reports
    FOR UPDATE
    TO authenticated
    USING (
        is_deleted = FALSE AND (
            -- Authors can edit draft/rejected reports
            (created_by = auth.uid() OR author_id = auth.uid()) 
            AND report_status IN ('draft', 'rejected')
            OR
            -- PMO Admins can edit any report
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON r.id = ur.role_id
                WHERE ur.user_id = auth.uid()
                  AND r.role_name = 'pmo_admin'
            )
            OR
            -- Board members can record decisions (board membership is per project)
            (report_status IN ('submitted', 'under_review', 'decision_pending')
             AND EXISTS (
                 SELECT 1 FROM project_board_members pbm
                 WHERE pbm.project_id = exception_reports.project_id
                   AND pbm.user_id = auth.uid()
                   AND pbm.is_deleted = FALSE
                   AND (pbm.is_active = TRUE OR pbm.is_active IS NULL)
             ))
        )
    )
    WITH CHECK (
        -- Same conditions for WITH CHECK
        is_deleted = FALSE AND (
            (created_by = auth.uid() OR author_id = auth.uid()) 
            AND report_status IN ('draft', 'rejected')
            OR
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON r.id = ur.role_id
                WHERE ur.user_id = auth.uid()
                  AND r.role_name = 'pmo_admin'
            )
            OR
            (report_status IN ('submitted', 'under_review', 'decision_pending')
             AND EXISTS (
                 SELECT 1 FROM project_board_members pbm
                 WHERE pbm.project_id = exception_reports.project_id
                   AND pbm.user_id = auth.uid()
                   AND pbm.is_deleted = FALSE
                   AND (pbm.is_active = TRUE OR pbm.is_active IS NULL)
             ))
        )
    );

-- ================================================
-- RLS POLICIES: exception_report_revision_history
-- ================================================

DROP POLICY IF EXISTS policy_exr_revision_history_auth_select ON exception_report_revision_history;
DROP POLICY IF EXISTS policy_exr_revision_history_auth_insert ON exception_report_revision_history;

CREATE POLICY policy_exr_revision_history_auth_select ON exception_report_revision_history
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM exception_reports er
            WHERE er.id = exception_report_revision_history.exception_report_id
              AND er.is_deleted = FALSE
              AND (
                  EXISTS (
                      SELECT 1 FROM project_memberships pm
                      WHERE pm.project_id = er.project_id
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
              )
        )
    );

CREATE POLICY policy_exr_revision_history_auth_insert ON exception_report_revision_history
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM exception_reports er
            WHERE er.id = exception_report_revision_history.exception_report_id
              AND er.is_deleted = FALSE
              AND (
                  er.created_by = auth.uid() OR er.author_id = auth.uid()
                  OR
                  EXISTS (
                      SELECT 1 FROM user_roles ur
                      JOIN roles r ON r.id = ur.role_id
                      WHERE ur.user_id = auth.uid()
                        AND r.role_name = 'pmo_admin'
                  )
              )
        )
    );

-- ================================================
-- RLS POLICIES: exception_report_approvals
-- ================================================

DROP POLICY IF EXISTS policy_exr_approvals_auth_select ON exception_report_approvals;
DROP POLICY IF EXISTS policy_exr_approvals_auth_insert ON exception_report_approvals;
DROP POLICY IF EXISTS policy_exr_approvals_auth_update ON exception_report_approvals;

CREATE POLICY policy_exr_approvals_auth_select ON exception_report_approvals
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM exception_reports er
            WHERE er.id = exception_report_approvals.exception_report_id
              AND er.is_deleted = FALSE
              AND (
                  EXISTS (
                      SELECT 1 FROM project_memberships pm
                      WHERE pm.project_id = er.project_id
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
                  -- Approvers can view their own approvals
                  approver_id = auth.uid()
              )
        )
    );

CREATE POLICY policy_exr_approvals_auth_insert ON exception_report_approvals
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM exception_reports er
            WHERE er.id = exception_report_approvals.exception_report_id
              AND er.is_deleted = FALSE
              AND (
                  er.created_by = auth.uid() OR er.author_id = auth.uid()
                  OR
                  EXISTS (
                      SELECT 1 FROM user_roles ur
                      JOIN roles r ON r.id = ur.role_id
                      WHERE ur.user_id = auth.uid()
                        AND r.role_name = 'pmo_admin'
                  )
              )
        )
    );

CREATE POLICY policy_exr_approvals_auth_update ON exception_report_approvals
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM exception_reports er
            WHERE er.id = exception_report_approvals.exception_report_id
              AND er.is_deleted = FALSE
              AND (
                  -- Approvers can update their own approvals
                  approver_id = auth.uid()
                  OR
                  EXISTS (
                      SELECT 1 FROM user_roles ur
                      JOIN roles r ON r.id = ur.role_id
                      WHERE ur.user_id = auth.uid()
                        AND r.role_name = 'pmo_admin'
                  )
              )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM exception_reports er
            WHERE er.id = exception_report_approvals.exception_report_id
              AND er.is_deleted = FALSE
              AND (
                  approver_id = auth.uid()
                  OR
                  EXISTS (
                      SELECT 1 FROM user_roles ur
                      JOIN roles r ON r.id = ur.role_id
                      WHERE ur.user_id = auth.uid()
                        AND r.role_name = 'pmo_admin'
                  )
              )
        )
    );

-- ================================================
-- RLS POLICIES: exception_report_distribution
-- ================================================

DROP POLICY IF EXISTS policy_exr_distribution_auth_select ON exception_report_distribution;
DROP POLICY IF EXISTS policy_exr_distribution_auth_insert ON exception_report_distribution;
DROP POLICY IF EXISTS policy_exr_distribution_auth_update ON exception_report_distribution;

CREATE POLICY policy_exr_distribution_auth_select ON exception_report_distribution
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM exception_reports er
            WHERE er.id = exception_report_distribution.exception_report_id
              AND er.is_deleted = FALSE
              AND (
                  EXISTS (
                      SELECT 1 FROM project_memberships pm
                      WHERE pm.project_id = er.project_id
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
                  -- Recipients can view their distribution records
                  recipient_id = auth.uid()
              )
        )
    );

CREATE POLICY policy_exr_distribution_auth_insert ON exception_report_distribution
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM exception_reports er
            WHERE er.id = exception_report_distribution.exception_report_id
              AND er.is_deleted = FALSE
              AND (
                  er.created_by = auth.uid() OR er.author_id = auth.uid()
                  OR
                  EXISTS (
                      SELECT 1 FROM user_roles ur
                      JOIN roles r ON r.id = ur.role_id
                      WHERE ur.user_id = auth.uid()
                        AND r.role_name = 'pmo_admin'
                  )
              )
        )
    );

CREATE POLICY policy_exr_distribution_auth_update ON exception_report_distribution
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM exception_reports er
            WHERE er.id = exception_report_distribution.exception_report_id
              AND er.is_deleted = FALSE
              AND (
                  er.created_by = auth.uid() OR er.author_id = auth.uid()
                  OR
                  EXISTS (
                      SELECT 1 FROM user_roles ur
                      JOIN roles r ON r.id = ur.role_id
                      WHERE ur.user_id = auth.uid()
                        AND r.role_name = 'pmo_admin'
                  )
                  OR
                  -- Recipients can update their acknowledgment status
                  (recipient_id = auth.uid() AND distribution_status != 'acknowledged')
              )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM exception_reports er
            WHERE er.id = exception_report_distribution.exception_report_id
              AND er.is_deleted = FALSE
              AND (
                  er.created_by = auth.uid() OR er.author_id = auth.uid()
                  OR
                  EXISTS (
                      SELECT 1 FROM user_roles ur
                      JOIN roles r ON r.id = ur.role_id
                      WHERE ur.user_id = auth.uid()
                        AND r.role_name = 'pmo_admin'
                  )
                  OR
                  (recipient_id = auth.uid())
              )
        )
    );

-- ================================================
-- RLS POLICIES: exception_report_options
-- ================================================

DROP POLICY IF EXISTS policy_exr_options_auth_select ON exception_report_options;
DROP POLICY IF EXISTS policy_exr_options_auth_insert ON exception_report_options;
DROP POLICY IF EXISTS policy_exr_options_auth_update ON exception_report_options;

CREATE POLICY policy_exr_options_auth_select ON exception_report_options
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM exception_reports er
            WHERE er.id = exception_report_options.exception_report_id
              AND er.is_deleted = FALSE
              AND (
                  EXISTS (
                      SELECT 1 FROM project_memberships pm
                      WHERE pm.project_id = er.project_id
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
              )
        )
    );

CREATE POLICY policy_exr_options_auth_insert ON exception_report_options
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM exception_reports er
            WHERE er.id = exception_report_options.exception_report_id
              AND er.is_deleted = FALSE
              AND (
                  er.created_by = auth.uid() OR er.author_id = auth.uid()
                  OR
                  EXISTS (
                      SELECT 1 FROM user_roles ur
                      JOIN roles r ON r.id = ur.role_id
                      WHERE ur.user_id = auth.uid()
                        AND r.role_name = 'pmo_admin'
                  )
              )
              AND er.report_status IN ('draft', 'rejected')
        )
    );

CREATE POLICY policy_exr_options_auth_update ON exception_report_options
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM exception_reports er
            WHERE er.id = exception_report_options.exception_report_id
              AND er.is_deleted = FALSE
              AND (
                  er.created_by = auth.uid() OR er.author_id = auth.uid()
                  OR
                  EXISTS (
                      SELECT 1 FROM user_roles ur
                      JOIN roles r ON r.id = ur.role_id
                      WHERE ur.user_id = auth.uid()
                        AND r.role_name = 'pmo_admin'
                  )
              )
              AND er.report_status IN ('draft', 'rejected')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM exception_reports er
            WHERE er.id = exception_report_options.exception_report_id
              AND er.is_deleted = FALSE
              AND (
                  er.created_by = auth.uid() OR er.author_id = auth.uid()
                  OR
                  EXISTS (
                      SELECT 1 FROM user_roles ur
                      JOIN roles r ON r.id = ur.role_id
                      WHERE ur.user_id = auth.uid()
                        AND r.role_name = 'pmo_admin'
                  )
              )
              AND er.report_status IN ('draft', 'rejected')
        )
    );

-- ================================================
-- RLS POLICIES: exception_report_lessons
-- ================================================

DROP POLICY IF EXISTS policy_exr_lessons_auth_select ON exception_report_lessons;
DROP POLICY IF EXISTS policy_exr_lessons_auth_insert ON exception_report_lessons;
DROP POLICY IF EXISTS policy_exr_lessons_auth_update ON exception_report_lessons;

CREATE POLICY policy_exr_lessons_auth_select ON exception_report_lessons
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM exception_reports er
            WHERE er.id = exception_report_lessons.exception_report_id
              AND er.is_deleted = FALSE
              AND (
                  EXISTS (
                      SELECT 1 FROM project_memberships pm
                      WHERE pm.project_id = er.project_id
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
              )
        )
    );

CREATE POLICY policy_exr_lessons_auth_insert ON exception_report_lessons
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM exception_reports er
            WHERE er.id = exception_report_lessons.exception_report_id
              AND er.is_deleted = FALSE
              AND (
                  er.created_by = auth.uid() OR er.author_id = auth.uid()
                  OR
                  EXISTS (
                      SELECT 1 FROM user_roles ur
                      JOIN roles r ON r.id = ur.role_id
                      WHERE ur.user_id = auth.uid()
                        AND r.role_name = 'pmo_admin'
                  )
              )
              AND er.report_status IN ('draft', 'rejected')
        )
    );

CREATE POLICY policy_exr_lessons_auth_update ON exception_report_lessons
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM exception_reports er
            WHERE er.id = exception_report_lessons.exception_report_id
              AND er.is_deleted = FALSE
              AND (
                  er.created_by = auth.uid() OR er.author_id = auth.uid()
                  OR
                  EXISTS (
                      SELECT 1 FROM user_roles ur
                      JOIN roles r ON r.id = ur.role_id
                      WHERE ur.user_id = auth.uid()
                        AND r.role_name = 'pmo_admin'
                  )
              )
              AND er.report_status IN ('draft', 'rejected')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM exception_reports er
            WHERE er.id = exception_report_lessons.exception_report_id
              AND er.is_deleted = FALSE
              AND (
                  er.created_by = auth.uid() OR er.author_id = auth.uid()
                  OR
                  EXISTS (
                      SELECT 1 FROM user_roles ur
                      JOIN roles r ON r.id = ur.role_id
                      WHERE ur.user_id = auth.uid()
                        AND r.role_name = 'pmo_admin'
                  )
              )
              AND er.report_status IN ('draft', 'rejected')
        )
    );

-- ================================================
-- RLS POLICIES: exception_report_quality_checks
-- ================================================

DROP POLICY IF EXISTS policy_exr_quality_checks_auth_select ON exception_report_quality_checks;
DROP POLICY IF EXISTS policy_exr_quality_checks_auth_insert ON exception_report_quality_checks;
DROP POLICY IF EXISTS policy_exr_quality_checks_auth_update ON exception_report_quality_checks;

CREATE POLICY policy_exr_quality_checks_auth_select ON exception_report_quality_checks
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM exception_reports er
            WHERE er.id = exception_report_quality_checks.exception_report_id
              AND er.is_deleted = FALSE
              AND (
                  EXISTS (
                      SELECT 1 FROM project_memberships pm
                      WHERE pm.project_id = er.project_id
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
              )
        )
    );

CREATE POLICY policy_exr_quality_checks_auth_insert ON exception_report_quality_checks
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM exception_reports er
            WHERE er.id = exception_report_quality_checks.exception_report_id
              AND er.is_deleted = FALSE
              AND (
                  er.created_by = auth.uid() OR er.author_id = auth.uid()
                  OR
                  EXISTS (
                      SELECT 1 FROM user_roles ur
                      JOIN roles r ON r.id = ur.role_id
                      WHERE ur.user_id = auth.uid()
                        AND r.role_name = 'pmo_admin'
                  )
              )
        )
    );

CREATE POLICY policy_exr_quality_checks_auth_update ON exception_report_quality_checks
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM exception_reports er
            WHERE er.id = exception_report_quality_checks.exception_report_id
              AND er.is_deleted = FALSE
              AND (
                  er.created_by = auth.uid() OR er.author_id = auth.uid()
                  OR
                  EXISTS (
                      SELECT 1 FROM user_roles ur
                      JOIN roles r ON r.id = ur.role_id
                      WHERE ur.user_id = auth.uid()
                        AND r.role_name = 'pmo_admin'
                  )
              )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM exception_reports er
            WHERE er.id = exception_report_quality_checks.exception_report_id
              AND er.is_deleted = FALSE
              AND (
                  er.created_by = auth.uid() OR er.author_id = auth.uid()
                  OR
                  EXISTS (
                      SELECT 1 FROM user_roles ur
                      JOIN roles r ON r.id = ur.role_id
                      WHERE ur.user_id = auth.uid()
                        AND r.role_name = 'pmo_admin'
                  )
              )
        )
    );

-- ================================================
-- END OF SCRIPT
-- ================================================
