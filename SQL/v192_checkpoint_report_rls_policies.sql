-- ============================================================================
-- Checkpoint Report RLS Policies
-- Version: v192
-- Description: Row Level Security policies for Checkpoint Report module
-- Date: 2026-01-20
-- ============================================================================
--
-- Purpose:
-- Implements Row Level Security (RLS) for all Checkpoint Report tables to ensure
-- users can only access reports for projects they're members of
-- or have appropriate permissions for.
--
-- Prerequisites:
-- - v191_checkpoint_report_enhancement.sql must be run first
-- - All tables must exist
--
-- ============================================================================
-- SECTION 1: GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON checkpoint_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE ON checkpoint_report_revision_history TO authenticated;
GRANT SELECT, INSERT, UPDATE ON checkpoint_report_approvals TO authenticated;
GRANT SELECT, INSERT, UPDATE ON checkpoint_report_distribution TO authenticated;
GRANT SELECT, INSERT, UPDATE ON checkpoint_report_products TO authenticated;
GRANT SELECT, INSERT, UPDATE ON checkpoint_report_quality_activities TO authenticated;
GRANT SELECT, INSERT, UPDATE ON checkpoint_report_follow_ups TO authenticated;
GRANT SELECT, INSERT, UPDATE ON checkpoint_report_lessons TO authenticated;
GRANT SELECT, INSERT, UPDATE ON checkpoint_report_quality_checks TO authenticated;

-- ============================================================================
-- SECTION 2: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE checkpoint_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkpoint_report_revision_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkpoint_report_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkpoint_report_distribution ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkpoint_report_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkpoint_report_quality_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkpoint_report_follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkpoint_report_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkpoint_report_quality_checks ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 3: checkpoint_reports RLS POLICIES
-- ============================================================================

-- Policy 1: Users can view checkpoint reports for projects they're members of
DROP POLICY IF EXISTS policy_checkpoint_reports_auth_select ON checkpoint_reports;
CREATE POLICY policy_checkpoint_reports_auth_select
    ON checkpoint_reports FOR SELECT
    TO authenticated
    USING (
        is_deleted = FALSE
        AND (
            EXISTS (
                SELECT 1 FROM user_projects up
                WHERE up.project_id = checkpoint_reports.project_id
                    AND up.user_id = auth.uid()::uuid
                    AND up.is_deleted = FALSE
            )
            OR EXISTS (
                SELECT 1 FROM users u
                WHERE u.auth_user_id = auth.uid()
                    AND u.is_deleted = FALSE
                    AND (
                        u.id = checkpoint_reports.reported_by_user_id
                        OR u.id = checkpoint_reports.author_id
                        OR u.id = checkpoint_reports.owner_id
                        OR u.id = checkpoint_reports.client_id
                    )
            )
        )
    );

-- Policy 2: Team Managers can create checkpoint reports for their work packages
DROP POLICY IF EXISTS policy_checkpoint_reports_auth_insert ON checkpoint_reports;
CREATE POLICY policy_checkpoint_reports_auth_insert
    ON checkpoint_reports FOR INSERT
    TO authenticated
    WITH CHECK (
        is_deleted = FALSE
        AND (
            EXISTS (
                SELECT 1 FROM user_projects up
                WHERE up.project_id = checkpoint_reports.project_id
                    AND up.user_id = auth.uid()::uuid
                    AND up.is_deleted = FALSE
            )
            OR EXISTS (
                SELECT 1 FROM work_packages wp
                JOIN users u ON u.id = wp.assigned_to_user_id
                WHERE wp.id = checkpoint_reports.work_package_id
                    AND u.auth_user_id = auth.uid()
                    AND u.is_deleted = FALSE
            )
        )
    );

