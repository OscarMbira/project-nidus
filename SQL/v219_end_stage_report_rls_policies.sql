-- ================================================
-- End Stage Report RLS Policies
-- SQL Version: v219
-- Date: 2026-01-20
-- Related: v218_end_stage_report_enhancement.sql
-- ================================================

-- ================================================
-- GRANT PERMISSIONS
-- ================================================

-- Grant permissions on enhanced end_stage_reports table
GRANT SELECT, INSERT, UPDATE ON end_stage_reports TO authenticated;

-- Grant permissions on all supporting tables
GRANT SELECT, INSERT, UPDATE ON end_stage_report_revision_history TO authenticated;
GRANT SELECT, INSERT, UPDATE ON end_stage_report_product_status TO authenticated;
GRANT SELECT, INSERT, UPDATE ON end_stage_report_risk_review TO authenticated;
GRANT SELECT, INSERT, UPDATE ON end_stage_report_issue_review TO authenticated;
GRANT SELECT, INSERT, UPDATE ON end_stage_report_follow_on_actions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON end_stage_report_approvals TO authenticated;
GRANT SELECT, INSERT, UPDATE ON end_stage_report_distribution TO authenticated;

-- ================================================
-- ENABLE ROW LEVEL SECURITY
-- ================================================

ALTER TABLE end_stage_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE end_stage_report_revision_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE end_stage_report_product_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE end_stage_report_risk_review ENABLE ROW LEVEL SECURITY;
ALTER TABLE end_stage_report_issue_review ENABLE ROW LEVEL SECURITY;
ALTER TABLE end_stage_report_follow_on_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE end_stage_report_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE end_stage_report_distribution ENABLE ROW LEVEL SECURITY;

-- ================================================
-- RLS POLICIES: end_stage_reports
-- ================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS policy_end_stage_reports_auth_select ON end_stage_reports;
DROP POLICY IF EXISTS policy_end_stage_reports_auth_insert ON end_stage_reports;
DROP POLICY IF EXISTS policy_end_stage_reports_auth_update ON end_stage_reports;

-- Select: Users can view reports for projects they're members of
CREATE POLICY policy_end_stage_reports_auth_select ON end_stage_reports
    FOR SELECT
    TO authenticated
    USING (
        is_deleted = FALSE AND (
            -- Project members can view
            EXISTS (
                SELECT 1 FROM project_memberships pm
                WHERE pm.project_id = end_stage_reports.project_id
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
        )
    );

-- Insert: Project Managers and PMO Admins can create
CREATE POLICY policy_end_stage_reports_auth_insert ON end_stage_reports
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Project Managers can create for their projects
        EXISTS (
            SELECT 1 FROM project_memberships pm
            JOIN user_roles ur ON ur.user_id = pm.user_id
            JOIN roles r ON r.id = ur.role_id
            WHERE pm.project_id = end_stage_reports.project_id
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

-- Update: Authors, PMO Admins, or approvers can update (if not approved)
CREATE POLICY policy_end_stage_reports_auth_update ON end_stage_reports
    FOR UPDATE
    TO authenticated
    USING (
        is_deleted = FALSE AND (
            -- Authors can edit draft/submitted reports
            (created_by = auth.uid() OR prepared_by = auth.uid()) 
            AND approval_workflow_status IN ('draft', 'submitted', 'rejected')
            OR
            -- PMO Admins can edit any report
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON r.id = ur.role_id
                WHERE ur.user_id = auth.uid()
                  AND r.role_name = 'pmo_admin'
            )
            OR
            -- Approvers can update approval status
            EXISTS (
                SELECT 1 FROM end_stage_report_approvals esa
                WHERE esa.end_stage_report_id = end_stage_reports.id
                  AND esa.approver_id = auth.uid()
            )
        )
    )
    WITH CHECK (
        -- Same conditions for WITH CHECK
        is_deleted = FALSE AND (
            (created_by = auth.uid() OR prepared_by = auth.uid()) 
            AND approval_workflow_status IN ('draft', 'submitted', 'rejected')
            OR
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON r.id = ur.role_id
                WHERE ur.user_id = auth.uid()
                  AND r.role_name = 'pmo_admin'
            )
            OR
            EXISTS (
                SELECT 1 FROM end_stage_report_approvals esa
                WHERE esa.end_stage_report_id = end_stage_reports.id
                  AND esa.approver_id = auth.uid()
            )
        )
    );

