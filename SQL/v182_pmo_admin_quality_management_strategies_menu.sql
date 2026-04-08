-- ============================================================================
-- PMO Admin: Quality Management Strategies Menu Items
-- Version: v182
-- Description: Adds a collapsible "Quality Management Strategies" section with menu items
--              under the PMO Admin section
-- ============================================================================

-- Prerequisites:
-- - v130_org_admin_menu_items.sql must be run first (PMO Admin section must exist)
-- - v180_quality_management_strategy_tables.sql (QMS tables must exist)

-- Purpose:
-- Creates a parent "Quality Management Strategies" section with child menu items:
--   1. All QMS (view all quality management strategies)
-- Assigns them to the pmo_admin role

-- Note: This script is idempotent and can be run multiple times safely

-- ============================================================================
-- SECTION 1: CREATE PARENT "QUALITY MANAGEMENT STRATEGIES" SECTION
-- ============================================================================

DO $$
DECLARE
  v_pmo_admin_id UUID;
  v_qms_section_id UUID;
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

  -- Create parent "Quality Management Strategies" section (collapsible, no route)
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
    'pmo_admin_qms_section',
    'Quality Management Strategies',
    'Quality Management Strategy management and oversight',
    v_pmo_admin_id,
    2,
    v_sort_order,
    NULL,  -- Parent section has no route, it's just collapsible
    'shield-check',
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

  -- Get the Quality Management Strategies section ID
  SELECT id INTO v_qms_section_id
  FROM menu_items
  WHERE menu_code = 'pmo_admin_qms_section'
    AND is_deleted = FALSE
  LIMIT 1;

  -- Insert All QMS menu item (child of Quality Management Strategies section)
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
    'pmo_admin_qms_all',
    'All Quality Strategies',
    'View all quality management strategies across all projects',
    v_qms_section_id,
    3,
    1,
    '/app/qms/list',
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

  RAISE NOTICE 'Quality Management Strategies section and menu items created/updated';
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
  AND m.menu_code IN ('pmo_admin_qms_section', 'pmo_admin_qms_all')
  AND m.is_deleted = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE
SET can_view = true,
    can_use = true,
    is_active = true,
    updated_at = NOW();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_section_count INTEGER;
  v_list_count INTEGER;
  v_role_assignment_count INTEGER;
BEGIN
  -- Count created menu items
  SELECT COUNT(*) INTO v_section_count
  FROM menu_items
  WHERE menu_code = 'pmo_admin_qms_section'
    AND is_deleted = FALSE;

  SELECT COUNT(*) INTO v_list_count
  FROM menu_items
  WHERE menu_code = 'pmo_admin_qms_all'
    AND is_deleted = FALSE;

  -- Count role assignments
  SELECT COUNT(*) INTO v_role_assignment_count
  FROM role_menu_items rmi
  JOIN menu_items mi ON rmi.menu_item_id = mi.id
  WHERE mi.menu_code IN ('pmo_admin_qms_section', 'pmo_admin_qms_all')
    AND rmi.is_active = true
    AND rmi.is_deleted = false;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'QMS Menu Integration Summary:';
  RAISE NOTICE '  - QMS Section menu item: %', v_section_count;
  RAISE NOTICE '  - All QMS menu item: %', v_list_count;
  RAISE NOTICE '  - Role assignments: %', v_role_assignment_count;
  RAISE NOTICE '========================================';

  IF v_section_count = 1 AND v_list_count = 1 AND v_role_assignment_count >= 2 THEN
    RAISE NOTICE 'SUCCESS: All QMS menu items created and assigned successfully.';
  ELSE
    RAISE WARNING 'WARNING: Some menu items may not have been created or assigned correctly.';
  END IF;
END $$;
