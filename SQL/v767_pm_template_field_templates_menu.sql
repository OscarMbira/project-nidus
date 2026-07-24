-- =============================================================================
-- v767: PM Template Hierarchy — Phase 4 menu wiring (Platform + Simulator)
-- Routes: /app/pmo/field-templates · /simulator/pmo/field-templates
-- Prerequisites: v681 / v682 menu hierarchy
-- =============================================================================

INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
  route_path, menu_icon, methodology, is_visible, is_active
)
SELECT
  'plat_pmo_field_templates',
  'Field Templates',
  'PMO Field Template hierarchy (Global → PMO → Portfolio → Programme → Project)',
  par.id,
  COALESCE(par.menu_level, 2) + 1,
  45,
  '/app/pmo/field-templates',
  'layout-list',
  NULL,
  TRUE,
  TRUE
FROM public.menu_items par
WHERE par.menu_code IN ('plat_grp_pm_projects', 'plat_pm_templates', 'pmo-pp-project-templates', 'plat_grp_administration')
  AND COALESCE(par.is_deleted, FALSE) = FALSE
ORDER BY CASE par.menu_code
  WHEN 'plat_pm_templates' THEN 0
  WHEN 'pmo-pp-project-templates' THEN 1
  WHEN 'plat_grp_pm_projects' THEN 2
  ELSE 3 END
LIMIT 1
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  parent_menu_id = EXCLUDED.parent_menu_id,
  route_path = EXCLUDED.route_path,
  is_visible = TRUE,
  is_active = TRUE,
  updated_at = NOW();

-- Fallback parent if none matched: create under null parent (top-level visible)
INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
  route_path, menu_icon, methodology, is_visible, is_active
)
SELECT
  'plat_pmo_field_templates',
  'Field Templates',
  'PMO Field Template hierarchy',
  NULL,
  2,
  45,
  '/app/pmo/field-templates',
  'layout-list',
  NULL,
  TRUE,
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pmo_field_templates'
);

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
CROSS JOIN public.roles r
WHERE mi.menu_code = 'plat_pmo_field_templates'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND r.role_name IN (
    'pmo_admin', 'system_admin', 'account_owner',
    'PMO Admin', 'System Admin', 'Superuser',
    'portfolio_manager', 'programme_manager'
  )
  AND COALESCE(r.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE,
  can_use = TRUE,
  is_active = TRUE,
  updated_at = NOW();

-- Simulator
INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
  route_path, menu_icon, methodology, is_visible, is_active
)
SELECT
  'sim_pmo_field_templates',
  'Field Templates',
  'Simulator PMO Field Template hierarchy',
  par.id,
  COALESCE(par.menu_level, 2) + 1,
  45,
  '/simulator/pmo/field-templates',
  'layout-list',
  NULL,
  TRUE,
  TRUE
FROM public.menu_items par
WHERE par.menu_code IN ('sim_grp_pmo_process_groups', 'sim_pmo_templates', 'sim_grp_pmo')
  AND COALESCE(par.is_deleted, FALSE) = FALSE
ORDER BY CASE par.menu_code
  WHEN 'sim_grp_pmo_process_groups' THEN 0
  WHEN 'sim_pmo_templates' THEN 1
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

INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
  route_path, menu_icon, methodology, is_visible, is_active
)
SELECT
  'sim_pmo_field_templates',
  'Field Templates',
  'Simulator PMO Field Template hierarchy',
  NULL,
  2,
  45,
  '/simulator/pmo/field-templates',
  'layout-list',
  NULL,
  TRUE,
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'sim_pmo_field_templates'
);

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
CROSS JOIN public.roles r
WHERE mi.menu_code = 'sim_pmo_field_templates'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND r.role_name IN (
    'pmo_admin', 'system_admin', 'account_owner',
    'PMO Admin', 'System Admin', 'Superuser'
  )
  AND COALESCE(r.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE,
  can_use = TRUE,
  is_active = TRUE,
  updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'v767_pm_template_field_templates_menu.sql applied';
END $$;
