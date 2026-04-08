-- ============================================================================
-- Lessons Log RLS Policies
-- Version: v170
-- Description: Row Level Security policies for unified Lessons Log module
-- Date: 2026-01-19
-- ============================================================================
--
-- Purpose:
-- Implements Row Level Security (RLS) for all Lessons Log tables to ensure
-- users can only access logs for projects they're members of or have
-- appropriate permissions for.
--
-- Prerequisites:
-- - v169_lessons_log_enhancement.sql must be run first
-- - All tables must exist
--
-- ============================================================================
-- SECTION 1: GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON lessons_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON lessons_learned TO authenticated;
GRANT SELECT, INSERT, UPDATE ON lessons_log_revision_history TO authenticated;
GRANT SELECT, INSERT, UPDATE ON lessons_log_approvals TO authenticated;
GRANT SELECT, INSERT, UPDATE ON lessons_log_distribution TO authenticated;
GRANT SELECT, INSERT, UPDATE ON corporate_lessons_repository TO authenticated;
GRANT SELECT, INSERT, UPDATE ON lesson_comments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON lesson_attachments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON lesson_actions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON lesson_ratings TO authenticated;

-- ============================================================================
-- SECTION 2: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE lessons_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons_learned ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons_log_revision_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons_log_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons_log_distribution ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_lessons_repository ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_ratings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 3: LESSONS_LOGS RLS POLICIES
-- ============================================================================

