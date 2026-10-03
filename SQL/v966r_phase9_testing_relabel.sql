-- ============================================================================
-- v966r: Core PM Menu Rationalisation — Phase 9 (taxonomy group 11 of 16): Testing
-- ============================================================================
-- projectplan/v966_core_pm_menu_rationalisation_plan.md Phase 9.
-- Documentation/Core_PM_and_Industry_Menu_Taxonomy.md §3 (Testing: Test Planning / Test Cases /
-- Test Execution / Defects / Evidence).
--
-- Resolves the "Quality & Testing dashboard split" question the plan left open across two prior
-- runs. Investigation this run: the live, granted row plat_pm_quality_testing (14 grants, route
-- /platform/testing/dashboard) renders apps/platform/src/pages/testing/TestDashboard.jsx, which
-- links only to /platform/testing/suites, /testing/cases, /testing/runs, /testing/defects — pure
-- Testing content (suites, cases, runs, defects). It carries ZERO quality-specific content; the
-- "Quality & Testing" label was simply wrong, not a genuine two-discipline page. Taxonomy's
-- separate "Quality" group already exists (plat_pm_quality, SQL/v966o, Quality Register) with no
-- overlap, so there is nothing left to split — this is a pure RELABEL, not a re-parent.
--
-- A separate, much richer "Testing Centre" implementation also exists in the codebase
-- (apps/platform/src/pages/testingCentre/*, routes at /platform/testing-centre/*) with test case
-- drafts, evidence, diagnostics, automated scripts, a data manager, and settings — but every menu
-- row across all of its generations (testing_qa_*, testing_diagnostics_*, pm_testing_*) has ZERO
-- role_menu_items grants (confirmed via a fresh live query). It is a fully-built but entirely
-- unreachable feature today. Swapping the canonical Testing route from the simpler, currently-live
-- TestDashboard to the richer, currently-unreachable Testing Centre is a bigger, separately-decided
-- product choice (which implementation becomes canonical, and a grant migration for the 14
-- existing grants) — flagged here as a follow-up, not attempted in this file.
--
-- Also found, NOT fixed here (pre-existing, unrelated to this relabel): plat_pm_quality_testing's
-- own stored route_path ("/platform/testing/dashboard") does not match any registered route —
-- apps/platform/src/routes/platformRoutes.jsx registers exactly path="testing" (i.e.
-- /platform/testing), not "testing/dashboard". This is a dead link today regardless of this SQL;
-- flagged as a follow-up bug fix (correct the row's route_path to /platform/testing), out of scope
-- for a menu-label-only pass per the same "don't silently fix unrelated bugs" discipline used in
-- SQL/v966n's Timesheets note.
--
-- Harness-verified (before/after across all 111 live roles): change isolated to the single label
-- string on every role that has plat_pm_quality_testing granted; no other node affected.
-- ============================================================================

UPDATE public.menu_items
SET menu_label = 'Testing',
    updated_at = NOW()
WHERE menu_code = 'plat_pm_quality_testing' AND COALESCE(is_deleted, FALSE) = FALSE;

DO $$ BEGIN RAISE NOTICE 'v966r_phase9_testing_relabel.sql applied successfully'; END $$;
