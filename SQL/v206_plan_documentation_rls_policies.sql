-- ============================================================================
-- Plan Documentation RLS Policies
-- Version: v206
-- Description: Row Level Security policies for Plan Documentation tables
-- Date: 2026-01-20
-- ============================================================================
--
-- Purpose:
-- Implements Row Level Security (RLS) for all Plan Documentation tables to ensure
-- users can only access plans for projects they're members of or have appropriate
-- permissions for.
--
-- Prerequisites:
-- - v205_project_plan_tables.sql must be run first
-- - All tables must exist
--
-- ============================================================================
-- SECTION 1: GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON project_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE ON stage_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE ON project_plan_milestones TO authenticated;
GRANT SELECT, INSERT, UPDATE ON project_plan_resources TO authenticated;
GRANT SELECT, INSERT, UPDATE ON stage_plan_milestones TO authenticated;
GRANT SELECT, INSERT, UPDATE ON stage_plan_resources TO authenticated;
GRANT SELECT, INSERT, UPDATE ON stage_plan_products TO authenticated;
GRANT SELECT, INSERT, UPDATE ON plan_revision_history TO authenticated;
GRANT SELECT, INSERT, UPDATE ON plan_approvals TO authenticated;
GRANT SELECT, INSERT, UPDATE ON plan_distribution TO authenticated;

-- ============================================================================
-- SECTION 2: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE project_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_plan_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_plan_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_plan_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_plan_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_plan_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_revision_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_distribution ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 3: HELPER FUNCTION - CHECK PLAN ACCESS
-- ============================================================================

