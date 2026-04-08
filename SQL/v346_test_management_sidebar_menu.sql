-- ============================================================================
-- Testing & QA Sidebar Menu Entries
-- Version: v346
-- Description: Inserts sidebar menu items for the Testing & QA module
--              (public.menu_items + role_menu_items)
-- Date: 2026-03-27
-- ============================================================================
--
-- Aligns with public.menu_items schema (v05_configuration_menu_tables.sql):
--   menu_code, menu_label, menu_description, parent_menu_id, menu_level,
--   sort_order, route_path, menu_icon, is_visible, is_active
--
-- ============================================================================

DO $$
DECLARE
  v_parent_id UUID;
  v_role_id   UUID;
  v_menu_id   UUID;
BEGIN
  -- Parent: Testing & QA
  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description,
    parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES (
    'testing_qa_section',
    'Testing & QA',
    'Test suites, cases, runs, imports, and defect tracking',
    NULL,
    0,
    85,
    NULL,
    'test-tube',
    true,
    true
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label       = EXCLUDED.menu_label,
    menu_description = EXCLUDED.menu_description,
    sort_order       = EXCLUDED.sort_order,
    menu_icon        = EXCLUDED.menu_icon,
    is_visible       = true,
    is_active        = true,
    updated_at       = NOW();

  SELECT id INTO v_parent_id
  FROM public.menu_items
  WHERE menu_code = 'testing_qa_section'
  LIMIT 1;

  IF v_parent_id IS NULL THEN
    RAISE EXCEPTION 'v346: Parent menu testing_qa_section not found after insert.';
  END IF;

  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description,
    parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES
    (
      'testing_qa_dashboard',
      'Dashboard',
      'Testing overview',
      v_parent_id, 1, 1,
      '/platform/testing',
      'layout-dashboard',
      true, true
    ),
    (
      'testing_qa_suites',
      'Test Suites',
      'Manage test suites',
      v_parent_id, 1, 2,
      '/platform/testing/suites',
      'folder-open',
      true, true
    ),
    (
      'testing_qa_cases',
      'Test Cases',
      'Manage test cases',
      v_parent_id, 1, 3,
      '/platform/testing/cases',
      'clipboard-list',
      true, true
    ),
    (
      'testing_qa_runs',
      'Test Runs',
      'Execute and track test runs',
      v_parent_id, 1, 4,
      '/platform/testing/runs',
      'play-circle',
      true, true
    ),
    (
      'testing_qa_bulk_import',
      'Bulk Import',
      'Import tests in bulk',
      v_parent_id, 1, 5,
      '/platform/testing/import',
      'upload',
      true, true
    ),
    (
      'testing_qa_defects',
      'Defects',
      'Defect register',
      v_parent_id, 1, 6,
      '/platform/testing/defects',
      'bug',
      true, true
    ),
    (
      'testing_qa_defect_reports',
      'Defect Reports',
      'Defect dashboards and reports',
      v_parent_id, 1, 7,
      '/platform/testing/defects/dashboard',
      'bar-chart-2',
      true, true
    )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label       = EXCLUDED.menu_label,
    menu_description = EXCLUDED.menu_description,
    parent_menu_id   = EXCLUDED.parent_menu_id,
    route_path       = EXCLUDED.route_path,
    sort_order       = EXCLUDED.sort_order,
    menu_icon        = EXCLUDED.menu_icon,
    is_visible       = true,
    is_active        = true,
    updated_at       = NOW();

  RAISE NOTICE 'v346: Testing & QA menu items upserted (parent_id: %)', v_parent_id;

  -- Viewer and above: grant parent + all children to every non-deleted role
  FOR v_role_id IN
    SELECT r.id
    FROM public.roles r
    WHERE (r.is_deleted = false OR r.is_deleted IS NULL)
  LOOP
    FOR v_menu_id IN
      SELECT m.id
      FROM public.menu_items m
      WHERE m.menu_code IN (
        'testing_qa_section',
        'testing_qa_dashboard',
        'testing_qa_suites',
        'testing_qa_cases',
        'testing_qa_runs',
        'testing_qa_bulk_import',
        'testing_qa_defects',
        'testing_qa_defect_reports'
      )
    LOOP
      INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
      VALUES (v_role_id, v_menu_id, true, true, true, false)
      ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
        can_view   = true,
        can_use    = true,
        is_active  = true,
        is_deleted = false,
        updated_at = NOW();
    END LOOP;
  END LOOP;

  RAISE NOTICE 'v346: Testing & QA menu granted to all active roles.';
END $$;
