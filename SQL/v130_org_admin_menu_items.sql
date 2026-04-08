-- ============================================================================
-- PMO Admin Menu Items
-- Description: Adds menu items for PMO Admin functions:
--   1. Assign Roles to Projects
--   2. Send Role Invitations
-- Creates a parent "PMO Admin" section to group these functions
-- ============================================================================

-- Step 1: Create parent menu item "PMO Admin"
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
VALUES 
  (
    'pmo_admin_section',
    'PMO Admin',
    'Organization administration functions',
    NULL,
    1,
    99,
    NULL,  -- Parent item has no route, it's just a container
    'shield',
    true,
    true
  )
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  menu_icon = EXCLUDED.menu_icon,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- Step 2: Create child menu items under the parent
-- First, get the parent menu ID
DO $$
DECLARE
  v_parent_id UUID;
BEGIN
  -- Get the parent menu item ID
  SELECT id INTO v_parent_id
  FROM menu_items
  WHERE menu_code = 'pmo_admin_section'
  LIMIT 1;

  -- Insert child menu items
  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES 
    (
      'pmo_admin_assign_roles',
      'Assign Roles to Projects',
      'Assign roles to users in specific projects',
      v_parent_id,
      2,
      1,
      '/platform/admin/assign-roles-to-projects',
      'shield',
      true,
      true
    ),
    (
      'pmo_admin_send_invites',
      'Send Role Invitations',
      'Send email invitations with roles (excluding Team Manager/Member)',
      v_parent_id,
      2,
      2,
      '/platform/admin/send-role-invites',
      'mail',
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
    updated_at = NOW();

  RAISE NOTICE 'PMO Admin menu items created with parent section';
END $$;

-- Step 3: Assign all menu items (parent + children) to PMO Admin role
INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active)
SELECT
  r.id AS role_id,
  m.id AS menu_item_id,
  true AS can_view,
  true AS can_use,
  true AS is_active
FROM roles r
CROSS JOIN menu_items m
WHERE r.role_name = 'pmo_admin'
  AND m.menu_code IN ('pmo_admin_section', 'pmo_admin_assign_roles', 'pmo_admin_send_invites')
  AND m.is_deleted = FALSE
  AND m.is_active = TRUE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = true,
  can_use = true,
  is_active = true,
  updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'PMO Admin menu section and items added successfully';
END $$;

