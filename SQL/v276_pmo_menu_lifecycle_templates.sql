-- ================================================
-- File: v276_pmo_menu_lifecycle_templates.sql
-- Description: Add "Lifecycle Templates" to PMO Admin sidebar menu.
-- Prerequisites: menu_items, role_menu_items, roles (pmo_admin), pmo_admin_section menu item.
-- ================================================

DO $$
DECLARE
  v_pmo_admin_id UUID;
  v_menu_id      UUID;
BEGIN
  SELECT id INTO v_pmo_admin_id FROM menu_items WHERE menu_code = 'pmo_admin_section' LIMIT 1;
  IF v_pmo_admin_id IS NULL THEN
    RAISE NOTICE 'pmo_admin_section not found – skipping Lifecycle Templates menu item';
    RETURN;
  END IF;

  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES (
    'pmo_admin_lifecycle_templates',
    'Lifecycle Templates',
    'Manage reusable lifecycle templates for project delivery',
    v_pmo_admin_id,
    2,
    70,
    '/platform/pmo-admin/lifecycle-templates',
    'refresh-cw',
    true,
    true
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label       = EXCLUDED.menu_label,
    menu_description = EXCLUDED.menu_description,
    route_path       = EXCLUDED.route_path,
    parent_menu_id   = EXCLUDED.parent_menu_id,
    menu_level       = EXCLUDED.menu_level,
    sort_order       = EXCLUDED.sort_order,
    menu_icon        = EXCLUDED.menu_icon,
    is_visible       = EXCLUDED.is_visible,
    is_active        = EXCLUDED.is_active,
    updated_at       = NOW();

  SELECT id INTO v_menu_id FROM menu_items WHERE menu_code = 'pmo_admin_lifecycle_templates' LIMIT 1;

  INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
  SELECT r.id, v_menu_id, true, true, true, false
  FROM roles r
  WHERE r.role_name = 'pmo_admin'
  AND NOT EXISTS (SELECT 1 FROM role_menu_items rmi WHERE rmi.role_id = r.id AND rmi.menu_item_id = v_menu_id);

  RAISE NOTICE 'Lifecycle Templates menu item added to PMO Admin';
END $$;

