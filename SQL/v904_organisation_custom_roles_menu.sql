-- ============================================================================
-- v904: Organisation Custom Roles — sidebar menu (Phase 3 of 3, Platform)
-- ============================================================================
-- Adds "Manage Roles" as a sibling of the existing "Assign Roles" entry under
-- People & Resources (pmo-cat-teams), matching the v725 canonical menu pattern.
-- Granted to the 5 role-creator tiers from projectprd/v902_organisation_custom_roles_PRD.md:
-- pmo_admin (+ legacy org_admin/system_admin/super_admin aliases, account_owner) and the
-- 4 project-level manager tiers, matched by BOTH clean and pm_*-bridge role_name (v622).
--
-- Simulator: apps/simulator/src/pages/admin/ManageRoles.jsx and its OrgRoleEditorModal/
-- service already exist (parity code is written and ready), but Simulator currently has NO
-- routed equivalent of Platform's /platform/admin/* org-management area at all — its sibling
-- apps/simulator/src/pages/admin/RoleAssignment.jsx is ALSO unrouted today (pre-existing gap,
-- not introduced by v902). Menu/route wiring for Simulator is deliberately deferred rather
-- than inventing a new URL namespace as a side effect — see plan v902 follow-up note.
-- ============================================================================

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order,
  methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), 'pmo-people-manage-roles', 'Manage Roles',
       'Create organisation-wide custom roles by cloning an existing role''s permissions and menu access',
       '/platform/admin/manage-roles',
       (SELECT id FROM public.menu_items WHERE menu_code = 'pmo-cat-teams' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
       2, 65, 'universal', 'shield-plus', TRUE, TRUE, NOW(), NOW()
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
WHERE mi.menu_code = 'pmo-people-manage-roles'
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
  RAISE NOTICE 'v904: Manage Roles menu item + role grants installed (Platform)';
END $$;
