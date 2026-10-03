-- ============================================================================
-- v966ak: Core PM Menu Rationalisation — Phase 6: wire the last 5 already-built, currently-
-- unlinked pages into Core PM (Scope Statement, WBS Builder, Schedule Management Plan, Quality
-- Reviews, Testing Centre dashboard).
-- ============================================================================
-- projectplan/v966_core_pm_menu_rationalisation_plan.md Phase 6.
--
-- Investigated one at a time per this run's brief, same pattern already validated twice this
-- initiative (Planning > Schedule's v966v, Planning > Scenario Planning's v966af): confirm a real
-- page + registered route exists, confirm the route is actually reachable (a live <Route>, not
-- just a stale menu_items.route_path), check for existing dead/soft-deleted rows at the same
-- route (do NOT reactivate — create fresh plat_pm_*-prefixed rows, same convention as
-- v966v/v966af/v966y), then wire a new leaf with grants copied from the most relevant direct
-- sibling in the target taxonomy group.
--
-- LIVE-DATA FINDING (corrects the task brief's premise): all 5 items already have a real,
-- live-registered <Route> in apps/platform/src/routes/platformRoutes.jsx today — this is NOT a
-- "does the route even exist" question for any of the 5 (unlike some earlier Phase 6 items).
-- Confirmed via direct grep of platformRoutes.jsx (not assumed from the audit docs):
--   - Scope Statement:          projects/:projectId/scope/statement          (platformRoutes.jsx:3391)
--   - WBS Builder:               projects/:projectId/scope/wbs                (platformRoutes.jsx:3433)
--   - Schedule Management Plan:  projects/:projectId/schedule/management-plan (platformRoutes.jsx:3440)
--   - Quality Reviews:           quality/reviews                              (platformRoutes.jsx:1729)
--   - Testing Centre:            testing-centre/*                             (platformRoutes.jsx:4115)
-- All 5 pages/lazy-imports/routeCommon.jsx re-exports were checked individually — no
-- ReferenceError-class gap (the "missing from routeCommon.jsx's re-export chain" bug that hit
-- Integrations/Project Calendar/Assumptions/Cost Actuals/Milestones-Governance-Actions earlier
-- this session) exists for any of these 5.
--
-- Route-param note: Scope Statement/WBS Builder/Schedule Management Plan all use the
-- `:projectId` token (not the `:id` token style Planning > Schedule's leaves used in v966v) —
-- apps/platform/src/utils/sidebarRouteUtils.js's resolveMenuRoutePath() substitutes
-- `:projectId` directly (`.replaceAll(':projectId', platformPid)`, line 53) for any route
-- matching `/platform/projects/`, so this is the OTHER already-confirmed-working convention, not
-- a new one requiring separate verification (per this run's brief — the general mechanism
-- question is settled; this is just confirming which of the 2 known conventions each route
-- uses).
--
-- Dead/soft-deleted rows at the same route, checked and deliberately NOT reactivated:
--   - Scope Statement / WBS Builder / Schedule Management Plan / Quality Reviews: zero existing
--     menu_items rows at any of these 4 routes (confirmed via live query) — nothing to avoid
--     reactivating, these are clean net-new leaves.
--   - Testing Centre (/platform/testing-centre): 3 dead rows found, ALL is_deleted = true —
--     testing_diagnostics_dashboard, testing_qa_dashboard, pm_testing_dashboard (3 different
--     legacy generations, same as the already-documented pmo_section_*/pm_section_*/
--     platform_section_* dead-generation pattern from Phase 0). NOT reactivated; a fresh
--     plat_pm_*-prefixed row is created instead, same convention as v966v/v966af/v966y.
--
-- ITEM-BY-ITEM PLACEMENT DECISIONS:
--
-- 1+2. Scope Statement + WBS Builder — placed as DIRECT children of plat_pm_planning, NOT nested
--      inside the plat_pm_planning_schedule sub-group ("Activity Register"/"Gantt"/"Network /
--      Dependencies" only). Reasoning: both routes live under a `/scope/` URL segment
--      (`projects/:projectId/scope/statement`, `projects/:projectId/scope/wbs`), not `/schedule/`
--      — they are Scope-definition artefacts (PMBOK/standard PM practice: Scope Statement and
--      WBS both belong to the scope-planning discipline, feeding INTO the schedule but not being
--      schedule artefacts themselves), matching the existing sibling plat_pm_a_scurve (S-Curve &
--      Baselines) and plat_pm_planning_assumptions (Planning Assumptions), which are also direct
--      plat_pm_planning children rather than Schedule sub-group members. This does NOT reopen
--      PRD decision 12 ("Scope & Deliverables" settled out of scope as its own top-level taxonomy
--      GROUP) — these 2 leaves nest under the existing, already-in-scope universal Planning
--      group, they do not create a new "Scope & Deliverables" section. Confirmed neither page
--      has any project-methodology-track gating (grepped both .jsx files for "methodology" —
--      ScopeStatement.jsx: no match; WBSBuilder.jsx: no match), so nesting them under a universal
--      (non-track-locked) category carries none of the Structured-track visibility-broadening
--      risk documented for Business Case/Mandate/Brief/PID in Phase 9's "systemic blocker"
--      finding — these are genuinely methodology-neutral tools, same class as S-Curve & Baselines.
--      Grants copied from the direct sibling plat_pm_a_scurve (12 live grants, freshly
--      re-verified) — same grant-copy pattern as v966m/v966v/v966af/v966y.
--
-- 3. Schedule Management Plan — placed INSIDE the existing plat_pm_planning_schedule sub-group,
--    alongside Activity Register/Gantt/Network-Dependencies. Reasoning: unlike Scope
--    Statement/WBS Builder, this route's own URL segment IS `/schedule/`
--    (`projects/:projectId/schedule/management-plan`) and its content is literally "how the
--    schedule will be managed" (scheduling_methodology/scheduling_tool/level_of_accuracy fields,
--    confirmed via reading ScheduleManagementPlan.jsx) — a genuine schedule-management planning
--    artefact, the same discipline as its 3 prospective siblings. Grants copied from the direct
--    schedule-sub-group sibling plat_pm_planning_activities (12 live grants, freshly
--    re-verified — matches its 2 siblings' grant counts exactly, all 3 still 12/12 as of this
--    run).
--
-- 4+5. Quality Reviews + Testing Centre — both placed as children of the existing plat_pm_quality
--      group, alongside its sole existing child Quality Register (plat_pm_quality_reg, 12 live
--      grants, freshly re-verified). Quality Reviews (route /platform/quality/reviews,
--      QualityReviews.jsx) is confirmed a genuinely separate CRUD surface from Quality Register
--      (different table/service: qualityManagementService's getQualityReviews/
--      deleteQualityReview, filtered by quality_register_id — reviews ARE children of register
--      entries, not a duplicate of the register itself) — a clean additive Quality-group leaf.
--      Grants copied from plat_pm_quality_reg (12 live grants).
--
--      Testing Centre (route /platform/testing-centre, apps/platform/src/pages/testingCentre/*)
--      — confirmed GENUINELY DISTINCT from the already-live "Testing" entry
--      (plat_pm_quality_testing, /platform/testing, TestDashboard.jsx): different source files,
--      different service layer (testingCentreService, mode-aware platform/sim, vs
--      testSuiteService/testCaseService/testRunService/defectService), and materially richer
--      scope (adds diagnostics, defects, evidence, environments, automated scripts, and settings
--      on top of suites/cases/runs/defects — the same "materially richer, more complete Testing
--      implementation" finding already flagged as judgment call #9 in this plan's Review section,
--      first noticed while relabelling plat_pm_quality_testing in v966r).
--
--      DECISION MADE THIS PASS (NEEDS USER CONFIRMATION — a genuine product decision, not a
--      verifiable fact): whether Testing Centre should eventually REPLACE the existing Testing
--      entry (swap the canonical implementation) is explicitly OUT OF SCOPE for this file — v966r
--      already flagged that swap as "a bigger, separately-decided product choice, not a menu-
--      label fix," and nothing in this pass's brief authorises making that call. The safe default
--      applied here: wire Testing Centre as an ADDITIVE, clearly-distinct-labelled second entry
--      ("Testing Centre") coexisting alongside the existing "Testing" entry — this makes a
--      currently fully-built-but-completely-unreachable capability (0 grants on all 3 of its dead
--      legacy rows) reachable for the first time, without silently replacing or deprecating
--      anything. If the intent is instead to eventually retire "Testing" in favour of "Testing
--      Centre" (or vice versa), that is a separate follow-up decision, not assumed here.
--      Grants copied from plat_pm_quality_reg (12 live grants) — same source as Quality Reviews,
--      since Testing Centre has no existing sibling of its own to copy from (it is being wired
--      for the first time).
--
-- Dedupe-collision check (per the standing Phase 9 checklist — grep pmoMenuSemanticDedupe.js
-- before writing any re-parent/new-leaf SQL): no semantic key exists for "scope statement", "wbs
-- builder"/"work breakdown structure", "schedule management plan", "quality reviews", or
-- "testing centre" in packages/config/src/pmoMenuSemanticDedupe.js — no dedupe-collision risk,
-- no matching inferPmPlatformCategoryId fix needed (all 5 leaves nest under DB parents that are
-- already-recognised plat_pm_* categories, so no orphan-bucketing involvement at all). No JS
-- deploy dependency for this file.
--
-- MUST RUN AFTER: v966m (plat_pm_planning must exist), v966v (plat_pm_planning_schedule must
-- exist), v966o (plat_pm_quality must exist) — all three already confirmed run as part of the
-- earlier v966a-v966ab / v966ac-ai batches.
--
-- Simulator parity: NOT attempted — Simulator has no live plat_pm_planning/plat_pm_quality-
-- equivalent taxonomy groups yet (Phase 9's Simulator mirror remains deferred to Phase 14, same
-- reasoning already applied to every other Phase 9/11/12 Platform-only sidebar wire this
-- initiative). None of the 5 pages themselves are Simulator capabilities to begin with (all 5 are
-- Platform-only features), so this is not a parity gap, just a Platform-only feature getting its
-- Platform-only sidebar entry.
--
-- Every INSERT is WHERE NOT EXISTS guarded (idempotent — safe to re-run). Grant-copy INSERTs read
-- role_menu_items live at run time (not a hardcoded role list frozen at investigation time), same
-- pattern as every other Phase 9/11/12 grant-copy in this initiative.
-- ============================================================================

-- NOTE (2026-08-24): rewritten from the original INSERT...SELECT-with-scalar-subquery-in-the-
-- select-list form to an equivalent CTE form after the original form reproducibly triggered
-- "ERROR: 42P01: relation "a" does not exist" in Supabase Studio's SQL Editor for some (not all)
-- of the 5 items, even for a single, standalone, alias-free statement — never a genuine Postgres
-- parse error (no "a" identifier exists anywhere in the original SQL), consistent with a
-- client-side pre-parse/preview quirk in Studio reacting to that specific shape. This CTE form is
-- semantically identical (same guards, same result) but avoids a subquery nested inside a SELECT
-- list entirely, resolving the parent lookup via a normal FROM/JOIN instead.

-- 1. Scope Statement — new leaf under plat_pm_planning.
WITH parent AS (
  SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_planning' AND COALESCE(is_deleted, FALSE) = FALSE
)
INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'plat_pm_planning_scope_statement', 'Scope Statement',
  'Project scope statement: in-scope/out-of-scope, deliverables, acceptance criteria, constraints and assumptions (Phase 6, v966ak).',
  '/platform/projects/:projectId/scope/statement',
  parent.id,
  2, 20, 'universal', 'file-text', TRUE, TRUE, NOW(), NOW()
FROM parent
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_planning_scope_statement' AND COALESCE(is_deleted, FALSE) = FALSE
);

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_pm_a_scurve'
JOIN public.menu_items dst ON dst.menu_code = 'plat_pm_planning_scope_statement' AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

-- 2. WBS Builder — new leaf under plat_pm_planning.
WITH parent AS (
  SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_planning' AND COALESCE(is_deleted, FALSE) = FALSE
)
INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'plat_pm_planning_wbs', 'WBS Builder',
  'Work Breakdown Structure builder/editor for decomposing project scope into a hierarchical work package tree (Phase 6, v966ak).',
  '/platform/projects/:projectId/scope/wbs',
  parent.id,
  2, 25, 'universal', 'git-branch', TRUE, TRUE, NOW(), NOW()
FROM parent
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_planning_wbs' AND COALESCE(is_deleted, FALSE) = FALSE
);

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_pm_a_scurve'
JOIN public.menu_items dst ON dst.menu_code = 'plat_pm_planning_wbs' AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

-- 3. Schedule Management Plan — new leaf under plat_pm_planning_schedule (Activity
--    Register/Gantt/Network-Dependencies' existing sub-group).
WITH parent AS (
  SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_planning_schedule' AND COALESCE(is_deleted, FALSE) = FALSE
)
INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'plat_pm_planning_schedule_mgmt_plan', 'Schedule Management Plan',
  'Planning document describing how the project schedule will be developed, monitored and controlled (scheduling methodology, tool, level of accuracy) (Phase 6, v966ak).',
  '/platform/projects/:projectId/schedule/management-plan',
  parent.id,
  3, 40, 'universal', 'clipboard-list', TRUE, TRUE, NOW(), NOW()
FROM parent
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_planning_schedule_mgmt_plan' AND COALESCE(is_deleted, FALSE) = FALSE
);

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_pm_planning_activities'
JOIN public.menu_items dst ON dst.menu_code = 'plat_pm_planning_schedule_mgmt_plan' AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

-- 4. Quality Reviews — new leaf under plat_pm_quality (alongside Quality Register).
WITH parent AS (
  SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_quality' AND COALESCE(is_deleted, FALSE) = FALSE
)
INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'plat_pm_quality_reviews', 'Quality Reviews',
  'Quality review records raised against Quality Register entries — a distinct CRUD surface from the register itself (Phase 6, v966ak).',
  '/platform/quality/reviews',
  parent.id,
  2, 20, 'universal', 'clipboard-check', TRUE, TRUE, NOW(), NOW()
FROM parent
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_quality_reviews' AND COALESCE(is_deleted, FALSE) = FALSE
);

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_pm_quality_reg'
JOIN public.menu_items dst ON dst.menu_code = 'plat_pm_quality_reviews' AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

-- 5. Testing Centre — new leaf under plat_pm_quality (additive, coexists with the existing
--    "Testing" entry plat_pm_quality_testing — see file header "NEEDS USER CONFIRMATION" note on
--    whether these two should eventually be consolidated; not decided by this file).
--    NOT a reactivation of the 3 dead rows at this same route (testing_diagnostics_dashboard /
--    testing_qa_dashboard / pm_testing_dashboard, all is_deleted = true) — a fresh
--    plat_pm_*-prefixed row, same convention as v966v/v966af/v966y.
WITH parent AS (
  SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_quality' AND COALESCE(is_deleted, FALSE) = FALSE
)
INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'plat_pm_testing_centre', 'Testing Centre',
  'Org-wide testing centre — test suites/cases/runs, defects, evidence, environments, automated scripts and settings; a richer, separate surface from the existing Testing dashboard (Phase 6, v966ak).',
  '/platform/testing-centre',
  parent.id,
  2, 30, 'universal', 'flask-conical', TRUE, TRUE, NOW(), NOW()
FROM parent
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_testing_centre' AND COALESCE(is_deleted, FALSE) = FALSE
);

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_pm_quality_reg'
JOIN public.menu_items dst ON dst.menu_code = 'plat_pm_testing_centre' AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v966ak_phase6_remaining_leaves_wire.sql applied successfully'; END $$;

-- Post-run verification (run manually):
--   SELECT menu_code, menu_label, parent_menu_id, route_path, is_active
--   FROM public.menu_items
--   WHERE menu_code IN (
--     'plat_pm_planning_scope_statement', 'plat_pm_planning_wbs',
--     'plat_pm_planning_schedule_mgmt_plan', 'plat_pm_quality_reviews', 'plat_pm_testing_centre'
--   );
--   -- expect all 5 active, correct parent_menu_id per the placement decisions above.
--   SELECT mi.menu_code, count(*) AS grant_count
--   FROM public.role_menu_items rmi
--   JOIN public.menu_items mi ON mi.id = rmi.menu_item_id
--   WHERE mi.menu_code IN (
--     'plat_pm_planning_scope_statement', 'plat_pm_planning_wbs',
--     'plat_pm_planning_schedule_mgmt_plan', 'plat_pm_quality_reviews', 'plat_pm_testing_centre'
--   ) AND rmi.can_view AND rmi.is_active AND NOT COALESCE(rmi.is_deleted, FALSE)
--   GROUP BY mi.menu_code;
--   -- expect 12 for every row (matches each item's grant-copy source's live count as of this run).