-- Helper function to check if user has access to a plan
CREATE OR REPLACE FUNCTION check_plan_access(
    p_plan_id UUID,
    p_plan_type VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
    v_project_id UUID;
BEGIN
    IF p_plan_type = 'project_plan' THEN
        SELECT project_id INTO v_project_id
        FROM project_plans
        WHERE id = p_plan_id
        AND is_deleted = FALSE;
    ELSIF p_plan_type = 'stage_plan' THEN
        SELECT project_id INTO v_project_id
        FROM stage_plans
        WHERE id = p_plan_id
        AND is_deleted = FALSE;
    ELSE
        RETURN FALSE;
    END IF;

    IF v_project_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Check if user is project member
    RETURN EXISTS (
        SELECT 1 FROM user_projects up
        JOIN users u ON up.user_id = u.id
        WHERE u.auth_user_id = auth.uid()
        AND up.project_id = v_project_id
        AND up.is_deleted = FALSE
    )
    OR EXISTS (
        -- PMO Admin or System Admin
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND r.role_name IN ('pmo_admin', 'System Admin')
        AND ur.is_active = TRUE
        AND ur.is_deleted = FALSE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog, auth;

COMMENT ON FUNCTION check_plan_access(UUID, VARCHAR) IS 'Checks if user has access to a plan (project member, PMO Admin, or System Admin)';

-- ============================================================================
-- SECTION 4: PROJECT_PLANS RLS POLICIES
-- ============================================================================

-- Policy 1: Users can view project plans for projects they're members of
DROP POLICY IF EXISTS policy_project_plans_auth_select ON project_plans;
CREATE POLICY policy_project_plans_auth_select
    ON project_plans FOR SELECT
    TO authenticated
    USING (
        is_deleted = FALSE
        AND (
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.project_id = project_plans.project_id
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

-- Policy 2: Project Managers and PMO Admins can create project plans
DROP POLICY IF EXISTS policy_project_plans_auth_insert ON project_plans;
CREATE POLICY policy_project_plans_auth_insert
    ON project_plans FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND (
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.project_id = project_plans.project_id
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

-- Policy 3: Authors and PMO Admins can edit plans (if not baseline)
DROP POLICY IF EXISTS policy_project_plans_auth_update ON project_plans;
CREATE POLICY policy_project_plans_auth_update
    ON project_plans FOR UPDATE
    TO authenticated
    USING (
        is_deleted = FALSE
        AND (
            -- PMO Admins can always edit (except baseline)
            EXISTS (
                SELECT 1
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN users u ON ur.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name IN ('pmo_admin', 'System Admin')
                  AND ur.is_active = TRUE
                  AND ur.is_deleted = FALSE
                  AND project_plans.is_baseline = FALSE -- Cannot edit baseline
            )
            OR (
                -- Authors can edit if not baseline and not approved
                (project_plans.is_baseline = FALSE AND project_plans.status IN ('draft', 'under_review'))
                AND (
                    author_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                    OR owner_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                    OR created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                )
                AND EXISTS (
                    SELECT 1 FROM user_projects up
                    JOIN users u ON up.user_id = u.id
                    WHERE u.auth_user_id = auth.uid()
                      AND up.project_id = project_plans.project_id
                      AND up.access_level IN ('owner', 'admin')
                      AND up.is_deleted = FALSE
                )
            )
        )
    );

-- ============================================================================
-- SECTION 5: STAGE_PLANS RLS POLICIES
-- ============================================================================

-- Policy 1: Users can view stage plans for projects they're members of
DROP POLICY IF EXISTS policy_stage_plans_auth_select ON stage_plans;
CREATE POLICY policy_stage_plans_auth_select
    ON stage_plans FOR SELECT
    TO authenticated
    USING (
        is_deleted = FALSE
        AND (
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.project_id = stage_plans.project_id
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

-- Policy 2: Project Managers, Stage Managers, and PMO Admins can create stage plans
DROP POLICY IF EXISTS policy_stage_plans_auth_insert ON stage_plans;
CREATE POLICY policy_stage_plans_auth_insert
    ON stage_plans FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND (
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.project_id = stage_plans.project_id
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

-- Policy 3: Authors and PMO Admins can edit plans (if not baseline/in_execution)
DROP POLICY IF EXISTS policy_stage_plans_auth_update ON stage_plans;
CREATE POLICY policy_stage_plans_auth_update
    ON stage_plans FOR UPDATE
    TO authenticated
    USING (
        is_deleted = FALSE
        AND (
            -- PMO Admins can always edit (except baseline/in_execution)
            EXISTS (
                SELECT 1
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN users u ON ur.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name IN ('pmo_admin', 'System Admin')
                  AND ur.is_active = TRUE
                  AND ur.is_deleted = FALSE
                  AND stage_plans.is_baseline = FALSE
                  AND stage_plans.status NOT IN ('in_execution', 'completed')
            )
            OR (
                -- Authors can edit if not baseline/in_execution and not approved
                (stage_plans.is_baseline = FALSE AND stage_plans.status IN ('draft', 'under_review'))
                AND (
                    author_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                    OR owner_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                    OR created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                )
                AND EXISTS (
                    SELECT 1 FROM user_projects up
                    JOIN users u ON up.user_id = u.id
                    WHERE u.auth_user_id = auth.uid()
                      AND up.project_id = stage_plans.project_id
                      AND up.access_level IN ('owner', 'admin')
                      AND up.is_deleted = FALSE
                )
            )
        )
    );

-- ============================================================================
-- SECTION 6: PROJECT_PLAN_MILESTONES RLS POLICIES
-- ============================================================================

-- Policy: Can view/modify if can view/modify parent plan
DROP POLICY IF EXISTS policy_project_plan_milestones_auth_select ON project_plan_milestones;
CREATE POLICY policy_project_plan_milestones_auth_select
    ON project_plan_milestones FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM project_plans pp
            WHERE pp.id = project_plan_milestones.project_plan_id
            AND pp.is_deleted = FALSE
            AND (
                EXISTS (
                    SELECT 1 FROM user_projects up
                    JOIN users u ON up.user_id = u.id
                    WHERE u.auth_user_id = auth.uid()
                      AND up.project_id = pp.project_id
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

DROP POLICY IF EXISTS policy_project_plan_milestones_auth_modify ON project_plan_milestones;
CREATE POLICY policy_project_plan_milestones_auth_modify
    ON project_plan_milestones FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM project_plans pp
            WHERE pp.id = project_plan_milestones.project_plan_id
            AND pp.is_deleted = FALSE
            AND pp.is_baseline = FALSE
            AND pp.status IN ('draft', 'under_review')
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
                        pp.author_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                        OR pp.owner_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                        OR pp.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                    )
                    AND EXISTS (
                        SELECT 1 FROM user_projects up
                        JOIN users u ON up.user_id = u.id
                        WHERE u.auth_user_id = auth.uid()
                          AND up.project_id = pp.project_id
                          AND up.access_level IN ('owner', 'admin')
                          AND up.is_deleted = FALSE
                    )
                )
            )
        )
    );

-- ============================================================================
-- SECTION 7: PROJECT_PLAN_RESOURCES RLS POLICIES
-- ============================================================================

-- Policy: Can view/modify if can view/modify parent plan
DROP POLICY IF EXISTS policy_project_plan_resources_auth_select ON project_plan_resources;
CREATE POLICY policy_project_plan_resources_auth_select
    ON project_plan_resources FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM project_plans pp
            WHERE pp.id = project_plan_resources.project_plan_id
            AND pp.is_deleted = FALSE
            AND (
                EXISTS (
                    SELECT 1 FROM user_projects up
                    JOIN users u ON up.user_id = u.id
                    WHERE u.auth_user_id = auth.uid()
                      AND up.project_id = pp.project_id
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

DROP POLICY IF EXISTS policy_project_plan_resources_auth_modify ON project_plan_resources;
CREATE POLICY policy_project_plan_resources_auth_modify
    ON project_plan_resources FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM project_plans pp
            WHERE pp.id = project_plan_resources.project_plan_id
            AND pp.is_deleted = FALSE
            AND pp.is_baseline = FALSE
            AND pp.status IN ('draft', 'under_review')
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
                        pp.author_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                        OR pp.owner_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                        OR pp.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                    )
                    AND EXISTS (
                        SELECT 1 FROM user_projects up
                        JOIN users u ON up.user_id = u.id
                        WHERE u.auth_user_id = auth.uid()
                          AND up.project_id = pp.project_id
                          AND up.access_level IN ('owner', 'admin')
                          AND up.is_deleted = FALSE
                    )
                )
            )
        )
    );

-- ============================================================================
-- SECTION 8: STAGE_PLAN_MILESTONES RLS POLICIES
-- ============================================================================

-- Policy: Can view/modify if can view/modify parent plan
DROP POLICY IF EXISTS policy_stage_plan_milestones_auth_select ON stage_plan_milestones;
CREATE POLICY policy_stage_plan_milestones_auth_select
    ON stage_plan_milestones FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM stage_plans sp
            WHERE sp.id = stage_plan_milestones.stage_plan_id
            AND sp.is_deleted = FALSE
            AND (
                EXISTS (
                    SELECT 1 FROM user_projects up
                    JOIN users u ON up.user_id = u.id
                    WHERE u.auth_user_id = auth.uid()
                      AND up.project_id = sp.project_id
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

DROP POLICY IF EXISTS policy_stage_plan_milestones_auth_modify ON stage_plan_milestones;
CREATE POLICY policy_stage_plan_milestones_auth_modify
    ON stage_plan_milestones FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM stage_plans sp
            WHERE sp.id = stage_plan_milestones.stage_plan_id
            AND sp.is_deleted = FALSE
            AND sp.is_baseline = FALSE
            AND sp.status IN ('draft', 'under_review')
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
                        sp.author_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                        OR sp.owner_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                        OR sp.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                    )
                    AND EXISTS (
                        SELECT 1 FROM user_projects up
                        JOIN users u ON up.user_id = u.id
                        WHERE u.auth_user_id = auth.uid()
                          AND up.project_id = sp.project_id
                          AND up.access_level IN ('owner', 'admin')
                          AND up.is_deleted = FALSE
                    )
                )
            )
        )
    );

