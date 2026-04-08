-- ============================================================================
-- Project Brief RLS Policies
-- Version: v164
-- Description: Row Level Security policies for all Project Brief tables
-- Date: 2026-01-16
-- ============================================================================
--
-- Purpose:
-- Implements Row Level Security (RLS) for all Project Brief tables to ensure
-- users can only access briefs for projects they're members of or have
-- appropriate permissions for.
--
-- Prerequisites:
-- - v163_project_brief_tables.sql must be run first
-- - All tables must exist
--
-- ============================================================================
-- SECTION 1: GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions to authenticated role BEFORE enabling RLS
GRANT SELECT, INSERT, UPDATE ON project_briefs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON brief_revision_history TO authenticated;
GRANT SELECT, INSERT, UPDATE ON brief_approvals TO authenticated;
GRANT SELECT, INSERT, UPDATE ON brief_distribution TO authenticated;
GRANT SELECT, INSERT, UPDATE ON brief_objectives TO authenticated;
GRANT SELECT, INSERT, UPDATE ON brief_product_descriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON brief_role_descriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON brief_references TO authenticated;
GRANT SELECT, INSERT, UPDATE ON brief_tolerances TO authenticated;

-- ============================================================================
-- SECTION 2: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE project_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE brief_revision_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE brief_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE brief_distribution ENABLE ROW LEVEL SECURITY;
ALTER TABLE brief_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE brief_product_descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE brief_role_descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE brief_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE brief_tolerances ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 3: PROJECT_BRIEFS RLS POLICIES
-- ============================================================================

-- Policy 1: Authenticated users can view briefs for projects they're members of
DROP POLICY IF EXISTS policy_project_briefs_auth_select ON project_briefs;
CREATE POLICY policy_project_briefs_auth_select
    ON project_briefs FOR SELECT
    TO authenticated
    USING (
        is_deleted = FALSE
        AND (
            -- User is project member
            EXISTS (
                SELECT 1 FROM project_members pm
                JOIN users u ON pm.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND pm.project_id = project_briefs.project_id
                  AND pm.is_deleted = FALSE
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

-- Policy 2: Users can create briefs for projects they're members of
DROP POLICY IF EXISTS policy_project_briefs_auth_insert ON project_briefs;
CREATE POLICY policy_project_briefs_auth_insert
    ON project_briefs FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND (
            -- User is project member
            EXISTS (
                SELECT 1 FROM project_members pm
                JOIN users u ON pm.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND pm.project_id = project_briefs.project_id
                  AND pm.is_deleted = FALSE
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
        )
    );

-- Policy 3: Users can update briefs they created (if still draft/rejected)
DROP POLICY IF EXISTS policy_project_briefs_creator_update ON project_briefs;
CREATE POLICY policy_project_briefs_creator_update
    ON project_briefs FOR UPDATE
    TO authenticated
    USING (
        created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND is_deleted = FALSE
        AND document_status IN ('draft', 'rejected')
    )
    WITH CHECK (
        created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND is_deleted = FALSE
    );

-- Policy 4: Project Managers can update briefs for their projects
DROP POLICY IF EXISTS policy_project_briefs_pm_update ON project_briefs;
CREATE POLICY policy_project_briefs_pm_update
    ON project_briefs FOR UPDATE
    TO authenticated
    USING (
        is_deleted = FALSE
        AND document_status IN ('draft', 'rejected')
        AND EXISTS (
            SELECT 1 FROM project_members pm
            JOIN users u ON pm.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND pm.project_id = project_briefs.project_id
              AND pm.role_name = 'Project Manager'
              AND pm.is_deleted = FALSE
        )
    )
    WITH CHECK (
        is_deleted = FALSE
    );

-- Policy 5: PMO Admin can manage all briefs
DROP POLICY IF EXISTS policy_project_briefs_pmo_admin_all ON project_briefs;
CREATE POLICY policy_project_briefs_pmo_admin_all
    ON project_briefs FOR ALL
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
              AND r.is_active = TRUE
        )
    )
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
              AND r.is_active = TRUE
        )
    );

-- Policy 6: System Admin can manage all briefs
DROP POLICY IF EXISTS policy_project_briefs_system_admin_all ON project_briefs;
CREATE POLICY policy_project_briefs_system_admin_all
    ON project_briefs FOR ALL
    TO authenticated
    USING (
        EXISTS (
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
    WITH CHECK (
        EXISTS (
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
    );

-- ============================================================================
-- SECTION 4: CHILD TABLE RLS POLICIES
-- ============================================================================

-- brief_revision_history: Users can view/manage for briefs they can access
DROP POLICY IF EXISTS policy_brief_revision_history_select ON brief_revision_history;
CREATE POLICY policy_brief_revision_history_select
    ON brief_revision_history FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM project_briefs pb
            WHERE pb.id = brief_revision_history.brief_id
              AND pb.is_deleted = FALSE
        )
    );

DROP POLICY IF EXISTS policy_brief_revision_history_insert ON brief_revision_history;
CREATE POLICY policy_brief_revision_history_insert
    ON brief_revision_history FOR INSERT
    TO authenticated
    WITH CHECK (
        revised_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND EXISTS (
            SELECT 1 FROM project_briefs pb
            WHERE pb.id = brief_revision_history.brief_id
              AND pb.is_deleted = FALSE
        )
    );

-- brief_approvals: Users can view/manage for briefs they can access
DROP POLICY IF EXISTS policy_brief_approvals_select ON brief_approvals;
CREATE POLICY policy_brief_approvals_select
    ON brief_approvals FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM project_briefs pb
            WHERE pb.id = brief_approvals.brief_id
              AND pb.is_deleted = FALSE
        )
    );

