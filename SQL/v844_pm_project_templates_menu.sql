-- =============================================================================
-- v844: PM sidebar "Project Templates" — project-owned copies (sibling of Organizational Templates)
-- Route: /platform/templates/project
-- =============================================================================

INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
  route_path, menu_icon, methodology, is_visible, is_active
)
SELECT
  'plat_pm_project_templates',
  'Project Templates',
  'Templates copied down to the current project for PM access and customisation',
  sec.id,
  COALESCE(sec.menu_level, 1) + 1,
  26,
  '/platform/templates/project',
  'folder-kanban',
  'universal',
  TRUE,
  TRUE
FROM public.menu_items AS sec
WHERE sec.menu_code = 'plat_sec_universal'
  AND COALESCE(sec.is_deleted, FALSE) = FALSE
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
  updated_at = NOW();

-- Idempotent reparent/label if INSERT conflict path did not run parent join
UPDATE public.menu_items AS mi
SET
  parent_menu_id = sec.id,
  menu_level = COALESCE(sec.menu_level, 1) + 1,
  menu_label = 'Project Templates',
  menu_description = 'Templates copied down to the current project for PM access and customisation',
  route_path = '/platform/templates/project',
  sort_order = 26,
  menu_icon = COALESCE(NULLIF(mi.menu_icon, ''), 'folder-kanban'),
  methodology = 'universal',
  is_visible = TRUE,
  is_active = TRUE,
  updated_at = NOW()
FROM public.menu_items AS sec
WHERE mi.menu_code = 'plat_pm_project_templates'
  AND sec.menu_code = 'plat_sec_universal'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND COALESCE(sec.is_deleted, FALSE) = FALSE;

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
CROSS JOIN public.roles r
WHERE mi.menu_code = 'plat_pm_project_templates'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND r.role_name IN (
    'project_manager', 'portfolio_manager', 'programme_manager',
    'pmo_admin', 'system_admin', 'account_owner',
    'PMO Admin', 'System Admin', 'Superuser',
    'Project Manager', 'Portfolio Manager', 'Programme Manager'
  )
  AND COALESCE(r.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE,
  can_use = TRUE,
  is_active = TRUE,
  updated_at = NOW();

-- Simulator PM practice menu (optional parity leaf)
INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
  route_path, menu_icon, methodology, is_visible, is_active
)
SELECT
  'sim_pm_project_templates',
  'Project Templates',
  'Practice project template copies for customisation',
  par.id,
  COALESCE(par.menu_level, 1) + 1,
  26,
  '/simulator/pm/templates/project',
  'folder-kanban',
  'universal',
  TRUE,
  TRUE
FROM public.menu_items AS par
WHERE par.menu_code IN ('sim_sec_universal', 'sim_grp_pm_projects', 'sim_pm_cat_projects')
  AND COALESCE(par.is_deleted, FALSE) = FALSE
ORDER BY CASE par.menu_code
  WHEN 'sim_sec_universal' THEN 0
  WHEN 'sim_pm_cat_projects' THEN 1
  ELSE 2 END
LIMIT 1
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  parent_menu_id = EXCLUDED.parent_menu_id,
  route_path = EXCLUDED.route_path,
  is_visible = TRUE,
  is_active = TRUE,
  updated_at = NOW();
