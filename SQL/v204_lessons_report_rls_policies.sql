-- ============================================================================
-- Lessons Report RLS Policies
-- Version: v204
-- Description: Row Level Security policies for Lessons Report tables
-- Date: 2026-01-16
-- ============================================================================
--
-- Prerequisites:
-- - v203_lessons_report_tables.sql must be run first
--
-- ============================================================================
-- SECTION 1: GRANT PERMISSIONS
-- ============================================================================

-- Grant SELECT, INSERT, UPDATE permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON lessons_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE ON lessons_report_lessons TO authenticated;
GRANT SELECT, INSERT, UPDATE ON lessons_report_recommendations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON lessons_report_revision_history TO authenticated;
GRANT SELECT, INSERT, UPDATE ON lessons_report_approvals TO authenticated;
GRANT SELECT, INSERT, UPDATE ON lessons_report_distribution TO authenticated;
GRANT SELECT, INSERT, UPDATE ON lessons_report_appendices TO authenticated;

-- ============================================================================
-- SECTION 2: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE lessons_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons_report_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons_report_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons_report_revision_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons_report_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons_report_distribution ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons_report_appendices ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 3: LESSONS_REPORTS RLS POLICIES
-- ============================================================================

-- SELECT: Project members can view, distribution recipients can view
DROP POLICY IF EXISTS policy_lessons_reports_auth_select ON lessons_reports;
CREATE POLICY policy_lessons_reports_auth_select ON lessons_reports
    FOR SELECT
    TO authenticated
    USING (
        -- Project member
        EXISTS (
            SELECT 1 FROM user_projects up
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
                AND up.project_id = lessons_reports.project_id
                AND up.is_deleted = FALSE
        )
        OR
        -- PMO Admin
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
                AND r.role_name = 'pmo_admin'
                AND ur.is_active = TRUE
        )
        OR
        -- Distribution recipient
        EXISTS (
            SELECT 1 FROM lessons_report_distribution lrd
            WHERE lrd.lessons_report_id = lessons_reports.id
                AND lrd.recipient_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        )
        OR
        -- System Admin
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
                AND r.role_name = 'System Admin'
                AND ur.is_active = TRUE
        )
    );

-- INSERT: Project Manager or PMO Admin can create
DROP POLICY IF EXISTS policy_lessons_reports_auth_insert ON lessons_reports;
CREATE POLICY policy_lessons_reports_auth_insert ON lessons_reports
    FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND (
            -- Project Manager or Owner
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                    AND up.project_id = lessons_reports.project_id
                    AND up.access_level IN ('owner', 'admin')
                    AND up.is_deleted = FALSE
            )
            OR
            -- PMO Admin
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON r.id = ur.role_id
                WHERE ur.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
                    AND r.role_name = 'pmo_admin'
                    AND ur.is_active = TRUE
            )
            OR
            -- System Admin
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON r.id = ur.role_id
                WHERE ur.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
                    AND r.role_name = 'System Admin'
                    AND ur.is_active = TRUE
            )
        )
    );

-- UPDATE: Author or PMO Admin can update (if draft/submitted)
DROP POLICY IF EXISTS policy_lessons_reports_auth_update ON lessons_reports;
CREATE POLICY policy_lessons_reports_auth_update ON lessons_reports
    FOR UPDATE
    TO authenticated
    USING (
        (
            -- Author can update if draft/submitted
            author_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
            AND report_status IN ('draft', 'submitted')
        )
        OR
        -- PMO Admin can update
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
                AND r.role_name = 'pmo_admin'
                AND ur.is_active = TRUE
        )
        OR
        -- System Admin can update
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
                AND r.role_name = 'System Admin'
                AND ur.is_active = TRUE
        )
    )
    WITH CHECK (
        (
            -- Author can update if draft/submitted
            author_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
            AND report_status IN ('draft', 'submitted')
        )
        OR
        -- PMO Admin can update
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
                AND r.role_name = 'pmo_admin'
                AND ur.is_active = TRUE
        )
        OR
        -- System Admin can update
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
                AND r.role_name = 'System Admin'
                AND ur.is_active = TRUE
        )
    );

-- ============================================================================
-- SECTION 4: LESSONS_REPORT_LESSONS RLS POLICIES
-- ============================================================================

