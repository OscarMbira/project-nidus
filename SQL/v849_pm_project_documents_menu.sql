-- =============================================================================
-- v849: PM sidebar "Project Documents" — process_template Captured / Capture register
-- Routes:
--   Platform:  /platform/documents/project
--   Simulator: /simulator/pm/documents/project
-- Grants: copy from plat_pm_project_templates / sim_pm_project_templates (v845 pattern)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Platform leaf
-- ---------------------------------------------------------------------------
INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
  route_path, menu_icon, methodology, is_visible, is_active
)
SELECT
  'plat_pm_project_documents',
  'Project Documents',
  'Process documents available to the current project — capture, fill in, retire, restore',
  sec.id,
  COALESCE(sec.menu_level, 1) + 1,
  27,
  '/platform/documents/project',
  'file-text',
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
  is_deleted = FALSE,
  updated_at = NOW();

UPDATE public.menu_items AS mi
SET
  parent_menu_id = sec.id,
  menu_level = COALESCE(sec.menu_level, 1) + 1,
  menu_label = 'Project Documents',
  menu_description = 'Process documents available to the current project — capture, fill in, retire, restore',
  route_path = '/platform/documents/project',
  sort_order = 27,
  menu_icon = COALESCE(NULLIF(mi.menu_icon, ''), 'file-text'),
  methodology = 'universal',
  is_visible = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW()
FROM public.menu_items AS sec
WHERE mi.menu_code = 'plat_pm_project_documents'
  AND sec.menu_code = 'plat_sec_universal'
  AND COALESCE(sec.is_deleted, FALSE) = FALSE;

-- Copy every role grant from Project Templates → Project Documents
INSERT INTO public.role_menu_items (
  id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  rmi.role_id,
  docs.id,
  COALESCE(rmi.can_view, TRUE),
  COALESCE(rmi.can_use, TRUE),
  TRUE,
  NOW(),
  NOW()
FROM public.role_menu_items rmi
JOIN public.menu_items src
  ON src.id = rmi.menu_item_id
 AND src.menu_code = 'plat_pm_project_templates'
 AND COALESCE(src.is_deleted, FALSE) = FALSE
JOIN public.menu_items docs
  ON docs.menu_code = 'plat_pm_project_documents'
 AND COALESCE(docs.is_deleted, FALSE) = FALSE
WHERE COALESCE(rmi.is_deleted, FALSE) = FALSE
  AND COALESCE(rmi.is_active, TRUE) = TRUE
  AND COALESCE(rmi.can_view, TRUE) = TRUE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE,
  can_use = TRUE,
  is_active = TRUE,
  updated_at = NOW();

-- Common PM role names (covers envs where Project Templates grants are incomplete)
INSERT INTO public.role_menu_items (
  id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at
)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
CROSS JOIN public.roles r
WHERE mi.menu_code = 'plat_pm_project_documents'
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

-- ---------------------------------------------------------------------------
-- Simulator PM practice leaf
-- ---------------------------------------------------------------------------
INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
  route_path, menu_icon, methodology, is_visible, is_active
)
SELECT
  'sim_pm_project_documents',
  'Project Documents',
  'Practice project process documents — capture, fill in, retire, restore',
  par.id,
  COALESCE(par.menu_level, 1) + 1,
  27,
  '/simulator/pm/documents/project',
  'file-text',
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
  sort_order = EXCLUDED.sort_order,
  is_visible = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

-- Copy grants from sim Project Templates when present; else from platform Project Documents
INSERT INTO public.role_menu_items (
  id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  rmi.role_id,
  docs.id,
  COALESCE(rmi.can_view, TRUE),
  COALESCE(rmi.can_use, TRUE),
  TRUE,
  NOW(),
  NOW()
FROM public.role_menu_items rmi
JOIN public.menu_items src
  ON src.id = rmi.menu_item_id
 AND src.menu_code IN ('sim_pm_project_templates', 'plat_pm_project_documents')
 AND COALESCE(src.is_deleted, FALSE) = FALSE
JOIN public.menu_items docs
  ON docs.menu_code = 'sim_pm_project_documents'
 AND COALESCE(docs.is_deleted, FALSE) = FALSE
WHERE COALESCE(rmi.is_deleted, FALSE) = FALSE
  AND COALESCE(rmi.is_active, TRUE) = TRUE
  AND COALESCE(rmi.can_view, TRUE) = TRUE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE,
  can_use = TRUE,
  is_active = TRUE,
  updated_at = NOW();

INSERT INTO public.role_menu_items (
  id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at
)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
CROSS JOIN public.roles r
WHERE mi.menu_code = 'sim_pm_project_documents'
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