-- Policy 3: Team Managers and Project Managers can update draft reports
DROP POLICY IF EXISTS policy_checkpoint_reports_auth_update ON checkpoint_reports;
CREATE POLICY policy_checkpoint_reports_auth_update
    ON checkpoint_reports FOR UPDATE
    TO authenticated
    USING (
        is_deleted = FALSE
        AND (
            status = 'draft'
            OR status = 'rejected'
        )
        AND (
            EXISTS (
                SELECT 1 FROM users u
                WHERE u.auth_user_id = auth.uid()
                    AND u.is_deleted = FALSE
                    AND (
                        u.id = checkpoint_reports.reported_by_user_id
                        OR u.id = checkpoint_reports.author_id
                        OR u.id = checkpoint_reports.owner_id
                    )
            )
            OR EXISTS (
                SELECT 1 FROM user_projects up
                JOIN project_roles pr ON pr.project_id = up.project_id
                WHERE up.project_id = checkpoint_reports.project_id
                    AND up.user_id = auth.uid()::uuid
                    AND pr.role_name IN ('Project Manager', 'PMO Admin')
                    AND up.is_deleted = FALSE
            )
        )
    )
    WITH CHECK (
        is_deleted = FALSE
    );

-- ============================================================================
-- SECTION 4: checkpoint_report_revision_history RLS POLICIES
-- ============================================================================

-- Policy: Users can view revision history for reports they can access
DROP POLICY IF EXISTS policy_checkpoint_report_revision_history_select ON checkpoint_report_revision_history;
CREATE POLICY policy_checkpoint_report_revision_history_select
    ON checkpoint_report_revision_history FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM checkpoint_reports cr
            WHERE cr.id = checkpoint_report_revision_history.checkpoint_report_id
                AND cr.is_deleted = FALSE
                AND (
                    EXISTS (
                        SELECT 1 FROM user_projects up
                        WHERE up.project_id = cr.project_id
                            AND up.user_id = auth.uid()::uuid
                            AND up.is_deleted = FALSE
                    )
                )
        )
    );

-- Policy: Users can insert revision history for reports they can edit
DROP POLICY IF EXISTS policy_checkpoint_report_revision_history_insert ON checkpoint_report_revision_history;
CREATE POLICY policy_checkpoint_report_revision_history_insert
    ON checkpoint_report_revision_history FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM checkpoint_reports cr
            WHERE cr.id = checkpoint_report_revision_history.checkpoint_report_id
                AND cr.is_deleted = FALSE
                AND (
                    EXISTS (
                        SELECT 1 FROM users u
                        WHERE u.auth_user_id = auth.uid()
                            AND u.is_deleted = FALSE
                            AND (
                                u.id = cr.reported_by_user_id
                                OR u.id = cr.author_id
                                OR u.id = cr.owner_id
                            )
                    )
                )
        )
    );

-- ============================================================================
-- SECTION 5: checkpoint_report_approvals RLS POLICIES
-- ============================================================================

-- Policy: Users can view approvals for reports they can access
DROP POLICY IF EXISTS policy_checkpoint_report_approvals_select ON checkpoint_report_approvals;
CREATE POLICY policy_checkpoint_report_approvals_select
    ON checkpoint_report_approvals FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM checkpoint_reports cr
            WHERE cr.id = checkpoint_report_approvals.checkpoint_report_id
                AND cr.is_deleted = FALSE
                AND (
                    EXISTS (
                        SELECT 1 FROM user_projects up
                        WHERE up.project_id = cr.project_id
                            AND up.user_id = auth.uid()::uuid
                            AND up.is_deleted = FALSE
                    )
                )
        )
    );

-- Policy: Project Managers can create/update approvals
DROP POLICY IF EXISTS policy_checkpoint_report_approvals_insert ON checkpoint_report_approvals;
CREATE POLICY policy_checkpoint_report_approvals_insert
    ON checkpoint_report_approvals FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM checkpoint_reports cr
            JOIN user_projects up ON up.project_id = cr.project_id
            JOIN project_roles pr ON pr.project_id = cr.project_id
            WHERE cr.id = checkpoint_report_approvals.checkpoint_report_id
                AND cr.is_deleted = FALSE
                AND up.user_id = auth.uid()::uuid
                AND pr.role_name IN ('Project Manager', 'PMO Admin')
                AND up.is_deleted = FALSE
        )
    );

