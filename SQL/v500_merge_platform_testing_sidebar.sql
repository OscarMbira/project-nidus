-- ============================================================================
-- v500 — Merge "Testing & QA" (v346) + "Testing & Diagnostics" (v499) into one
--        platform sidebar group; remove duplicate links.
-- ============================================================================
-- Result: one parent (menu_code testing_qa_section) labelled
--   "Testing and QA" with a single ordered list: PMIS Testing &
--   Diagnostics Centre routes, plus legacy Bulk import to /platform/testing/import.
-- Soft-deactivates the duplicate v499 block (testing_diagnostics_*) if present.
-- Idempotent: safe to re-run.
-- ============================================================================

DO $$
DECLARE
  v_parent_id UUID;
  v_role_id   UUID;
  v_menu_id   UUID;
BEGIN
  -- 0) Remove duplicate v499 "Testing & Diagnostics" / Testing Centre group (if applied)
  UPDATE public.menu_items
  SET
    is_deleted  = TRUE,
    is_active   = FALSE,
    is_visible  = FALSE,
    updated_at  = NOW()
  WHERE (menu_code = 'testing_diagnostics_section' OR menu_code LIKE 'testing_diagnostics\_%' ESCAPE '\')
    AND (is_deleted = FALSE OR is_deleted IS NULL);

  -- 1) Parent: single "Testing and QA" section
  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description,
    parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active, is_deleted
  ) VALUES (
    'testing_qa_section',
    'Testing and QA',
    'Test management: library, runs, bulk import, automation, evidence, diagnostics, and reports (PMIS Testing & Diagnostics Centre).',
    NULL,
    0,
    85,
    NULL,
    'activity',
    TRUE,
    TRUE,
    FALSE
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label       = EXCLUDED.menu_label,
    menu_description = EXCLUDED.menu_description,
    sort_order       = EXCLUDED.sort_order,
    menu_icon        = EXCLUDED.menu_icon,
    is_visible       = TRUE,
    is_active        = TRUE,
    is_deleted       = FALSE,
    updated_at       = NOW();

  SELECT id INTO v_parent_id
  FROM public.menu_items
  WHERE menu_code = 'testing_qa_section' AND (is_deleted = FALSE OR is_deleted IS NULL)
  LIMIT 1;

  IF v_parent_id IS NULL THEN
    RAISE EXCEPTION 'v500: Parent menu testing_qa_section not found after upsert.';
  END IF;

  -- 2) Children: one link per destination (no duplicate Dashboard / Suites / Runs / Cases)
  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description,
    parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active, is_deleted
  ) VALUES
    ( 'testing_qa_dashboard',     'Testing dashboard',        'Metrics and coverage overview',                                    v_parent_id, 1, 1,  '/platform/testing-centre',                'layout-dashboard',  TRUE, TRUE, FALSE),
    ( 'testing_qa_cases',       'Test case library',         'Browse and manage test cases',                                    v_parent_id, 1, 2,  '/platform/testing-centre/cases',         'library',            TRUE, TRUE, FALSE),
    ( 'testing_qa_drafts',      'Test case drafts',         'In-progress and draft test cases',                                 v_parent_id, 1, 3,  '/platform/testing-centre/cases/drafts',  'pause-circle',       TRUE, TRUE, FALSE),
    ( 'testing_qa_suites',      'Test suites',              'Suite definitions and membership',                                 v_parent_id, 1, 4,  '/platform/testing-centre/suites',        'layers',              TRUE, TRUE, FALSE),
    ( 'testing_qa_runs',        'Test runs',                'Execution plans and run history',                                    v_parent_id, 1, 5,  '/platform/testing-centre/runs',          'list',                TRUE, TRUE, FALSE),
    ( 'testing_qa_bulk_import', 'Bulk import',              'Import test cases in bulk (classic Testing module)',                 v_parent_id, 1, 6,  '/platform/testing/import',               'upload',              TRUE, TRUE, FALSE),
    ( 'testing_qa_automation',  'Automated scripts',        'Script registry and allowlists',                                     v_parent_id, 1, 7,  '/platform/testing-centre/scripts',        'wrench',              TRUE, TRUE, FALSE),
    ( 'testing_qa_evidence',    'Screenshot evidence',      'Captured screenshots and baselines',                                 v_parent_id, 1, 8,  '/platform/testing-centre/evidence',     'clipboard-check',     TRUE, TRUE, FALSE),
    ( 'testing_qa_diagnostics', 'Diagnostic centre',        'Diagnostics sessions and findings',                                 v_parent_id, 1, 9,  '/platform/testing-centre/diagnostics',  'network',            TRUE, TRUE, FALSE),
    ( 'testing_qa_defects',     'Defects & issue links',   'Defects linked to testing',                                          v_parent_id, 1, 10, '/platform/testing-centre/defects',       'alert-circle',        TRUE, TRUE, FALSE),
    ( 'testing_qa_defect_reports', 'Reports',              'Testing and quality reports (replaces separate defect-reports only)',  v_parent_id, 1, 11, '/platform/testing-centre/reports',      'file-bar-chart',     TRUE, TRUE, FALSE),
    ( 'testing_qa_data',        'Test data manager',        'Data sets and personas',                                          v_parent_id, 1, 12, '/platform/testing-centre/data',         'package',            TRUE, TRUE, FALSE),
    ( 'testing_qa_settings',    'Settings',                 'Testing centre settings',                                            v_parent_id, 1, 13, '/platform/testing-centre/settings',     'sliders-horizontal',  TRUE, TRUE, FALSE)
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label       = EXCLUDED.menu_label,
    menu_description = EXCLUDED.menu_description,
    parent_menu_id   = EXCLUDED.parent_menu_id,
    menu_level       = EXCLUDED.menu_level,
    sort_order       = EXCLUDED.sort_order,
    route_path       = EXCLUDED.route_path,
    menu_icon        = EXCLUDED.menu_icon,
    is_visible       = TRUE,
    is_active        = TRUE,
    is_deleted       = FALSE,
    updated_at       = NOW();

  RAISE NOTICE 'v500: Merged testing sidebar under testing_qa_section (parent_id: %)', v_parent_id;

  -- 3) Grants: all non-deleted roles — full merged set
  FOR v_role_id IN
    SELECT r.id
    FROM public.roles r
    WHERE (r.is_deleted = FALSE OR r.is_deleted IS NULL)
  LOOP
    FOR v_menu_id IN
      SELECT m.id
      FROM public.menu_items m
      WHERE m.menu_code IN (
        'testing_qa_section',
        'testing_qa_dashboard',
        'testing_qa_cases',
        'testing_qa_drafts',
        'testing_qa_suites',
        'testing_qa_runs',
        'testing_qa_bulk_import',
        'testing_qa_automation',
        'testing_qa_evidence',
        'testing_qa_diagnostics',
        'testing_qa_defects',
        'testing_qa_defect_reports',
        'testing_qa_data',
        'testing_qa_settings'
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

  RAISE NOTICE 'v500: Merged testing menu granted to all non-deleted roles.';
END $$;
