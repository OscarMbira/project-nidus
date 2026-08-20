-- =============================================================================
-- v852: Forms / Templates submenu under Template Library (Global)
-- Same split as v851 (Organizational / Project Templates).
-- Parents: plat_tpl_library, sim_tpl_library
-- Routes keep parent clickable for all-domains; children use ?domainGroup=
-- =============================================================================

INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
  route_path, menu_icon, methodology, is_visible, is_active
)
SELECT v.menu_code, v.menu_label, v.menu_description, par.id,
       COALESCE(par.menu_level, 1) + 1, v.sort_order, v.route_path, v.menu_icon,
       'universal', TRUE, TRUE
FROM public.menu_items par
CROSS JOIN (VALUES
  (
    'plat_tpl_library_templates',
    'Templates',
    'Global node-fork templates (process docs, fields, OPA, level templates) — not Forms',
    10,
    '/app/pmo/template-library?domainGroup=templates',
    'layout-template'
  ),
  (
    'plat_tpl_library_forms',
    'Forms',
    'Global form templates (Risk Register, Quality Register, etc.)',
    20,
    '/app/pmo/template-library?domainGroup=forms',
    'clipboard-list'
  )
) AS v(menu_code, menu_label, menu_description, sort_order, route_path, menu_icon)
WHERE par.menu_code = 'plat_tpl_library'
  AND COALESCE(par.is_deleted, FALSE) = FALSE
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  parent_menu_id = EXCLUDED.parent_menu_id,
  menu_level = EXCLUDED.menu_level,
  sort_order = EXCLUDED.sort_order,
  route_path = EXCLUDED.route_path,
  menu_icon = EXCLUDED.menu_icon,
  methodology = 'universal',
  is_visible = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
  route_path, menu_icon, methodology, is_visible, is_active
)
SELECT v.menu_code, v.menu_label, v.menu_description, par.id,
       COALESCE(par.menu_level, 1) + 1, v.sort_order, v.route_path, v.menu_icon,
       'universal', TRUE, TRUE
FROM public.menu_items par
CROSS JOIN (VALUES
  (
    'sim_tpl_library_templates',
    'Templates',
    'Practice global node-fork templates (not Forms)',
    10,
    '/simulator/pmo/template-library?domainGroup=templates',
    'layout-template'
  ),
  (
    'sim_tpl_library_forms',
    'Forms',
    'Practice global form templates',
    20,
    '/simulator/pmo/template-library?domainGroup=forms',
    'clipboard-list'
  )
) AS v(menu_code, menu_label, menu_description, sort_order, route_path, menu_icon)
WHERE par.menu_code = 'sim_tpl_library'
  AND COALESCE(par.is_deleted, FALSE) = FALSE
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  parent_menu_id = EXCLUDED.parent_menu_id,
  menu_level = EXCLUDED.menu_level,
  sort_order = EXCLUDED.sort_order,
  route_path = EXCLUDED.route_path,
  menu_icon = EXCLUDED.menu_icon,
  methodology = 'universal',
  is_visible = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

-- Copy grants from Template Library parents
INSERT INTO public.role_menu_items (
  id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  rmi.role_id,
  child.id,
  COALESCE(rmi.can_view, TRUE),
  COALESCE(rmi.can_use, TRUE),
  TRUE,
  NOW(),
  NOW()
FROM public.role_menu_items rmi
JOIN public.menu_items parent
  ON parent.id = rmi.menu_item_id
 AND COALESCE(parent.is_deleted, FALSE) = FALSE
JOIN public.menu_items child
  ON child.parent_menu_id = parent.id
 AND COALESCE(child.is_deleted, FALSE) = FALSE
 AND child.menu_code IN (
   'plat_tpl_library_templates',
   'plat_tpl_library_forms',
   'sim_tpl_library_templates',
   'sim_tpl_library_forms'
 )
WHERE parent.menu_code IN ('plat_tpl_library', 'sim_tpl_library')
  AND COALESCE(rmi.is_deleted, FALSE) = FALSE
  AND COALESCE(rmi.is_active, TRUE) = TRUE
  AND COALESCE(rmi.can_view, TRUE) = TRUE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE,
  can_use = TRUE,
  is_active = TRUE,
  updated_at = NOW();

-- Common PMO / admin roles
INSERT INTO public.role_menu_items (
  id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at
)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
CROSS JOIN public.roles r
WHERE mi.menu_code IN (
  'plat_tpl_library_templates',
  'plat_tpl_library_forms',
  'sim_tpl_library_templates',
  'sim_tpl_library_forms'
)
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND COALESCE(r.is_deleted, FALSE) = FALSE
  AND (
    lower(replace(r.role_name, ' ', '_')) IN (
      'pmo_admin', 'system_admin', 'account_owner', 'superuser',
      'project_manager', 'portfolio_manager', 'programme_manager'
    )
    OR r.role_name IN (
      'PMO Admin', 'System Admin', 'Superuser',
      'Project Manager', 'Portfolio Manager', 'Programme Manager'
    )
  )
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE,
  can_use = TRUE,
  is_active = TRUE,
  updated_at = NOW();
