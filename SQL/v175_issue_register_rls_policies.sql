-- ============================================================================
-- Issue Register RLS Policies
-- Version: v175
-- Description: Row Level Security policies for unified Issue Register module
-- Date: 2026-01-19
-- ============================================================================
--
-- Purpose:
-- Implements Row Level Security (RLS) for all Issue Register tables to ensure
-- users can only access registers and issues for projects they're members of
-- or have appropriate permissions for.
--
-- Prerequisites:
-- - v174_issue_register_tables.sql must be run first
-- - All tables must exist
--
-- ============================================================================
-- SECTION 1: GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON issue_registers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON issue_actions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON issue_status_history TO authenticated;
GRANT SELECT, INSERT, UPDATE ON issue_decisions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON issue_links TO authenticated;
GRANT SELECT, INSERT, UPDATE ON issue_watchers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON issue_priority_scales TO authenticated;
GRANT SELECT, INSERT, UPDATE ON issue_severity_scales TO authenticated;

-- Note: issues, issue_comments, issue_attachments already have grants from v25

-- ============================================================================
-- SECTION 2: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE issue_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_watchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_priority_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_severity_scales ENABLE ROW LEVEL SECURITY;

-- Note: issues, issue_comments, issue_attachments RLS should be enabled in v25 or separate file

-- ============================================================================
-- SECTION 3: ISSUE_REGISTERS RLS POLICIES
-- ============================================================================

