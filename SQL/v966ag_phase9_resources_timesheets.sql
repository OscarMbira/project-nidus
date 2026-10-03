-- ============================================================================
-- v966ag: Core PM Menu Rationalisation — Phase 9: Resources > Timesheets
-- ============================================================================
-- projectplan/v966_core_pm_menu_rationalisation_plan.md Phase 9 (Resources group, continuing
-- SQL/v966n/v966t's deliberately-partial build).
-- Documentation/Core_PM_and_Industry_Menu_Taxonomy.md §3 (Resources: ... Timesheets).
--
-- Fixes the pre-existing bug v966n's own header explicitly flagged and deliberately left
-- unfixed: plat_tm_timesheets ("Time Entry") lives under the legacy plat_sec_personal
-- ("Personal Workspace") DB shell, which flattenLegacyCategoryShells() explodes into individual
-- orphan roots for PM-layout rendering -- and inferPmPlatformCategoryId() has no matching
-- branch for "timesheet" text/codes at all (that branch only exists in the SIMULATOR PM-layout
-- inference function), so the row silently disappears from the PM-layout sidebar for every role
-- granted it today, including pmo_admin. Re-parenting it under a real DB parent (plat_pm_
-- resources) fixes this as a side effect -- deliberately done now, per this task's explicit
-- brief, rather than quietly inside an unrelated relabel as v966n's header warned against.
--
-- Bundles TWO fixes onto the same row in one UPDATE: the re-parent (fixes the orphan-visibility
-- bug above) AND a route_path correction. Fresh grep of apps/platform/src/routes/
-- platformRoutes.jsx confirms the actually-registered route is 'platform/timesheets' (rendering
-- MyTimesheetsPage) -- NOT the stale 'platform/timesheets/my' the row has stored today (that
-- exact path is not registered anywhere). Also relabeled "Timesheets" -> "Time Entry" to match
-- taxonomy §3's naming.
--
-- plat_tl_timesheet_mgmt (route /platform/timesheets/team, rendering TeamTimesheetsPage --
-- confirmed already correctly registered, no route fix needed) is re-parented alongside it as
-- the "Approvals" sibling (relabeled from "Timesheet Management" to match taxonomy §3's
-- Resources > Timesheets > Approvals naming).
--
-- Both re-parents keep the leaf's existing menu_items.id -- no grant migration needed, same
-- no-migration-needed pattern as every other Phase 9 re-parent (v966h-v966q). Fresh live grant
-- counts: plat_tm_timesheets 5 roles (Content-Range 0-4/5), plat_tl_timesheet_mgmt 4 roles
-- (Content-Range 0-3/4) -- both match the brief's estimates exactly, no correction needed.
--
-- DEDUPE CHECK: plat_pm_resources' current children (Capacity Planning /platform/resources/
-- capacity, Resource Directory /platform/resources) share no route/semantic-key overlap with
-- either Timesheets row (/platform/timesheets, /platform/timesheets/team) -- confirmed via
-- pmoMenuSemanticDedupe.js's peopleLeafSemanticKey(), which has no branch matching "timesheet"
-- text at all. No orphan pmo-people-*-style row exists for timesheets either (confirmed via
-- fresh query: no menu_items row with "timesheet" in its code/label has a NULL parent_menu_id)
-- -- unlike the Capacity/Resource Directory moves (v966n/v966t), no matching
-- inferPmPlatformCategoryId regex-split fix is needed here.
--
-- "My Lesson Actions" (plat_tm_lesson_actions) has the identical root-cause bug (same
-- plat_sec_personal shell, same missing inferPmPlatformCategoryId branch) but is out of
-- Resources' taxonomy scope -- NOT touched by this file, remains a follow-up.
-- ============================================================================

-- ── Timesheets ("Time Entry") -- re-parent, relabel, route fix ──────────────────────────────

UPDATE public.menu_items
SET parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_resources' AND COALESCE(is_deleted, FALSE) = FALSE),
    menu_level = 3,
    sort_order = 30,
    menu_label = 'Time Entry',
    route_path = '/platform/timesheets',
    updated_at = NOW()
WHERE menu_code = 'plat_tm_timesheets' AND COALESCE(is_deleted, FALSE) = FALSE;

-- ── Timesheet Management ("Approvals") -- re-parent, relabel, no route change ────────────────

UPDATE public.menu_items
SET parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_resources' AND COALESCE(is_deleted, FALSE) = FALSE),
    menu_level = 3,
    sort_order = 40,
    menu_label = 'Approvals',
    updated_at = NOW()
WHERE menu_code = 'plat_tl_timesheet_mgmt' AND COALESCE(is_deleted, FALSE) = FALSE;

DO $$ BEGIN RAISE NOTICE 'v966ag_phase9_resources_timesheets.sql applied successfully'; END $$;