-- ================================================
-- RLS POLICIES: end_stage_report_revision_history
-- ================================================

DROP POLICY IF EXISTS policy_esr_revision_history_auth_select ON end_stage_report_revision_history;
DROP POLICY IF EXISTS policy_esr_revision_history_auth_insert ON end_stage_report_revision_history;

CREATE POLICY policy_esr_revision_history_auth_select ON end_stage_report_revision_history
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM end_stage_reports esr
            WHERE esr.id = end_stage_report_revision_history.end_stage_report_id
              AND esr.is_deleted = FALSE
              AND (
                  EXISTS (
                      SELECT 1 FROM project_memberships pm
                      WHERE pm.project_id = esr.project_id
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

CREATE POLICY policy_esr_revision_history_auth_insert ON end_stage_report_revision_history
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM end_stage_reports esr
            WHERE esr.id = end_stage_report_revision_history.end_stage_report_id
              AND esr.is_deleted = FALSE
              AND (
                  esr.created_by = auth.uid() OR esr.prepared_by = auth.uid()
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
-- RLS POLICIES: end_stage_report_product_status
-- ================================================

DROP POLICY IF EXISTS policy_esr_product_status_auth_select ON end_stage_report_product_status;
DROP POLICY IF EXISTS policy_esr_product_status_auth_insert ON end_stage_report_product_status;
DROP POLICY IF EXISTS policy_esr_product_status_auth_update ON end_stage_report_product_status;

CREATE POLICY policy_esr_product_status_auth_select ON end_stage_report_product_status
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM end_stage_reports esr
            WHERE esr.id = end_stage_report_product_status.end_stage_report_id
              AND esr.is_deleted = FALSE
              AND (
                  EXISTS (
                      SELECT 1 FROM project_memberships pm
                      WHERE pm.project_id = esr.project_id
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

CREATE POLICY policy_esr_product_status_auth_insert ON end_stage_report_product_status
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM end_stage_reports esr
            WHERE esr.id = end_stage_report_product_status.end_stage_report_id
              AND esr.is_deleted = FALSE
              AND (
                  esr.created_by = auth.uid() OR esr.prepared_by = auth.uid()
                  OR
                  EXISTS (
                      SELECT 1 FROM user_roles ur
                      JOIN roles r ON r.id = ur.role_id
                      WHERE ur.user_id = auth.uid()
                        AND r.role_name = 'pmo_admin'
                  )
              )
              AND esr.approval_workflow_status IN ('draft', 'submitted', 'rejected')
        )
    );

CREATE POLICY policy_esr_product_status_auth_update ON end_stage_report_product_status
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM end_stage_reports esr
            WHERE esr.id = end_stage_report_product_status.end_stage_report_id
              AND esr.is_deleted = FALSE
              AND (
                  esr.created_by = auth.uid() OR esr.prepared_by = auth.uid()
                  OR
                  EXISTS (
                      SELECT 1 FROM user_roles ur
                      JOIN roles r ON r.id = ur.role_id
                      WHERE ur.user_id = auth.uid()
                        AND r.role_name = 'pmo_admin'
                  )
              )
              AND esr.approval_workflow_status IN ('draft', 'submitted', 'rejected')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM end_stage_reports esr
            WHERE esr.id = end_stage_report_product_status.end_stage_report_id
              AND esr.is_deleted = FALSE
              AND (
                  esr.created_by = auth.uid() OR esr.prepared_by = auth.uid()
                  OR
                  EXISTS (
                      SELECT 1 FROM user_roles ur
                      JOIN roles r ON r.id = ur.role_id
                      WHERE ur.user_id = auth.uid()
                        AND r.role_name = 'pmo_admin'
                  )
              )
              AND esr.approval_workflow_status IN ('draft', 'submitted', 'rejected')
        )
    );

-- ================================================
-- RLS POLICIES: end_stage_report_risk_review
-- ================================================

DROP POLICY IF EXISTS policy_esr_risk_review_auth_select ON end_stage_report_risk_review;
DROP POLICY IF EXISTS policy_esr_risk_review_auth_insert ON end_stage_report_risk_review;
DROP POLICY IF EXISTS policy_esr_risk_review_auth_update ON end_stage_report_risk_review;

CREATE POLICY policy_esr_risk_review_auth_select ON end_stage_report_risk_review
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM end_stage_reports esr
            WHERE esr.id = end_stage_report_risk_review.end_stage_report_id
              AND esr.is_deleted = FALSE
              AND (
                  EXISTS (
                      SELECT 1 FROM project_memberships pm
                      WHERE pm.project_id = esr.project_id
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

CREATE POLICY policy_esr_risk_review_auth_insert ON end_stage_report_risk_review
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM end_stage_reports esr
            WHERE esr.id = end_stage_report_risk_review.end_stage_report_id
              AND esr.is_deleted = FALSE
              AND (
                  esr.created_by = auth.uid() OR esr.prepared_by = auth.uid()
                  OR
                  EXISTS (
                      SELECT 1 FROM user_roles ur
                      JOIN roles r ON r.id = ur.role_id
                      WHERE ur.user_id = auth.uid()
                        AND r.role_name = 'pmo_admin'
                  )
              )
              AND esr.approval_workflow_status IN ('draft', 'submitted', 'rejected')
        )
    );

CREATE POLICY policy_esr_risk_review_auth_update ON end_stage_report_risk_review
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM end_stage_reports esr
            WHERE esr.id = end_stage_report_risk_review.end_stage_report_id
              AND esr.is_deleted = FALSE
              AND (
                  esr.created_by = auth.uid() OR esr.prepared_by = auth.uid()
                  OR
                  EXISTS (
                      SELECT 1 FROM user_roles ur
                      JOIN roles r ON r.id = ur.role_id
                      WHERE ur.user_id = auth.uid()
                        AND r.role_name = 'pmo_admin'
                  )
              )
              AND esr.approval_workflow_status IN ('draft', 'submitted', 'rejected')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM end_stage_reports esr
            WHERE esr.id = end_stage_report_risk_review.end_stage_report_id
              AND esr.is_deleted = FALSE
              AND (
                  esr.created_by = auth.uid() OR esr.prepared_by = auth.uid()
                  OR
                  EXISTS (
                      SELECT 1 FROM user_roles ur
                      JOIN roles r ON r.id = ur.role_id
                      WHERE ur.user_id = auth.uid()
                        AND r.role_name = 'pmo_admin'
                  )
              )
              AND esr.approval_workflow_status IN ('draft', 'submitted', 'rejected')
        )
    );

