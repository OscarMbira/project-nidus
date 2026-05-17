-- =============================================================================
-- v518_local_data_extensions_sidebar_menu.sql
-- Phase 11 — Sidebar entries under Governance & Admin + role_menu_items
-- =============================================================================

INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
  route_path, menu_icon, is_visible, is_active
)
SELECT
  'local_data_extensions',
  'Local Data Extensions',
  'Custom fields and local metadata',
  mi.id,
  2,
  85,
  '/app/local-data-extensions',
  'database',
  TRUE,
  TRUE
FROM public.menu_items mi
WHERE mi.menu_code = 'platform_governance_admin'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
LIMIT 1
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  parent_menu_id = EXCLUDED.parent_menu_id,
  sort_order = EXCLUDED.sort_order,
  route_path = EXCLUDED.route_path,
  menu_icon = EXCLUDED.menu_icon,
  is_visible = TRUE,
  is_active = TRUE,
  updated_at = NOW();

-- Children (level 3) — parent = local_data_extensions
WITH parent AS (
  SELECT id FROM public.menu_items WHERE menu_code = 'local_data_extensions' LIMIT 1
)
INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
  route_path, menu_icon, is_visible, is_active
)
SELECT v.menu_code, v.menu_label, v.menu_description, parent.id, 3, v.sort_order, v.route_path, v.menu_icon, TRUE, TRUE
FROM parent
CROSS JOIN (
  VALUES
    ('lde_field_definitions', 'Field Definitions', 'Define local fields', 10, '/app/local-data-extensions/field-definitions', 'list'),
    ('lde_field_groups', 'Field Groups', 'Repeating field groups', 20, '/app/local-data-extensions/field-groups', 'layers'),
    ('lde_screen_mapping', 'Screen Mapping', 'Attach fields to screens', 30, '/app/local-data-extensions/screen-mapping', 'monitor'),
    ('lde_validation_rules', 'Validation Rules', 'Rules per field', 40, '/app/local-data-extensions/validation-rules', 'shield-check'),
    ('lde_field_permissions', 'Field Permissions', 'Role matrix', 50, '/app/local-data-extensions/field-permissions', 'users'),
    ('lde_audit_history', 'Audit History', 'Configuration & value audit', 60, '/app/local-data-extensions/audit-history', 'history')
) AS v(menu_code, menu_label, menu_description, sort_order, route_path, menu_icon)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  parent_menu_id = EXCLUDED.parent_menu_id,
  sort_order = EXCLUDED.sort_order,
  route_path = EXCLUDED.route_path,
  menu_icon = EXCLUDED.menu_icon,
  is_visible = TRUE,
  is_active = TRUE,
  updated_at = NOW();

-- Grants: PMO Admin (full), Programme Manager, Project Manager (navigate + use)
INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
SELECT r.id, mi.id, TRUE, TRUE, TRUE, FALSE
FROM public.roles r
JOIN public.menu_items mi ON mi.menu_code IN (
  'local_data_extensions',
  'lde_field_definitions',
  'lde_field_groups',
  'lde_screen_mapping',
  'lde_validation_rules',
  'lde_field_permissions',
  'lde_audit_history'
)
WHERE COALESCE(mi.is_active, TRUE) = TRUE
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND LOWER(TRIM(r.role_name)) IN (
    'pmo_admin',
    'system_admin',
    'super_admin',
    'programme_manager',
    'project_manager'
  )
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE,
  can_use = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();
