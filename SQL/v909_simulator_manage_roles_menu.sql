-- ============================================================================
-- v909: Simulator Manage Roles + Role Assignment — sidebar menu (Phase 4 of 4)
-- ============================================================================
-- Wires the two Simulator routes added in this change (simulator/pmo/role-assignment,
-- simulator/pmo/manage-roles — see apps/simulator/src/routes/simulatorRoutes.jsx) into
-- the sidebar, nested under the Practice Administration category (sim_pmo_cat_admin —
-- Simulator PMO has no dedicated Teams/People category, unlike Platform's pmo-cat-teams).
-- Granted to the same creator-tier roles as Platform's v904/v905.
-- ============================================================================

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order,
  methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), 'sim-pmo-role-assignment', 'Role Assignment',
       'Assign roles and invite users to the practice organisation',
       '/simulator/pmo/role-assignment',
       (SELECT id FROM public.menu_items WHERE menu_code = 'sim_pmo_cat_admin' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
       2, 10, 'universal', 'shield', TRUE, TRUE, NOW(), NOW()
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
SELECT gen_random_uuid(), 'sim-pmo-manage-roles', 'Manage Roles',
       'Create organisation-wide custom roles by cloning an existing role''s permissions and menu access',
       '/simulator/pmo/manage-roles',
       (SELECT id FROM public.menu_items WHERE menu_code = 'sim_pmo_cat_admin' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
       2, 20, 'universal', 'shield-plus', TRUE, TRUE, NOW(), NOW()
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
WHERE mi.menu_code IN ('sim-pmo-role-assignment', 'sim-pmo-manage-roles')
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
  RAISE NOTICE 'v909: Simulator Role Assignment + Manage Roles menu items + role grants installed';
END $$;
