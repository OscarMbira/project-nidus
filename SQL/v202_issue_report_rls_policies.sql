-- ============================================================================
-- Issue Report RLS Policies
-- Version: v202
-- Description: Row Level Security policies for Issue Report module
-- Date: 2026-01-16
-- ============================================================================
--
-- Purpose:
-- Implements Row Level Security (RLS) for all Issue Report tables to ensure
-- users can only access reports for projects they're members of
-- or have appropriate permissions for.
--
-- Prerequisites:
-- - v201_issue_report_tables.sql must be run first
-- - All tables must exist
--
-- ============================================================================
-- SECTION 1: GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON issue_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE ON issue_report_options TO authenticated;
GRANT SELECT, INSERT, UPDATE ON issue_report_revision_history TO authenticated;
GRANT SELECT, INSERT, UPDATE ON issue_report_approvals TO authenticated;
GRANT SELECT, INSERT, UPDATE ON issue_report_distribution TO authenticated;

-- ============================================================================
-- SECTION 2: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE issue_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_report_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_report_revision_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_report_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_report_distribution ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 3: ISSUE_REPORTS RLS POLICIES
-- ============================================================================

-- Policy 1: Users can view issue reports for projects they're members of
DROP POLICY IF EXISTS policy_issue_reports_auth_select ON issue_reports;
CREATE POLICY policy_issue_reports_auth_select
    ON issue_reports FOR SELECT
    TO authenticated
    USING (
        is_deleted = FALSE
        AND (
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.project_id = issue_reports.project_id
                  AND up.is_deleted = FALSE
            )
            OR EXISTS (
                SELECT 1
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN users u ON ur.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name IN ('pmo_admin', 'System Admin')
                  AND ur.is_active = TRUE
                  AND ur.is_deleted = FALSE
            )
            -- Distribution recipients can view reports distributed to them
            OR EXISTS (
                SELECT 1 FROM issue_report_distribution ird
                JOIN users u ON (ird.recipient_id = u.id OR (ird.recipient_id IS NULL AND ird.recipient_email = (SELECT email FROM auth.users WHERE id = auth.uid())))
                WHERE ird.issue_report_id = issue_reports.id
                  AND u.auth_user_id = auth.uid()
                  AND ird.is_deleted = FALSE
            )
        )
    );

-- Policy 2: Project Managers and PMO Admins can create issue reports
DROP POLICY IF EXISTS policy_issue_reports_auth_insert ON issue_reports;
CREATE POLICY policy_issue_reports_auth_insert
    ON issue_reports FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND (
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.project_id = issue_reports.project_id
                  AND up.access_level IN ('owner', 'admin')
                  AND up.is_deleted = FALSE
            )
            OR EXISTS (
                SELECT 1
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN users u ON ur.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name IN ('pmo_admin', 'System Admin')
                  AND ur.is_active = TRUE
                  AND ur.is_deleted = FALSE
            )
        )
    );

-- Policy 3: Authors and PMO Admins can edit reports in 'draft' or 'submitted' status
-- Approved/distributed reports are read-only (except PMO Admins with override)
DROP POLICY IF EXISTS policy_issue_reports_auth_update ON issue_reports;
CREATE POLICY policy_issue_reports_auth_update
    ON issue_reports FOR UPDATE
    TO authenticated
    USING (
        is_deleted = FALSE
        AND (
            -- PMO Admins can always edit
            EXISTS (
                SELECT 1
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN users u ON ur.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name IN ('pmo_admin', 'System Admin')
                  AND ur.is_active = TRUE
                  AND ur.is_deleted = FALSE
            )
            OR (
                -- Authors can edit draft or submitted reports
                (report_status IN ('draft', 'submitted'))
                AND (
                    author_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                    OR prepared_by_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                    OR created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                )
                AND EXISTS (
                    SELECT 1 FROM user_projects up
                    JOIN users u ON up.user_id = u.id
                    WHERE u.auth_user_id = auth.uid()
                      AND up.project_id = issue_reports.project_id
                      AND up.access_level IN ('owner', 'admin')
                      AND up.is_deleted = FALSE
                )
            )
        )
    );

