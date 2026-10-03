-- ============================================================================
-- v1037: Testing taxonomy expansion (Platform PM sidebar)
-- ============================================================================
-- Documentation/Core_PM_and_Industry_Menu_Taxonomy.md §3, Testing branch: Test Planning
-- (Strategy/Plan/Scope/Cycles/Entry-Exit Criteria), Test Cases (Repository/Suites/
-- Preconditions/Steps/Expected Results), Test Execution (Runs/Pass/Fail/Blocked/Retest),
-- Defects (Register/Severity-Priority/Assignment/Resolution/Retest/Closure), Evidence
-- (Test Evidence/Screenshots/Attachments/History).
--
-- Live audit found:
--   - The sidebar's single flat "Testing" item is plat_pm_quality_testing (relabelled from
--     "Quality & Testing" in v966r; 14 live grants), route_path '/platform/testing/dashboard' —
--     a STALE route (v966r already flagged this: the registered route is '/platform/testing',
--     no '/dashboard' suffix — apps/platform/src/pages/testing/TestDashboard.jsx). Same stale-
--     route-path bug class as Business Case (v1023) / Schedule (v1029) / Stakeholders (v1032).
--   - v966r also left an open product question: a second, richer "Testing Centre"
--     (pages/testingCentre/*, tc_* tables) exists but is NOT project-scoped (its own permission
--     helper is explicitly "not project-scoped" — an org-wide QA/dev tool for testing the Nidus
--     platform itself) and has zero live grants. It is a different audience from a project's own
--     Testing taxonomy and stays untouched here (already separately linked under Quality per
--     v966ak as plat_pm_testing_centre) — NOT merged into this project-scoped group.
--   - apps/platform/src/pages/testing/* (TestDashboard/TestSuites/TestCases/TestRuns/Defects*)
--     IS the correct, already-built, project-scoped engine: test_suites/test_cases/test_runs/
--     test_case_executions/defects/defect_attachments/defect_history (v338-v340) all carry
--     project_id and already have full CRUD services (testCaseService/testSuiteService/
--     testRunService/defectService).
--   - Test Cases > Preconditions/Steps/Expected Results are fields on one test_cases row (test
--     case create/detail), not separate pages — exposed as facets of the Repository leaf, not
--     separate menu nodes (same principle used for Milestones/EVM facets this session).
--   - Test Execution > Pass/Fail/Blocked/Retest are test_case_executions.status values within a
--     run's detail (TestRunDetail.jsx) — facets of the Runs leaf, not separate menu nodes.
--   - Defects > Assignment/Resolution/Retest/Closure are defects.status/assigned_to workflow
--     fields on one defect record (DefectDetail.jsx) — facets of the Register leaf.
--   - Defects > Severity / Priority has a genuine separate page (DefectDashboard.jsx, trends +
--     severity/priority breakdown, route /platform/testing/defects/dashboard) — real depth kept.
--   - Test Cases > Suites has a genuine separate page (TestSuites.jsx) — real depth kept.
--   - Evidence (Test Evidence/Screenshots/Attachments/History): defect_attachments (with
--     is_screenshot flag) and defect_history already model this data project-wide, but ZERO
--     frontend consumer existed at the project level (only per-defect, inside DefectDetail.jsx).
--     This migration's companion frontend change adds TestEvidence.jsx (new) at
--     /platform/testing/evidence — a single page with Test Evidence/Screenshots/Attachments/
--     History as tabs (facets of one page), not 4 separate leaves.
-- ============================================================================

-- 1. Fix the stale route_path and turn the existing flat leaf into the Testing group parent.
UPDATE public.menu_items
SET menu_label = 'Testing',
    route_path = NULL,
    updated_at = NOW()
WHERE menu_code = 'plat_pm_quality_testing' AND COALESCE(is_deleted, FALSE) = FALSE;

-- 2. Five flat children directly under Testing (Test Cases and Defects get one extra real
--    level below, matching the two genuinely separate pages each already has).
INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), v.menu_code, v.menu_label, v.menu_description, v.route_path,
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_quality_testing' AND COALESCE(is_deleted, FALSE) = FALSE),
  (SELECT menu_level + 1 FROM public.menu_items WHERE menu_code = 'plat_pm_quality_testing' AND COALESCE(is_deleted, FALSE) = FALSE),
  v.sort_order, 'universal', v.menu_icon, TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('plat_pm_testing_plan',     'Test Planning',    'Test strategy, plan, scope, cycles, and entry/exit criteria overview (taxonomy §3, Testing > Test Planning).', '/platform/testing', 10, 'clipboard-list'),
  ('plat_pm_testing_cases',    'Test Cases',       'Test case repository and suites (taxonomy §3, Testing > Test Cases).', NULL, 20, 'list-checks'),
  ('plat_pm_testing_exec',     'Test Execution',   'Test run sessions — pass/fail/blocked/retest results (taxonomy §3, Testing > Test Execution).', '/platform/testing/runs', 30, 'play-circle'),
  ('plat_pm_testing_defects',  'Defects',          'Defect register with severity, priority, assignment, resolution and closure (taxonomy §3, Testing > Defects).', NULL, 40, 'bug'),
  ('plat_pm_testing_evidence', 'Evidence',         'Test evidence, screenshots, attachments, and history captured across this project''s testing (taxonomy §3, Testing > Evidence).', '/platform/testing/evidence', 50, 'image')
) AS v(menu_code, menu_label, menu_description, route_path, sort_order, menu_icon)
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = v.menu_code AND COALESCE(is_deleted, FALSE) = FALSE
);

-- 3. Test Cases > Repository / Suites.
INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), v.menu_code, v.menu_label, v.menu_description, v.route_path,
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_testing_cases' AND COALESCE(is_deleted, FALSE) = FALSE),
  (SELECT menu_level + 1 FROM public.menu_items WHERE menu_code = 'plat_pm_testing_cases' AND COALESCE(is_deleted, FALSE) = FALSE),
  v.sort_order, 'universal', v.menu_icon, TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('plat_pm_testing_cases_repo',   'Repository', 'All test cases — preconditions, steps, and expected results per case (taxonomy §3, Test Cases > Repository).', '/platform/testing/cases', 10, 'file-text'),
  ('plat_pm_testing_cases_suites', 'Suites',     'Grouped test suites by type and environment (taxonomy §3, Test Cases > Suites).', '/platform/testing/suites', 20, 'layers')
) AS v(menu_code, menu_label, menu_description, route_path, sort_order, menu_icon)
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = v.menu_code AND COALESCE(is_deleted, FALSE) = FALSE
);

-- 4. Defects > Defect Register / Severity & Priority.
INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), v.menu_code, v.menu_label, v.menu_description, v.route_path,
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_testing_defects' AND COALESCE(is_deleted, FALSE) = FALSE),
  (SELECT menu_level + 1 FROM public.menu_items WHERE menu_code = 'plat_pm_testing_defects' AND COALESCE(is_deleted, FALSE) = FALSE),
  v.sort_order, 'universal', v.menu_icon, TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('plat_pm_testing_defects_reg', 'Defect Register',    'All defects — assignment, resolution, retest, and closure per defect (taxonomy §3, Defects > Defect Register).', '/platform/testing/defects', 10, 'alert-circle'),
  ('plat_pm_testing_defects_sev', 'Severity / Priority', 'Defect trends by severity and priority (taxonomy §3, Defects > Severity / Priority).', '/platform/testing/defects/dashboard', 20, 'bar-chart-2')
) AS v(menu_code, menu_label, menu_description, route_path, sort_order, menu_icon)
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = v.menu_code AND COALESCE(is_deleted, FALSE) = FALSE
);

-- 5. Grant every new node to whichever roles already have the Testing group granted (14 live
--    grants per v966r) — same idempotent copy pattern as v1029-v1036.
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_pm_quality_testing'
JOIN public.menu_items dst ON dst.menu_code IN (
  'plat_pm_testing_plan', 'plat_pm_testing_cases', 'plat_pm_testing_exec', 'plat_pm_testing_defects',
  'plat_pm_testing_evidence', 'plat_pm_testing_cases_repo', 'plat_pm_testing_cases_suites',
  'plat_pm_testing_defects_reg', 'plat_pm_testing_defects_sev'
) AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1037: Testing — group + Test Planning/Test Cases (Repository, Suites)/Test Execution/Defects (Register, Severity-Priority)/Evidence wired; stale route_path fixed';
  RAISE NOTICE '================================================';
END $$;

-- Post-run verification (run manually):
--   SELECT menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order
--   FROM public.menu_items
--   WHERE menu_code LIKE 'plat_pm_testing%' OR menu_code = 'plat_pm_quality_testing'
--   ORDER BY menu_level, sort_order;
--
--   SELECT mi.menu_code, count(*) AS grant_count
--   FROM public.role_menu_items rmi
--   JOIN public.menu_items mi ON mi.id = rmi.menu_item_id
--   WHERE mi.menu_code LIKE 'plat_pm_testing%'
--     AND rmi.can_view AND rmi.is_active AND NOT COALESCE(rmi.is_deleted, FALSE)
--   GROUP BY mi.menu_code;
--   -- expect 14 for every row (matches plat_pm_quality_testing's live grant count).
