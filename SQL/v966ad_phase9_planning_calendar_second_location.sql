-- ============================================================================
-- v966ad: Core PM Menu Rationalisation — Phase 9: Planning > Calendars (2nd location)
-- ============================================================================
-- projectplan/v966_core_pm_menu_rationalisation_plan.md Phase 9 (Planning group, continuing
-- SQL/v966m/v966v/v966y/v966ac's deliberately-partial build).
-- Documentation/Core_PM_and_Industry_Menu_Taxonomy.md §3 (Planning: ... Calendars ...).
--
-- Wires the Planning-side "Calendars" location, pointing at the same canonical schedule
-- calendar as the existing sidebar precedent pm_project_calendar (/platform/projects/:id/
-- schedule/calendar, re-parented under plat_grp_pm_projects by v966e's Phase 5 rescue and still
-- live/granted today). Same additive-dual-location pattern as v966m's Planning Assumptions leaf
-- and this run's own v966ac (Dependencies) -- new row, grants copied not migrated, both rows
-- keep rendering independently in their own taxonomy branch.
--
-- Deliberately NOT the general calendar consolidation (SQL/v966ae, same run) -- that file
-- dedupes the *generic* /platform/calendar and /platform/tasks/calendar duplicate clusters.
-- This is a different route entirely (the project-scoped schedule calendar), unaffected by
-- that consolidation.
--
-- Fresh live verification (this session): pm_project_calendar has 4 active/granted roles today
-- (Content-Range 0-3/4 via PostgREST) -- matches the brief's "~4 roles" estimate exactly, no
-- correction needed.
--
-- DEDUPE CHECK: pm_project_calendar's parent is plat_grp_pm_projects; this new row's parent is
-- plat_pm_planning -- different parents, so dedupePmoMenuSiblings() never treats them as the
-- same dedupe candidate (packages/config/src/pmoMenuSemanticDedupe.js only collapses siblings
-- under the same parent). No semantic key exists for "calendar" in pmoMenuSemanticDedupe.js
-- either, so even a same-parent case would only fall back to the path-based key -- moot here.
-- ============================================================================

-- ── Wire "Calendars" as a second location for the shared project schedule calendar ──────────

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'plat_pm_planning_calendar', 'Calendars',
  'Same project schedule calendar as the Schedule sub-group''s canonical calendar -- linked from Planning as a second taxonomy location (taxonomy §3, Planning).',
  (SELECT route_path FROM public.menu_items WHERE menu_code = 'pm_project_calendar' AND COALESCE(is_deleted, FALSE) = FALSE),
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_planning' AND COALESCE(is_deleted, FALSE) = FALSE),
  3, 50, 'universal', 'calendar', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_planning_calendar' AND COALESCE(is_deleted, FALSE) = FALSE
)
AND EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_planning' AND COALESCE(is_deleted, FALSE) = FALSE
);

-- Copy (not migrate) grants from pm_project_calendar onto the new row.

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'pm_project_calendar'
JOIN public.menu_items dst ON dst.menu_code = 'plat_pm_planning_calendar' AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v966ad_phase9_planning_calendar_second_location.sql applied successfully'; END $$;
