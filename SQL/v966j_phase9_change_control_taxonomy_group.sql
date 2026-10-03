-- ============================================================================
-- v966j: Core PM Menu Rationalisation — Phase 9 (taxonomy group 3 of N): Change Control
-- ============================================================================
-- projectplan/v966_core_pm_menu_rationalisation_plan.md Phase 9.
-- Documentation/Core_PM_and_Industry_Menu_Taxonomy.md §3 (Change Control: Change Requests /
-- Change Assessment / Change Decisions / Change Implementation).
--
-- Third taxonomy group split out of the old functional "Controls & Registers" bucket (after
-- v966h's RAID and v966i's Benefits). Change Log is currently one leaf nested under Controls &
-- Registers > Core Controls, alongside Delay Register (which stays — taxonomy §3 has no
-- explicit "Delay Register" leaf, same "leave it out rather than guess" discipline as the prior
-- two files).
--
-- Same no-grant-migration-needed pattern as v966h/v966i: the leaf keeps its existing
-- menu_items.id, so every role already granted plat_pm_change_log keeps exactly the same
-- visibility with only a parent_menu_id/menu_level/sort_order change.
-- ============================================================================

-- ── Step 1: create the new "Change Control" top-level PM category row ───────────────────────

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'plat_pm_change_control', 'Change Control',
  'Change requests, assessment, decisions, and implementation (taxonomy §3).',
  NULL,
  (SELECT parent_menu_id FROM public.menu_items
     WHERE menu_code = 'plat_grp_pm_controls' AND COALESCE(is_deleted, FALSE) = FALSE),
  2, 72, 'universal', 'git-commit', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_change_control' AND COALESCE(is_deleted, FALSE) = FALSE
);

-- ── Step 2: re-parent Change Log under the new row ───────────────────────────────────────────

UPDATE public.menu_items
SET parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_change_control' AND COALESCE(is_deleted, FALSE) = FALSE),
    menu_level = 3,
    sort_order = 10,
    updated_at = NOW()
WHERE menu_code = 'plat_pm_change_log' AND COALESCE(is_deleted, FALSE) = FALSE;

DO $$ BEGIN RAISE NOTICE 'v966j_phase9_change_control_taxonomy_group.sql applied successfully'; END $$;