-- ============================================================================
-- SECTION 4: ISSUE_REPORT_OPTIONS RLS POLICIES
-- ============================================================================

-- Policy 1: Users can view options for reports they can view
DROP POLICY IF EXISTS policy_issue_report_options_auth_select ON issue_report_options;
CREATE POLICY policy_issue_report_options_auth_select
    ON issue_report_options FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM issue_reports ir
            WHERE ir.id = issue_report_options.issue_report_id
              AND ir.is_deleted = FALSE
              AND (
                  EXISTS (
                      SELECT 1 FROM user_projects up
                      JOIN users u ON up.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND up.project_id = ir.project_id
                        AND up.is_deleted = FALSE
                  )
                  OR EXISTS (
                      SELECT 1
                      FROM user_roles ur
                      JOIN roles r ON ur.role_id = r.id
                      JOIN users u ON ur.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND r.role_name IN ('pmo_admin', 'System Admin')
                        AND ur.is_active = TRUE
                        AND ur.is_deleted = FALSE
                  )
              )
        )
    );

-- Policy 2: Can insert if can edit the parent report
DROP POLICY IF EXISTS policy_issue_report_options_auth_insert ON issue_report_options;
CREATE POLICY policy_issue_report_options_auth_insert
    ON issue_report_options FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND EXISTS (
            SELECT 1 FROM issue_reports ir
            WHERE ir.id = issue_report_options.issue_report_id
              AND ir.is_deleted = FALSE
              AND (
                  EXISTS (
                      SELECT 1
                      FROM user_roles ur
                      JOIN roles r ON ur.role_id = r.id
                      JOIN users u ON ur.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND r.role_name IN ('pmo_admin', 'System Admin')
                        AND ur.is_active = TRUE
                        AND ur.is_deleted = FALSE
                  )
                  OR (
                      ir.report_status IN ('draft', 'submitted')
                      AND (
                          ir.author_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                          OR ir.prepared_by_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                          OR ir.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                      )
                      AND EXISTS (
                          SELECT 1 FROM user_projects up
                          JOIN users u ON up.user_id = u.id
                          WHERE u.auth_user_id = auth.uid()
                            AND up.project_id = ir.project_id
                            AND up.access_level IN ('owner', 'admin')
                            AND up.is_deleted = FALSE
                      )
                  )
              )
        )
    );

-- Policy 3: Can update if can edit the parent report
DROP POLICY IF EXISTS policy_issue_report_options_auth_update ON issue_report_options;
CREATE POLICY policy_issue_report_options_auth_update
    ON issue_report_options FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM issue_reports ir
            WHERE ir.id = issue_report_options.issue_report_id
              AND ir.is_deleted = FALSE
              AND (
                  EXISTS (
                      SELECT 1
                      FROM user_roles ur
                      JOIN roles r ON ur.role_id = r.id
                      JOIN users u ON ur.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND r.role_name IN ('pmo_admin', 'System Admin')
                        AND ur.is_active = TRUE
                        AND ur.is_deleted = FALSE
                  )
                  OR (
                      ir.report_status IN ('draft', 'submitted')
                      AND (
                          ir.author_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                          OR ir.prepared_by_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                          OR ir.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                      )
                      AND EXISTS (
                          SELECT 1 FROM user_projects up
                          JOIN users u ON up.user_id = u.id
                          WHERE u.auth_user_id = auth.uid()
                            AND up.project_id = ir.project_id
                            AND up.access_level IN ('owner', 'admin')
                            AND up.is_deleted = FALSE
                      )
                  )
              )
        )
    );

-- Policy 4: Can delete if can edit the parent report
DROP POLICY IF EXISTS policy_issue_report_options_auth_delete ON issue_report_options;
CREATE POLICY policy_issue_report_options_auth_delete
    ON issue_report_options FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM issue_reports ir
            WHERE ir.id = issue_report_options.issue_report_id
              AND ir.is_deleted = FALSE
              AND (
                  EXISTS (
                      SELECT 1
                      FROM user_roles ur
                      JOIN roles r ON ur.role_id = r.id
                      JOIN users u ON ur.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND r.role_name IN ('pmo_admin', 'System Admin')
                        AND ur.is_active = TRUE
                        AND ur.is_deleted = FALSE
                  )
                  OR (
                      ir.report_status IN ('draft', 'submitted')
                      AND (
                          ir.author_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                          OR ir.prepared_by_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                          OR ir.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                      )
                      AND EXISTS (
                          SELECT 1 FROM user_projects up
                          JOIN users u ON up.user_id = u.id
                          WHERE u.auth_user_id = auth.uid()
                            AND up.project_id = ir.project_id
                            AND up.access_level IN ('owner', 'admin')
                            AND up.is_deleted = FALSE
                      )
                  )
              )
        )
    );

