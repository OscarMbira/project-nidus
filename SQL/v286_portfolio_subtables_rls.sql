-- =============================================================================
-- v286: RLS Policies for Portfolio Sub-tables
-- Purpose: Enable Row Level Security and add access policies for the five
--          portfolio sub-tables that were created in v36 without any RLS.
--          Without these policies Supabase returns "permission denied" for
--          every query on these tables.
--
-- Tables fixed:
--   portfolio_members    - Portfolio team members
--   portfolio_objectives - Strategic objectives
--   portfolio_governance - Governance & oversight
--   portfolio_metrics    - Performance metrics
--   portfolio_risks      - Risk aggregation
--
-- Strategy (mirrors v278 for portfolios / portfolio_projects):
--   SELECT  — all authenticated users (needed for list views and joins)
--   INSERT  — authenticated users (app enforces role checks at service layer)
--   UPDATE  — authenticated users on non-deleted rows
--   DELETE  — restricted to pmo_admin / System Admin via soft-delete
-- =============================================================================


-- =============================================================================
-- TABLE: portfolio_members
-- =============================================================================

DROP POLICY IF EXISTS policy_portfolio_members_select ON portfolio_members;
DROP POLICY IF EXISTS policy_portfolio_members_insert ON portfolio_members;
DROP POLICY IF EXISTS policy_portfolio_members_update ON portfolio_members;
DROP POLICY IF EXISTS policy_portfolio_members_delete ON portfolio_members;

ALTER TABLE portfolio_members ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON portfolio_members TO authenticated;

CREATE POLICY policy_portfolio_members_select ON portfolio_members
    FOR SELECT TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY policy_portfolio_members_insert ON portfolio_members
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY policy_portfolio_members_update ON portfolio_members
    FOR UPDATE TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY policy_portfolio_members_delete ON portfolio_members
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN users u ON ur.user_id = u.id
            JOIN roles r ON ur.role_id = r.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name IN ('pmo_admin', 'System Admin')
              AND ur.is_active = TRUE
              AND ur.is_deleted = FALSE
        )
    );


-- =============================================================================
-- TABLE: portfolio_objectives
-- =============================================================================

DROP POLICY IF EXISTS policy_portfolio_objectives_select ON portfolio_objectives;
DROP POLICY IF EXISTS policy_portfolio_objectives_insert ON portfolio_objectives;
DROP POLICY IF EXISTS policy_portfolio_objectives_update ON portfolio_objectives;
DROP POLICY IF EXISTS policy_portfolio_objectives_delete ON portfolio_objectives;

ALTER TABLE portfolio_objectives ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON portfolio_objectives TO authenticated;

CREATE POLICY policy_portfolio_objectives_select ON portfolio_objectives
    FOR SELECT TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY policy_portfolio_objectives_insert ON portfolio_objectives
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY policy_portfolio_objectives_update ON portfolio_objectives
    FOR UPDATE TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY policy_portfolio_objectives_delete ON portfolio_objectives
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN users u ON ur.user_id = u.id
            JOIN roles r ON ur.role_id = r.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name IN ('pmo_admin', 'System Admin')
              AND ur.is_active = TRUE
              AND ur.is_deleted = FALSE
        )
    );


-- =============================================================================
-- TABLE: portfolio_governance
-- =============================================================================

DROP POLICY IF EXISTS policy_portfolio_governance_select ON portfolio_governance;
DROP POLICY IF EXISTS policy_portfolio_governance_insert ON portfolio_governance;
DROP POLICY IF EXISTS policy_portfolio_governance_update ON portfolio_governance;
DROP POLICY IF EXISTS policy_portfolio_governance_delete ON portfolio_governance;

ALTER TABLE portfolio_governance ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON portfolio_governance TO authenticated;