-- ================================================
-- RLS POLICIES: end_stage_report_issue_review
-- ================================================

DROP POLICY IF EXISTS policy_esr_issue_review_auth_select ON end_stage_report_issue_review;
DROP POLICY IF EXISTS policy_esr_issue_review_auth_insert ON end_stage_report_issue_review;
DROP POLICY IF EXISTS policy_esr_issue_review_auth_update ON end_stage_report_issue_review;

CREATE POLICY policy_esr_issue_review_auth_select ON end_stage_report_issue_review
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM end_stage_reports esr
            WHERE esr.id = end_stage_report_issue_review.end_stage_report_id
              AND esr.is_deleted = FALSE
              AND (
                  EXISTS (
                      SELECT 1 FROM project_memberships pm
                      WHERE pm.project_id = esr.project_id
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

CREATE POLICY policy_esr_issue_review_auth_insert ON end_stage_report_issue_review
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM end_stage_reports esr
            WHERE esr.id = end_stage_report_issue_review.end_stage_report_id
              AND esr.is_deleted = FALSE
              AND (
                  esr.created_by = auth.uid() OR esr.prepared_by = auth.uid()
                  OR
                  EXISTS (
                      SELECT 1 FROM user_roles ur
                      JOIN roles r ON r.id = ur.role_id
                      WHERE ur.user_id = auth.uid()
                        AND r.role_name = 'pmo_admin'
                  )
              )
              AND esr.approval_workflow_status IN ('draft', 'submitted', 'rejected')
        )
    );