-- ============================================================================
-- SECTION 9: STAGE_PLAN_RESOURCES RLS POLICIES
-- ============================================================================

-- Policy: Can view/modify if can view/modify parent plan
DROP POLICY IF EXISTS policy_stage_plan_resources_auth_select ON stage_plan_resources;
CREATE POLICY policy_stage_plan_resources_auth_select
    ON stage_plan_resources FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM stage_plans sp
            WHERE sp.id = stage_plan_resources.stage_plan_id
            AND sp.is_deleted = FALSE
            AND (
                EXISTS (
                    SELECT 1 FROM user_projects up
                    JOIN users u ON up.user_id = u.id
                    WHERE u.auth_user_id = auth.uid()
                      AND up.project_id = sp.project_id
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

DROP POLICY IF EXISTS policy_stage_plan_resources_auth_modify ON stage_plan_resources;
CREATE POLICY policy_stage_plan_resources_auth_modify
    ON stage_plan_resources FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM stage_plans sp
            WHERE sp.id = stage_plan_resources.stage_plan_id
            AND sp.is_deleted = FALSE
            AND sp.is_baseline = FALSE
            AND sp.status IN ('draft', 'under_review')
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
                        sp.author_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                        OR sp.owner_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                        OR sp.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                    )
                    AND EXISTS (
                        SELECT 1 FROM user_projects up
                        JOIN users u ON up.user_id = u.id
                        WHERE u.auth_user_id = auth.uid()
                          AND up.project_id = sp.project_id
                          AND up.access_level IN ('owner', 'admin')
                          AND up.is_deleted = FALSE
                    )
                )
            )
        )
    );

