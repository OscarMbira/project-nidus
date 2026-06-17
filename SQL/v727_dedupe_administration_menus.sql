-- =============================================================================
-- v727: Remove duplicate Administration menu rows
-- Keeps v671 canonical pmo-admin-* codes; hides plat_admin_*, pmo_admin_*, legacy LDE parent
-- =============================================================================

UPDATE public.menu_items
SET is_visible = FALSE,
    is_deleted = TRUE,
    updated_at = NOW()
WHERE menu_code IN (
  'plat_admin_local_data',
  'plat_admin_form_templates',
  'plat_admin_org_settings',
  'plat_admin_user_mgmt',
  'plat_admin_role_access',
  'plat_admin_project_types',
  'plat_admin_proj_statuses',
  'plat_admin_funding',
  'plat_admin_budget_cats',
  'plat_admin_subscription',
  'plat_admin_branding',
  'plat_admin_integrations',
  'local_data_extensions',
  'pmo_admin_form_templates',
  'pmo_admin_org_settings',
  'pmo_admin_users',
  'pmo_role_menu_access',
  'pmo_admin_project_types',
  'pmo_admin_project_statuses',
  'pmo_admin_funding_sources',
  'pmo_admin_budget_categories',
  'pmo_admin_subscription',
  'pmo_admin_branding',
  'pmo_admin_branding_identity',
  'pmo_admin_branding_history',
  'pmo_admin_integrations',
  'pmo_integrations_hub'
)
AND COALESCE(is_deleted, FALSE) = FALSE;

INSERT INTO public.menu_items (
  id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order,
  methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp,
       (SELECT id FROM public.menu_items WHERE menu_code = 'pmo-cat-admin' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
       2, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('pmo-admin-local-data-extensions', 'Local Data Extensions',  '/app/local-data-extensions',                 10, 'database'),
  ('pmo-admin-form-templates',        'Form Templates',         '/platform/admin/form-templates',             20, 'file-text'),
  ('pmo-admin-org-settings',        'Organisation Settings',  '/platform/pmo-admin/settings',               30, 'settings-2'),
  ('pmo-admin-users',                 'User Management',        '/platform/pmo-admin/users',                  40, 'shield'),
  ('pmo-admin-role-menu-access',      'Role Menu Access',       '/platform/pmo/role-menu-access',             50, 'shield-check'),
  ('pmo-admin-project-types',       'Project Types',          '/platform/pmo-admin/project-types',          60, 'layers'),
  ('pmo-admin-project-statuses',    'Project Statuses',       '/platform/pmo-admin/project-statuses',       70, 'layers'),
  ('pmo-admin-funding-sources',     'Funding Sources',        '/platform/pmo-admin/funding-sources',        80, 'dollar-sign'),
  ('pmo-admin-budget-categories',   'Budget Categories',      '/platform/pmo-admin/budget-categories',      90, 'dollar-sign'),
  ('pmo-admin-subscription',        'Subscription',             '/platform/pmo-admin/subscription',          100, 'settings-2'),
  ('pmo-admin-branding-identity',   'Branding & Identity',    '/platform/organisation/branding',           110, 'sparkles'),
  ('pmo-admin-integrations',        'Integrations',           '/pmo/admin/integrations',                   120, 'plug')
) AS v(mc, ml, rp, so, ic)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
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
FROM public.roles r
CROSS JOIN public.menu_items mi
WHERE r.role_name IN ('pmo_admin', 'system_admin', 'account_owner')
  AND mi.menu_code LIKE 'pmo-admin-%'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE,
  can_use = TRUE,
  is_active = TRUE,
  updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v727_dedupe_administration_menus.sql applied'; END $$;