-- Policy: Approvers can update their own approvals
DROP POLICY IF EXISTS policy_checkpoint_report_approvals_update ON checkpoint_report_approvals;
CREATE POLICY policy_checkpoint_report_approvals_update
    ON checkpoint_report_approvals FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.auth_user_id = auth.uid()
                AND u.id = checkpoint_report_approvals.approver_id
                AND u.is_deleted = FALSE
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.auth_user_id = auth.uid()
                AND u.id = checkpoint_report_approvals.approver_id
                AND u.is_deleted = FALSE
        )
    );

-- ============================================================================
-- SECTION 6: checkpoint_report_distribution RLS POLICIES
-- ============================================================================

-- Policy: Users can view distribution for reports they can access
DROP POLICY IF EXISTS policy_checkpoint_report_distribution_select ON checkpoint_report_distribution;
CREATE POLICY policy_checkpoint_report_distribution_select
    ON checkpoint_report_distribution FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM checkpoint_reports cr
            WHERE cr.id = checkpoint_report_distribution.checkpoint_report_id
                AND cr.is_deleted = FALSE
                AND (
                    EXISTS (
                        SELECT 1 FROM user_projects up
                        WHERE up.project_id = cr.project_id
                            AND up.user_id = auth.uid()::uuid
                            AND up.is_deleted = FALSE
                    )
                    OR EXISTS (
                        SELECT 1 FROM users u
                        WHERE u.auth_user_id = auth.uid()
                            AND u.id = checkpoint_report_distribution.recipient_id
                            AND u.is_deleted = FALSE
                    )
                )
        )
    );

-- Policy: Report owners can manage distribution
DROP POLICY IF EXISTS policy_checkpoint_report_distribution_insert ON checkpoint_report_distribution;
CREATE POLICY policy_checkpoint_report_distribution_insert
    ON checkpoint_report_distribution FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM checkpoint_reports cr
            JOIN users u ON u.id = cr.owner_id
            WHERE cr.id = checkpoint_report_distribution.checkpoint_report_id
                AND cr.is_deleted = FALSE
                AND u.auth_user_id = auth.uid()
                AND u.is_deleted = FALSE
        )
    );

-- Policy: Recipients can update their own distribution status
DROP POLICY IF EXISTS policy_checkpoint_report_distribution_update ON checkpoint_report_distribution;
CREATE POLICY policy_checkpoint_report_distribution_update
    ON checkpoint_report_distribution FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.auth_user_id = auth.uid()
                AND u.id = checkpoint_report_distribution.recipient_id
                AND u.is_deleted = FALSE
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.auth_user_id = auth.uid()
                AND u.id = checkpoint_report_distribution.recipient_id
                AND u.is_deleted = FALSE
        )
    );

-- ============================================================================
-- SECTION 7: checkpoint_report_products RLS POLICIES
-- ============================================================================

-- Policy: Users can view products for reports they can access
DROP POLICY IF EXISTS policy_checkpoint_report_products_select ON checkpoint_report_products;
CREATE POLICY policy_checkpoint_report_products_select
    ON checkpoint_report_products FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM checkpoint_reports cr
            WHERE cr.id = checkpoint_report_products.checkpoint_report_id
                AND cr.is_deleted = FALSE
                AND (
                    EXISTS (
                        SELECT 1 FROM user_projects up
                        WHERE up.project_id = cr.project_id
                            AND up.user_id = auth.uid()::uuid
                            AND up.is_deleted = FALSE
                    )
                )
        )
    );

-- Policy: Users can manage products for reports they can edit
DROP POLICY IF EXISTS policy_checkpoint_report_products_insert ON checkpoint_report_products;
CREATE POLICY policy_checkpoint_report_products_insert
    ON checkpoint_report_products FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM checkpoint_reports cr
            WHERE cr.id = checkpoint_report_products.checkpoint_report_id
                AND cr.is_deleted = FALSE
                AND cr.status IN ('draft', 'rejected')
                AND (
                    EXISTS (
                        SELECT 1 FROM users u
                        WHERE u.auth_user_id = auth.uid()
                            AND u.is_deleted = FALSE
                            AND (
                                u.id = cr.reported_by_user_id
                                OR u.id = cr.author_id
                                OR u.id = cr.owner_id
                            )
                    )
                )
        )
    );