-- ============================================================================
-- SECTION 10: STAGE_PLAN_PRODUCTS RLS POLICIES
-- ============================================================================

-- Policy: Can view/modify if can view/modify parent plan
DROP POLICY IF EXISTS policy_stage_plan_products_auth_select ON stage_plan_products;
CREATE POLICY policy_stage_plan_products_auth_select
    ON stage_plan_products FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM stage_plans sp
            WHERE sp.id = stage_plan_products.stage_plan_id
            AND sp.is_deleted = FALSE
            AND (
                EXISTS (
                    SELECT 1 FROM user_projects up
                    JOIN users u ON up.user_id = u.id
                    WHERE u.auth_user_id = auth.uid()
                      AND up.project_id = sp.project_id
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

DROP POLICY IF EXISTS policy_stage_plan_products_auth_modify ON stage_plan_products;
CREATE POLICY policy_stage_plan_products_auth_modify
    ON stage_plan_products FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM stage_plans sp
            WHERE sp.id = stage_plan_products.stage_plan_id
            AND sp.is_deleted = FALSE
            AND sp.is_baseline = FALSE
            AND sp.status IN ('draft', 'under_review')
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
                        sp.author_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                        OR sp.owner_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                        OR sp.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                    )
                    AND EXISTS (
                        SELECT 1 FROM user_projects up
                        JOIN users u ON up.user_id = u.id
                        WHERE u.auth_user_id = auth.uid()
                          AND up.project_id = sp.project_id
                          AND up.access_level IN ('owner', 'admin')
                          AND up.is_deleted = FALSE
                    )
                )
            )
        )
    );

-- ============================================================================
-- SECTION 11: PLAN_REVISION_HISTORY RLS POLICIES
-- ============================================================================

-- Policy: Can view if can view parent plan
DROP POLICY IF EXISTS policy_plan_revision_history_auth_select ON plan_revision_history;
CREATE POLICY policy_plan_revision_history_auth_select
    ON plan_revision_history FOR SELECT
    TO authenticated
    USING (
        (
            plan_type = 'project_plan' AND EXISTS (
                SELECT 1 FROM project_plans pp
                WHERE pp.id = plan_revision_history.plan_id
                AND pp.is_deleted = FALSE
                AND (
                    EXISTS (
                        SELECT 1 FROM user_projects up
                        JOIN users u ON up.user_id = u.id
                        WHERE u.auth_user_id = auth.uid()
                          AND up.project_id = pp.project_id
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
        )
        OR (
            plan_type = 'stage_plan' AND EXISTS (
                SELECT 1 FROM stage_plans sp
                WHERE sp.id = plan_revision_history.plan_id
                AND sp.is_deleted = FALSE
                AND (
                    EXISTS (
                        SELECT 1 FROM user_projects up
                        JOIN users u ON up.user_id = u.id
                        WHERE u.auth_user_id = auth.uid()
                          AND up.project_id = sp.project_id
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
        )
    );

-- Policy: Can insert if can edit parent plan
DROP POLICY IF EXISTS policy_plan_revision_history_auth_insert ON plan_revision_history;
CREATE POLICY policy_plan_revision_history_auth_insert
    ON plan_revision_history FOR INSERT
    TO authenticated
    WITH CHECK (
        revised_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND (
            (
                plan_type = 'project_plan' AND EXISTS (
                    SELECT 1 FROM project_plans pp
                    WHERE pp.id = plan_revision_history.plan_id
                    AND pp.is_deleted = FALSE
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
                                pp.author_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                                OR pp.owner_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                                OR pp.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                            )
                            AND EXISTS (
                                SELECT 1 FROM user_projects up
                                JOIN users u ON up.user_id = u.id
                                WHERE u.auth_user_id = auth.uid()
                                  AND up.project_id = pp.project_id
                                  AND up.access_level IN ('owner', 'admin')
                                  AND up.is_deleted = FALSE
                            )
                        )
                    )
                )
            )
            OR (
                plan_type = 'stage_plan' AND EXISTS (
                    SELECT 1 FROM stage_plans sp
                    WHERE sp.id = plan_revision_history.plan_id
                    AND sp.is_deleted = FALSE
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
                                sp.author_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                                OR sp.owner_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                                OR sp.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                            )
                            AND EXISTS (
                                SELECT 1 FROM user_projects up
                                JOIN users u ON up.user_id = u.id
                                WHERE u.auth_user_id = auth.uid()
                                  AND up.project_id = sp.project_id
                                  AND up.access_level IN ('owner', 'admin')
                                  AND up.is_deleted = FALSE
                            )
                        )
                    )
                )
            )
        )
    );

