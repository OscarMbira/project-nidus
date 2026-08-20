-- ============================================================================
-- v911: System Role Catalog — sidebar menu (system_admin/super_admin only)
-- ============================================================================
-- New "System Role Catalog" menu item under System Administration in both apps, granted
-- ONLY to system_admin/super_admin — explicitly NOT the pmo_admin/org-tier list v904/v905/v909
-- used, since this page edits the shared built-in catalog and must stay invisible to regular
-- PMO Admins (see projectprd/v910_system_role_catalog_management_PRD.md).
--
-- Platform parent: plat_sec_system_admin (the real seeded System Administration category —
-- see SQL/v681_menu_revamp_platform_hierarchy.sql; Authentication/PWA/Platform Settings all
-- already live there).
-- Simulator parent: sim_pmo_cat_system_admin (SIM_PMO_CATEGORY_DEFS in
-- packages/config/src/pmoMenuHierarchyUtils.js).
-- ============================================================================

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order,
  methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), 'plat-sys-role-catalog', 'System Role Catalog',
       'Edit the shared built-in role catalog (system_admin only) — changes apply platform-wide',
       '/platform/admin/system-roles',
       (SELECT id FROM public.menu_items WHERE menu_code = 'plat_sec_system_admin' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
       2, 40, 'universal', 'shield-alert', TRUE, TRUE, NOW(), NOW()
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  route_path = EXCLUDED.route_path,
  parent_menu_id = EXCLUDED.parent_menu_id,
  menu_icon = EXCLUDED.menu_icon,
  sort_order = EXCLUDED.sort_order,
  is_visible = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order,
  methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), 'sim-sys-role-catalog', 'System Role Catalog',
       'Edit the shared built-in role catalog (system_admin only) — changes apply platform-wide',
       '/simulator/pmo/system-roles',
       (SELECT id FROM public.menu_items WHERE menu_code = 'sim_pmo_cat_system_admin' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
       2, 40, 'universal', 'shield-alert', TRUE, TRUE, NOW(), NOW()
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  route_path = EXCLUDED.route_path,
  parent_menu_id = EXCLUDED.parent_menu_id,
  menu_icon = EXCLUDED.menu_icon,
  sort_order = EXCLUDED.sort_order,
  is_visible = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
CROSS JOIN public.roles r
WHERE mi.menu_code IN ('plat-sys-role-catalog', 'sim-sys-role-catalog')
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND COALESCE(r.is_deleted, FALSE) = FALSE
  AND lower(replace(r.role_name, ' ', '_')) IN ('system_admin', 'super_admin')
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v911: System Role Catalog menu item + system_admin/super_admin-only grants installed';
END $$;