CREATE POLICY policy_portfolio_governance_select ON portfolio_governance
    FOR SELECT TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY policy_portfolio_governance_insert ON portfolio_governance
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY policy_portfolio_governance_update ON portfolio_governance
    FOR UPDATE TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY policy_portfolio_governance_delete ON portfolio_governance
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN users u ON ur.user_id = u.id
            JOIN roles r ON ur.role_id = r.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name IN ('pmo_admin', 'System Admin')
              AND ur.is_active = TRUE
              AND ur.is_deleted = FALSE
        )
    );


-- =============================================================================
-- TABLE: portfolio_metrics
-- =============================================================================

DROP POLICY IF EXISTS policy_portfolio_metrics_select ON portfolio_metrics;
DROP POLICY IF EXISTS policy_portfolio_metrics_insert ON portfolio_metrics;
DROP POLICY IF EXISTS policy_portfolio_metrics_update ON portfolio_metrics;
DROP POLICY IF EXISTS policy_portfolio_metrics_delete ON portfolio_metrics;

ALTER TABLE portfolio_metrics ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON portfolio_metrics TO authenticated;

CREATE POLICY policy_portfolio_metrics_select ON portfolio_metrics
    FOR SELECT TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY policy_portfolio_metrics_insert ON portfolio_metrics
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY policy_portfolio_metrics_update ON portfolio_metrics
    FOR UPDATE TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY policy_portfolio_metrics_delete ON portfolio_metrics
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN users u ON ur.user_id = u.id
            JOIN roles r ON ur.role_id = r.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name IN ('pmo_admin', 'System Admin')
              AND ur.is_active = TRUE
              AND ur.is_deleted = FALSE
        )
    );


-- =============================================================================
-- TABLE: portfolio_risks
-- =============================================================================

DROP POLICY IF EXISTS policy_portfolio_risks_select ON portfolio_risks;
DROP POLICY IF EXISTS policy_portfolio_risks_insert ON portfolio_risks;
DROP POLICY IF EXISTS policy_portfolio_risks_update ON portfolio_risks;
DROP POLICY IF EXISTS policy_portfolio_risks_delete ON portfolio_risks;

ALTER TABLE portfolio_risks ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON portfolio_risks TO authenticated;

CREATE POLICY policy_portfolio_risks_select ON portfolio_risks
    FOR SELECT TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY policy_portfolio_risks_insert ON portfolio_risks
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY policy_portfolio_risks_update ON portfolio_risks
    FOR UPDATE TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY policy_portfolio_risks_delete ON portfolio_risks
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN users u ON ur.user_id = u.id
            JOIN roles r ON ur.role_id = r.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name IN ('pmo_admin', 'System Admin')
              AND ur.is_active = TRUE
              AND ur.is_deleted = FALSE
        )
    );


-- =============================================================================
-- Verification
-- =============================================================================

DO $$
DECLARE
    v_members    INTEGER;
    v_objectives INTEGER;
    v_governance INTEGER;
    v_metrics    INTEGER;
    v_risks      INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_members    FROM pg_policies WHERE tablename = 'portfolio_members';
    SELECT COUNT(*) INTO v_objectives FROM pg_policies WHERE tablename = 'portfolio_objectives';
    SELECT COUNT(*) INTO v_governance FROM pg_policies WHERE tablename = 'portfolio_governance';
    SELECT COUNT(*) INTO v_metrics    FROM pg_policies WHERE tablename = 'portfolio_metrics';
    SELECT COUNT(*) INTO v_risks      FROM pg_policies WHERE tablename = 'portfolio_risks';

    RAISE NOTICE '================================================';
    RAISE NOTICE 'v286 Portfolio Sub-tables RLS Applied';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'portfolio_members    policies: %', v_members;
    RAISE NOTICE 'portfolio_objectives policies: %', v_objectives;
    RAISE NOTICE 'portfolio_governance policies: %', v_governance;
    RAISE NOTICE 'portfolio_metrics    policies: %', v_metrics;
    RAISE NOTICE 'portfolio_risks      policies: %', v_risks;
    RAISE NOTICE '================================================';
END $$;
