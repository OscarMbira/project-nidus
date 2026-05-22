-- =============================================================================
-- v596_pm_send_role_invitation_menu.sql
-- Merge PM sidebar: Invite Team Manager + Invite Team Member → Send Role Invitation
-- Prerequisites: v399 (pm_team_members_section)
-- =============================================================================

DO $$
DECLARE
  v_parent_id  UUID;
  v_pm_role_id UUID;
  v_menu_id    UUID;
BEGIN
  SELECT id INTO v_parent_id
  FROM menu_items
  WHERE menu_code = 'pm_team_members_section'
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  SELECT id INTO v_pm_role_id
  FROM roles
  WHERE role_name IN ('project_manager', 'Project Manager')
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  IF v_parent_id IS NULL OR v_pm_role_id IS NULL THEN
    RAISE NOTICE 'v596: pm_team_members_section or project_manager missing — skipped';
    RETURN;
  END IF;

  -- Retire legacy split invite links (keep rows for audit; hide from sidebar)
  UPDATE menu_items
  SET is_visible = false,
      is_active = false,
      updated_at = NOW()
  WHERE menu_code IN ('pm_invite_team_manager', 'pm_invite_team_member', 'pm_invite_project_member')
    AND COALESCE(is_deleted, FALSE) = FALSE;

  INSERT INTO menu_items (
    menu_code, menu_label, menu_description,
    parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  )
  VALUES (
    'pm_send_role_invitation',
    'Send Role Invitation',
    'Invite one user (choose role) or upload a bulk invite file',
    v_parent_id,
    2,
    20,
    '/app/project-members?action=send-invite',
    'mail',
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
    is_visible       = true,
    is_active        = true,
    is_deleted       = false,
    updated_at       = NOW();

  SELECT id INTO v_menu_id FROM menu_items WHERE menu_code = 'pm_send_role_invitation' LIMIT 1;

  INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
  VALUES (v_pm_role_id, v_menu_id, true, true, true, false)
  ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
    can_view   = true,
    can_use    = true,
    is_active  = true,
    is_deleted = false,
    updated_at = NOW();

  -- Deactivate role grants on retired menu rows
  UPDATE role_menu_items rmi
  SET is_active = false,
      is_deleted = true,
      updated_at = NOW()
  FROM menu_items mi
  WHERE rmi.menu_item_id = mi.id
    AND rmi.role_id = v_pm_role_id
    AND mi.menu_code IN ('pm_invite_team_manager', 'pm_invite_team_member', 'pm_invite_project_member');

  RAISE NOTICE 'v596: pm_send_role_invitation menu applied';
END $$;

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE 'v596_pm_send_role_invitation_menu.sql applied';
END $$;