DROP POLICY IF EXISTS policy_brief_approvals_insert ON brief_approvals;
CREATE POLICY policy_brief_approvals_insert
    ON brief_approvals FOR INSERT
    TO authenticated
    WITH CHECK (
        approver_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND EXISTS (
            SELECT 1 FROM project_briefs pb
            WHERE pb.id = brief_approvals.brief_id
              AND pb.is_deleted = FALSE
        )
    );

DROP POLICY IF EXISTS policy_brief_approvals_update ON brief_approvals;
CREATE POLICY policy_brief_approvals_update
    ON brief_approvals FOR UPDATE
    TO authenticated
    USING (
        approver_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
    )
    WITH CHECK (
        approver_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
    );

-- brief_distribution: Users can view/manage for briefs they can access
DROP POLICY IF EXISTS policy_brief_distribution_select ON brief_distribution;
CREATE POLICY policy_brief_distribution_select
    ON brief_distribution FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM project_briefs pb
            WHERE pb.id = brief_distribution.brief_id
              AND pb.is_deleted = FALSE
        )
    );

DROP POLICY IF EXISTS policy_brief_distribution_insert ON brief_distribution;
CREATE POLICY policy_brief_distribution_insert
    ON brief_distribution FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM project_briefs pb
            WHERE pb.id = brief_distribution.brief_id
              AND pb.is_deleted = FALSE
        )
    );

-- brief_objectives: Users can view/manage for briefs they can access
DROP POLICY IF EXISTS policy_brief_objectives_select ON brief_objectives;
CREATE POLICY policy_brief_objectives_select
    ON brief_objectives FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM project_briefs pb
            WHERE pb.id = brief_objectives.brief_id
              AND pb.is_deleted = FALSE
        )
    );

DROP POLICY IF EXISTS policy_brief_objectives_insert ON brief_objectives;
CREATE POLICY policy_brief_objectives_insert
    ON brief_objectives FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM project_briefs pb
            WHERE pb.id = brief_objectives.brief_id
              AND pb.is_deleted = FALSE
        )
    );

DROP POLICY IF EXISTS policy_brief_objectives_update ON brief_objectives;
CREATE POLICY policy_brief_objectives_update
    ON brief_objectives FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM project_briefs pb
            WHERE pb.id = brief_objectives.brief_id
              AND pb.is_deleted = FALSE
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM project_briefs pb
            WHERE pb.id = brief_objectives.brief_id
              AND pb.is_deleted = FALSE
        )
    );

DROP POLICY IF EXISTS policy_brief_objectives_delete ON brief_objectives;
CREATE POLICY policy_brief_objectives_delete
    ON brief_objectives FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM project_briefs pb
            WHERE pb.id = brief_objectives.brief_id
              AND pb.is_deleted = FALSE
              AND pb.document_status IN ('draft', 'rejected')
        )
    );

-- brief_product_descriptions: Same as brief_objectives
DROP POLICY IF EXISTS policy_brief_product_descriptions_select ON brief_product_descriptions;
CREATE POLICY policy_brief_product_descriptions_select
    ON brief_product_descriptions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM project_briefs pb
            WHERE pb.id = brief_product_descriptions.brief_id
              AND pb.is_deleted = FALSE
        )
    );

DROP POLICY IF EXISTS policy_brief_product_descriptions_insert ON brief_product_descriptions;
CREATE POLICY policy_brief_product_descriptions_insert
    ON brief_product_descriptions FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM project_briefs pb
            WHERE pb.id = brief_product_descriptions.brief_id
              AND pb.is_deleted = FALSE
        )
    );

DROP POLICY IF EXISTS policy_brief_product_descriptions_update ON brief_product_descriptions;
CREATE POLICY policy_brief_product_descriptions_update
    ON brief_product_descriptions FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM project_briefs pb
            WHERE pb.id = brief_product_descriptions.brief_id
              AND pb.is_deleted = FALSE
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM project_briefs pb
            WHERE pb.id = brief_product_descriptions.brief_id
              AND pb.is_deleted = FALSE
        )
    );

DROP POLICY IF EXISTS policy_brief_product_descriptions_delete ON brief_product_descriptions;
CREATE POLICY policy_brief_product_descriptions_delete
    ON brief_product_descriptions FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM project_briefs pb
            WHERE pb.id = brief_product_descriptions.brief_id
              AND pb.is_deleted = FALSE
              AND pb.document_status IN ('draft', 'rejected')
        )
    );

