-- ============================================================================
-- PMO Admin: Project Types and Project Statuses Menu Items
-- Version: v153
-- Description: Adds menu items for Project Types and Project Statuses management
--              under the PMO Admin section
-- ============================================================================

-- Prerequisites:
-- - v130_org_admin_menu_items.sql must be run first (PMO Admin section must exist)
-- - v133_verify_and_reapply_org_admin_menus.sql (PMO Admin section must exist)

-- Purpose:
-- Creates menu items for:
--   1. Project Types management
--   2. Project Statuses management
-- Assigns them to the pmo_admin role

-- Note: This script is idempotent and can be run multiple times safely

-- ============================================================================
-- SECTION 1: CREATE MENU ITEMS
-- ============================================================================

DO $$
DECLARE
  v_parent_id UUID;
  v_sort_order INTEGER;
BEGIN
  -- Get the PMO Admin parent menu ID
  SELECT id INTO v_parent_id
  FROM menu_items
  WHERE menu_code = 'pmo_admin_section'
    AND is_deleted = FALSE
  LIMIT 1;

  IF v_parent_id IS NULL THEN
    RAISE EXCEPTION 'PMO Admin parent menu (pmo_admin_section) not found. Please run v130_org_admin_menu_items.sql first.';
  END IF;

  -- Get the next sort order (after existing items)
  SELECT COALESCE(MAX(sort_order), 0) + 1 INTO v_sort_order
  FROM menu_items
  WHERE parent_menu_id = v_parent_id
    AND is_deleted = FALSE;

  -- Insert Project Types menu item
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
    'pmo_admin_project_types',
    'Project Types',
    'Manage project type definitions',
    v_parent_id,
    2,
    v_sort_order,
    '/platform/pmo-admin/project-types',
    'folder-kanban',
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

  -- Insert Project Statuses menu item
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
    'pmo_admin_project_statuses',
    'Project Statuses',
    'Manage project status definitions (Initial Status)',
    v_parent_id,
    2,
    v_sort_order + 1,
    '/platform/pmo-admin/project-statuses',
    'list-checks',
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

  RAISE NOTICE 'Project Types and Project Statuses menu items created/updated';
END $$;


-- ============================================================================
-- SECTION 2: ASSIGN MENU ITEMS TO PMO ADMIN ROLE
-- ============================================================================

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
  AND m.menu_code IN ('pmo_admin_project_types', 'pmo_admin_project_statuses')
  AND m.is_deleted = FALSE
  AND m.is_active = TRUE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = true,
  can_use = true,
  is_active = true,
  is_deleted = false,
  updated_at = NOW();

-- ============================================================================
-- SECTION 3: VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_menu_count INTEGER;
  v_role_count INTEGER;
BEGIN
  -- Count menu items created
  SELECT COUNT(*) INTO v_menu_count
  FROM menu_items
  WHERE menu_code IN ('pmo_admin_project_types', 'pmo_admin_project_statuses')
    AND is_deleted = FALSE
    AND is_active = TRUE;

  -- Count role assignments
  SELECT COUNT(*) INTO v_role_count
  FROM role_menu_items rmi
  INNER JOIN roles r ON r.id = rmi.role_id
  INNER JOIN menu_items m ON m.id = rmi.menu_item_id
  WHERE r.role_name = 'pmo_admin'
    AND m.menu_code IN ('pmo_admin_project_types', 'pmo_admin_project_statuses')
    AND rmi.is_deleted = FALSE
    AND rmi.is_active = TRUE
    AND m.is_deleted = FALSE
    AND m.is_active = TRUE;

  RAISE NOTICE '================================================';
  RAISE NOTICE 'PMO Admin Menu Items Added';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Menu items created: %', v_menu_count;
  RAISE NOTICE 'Role assignments: %', v_role_count;
  RAISE NOTICE '================================================';
END $$;
