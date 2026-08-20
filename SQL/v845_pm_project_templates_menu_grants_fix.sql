-- =============================================================================
-- v845: Fix Project Templates missing from PM sidebar after v844
-- Cause: role_menu_items often missing for the new leaf; copy grants from
--        plat_pm_templates (Organizational Templates) so every role that can
--        see Org Templates also sees Project Templates.
-- =============================================================================

-- Ensure the menu leaf exists under PM universal
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
  AND NOT EXISTS (
    SELECT 1 FROM public.menu_items x
    WHERE x.menu_code = 'plat_pm_project_templates'
      AND COALESCE(x.is_deleted, FALSE) = FALSE
  )
LIMIT 1;

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
  is_deleted = FALSE,
  updated_at = NOW()
FROM public.menu_items AS sec
WHERE mi.menu_code = 'plat_pm_project_templates'
  AND sec.menu_code = 'plat_sec_universal'
  AND COALESCE(sec.is_deleted, FALSE) = FALSE;

-- Copy every role grant from Organizational Templates → Project Templates
INSERT INTO public.role_menu_items (
  id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  rmi.role_id,
  proj.id,
  COALESCE(rmi.can_view, TRUE),
  COALESCE(rmi.can_use, TRUE),
  TRUE,
  NOW(),
  NOW()
FROM public.role_menu_items rmi
JOIN public.menu_items org
  ON org.id = rmi.menu_item_id
 AND org.menu_code = 'plat_pm_templates'
 AND COALESCE(org.is_deleted, FALSE) = FALSE
JOIN public.menu_items proj
  ON proj.menu_code = 'plat_pm_project_templates'
 AND COALESCE(proj.is_deleted, FALSE) = FALSE
WHERE COALESCE(rmi.is_deleted, FALSE) = FALSE
  AND COALESCE(rmi.is_active, TRUE) = TRUE
  AND COALESCE(rmi.can_view, TRUE) = TRUE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE,
  can_use = TRUE,
  is_active = TRUE,
  updated_at = NOW();

-- Also grant to common PM role names (covers envs where Org Templates grants are incomplete)
INSERT INTO public.role_menu_items (
  id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at
)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
CROSS JOIN public.roles r
WHERE mi.menu_code = 'plat_pm_project_templates'
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
