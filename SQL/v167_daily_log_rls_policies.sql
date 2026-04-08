-- ============================================================================
-- Daily Log RLS Policies
-- Version: v167
-- Description: Row Level Security policies for all Daily Log tables
-- Date: 2026-01-19
-- ============================================================================
--
-- Purpose:
-- Implements Row Level Security (RLS) for all Daily Log tables to ensure
-- users can only access logs for projects they're members of or have
-- appropriate permissions for.
--
-- Prerequisites:
-- - v166_daily_log_tables.sql must be run first
-- - All tables must exist
--
-- ============================================================================
-- SECTION 1: GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions to authenticated role BEFORE enabling RLS
GRANT SELECT, INSERT, UPDATE ON daily_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON daily_log_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE ON daily_log_attachments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON daily_log_comments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON daily_log_reminders TO authenticated;

-- ============================================================================
-- SECTION 2: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_log_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_log_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_log_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_log_reminders ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 3: DAILY_LOGS RLS POLICIES
-- ============================================================================

-- Policy 1: Authenticated users can view logs for projects they're members of
DROP POLICY IF EXISTS policy_daily_logs_auth_select ON daily_logs;
CREATE POLICY policy_daily_logs_auth_select
    ON daily_logs FOR SELECT
    TO authenticated
    USING (
        is_deleted = FALSE
        AND (
            -- User is project member
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.project_id = daily_logs.project_id
                  AND up.is_deleted = FALSE
            )
            -- OR user is PMO Admin
            OR EXISTS (
                SELECT 1
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN users u ON ur.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name = 'pmo_admin'
                  AND ur.is_active = TRUE
                  AND ur.is_deleted = FALSE
                  AND r.is_active = TRUE
            )
            -- OR user is System Admin
            OR EXISTS (
                SELECT 1
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN users u ON ur.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name = 'System Admin'
                  AND ur.is_active = TRUE
                  AND ur.is_deleted = FALSE
                  AND r.is_active = TRUE
            )
        )
    );

-- Policy 2: Project Manager can create logs for their projects
DROP POLICY IF EXISTS policy_daily_logs_auth_insert ON daily_logs;
CREATE POLICY policy_daily_logs_auth_insert
    ON daily_logs FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND (
            -- User is project owner/admin
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.project_id = daily_logs.project_id
                  AND up.access_level IN ('owner', 'admin')
                  AND up.is_deleted = FALSE
            )
            -- OR user is PMO Admin
            OR EXISTS (
                SELECT 1
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN users u ON ur.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name = 'pmo_admin'
                  AND ur.is_active = TRUE
                  AND ur.is_deleted = FALSE
            )
            -- OR user is System Admin
            OR EXISTS (
                SELECT 1
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN users u ON ur.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name = 'System Admin'
                  AND ur.is_active = TRUE
                  AND ur.is_deleted = FALSE
            )
        )
    );

