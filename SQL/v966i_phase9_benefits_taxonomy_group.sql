-- ============================================================================
-- v966i: Core PM Menu Rationalisation — Phase 9 (taxonomy group 2 of N): Benefits
-- ============================================================================
-- projectplan/v966_core_pm_menu_rationalisation_plan.md Phase 9.
-- Documentation/Core_PM_and_Industry_Menu_Taxonomy.md §3 (Benefits: Benefits Register /
-- Benefit Owners / Measures / Target Dates / Realisation Tracking / Post-Implementation Review).
--
-- Second taxonomy group split out of the old functional "Controls & Registers" bucket (after
-- v966h's RAID group). Benefits Register is currently one leaf nested three levels deep under
-- Controls & Registers > Scope & Value, alongside Requirements Register and EEF — but taxonomy
-- §3 gives Benefits its own top-level discipline. Only Benefits Register moves; Requirements
-- Register and EEF have no unambiguous taxonomy §3 leaf of their own yet (see plan notes) and
-- stay put, same "leave it out rather than guess" discipline as v966h.
--
-- Same no-grant-migration-needed pattern as v966h: the leaf keeps its existing menu_items.id,
-- so every role already granted plat_pm_benefits_reg keeps exactly the same visibility with
-- only a parent_menu_id/menu_level/sort_order change.
-- ============================================================================

-- ── Step 1: create the new "Benefits" top-level PM category row ─────────────────────────────

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'plat_pm_benefits', 'Benefits',
  'Benefits register, owners, realisation tracking, and post-implementation review (taxonomy §3).',
  NULL,
  (SELECT parent_menu_id FROM public.menu_items
     WHERE menu_code = 'plat_grp_pm_controls' AND COALESCE(is_deleted, FALSE) = FALSE),
  2, 105, 'universal', 'trending-up', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_benefits' AND COALESCE(is_deleted, FALSE) = FALSE
);

-- ── Step 2: re-parent Benefits Register under the new row ───────────────────────────────────

UPDATE public.menu_items
SET parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_benefits' AND COALESCE(is_deleted, FALSE) = FALSE),
    menu_level = 3,
    sort_order = 10,
    updated_at = NOW()
WHERE menu_code = 'plat_pm_benefits_reg' AND COALESCE(is_deleted, FALSE) = FALSE;

DO $$ BEGIN RAISE NOTICE 'v966i_phase9_benefits_taxonomy_group.sql applied successfully'; END $$;
