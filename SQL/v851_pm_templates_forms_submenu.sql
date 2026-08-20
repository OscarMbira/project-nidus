-- =============================================================================
-- v851: Forms / Templates submenu under Organizational Templates + Project Templates
-- Plan: projectplan/v851_forms_templates_submenu_split_plan.md
--
-- Children (each parent):
--   Templates → ?domainGroup=templates  (all domains except form_template)
--   Forms     → ?domainGroup=forms      (form_template only)
-- Parents stay clickable for the unfiltered "all domains" view.
--
-- PM sidebar parents (what PMs see):
--   plat_pm_templates / plat_pm_project_templates
--   sim_pm_templates / sim_pm_project_templates
-- PMO admin parents (parity with plan naming):
--   plat_tpl_organisational / sim_tpl_organisational
-- Grants: copy from each parent (v849 pattern).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helper pattern: insert child + copy grants from parent
-- ---------------------------------------------------------------------------

-- Platform PM — Organizational Templates children
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
    'plat_pm_templates_templates',
    'Templates',
    'Node-fork templates (process docs, fields, OPA, level templates) — not Forms',
    10,
    '/platform/templates/organisational?domainGroup=templates',
    'layout-template'
  ),
  (
    'plat_pm_templates_forms',
    'Forms',
    'Form templates (Risk Register, Quality Register, etc.)',
    20,
    '/platform/templates/organisational?domainGroup=forms',
    'clipboard-list'
  )
) AS v(menu_code, menu_label, menu_description, sort_order, route_path, menu_icon)
WHERE par.menu_code = 'plat_pm_templates'
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

-- Platform PM — Project Templates children
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
    'plat_pm_project_templates_templates',
    'Templates',
    'Project-owned node-fork template copies (not Forms)',
    10,
    '/platform/templates/project?domainGroup=templates',
    'layout-template'
  ),
  (
    'plat_pm_project_templates_forms',
    'Forms',
    'Project-owned form template copies',
    20,
    '/platform/templates/project?domainGroup=forms',
    'clipboard-list'
  )
) AS v(menu_code, menu_label, menu_description, sort_order, route_path, menu_icon)
WHERE par.menu_code = 'plat_pm_project_templates'
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

-- Platform PMO — Organisational Templates children (admin flat list)
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
    'plat_tpl_organisational_templates',
    'Templates',
    'Node-fork organisational templates (not Forms)',
    5,
    '/app/pmo/organisational-templates?domainGroup=templates',
    'layout-template'
  ),
  (
    'plat_tpl_organisational_forms',
    'Forms',
    'Organisational form templates',
    6,
    '/app/pmo/organisational-templates?domainGroup=forms',
    'clipboard-list'
  )
) AS v(menu_code, menu_label, menu_description, sort_order, route_path, menu_icon)
WHERE par.menu_code = 'plat_tpl_organisational'
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

-- Simulator PM — Organizational Templates children
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
    'sim_pm_templates_templates',
    'Templates',
    'Practice node-fork templates (not Forms)',
    10,
    '/simulator/pm/templates/organisational?domainGroup=templates',
    'layout-template'
  ),
  (
    'sim_pm_templates_forms',
    'Forms',
    'Practice form templates',
    20,
    '/simulator/pm/templates/organisational?domainGroup=forms',
    'clipboard-list'
  )
) AS v(menu_code, menu_label, menu_description, sort_order, route_path, menu_icon)
WHERE par.menu_code = 'sim_pm_templates'
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

-- Simulator PM — Project Templates children
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
    'sim_pm_project_templates_templates',
    'Templates',
    'Practice project-owned node-fork copies (not Forms)',
    10,
    '/simulator/pm/templates/project?domainGroup=templates',
    'layout-template'
  ),
  (
    'sim_pm_project_templates_forms',
    'Forms',
    'Practice project-owned form template copies',
    20,
    '/simulator/pm/templates/project?domainGroup=forms',
    'clipboard-list'
  )
) AS v(menu_code, menu_label, menu_description, sort_order, route_path, menu_icon)
WHERE par.menu_code = 'sim_pm_project_templates'
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

-- Simulator PMO — Organisational Templates children
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
    'sim_tpl_organisational_templates',
    'Templates',
    'Practice organisational node-fork templates (not Forms)',
    5,
    '/simulator/pmo/organisational-templates?domainGroup=templates',
    'layout-template'
  ),
  (
    'sim_tpl_organisational_forms',
    'Forms',
    'Practice organisational form templates',
    6,
    '/simulator/pmo/organisational-templates?domainGroup=forms',
    'clipboard-list'
  )
) AS v(menu_code, menu_label, menu_description, sort_order, route_path, menu_icon)
WHERE par.menu_code = 'sim_tpl_organisational'
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

-- ---------------------------------------------------------------------------
-- Copy role grants from each parent → its Forms/Templates children
-- ---------------------------------------------------------------------------
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
   'plat_pm_templates_templates',
   'plat_pm_templates_forms',
   'plat_pm_project_templates_templates',
   'plat_pm_project_templates_forms',
   'plat_tpl_organisational_templates',
   'plat_tpl_organisational_forms',
   'sim_pm_templates_templates',
   'sim_pm_templates_forms',
   'sim_pm_project_templates_templates',
   'sim_pm_project_templates_forms',
   'sim_tpl_organisational_templates',
   'sim_tpl_organisational_forms'
 )
WHERE parent.menu_code IN (
  'plat_pm_templates',
  'plat_pm_project_templates',
  'plat_tpl_organisational',
  'sim_pm_templates',
  'sim_pm_project_templates',
  'sim_tpl_organisational'
)
  AND COALESCE(rmi.is_deleted, FALSE) = FALSE
  AND COALESCE(rmi.is_active, TRUE) = TRUE
  AND COALESCE(rmi.can_view, TRUE) = TRUE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE,
  can_use = TRUE,
  is_active = TRUE,
  updated_at = NOW();

-- Common PM / PMO roles (covers envs where parent grants were incomplete)
INSERT INTO public.role_menu_items (
  id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at
)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
CROSS JOIN public.roles r
WHERE mi.menu_code IN (
  'plat_pm_templates_templates',
  'plat_pm_templates_forms',
  'plat_pm_project_templates_templates',
  'plat_pm_project_templates_forms',
  'plat_tpl_organisational_templates',
  'plat_tpl_organisational_forms',
  'sim_pm_templates_templates',
  'sim_pm_templates_forms',
  'sim_pm_project_templates_templates',
  'sim_pm_project_templates_forms',
  'sim_tpl_organisational_templates',
  'sim_tpl_organisational_forms'
)
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND COALESCE(r.is_deleted, FALSE) = FALSE
  AND (
    lower(replace(r.role_name, ' ', '_')) IN (
      'project_manager', 'portfolio_manager', 'programme_manager',
      'pmo_admin', 'system_admin', 'account_owner', 'superuser'
    )
    OR r.role_name IN (
      'Project Manager', 'Portfolio Manager', 'Programme Manager',
      'PMO Admin', 'System Admin', 'Superuser'
    )
  )
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE,
  can_use = TRUE,
  is_active = TRUE,
  updated_at = NOW();
