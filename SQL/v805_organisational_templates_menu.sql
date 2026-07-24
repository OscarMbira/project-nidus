-- =============================================================================
-- v805: Organisational Templates menu leaf (Platform + Simulator)
-- Plan: projectplan/v805_global_vs_organisational_template_libraries_plan.md
-- Routes: /app/pmo/organisational-templates ; /simulator/pmo/organisational-templates
-- Sibling to plat_tpl_library / sim_tpl_library under the same Templates section
-- (plat_sec_templates / sim_sec_templates, parented under Portfolio & Delivery — v802).
-- =============================================================================

-- Platform leaf
INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
  route_path, menu_icon, methodology, is_visible, is_active
)
SELECT
  'plat_tpl_organisational',
  'Organisational Templates',
  'Your organisation''s own customised templates, copied from Global',
  par.id,
  COALESCE(par.menu_level, 2) + 1,
  20,
  '/app/pmo/organisational-templates',
  'building-2',
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

-- Simulator leaf
INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
  route_path, menu_icon, methodology, is_visible, is_active
)
SELECT
  'sim_tpl_organisational',
  'Organisational Templates',
  'Your organisation''s own customised templates, copied from Global',
  par.id,
  COALESCE(par.menu_level, 2) + 1,
  20,
  '/simulator/pmo/organisational-templates',
  'building-2',
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

-- Same role grants as v802 (plat_tpl_library / sim_tpl_library siblings)
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
CROSS JOIN public.roles r
WHERE mi.menu_code IN ('plat_tpl_organisational', 'sim_tpl_organisational')
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND r.role_name IN (
    'pmo_admin',
    'system_admin',
    'account_owner',
    'PMO Admin',
    'System Admin',
    'Superuser'
  )
  AND COALESCE(r.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE,
  can_use = TRUE,
  is_active = TRUE,
  updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v805_organisational_templates_menu.sql applied';
END $$;