-- Policy 3: Project Manager can update visibility settings
DROP POLICY IF EXISTS policy_daily_logs_pm_update ON daily_logs;
CREATE POLICY policy_daily_logs_pm_update
    ON daily_logs FOR UPDATE
    TO authenticated
    USING (
        created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        OR EXISTS (
            SELECT 1 FROM user_projects up
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND up.project_id = daily_logs.project_id
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
    WITH CHECK (
        created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        OR EXISTS (
            SELECT 1 FROM user_projects up
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND up.project_id = daily_logs.project_id
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
    );

-- ============================================================================
-- SECTION 4: DAILY_LOG_ENTRIES RLS POLICIES
-- ============================================================================

-- Policy 1: Users can view entries based on log visibility and entry privacy
DROP POLICY IF EXISTS policy_daily_log_entries_auth_select ON daily_log_entries;
CREATE POLICY policy_daily_log_entries_auth_select
    ON daily_log_entries FOR SELECT
    TO authenticated
    USING (
        is_deleted = FALSE
        AND EXISTS (
            SELECT 1 FROM daily_logs dl
            WHERE dl.id = daily_log_entries.daily_log_id
              AND dl.is_deleted = FALSE
              AND (
                  -- Entry is not private OR user is PM
                  (daily_log_entries.is_private = FALSE OR daily_log_entries.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1))
                  AND (
                      -- Log visibility allows access
                      (dl.visibility = 'public')
                      OR (dl.visibility = 'team' AND EXISTS (
                          SELECT 1 FROM user_projects up
                          JOIN users u ON up.user_id = u.id
                          WHERE u.auth_user_id = auth.uid()
                            AND up.project_id = dl.project_id
                            AND up.is_deleted = FALSE
                      ))
                      OR (dl.visibility = 'stakeholders' AND EXISTS (
                          SELECT 1 FROM user_projects up
                          JOIN users u ON up.user_id = u.id
                          WHERE u.auth_user_id = auth.uid()
                            AND up.project_id = dl.project_id
                            AND up.is_deleted = FALSE
                      ))
                      OR (dl.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1))
                  )
                  -- OR user is assigned to entry
                  OR daily_log_entries.person_responsible_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                  -- OR user is PMO Admin
                  OR EXISTS (
                      SELECT 1
                      FROM user_roles ur
                      JOIN roles r ON ur.role_id = r.id
                      JOIN users u ON ur.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND r.role_name = 'pmo_admin'
                        AND ur.is_active = TRUE
                        AND ur.is_deleted = FALSE
                  )
                  -- OR user is System Admin
                  OR EXISTS (
                      SELECT 1
                      FROM user_roles ur
                      JOIN roles r ON ur.role_id = r.id
                      JOIN users u ON ur.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND r.role_name = 'System Admin'
                        AND ur.is_active = TRUE
                        AND ur.is_deleted = FALSE
                  )
              )
        )
    );

-- Policy 2: Users can create entries for logs they can view
DROP POLICY IF EXISTS policy_daily_log_entries_auth_insert ON daily_log_entries;
CREATE POLICY policy_daily_log_entries_auth_insert
    ON daily_log_entries FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND EXISTS (
            SELECT 1 FROM daily_logs dl
            WHERE dl.id = daily_log_entries.daily_log_id
              AND dl.is_deleted = FALSE
              AND (
                  -- User is PM
                  dl.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                  -- OR user is project member
                  OR EXISTS (
                      SELECT 1 FROM user_projects up
                      JOIN users u ON up.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND up.project_id = dl.project_id
                        AND up.is_deleted = FALSE
                  )
                  -- OR user is PMO Admin
                  OR EXISTS (
                      SELECT 1
                      FROM user_roles ur
                      JOIN roles r ON ur.role_id = r.id
                      JOIN users u ON ur.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND r.role_name = 'pmo_admin'
                        AND ur.is_active = TRUE
                        AND ur.is_deleted = FALSE
                  )
                  -- OR user is System Admin
                  OR EXISTS (
                      SELECT 1
                      FROM user_roles ur
                      JOIN roles r ON ur.role_id = r.id
                      JOIN users u ON ur.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND r.role_name = 'System Admin'
                        AND ur.is_active = TRUE
                        AND ur.is_deleted = FALSE
                  )
              )
        )
    );