-- ============================================================================
-- SECTION 5: ISSUE_REPORT_REVISION_HISTORY RLS POLICIES
-- ============================================================================

-- Revision history is read-only (immutable audit trail)
-- Users can view revision history if they can view the report
DROP POLICY IF EXISTS policy_issue_report_revision_history_auth_select ON issue_report_revision_history;
CREATE POLICY policy_issue_report_revision_history_auth_select
    ON issue_report_revision_history FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM issue_reports ir
            WHERE ir.id = issue_report_revision_history.issue_report_id
              AND ir.is_deleted = FALSE
              AND (
                  EXISTS (
                      SELECT 1 FROM user_projects up
                      JOIN users u ON up.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND up.project_id = ir.project_id
                        AND up.is_deleted = FALSE
                  )
                  OR EXISTS (
                      SELECT 1
                      FROM user_roles ur
                      JOIN roles r ON ur.role_id = r.id
                      JOIN users u ON ur.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND r.role_name IN ('pmo_admin', 'System Admin')
                        AND ur.is_active = TRUE
                        AND ur.is_deleted = FALSE
                  )
              )
        )
    );

-- Only system/triggers can insert (immutable audit trail)
-- For now, allow inserts if user can edit the report (revisions created via application logic)
DROP POLICY IF EXISTS policy_issue_report_revision_history_auth_insert ON issue_report_revision_history;
CREATE POLICY policy_issue_report_revision_history_auth_insert
    ON issue_report_revision_history FOR INSERT
    TO authenticated
    WITH CHECK (
        revised_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND EXISTS (
            SELECT 1 FROM issue_reports ir
            WHERE ir.id = issue_report_revision_history.issue_report_id
              AND ir.is_deleted = FALSE
              AND (
                  EXISTS (
                      SELECT 1
                      FROM user_roles ur
                      JOIN roles r ON ur.role_id = r.id
                      JOIN users u ON ur.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND r.role_name IN ('pmo_admin', 'System Admin')
                        AND ur.is_active = TRUE
                        AND ur.is_deleted = FALSE
                  )
                  OR (
                      (
                          ir.author_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                          OR ir.prepared_by_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                          OR ir.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                      )
                      AND EXISTS (
                          SELECT 1 FROM user_projects up
                          JOIN users u ON up.user_id = u.id
                          WHERE u.auth_user_id = auth.uid()
                            AND up.project_id = ir.project_id
                            AND up.access_level IN ('owner', 'admin')
                            AND up.is_deleted = FALSE
                      )
                  )
              )
        )
    );

-- ============================================================================
-- SECTION 6: ISSUE_REPORT_APPROVALS RLS POLICIES
-- ============================================================================

-- Policy 1: Users can view approvals for reports they can view
DROP POLICY IF EXISTS policy_issue_report_approvals_auth_select ON issue_report_approvals;
CREATE POLICY policy_issue_report_approvals_auth_select
    ON issue_report_approvals FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM issue_reports ir
            WHERE ir.id = issue_report_approvals.issue_report_id
              AND ir.is_deleted = FALSE
              AND (
                  EXISTS (
                      SELECT 1 FROM user_projects up
                      JOIN users u ON up.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND up.project_id = ir.project_id
                        AND up.is_deleted = FALSE
                  )
                  OR EXISTS (
                      SELECT 1
                      FROM user_roles ur
                      JOIN roles r ON ur.role_id = r.id
                      JOIN users u ON ur.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND r.role_name IN ('pmo_admin', 'System Admin')
                        AND ur.is_active = TRUE
                        AND ur.is_deleted = FALSE
                  )
              )
        )
    );