-- Policy: Users can update products for reports they can edit
DROP POLICY IF EXISTS policy_checkpoint_report_products_update ON checkpoint_report_products;
CREATE POLICY policy_checkpoint_report_products_update
    ON checkpoint_report_products FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM checkpoint_reports cr
            WHERE cr.id = checkpoint_report_products.checkpoint_report_id
                AND cr.is_deleted = FALSE
                AND cr.status IN ('draft', 'rejected')
                AND (
                    EXISTS (
                        SELECT 1 FROM users u
                        WHERE u.auth_user_id = auth.uid()
                            AND u.is_deleted = FALSE
                            AND (
                                u.id = cr.reported_by_user_id
                                OR u.id = cr.author_id
                                OR u.id = cr.owner_id
                            )
                    )
                )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM checkpoint_reports cr
            WHERE cr.id = checkpoint_report_products.checkpoint_report_id
                AND cr.is_deleted = FALSE
        )
    );

-- Policy: Users can delete products for reports they can edit
DROP POLICY IF EXISTS policy_checkpoint_report_products_delete ON checkpoint_report_products;
CREATE POLICY policy_checkpoint_report_products_delete
    ON checkpoint_report_products FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM checkpoint_reports cr
            WHERE cr.id = checkpoint_report_products.checkpoint_report_id
                AND cr.is_deleted = FALSE
                AND cr.status IN ('draft', 'rejected')
                AND (
                    EXISTS (
                        SELECT 1 FROM users u
                        WHERE u.auth_user_id = auth.uid()
                            AND u.is_deleted = FALSE
                            AND (
                                u.id = cr.reported_by_user_id
                                OR u.id = cr.author_id
                                OR u.id = cr.owner_id
                            )
                    )
                )
        )
    );

-- ============================================================================
-- SECTION 8: checkpoint_report_quality_activities RLS POLICIES
-- ============================================================================

-- Policy: Users can view quality activities for reports they can access
DROP POLICY IF EXISTS policy_checkpoint_report_quality_activities_select ON checkpoint_report_quality_activities;
CREATE POLICY policy_checkpoint_report_quality_activities_select
    ON checkpoint_report_quality_activities FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM checkpoint_reports cr
            WHERE cr.id = checkpoint_report_quality_activities.checkpoint_report_id
                AND cr.is_deleted = FALSE
                AND (
                    EXISTS (
                        SELECT 1 FROM user_projects up
                        WHERE up.project_id = cr.project_id
                            AND up.user_id = auth.uid()::uuid
                            AND up.is_deleted = FALSE
                    )
                )
        )
    );

-- Policy: Users can manage quality activities for reports they can edit
DROP POLICY IF EXISTS policy_checkpoint_report_quality_activities_insert ON checkpoint_report_quality_activities;
CREATE POLICY policy_checkpoint_report_quality_activities_insert
    ON checkpoint_report_quality_activities FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM checkpoint_reports cr
            WHERE cr.id = checkpoint_report_quality_activities.checkpoint_report_id
                AND cr.is_deleted = FALSE
                AND cr.status IN ('draft', 'rejected')
                AND (
                    EXISTS (
                        SELECT 1 FROM users u
                        WHERE u.auth_user_id = auth.uid()
                            AND u.is_deleted = FALSE
                            AND (
                                u.id = cr.reported_by_user_id
                                OR u.id = cr.author_id
                                OR u.id = cr.owner_id
                            )
                    )
                )
        )
    );

-- Policy: Users can update quality activities for reports they can edit
DROP POLICY IF EXISTS policy_checkpoint_report_quality_activities_update ON checkpoint_report_quality_activities;
CREATE POLICY policy_checkpoint_report_quality_activities_update
    ON checkpoint_report_quality_activities FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM checkpoint_reports cr
            WHERE cr.id = checkpoint_report_quality_activities.checkpoint_report_id
                AND cr.is_deleted = FALSE
                AND cr.status IN ('draft', 'rejected')
                AND (
                    EXISTS (
                        SELECT 1 FROM users u
                        WHERE u.auth_user_id = auth.uid()
                            AND u.is_deleted = FALSE
                            AND (
                                u.id = cr.reported_by_user_id
                                OR u.id = cr.author_id
                                OR u.id = cr.owner_id
                            )
                    )
                )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM checkpoint_reports cr
            WHERE cr.id = checkpoint_report_quality_activities.checkpoint_report_id
                AND cr.is_deleted = FALSE
        )
    );

