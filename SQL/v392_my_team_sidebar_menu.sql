-- ============================================================================
-- v392: Platform sidebar — My Team (v345) under Teams
-- Prerequisites: menu_items, role_menu_items, roles
-- ============================================================================

DO $$
DECLARE
  v_parent_id UUID;
  v_menu_id   UUID;
BEGIN
  SELECT id INTO v_parent_id FROM menu_items WHERE menu_code = 'teams' LIMIT 1;
  IF v_parent_id IS NULL THEN
    RAISE NOTICE 'teams parent menu not found — skip My Team menu';
    RETURN;
  END IF;

  INSERT INTO menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  )
  VALUES (
    'teams_my_team',
    'My Team',
    'Manage your team members and functional roles (Team Lead)',
    v_parent_id,
    2,
    15,
    '/platform/teams/my-team',
    'users',
    TRUE,
    TRUE
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

  SELECT id INTO v_menu_id FROM menu_items WHERE menu_code = 'teams_my_team' LIMIT 1;

  INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
  SELECT r.id, v_menu_id, TRUE, TRUE, TRUE, FALSE
  FROM roles r
  WHERE r.role_name IN ('team_lead', 'project_manager', 'pmo_admin', 'system_admin')
  AND NOT EXISTS (
    SELECT 1 FROM role_menu_items rmi
    WHERE rmi.role_id = r.id AND rmi.menu_item_id = v_menu_id
  );

  RAISE NOTICE 'teams_my_team menu registered';
END $$;
