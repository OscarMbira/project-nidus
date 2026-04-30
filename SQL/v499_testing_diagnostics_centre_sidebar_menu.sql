-- ============================================================================
-- v499 — Testing & Diagnostics Centre — sidebar (public.menu_items + role_menu_items)
-- ============================================================================
-- Superseded for most deployments: run v500_merge_platform_testing_sidebar.sql
-- to merge v346 "Testing & QA" and this block into a single
-- "Testing and QA" section
-- and remove duplicate menu rows. v500 soft-deletes this block (menu_code
-- testing_diagnostics_*) if v499 was already applied.
--
-- (Historical) Adds a dedicated top-level group separate from v346. Uses
-- /platform/testing-centre/*.
-- ============================================================================

DO $$
DECLARE
  v_parent_id UUID;
  v_role_id   UUID;
  v_menu_id   UUID;
BEGIN
  -- Parent: Testing & Diagnostics (flask / lab feel → activity icon in Sidebar iconMap)
  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description,
    parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES (
    'testing_diagnostics_section',
    'Testing & Diagnostics',
    'PMIS Testing & Diagnostics Centre: cases, suites, runs, scripts, evidence, diagnostics, data',
    NULL,
    0,
    86,
    NULL,
    'activity',
    TRUE,
    TRUE
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label       = EXCLUDED.menu_label,
    menu_description = EXCLUDED.menu_description,
    sort_order       = EXCLUDED.sort_order,
    menu_icon        = EXCLUDED.menu_icon,
    is_visible       = TRUE,
    is_active        = TRUE,
    updated_at       = NOW();

  SELECT id INTO v_parent_id
  FROM public.menu_items
  WHERE menu_code = 'testing_diagnostics_section'
  LIMIT 1;

  IF v_parent_id IS NULL THEN
    RAISE EXCEPTION 'v499: Parent menu testing_diagnostics_section not found after insert.';
  END IF;

  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description,
    parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES
    (
      'testing_diagnostics_dashboard',
      'Testing Dashboard',
      'Coverage and run metrics',
      v_parent_id, 1, 1,
      '/platform/testing-centre',
      'layout-dashboard',
      TRUE, TRUE
    ),
    (
      'testing_diagnostics_cases',
      'Test Case Library',
      'Browse and manage test cases',
      v_parent_id, 1, 2,
      '/platform/testing-centre/cases',
      'library',
      TRUE, TRUE
    ),
    (
      'testing_diagnostics_drafts',
      'Test Case Drafts',
      'In-progress and draft test cases',
      v_parent_id, 1, 3,
      '/platform/testing-centre/cases/drafts',
      'pause-circle',
      TRUE, TRUE
    ),
    (
      'testing_diagnostics_suites',
      'Test Suites',
      'Suite definitions and membership',
      v_parent_id, 1, 4,
      '/platform/testing-centre/suites',
      'layers',
      TRUE, TRUE
    ),
    (
      'testing_diagnostics_runs',
      'Test Runs',
      'Execution plans and run history',
      v_parent_id, 1, 5,
      '/platform/testing-centre/runs',
      'list',
      TRUE, TRUE
    ),
    (
      'testing_diagnostics_scripts',
      'Automated Scripts',
      'Script registry and allowlists',
      v_parent_id, 1, 6,
      '/platform/testing-centre/scripts',
      'wrench',
      TRUE, TRUE
    ),
    (
      'testing_diagnostics_evidence',
      'Screenshot Evidence',
      'Captured screenshots and baselines',
      v_parent_id, 1, 7,
      '/platform/testing-centre/evidence',
      'clipboard-check',
      TRUE, TRUE
    ),
    (
      'testing_diagnostics_diagnostics',
      'Diagnostic Centre',
      'Sessions and product diagnostics',
      v_parent_id, 1, 8,
      '/platform/testing-centre/diagnostics',
      'network',
      TRUE, TRUE
    ),
    (
      'testing_diagnostics_defects',
      'Defect & Issue Links',
      'Testing-related defects and links',
      v_parent_id, 1, 9,
      '/platform/testing-centre/defects',
      'alert-circle',
      TRUE, TRUE
    ),
    (
      'testing_diagnostics_data',
      'Test Data Manager',
      'Data sets and personas',
      v_parent_id, 1, 10,
      '/platform/testing-centre/data',
      'package',
      TRUE, TRUE
    ),
    (
      'testing_diagnostics_reports',
      'Reports',
      'Testing reports',
      v_parent_id, 1, 11,
      '/platform/testing-centre/reports',
      'file-bar-chart',
      TRUE, TRUE
    ),
    (
      'testing_diagnostics_settings',
      'Settings',
      'Centre settings and options',
      v_parent_id, 1, 12,
      '/platform/testing-centre/settings',
      'sliders-horizontal',
      TRUE, TRUE
    )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label       = EXCLUDED.menu_label,
    menu_description = EXCLUDED.menu_description,
    parent_menu_id   = EXCLUDED.parent_menu_id,
    route_path       = EXCLUDED.route_path,
    sort_order       = EXCLUDED.sort_order,
    menu_icon        = EXCLUDED.menu_icon,
    is_visible       = TRUE,
    is_active        = TRUE,
    updated_at       = NOW();

  RAISE NOTICE 'v499: Testing & Diagnostics menu items upserted (parent_id: %)', v_parent_id;

  FOR v_role_id IN
    SELECT r.id
    FROM public.roles r
    WHERE (r.is_deleted = FALSE OR r.is_deleted IS NULL)
  LOOP
    FOR v_menu_id IN
      SELECT m.id
      FROM public.menu_items m
      WHERE m.menu_code IN (
        'testing_diagnostics_section',
        'testing_diagnostics_dashboard',
        'testing_diagnostics_cases',
        'testing_diagnostics_drafts',
        'testing_diagnostics_suites',
        'testing_diagnostics_runs',
        'testing_diagnostics_scripts',
        'testing_diagnostics_evidence',
        'testing_diagnostics_diagnostics',
        'testing_diagnostics_defects',
        'testing_diagnostics_data',
        'testing_diagnostics_reports',
        'testing_diagnostics_settings'
      )
    LOOP
      INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
      VALUES (v_role_id, v_menu_id, TRUE, TRUE, TRUE, FALSE)
      ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
        can_view   = TRUE,
        can_use    = TRUE,
        is_active  = TRUE,
        is_deleted = FALSE,
        updated_at = NOW();
    END LOOP;
  END LOOP;

  RAISE NOTICE 'v499: Testing & Diagnostics menu granted to all non-deleted roles.';
END $$;