-- ============================================================================
-- SECTION 9: checkpoint_report_follow_ups RLS POLICIES
-- ============================================================================

-- Policy: Users can view follow-ups for reports they can access
DROP POLICY IF EXISTS policy_checkpoint_report_follow_ups_select ON checkpoint_report_follow_ups;
CREATE POLICY policy_checkpoint_report_follow_ups_select
    ON checkpoint_report_follow_ups FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM checkpoint_reports cr
            WHERE cr.id = checkpoint_report_follow_ups.checkpoint_report_id
                AND cr.is_deleted = FALSE
                AND (
                    EXISTS (
                        SELECT 1 FROM user_projects up
                        WHERE up.project_id = cr.project_id
                            AND up.user_id = auth.uid()::uuid
                            AND up.is_deleted = FALSE
                    )
                )
        )
    );

-- Policy: Users can manage follow-ups for reports they can edit
DROP POLICY IF EXISTS policy_checkpoint_report_follow_ups_insert ON checkpoint_report_follow_ups;
CREATE POLICY policy_checkpoint_report_follow_ups_insert
    ON checkpoint_report_follow_ups FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM checkpoint_reports cr
            WHERE cr.id = checkpoint_report_follow_ups.checkpoint_report_id
                AND cr.is_deleted = FALSE
                AND cr.status IN ('draft', 'rejected')
                AND (
                    EXISTS (
                        SELECT 1 FROM users u
                        WHERE u.auth_user_id = auth.uid()
                            AND u.is_deleted = FALSE
                            AND (
                                u.id = cr.reported_by_user_id
                                OR u.id = cr.author_id
                                OR u.id = cr.owner_id
                            )
                    )
                )
        )
    );

-- Policy: Users can update follow-ups for reports they can edit
DROP POLICY IF EXISTS policy_checkpoint_report_follow_ups_update ON checkpoint_report_follow_ups;
CREATE POLICY policy_checkpoint_report_follow_ups_update
    ON checkpoint_report_follow_ups FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM checkpoint_reports cr
            WHERE cr.id = checkpoint_report_follow_ups.checkpoint_report_id
                AND cr.is_deleted = FALSE
                AND cr.status IN ('draft', 'rejected')
                AND (
                    EXISTS (
                        SELECT 1 FROM users u
                        WHERE u.auth_user_id = auth.uid()
                            AND u.is_deleted = FALSE
                            AND (
                                u.id = cr.reported_by_user_id
                                OR u.id = cr.author_id
                                OR u.id = cr.owner_id
                            )
                    )
                )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM checkpoint_reports cr
            WHERE cr.id = checkpoint_report_follow_ups.checkpoint_report_id
                AND cr.is_deleted = FALSE
        )
    );

-- ============================================================================
-- SECTION 10: checkpoint_report_lessons RLS POLICIES
-- ============================================================================

-- Policy: Users can view lessons for reports they can access
DROP POLICY IF EXISTS policy_checkpoint_report_lessons_select ON checkpoint_report_lessons;
CREATE POLICY policy_checkpoint_report_lessons_select
    ON checkpoint_report_lessons FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM checkpoint_reports cr
            WHERE cr.id = checkpoint_report_lessons.checkpoint_report_id
                AND cr.is_deleted = FALSE
                AND (
                    EXISTS (
                        SELECT 1 FROM user_projects up
                        WHERE up.project_id = cr.project_id
                            AND up.user_id = auth.uid()::uuid
                            AND up.is_deleted = FALSE
                    )
                )
        )
    );

