-- v1218: configuration item multi-value links, default item types, and sidebar access.
-- Run this in the Platform database before saving a configuration item with
-- more than one product link, or before using Configuration Item Types.

ALTER TABLE public.configuration_items
  ADD COLUMN IF NOT EXISTS product_id_list TEXT;

ALTER TABLE public.configuration_items
  ALTER COLUMN repository_url TYPE TEXT;

COMMENT ON COLUMN public.configuration_items.product_id_list IS
  'Newline-separated project product description ids. The first id is also stored in product_id.';

-- Default types for any strategy that does not already have that code.
INSERT INTO public.cfg_item_types (
  cfg_ms_id, item_type_code, item_type_name, item_type_description,
  classification_level, control_level, baseline_required,
  version_control_required, status_accounting_required, audit_required, display_order
)
SELECT
  cms.id,
  seed.item_type_code,
  seed.item_type_name,
  seed.item_type_description,
  seed.classification_level::public.cfg_item_classification_enum,
  seed.control_level::public.cfg_control_level_enum,
  seed.baseline_required,
  TRUE,
  TRUE,
  FALSE,
  seed.display_order
FROM public.configuration_management_strategies cms
CROSS JOIN (
  VALUES
    ('MAJOR', 'Major', 'A major configuration item', 'major', 'full', TRUE, 1),
    ('MINOR', 'Minor', 'A minor configuration item', 'minor', 'partial', FALSE, 2),
    ('COMP', 'Component', 'A component of a larger item', 'component', 'partial', FALSE, 3),
    ('WP', 'Work product', 'A work product under configuration control', 'work_product', 'informal', FALSE, 4)
) AS seed (
  item_type_code, item_type_name, item_type_description,
  classification_level, control_level, baseline_required, display_order
)
WHERE COALESCE(cms.is_deleted, FALSE) = FALSE
  AND NOT EXISTS (
    SELECT 1
    FROM public.cfg_item_types existing
    WHERE existing.cfg_ms_id = cms.id
      AND existing.item_type_code = seed.item_type_code
  );

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  'plat_pm_config_item_types',
  'Configuration Item Types',
  'Create and maintain the item types used on configuration items',
  '/pm/controls/configuration-item-types',
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_quality' AND COALESCE(is_deleted, FALSE) = FALSE),
  2,
  50,
  'universal',
  'tags',
  TRUE,
  TRUE,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items
  WHERE menu_code = 'plat_pm_config_item_types' AND COALESCE(is_deleted, FALSE) = FALSE
)
AND EXISTS (
  SELECT 1 FROM public.menu_items
  WHERE menu_code = 'plat_pm_quality' AND COALESCE(is_deleted, FALSE) = FALSE
);

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
JOIN public.roles r ON r.role_name IN (
  'system_admin', 'account_owner',
  'pmo_admin', 'PMO Admin',
  'project_manager', 'Project Manager',
  'team_lead', 'Team Lead', 'pm_team_lead',
  'team_manager', 'Team Manager', 'pm_team_manager'
)
WHERE mi.menu_code = 'plat_pm_config_item_types'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE
  SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();
