-- =============================================================================
-- v288: RLS Policies for portfolio_budgets and portfolio_reports
-- Purpose: Add GRANT and access policies for the two remaining portfolio
--          sub-tables that were created in v36 without any RLS policies.
--          Without policies, authenticated users get "permission denied".
--
-- Tables fixed:
--   portfolio_budgets  - Portfolio financial budgets and expenditure tracking
--   portfolio_reports  - Portfolio reports and summaries
--
-- Note: portfolio_members, portfolio_objectives, portfolio_governance,
--       portfolio_metrics, and portfolio_risks were fixed in v286.
--
-- Strategy (mirrors v278 / v286):
--   SELECT  — all authenticated users
--   INSERT  — all authenticated users (service layer enforces role checks)
--   UPDATE  — all authenticated users on non-deleted rows
--   DELETE  — restricted to pmo_admin / System Admin
-- =============================================================================


-- =============================================================================
-- TABLE: portfolio_budgets
-- =============================================================================

DROP POLICY IF EXISTS policy_portfolio_budgets_select ON portfolio_budgets;
DROP POLICY IF EXISTS policy_portfolio_budgets_insert ON portfolio_budgets;
DROP POLICY IF EXISTS policy_portfolio_budgets_update ON portfolio_budgets;
DROP POLICY IF EXISTS policy_portfolio_budgets_delete ON portfolio_budgets;

ALTER TABLE portfolio_budgets ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON portfolio_budgets TO authenticated;

CREATE POLICY policy_portfolio_budgets_select ON portfolio_budgets
    FOR SELECT TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY policy_portfolio_budgets_insert ON portfolio_budgets
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY policy_portfolio_budgets_update ON portfolio_budgets
    FOR UPDATE TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY policy_portfolio_budgets_delete ON portfolio_budgets
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
-- TABLE: portfolio_reports
-- =============================================================================

DROP POLICY IF EXISTS policy_portfolio_reports_select ON portfolio_reports;
DROP POLICY IF EXISTS policy_portfolio_reports_insert ON portfolio_reports;
DROP POLICY IF EXISTS policy_portfolio_reports_update ON portfolio_reports;
DROP POLICY IF EXISTS policy_portfolio_reports_delete ON portfolio_reports;

ALTER TABLE portfolio_reports ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON portfolio_reports TO authenticated;

CREATE POLICY policy_portfolio_reports_select ON portfolio_reports
    FOR SELECT TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY policy_portfolio_reports_insert ON portfolio_reports
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY policy_portfolio_reports_update ON portfolio_reports
    FOR UPDATE TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY policy_portfolio_reports_delete ON portfolio_reports
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
    v_budgets INTEGER;
    v_reports INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_budgets FROM pg_policies WHERE tablename = 'portfolio_budgets';
    SELECT COUNT(*) INTO v_reports FROM pg_policies WHERE tablename = 'portfolio_reports';

    RAISE NOTICE '================================================';
    RAISE NOTICE 'v288 Portfolio Budgets & Reports RLS Applied';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'portfolio_budgets policies: %', v_budgets;
    RAISE NOTICE 'portfolio_reports policies: %', v_reports;
    RAISE NOTICE '================================================';
END $$;
