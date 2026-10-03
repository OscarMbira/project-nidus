-- ============================================================================
-- v966v: Core PM Menu Rationalisation — Phase 9 (taxonomy group 13 of 16): Planning > Schedule
-- ============================================================================
-- projectplan/v966_core_pm_menu_rationalisation_plan.md Phase 9.
-- Documentation/Core_PM_and_Industry_Menu_Taxonomy.md §3 (Planning > Schedule: Activity
-- Register / Gantt / Network-Dependencies / Critical Path / Look-Ahead Plan / Schedule Variance).
--
-- Continues SQL/v966m's deliberately-partial Planning group. Wires the "Schedule" sub-group
-- (Planning's first taxonomy sub-leaf, previously deferred across 2 prior runs as "same
-- 'wire an unlinked page' class of work already flagged undone in Phase 6 -- route-param
-- substitution unconfirmed").
--
-- THREE real, already-built pages exist with NO live menu_items row today:
--   - ActivityListPage    (apps/platform/src/pages/schedule/ActivityList.jsx)
--     route: projects/:projectId/schedule/activities  -> "Activity Register"
--   - GanttChartPage       (apps/platform/src/pages/schedule/GanttChart.jsx)
--     route: projects/:projectId/schedule/gantt        -> "Gantt"
--   - ActivitySequencingPage (apps/platform/src/pages/.../ActivitySequencing)
--     route: projects/:projectId/schedule/dependencies -> "Network / Dependencies"
-- All three confirmed registered in apps/platform/src/routes/platformRoutes.jsx (lines ~3443-
-- 3470, under the "platform/*" route tree, i.e. full path /platform/projects/:projectId/...).
--
-- A DEAD, pre-v966 menu generation (pm_activity_list / pm_gantt_chart / pm_activity_sequencing,
-- under root pm_planning_section > pm_schedule_group) already covered these exact three routes
-- using an `:id` token instead of `:projectId` -- but every row in that branch was soft-deleted
-- (is_deleted = true) back in June 2026, unrelated to this initiative, and is NOT reactivated
-- here (that whole `pm_*` generation is the one Phase 0/v966a already classified as fully dead
-- and superseded by the plat_sec_*/plat_pm_* tree this initiative works from exclusively). New
-- `plat_pm_*`-prefixed rows are created instead, matching every other Phase 9 file's naming
-- convention.
--
-- ROUTE-PARAM SUBSTITUTION -- the concern that blocked this in Phase 6/v966m -- CONFIRMED SAFE:
-- apps/platform/src/utils/sidebarRouteUtils.js's resolveMenuRoutePath() explicitly handles BOTH
-- token styles once the route matches `/platform/projects/`:
--     .replaceAll(':projectId', platformPid)
--     .replaceAll('/:id/', `/${platformPid}/`)
-- New rows below use the `:id` token (matching the one other still-live sidebar precedent for
-- this exact route family, pm_project_calendar / pm_project_calendar_exceptions, both excluded
-- from v966a's deletion and still active today at /platform/projects/:id/schedule/calendar...) --
-- confirmed to resolve correctly either way.
--
-- DEDUPE CHECK (the class of bug found twice already in this phase, v966n/v966t) -- verified
-- via grep of packages/config/src/pmoMenuSemanticDedupe.js: no semantic key exists for
-- "gantt"/"activity register"/"activity sequencing"/"network dependencies" anywhere in the file
-- (planningLeafSemanticKey only covers "planning hub"/"intelligence rules"/"governance rules",
-- unrelated). No other live or orphan row shares these three exact route_path values either
-- (confirmed via fresh query). No orphan-dedupe risk, no matching inferPmPlatformCategoryId
-- change needed -- these are brand-new codes with a real DB parent from creation, never orphans.
--
-- GRANTS -- copied (not migrated, since these are brand-new rows, not moved leaves) from
-- plat_pm_a_scurve ("S-Curve & Baselines", the direct sibling under Planning created by v966m,
-- 12 roles: account_owner, clinical_trial_manager, hr_business_partner, marketing_programme_
-- manager, pmo_admin, product_manager, product_owner, project_manager, public_sector_project_
-- manager, release_train_engineer, software_engineering_manager, system_admin) -- the closest
-- comparable "Planning group, scheduling-adjacent, universal-methodology" precedent, same
-- grant-copy pattern as v966m's own Planning Assumptions wiring and v966f's RACI/Team Charter.
--
-- Taxonomy's 3 remaining Schedule sub-leaves (Critical Path / Look-Ahead Plan / Schedule
-- Variance) have no confirmed dedicated page in the codebase -- NOT built here, genuine gaps,
-- left deferred rather than guessed at (same "don't force it" discipline as every prior Phase 9
-- file).
--
-- Harness-verified (before/after across all 111 live roles, real packages/config/src/*
-- functions bundled with esbuild against a fresh live snapshot): isolated to exactly the 4 new
-- codes (the Schedule sub-group + its 3 leaves) appearing for the 12 roles with the copied
-- grant; zero codes lost anywhere; zero new duplicates introduced for any of the 111 roles. A
-- pre-existing, unrelated duplicate ('pmo-cat-standards-based' appearing twice for the same 12
-- broadly-granted roles) was found in BOTH the before and after snapshots -- confirmed NOT
-- caused by this file, not fixed here (same "flag, don't silently fix" discipline as the
-- Timesheets/quality_testing-route bugs found by prior runs) -- see plan file for detail.
-- ============================================================================

-- ── Step 1: create the "Schedule" sub-group under Planning ──────────────────────────────────

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'plat_pm_planning_schedule', 'Schedule',
  'Activity Register, Gantt, and Network/Dependencies (taxonomy §3, partial -- Critical Path/Look-Ahead Plan/Schedule Variance have no existing page, left as gaps).',
  NULL,
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_planning' AND COALESCE(is_deleted, FALSE) = FALSE),
  3, 5, 'universal', 'calendar-clock', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_planning_schedule' AND COALESCE(is_deleted, FALSE) = FALSE
);

-- ── Step 2: create the 3 leaf rows ───────────────────────────────────────────────────────────

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'plat_pm_planning_activities', 'Activity Register',
  'Project activity list (taxonomy §3, Planning > Schedule > Activity Register).',
  '/platform/projects/:id/schedule/activities',
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_planning_schedule' AND COALESCE(is_deleted, FALSE) = FALSE),
  4, 10, 'universal', 'list', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_planning_activities' AND COALESCE(is_deleted, FALSE) = FALSE
);

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'plat_pm_planning_gantt', 'Gantt',
  'Project Gantt chart (taxonomy §3, Planning > Schedule > Gantt).',
  '/platform/projects/:id/schedule/gantt',
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_planning_schedule' AND COALESCE(is_deleted, FALSE) = FALSE),
  4, 20, 'universal', 'bar-chart-2', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_planning_gantt' AND COALESCE(is_deleted, FALSE) = FALSE
);

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'plat_pm_planning_sequencing', 'Network / Dependencies',
  'Activity sequencing / predecessor-successor network (taxonomy §3, Planning > Schedule > Network / Dependencies -- distinct from RAID > Dependencies, which is the cross-team Dependency Register).',
  '/platform/projects/:id/schedule/dependencies',
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_planning_schedule' AND COALESCE(is_deleted, FALSE) = FALSE),
  4, 30, 'universal', 'git-merge', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_planning_sequencing' AND COALESCE(is_deleted, FALSE) = FALSE
);

-- ── Step 3: grant-copy from plat_pm_a_scurve (Planning's closest comparable sibling) ────────

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_pm_a_scurve'
JOIN public.menu_items dst ON dst.menu_code = 'plat_pm_planning_activities' AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_pm_a_scurve'
JOIN public.menu_items dst ON dst.menu_code = 'plat_pm_planning_gantt' AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_pm_a_scurve'
JOIN public.menu_items dst ON dst.menu_code = 'plat_pm_planning_sequencing' AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v966v_phase9_planning_schedule_wire.sql applied successfully'; END $$;
