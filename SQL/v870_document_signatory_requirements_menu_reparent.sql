-- =============================================================================
-- v870: Reparent "Document Signatory Requirements" to the live Templates tree
-- Depends on: v868d (menu codes) — safe if v868d never inserted (creates row).
-- Why: v868d parented under plat_sec_templates ("Templates" section). That section
--   label no longer appears in the PMO sidebar; Template Library / Organisational
--   Templates / Field Templates show as peers. Parenting only to plat_sec_templates
--   also silently inserts 0 rows if that section is missing — so the leaf never
--   appears. This script resolves the same parent those peers use.
-- Target path (Platform): sibling of Organisational Templates / Template Library /
--   Field Templates (under Portfolio & Delivery when that is their grandparent).
-- =============================================================================

-- Platform: upsert leaf under the best available parent
WITH parent AS (
  SELECT COALESCE(
    (SELECT parent_menu_id FROM public.menu_items
      WHERE menu_code = 'plat_tpl_organisational' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
    (SELECT parent_menu_id FROM public.menu_items
      WHERE menu_code = 'plat_tpl_library' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
    (SELECT parent_menu_id FROM public.menu_items
      WHERE menu_code = 'plat_pmo_field_templates' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
    (SELECT id FROM public.menu_items
      WHERE menu_code = 'plat_sec_templates' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
    (SELECT id FROM public.menu_items
      WHERE menu_code = 'pmo-cat-project-delivery' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1)
  ) AS id
)
INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
  route_path, menu_icon, methodology, is_visible, is_active, is_deleted
)
SELECT
  'plat_tpl_signatory_requirements',
  'Document Signatory',
  'Configure required signatory role-slots per document type for formal sign-off',
  parent.id,
  COALESCE((SELECT menu_level FROM public.menu_items WHERE id = parent.id), 1) + 1,
  21,
  '/app/pmo/signatory-requirements',
  'signature',
  'universal',
  TRUE,
  TRUE,
  FALSE
FROM parent
WHERE parent.id IS NOT NULL
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

-- Simulator
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
  route_path, menu_icon, methodology, is_visible, is_active, is_deleted
)
SELECT
  'sim_tpl_signatory_requirements',
  'Document Signatory',
  'Configure required signatory role-slots per document type for formal sign-off',
  parent.id,
  COALESCE((SELECT menu_level FROM public.menu_items WHERE id = parent.id), 1) + 1,
  21,
  '/simulator/pmo/organisational-templates/signatory-requirements',
  'signature',
  'universal',
  TRUE,
  TRUE,
  FALSE
FROM parent
WHERE parent.id IS NOT NULL
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

-- Role grants (PMO Admin / System Admin / Account Owner — same as v868d)
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
DECLARE
  plat_parent text;
  sim_parent text;
BEGIN
  SELECT p.menu_code INTO plat_parent
  FROM public.menu_items mi
  JOIN public.menu_items p ON p.id = mi.parent_menu_id
  WHERE mi.menu_code = 'plat_tpl_signatory_requirements'
  LIMIT 1;

  SELECT p.menu_code INTO sim_parent
  FROM public.menu_items mi
  JOIN public.menu_items p ON p.id = mi.parent_menu_id
  WHERE mi.menu_code = 'sim_tpl_signatory_requirements'
  LIMIT 1;

  RAISE NOTICE 'v870: plat_tpl_signatory_requirements parent=% ; sim_tpl_signatory_requirements parent=%',
    COALESCE(plat_parent, '(missing)'), COALESCE(sim_parent, '(missing)');
END $$;