CREATE POLICY policy_esr_issue_review_auth_update ON end_stage_report_issue_review
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM end_stage_reports esr
            WHERE esr.id = end_stage_report_issue_review.end_stage_report_id
              AND esr.is_deleted = FALSE
              AND (
                  esr.created_by = auth.uid() OR esr.prepared_by = auth.uid()
                  OR
                  EXISTS (
                      SELECT 1 FROM user_roles ur
                      JOIN roles r ON r.id = ur.role_id
                      WHERE ur.user_id = auth.uid()
                        AND r.role_name = 'pmo_admin'
                  )
              )
              AND esr.approval_workflow_status IN ('draft', 'submitted', 'rejected')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM end_stage_reports esr
            WHERE esr.id = end_stage_report_issue_review.end_stage_report_id
              AND esr.is_deleted = FALSE
              AND (
                  esr.created_by = auth.uid() OR esr.prepared_by = auth.uid()
                  OR
                  EXISTS (
                      SELECT 1 FROM user_roles ur
                      JOIN roles r ON r.id = ur.role_id
                      WHERE ur.user_id = auth.uid()
                        AND r.role_name = 'pmo_admin'
                  )
              )
              AND esr.approval_workflow_status IN ('draft', 'submitted', 'rejected')
        )
    );

-- ================================================
-- RLS POLICIES: end_stage_report_follow_on_actions
-- ================================================

DROP POLICY IF EXISTS policy_esr_follow_on_actions_auth_select ON end_stage_report_follow_on_actions;
DROP POLICY IF EXISTS policy_esr_follow_on_actions_auth_insert ON end_stage_report_follow_on_actions;
DROP POLICY IF EXISTS policy_esr_follow_on_actions_auth_update ON end_stage_report_follow_on_actions;

CREATE POLICY policy_esr_follow_on_actions_auth_select ON end_stage_report_follow_on_actions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM end_stage_reports esr
            WHERE esr.id = end_stage_report_follow_on_actions.end_stage_report_id
              AND esr.is_deleted = FALSE
              AND (
                  EXISTS (
                      SELECT 1 FROM project_memberships pm
                      WHERE pm.project_id = esr.project_id
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
                  -- Assigned users can view their actions
                  assigned_to = auth.uid()
              )
        )
    );

CREATE POLICY policy_esr_follow_on_actions_auth_insert ON end_stage_report_follow_on_actions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM end_stage_reports esr
            WHERE esr.id = end_stage_report_follow_on_actions.end_stage_report_id
              AND esr.is_deleted = FALSE
              AND (
                  esr.created_by = auth.uid() OR esr.prepared_by = auth.uid()
                  OR
                  EXISTS (
                      SELECT 1 FROM user_roles ur
                      JOIN roles r ON r.id = ur.role_id
                      WHERE ur.user_id = auth.uid()
                        AND r.role_name = 'pmo_admin'
                  )
              )
              AND esr.approval_workflow_status IN ('draft', 'submitted', 'rejected')
        )
    );

CREATE POLICY policy_esr_follow_on_actions_auth_update ON end_stage_report_follow_on_actions
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM end_stage_reports esr
            WHERE esr.id = end_stage_report_follow_on_actions.end_stage_report_id
              AND esr.is_deleted = FALSE
              AND (
                  esr.created_by = auth.uid() OR esr.prepared_by = auth.uid()
                  OR
                  EXISTS (
                      SELECT 1 FROM user_roles ur
                      JOIN roles r ON r.id = ur.role_id
                      WHERE ur.user_id = auth.uid()
                        AND r.role_name = 'pmo_admin'
                  )
                  OR
                  -- Assigned users can update their actions
                  assigned_to = auth.uid()
              )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM end_stage_reports esr
            WHERE esr.id = end_stage_report_follow_on_actions.end_stage_report_id
              AND esr.is_deleted = FALSE
              AND (
                  esr.created_by = auth.uid() OR esr.prepared_by = auth.uid()
                  OR
                  EXISTS (
                      SELECT 1 FROM user_roles ur
                      JOIN roles r ON r.id = ur.role_id
                      WHERE ur.user_id = auth.uid()
                        AND r.role_name = 'pmo_admin'
                  )
                  OR
                  assigned_to = auth.uid()
              )
        )
    );

