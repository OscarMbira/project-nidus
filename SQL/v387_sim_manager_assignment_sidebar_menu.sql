-- ============================================================================
-- v387: Simulator PMO — Manager Assignments menu (parity with v385)
-- Prerequisites: menu_items, role_menu_items, roles, sim_pmo (v300)
-- Date: 2026-04-05
-- ============================================================================

DO $$
DECLARE
  v_parent_id UUID;
  v_section_id UUID;
  v_child_id UUID;
BEGIN
  SELECT id INTO v_parent_id FROM menu_items WHERE menu_code = 'sim_pmo' LIMIT 1;
  IF v_parent_id IS NULL THEN
    RAISE NOTICE 'sim_pmo not found – skipping sim manager assignment menus';
    RETURN;
  END IF;

  INSERT INTO menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  )
  VALUES (
    'sim_pmo_manager_assignments',
    'Manager Assignments',
    'Assign practice portfolio, programme, and project managers (simulator)',
    v_parent_id,
    2,
    6,
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

  SELECT id INTO v_section_id FROM menu_items WHERE menu_code = 'sim_pmo_manager_assignments' LIMIT 1;

  INSERT INTO menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  )
  VALUES (
    'sim_pmo_assign_managers',
    'Assign Managers',
    'View practice entities and assign or change managers',
    v_section_id,
    3,
    1,
    '/simulator/pmo/manager-assignments',
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
    'sim_pmo_assignment_settings',
    'Assignment Settings',
    'Configure maximum concurrent manager assignments (same system setting as Platform)',
    v_section_id,
    3,
    2,
    '/simulator/pmo/manager-assignment-settings',
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
    SELECT id FROM menu_items WHERE menu_code IN (
      'sim_pmo_manager_assignments', 'sim_pmo_assign_managers', 'sim_pmo_assignment_settings'
    )
  LOOP
    INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT r.id, v_child_id, true, true, true, false
    FROM roles r
    WHERE r.role_name IN ('pmo_admin', 'project_manager', 'system_admin')
    AND NOT EXISTS (
      SELECT 1 FROM role_menu_items rmi
      WHERE rmi.role_id = r.id AND rmi.menu_item_id = v_child_id
    );
  END LOOP;

  RAISE NOTICE 'Simulator Manager Assignments menu items registered';
END $$;
