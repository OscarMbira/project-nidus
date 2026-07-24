-- =============================================================================
-- v800: Template Library menu (Platform + Simulator)
-- Plan: projectplan/v798_template_library_menu_rationalisation_and_copy_plan.md
-- Routes: /app/pmo/template-library ; /simulator/pmo/template-library
-- =============================================================================

-- Platform parent section
INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
  route_path, menu_icon, methodology, is_visible, is_active
)
SELECT
  'plat_sec_templates',
  'Templates',
  'Global template browse and copy',
  par.id,
  COALESCE(par.menu_level, 1) + 1,
  42,
  NULL,
  'library',
  'universal',
  TRUE,
  TRUE
FROM public.menu_items par
WHERE par.menu_code IN (
  'plat_sec_portfolio_delivery',
  'plat_grp_pm_projects',
  'plat_pm_templates',
  'pmo-pp-project-templates',
  'plat_grp_administration'
)
  AND COALESCE(par.is_deleted, FALSE) = FALSE
ORDER BY CASE par.menu_code
  WHEN 'plat_sec_portfolio_delivery' THEN 0
  WHEN 'plat_pm_templates' THEN 1
  WHEN 'pmo-pp-project-templates' THEN 2
  WHEN 'plat_grp_pm_projects' THEN 3
  ELSE 4 END
LIMIT 1
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  parent_menu_id = EXCLUDED.parent_menu_id,
  is_visible = TRUE,
  is_active = TRUE,
  updated_at = NOW();

INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
  route_path, menu_icon, methodology, is_visible, is_active
)
SELECT
  'plat_sec_templates',
  'Templates',
  'Global template browse and copy',
  NULL,
  2,
  42,
  NULL,
  'library',
  'universal',
  TRUE,
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_sec_templates'
);

-- Platform Template Library leaf
INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
  route_path, menu_icon, methodology, is_visible, is_active
)
SELECT
  'plat_tpl_library',
  'Template Library',
  'Copy system templates to customise',
  par.id,
  COALESCE(par.menu_level, 2) + 1,
  10,
  '/app/pmo/template-library',
  'layout-list',
  'universal',
  TRUE,
  TRUE
FROM public.menu_items par
WHERE par.menu_code = 'plat_sec_templates'
  AND COALESCE(par.is_deleted, FALSE) = FALSE
LIMIT 1
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  parent_menu_id = EXCLUDED.parent_menu_id,
  route_path = EXCLUDED.route_path,
  is_visible = TRUE,
  is_active = TRUE,
  updated_at = NOW();

UPDATE public.menu_items AS mi_child
SET
  parent_menu_id = mi_parent.id,
  updated_at = NOW()
FROM public.menu_items AS mi_parent
WHERE mi_child.menu_code = 'plat_pmo_field_templates'
  AND mi_parent.menu_code = 'plat_sec_templates'
  AND COALESCE(mi_child.is_deleted, FALSE) = FALSE
  AND COALESCE(mi_parent.is_deleted, FALSE) = FALSE;

-- Simulator parent section
INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
  route_path, menu_icon, methodology, is_visible, is_active
)
SELECT
  'sim_sec_templates',
  'Templates',
  'Global template browse and copy',
  par.id,
  COALESCE(par.menu_level, 1) + 1,
  42,
  NULL,
  'library',
  'universal',
  TRUE,
  TRUE
FROM public.menu_items par
WHERE par.menu_code IN (
  'sim_sec_portfolio_delivery',
  'sim_grp_pm_projects',
  'sim_pmo_templates',
  'sim_pm_templates',
  'sim_sec_pmo',
  'sim_grp_pmo'
)
  AND COALESCE(par.is_deleted, FALSE) = FALSE
ORDER BY CASE par.menu_code
  WHEN 'sim_sec_portfolio_delivery' THEN 0
  WHEN 'sim_pmo_templates' THEN 1
  WHEN 'sim_pm_templates' THEN 2
  WHEN 'sim_grp_pmo' THEN 3
  ELSE 4 END
LIMIT 1
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  parent_menu_id = EXCLUDED.parent_menu_id,
  is_visible = TRUE,
  is_active = TRUE,
  updated_at = NOW();

INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
  route_path, menu_icon, methodology, is_visible, is_active
)
SELECT
  'sim_sec_templates',
  'Templates',
  'Global template browse and copy',
  NULL,
  2,
  42,
  NULL,
  'library',
  'universal',
  TRUE,
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'sim_sec_templates'
);

-- Simulator Template Library leaf
INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
  route_path, menu_icon, methodology, is_visible, is_active
)
SELECT
  'sim_tpl_library',
  'Template Library',
  'Copy system templates to customise',
  par.id,
  COALESCE(par.menu_level, 2) + 1,
  10,
  '/simulator/pmo/template-library',
  'layout-list',
  'universal',
  TRUE,
  TRUE
FROM public.menu_items par
WHERE par.menu_code = 'sim_sec_templates'
  AND COALESCE(par.is_deleted, FALSE) = FALSE
LIMIT 1
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  parent_menu_id = EXCLUDED.parent_menu_id,
  route_path = EXCLUDED.route_path,
  is_visible = TRUE,
  is_active = TRUE,
  updated_at = NOW();

UPDATE public.menu_items AS mi_child
SET
  parent_menu_id = mi_parent.id,
  updated_at = NOW()
FROM public.menu_items AS mi_parent
WHERE mi_child.menu_code = 'sim_pmo_field_templates'
  AND mi_parent.menu_code = 'sim_sec_templates'
  AND COALESCE(mi_child.is_deleted, FALSE) = FALSE
  AND COALESCE(mi_parent.is_deleted, FALSE) = FALSE;

-- Role grants (same pattern as v767)
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
CROSS JOIN public.roles r
WHERE mi.menu_code IN (
  'plat_sec_templates',
  'plat_tpl_library',
  'sim_sec_templates',
  'sim_tpl_library'
)
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND r.role_name IN (
    'pmo_admin',
    'system_admin',
    'account_owner',
    'PMO Admin',
    'System Admin',
    'Superuser',
    'portfolio_manager',
    'programme_manager',
    'project_manager',
    'Project Manager'
  )
  AND COALESCE(r.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE,
  can_use = TRUE,
  is_active = TRUE,
  updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v800_template_library_menu.sql applied';
END $$;