-- ================================================
-- RLS POLICIES: end_stage_report_approvals
-- ================================================

DROP POLICY IF EXISTS policy_esr_approvals_auth_select ON end_stage_report_approvals;
DROP POLICY IF EXISTS policy_esr_approvals_auth_insert ON end_stage_report_approvals;
DROP POLICY IF EXISTS policy_esr_approvals_auth_update ON end_stage_report_approvals;

CREATE POLICY policy_esr_approvals_auth_select ON end_stage_report_approvals
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM end_stage_reports esr
            WHERE esr.id = end_stage_report_approvals.end_stage_report_id
              AND esr.is_deleted = FALSE
              AND (
                  EXISTS (
                      SELECT 1 FROM project_memberships pm
                      WHERE pm.project_id = esr.project_id
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

CREATE POLICY policy_esr_approvals_auth_insert ON end_stage_report_approvals
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM end_stage_reports esr
            WHERE esr.id = end_stage_report_approvals.end_stage_report_id
              AND esr.is_deleted = FALSE
              AND (
                  esr.created_by = auth.uid() OR esr.prepared_by = auth.uid()
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

CREATE POLICY policy_esr_approvals_auth_update ON end_stage_report_approvals
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM end_stage_reports esr
            WHERE esr.id = end_stage_report_approvals.end_stage_report_id
              AND esr.is_deleted = FALSE
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
            SELECT 1 FROM end_stage_reports esr
            WHERE esr.id = end_stage_report_approvals.end_stage_report_id
              AND esr.is_deleted = FALSE
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
-- RLS POLICIES: end_stage_report_distribution
-- ================================================

DROP POLICY IF EXISTS policy_esr_distribution_auth_select ON end_stage_report_distribution;
DROP POLICY IF EXISTS policy_esr_distribution_auth_insert ON end_stage_report_distribution;
DROP POLICY IF EXISTS policy_esr_distribution_auth_update ON end_stage_report_distribution;

CREATE POLICY policy_esr_distribution_auth_select ON end_stage_report_distribution
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM end_stage_reports esr
            WHERE esr.id = end_stage_report_distribution.end_stage_report_id
              AND esr.is_deleted = FALSE
              AND (
                  EXISTS (
                      SELECT 1 FROM project_memberships pm
                      WHERE pm.project_id = esr.project_id
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

CREATE POLICY policy_esr_distribution_auth_insert ON end_stage_report_distribution
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM end_stage_reports esr
            WHERE esr.id = end_stage_report_distribution.end_stage_report_id
              AND esr.is_deleted = FALSE
              AND (
                  esr.created_by = auth.uid() OR esr.prepared_by = auth.uid()
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

CREATE POLICY policy_esr_distribution_auth_update ON end_stage_report_distribution
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM end_stage_reports esr
            WHERE esr.id = end_stage_report_distribution.end_stage_report_id
              AND esr.is_deleted = FALSE
              AND (
                  esr.created_by = auth.uid() OR esr.prepared_by = auth.uid()
                  OR
                  EXISTS (
                      SELECT 1 FROM user_roles ur
                      JOIN roles r ON r.id = ur.role_id
                      WHERE ur.user_id = auth.uid()
                        AND r.role_name = 'pmo_admin'
                  )
                  OR
                  -- Recipients can update their acknowledgment status (only when not yet acknowledged)
                  (recipient_id = auth.uid() AND distribution_status != 'acknowledged')
              )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM end_stage_reports esr
            WHERE esr.id = end_stage_report_distribution.end_stage_report_id
              AND esr.is_deleted = FALSE
              AND (
                  esr.created_by = auth.uid() OR esr.prepared_by = auth.uid()
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
-- END OF SCRIPT
-- ================================================
