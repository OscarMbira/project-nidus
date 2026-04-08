-- ============================================================================
-- PMO Admin: "Add users to project" sidebar menu
-- Version: v393
-- Description: Adds menu link to Project Users (invites & memberships) next to
--              Assign Roles; reorders Send Role Invitations.
-- ============================================================================

DO $$
DECLARE
  v_parent_id UUID;
BEGIN
  SELECT id INTO v_parent_id
  FROM menu_items
  WHERE menu_code = 'pmo_admin_section'
    AND is_deleted = FALSE
  LIMIT 1;

  IF v_parent_id IS NULL THEN
    RAISE NOTICE 'pmo_admin_section missing; run v130/v133 first.';
    RETURN;
  END IF;

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
  VALUES (
    'pmo_admin_add_project_users',
    'Add users to project',
    'Invite users and manage project members',
    v_parent_id,
    2,
    2,
    '/platform/project-members',
    'user-plus',
    true,
    true
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    menu_description = EXCLUDED.menu_description,
    route_path = EXCLUDED.route_path,
    menu_icon = EXCLUDED.menu_icon,
    parent_menu_id = EXCLUDED.parent_menu_id,
    menu_level = EXCLUDED.menu_level,
    sort_order = EXCLUDED.sort_order,
    is_visible = true,
    is_active = true,
    is_deleted = false,
    updated_at = NOW();

  UPDATE menu_items
  SET sort_order = 3,
      updated_at = NOW()
  WHERE menu_code = 'pmo_admin_send_invites'
    AND is_deleted = FALSE;
END $$;

INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active)
SELECT
  r.id,
  m.id,
  true,
  true,
  true
FROM roles r
CROSS JOIN menu_items m
WHERE r.role_name = 'pmo_admin'
  AND m.menu_code = 'pmo_admin_add_project_users'
  AND m.is_deleted = FALSE
  AND m.is_active = TRUE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = true,
  can_use = true,
  is_active = true,
  updated_at = NOW();
