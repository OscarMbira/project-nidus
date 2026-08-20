-- ============================================================================
-- v905: Manage Roles sidebar visibility for creator tiers (Platform)
-- ============================================================================
-- v904 inserted pmo-people-manage-roles under People & Resources and granted it
-- to PMO Admin + the 4 manager creator tiers. The item still did not appear:
--
-- 1. PMO sidebar transform (matchPeopleLeaf / canonical people list) dropped
--    any leaf that was not already a known People & Resources item, so even
--    PMO Admin could only reach the page by pasting the URL.
-- 2. PM-layout sidebars strip pmo-cat-teams entirely (PMO_ONLY_PM_LAYOUT_DROP_CODES),
--    so Portfolio / Programme / Project / Team Manager never saw the item on
--    their normal Teams sidebar.
--
-- This migration:
--   - Re-asserts the PMO leaf grants, matching role_name AND display-name slugs
--     (v843 style) plus pm_* invitation-bridge names (v622).
--   - Adds plat_pm_manage_roles under plat_grp_pm_teams (same route) for PM layout.
--
-- UI matching for (1) lives in packages/config (canonical + matchPeopleLeaf).
-- ============================================================================

-- ── 1. Re-assert PMO "Manage Roles" leaf ─────────────────────────────────────

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

-- ── 2. PM layout leaf under Teams ────────────────────────────────────────────

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order,
  methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), 'plat_pm_manage_roles', 'Manage Roles',
       'Create organisation-wide custom roles by cloning an existing role''s permissions and menu access',
       '/platform/admin/manage-roles',
       (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_pm_teams' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
       3, 70, 'universal', 'shield-plus', TRUE, TRUE, NOW(), NOW()
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

-- ── 3. Grants for both leaves ────────────────────────────────────────────────

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
CROSS JOIN public.roles r
WHERE mi.menu_code IN ('pmo-people-manage-roles', 'plat_pm_manage_roles')
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND COALESCE(r.is_deleted, FALSE) = FALSE
  AND (
    lower(replace(r.role_name, ' ', '_')) IN (
      'pmo_admin', 'org_admin', 'system_admin', 'super_admin', 'account_owner', 'superuser',
      'portfolio_manager', 'programme_manager', 'project_manager', 'team_manager',
      'pm_portfolio_manager', 'pm_programme_manager', 'pm_project_manager', 'pm_team_manager'
    )
    OR lower(replace(r.role_display_name, ' ', '_')) IN (
      'pmo_admin', 'org_admin', 'system_admin', 'super_admin', 'account_owner',
      'portfolio_manager', 'programme_manager', 'project_manager', 'team_manager'
    )
  )
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE,
  can_use = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

-- Parent Teams group must be visible on PM layout when only the new leaf is granted.
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
CROSS JOIN public.roles r
WHERE mi.menu_code = 'plat_grp_pm_teams'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND COALESCE(r.is_deleted, FALSE) = FALSE
  AND (
    lower(replace(r.role_name, ' ', '_')) IN (
      'pmo_admin', 'org_admin', 'system_admin', 'super_admin', 'account_owner',
      'portfolio_manager', 'programme_manager', 'project_manager', 'team_manager',
      'pm_portfolio_manager', 'pm_programme_manager', 'pm_project_manager', 'pm_team_manager'
    )
    OR lower(replace(r.role_display_name, ' ', '_')) IN (
      'pmo_admin', 'org_admin', 'system_admin', 'super_admin', 'account_owner',
      'portfolio_manager', 'programme_manager', 'project_manager', 'team_manager'
    )
  )
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE,
  can_use = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v905: Manage Roles PMO + PM Teams menu grants installed';
END $$;
