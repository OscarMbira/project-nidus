-- ============================================================================
-- v927: SaaS Industry-Aware Tenant Provisioning — Phase 7 sidebar menu (Platform)
-- ============================================================================
-- Adds "Industries & Capabilities" as a sibling of "Manage Roles"/"Manage Menu Bundles"
-- under People & Resources (pmo-cat-teams), matching the v904/v916 canonical menu pattern.
-- Granted to the same creator-tier roles as those two (same admin population — this is the
-- same org-config authorization tier, gated identically via user_can_manage_org_roles at the
-- RPC layer — see v923/v926).
--
-- CLAUDE.md rule 13 (attach every new feature to the sidebar) + the pmoMenuHierarchyUtils.js /
-- v671PmoMenuCanonical.js regex additions made alongside this file (see packages/config/src)
-- are both required for this item to render in the correct category — a menu_items row alone
-- is not sufficient (proven this session by the v914 Manage Menu Bundles incident).
-- ============================================================================

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order,
  methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), 'pmo-people-organisation-industries', 'Industries & Capabilities',
       'Manage which industries your organisation operates in and which industry-specific menu items are available',
       '/platform/admin/organisation-industries',
       (SELECT id FROM public.menu_items WHERE menu_code = 'pmo-cat-teams' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
       2, 67, 'universal', 'building', TRUE, TRUE, NOW(), NOW()
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
WHERE mi.menu_code = 'pmo-people-organisation-industries'
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
  RAISE NOTICE 'v927: Industries & Capabilities menu item + role grants installed (Platform)';
END $$;
