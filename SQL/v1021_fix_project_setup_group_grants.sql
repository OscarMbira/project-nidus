-- ============================================================================
-- v1021: Grant Project Team / Governance GROUP items themselves (v1020 follow-up)
-- ============================================================================
-- v1020 followed v981's comment that "the category root itself needs no
-- role_menu_items row of its own -- its visibility as a category is derived
-- purely from whether it has any visible children." That was true for
-- plat_pm_project_setup specifically because it's a menu_level=1 DB root with
-- no parent_menu_id at all, which reorganizeMenuRoots()'s childful-orphan
-- promotion logic (packages/config/src/pmoMenuHierarchyUtils.js) picks up and
-- renders directly, regardless of grants.
--
-- plat_pm_project_team and plat_pm_governance (v1020) are NOT orphans -- they
-- have a real parent_menu_id (plat_pm_project_setup), so they never go through
-- that promotion path. Instead, useMenu.js resolves visible items strictly
-- from role-granted ids (+ a small static top-level category allowlist via
-- getCategoryMenuCodes(), which neither of these new level-2 groups is in),
-- then "hydrates" ancestor rows for whatever it fetched. Two groups with
-- literally zero role_menu_items rows sit in a genuinely different code path
-- than the v981 top-level-root case the original comment described -- this
-- migration closes that gap by granting them directly, the same safe,
-- idempotent copy-from-plat_pm_s_gov_framework pattern v1020 already used for
-- their children.
-- ============================================================================

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_pm_s_gov_framework'
JOIN public.menu_items dst ON dst.menu_code IN ('plat_pm_project_team', 'plat_pm_governance')
  AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1021: plat_pm_project_team + plat_pm_governance group items granted directly';
  RAISE NOTICE '================================================';
END $$;

-- Diagnostic (run manually, paste results back if Governance/Project Team children
-- still don't render after this + a hard localStorage clear + dev-server restart):
--
--   SELECT mi.menu_code, mi.menu_label, mi.parent_menu_id, mi.menu_level,
--          (SELECT COUNT(*) FROM public.role_menu_items rmi
--             WHERE rmi.menu_item_id = mi.id AND rmi.can_view = TRUE
--               AND rmi.is_active = TRUE AND COALESCE(rmi.is_deleted, FALSE) = FALSE) AS grant_count
--   FROM public.menu_items mi
--   WHERE mi.menu_code IN (
--     'plat_pm_project_setup', 'plat_pm_project_team', 'plat_pm_governance',
--     'plat_pm_s_project_details', 'plat_pm_s_charter',
--     'plat_pm_pt_members', 'plat_pm_pt_roles', 'plat_pm_pt_raci', 'plat_pm_pt_org_structure', 'plat_pm_pt_contacts',
--     'plat_pm_gov_structure', 'plat_pm_gov_steering', 'plat_pm_gov_board', 'plat_pm_gov_meetings',
--     'plat_pm_gov_authorities', 'plat_pm_gov_decisions', 'plat_pm_s_gov_framework'
--   )
--   ORDER BY mi.menu_level, mi.sort_order;
