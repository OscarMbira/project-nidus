-- ================================================
-- File: v274_fix_budget_categories_funding_sources_rls_read.sql
-- Description: Allow all authenticated users to SELECT from budget_categories and funding_sources
--   so PMO Admin and Create Project dropdowns work (same pattern as project_types / project_statuses).
--   INSERT/UPDATE/DELETE remain account-scoped. Safe to re-run.
-- Prerequisites: v271 (budget_categories), v268/v270 (funding_sources).
--
-- YOU MUST RUN THIS IN SUPABASE: Dashboard → SQL Editor → New query → paste this file → Run.
-- After running, reload the Budget Categories / Funding Sources pages in the app.
-- ================================================

-- Ensure authenticated role can issue SELECT (RLS policies below then control which rows)
GRANT SELECT ON budget_categories TO authenticated;
GRANT SELECT ON funding_sources TO authenticated;

-- budget_categories: allow any authenticated user to read (dropdown / PMO Admin)
DROP POLICY IF EXISTS policy_budget_categories_select ON budget_categories;
CREATE POLICY policy_budget_categories_select ON budget_categories
    FOR SELECT TO authenticated
    USING (true);

COMMENT ON POLICY policy_budget_categories_select ON budget_categories IS
    'Lookup table – all authenticated users can read for dropdowns and PMO Admin; INSERT/UPDATE/DELETE remain account-scoped.';

-- funding_sources: allow any authenticated user to read (dropdown / PMO Admin)
DROP POLICY IF EXISTS policy_funding_sources_select ON funding_sources;
CREATE POLICY policy_funding_sources_select ON funding_sources
    FOR SELECT TO authenticated
    USING (true);

COMMENT ON POLICY policy_funding_sources_select ON funding_sources IS
    'Lookup table – all authenticated users can read for dropdowns and PMO Admin; INSERT/UPDATE/DELETE remain account-scoped.';