-- brief_role_descriptions: Same as brief_objectives
DROP POLICY IF EXISTS policy_brief_role_descriptions_select ON brief_role_descriptions;
CREATE POLICY policy_brief_role_descriptions_select
    ON brief_role_descriptions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM project_briefs pb
            WHERE pb.id = brief_role_descriptions.brief_id
              AND pb.is_deleted = FALSE
        )
    );

DROP POLICY IF EXISTS policy_brief_role_descriptions_insert ON brief_role_descriptions;
CREATE POLICY policy_brief_role_descriptions_insert
    ON brief_role_descriptions FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM project_briefs pb
            WHERE pb.id = brief_role_descriptions.brief_id
              AND pb.is_deleted = FALSE
        )
    );

DROP POLICY IF EXISTS policy_brief_role_descriptions_update ON brief_role_descriptions;
CREATE POLICY policy_brief_role_descriptions_update
    ON brief_role_descriptions FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM project_briefs pb
            WHERE pb.id = brief_role_descriptions.brief_id
              AND pb.is_deleted = FALSE
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM project_briefs pb
            WHERE pb.id = brief_role_descriptions.brief_id
              AND pb.is_deleted = FALSE
        )
    );

DROP POLICY IF EXISTS policy_brief_role_descriptions_delete ON brief_role_descriptions;
CREATE POLICY policy_brief_role_descriptions_delete
    ON brief_role_descriptions FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM project_briefs pb
            WHERE pb.id = brief_role_descriptions.brief_id
              AND pb.is_deleted = FALSE
              AND pb.document_status IN ('draft', 'rejected')
        )
    );

-- brief_references: Same as brief_objectives
DROP POLICY IF EXISTS policy_brief_references_select ON brief_references;
CREATE POLICY policy_brief_references_select
    ON brief_references FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM project_briefs pb
            WHERE pb.id = brief_references.brief_id
              AND pb.is_deleted = FALSE
        )
    );

DROP POLICY IF EXISTS policy_brief_references_insert ON brief_references;
CREATE POLICY policy_brief_references_insert
    ON brief_references FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM project_briefs pb
            WHERE pb.id = brief_references.brief_id
              AND pb.is_deleted = FALSE
        )
    );

DROP POLICY IF EXISTS policy_brief_references_delete ON brief_references;
CREATE POLICY policy_brief_references_delete
    ON brief_references FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM project_briefs pb
            WHERE pb.id = brief_references.brief_id
              AND pb.is_deleted = FALSE
              AND pb.document_status IN ('draft', 'rejected')
        )
    );

-- brief_tolerances: Same as brief_objectives
DROP POLICY IF EXISTS policy_brief_tolerances_select ON brief_tolerances;
CREATE POLICY policy_brief_tolerances_select
    ON brief_tolerances FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM project_briefs pb
            WHERE pb.id = brief_tolerances.brief_id
              AND pb.is_deleted = FALSE
        )
    );

DROP POLICY IF EXISTS policy_brief_tolerances_insert ON brief_tolerances;
CREATE POLICY policy_brief_tolerances_insert
    ON brief_tolerances FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM project_briefs pb
            WHERE pb.id = brief_tolerances.brief_id
              AND pb.is_deleted = FALSE
        )
    );

DROP POLICY IF EXISTS policy_brief_tolerances_update ON brief_tolerances;
CREATE POLICY policy_brief_tolerances_update
    ON brief_tolerances FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM project_briefs pb
            WHERE pb.id = brief_tolerances.brief_id
              AND pb.is_deleted = FALSE
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM project_briefs pb
            WHERE pb.id = brief_tolerances.brief_id
              AND pb.is_deleted = FALSE
        )
    );

DROP POLICY IF EXISTS policy_brief_tolerances_delete ON brief_tolerances;
CREATE POLICY policy_brief_tolerances_delete
    ON brief_tolerances FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM project_briefs pb
            WHERE pb.id = brief_tolerances.brief_id
              AND pb.is_deleted = FALSE
              AND pb.document_status IN ('draft', 'rejected')
        )
    );

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    v_rls_enabled INTEGER;
    v_policy_count INTEGER;
BEGIN
    -- Check RLS enabled
    SELECT COUNT(*) INTO v_rls_enabled
    FROM pg_class c
    WHERE c.relname IN (
        'project_briefs',
        'brief_revision_history',
        'brief_approvals',
        'brief_distribution',
        'brief_objectives',
        'brief_product_descriptions',
        'brief_role_descriptions',
        'brief_references',
        'brief_tolerances'
    )
    AND c.relrowsecurity = TRUE;
    
    -- Count policies
    SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies
    WHERE tablename LIKE 'brief%' OR tablename = 'project_briefs';
    
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Project Brief RLS Policies Applied';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Tables with RLS Enabled: %', v_rls_enabled;
    RAISE NOTICE 'Policies Created: %', v_policy_count;
    RAISE NOTICE '================================================';
END $$;