-- Policy 1: Authenticated users can view registers for projects they're members of
DROP POLICY IF EXISTS policy_issue_registers_auth_select ON issue_registers;
CREATE POLICY policy_issue_registers_auth_select
    ON issue_registers FOR SELECT
    TO authenticated
    USING (
        is_deleted = FALSE
        AND (
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.project_id = issue_registers.project_id
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

-- Policy 2: Project Manager can create registers for their projects
DROP POLICY IF EXISTS policy_issue_registers_auth_insert ON issue_registers;
CREATE POLICY policy_issue_registers_auth_insert
    ON issue_registers FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND (
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.project_id = issue_registers.project_id
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

-- Policy 3: Project Manager and Team Managers can update registers
DROP POLICY IF EXISTS policy_issue_registers_auth_update ON issue_registers;
CREATE POLICY policy_issue_registers_auth_update
    ON issue_registers FOR UPDATE
    TO authenticated
    USING (
        is_deleted = FALSE
        AND (
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.project_id = issue_registers.project_id
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
-- SECTION 4: ISSUES RLS POLICIES (Enhanced)
-- ============================================================================

-- Note: If issues table RLS is not already enabled, enable it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables t
        JOIN pg_policies p ON p.tablename = t.tablename
        WHERE t.tablename = 'issues' AND p.policyname LIKE 'policy_issues%'
    ) THEN
        ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Policy 1: Users can view issues for projects they're members of
DROP POLICY IF EXISTS policy_issues_auth_select ON issues;
CREATE POLICY policy_issues_auth_select
    ON issues FOR SELECT
    TO authenticated
    USING (
        is_deleted = FALSE
        AND (
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.project_id = issues.project_id
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

-- Policy 2: Any team member can add issues
DROP POLICY IF EXISTS policy_issues_auth_insert ON issues;
CREATE POLICY policy_issues_auth_insert
    ON issues FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND (
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.project_id = issues.project_id
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

-- Policy 3: PM, Team Managers, and issue owners can update issues
DROP POLICY IF EXISTS policy_issues_auth_update ON issues;
CREATE POLICY policy_issues_auth_update
    ON issues FOR UPDATE
    TO authenticated
    USING (
        is_deleted = FALSE
        AND (
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.project_id = issues.project_id
                  AND up.access_level IN ('owner', 'admin')
                  AND up.is_deleted = FALSE
            )
            OR (
                owner_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                AND owner_id IS NOT NULL
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
-- SECTION 5: ISSUE_ACTIONS RLS POLICIES
-- ============================================================================

-- Policy 1: Users can view actions for issues they can view
DROP POLICY IF EXISTS policy_issue_actions_auth_select ON issue_actions;
CREATE POLICY policy_issue_actions_auth_select
    ON issue_actions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM issues i
            WHERE i.id = issue_actions.issue_id
              AND i.is_deleted = FALSE
              AND (
                  EXISTS (
                      SELECT 1 FROM user_projects up
                      JOIN users u ON up.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND up.project_id = i.project_id
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

-- Policy 2: Team members can add actions
DROP POLICY IF EXISTS policy_issue_actions_auth_insert ON issue_actions;
CREATE POLICY policy_issue_actions_auth_insert
    ON issue_actions FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND EXISTS (
            SELECT 1 FROM issues i
            WHERE i.id = issue_actions.issue_id
              AND i.is_deleted = FALSE
              AND (
                  EXISTS (
                      SELECT 1 FROM user_projects up
                      JOIN users u ON up.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND up.project_id = i.project_id
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
        )
    );

-- Policy 3: Assigned user, PM, or Team Managers can update actions
DROP POLICY IF EXISTS policy_issue_actions_auth_update ON issue_actions;
CREATE POLICY policy_issue_actions_auth_update
    ON issue_actions FOR UPDATE
    TO authenticated
    USING (
        (
            assigned_to_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
            AND assigned_to_id IS NOT NULL
        )
        OR EXISTS (
            SELECT 1 FROM issues i
            WHERE i.id = issue_actions.issue_id
              AND i.is_deleted = FALSE
              AND (
                  EXISTS (
                      SELECT 1 FROM user_projects up
                      JOIN users u ON up.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND up.project_id = i.project_id
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
        )
    );

-- ============================================================================
-- SECTION 6: ISSUE_STATUS_HISTORY RLS POLICIES
-- ============================================================================

-- Policy: Users can view status history for issues they can view
DROP POLICY IF EXISTS policy_issue_status_history_auth_select ON issue_status_history;
CREATE POLICY policy_issue_status_history_auth_select
    ON issue_status_history FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM issues i
            WHERE i.id = issue_status_history.issue_id
              AND i.is_deleted = FALSE
              AND (
                  EXISTS (
                      SELECT 1 FROM user_projects up
                      JOIN users u ON up.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND up.project_id = i.project_id
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

-- Note: Status history is read-only (inserted by triggers), so no INSERT/UPDATE policies needed

-- ============================================================================
-- SECTION 7: ISSUE_DECISIONS RLS POLICIES
-- ============================================================================

-- Policy 1: Users can view decisions for issues they can view
DROP POLICY IF EXISTS policy_issue_decisions_auth_select ON issue_decisions;
CREATE POLICY policy_issue_decisions_auth_select
    ON issue_decisions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM issues i
            WHERE i.id = issue_decisions.issue_id
              AND i.is_deleted = FALSE
              AND (
                  EXISTS (
                      SELECT 1 FROM user_projects up
                      JOIN users u ON up.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND up.project_id = i.project_id
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

-- Policy 2: PM, Team Managers, and designated decision makers can record decisions
DROP POLICY IF EXISTS policy_issue_decisions_auth_insert ON issue_decisions;
CREATE POLICY policy_issue_decisions_auth_insert
    ON issue_decisions FOR INSERT
    TO authenticated
    WITH CHECK (
        decision_maker_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND EXISTS (
            SELECT 1 FROM issues i
            WHERE i.id = issue_decisions.issue_id
              AND i.is_deleted = FALSE
              AND (
                  EXISTS (
                      SELECT 1 FROM user_projects up
                      JOIN users u ON up.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND up.project_id = i.project_id
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
        )
    );

-- ============================================================================
-- SECTION 8: ISSUE_LINKS RLS POLICIES
-- ============================================================================

-- Policy 1: Users can view links for issues they can view
DROP POLICY IF EXISTS policy_issue_links_auth_select ON issue_links;
CREATE POLICY policy_issue_links_auth_select
    ON issue_links FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM issues i
            WHERE i.id = issue_links.source_issue_id
              AND i.is_deleted = FALSE
              AND (
                  EXISTS (
                      SELECT 1 FROM user_projects up
                      JOIN users u ON up.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND up.project_id = i.project_id
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

-- Policy 2: Team members can create links
DROP POLICY IF EXISTS policy_issue_links_auth_insert ON issue_links;
CREATE POLICY policy_issue_links_auth_insert
    ON issue_links FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND EXISTS (
            SELECT 1 FROM issues i
            WHERE i.id = issue_links.source_issue_id
              AND i.is_deleted = FALSE
              AND (
                  EXISTS (
                      SELECT 1 FROM user_projects up
                      JOIN users u ON up.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND up.project_id = i.project_id
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
        )
    );

-- ============================================================================
-- SECTION 9: ISSUE_WATCHERS RLS POLICIES
-- ============================================================================

-- Policy 1: Users can view watchers for issues they can view
DROP POLICY IF EXISTS policy_issue_watchers_auth_select ON issue_watchers;
CREATE POLICY policy_issue_watchers_auth_select
    ON issue_watchers FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM issues i
            WHERE i.id = issue_watchers.issue_id
              AND i.is_deleted = FALSE
              AND (
                  EXISTS (
                      SELECT 1 FROM user_projects up
                      JOIN users u ON up.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND up.project_id = i.project_id
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

-- Policy 2: Users can watch/unwatch issues they can view
DROP POLICY IF EXISTS policy_issue_watchers_auth_insert ON issue_watchers;
CREATE POLICY policy_issue_watchers_auth_insert
    ON issue_watchers FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND EXISTS (
            SELECT 1 FROM issues i
            WHERE i.id = issue_watchers.issue_id
              AND i.is_deleted = FALSE
              AND (
                  EXISTS (
                      SELECT 1 FROM user_projects up
                      JOIN users u ON up.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND up.project_id = i.project_id
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

-- Policy 3: Users can update their own watcher preferences
DROP POLICY IF EXISTS policy_issue_watchers_auth_update ON issue_watchers;
CREATE POLICY policy_issue_watchers_auth_update
    ON issue_watchers FOR UPDATE
    TO authenticated
    USING (
        user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
    );

-- Policy 4: Users can delete their own watcher entries
DROP POLICY IF EXISTS policy_issue_watchers_auth_delete ON issue_watchers;
CREATE POLICY policy_issue_watchers_auth_delete
    ON issue_watchers FOR DELETE
    TO authenticated
    USING (
        user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
    );

-- ============================================================================
-- SECTION 10: ISSUE_PRIORITY_SCALES RLS POLICIES
-- ============================================================================

-- Policy 1: Users can view scales for their organisation
DROP POLICY IF EXISTS policy_issue_priority_scales_auth_select ON issue_priority_scales;
CREATE POLICY policy_issue_priority_scales_auth_select
    ON issue_priority_scales FOR SELECT
    TO authenticated
    USING (
        is_active = TRUE
        AND EXISTS (
            SELECT 1 FROM projects p
            JOIN user_projects up ON p.id = up.project_id
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND p.account_id = issue_priority_scales.organisation_id
              AND up.is_deleted = FALSE
        )
    );

-- Policy 2: PMO Admins can manage scales for their organisation
DROP POLICY IF EXISTS policy_issue_priority_scales_auth_insert ON issue_priority_scales;
CREATE POLICY policy_issue_priority_scales_auth_insert
    ON issue_priority_scales FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
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

DROP POLICY IF EXISTS policy_issue_priority_scales_auth_update ON issue_priority_scales;
CREATE POLICY policy_issue_priority_scales_auth_update
    ON issue_priority_scales FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
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
-- SECTION 11: ISSUE_SEVERITY_SCALES RLS POLICIES
-- ============================================================================

-- Policy 1: Users can view scales for their organisation
DROP POLICY IF EXISTS policy_issue_severity_scales_auth_select ON issue_severity_scales;
CREATE POLICY policy_issue_severity_scales_auth_select
    ON issue_severity_scales FOR SELECT
    TO authenticated
    USING (
        is_active = TRUE
        AND EXISTS (
            SELECT 1 FROM projects p
            JOIN user_projects up ON p.id = up.project_id
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND p.account_id = issue_severity_scales.organisation_id
              AND up.is_deleted = FALSE
        )
    );

-- Policy 2: PMO Admins can manage scales for their organisation
DROP POLICY IF EXISTS policy_issue_severity_scales_auth_insert ON issue_severity_scales;
CREATE POLICY policy_issue_severity_scales_auth_insert
    ON issue_severity_scales FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
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

DROP POLICY IF EXISTS policy_issue_severity_scales_auth_update ON issue_severity_scales;
CREATE POLICY policy_issue_severity_scales_auth_update
    ON issue_severity_scales FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
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
-- SECTION 12: VERIFICATION
-- ============================================================================

DO $$
DECLARE
    v_policies_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_policies_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
          'issue_registers',
          'issue_actions',
          'issue_status_history',
          'issue_decisions',
          'issue_links',
          'issue_watchers',
          'issue_priority_scales',
          'issue_severity_scales'
      );

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Issue Register RLS Policies Created';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'RLS Policies Created: %', v_policies_count;
    RAISE NOTICE '================================================';
    RAISE NOTICE 'v175_issue_register_rls_policies.sql completed successfully';
    RAISE NOTICE '================================================';
END $$;

-- ============================================================================
-- END OF FILE
-- ============================================================================
