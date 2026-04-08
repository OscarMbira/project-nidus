-- ============================================================================
-- v385: PMO Admin — Manager Assignments menu (parent + children)
-- Prerequisites: menu_items, role_menu_items, roles (pmo_admin), pmo_admin_section
-- Date: 2026-04-05
-- ============================================================================

DO $$
DECLARE
  v_pmo_admin_id UUID;
  v_parent_id    UUID;
  v_child_id     UUID;
BEGIN
  SELECT id INTO v_pmo_admin_id FROM menu_items WHERE menu_code = 'pmo_admin_section' LIMIT 1;
  IF v_pmo_admin_id IS NULL THEN
    RAISE NOTICE 'pmo_admin_section not found – skipping Manager Assignments menu';
    RETURN;
  END IF;

  INSERT INTO menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  )
  VALUES (
    'pmo_manager_assignments',
    'Manager Assignments',
    'Assign project, programme, and portfolio managers within concurrent limits',
    v_pmo_admin_id,
    2,
    58,
    NULL,
    'user-check',
    true,
    true
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label       = EXCLUDED.menu_label,
    menu_description = EXCLUDED.menu_description,
    parent_menu_id   = EXCLUDED.parent_menu_id,
    menu_level       = EXCLUDED.menu_level,
    sort_order       = EXCLUDED.sort_order,
    route_path       = EXCLUDED.route_path,
    menu_icon        = EXCLUDED.menu_icon,
    is_visible       = EXCLUDED.is_visible,
    is_active        = EXCLUDED.is_active,
    updated_at       = NOW();

  SELECT id INTO v_parent_id FROM menu_items WHERE menu_code = 'pmo_manager_assignments' LIMIT 1;

  INSERT INTO menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  )
  VALUES (
    'pmo_assign_managers',
    'Assign Managers',
    'View entities and assign or change managers',
    v_parent_id,
    3,
    1,
    '/platform/pmo-admin/manager-assignments',
    'user-check',
    true,
    true
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label       = EXCLUDED.menu_label,
    menu_description = EXCLUDED.menu_description,
    parent_menu_id   = EXCLUDED.parent_menu_id,
    menu_level       = EXCLUDED.menu_level,
    sort_order       = EXCLUDED.sort_order,
    route_path       = EXCLUDED.route_path,
    menu_icon        = EXCLUDED.menu_icon,
    is_visible       = EXCLUDED.is_visible,
    is_active        = EXCLUDED.is_active,
    updated_at       = NOW();

  INSERT INTO menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  )
  VALUES (
    'pmo_assignment_settings',
    'Assignment Settings',
    'Configure maximum concurrent assignments per manager',
    v_parent_id,
    3,
    2,
    '/platform/pmo-admin/manager-assignment-settings',
    'settings',
    true,
    true
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label       = EXCLUDED.menu_label,
    menu_description = EXCLUDED.menu_description,
    parent_menu_id   = EXCLUDED.parent_menu_id,
    menu_level       = EXCLUDED.menu_level,
    sort_order       = EXCLUDED.sort_order,
    route_path       = EXCLUDED.route_path,
    menu_icon        = EXCLUDED.menu_icon,
    is_visible       = EXCLUDED.is_visible,
    is_active        = EXCLUDED.is_active,
    updated_at       = NOW();

  FOR v_child_id IN
    SELECT id FROM menu_items WHERE menu_code IN ('pmo_manager_assignments', 'pmo_assign_managers', 'pmo_assignment_settings')
  LOOP
    INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT r.id, v_child_id, true, true, true, false
    FROM roles r
    WHERE r.role_name = 'pmo_admin'
    AND NOT EXISTS (
      SELECT 1 FROM role_menu_items rmi
      WHERE rmi.role_id = r.id AND rmi.menu_item_id = v_child_id
    );
  END LOOP;

  RAISE NOTICE 'Manager Assignments menu items registered for pmo_admin';
END $$;
