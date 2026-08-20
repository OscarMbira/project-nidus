-- ============================================================================
-- v916: Menu Bundles — sidebar menu (Phase 3 of 4, Platform)
-- ============================================================================
-- Adds "Manage Menu Bundles" as a sibling of "Manage Roles" under People & Resources
-- (pmo-cat-teams), matching the v904 canonical menu pattern. Granted to the same 5
-- role-creator tiers as Manage Roles (PRD decision 4 — same admin population).
-- ============================================================================

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order,
  methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), 'pmo-people-manage-menu-bundles', 'Manage Menu Bundles',
       'Save a reusable set of sidebar menu items to quickly start a new role from',
       '/platform/admin/manage-menu-bundles',
       (SELECT id FROM public.menu_items WHERE menu_code = 'pmo-cat-teams' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
       2, 66, 'universal', 'list', TRUE, TRUE, NOW(), NOW()
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
WHERE mi.menu_code = 'pmo-people-manage-menu-bundles'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND COALESCE(r.is_deleted, FALSE) = FALSE
  AND lower(replace(r.role_name, ' ', '_')) IN (
    'pmo_admin', 'org_admin', 'system_admin', 'super_admin', 'account_owner',
    'portfolio_manager', 'programme_manager', 'project_manager', 'team_manager',
    'pm_portfolio_manager', 'pm_programme_manager', 'pm_project_manager', 'pm_team_manager'
  )
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v916: Manage Menu Bundles menu item + role grants installed (Platform)';
END $$;