-- SELECT: Can view if can view parent report
DROP POLICY IF EXISTS policy_lessons_report_lessons_auth_select ON lessons_report_lessons;
CREATE POLICY policy_lessons_report_lessons_auth_select ON lessons_report_lessons
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM lessons_reports lr
            WHERE lr.id = lessons_report_lessons.lessons_report_id
                AND lr.is_deleted = FALSE
        )
    );

-- INSERT/UPDATE/DELETE: Can modify if can edit parent report
DROP POLICY IF EXISTS policy_lessons_report_lessons_auth_modify ON lessons_report_lessons;
CREATE POLICY policy_lessons_report_lessons_auth_modify ON lessons_report_lessons
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM lessons_reports lr
            WHERE lr.id = lessons_report_lessons.lessons_report_id
                AND (
                    lr.author_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
                    AND lr.report_status IN ('draft', 'submitted')
                )
                OR EXISTS (
                    SELECT 1 FROM user_roles ur
                    JOIN roles r ON r.id = ur.role_id
                    WHERE ur.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
                        AND r.role_name IN ('pmo_admin', 'System Admin')
                        AND ur.is_active = TRUE
                )
        )
    );

-- ============================================================================
-- SECTION 5: LESSONS_REPORT_RECOMMENDATIONS RLS POLICIES
-- ============================================================================

-- SELECT: Can view if can view parent report
DROP POLICY IF EXISTS policy_lessons_report_recommendations_auth_select ON lessons_report_recommendations;
CREATE POLICY policy_lessons_report_recommendations_auth_select ON lessons_report_recommendations
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM lessons_reports lr
            WHERE lr.id = lessons_report_recommendations.lessons_report_id
                AND lr.is_deleted = FALSE
        )
    );

-- INSERT/UPDATE/DELETE: Can modify if can edit parent report
DROP POLICY IF EXISTS policy_lessons_report_recommendations_auth_modify ON lessons_report_recommendations;
CREATE POLICY policy_lessons_report_recommendations_auth_modify ON lessons_report_recommendations
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM lessons_reports lr
            WHERE lr.id = lessons_report_recommendations.lessons_report_id
                AND (
                    lr.author_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
                    AND lr.report_status IN ('draft', 'submitted')
                )
                OR EXISTS (
                    SELECT 1 FROM user_roles ur
                    JOIN roles r ON r.id = ur.role_id
                    WHERE ur.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
                        AND r.role_name IN ('pmo_admin', 'System Admin')
                        AND ur.is_active = TRUE
                )
        )
    );

-- ============================================================================
-- SECTION 6: LESSONS_REPORT_REVISION_HISTORY RLS POLICIES
-- ============================================================================

-- SELECT: Can view if can view parent report
DROP POLICY IF EXISTS policy_lessons_report_revision_history_auth_select ON lessons_report_revision_history;
CREATE POLICY policy_lessons_report_revision_history_auth_select ON lessons_report_revision_history
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM lessons_reports lr
            WHERE lr.id = lessons_report_revision_history.lessons_report_id
                AND lr.is_deleted = FALSE
        )
    );

-- INSERT: Can insert if can edit parent report
DROP POLICY IF EXISTS policy_lessons_report_revision_history_auth_insert ON lessons_report_revision_history;
CREATE POLICY policy_lessons_report_revision_history_auth_insert ON lessons_report_revision_history
    FOR INSERT
    TO authenticated
    WITH CHECK (
        revised_by = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM lessons_reports lr
            WHERE lr.id = lessons_report_revision_history.lessons_report_id
                AND (
                    lr.author_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
                    OR EXISTS (
                        SELECT 1 FROM user_roles ur
                        JOIN roles r ON r.id = ur.role_id
                        WHERE ur.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
                            AND r.role_name IN ('pmo_admin', 'System Admin')
                            AND ur.is_active = TRUE
                    )
                )
        )
    );

-- ============================================================================
-- SECTION 7: LESSONS_REPORT_APPROVALS RLS POLICIES
-- ============================================================================

-- SELECT: Can view if can view parent report
DROP POLICY IF EXISTS policy_lessons_report_approvals_auth_select ON lessons_report_approvals;
CREATE POLICY policy_lessons_report_approvals_auth_select ON lessons_report_approvals
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM lessons_reports lr
            WHERE lr.id = lessons_report_approvals.lessons_report_id
                AND lr.is_deleted = FALSE
        )
    );

