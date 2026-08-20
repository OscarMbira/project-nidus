-- =============================================================================
-- v868d: Document Signatory Requirements menu leaf (Platform + Simulator)
-- Plan: projectplan/v868_process_template_document_signatories_plan.md
-- Routes: /app/pmo/signatory-requirements ; /simulator/pmo/organisational-templates/signatory-requirements
-- Parent: same parent as Organisational Templates / Template Library (live tree).
--   Prefer NOT only plat_sec_templates — that section label is no longer shown;
--   see v870 if this leaf is missing after an earlier v868d run.
-- PMO Admin-only surface (matches policy_ptsr_write's is_pmo_admin_user() gate).
-- =============================================================================

-- Platform leaf
WITH parent AS (
  SELECT COALESCE(
    (SELECT parent_menu_id FROM public.menu_items
      WHERE menu_code = 'plat_tpl_organisational' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
    (SELECT parent_menu_id FROM public.menu_items
      WHERE menu_code = 'plat_tpl_library' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
    (SELECT id FROM public.menu_items
      WHERE menu_code = 'plat_sec_templates' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
    (SELECT id FROM public.menu_items
      WHERE menu_code = 'pmo-cat-project-delivery' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1)
  ) AS id
)
INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
  route_path, menu_icon, methodology, is_visible, is_active
)
SELECT
  'plat_tpl_signatory_requirements',
  'Document Signatory',
  'Configure required signatory role-slots per document type for formal sign-off',
  parent.id,
  COALESCE((SELECT menu_level FROM public.menu_items WHERE id = parent.id), 2) + 1,
  21,
  '/app/pmo/signatory-requirements',
  'signature',
  'universal',
  TRUE,
  TRUE
FROM parent
WHERE parent.id IS NOT NULL
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  parent_menu_id = EXCLUDED.parent_menu_id,
  menu_level = EXCLUDED.menu_level,
  route_path = EXCLUDED.route_path,
  is_visible = TRUE,
  is_active = TRUE,
  updated_at = NOW();

-- Simulator leaf
WITH parent AS (
  SELECT COALESCE(
    (SELECT parent_menu_id FROM public.menu_items
      WHERE menu_code = 'sim_tpl_organisational' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
    (SELECT parent_menu_id FROM public.menu_items
      WHERE menu_code = 'sim_tpl_library' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
    (SELECT id FROM public.menu_items
      WHERE menu_code = 'sim_sec_templates' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
    (SELECT id FROM public.menu_items
      WHERE menu_code IN ('sim_pmo_cat_project_delivery', 'sim_pm_cat_project_delivery')
        AND COALESCE(is_deleted, FALSE) = FALSE
      ORDER BY CASE menu_code WHEN 'sim_pmo_cat_project_delivery' THEN 0 ELSE 1 END
      LIMIT 1)
  ) AS id
)
INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
  route_path, menu_icon, methodology, is_visible, is_active
)
SELECT
  'sim_tpl_signatory_requirements',
  'Document Signatory',
  'Configure required signatory role-slots per document type for formal sign-off',
  parent.id,
  COALESCE((SELECT menu_level FROM public.menu_items WHERE id = parent.id), 2) + 1,
  21,
  '/simulator/pmo/organisational-templates/signatory-requirements',
  'signature',
  'universal',
  TRUE,
  TRUE
FROM parent
WHERE parent.id IS NOT NULL
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  parent_menu_id = EXCLUDED.parent_menu_id,
  menu_level = EXCLUDED.menu_level,
  route_path = EXCLUDED.route_path,
  is_visible = TRUE,
  is_active = TRUE,
  updated_at = NOW();

-- PMO Admin / System Admin / Account Owner only (matches v805's grant pattern).
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
CROSS JOIN public.roles r
WHERE mi.menu_code IN ('plat_tpl_signatory_requirements', 'sim_tpl_signatory_requirements')
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
  RAISE NOTICE 'v868d_process_template_signatories_menu.sql applied';
END $$;
