-- =============================================================================
-- v284: portfolio_categories – allow all authenticated users to read (dropdown / PMO Admin)
-- Purpose: Fix empty Category dropdown on Create Portfolio. Same pattern as v274
--   for budget_categories/funding_sources. INSERT/UPDATE/DELETE remain account-scoped.
-- Prerequisites: v280 (portfolio_categories table and existing RLS).
-- Safe to re-run.
-- =============================================================================

GRANT SELECT ON portfolio_categories TO authenticated;

DROP POLICY IF EXISTS policy_portfolio_categories_select ON portfolio_categories;
CREATE POLICY policy_portfolio_categories_select ON portfolio_categories
    FOR SELECT TO authenticated
    USING (true);

COMMENT ON POLICY policy_portfolio_categories_select ON portfolio_categories IS
    'Lookup table – all authenticated users can read for Create Portfolio dropdown and PMO Admin; INSERT/UPDATE/DELETE remain account-scoped.';