-- ============================================================================
-- SECTION 12: PLAN_APPROVALS RLS POLICIES
-- ============================================================================

-- Policy: Can view if can view parent plan
DROP POLICY IF EXISTS policy_plan_approvals_auth_select ON plan_approvals;
CREATE POLICY policy_plan_approvals_auth_select
    ON plan_approvals FOR SELECT
    TO authenticated
    USING (
        (
            plan_type = 'project_plan' AND EXISTS (
                SELECT 1 FROM project_plans pp
                WHERE pp.id = plan_approvals.plan_id
                AND pp.is_deleted = FALSE
                AND (
                    EXISTS (
                        SELECT 1 FROM user_projects up
                        JOIN users u ON up.user_id = u.id
                        WHERE u.auth_user_id = auth.uid()
                          AND up.project_id = pp.project_id
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
        )
        OR (
            plan_type = 'stage_plan' AND EXISTS (
                SELECT 1 FROM stage_plans sp
                WHERE sp.id = plan_approvals.plan_id
                AND sp.is_deleted = FALSE
                AND (
                    EXISTS (
                        SELECT 1 FROM user_projects up
                        JOIN users u ON up.user_id = u.id
                        WHERE u.auth_user_id = auth.uid()
                          AND up.project_id = sp.project_id
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
        )
    );

-- Policy: Can insert if can edit parent plan, or if you're the approver
DROP POLICY IF EXISTS policy_plan_approvals_auth_insert ON plan_approvals;
CREATE POLICY policy_plan_approvals_auth_insert
    ON plan_approvals FOR INSERT
    TO authenticated
    WITH CHECK (
        approver_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        OR (
            (
                plan_type = 'project_plan' AND EXISTS (
                    SELECT 1 FROM project_plans pp
                    WHERE pp.id = plan_approvals.plan_id
                    AND pp.is_deleted = FALSE
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
                                pp.author_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                                OR pp.owner_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                                OR pp.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                            )
                            AND EXISTS (
                                SELECT 1 FROM user_projects up
                                JOIN users u ON up.user_id = u.id
                                WHERE u.auth_user_id = auth.uid()
                                  AND up.project_id = pp.project_id
                                  AND up.access_level IN ('owner', 'admin')
                                  AND up.is_deleted = FALSE
                            )
                        )
                    )
                )
            )
            OR (
                plan_type = 'stage_plan' AND EXISTS (
                    SELECT 1 FROM stage_plans sp
                    WHERE sp.id = plan_approvals.plan_id
                    AND sp.is_deleted = FALSE
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
                                sp.author_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                                OR sp.owner_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                                OR sp.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                            )
                            AND EXISTS (
                                SELECT 1 FROM user_projects up
                                JOIN users u ON up.user_id = u.id
                                WHERE u.auth_user_id = auth.uid()
                                  AND up.project_id = sp.project_id
                                  AND up.access_level IN ('owner', 'admin')
                                  AND up.is_deleted = FALSE
                            )
                        )
                    )
                )
            )
        )
    );

