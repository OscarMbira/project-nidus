-- ============================================================================
-- v485: Sidebar entries — Role Menu Access (PMO Admin + System Admin)
-- Routes: /platform/pmo/role-menu-access , /platform/admin/role-menu-access
-- ============================================================================

-- PMO Administration → Role Menu Access
INSERT INTO menu_items (
  menu_code,
  menu_label,
  menu_description,
  parent_menu_id,
  menu_level,
  sort_order,
  route_path,
  menu_icon,
  is_visible,
  is_active
)
SELECT
  'pmo_role_menu_access',
  'Role Menu Access',
  'Configure which sidebar items each role can see and use',
  id,
  2,
  88,
  '/platform/pmo/role-menu-access',
  'menu',
  TRUE,
  TRUE
FROM menu_items
WHERE menu_code = 'pmo_admin_section'
  AND COALESCE(is_deleted, FALSE) = FALSE
LIMIT 1
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  route_path = EXCLUDED.route_path,
  menu_icon = EXCLUDED.menu_icon,
  parent_menu_id = EXCLUDED.parent_menu_id,
  menu_level = EXCLUDED.menu_level,
  sort_order = EXCLUDED.sort_order,
  is_visible = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

-- Administration → Role Menu Access (System Admin)
INSERT INTO menu_items (
  menu_code,
  menu_label,
  menu_description,
  parent_menu_id,
  menu_level,
  sort_order,
  route_path,
  menu_icon,
  is_visible,
  is_active
)
SELECT
  'admin_role_menu_access',
  'Role Menu Access',
  'Configure which sidebar items each role can see and use',
  id,
  2,
  48,
  '/platform/admin/role-menu-access',
  'menu',
  TRUE,
  TRUE
FROM menu_items
WHERE menu_code = 'administration'
  AND parent_menu_id IS NULL
  AND COALESCE(is_deleted, FALSE) = FALSE
LIMIT 1
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  route_path = EXCLUDED.route_path,
  menu_icon = EXCLUDED.menu_icon,
  parent_menu_id = EXCLUDED.parent_menu_id,
  menu_level = EXCLUDED.menu_level,
  sort_order = EXCLUDED.sort_order,
  is_visible = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
SELECT
  r.id,
  m.id,
  TRUE,
  TRUE,
  TRUE,
  FALSE
FROM roles r
CROSS JOIN menu_items m
WHERE m.menu_code = 'pmo_role_menu_access'
  AND COALESCE(m.is_deleted, FALSE) = FALSE
  AND r.role_name = 'pmo_admin'
  AND COALESCE(r.is_active, TRUE) = TRUE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE,
  can_use = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
SELECT
  r.id,
  m.id,
  TRUE,
  TRUE,
  TRUE,
  FALSE
FROM roles r
CROSS JOIN menu_items m
WHERE m.menu_code = 'admin_role_menu_access'
  AND COALESCE(m.is_deleted, FALSE) = FALSE
  AND r.role_name = 'system_admin'
  AND COALESCE(r.is_active, TRUE) = TRUE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE,
  can_use = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();