-- INSERT: Can add approvers if can edit parent report
DROP POLICY IF EXISTS policy_lessons_report_approvals_auth_insert ON lessons_report_approvals;
CREATE POLICY policy_lessons_report_approvals_auth_insert ON lessons_report_approvals
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM lessons_reports lr
            WHERE lr.id = lessons_report_approvals.lessons_report_id
                AND (
                    lr.author_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
                    OR EXISTS (
                        SELECT 1 FROM user_roles ur
                        JOIN roles r ON r.id = ur.role_id
                        WHERE ur.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
                            AND r.role_name IN ('pmo_admin', 'System Admin')
                            AND ur.is_active = TRUE
                    )
                )
        )
    );

-- UPDATE: Approver can update own, author/PMO Admin can update others
DROP POLICY IF EXISTS policy_lessons_report_approvals_auth_update ON lessons_report_approvals;
CREATE POLICY policy_lessons_report_approvals_auth_update ON lessons_report_approvals
    FOR UPDATE
    TO authenticated
    USING (
        approver_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM lessons_reports lr
            WHERE lr.id = lessons_report_approvals.lessons_report_id
                AND (
                    lr.author_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
                    OR EXISTS (
                        SELECT 1 FROM user_roles ur
                        JOIN roles r ON r.id = ur.role_id
                        WHERE ur.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
                            AND r.role_name IN ('pmo_admin', 'System Admin')
                            AND ur.is_active = TRUE
                    )
                )
        )
    );

-- ============================================================================
-- SECTION 8: LESSONS_REPORT_DISTRIBUTION RLS POLICIES
-- ============================================================================

-- SELECT: Can view if can view parent report
DROP POLICY IF EXISTS policy_lessons_report_distribution_auth_select ON lessons_report_distribution;
CREATE POLICY policy_lessons_report_distribution_auth_select ON lessons_report_distribution
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM lessons_reports lr
            WHERE lr.id = lessons_report_distribution.lessons_report_id
                AND lr.is_deleted = FALSE
        )
    );

-- INSERT/UPDATE: Can manage if can edit parent report
DROP POLICY IF EXISTS policy_lessons_report_distribution_auth_modify ON lessons_report_distribution;
CREATE POLICY policy_lessons_report_distribution_auth_modify ON lessons_report_distribution
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM lessons_reports lr
            WHERE lr.id = lessons_report_distribution.lessons_report_id
                AND (
                    lr.author_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
                    OR EXISTS (
                        SELECT 1 FROM user_roles ur
                        JOIN roles r ON r.id = ur.role_id
                        WHERE ur.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
                            AND r.role_name IN ('pmo_admin', 'System Admin')
                            AND ur.is_active = TRUE
                    )
                )
        )
    );

-- UPDATE: Recipient can update own status (read/acknowledge)
DROP POLICY IF EXISTS policy_lessons_report_distribution_auth_status_update ON lessons_report_distribution;
CREATE POLICY policy_lessons_report_distribution_auth_status_update ON lessons_report_distribution
    FOR UPDATE
    TO authenticated
    USING (
        recipient_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    )
    WITH CHECK (
        recipient_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    );

-- ============================================================================
-- SECTION 9: LESSONS_REPORT_APPENDICES RLS POLICIES
-- ============================================================================

-- SELECT: Can view if can view parent report
DROP POLICY IF EXISTS policy_lessons_report_appendices_auth_select ON lessons_report_appendices;
CREATE POLICY policy_lessons_report_appendices_auth_select ON lessons_report_appendices
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM lessons_reports lr
            WHERE lr.id = lessons_report_appendices.lessons_report_id
                AND lr.is_deleted = FALSE
        )
    );

-- INSERT/UPDATE/DELETE: Can modify if can edit parent report
DROP POLICY IF EXISTS policy_lessons_report_appendices_auth_modify ON lessons_report_appendices;
CREATE POLICY policy_lessons_report_appendices_auth_modify ON lessons_report_appendices
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM lessons_reports lr
            WHERE lr.id = lessons_report_appendices.lessons_report_id
                AND (
                    lr.author_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
                    AND lr.report_status IN ('draft', 'submitted')
                )
                OR EXISTS (
                    SELECT 1 FROM user_roles ur
                    JOIN roles r ON r.id = ur.role_id
                    WHERE ur.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
                        AND r.role_name IN ('pmo_admin', 'System Admin')
                        AND ur.is_active = TRUE
                )
        )
    );

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