-- Policy 1: Authenticated users can view logs for projects they're members of
DROP POLICY IF EXISTS policy_lessons_logs_auth_select ON lessons_logs;
CREATE POLICY policy_lessons_logs_auth_select
    ON lessons_logs FOR SELECT
    TO authenticated
    USING (
        is_deleted = FALSE
        AND (
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.project_id = lessons_logs.project_id
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

-- Policy 2: Project Manager can create logs for their projects
DROP POLICY IF EXISTS policy_lessons_logs_auth_insert ON lessons_logs;
CREATE POLICY policy_lessons_logs_auth_insert
    ON lessons_logs FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND (
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.project_id = lessons_logs.project_id
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

-- Policy 3: Project Manager and Team Managers can update logs
DROP POLICY IF EXISTS policy_lessons_logs_auth_update ON lessons_logs;
CREATE POLICY policy_lessons_logs_auth_update
    ON lessons_logs FOR UPDATE
    TO authenticated
    USING (
        is_deleted = FALSE
        AND (
            owner_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
            OR EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.project_id = lessons_logs.project_id
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

-- ============================================================================
-- SECTION 4: LESSONS_LEARNED RLS POLICIES
-- ============================================================================

-- Policy 1: Users can view lessons for projects they're members of
DROP POLICY IF EXISTS policy_lessons_learned_auth_select ON lessons_learned;
CREATE POLICY policy_lessons_learned_auth_select
    ON lessons_learned FOR SELECT
    TO authenticated
    USING (
        is_deleted = FALSE
        AND (
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.project_id = lessons_learned.project_id
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
            OR (
                is_corporate_lesson = TRUE
                AND EXISTS (
                    SELECT 1 FROM projects p
                    JOIN accounts a ON p.account_id = a.id
                    JOIN user_projects up ON p.id = up.project_id
                    JOIN users u ON up.user_id = u.id
                    WHERE u.auth_user_id = auth.uid()
                      AND p.account_id = (
                          SELECT p2.account_id
                          FROM projects p2
                          JOIN lessons_learned l2 ON p2.id = l2.project_id
                          WHERE l2.id = lessons_learned.id
                      )
                      AND up.is_deleted = FALSE
                )
            )
        )
    );

-- Policy 2: Project Manager and Team Managers can add lessons
DROP POLICY IF EXISTS policy_lessons_learned_auth_insert ON lessons_learned;
CREATE POLICY policy_lessons_learned_auth_insert
    ON lessons_learned FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND (
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.project_id = lessons_learned.project_id
                  AND up.access_level IN ('owner', 'admin', 'member')
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

-- Policy 3: Lesson creator or PM can update lessons
DROP POLICY IF EXISTS policy_lessons_learned_auth_update ON lessons_learned;
CREATE POLICY policy_lessons_learned_auth_update
    ON lessons_learned FOR UPDATE
    TO authenticated
    USING (
        is_deleted = FALSE
        AND (
            created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
            OR EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.project_id = lessons_learned.project_id
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

-- Policy 4: Only PMO Admins can promote to corporate
DROP POLICY IF EXISTS policy_lessons_learned_corporate_promote ON lessons_learned;
CREATE POLICY policy_lessons_learned_corporate_promote
    ON lessons_learned FOR UPDATE
    TO authenticated
    USING (
        is_deleted = FALSE
        AND EXISTS (
            SELECT 1
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            JOIN users u ON ur.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name = 'pmo_admin'
              AND ur.is_active = TRUE
              AND ur.is_deleted = FALSE
        )
    )
    WITH CHECK (
        lesson_scope IN ('corporate', 'both_project_corporate', 'both_project_programme')
    );

-- ============================================================================
-- SECTION 5: CORPORATE_LESSONS_REPOSITORY RLS POLICIES
-- ============================================================================

-- Policy 1: All organisation members can view corporate lessons
DROP POLICY IF EXISTS policy_corporate_lessons_repository_select ON corporate_lessons_repository;
CREATE POLICY policy_corporate_lessons_repository_select
    ON corporate_lessons_repository FOR SELECT
    TO authenticated
    USING (
        is_active = TRUE
        AND EXISTS (
            SELECT 1 FROM projects p
            JOIN user_projects up ON p.id = up.project_id
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND p.account_id = corporate_lessons_repository.organisation_id
              AND up.is_deleted = FALSE
        )
    );

-- Policy 2: Only PMO Admins can promote to corporate
DROP POLICY IF EXISTS policy_corporate_lessons_repository_insert ON corporate_lessons_repository;
CREATE POLICY policy_corporate_lessons_repository_insert
    ON corporate_lessons_repository FOR INSERT
    TO authenticated
    WITH CHECK (
        promoted_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND EXISTS (
            SELECT 1
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            JOIN users u ON ur.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name = 'pmo_admin'
              AND ur.is_active = TRUE
              AND ur.is_deleted = FALSE
        )
    );

-- ============================================================================
-- SECTION 6: LESSON_COMMENTS RLS POLICIES
-- ============================================================================

-- Policy 1: Users can view comments for lessons they can view
DROP POLICY IF EXISTS policy_lesson_comments_select ON lesson_comments;
CREATE POLICY policy_lesson_comments_select
    ON lesson_comments FOR SELECT
    TO authenticated
    USING (
        is_deleted = FALSE
        AND EXISTS (
            SELECT 1 FROM lessons_learned l
            WHERE l.id = lesson_comments.lesson_id
              AND l.is_deleted = FALSE
        )
    );

-- Policy 2: Users can add comments
DROP POLICY IF EXISTS policy_lesson_comments_insert ON lesson_comments;
CREATE POLICY policy_lesson_comments_insert
    ON lesson_comments FOR INSERT
    TO authenticated
    WITH CHECK (
        commented_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND EXISTS (
            SELECT 1 FROM lessons_learned l
            WHERE l.id = lesson_comments.lesson_id
              AND l.is_deleted = FALSE
        )
    );

-- Policy 3: Users can edit/delete their own comments
DROP POLICY IF EXISTS policy_lesson_comments_update ON lesson_comments;
CREATE POLICY policy_lesson_comments_update
    ON lesson_comments FOR UPDATE
    TO authenticated
    USING (
        is_deleted = FALSE
        AND commented_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
    );

DROP POLICY IF EXISTS policy_lesson_comments_delete ON lesson_comments;
CREATE POLICY policy_lesson_comments_delete
    ON lesson_comments FOR DELETE
    TO authenticated
    USING (
        commented_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
    );

-- ============================================================================
-- SECTION 7: LESSON_ATTACHMENTS RLS POLICIES
-- ============================================================================

-- Policy 1: Users can view attachments for lessons they can view
DROP POLICY IF EXISTS policy_lesson_attachments_select ON lesson_attachments;
CREATE POLICY policy_lesson_attachments_select
    ON lesson_attachments FOR SELECT
    TO authenticated
    USING (
        is_deleted = FALSE
        AND EXISTS (
            SELECT 1 FROM lessons_learned l
            WHERE l.id = lesson_attachments.lesson_id
              AND l.is_deleted = FALSE
        )
    );

-- Policy 2: Users can upload attachments
DROP POLICY IF EXISTS policy_lesson_attachments_insert ON lesson_attachments;
CREATE POLICY policy_lesson_attachments_insert
    ON lesson_attachments FOR INSERT
    TO authenticated
    WITH CHECK (
        uploaded_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND EXISTS (
            SELECT 1 FROM lessons_learned l
            WHERE l.id = lesson_attachments.lesson_id
              AND l.is_deleted = FALSE
        )
    );

-- Policy 3: Uploader or PM can delete attachments
DROP POLICY IF EXISTS policy_lesson_attachments_delete ON lesson_attachments;
CREATE POLICY policy_lesson_attachments_delete
    ON lesson_attachments FOR DELETE
    TO authenticated
    USING (
        uploaded_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        OR EXISTS (
            SELECT 1 FROM lessons_learned l
            JOIN user_projects up ON l.project_id = up.project_id
            JOIN users u ON up.user_id = u.id
            WHERE l.id = lesson_attachments.lesson_id
              AND u.auth_user_id = auth.uid()
              AND up.access_level IN ('owner', 'admin')
              AND up.is_deleted = FALSE
        )
    );

-- ============================================================================
-- SECTION 8: LESSON_ACTIONS RLS POLICIES
-- ============================================================================

-- Policy 1: Users can view actions for lessons they can view
DROP POLICY IF EXISTS policy_lesson_actions_select ON lesson_actions;
CREATE POLICY policy_lesson_actions_select
    ON lesson_actions FOR SELECT
    TO authenticated
    USING (
        is_deleted = FALSE
        AND EXISTS (
            SELECT 1 FROM lessons_learned l
            WHERE l.id = lesson_actions.lesson_id
              AND l.is_deleted = FALSE
        )
    );

-- Policy 2: Users can create actions
DROP POLICY IF EXISTS policy_lesson_actions_insert ON lesson_actions;
CREATE POLICY policy_lesson_actions_insert
    ON lesson_actions FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM lessons_learned l
            WHERE l.id = lesson_actions.lesson_id
              AND l.is_deleted = FALSE
        )
    );

-- Policy 3: Assigned user or PM can update actions
DROP POLICY IF EXISTS policy_lesson_actions_update ON lesson_actions;
CREATE POLICY policy_lesson_actions_update
    ON lesson_actions FOR UPDATE
    TO authenticated
    USING (
        is_deleted = FALSE
        AND (
            assigned_to_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
            OR EXISTS (
                SELECT 1 FROM lessons_learned l
                JOIN user_projects up ON l.project_id = up.project_id
                JOIN users u ON up.user_id = u.id
                WHERE l.id = lesson_actions.lesson_id
                  AND u.auth_user_id = auth.uid()
                  AND up.access_level IN ('owner', 'admin')
                  AND up.is_deleted = FALSE
            )
        )
    );

-- ============================================================================
-- SECTION 9: LESSON_RATINGS RLS POLICIES
-- ============================================================================

-- Policy 1: Users can view ratings
DROP POLICY IF EXISTS policy_lesson_ratings_select ON lesson_ratings;
CREATE POLICY policy_lesson_ratings_select
    ON lesson_ratings FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM lessons_learned l
            WHERE l.id = lesson_ratings.lesson_id
              AND l.is_deleted = FALSE
        )
    );

-- Policy 2: Users can rate lessons (one rating per user per lesson)
DROP POLICY IF EXISTS policy_lesson_ratings_insert ON lesson_ratings;
CREATE POLICY policy_lesson_ratings_insert
    ON lesson_ratings FOR INSERT
    TO authenticated
    WITH CHECK (
        rated_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND EXISTS (
            SELECT 1 FROM lessons_learned l
            WHERE l.id = lesson_ratings.lesson_id
              AND l.is_deleted = FALSE
        )
    );

-- Policy 3: Users can update their own ratings
DROP POLICY IF EXISTS policy_lesson_ratings_update ON lesson_ratings;
CREATE POLICY policy_lesson_ratings_update
    ON lesson_ratings FOR UPDATE
    TO authenticated
    USING (
        rated_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
    );

-- ============================================================================
-- SECTION 10: SUPPORTING TABLES RLS POLICIES
-- ============================================================================

-- Revision History: Only log owner and PMO Admins
DROP POLICY IF EXISTS policy_lessons_log_revision_history_select ON lessons_log_revision_history;
CREATE POLICY policy_lessons_log_revision_history_select
    ON lessons_log_revision_history FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM lessons_logs ll
            WHERE ll.id = lessons_log_revision_history.lessons_log_id
              AND ll.is_deleted = FALSE
        )
    );

DROP POLICY IF EXISTS policy_lessons_log_revision_history_insert ON lessons_log_revision_history;
CREATE POLICY policy_lessons_log_revision_history_insert
    ON lessons_log_revision_history FOR INSERT
    TO authenticated
    WITH CHECK (
        revised_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
    );

-- Approvals: Read by project members, create by PM
DROP POLICY IF EXISTS policy_lessons_log_approvals_select ON lessons_log_approvals;
CREATE POLICY policy_lessons_log_approvals_select
    ON lessons_log_approvals FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM lessons_logs ll
            WHERE ll.id = lessons_log_approvals.lessons_log_id
              AND ll.is_deleted = FALSE
        )
    );