-- Policy: Users can manage lessons for reports they can edit
DROP POLICY IF EXISTS policy_checkpoint_report_lessons_insert ON checkpoint_report_lessons;
CREATE POLICY policy_checkpoint_report_lessons_insert
    ON checkpoint_report_lessons FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM checkpoint_reports cr
            WHERE cr.id = checkpoint_report_lessons.checkpoint_report_id
                AND cr.is_deleted = FALSE
                AND cr.status IN ('draft', 'rejected')
                AND (
                    EXISTS (
                        SELECT 1 FROM users u
                        WHERE u.auth_user_id = auth.uid()
                            AND u.is_deleted = FALSE
                            AND (
                                u.id = cr.reported_by_user_id
                                OR u.id = cr.author_id
                                OR u.id = cr.owner_id
                            )
                    )
                )
        )
    );

-- Policy: Users can update lessons for reports they can edit
DROP POLICY IF EXISTS policy_checkpoint_report_lessons_update ON checkpoint_report_lessons;
CREATE POLICY policy_checkpoint_report_lessons_update
    ON checkpoint_report_lessons FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM checkpoint_reports cr
            WHERE cr.id = checkpoint_report_lessons.checkpoint_report_id
                AND cr.is_deleted = FALSE
                AND cr.status IN ('draft', 'rejected')
                AND (
                    EXISTS (
                        SELECT 1 FROM users u
                        WHERE u.auth_user_id = auth.uid()
                            AND u.is_deleted = FALSE
                            AND (
                                u.id = cr.reported_by_user_id
                                OR u.id = cr.author_id
                                OR u.id = cr.owner_id
                            )
                    )
                )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM checkpoint_reports cr
            WHERE cr.id = checkpoint_report_lessons.checkpoint_report_id
                AND cr.is_deleted = FALSE
        )
    );

-- ============================================================================
-- SECTION 11: checkpoint_report_quality_checks RLS POLICIES
-- ============================================================================

-- Policy: Users can view quality checks for reports they can access
DROP POLICY IF EXISTS policy_checkpoint_report_quality_checks_select ON checkpoint_report_quality_checks;
CREATE POLICY policy_checkpoint_report_quality_checks_select
    ON checkpoint_report_quality_checks FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM checkpoint_reports cr
            WHERE cr.id = checkpoint_report_quality_checks.checkpoint_report_id
                AND cr.is_deleted = FALSE
                AND (
                    EXISTS (
                        SELECT 1 FROM user_projects up
                        WHERE up.project_id = cr.project_id
                            AND up.user_id = auth.uid()::uuid
                            AND up.is_deleted = FALSE
                    )
                )
        )
    );

-- Policy: Users can update quality checks for reports they can edit
DROP POLICY IF EXISTS policy_checkpoint_report_quality_checks_update ON checkpoint_report_quality_checks;
CREATE POLICY policy_checkpoint_report_quality_checks_update
    ON checkpoint_report_quality_checks FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM checkpoint_reports cr
            WHERE cr.id = checkpoint_report_quality_checks.checkpoint_report_id
                AND cr.is_deleted = FALSE
                AND cr.status IN ('draft', 'rejected')
                AND (
                    EXISTS (
                        SELECT 1 FROM users u
                        WHERE u.auth_user_id = auth.uid()
                            AND u.is_deleted = FALSE
                            AND (
                                u.id = cr.reported_by_user_id
                                OR u.id = cr.author_id
                                OR u.id = cr.owner_id
                            )
                    )
                    OR EXISTS (
                        SELECT 1 FROM user_projects up
                        JOIN project_roles pr ON pr.project_id = up.project_id
                        WHERE up.project_id = cr.project_id
                            AND up.user_id = auth.uid()::uuid
                            AND pr.role_name IN ('Project Manager', 'PMO Admin')
                            AND up.is_deleted = FALSE
                    )
                )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM checkpoint_reports cr
            WHERE cr.id = checkpoint_report_quality_checks.checkpoint_report_id
                AND cr.is_deleted = FALSE
        )
    );

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    v_policies_count INTEGER;
BEGIN
    -- Count RLS policies
    SELECT COUNT(*)
    INTO v_policies_count
    FROM pg_policies
    WHERE schemaname = 'public'
        AND tablename LIKE 'checkpoint_report%';

    RAISE NOTICE 'Checkpoint Report RLS: % policies created', v_policies_count;
END;
$$;
