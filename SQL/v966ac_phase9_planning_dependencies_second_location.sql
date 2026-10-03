-- ============================================================================
-- v966ac: Core PM Menu Rationalisation — Phase 9: Planning > Dependencies (2nd location)
-- ============================================================================
-- projectplan/v966_core_pm_menu_rationalisation_plan.md Phase 9 (Planning group, continuing
-- SQL/v966m/v966v/v966y's deliberately-partial build).
-- Documentation/Core_PM_and_Industry_Menu_Taxonomy.md §3 (Planning: ... Dependencies ...).
--
-- Wires the second, Planning-side location for the Dependency Register, exactly as v966m's
-- header already flagged as deferred ("Dependencies -- already has a canonical home under RAID
-- (v966h); taxonomy §3 lists 'Dependencies' under both Planning and RAID, but no explicit user
-- decision... authorises a second menu location for it") -- that decision has since been made
-- (this task's brief), so this file wires it now. Same route as the existing RAID sibling
-- plat_pm_dependencies_reg (/platform/dependencies, wired by v966b) -- one shared page, two
-- taxonomy entry points, same additive-dual-location pattern as v966m's Planning Assumptions
-- leaf (new row, grants copied not migrated, both rows keep rendering independently).
--
-- Fresh live verification (this session): plat_pm_dependencies_reg has 24 active/granted roles
-- today (Content-Range 0-23/24 via PostgREST) -- close to the brief's "~24 roles" estimate, no
-- correction needed.
--
-- DEDUPE CHECK: plat_pm_dependencies_reg's parent is plat_pm_ctrl_core (RAID); this new row's
-- parent is plat_pm_planning -- different parents, so dedupePmoMenuSiblings() (which only
-- collapses SIBLINGS under the same parent, per packages/config/src/pmoMenuSemanticDedupe.js)
-- never sees them as candidates for the same dedupe bucket, same reasoning already verified for
-- v966m's Planning Assumptions dual-location row. No semantic key exists for "dependencies" in
-- pmoMenuSemanticDedupe.js either (planningLeafSemanticKey only covers "planning hub"/
-- "intelligence rules"/"governance rules"), so even a same-parent collision would fall back to
-- the path-based key -- moot here since the parents differ anyway.
-- ============================================================================

-- ── Wire "Dependencies" as a second location for the shared Dependency Register ─────────────

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'plat_pm_planning_dependencies', 'Dependencies',
  'Same Dependency Register as RAID > Dependencies -- linked from both taxonomy locations (taxonomy §3, Planning).',
  (SELECT route_path FROM public.menu_items WHERE menu_code = 'plat_pm_dependencies_reg' AND COALESCE(is_deleted, FALSE) = FALSE),
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_planning' AND COALESCE(is_deleted, FALSE) = FALSE),
  3, 40, 'universal', 'git-branch', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_planning_dependencies' AND COALESCE(is_deleted, FALSE) = FALSE
)
AND EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_planning' AND COALESCE(is_deleted, FALSE) = FALSE
);

-- Copy (not migrate) grants from plat_pm_dependencies_reg onto the new row -- both rows keep
-- rendering independently in their own taxonomy location.

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_pm_dependencies_reg'
JOIN public.menu_items dst ON dst.menu_code = 'plat_pm_planning_dependencies' AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v966ac_phase9_planning_dependencies_second_location.sql applied successfully'; END $$;
