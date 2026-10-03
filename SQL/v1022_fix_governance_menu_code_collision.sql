-- ============================================================================
-- v1022: Fix Governance group menu_code collision (v1020 follow-up)
-- ============================================================================
-- Diagnostic (run by user after v1021) showed plat_pm_governance's
-- parent_menu_id = 5a896510-84e5-40dc-9d14-e7ef1d07d2d8 -- NOT
-- plat_pm_project_setup's id (86574d1e-f388-4aa5-9a5c-a6ee2401134d, which
-- Project Details/Charter/Team all correctly show). This proves 'plat_pm_governance'
-- was already an in-use menu_code belonging to a pre-existing, unrelated menu
-- item elsewhere in the tree. v1020's `WHERE NOT EXISTS` correctly avoided
-- creating a duplicate row for that code -- but the children-insert step's
-- parent-lookup subquery then silently resolved to that PRE-EXISTING node,
-- attaching all 6 new Governance leaves (+ the re-parented Governance
-- Framework) to the wrong parent instead of a new group under Project Setup.
--
-- Fix: create a group under a genuinely unique code (plat_pm_ps_governance),
-- correctly parented under plat_pm_project_setup, then move the mis-attached
-- children onto it by their own unique codes -- never touches the pre-existing
-- 'plat_pm_governance' item or whatever it legitimately belongs to.
-- ============================================================================

-- ── 1. Create the correctly-parented group under a collision-free code ──────────────────────

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'plat_pm_ps_governance', 'Governance',
  'Governance structure, steering committee, project board, meeting calendar, delegated authorities, and decisions (taxonomy §3, Governance).',
  NULL,
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_project_setup' AND COALESCE(is_deleted, FALSE) = FALSE),
  2, 70, 'universal', 'shield', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_ps_governance' AND COALESCE(is_deleted, FALSE) = FALSE
);

-- ── 2. Move the mis-attached v1020 leaves onto the new group ────────────────────────────────

UPDATE public.menu_items
SET parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_ps_governance' AND COALESCE(is_deleted, FALSE) = FALSE),
    updated_at = NOW()
WHERE menu_code IN (
  'plat_pm_gov_structure', 'plat_pm_gov_steering', 'plat_pm_gov_board', 'plat_pm_gov_meetings',
  'plat_pm_gov_authorities', 'plat_pm_gov_decisions', 'plat_pm_s_gov_framework'
) AND COALESCE(is_deleted, FALSE) = FALSE;

-- ── 3. Grant the new group itself (same pattern as v1021) ───────────────────────────────────

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_pm_s_gov_framework'
JOIN public.menu_items dst ON dst.menu_code = 'plat_pm_ps_governance' AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1022: Governance group re-created under plat_pm_ps_governance (collision-free), 7 leaves re-parented';
  RAISE NOTICE '================================================';
END $$;

-- Post-run verification (run manually):
--   SELECT mi.menu_code, mi.menu_label, mi.parent_menu_id, mi.menu_level,
--          (SELECT COUNT(*) FROM public.role_menu_items rmi
--             WHERE rmi.menu_item_id = mi.id AND rmi.can_view = TRUE
--               AND rmi.is_active = TRUE AND COALESCE(rmi.is_deleted, FALSE) = FALSE) AS grant_count
--   FROM public.menu_items mi
--   WHERE mi.menu_code IN (
--     'plat_pm_project_setup', 'plat_pm_ps_governance',
--     'plat_pm_gov_structure', 'plat_pm_gov_steering', 'plat_pm_gov_board', 'plat_pm_gov_meetings',
--     'plat_pm_gov_authorities', 'plat_pm_gov_decisions', 'plat_pm_s_gov_framework'
--   )
--   ORDER BY mi.menu_level, mi.sort_order;
-- -- expect plat_pm_ps_governance's parent_menu_id to equal plat_pm_project_setup's own id
-- -- (86574d1e-f388-4aa5-9a5c-a6ee2401134d), and all 7 leaves' parent_menu_id to equal
-- -- plat_pm_ps_governance's own id.
