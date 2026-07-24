-- =============================================================================
-- v802: Place Template Library under PMO Portfolio & Delivery + harden PMO grants
-- Plan: projectplan/v798_template_library_menu_rationalisation_and_copy_plan.md
-- Why: v800 preferred parent plat_sec_portfolio_delivery does not exist; Templates
--   landed under PM plat_pm_templates and was hard for PMO Admin to find.
-- Target parent: pmo-cat-project-delivery (Portfolio & Delivery)
-- =============================================================================

-- Platform: section under Portfolio & Delivery
UPDATE public.menu_items AS child
SET
  parent_menu_id = parent.id,
  menu_level = COALESCE(parent.menu_level, 1) + 1,
  menu_label = 'Templates',
  menu_description = 'Browse published Global Templates and copy to customise',
  is_visible = TRUE,
  is_active = TRUE,
  methodology = 'universal',
  updated_at = NOW()
FROM public.menu_items AS parent
WHERE child.menu_code = 'plat_sec_templates'
  AND parent.menu_code = 'pmo-cat-project-delivery'
  AND COALESCE(parent.is_deleted, FALSE) = FALSE
  AND COALESCE(child.is_deleted, FALSE) = FALSE;

-- Ensure section exists if v800 never created it
INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
  route_path, menu_icon, methodology, is_visible, is_active
)
SELECT
  'plat_sec_templates',
  'Templates',
  'Browse published Global Templates and copy to customise',
  parent.id,
  COALESCE(parent.menu_level, 1) + 1,
  48,
  NULL,
  'library',
  'universal',
  TRUE,
  TRUE
FROM public.menu_items AS parent
WHERE parent.menu_code = 'pmo-cat-project-delivery'
  AND COALESCE(parent.is_deleted, FALSE) = FALSE
  AND NOT EXISTS (
    SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_sec_templates'
  )
LIMIT 1;

-- Platform leaf
UPDATE public.menu_items AS leaf
SET
  parent_menu_id = sec.id,
  menu_level = COALESCE(sec.menu_level, 2) + 1,
  menu_label = 'Template Library',
  menu_description = 'View and copy published Global Templates (org methodology policy applies)',
  route_path = '/app/pmo/template-library',
  is_visible = TRUE,
  is_active = TRUE,
  methodology = 'universal',
  updated_at = NOW()
FROM public.menu_items AS sec
WHERE leaf.menu_code = 'plat_tpl_library'
  AND sec.menu_code = 'plat_sec_templates'
  AND COALESCE(sec.is_deleted, FALSE) = FALSE
  AND COALESCE(leaf.is_deleted, FALSE) = FALSE;

INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
  route_path, menu_icon, methodology, is_visible, is_active
)
SELECT
  'plat_tpl_library',
  'Template Library',
  'View and copy published Global Templates (org methodology policy applies)',
  sec.id,
  COALESCE(sec.menu_level, 2) + 1,
  10,
  '/app/pmo/template-library',
  'layout-list',
  'universal',
  TRUE,
  TRUE
FROM public.menu_items AS sec
WHERE sec.menu_code = 'plat_sec_templates'
  AND COALESCE(sec.is_deleted, FALSE) = FALSE
  AND NOT EXISTS (
    SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_tpl_library'
  )
LIMIT 1;

-- Relocate classic field templates under Templates
UPDATE public.menu_items AS child
SET
  parent_menu_id = sec.id,
  updated_at = NOW()
FROM public.menu_items AS sec
WHERE child.menu_code = 'plat_pmo_field_templates'
  AND sec.menu_code = 'plat_sec_templates'
  AND COALESCE(sec.is_deleted, FALSE) = FALSE
  AND COALESCE(child.is_deleted, FALSE) = FALSE;

-- Simulator: prefer sim_pmo_cat_project_delivery
UPDATE public.menu_items AS child
SET
  parent_menu_id = parent.id,
  menu_level = COALESCE(parent.menu_level, 1) + 1,
  menu_label = 'Templates',
  is_visible = TRUE,
  is_active = TRUE,
  methodology = 'universal',
  updated_at = NOW()
FROM public.menu_items AS parent
WHERE child.menu_code = 'sim_sec_templates'
  AND parent.menu_code IN ('sim_pmo_cat_project_delivery', 'sim_pm_cat_project_delivery')
  AND COALESCE(parent.is_deleted, FALSE) = FALSE
  AND COALESCE(child.is_deleted, FALSE) = FALSE;

INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
  route_path, menu_icon, methodology, is_visible, is_active
)
SELECT
  'sim_sec_templates',
  'Templates',
  'Browse published Global Templates and copy to customise',
  parent.id,
  COALESCE(parent.menu_level, 1) + 1,
  48,
  NULL,
  'library',
  'universal',
  TRUE,
  TRUE
FROM public.menu_items AS parent
WHERE parent.menu_code = 'sim_pmo_cat_project_delivery'
  AND COALESCE(parent.is_deleted, FALSE) = FALSE
  AND NOT EXISTS (
    SELECT 1 FROM public.menu_items WHERE menu_code = 'sim_sec_templates'
  )
LIMIT 1;

UPDATE public.menu_items AS leaf
SET
  parent_menu_id = sec.id,
  route_path = '/simulator/pmo/template-library',
  is_visible = TRUE,
  is_active = TRUE,
  methodology = 'universal',
  updated_at = NOW()
FROM public.menu_items AS sec
WHERE leaf.menu_code = 'sim_tpl_library'
  AND sec.menu_code = 'sim_sec_templates'
  AND COALESCE(sec.is_deleted, FALSE) = FALSE;

INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
  route_path, menu_icon, methodology, is_visible, is_active
)
SELECT
  'sim_tpl_library',
  'Template Library',
  'View and copy published Global Templates (org methodology policy applies)',
  sec.id,
  COALESCE(sec.menu_level, 2) + 1,
  10,
  '/simulator/pmo/template-library',
  'layout-list',
  'universal',
  TRUE,
  TRUE
FROM public.menu_items AS sec
WHERE sec.menu_code = 'sim_sec_templates'
  AND COALESCE(sec.is_deleted, FALSE) = FALSE
  AND NOT EXISTS (
    SELECT 1 FROM public.menu_items WHERE menu_code = 'sim_tpl_library'
  )
LIMIT 1;

-- Ensure pmo_admin (+ core PMO roles) can see Templates
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
CROSS JOIN public.roles r
WHERE mi.menu_code IN (
  'plat_sec_templates',
  'plat_tpl_library',
  'plat_pmo_field_templates',
  'sim_sec_templates',
  'sim_tpl_library',
  'sim_pmo_field_templates'
)
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
  RAISE NOTICE 'v802_template_library_pmo_menu_placement.sql applied';
END $$;
