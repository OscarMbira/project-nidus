-- ============================================================================
-- v966o: Core PM Menu Rationalisation — Phase 9 (taxonomy group 8 of N): Quality
-- ============================================================================
-- projectplan/v966_core_pm_menu_rationalisation_plan.md Phase 9.
-- Documentation/Core_PM_and_Industry_Menu_Taxonomy.md §3 (Quality: Quality Plan / Quality
-- Reviews / Acceptance / Non-Conformance).
--
-- DELIBERATELY PARTIAL, and NOT a split of "Quality & Testing" -- the existing top-level
-- "Quality & Testing" item (plat_pm_quality_testing, route /platform/testing/dashboard) is ONE
-- combined page/route serving both the taxonomy's Quality and Testing disciplines. The plan's
-- Phase 9 notes explicitly flagged this as needing a same-vs-different-page verification this
-- pass still cannot safely perform (no separate Quality-only or Testing-only dashboard exists to
-- split into) -- so plat_pm_quality_testing is NOT touched by this file and stays exactly where
-- it is.
--
-- What IS moved: "Quality Register" (plat_pm_quality_reg, route /pm/controls/quality-register),
-- currently nested under Controls & Registers > Quality & Configuration. This is a genuinely
-- separate page from the combined Quality & Testing dashboard (confirmed via distinct route and
-- distinct component) -- an unambiguous Quality-discipline register with no Testing content, so
-- it moves into its own new "Quality" group without needing to resolve the harder
-- combined-dashboard question first.
--
-- Configuration Item Register (plat_pm_config_reg, same "Quality & Configuration" DB subgroup)
-- is NOT moved -- it is a PRINCE2 configuration-management concept with no corresponding leaf
-- anywhere in taxonomy §3's generic Quality group; stays under Controls & Registers.
--
-- Same no-grant-migration-needed pattern as v966h-v966k: the leaf keeps its existing
-- menu_items.id, so every role already granted plat_pm_quality_reg keeps exactly the same
-- visibility with only a parent_menu_id/menu_level/sort_order change.
-- ============================================================================

-- ── Step 1: create the new "Quality" top-level PM category row ──────────────────────────────

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'plat_pm_quality', 'Quality',
  'Quality Register (taxonomy §3, partial -- the combined "Quality & Testing" dashboard is a separate, unsplit item, see file header).',
  NULL,
  (SELECT parent_menu_id FROM public.menu_items
     WHERE menu_code = 'plat_grp_pm_controls' AND COALESCE(is_deleted, FALSE) = FALSE),
  2, 81, 'universal', 'shield-check', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_quality' AND COALESCE(is_deleted, FALSE) = FALSE
);

-- ── Step 2: re-parent Quality Register out of Controls & Registers > Quality & Configuration ──

UPDATE public.menu_items
SET parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_quality' AND COALESCE(is_deleted, FALSE) = FALSE),
    menu_level = 3,
    sort_order = 10,
    updated_at = NOW()
WHERE menu_code = 'plat_pm_quality_reg' AND COALESCE(is_deleted, FALSE) = FALSE;

DO $$ BEGIN RAISE NOTICE 'v966o_phase9_quality_taxonomy_group.sql applied successfully'; END $$;