-- Policy 2: Can add approver if can edit the report
DROP POLICY IF EXISTS policy_issue_report_approvals_auth_insert ON issue_report_approvals;
CREATE POLICY policy_issue_report_approvals_auth_insert
    ON issue_report_approvals FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND EXISTS (
            SELECT 1 FROM issue_reports ir
            WHERE ir.id = issue_report_approvals.issue_report_id
              AND ir.is_deleted = FALSE
              AND (
                  EXISTS (
                      SELECT 1
                      FROM user_roles ur
                      JOIN roles r ON ur.role_id = r.id
                      JOIN users u ON ur.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND r.role_name IN ('pmo_admin', 'System Admin')
                        AND ur.is_active = TRUE
                        AND ur.is_deleted = FALSE
                  )
                  OR (
                      ir.report_status IN ('draft', 'submitted')
                      AND (
                          ir.author_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                          OR ir.prepared_by_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                          OR ir.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                      )
                      AND EXISTS (
                          SELECT 1 FROM user_projects up
                          JOIN users u ON up.user_id = u.id
                          WHERE u.auth_user_id = auth.uid()
                            AND up.project_id = ir.project_id
                            AND up.access_level IN ('owner', 'admin')
                            AND up.is_deleted = FALSE
                      )
                  )
              )
        )
    );

-- Policy 3: Approvers can update their own approvals, report authors/PMO Admins can update any
DROP POLICY IF EXISTS policy_issue_report_approvals_auth_update ON issue_report_approvals;
CREATE POLICY policy_issue_report_approvals_auth_update
    ON issue_report_approvals FOR UPDATE
    TO authenticated
    USING (
        -- Approver can update their own approval
        (
            approver_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        )
        OR EXISTS (
            -- PMO Admin can update any
            SELECT 1
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            JOIN users u ON ur.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name IN ('pmo_admin', 'System Admin')
              AND ur.is_active = TRUE
              AND ur.is_deleted = FALSE
        )
        OR EXISTS (
            -- Report author can update if report is not yet approved/distributed
            SELECT 1 FROM issue_reports ir
            WHERE ir.id = issue_report_approvals.issue_report_id
              AND ir.report_status IN ('draft', 'submitted', 'under_review')
              AND (
                  ir.author_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                  OR ir.prepared_by_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                  OR ir.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
              )
              AND EXISTS (
                  SELECT 1 FROM user_projects up
                  JOIN users u ON up.user_id = u.id
                  WHERE u.auth_user_id = auth.uid()
                    AND up.project_id = ir.project_id
                    AND up.access_level IN ('owner', 'admin')
                    AND up.is_deleted = FALSE
              )
        )
    );

-- ============================================================================
-- SECTION 7: ISSUE_REPORT_DISTRIBUTION RLS POLICIES
-- ============================================================================

-- Policy 1: Users can view distribution for reports they can view
-- Recipients can view their own distribution records
DROP POLICY IF EXISTS policy_issue_report_distribution_auth_select ON issue_report_distribution;
CREATE POLICY policy_issue_report_distribution_auth_select
    ON issue_report_distribution FOR SELECT
    TO authenticated
    USING (
        -- Recipient can view their own distribution record
        (
            recipient_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
            OR (
                recipient_id IS NULL
                AND recipient_email = (SELECT email FROM auth.users WHERE id = auth.uid())
            )
        )
        OR EXISTS (
            -- Or can view if can view the parent report
            SELECT 1 FROM issue_reports ir
            WHERE ir.id = issue_report_distribution.issue_report_id
              AND ir.is_deleted = FALSE
              AND (
                  EXISTS (
                      SELECT 1 FROM user_projects up
                      JOIN users u ON up.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND up.project_id = ir.project_id
                        AND up.is_deleted = FALSE
                  )
                  OR EXISTS (
                      SELECT 1
                      FROM user_roles ur
                      JOIN roles r ON ur.role_id = r.id
                      JOIN users u ON ur.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND r.role_name IN ('pmo_admin', 'System Admin')
                        AND ur.is_active = TRUE
                        AND ur.is_deleted = FALSE
                  )
              )
        )
    );

