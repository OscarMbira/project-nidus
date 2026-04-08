-- ============================================================================
-- Verify and Re-apply PMO Admin Menu Items
-- Version: v133
-- Description: Verifies v130 menu items exist and re-applies if needed
-- ============================================================================

-- This script ensures the PMO Admin menu items from v130 are properly
-- created and assigned to the pmo_admin role, working with v129 RLS policies

-- Step 1: Verify parent menu item exists
DO $$
DECLARE
  v_parent_exists BOOLEAN;
  v_parent_id UUID;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM menu_items 
    WHERE menu_code = 'pmo_admin_section' 
    AND is_deleted = FALSE
  ) INTO v_parent_exists;
  
  IF NOT v_parent_exists THEN
    RAISE NOTICE 'Parent menu item pmo_admin_section does not exist. Creating...';
    
    INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
    VALUES (
      'pmo_admin_section',
      'PMO Admin',
      'Organization administration functions',
      NULL,
      1,
      99,
      NULL,
      'shield',
      true,
      true
    )
    ON CONFLICT (menu_code) DO UPDATE SET
      menu_label = EXCLUDED.menu_label,
      menu_description = EXCLUDED.menu_description,
      menu_icon = EXCLUDED.menu_icon,
      sort_order = EXCLUDED.sort_order,
      is_active = true,
      is_deleted = false,
      updated_at = NOW();
    
    RAISE NOTICE 'Parent menu item created.';
  ELSE
    RAISE NOTICE 'Parent menu item pmo_admin_section exists.';
  END IF;
  
  -- Get parent ID
  SELECT id INTO v_parent_id
  FROM menu_items
  WHERE menu_code = 'pmo_admin_section'
  AND is_deleted = FALSE
  LIMIT 1;
  
  -- Step 2: Verify and create child menu items
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
    is_active = true,
    is_deleted = false,
    updated_at = NOW();
  
  RAISE NOTICE 'Child menu items verified/created.';
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
  is_deleted = false,
  updated_at = NOW();

-- Step 4: Verification
DO $$
DECLARE
  v_parent_count INTEGER;
  v_child_count INTEGER;
  v_role_assignments INTEGER;
  v_pmo_admin_role_id UUID;
BEGIN
  -- Count menu items
  SELECT COUNT(*) INTO v_parent_count
  FROM menu_items
  WHERE menu_code = 'pmo_admin_section'
    AND is_deleted = FALSE
    AND is_active = TRUE;
  
  SELECT COUNT(*) INTO v_child_count
  FROM menu_items
  WHERE menu_code IN ('pmo_admin_assign_roles', 'pmo_admin_send_invites')
    AND is_deleted = FALSE
    AND is_active = TRUE;
  
  -- Get pmo_admin role ID
  SELECT id INTO v_pmo_admin_role_id
  FROM roles
  WHERE role_name = 'pmo_admin'
    AND is_deleted = FALSE
    AND is_active = TRUE
  LIMIT 1;
  
  -- Count role assignments
  IF v_pmo_admin_role_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_role_assignments
    FROM role_menu_items rmi
    INNER JOIN menu_items m ON rmi.menu_item_id = m.id
    WHERE rmi.role_id = v_pmo_admin_role_id
      AND m.menu_code IN ('pmo_admin_section', 'pmo_admin_assign_roles', 'pmo_admin_send_invites')
      AND rmi.is_deleted = FALSE
      AND rmi.is_active = TRUE
      AND m.is_deleted = FALSE
      AND m.is_active = TRUE;
  ELSE
    v_role_assignments := 0;
    RAISE WARNING 'pmo_admin role not found!';
  END IF;
  
  RAISE NOTICE '================================================';
  RAISE NOTICE 'PMO Admin Menu Verification';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Parent menu item: %', v_parent_count;
  RAISE NOTICE 'Child menu items: %', v_child_count;
  RAISE NOTICE 'Role assignments: %', v_role_assignments;
  RAISE NOTICE '================================================';
  
  IF v_parent_count = 0 THEN
    RAISE WARNING 'Parent menu item missing!';
  END IF;
  
  IF v_child_count < 2 THEN
    RAISE WARNING 'Child menu items missing! Expected 2, found %', v_child_count;
  END IF;
  
  IF v_role_assignments < 3 THEN
    RAISE WARNING 'Role assignments incomplete! Expected 3, found %', v_role_assignments;
  END IF;
END $$;