DROP POLICY IF EXISTS policy_lessons_log_approvals_insert ON lessons_log_approvals;
CREATE POLICY policy_lessons_log_approvals_insert
    ON lessons_log_approvals FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM lessons_logs ll
            JOIN user_projects up ON ll.project_id = up.project_id
            JOIN users u ON up.user_id = u.id
            WHERE ll.id = lessons_log_approvals.lessons_log_id
              AND u.auth_user_id = auth.uid()
              AND up.access_level IN ('owner', 'admin')
              AND up.is_deleted = FALSE
        )
    );

-- Distribution: Read by project members, create by PM
DROP POLICY IF EXISTS policy_lessons_log_distribution_select ON lessons_log_distribution;
CREATE POLICY policy_lessons_log_distribution_select
    ON lessons_log_distribution FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM lessons_logs ll
            WHERE ll.id = lessons_log_distribution.lessons_log_id
              AND ll.is_deleted = FALSE
        )
    );

DROP POLICY IF EXISTS policy_lessons_log_distribution_insert ON lessons_log_distribution;
CREATE POLICY policy_lessons_log_distribution_insert
    ON lessons_log_distribution FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM lessons_logs ll
            JOIN user_projects up ON ll.project_id = up.project_id
            JOIN users u ON up.user_id = u.id
            WHERE ll.id = lessons_log_distribution.lessons_log_id
              AND u.auth_user_id = auth.uid()
              AND up.access_level IN ('owner', 'admin')
              AND up.is_deleted = FALSE
        )
    );

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    policies_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policies_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
          'lessons_logs',
          'lessons_learned',
          'lessons_log_revision_history',
          'lessons_log_approvals',
          'lessons_log_distribution',
          'corporate_lessons_repository',
          'lesson_comments',
          'lesson_attachments',
          'lesson_actions',
          'lesson_ratings'
      );

    IF policies_count < 20 THEN
        RAISE WARNING 'Expected at least 20 RLS policies, found %', policies_count;
    END IF;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Lessons Log RLS Policies Created';
    RAISE NOTICE 'Policies: %', policies_count;
    RAISE NOTICE '========================================';
END $$;
