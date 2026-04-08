-- =============================================================================
-- v278: Fix Portfolios & Portfolio Projects RLS
-- Purpose: Allow authenticated users to read portfolios (for dropdown lists)
--          and allow assignment of projects to portfolios via portfolio_projects.
-- Date: 2026-03-09
-- =============================================================================
--
-- Issue: "permission denied for table portfolios" when loading the Portfolio
--        Assignment tab on the Create/Edit Project form.
--
-- Root Cause: v36_portfolio_management.sql created the tables but added no
--             RLS policies. Without policies, authenticated users cannot
--             SELECT from the table.
--
-- Fix: Mirror the same approach used in v249 for the programmes table —
--      open SELECT to all authenticated users, restrict writes to owners/admins.
-- =============================================================================


-- =============================================================================
-- SECTION 1: portfolios table
-- =============================================================================

-- Drop any stale policies
DROP POLICY IF EXISTS policy_portfolios_select ON portfolios;
DROP POLICY IF EXISTS policy_portfolios_insert ON portfolios;
DROP POLICY IF EXISTS policy_portfolios_update ON portfolios;
DROP POLICY IF EXISTS policy_portfolios_delete ON portfolios;
DROP POLICY IF EXISTS policy_portfolios_pmo_admin ON portfolios;

-- Enable RLS
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;

-- Grant table-level permissions
GRANT SELECT, INSERT, UPDATE ON portfolios TO authenticated;

-- SELECT: all authenticated users can read non-deleted portfolios
-- (needed for dropdowns, reference joins, etc.)
CREATE POLICY policy_portfolios_select ON portfolios
    FOR SELECT
    TO authenticated
    USING (is_deleted = FALSE);

-- INSERT: PMO admins and System Admins only
CREATE POLICY policy_portfolios_insert ON portfolios
    FOR INSERT
    TO authenticated
    WITH CHECK (
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

-- UPDATE: portfolio owners, managers, PMO admins, and System Admins
CREATE POLICY policy_portfolios_update ON portfolios
    FOR UPDATE
    TO authenticated
    USING (
        is_deleted = FALSE
        AND (
            EXISTS (
                SELECT 1 FROM users u
                WHERE u.auth_user_id = auth.uid()
                  AND (
                      u.id = portfolios.portfolio_owner_user_id
                      OR u.id = portfolios.portfolio_manager_user_id
                  )
                  AND u.is_deleted = FALSE
            )
            OR EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN users u ON ur.user_id = u.id
                JOIN roles r ON ur.role_id = r.id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name IN ('pmo_admin', 'System Admin')
                  AND ur.is_active = TRUE
                  AND ur.is_deleted = FALSE
            )
        )
    );


-- =============================================================================
-- SECTION 2: portfolio_projects table
-- =============================================================================

-- Drop any stale policies
DROP POLICY IF EXISTS policy_portfolio_projects_select ON portfolio_projects;
DROP POLICY IF EXISTS policy_portfolio_projects_insert ON portfolio_projects;
DROP POLICY IF EXISTS policy_portfolio_projects_update ON portfolio_projects;

-- Enable RLS
ALTER TABLE portfolio_projects ENABLE ROW LEVEL SECURITY;

-- Grant table-level permissions
GRANT SELECT, INSERT, UPDATE ON portfolio_projects TO authenticated;

-- SELECT: all authenticated users (needed to check current project assignment)
CREATE POLICY policy_portfolio_projects_select ON portfolio_projects
    FOR SELECT
    TO authenticated
    USING (is_deleted = FALSE);

-- INSERT: authenticated users can assign projects to portfolios
-- (the application enforces who can do this at the service layer)
CREATE POLICY policy_portfolio_projects_insert ON portfolio_projects
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- UPDATE: allow status changes (e.g. removing a project from a portfolio)
CREATE POLICY policy_portfolio_projects_update ON portfolio_projects
    FOR UPDATE
    TO authenticated
    USING (is_deleted = FALSE);


-- =============================================================================
-- SECTION 3: Verification
-- =============================================================================

DO $$
DECLARE
    v_portfolios_policies    INTEGER;
    v_port_projects_policies INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_portfolios_policies
    FROM pg_policies WHERE tablename = 'portfolios';

    SELECT COUNT(*) INTO v_port_projects_policies
    FROM pg_policies WHERE tablename = 'portfolio_projects';

    RAISE NOTICE '================================================';
    RAISE NOTICE 'v278 RLS Fix Applied Successfully';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'portfolios policies:         %', v_portfolios_policies;
    RAISE NOTICE 'portfolio_projects policies: %', v_port_projects_policies;
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Authenticated users can now read portfolios.';
    RAISE NOTICE 'Refresh the browser and try again.';
    RAISE NOTICE '================================================';
END $$;