-- Policy 2: Can add distribution if can edit the report
DROP POLICY IF EXISTS policy_issue_report_distribution_auth_insert ON issue_report_distribution;
CREATE POLICY policy_issue_report_distribution_auth_insert
    ON issue_report_distribution FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND EXISTS (
            SELECT 1 FROM issue_reports ir
            WHERE ir.id = issue_report_distribution.issue_report_id
              AND ir.is_deleted = FALSE
              AND (
                  EXISTS (
                      SELECT 1
                      FROM user_roles ur
                      JOIN roles r ON ur.role_id = r.id
                      JOIN users u ON ur.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND r.role_name IN ('pmo_admin', 'System Admin')
                        AND ur.is_active = TRUE
                        AND ur.is_deleted = FALSE
                  )
                  OR (
                      (
                          ir.author_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                          OR ir.prepared_by_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                          OR ir.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                      )
                      AND EXISTS (
                          SELECT 1 FROM user_projects up
                          JOIN users u ON up.user_id = u.id
                          WHERE u.auth_user_id = auth.uid()
                            AND up.project_id = ir.project_id
                            AND up.access_level IN ('owner', 'admin')
                            AND up.is_deleted = FALSE
                      )
                  )
              )
        )
    );

-- Policy 3: Recipients can acknowledge/update read status, report authors/PMO Admins can update any
DROP POLICY IF EXISTS policy_issue_report_distribution_auth_update ON issue_report_distribution;
CREATE POLICY policy_issue_report_distribution_auth_update
    ON issue_report_distribution FOR UPDATE
    TO authenticated
    USING (
        -- Recipient can update their own distribution status (acknowledge, read)
        (
            recipient_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
            OR (
                recipient_id IS NULL
                AND recipient_email = (SELECT email FROM auth.users WHERE id = auth.uid())
            )
        )
        OR EXISTS (
            -- PMO Admin can update any
            SELECT 1
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            JOIN users u ON ur.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name IN ('pmo_admin', 'System Admin')
              AND ur.is_active = TRUE
              AND ur.is_deleted = FALSE
        )
        OR EXISTS (
            -- Report author can update if report is not yet distributed
            SELECT 1 FROM issue_reports ir
            WHERE ir.id = issue_report_distribution.issue_report_id
              AND ir.report_status IN ('draft', 'submitted', 'under_review', 'approved')
              AND (
                  ir.author_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                  OR ir.prepared_by_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                  OR ir.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
              )
              AND EXISTS (
                  SELECT 1 FROM user_projects up
                  JOIN users u ON up.user_id = u.id
                  WHERE u.auth_user_id = auth.uid()
                    AND up.project_id = ir.project_id
                    AND up.access_level IN ('owner', 'admin')
                    AND up.is_deleted = FALSE
              )
        )
    );

-- Policy 4: Can remove distribution if can edit the report (before distribution)
DROP POLICY IF EXISTS policy_issue_report_distribution_auth_delete ON issue_report_distribution;
CREATE POLICY policy_issue_report_distribution_auth_delete
    ON issue_report_distribution FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM issue_reports ir
            WHERE ir.id = issue_report_distribution.issue_report_id
              AND ir.is_deleted = FALSE
              AND ir.report_status NOT IN ('distributed', 'closed') -- Cannot delete after distribution
              AND (
                  EXISTS (
                      SELECT 1
                      FROM user_roles ur
                      JOIN roles r ON ur.role_id = r.id
                      JOIN users u ON ur.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND r.role_name IN ('pmo_admin', 'System Admin')
                        AND ur.is_active = TRUE
                        AND ur.is_deleted = FALSE
                  )
                  OR (
                      (
                          ir.author_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                          OR ir.prepared_by_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                          OR ir.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                      )
                      AND EXISTS (
                          SELECT 1 FROM user_projects up
                          JOIN users u ON up.user_id = u.id
                          WHERE u.auth_user_id = auth.uid()
                            AND up.project_id = ir.project_id
                            AND up.access_level IN ('owner', 'admin')
                            AND up.is_deleted = FALSE
                      )
                  )
              )
        )
    );

-- ============================================================================
-- END OF FILE
-- ============================================================================
