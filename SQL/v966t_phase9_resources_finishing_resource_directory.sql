-- ============================================================================
-- v966t: Core PM Menu Rationalisation — Phase 9 (finishing touch): Resources > Resource Directory
-- ============================================================================
-- projectplan/v966_core_pm_menu_rationalisation_plan.md Phase 9.
-- Documentation/Core_PM_and_Industry_Menu_Taxonomy.md §3 (Resources > Resource Plan).
--
-- Continues SQL/v966n's deliberately-partial Resources group. Resource Directory
-- (plat_pm_resource_dir, 12 grants, route /platform/resources) is unambiguous the same way
-- Capacity was: it is not simultaneously a Team-Members / Contact-Directory concept the way Manage
-- Roles / Skill Matrix / Leave Calendar / Team Charter / All Teams / My Team still are (those stay
-- under Teams, unmoved, pending a future "Project Setup > Project Team" destination). Re-parented
-- out of Teams into the existing plat_pm_resources group (created by v966n) alongside Capacity.
-- Same-id re-parent — no grant migration needed.
--
-- IMPORTANT — dedupe interaction (same class of issue v966n found and fixed for Capacity): the
-- orphan row pmo-people-resource-directory (route /platform/teams/directory,
-- packages/config/src/pmoMenuConfig.js) shares peopleLeafSemanticKey()'s 'people:resource-directory'
-- dedupe bucket with plat_pm_resource_dir, but pmoMenuSemanticDedupe.js only collapses SIBLINGS
-- under the same parent. Before this migration both were routed to plat_grp_pm_teams by
-- inferPmPlatformCategoryId's Teams catch-all regex, so they deduped correctly. Simulating the bare
-- SQL move without a matching JS change (verified via harness) produced a VISIBLE DUPLICATE for
-- every role granted both (e.g. pmo_admin) — one "Resource Directory" under Teams (orphan) and one
-- under the new Resources parent (real row), no longer siblings. Fixed in the same commit as this
-- file: packages/config/src/pmoMenuHierarchyUtils.js's inferPmPlatformCategoryId now routes BOTH
-- plat_pm_resource_dir/pmo-people-resource-directory's code AND "resource directory" text to
-- plat_pm_resources (removed from the Teams catch-all), keeping them siblings under the new parent
-- so dedupe continues to collapse them exactly as before. Harness-verified: pmo_admin (granted the
-- orphan path) sees exactly one "Resource Directory" entry post-move, same as pre-move.
--
-- Manage Roles / Skill Matrix / Leave Calendar / Team Charter / All Teams / My Team deliberately
-- STAY under Teams — not moved by this file. Assignments and Timesheets remain deferred per
-- v966n's own notes (unchanged).
--
-- Harness-verified (before/after across all 111 live roles): change isolated to the moved leaf
-- (no longer a Teams child, now a Resources child) with zero duplicate or missing entries for any
-- role, confirmed both by full-tree diff and an explicit per-role menu_code presence/duplicate scan.
-- ============================================================================

UPDATE public.menu_items
SET parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_resources' AND COALESCE(is_deleted, FALSE) = FALSE),
    menu_level = 3,
    sort_order = 20,
    updated_at = NOW()
WHERE menu_code = 'plat_pm_resource_dir' AND COALESCE(is_deleted, FALSE) = FALSE;

DO $$ BEGIN RAISE NOTICE 'v966t_phase9_resources_finishing_resource_directory.sql applied successfully'; END $$;