-- Policy: Approvers can update their own approvals, plan authors/PMO Admins can update any
DROP POLICY IF EXISTS policy_plan_approvals_auth_update ON plan_approvals;
CREATE POLICY policy_plan_approvals_auth_update
    ON plan_approvals FOR UPDATE
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
        OR (
            -- Plan author can update if plan is not yet approved/baseline
            (
                plan_type = 'project_plan' AND EXISTS (
                    SELECT 1 FROM project_plans pp
                    WHERE pp.id = plan_approvals.plan_id
                    AND pp.status IN ('draft', 'under_review')
                    AND (
                        pp.author_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                        OR pp.owner_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                        OR pp.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                    )
                    AND EXISTS (
                        SELECT 1 FROM user_projects up
                        JOIN users u ON up.user_id = u.id
                        WHERE u.auth_user_id = auth.uid()
                          AND up.project_id = pp.project_id
                          AND up.access_level IN ('owner', 'admin')
                          AND up.is_deleted = FALSE
                    )
                )
            )
            OR (
                plan_type = 'stage_plan' AND EXISTS (
                    SELECT 1 FROM stage_plans sp
                    WHERE sp.id = plan_approvals.plan_id
                    AND sp.status IN ('draft', 'under_review')
                    AND (
                        sp.author_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                        OR sp.owner_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                        OR sp.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                    )
                    AND EXISTS (
                        SELECT 1 FROM user_projects up
                        JOIN users u ON up.user_id = u.id
                        WHERE u.auth_user_id = auth.uid()
                          AND up.project_id = sp.project_id
                          AND up.access_level IN ('owner', 'admin')
                          AND up.is_deleted = FALSE
                    )
                )
            )
        )
    );

-- ============================================================================
-- SECTION 13: PLAN_DISTRIBUTION RLS POLICIES
-- ============================================================================

-- Policy: Can view if can view parent plan, or if you're the recipient
DROP POLICY IF EXISTS policy_plan_distribution_auth_select ON plan_distribution;
CREATE POLICY policy_plan_distribution_auth_select
    ON plan_distribution FOR SELECT
    TO authenticated
    USING (
        -- Recipient can view their own distribution record
        (
            recipient_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        )
        OR (
            plan_type = 'project_plan' AND EXISTS (
                SELECT 1 FROM project_plans pp
                WHERE pp.id = plan_distribution.plan_id
                AND pp.is_deleted = FALSE
                AND (
                    EXISTS (
                        SELECT 1 FROM user_projects up
                        JOIN users u ON up.user_id = u.id
                        WHERE u.auth_user_id = auth.uid()
                          AND up.project_id = pp.project_id
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
        )
        OR (
            plan_type = 'stage_plan' AND EXISTS (
                SELECT 1 FROM stage_plans sp
                WHERE sp.id = plan_distribution.plan_id
                AND sp.is_deleted = FALSE
                AND (
                    EXISTS (
                        SELECT 1 FROM user_projects up
                        JOIN users u ON up.user_id = u.id
                        WHERE u.auth_user_id = auth.uid()
                          AND up.project_id = sp.project_id
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
        )
    );

-- Policy: Can insert if can edit parent plan
DROP POLICY IF EXISTS policy_plan_distribution_auth_insert ON plan_distribution;
CREATE POLICY policy_plan_distribution_auth_insert
    ON plan_distribution FOR INSERT
    TO authenticated
    WITH CHECK (
        (
            plan_type = 'project_plan' AND EXISTS (
                SELECT 1 FROM project_plans pp
                WHERE pp.id = plan_distribution.plan_id
                AND pp.is_deleted = FALSE
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
                            pp.author_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                            OR pp.owner_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                            OR pp.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                        )
                        AND EXISTS (
                            SELECT 1 FROM user_projects up
                            JOIN users u ON up.user_id = u.id
                            WHERE u.auth_user_id = auth.uid()
                              AND up.project_id = pp.project_id
                              AND up.access_level IN ('owner', 'admin')
                              AND up.is_deleted = FALSE
                        )
                    )
                )
            )
        )
        OR (
            plan_type = 'stage_plan' AND EXISTS (
                SELECT 1 FROM stage_plans sp
                WHERE sp.id = plan_distribution.plan_id
                AND sp.is_deleted = FALSE
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
                            sp.author_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                            OR sp.owner_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                            OR sp.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                        )
                        AND EXISTS (
                            SELECT 1 FROM user_projects up
                            JOIN users u ON up.user_id = u.id
                            WHERE u.auth_user_id = auth.uid()
                              AND up.project_id = sp.project_id
                              AND up.access_level IN ('owner', 'admin')
                              AND up.is_deleted = FALSE
                        )
                    )
                )
            )
        )
    );

-- ============================================================================
-- END OF FILE
-- ============================================================================
