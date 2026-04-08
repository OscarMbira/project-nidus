-- ============================================================================
-- Defect Management RLS Policies
-- Version: v343
-- Description: Row Level Security for defects, defect_comments,
--              defect_attachments, defect_history
-- Date: 2026-03-27
-- ============================================================================

-- ============================================================================
-- SECTION 1: GRANT TABLE PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON defects             TO authenticated;
GRANT SELECT, INSERT, UPDATE ON defect_comments     TO authenticated;
GRANT SELECT, INSERT, UPDATE ON defect_attachments  TO authenticated;
GRANT SELECT               ON defect_history       TO authenticated;

GRANT USAGE, SELECT ON SEQUENCE defect_ref_seq TO authenticated;

-- ============================================================================
-- SECTION 2: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE defects            ENABLE ROW LEVEL SECURITY;
ALTER TABLE defect_comments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE defect_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE defect_history     ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 3: DEFECTS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS policy_defects_select ON defects;
CREATE POLICY policy_defects_select
    ON defects FOR SELECT
    TO authenticated
    USING (
        is_deleted = FALSE
        AND (
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.project_id  = defects.project_id
                  AND up.is_deleted  = FALSE
            )
            OR EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN users u ON ur.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name IN ('pmo_admin','System Admin')
                  AND ur.is_active   = TRUE
                  AND ur.is_deleted  = FALSE
            )
        )
    );

DROP POLICY IF EXISTS policy_defects_insert ON defects;
CREATE POLICY policy_defects_insert
    ON defects FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_projects up
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND up.project_id  = defects.project_id
              AND up.is_deleted  = FALSE
        )
        OR EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            JOIN users u ON ur.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name IN ('pmo_admin','System Admin')
              AND ur.is_active   = TRUE
              AND ur.is_deleted  = FALSE
        )
    );

DROP POLICY IF EXISTS policy_defects_update ON defects;
CREATE POLICY policy_defects_update
    ON defects FOR UPDATE
    TO authenticated
    USING (
        is_deleted = FALSE
        AND (
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.project_id  = defects.project_id
                  AND up.is_deleted  = FALSE
            )
            OR EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN users u ON ur.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name IN ('pmo_admin','System Admin')
                  AND ur.is_active   = TRUE
                  AND ur.is_deleted  = FALSE
            )
        )
    );

-- ============================================================================
-- SECTION 4: DEFECT_COMMENTS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS policy_defect_comments_select ON defect_comments;
CREATE POLICY policy_defect_comments_select
    ON defect_comments FOR SELECT
    TO authenticated
    USING (
        is_deleted = FALSE
        AND EXISTS (
            SELECT 1 FROM defects d
            JOIN user_projects up ON up.project_id = d.project_id
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND d.id           = defect_comments.defect_id
              AND d.is_deleted   = FALSE
              AND up.is_deleted  = FALSE
        )
    );

DROP POLICY IF EXISTS policy_defect_comments_insert ON defect_comments;
CREATE POLICY policy_defect_comments_insert
    ON defect_comments FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM defects d
            JOIN user_projects up ON up.project_id = d.project_id
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND d.id           = defect_comments.defect_id
              AND d.is_deleted   = FALSE
              AND up.is_deleted  = FALSE
        )
    );

DROP POLICY IF EXISTS policy_defect_comments_update ON defect_comments;
CREATE POLICY policy_defect_comments_update
    ON defect_comments FOR UPDATE
    TO authenticated
    USING (
        is_deleted = FALSE
        AND EXISTS (
            SELECT 1 FROM defects d
            JOIN user_projects up ON up.project_id = d.project_id
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND d.id           = defect_comments.defect_id
              AND d.is_deleted   = FALSE
              AND up.is_deleted  = FALSE
        )
    );

-- ============================================================================
-- SECTION 5: DEFECT_ATTACHMENTS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS policy_defect_attachments_select ON defect_attachments;
CREATE POLICY policy_defect_attachments_select
    ON defect_attachments FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM defects d
            JOIN user_projects up ON up.project_id = d.project_id
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND d.id           = defect_attachments.defect_id
              AND d.is_deleted   = FALSE
              AND up.is_deleted  = FALSE
        )
    );

DROP POLICY IF EXISTS policy_defect_attachments_insert ON defect_attachments;
CREATE POLICY policy_defect_attachments_insert
    ON defect_attachments FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM defects d
            JOIN user_projects up ON up.project_id = d.project_id
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND d.id           = defect_attachments.defect_id
              AND d.is_deleted   = FALSE
              AND up.is_deleted  = FALSE
        )
    );

DROP POLICY IF EXISTS policy_defect_attachments_delete ON defect_attachments;
CREATE POLICY policy_defect_attachments_delete
    ON defect_attachments FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM defects d
            JOIN user_projects up ON up.project_id = d.project_id
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND d.id           = defect_attachments.defect_id
              AND d.is_deleted   = FALSE
              AND up.is_deleted  = FALSE
        )
    );

-- ============================================================================
-- SECTION 6: DEFECT_HISTORY RLS POLICIES (read-only for project members)
-- ============================================================================

DROP POLICY IF EXISTS policy_defect_history_select ON defect_history;
CREATE POLICY policy_defect_history_select
    ON defect_history FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM defects d
            JOIN user_projects up ON up.project_id = d.project_id
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND d.id           = defect_history.defect_id
              AND d.is_deleted   = FALSE
              AND up.is_deleted  = FALSE
        )
        OR EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            JOIN users u ON ur.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name IN ('pmo_admin','System Admin')
              AND ur.is_active   = TRUE
              AND ur.is_deleted  = FALSE
        )
    );

-- Internal write policy for the audit trigger function (uses security definer)
DROP POLICY IF EXISTS policy_defect_history_insert ON defect_history;
CREATE POLICY policy_defect_history_insert
    ON defect_history FOR INSERT
    TO authenticated
    WITH CHECK (TRUE);  -- Inserts only happen via the fn_log_defect_history() trigger