-- Policy 3: Entry creator or PM can update entries
DROP POLICY IF EXISTS policy_daily_log_entries_auth_update ON daily_log_entries;
CREATE POLICY policy_daily_log_entries_auth_update
    ON daily_log_entries FOR UPDATE
    TO authenticated
    USING (
        created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        OR EXISTS (
            SELECT 1 FROM daily_logs dl
            WHERE dl.id = daily_log_entries.daily_log_id
              AND dl.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
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
    WITH CHECK (
        created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        OR EXISTS (
            SELECT 1 FROM daily_logs dl
            WHERE dl.id = daily_log_entries.daily_log_id
              AND dl.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
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
    );

-- Policy 4: Entry creator or PM can delete entries
DROP POLICY IF EXISTS policy_daily_log_entries_auth_delete ON daily_log_entries;
CREATE POLICY policy_daily_log_entries_auth_delete
    ON daily_log_entries FOR DELETE
    TO authenticated
    USING (
        created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        OR EXISTS (
            SELECT 1 FROM daily_logs dl
            WHERE dl.id = daily_log_entries.daily_log_id
              AND dl.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
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
    );

-- ============================================================================
-- SECTION 5: DAILY_LOG_ATTACHMENTS RLS POLICIES
-- ============================================================================

-- Policy 1: Users can view attachments for entries they can view
DROP POLICY IF EXISTS policy_daily_log_attachments_auth_select ON daily_log_attachments;
CREATE POLICY policy_daily_log_attachments_auth_select
    ON daily_log_attachments FOR SELECT
    TO authenticated
    USING (
        is_deleted = FALSE
        AND EXISTS (
            SELECT 1 FROM daily_log_entries e
            JOIN daily_logs dl ON e.daily_log_id = dl.id
            WHERE e.id = daily_log_attachments.entry_id
              AND e.is_deleted = FALSE
              AND dl.is_deleted = FALSE
              -- Use same visibility rules as entries
              AND (
                  (e.is_private = FALSE OR e.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1))
                  AND (
                      (dl.visibility = 'public')
                      OR (dl.visibility IN ('team', 'stakeholders') AND EXISTS (
                          SELECT 1 FROM user_projects up
                          JOIN users u ON up.user_id = u.id
                          WHERE u.auth_user_id = auth.uid()
                            AND up.project_id = dl.project_id
                            AND up.is_deleted = FALSE
                      ))
                      OR (dl.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1))
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
        )
    );

-- Policy 2: Users can upload attachments for entries they can edit
DROP POLICY IF EXISTS policy_daily_log_attachments_auth_insert ON daily_log_attachments;
CREATE POLICY policy_daily_log_attachments_auth_insert
    ON daily_log_attachments FOR INSERT
    TO authenticated
    WITH CHECK (
        uploaded_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND EXISTS (
            SELECT 1 FROM daily_log_entries e
            WHERE e.id = daily_log_attachments.entry_id
              AND e.is_deleted = FALSE
              AND (
                  e.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                  OR EXISTS (
                      SELECT 1 FROM daily_logs dl
                      WHERE dl.id = e.daily_log_id
                        AND dl.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
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

-- Policy 3: Uploader or PM can delete attachments
DROP POLICY IF EXISTS policy_daily_log_attachments_auth_delete ON daily_log_attachments;
CREATE POLICY policy_daily_log_attachments_auth_delete
    ON daily_log_attachments FOR DELETE
    TO authenticated
    USING (
        uploaded_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        OR EXISTS (
            SELECT 1 FROM daily_log_entries e
            JOIN daily_logs dl ON e.daily_log_id = dl.id
            WHERE e.id = daily_log_attachments.entry_id
              AND dl.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
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
    );

-- ============================================================================
-- SECTION 6: DAILY_LOG_COMMENTS RLS POLICIES
-- ============================================================================

-- Policy 1: Users can view comments for entries they can view
DROP POLICY IF EXISTS policy_daily_log_comments_auth_select ON daily_log_comments;
CREATE POLICY policy_daily_log_comments_auth_select
    ON daily_log_comments FOR SELECT
    TO authenticated
    USING (
        is_deleted = FALSE
        AND EXISTS (
            SELECT 1 FROM daily_log_entries e
            JOIN daily_logs dl ON e.daily_log_id = dl.id
            WHERE e.id = daily_log_comments.entry_id
              AND e.is_deleted = FALSE
              AND dl.is_deleted = FALSE
              -- Use same visibility rules as entries
              AND (
                  (e.is_private = FALSE OR e.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1))
                  AND (
                      (dl.visibility = 'public')
                      OR (dl.visibility IN ('team', 'stakeholders') AND EXISTS (
                          SELECT 1 FROM user_projects up
                          JOIN users u ON up.user_id = u.id
                          WHERE u.auth_user_id = auth.uid()
                            AND up.project_id = dl.project_id
                            AND up.is_deleted = FALSE
                      ))
                      OR (dl.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1))
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
        )
    );

-- Policy 2: Users can create comments for entries they can view
DROP POLICY IF EXISTS policy_daily_log_comments_auth_insert ON daily_log_comments;
CREATE POLICY policy_daily_log_comments_auth_insert
    ON daily_log_comments FOR INSERT
    TO authenticated
    WITH CHECK (
        commented_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND EXISTS (
            SELECT 1 FROM daily_log_entries e
            JOIN daily_logs dl ON e.daily_log_id = dl.id
            WHERE e.id = daily_log_comments.entry_id
              AND e.is_deleted = FALSE
              AND dl.is_deleted = FALSE
              -- User can view the entry
              AND (
                  (e.is_private = FALSE OR e.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1))
                  AND (
                      (dl.visibility = 'public')
                      OR (dl.visibility IN ('team', 'stakeholders') AND EXISTS (
                          SELECT 1 FROM user_projects up
                          JOIN users u ON up.user_id = u.id
                          WHERE u.auth_user_id = auth.uid()
                            AND up.project_id = dl.project_id
                            AND up.is_deleted = FALSE
                      ))
                      OR (dl.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1))
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
        )
    );

-- Policy 3: Comment author can update their own comments
DROP POLICY IF EXISTS policy_daily_log_comments_auth_update ON daily_log_comments;
CREATE POLICY policy_daily_log_comments_auth_update
    ON daily_log_comments FOR UPDATE
    TO authenticated
    USING (
        commented_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
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
    WITH CHECK (
        commented_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
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
    );

-- Policy 4: Comment author or PM can delete comments
DROP POLICY IF EXISTS policy_daily_log_comments_auth_delete ON daily_log_comments;
CREATE POLICY policy_daily_log_comments_auth_delete
    ON daily_log_comments FOR DELETE
    TO authenticated
    USING (
        commented_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        OR EXISTS (
            SELECT 1 FROM daily_log_entries e
            JOIN daily_logs dl ON e.daily_log_id = dl.id
            WHERE e.id = daily_log_comments.entry_id
              AND dl.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
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
    );

-- ============================================================================
-- SECTION 7: DAILY_LOG_REMINDERS RLS POLICIES
-- ============================================================================

-- Policy 1: Users can view reminders for entries they can view
DROP POLICY IF EXISTS policy_daily_log_reminders_auth_select ON daily_log_reminders;
CREATE POLICY policy_daily_log_reminders_auth_select
    ON daily_log_reminders FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM daily_log_entries e
            JOIN daily_logs dl ON e.daily_log_id = dl.id
            WHERE e.id = daily_log_reminders.entry_id
              AND e.is_deleted = FALSE
              AND dl.is_deleted = FALSE
              -- Use same visibility rules as entries
              AND (
                  (e.is_private = FALSE OR e.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1))
                  AND (
                      (dl.visibility = 'public')
                      OR (dl.visibility IN ('team', 'stakeholders') AND EXISTS (
                          SELECT 1 FROM user_projects up
                          JOIN users u ON up.user_id = u.id
                          WHERE u.auth_user_id = auth.uid()
                            AND up.project_id = dl.project_id
                            AND up.is_deleted = FALSE
                      ))
                      OR (dl.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1))
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
                  -- OR user is assigned to entry
                  OR e.person_responsible_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
              )
        )
    );

-- Policy 2: Users can create reminders for entries they can edit
DROP POLICY IF EXISTS policy_daily_log_reminders_auth_insert ON daily_log_reminders;
CREATE POLICY policy_daily_log_reminders_auth_insert
    ON daily_log_reminders FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM daily_log_entries e
            WHERE e.id = daily_log_reminders.entry_id
              AND e.is_deleted = FALSE
              AND (
                  e.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                  OR EXISTS (
                      SELECT 1 FROM daily_logs dl
                      WHERE dl.id = e.daily_log_id
                        AND dl.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
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

-- Policy 3: Users can update/delete reminders for entries they can edit
DROP POLICY IF EXISTS policy_daily_log_reminders_auth_update ON daily_log_reminders;
CREATE POLICY policy_daily_log_reminders_auth_update
    ON daily_log_reminders FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM daily_log_entries e
            WHERE e.id = daily_log_reminders.entry_id
              AND e.is_deleted = FALSE
              AND (
                  e.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                  OR EXISTS (
                      SELECT 1 FROM daily_logs dl
                      WHERE dl.id = e.daily_log_id
                        AND dl.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
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

DROP POLICY IF EXISTS policy_daily_log_reminders_auth_delete ON daily_log_reminders;
CREATE POLICY policy_daily_log_reminders_auth_delete
    ON daily_log_reminders FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM daily_log_entries e
            WHERE e.id = daily_log_reminders.entry_id
              AND e.is_deleted = FALSE
              AND (
                  e.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                  OR EXISTS (
                      SELECT 1 FROM daily_logs dl
                      WHERE dl.id = e.daily_log_id
                        AND dl.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
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
      AND tablename IN ('daily_logs', 'daily_log_entries', 'daily_log_attachments', 'daily_log_comments', 'daily_log_reminders');

    IF policies_count < 10 THEN
        RAISE WARNING 'Expected at least 10 RLS policies, found %', policies_count;
    END IF;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Daily Log RLS Policies Created Successfully';
    RAISE NOTICE 'Policies: %', policies_count;
    RAISE NOTICE '========================================';
END $$;
