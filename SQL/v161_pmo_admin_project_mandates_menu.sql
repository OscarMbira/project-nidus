-- ============================================================================
-- PMO Admin: Project Mandates Menu Items
-- Version: v161
-- Description: Adds a collapsible "Project Mandates" section with menu items
--              under the PMO Admin section
-- ============================================================================

-- Prerequisites:
-- - v130_org_admin_menu_items.sql must be run first (PMO Admin section must exist)
-- - v160_project_mandate_tables.sql (Project Mandate tables must exist)

-- Purpose:
-- Creates a parent "Project Mandates" section with child menu items:
--   1. Create Mandate
--   2. All Mandates
--   3. Unlinked Mandates
--   4. Pending Approvals
-- Assigns them to the pmo_admin role

-- Note: This script is idempotent and can be run multiple times safely

-- ============================================================================
-- SECTION 1: CREATE PARENT "PROJECT MANDATES" SECTION
-- ============================================================================

DO $$
DECLARE
  v_pmo_admin_id UUID;
  v_mandates_section_id UUID;
  v_sort_order INTEGER;
BEGIN
  -- Get the PMO Admin parent menu ID
  SELECT id INTO v_pmo_admin_id
  FROM menu_items
  WHERE menu_code = 'pmo_admin_section'
    AND is_deleted = FALSE
  LIMIT 1;

  IF v_pmo_admin_id IS NULL THEN
    RAISE EXCEPTION 'PMO Admin parent menu (pmo_admin_section) not found. Please run v130_org_admin_menu_items.sql first.';
  END IF;

  -- Get the next sort order (after existing items)
  SELECT COALESCE(MAX(sort_order), 0) + 1 INTO v_sort_order
  FROM menu_items
  WHERE parent_menu_id = v_pmo_admin_id
    AND is_deleted = FALSE;

  -- Create parent "Project Mandates" section (collapsible, no route)
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
    'pmo_admin_mandates_section',
    'Project Mandates',
    'Project mandate management and creation',
    v_pmo_admin_id,
    2,
    v_sort_order,
    NULL,  -- Parent section has no route, it's just collapsible
    'file-text',
    true,
    true
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    menu_description = EXCLUDED.menu_description,
    menu_icon = EXCLUDED.menu_icon,
    parent_menu_id = EXCLUDED.parent_menu_id,
    menu_level = EXCLUDED.menu_level,
    sort_order = EXCLUDED.sort_order,
    is_active = true,
    is_deleted = false,
    updated_at = NOW();

  -- Get the Project Mandates section ID
  SELECT id INTO v_mandates_section_id
  FROM menu_items
  WHERE menu_code = 'pmo_admin_mandates_section'
    AND is_deleted = FALSE
  LIMIT 1;

  -- Insert Create Mandate menu item (child of Project Mandates section)
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
    'pmo_admin_mandates_create',
    'Create Mandate',
    'Create a new project mandate',
    v_mandates_section_id,
    3,
    1,
    '/platform/mandates/create',
    'file-text',
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

  -- Insert All Mandates menu item
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
    'pmo_admin_mandates_all',
    'All Mandates',
    'View all project mandates',
    v_mandates_section_id,
    3,
    2,
    '/platform/mandates/list',
    'file-text',
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

  -- Insert Unlinked Mandates menu item
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
    'pmo_admin_mandates_unlinked',
    'Unlinked Mandates',
    'View approved mandates ready for project creation',
    v_mandates_section_id,
    3,
    3,
    '/platform/mandates/unlinked',
    'file-text',
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

  -- Insert Pending Approvals menu item
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
    'pmo_admin_mandates_pending_approvals',
    'Pending Approvals',
    'Review and approve pending mandates',
    v_mandates_section_id,
    3,
    4,
    '/platform/mandates/approvals',
    'file-check',
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

  RAISE NOTICE 'Project Mandates section and menu items created/updated';
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
  AND m.menu_code IN (
    'pmo_admin_mandates_section',  -- Parent section
    'pmo_admin_mandates_create',
    'pmo_admin_mandates_all',
    'pmo_admin_mandates_unlinked',
    'pmo_admin_mandates_pending_approvals'
  )
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
  -- Count menu items created (parent + 4 children)
  SELECT COUNT(*) INTO v_menu_count
  FROM menu_items
  WHERE menu_code IN (
    'pmo_admin_mandates_section',
    'pmo_admin_mandates_create',
    'pmo_admin_mandates_all',
    'pmo_admin_mandates_unlinked',
    'pmo_admin_mandates_pending_approvals'
  )
    AND is_deleted = FALSE
    AND is_active = TRUE;

  -- Count role assignments
  SELECT COUNT(*) INTO v_role_count
  FROM role_menu_items rmi
  INNER JOIN roles r ON r.id = rmi.role_id
  INNER JOIN menu_items m ON m.id = rmi.menu_item_id
  WHERE r.role_name = 'pmo_admin'
    AND m.menu_code IN (
      'pmo_admin_mandates_section',
      'pmo_admin_mandates_create',
      'pmo_admin_mandates_all',
      'pmo_admin_mandates_unlinked',
      'pmo_admin_mandates_pending_approvals'
    )
    AND rmi.is_deleted = FALSE
    AND rmi.is_active = TRUE
    AND m.is_deleted = FALSE
    AND m.is_active = TRUE;

  RAISE NOTICE '================================================';
  RAISE NOTICE 'PMO Admin Project Mandates Section Added';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Menu items created: % (1 parent + 4 children)', v_menu_count;
  RAISE NOTICE 'Role assignments: %', v_role_count;
  RAISE NOTICE 'Expected: 5 menu items (1 section + 4 children), 5 role assignments';
  RAISE NOTICE '================================================';
END $$;
