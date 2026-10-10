-- =============================================================================
-- v1204: 10 more sample Test Evidence records for SEED334-PRJ-08 ONLY
-- Adds a second test run with 7 executions (5 passed, 2 failed) and 10 evidence
-- files in total, on top of the 3 seeded by v1203. Varies file type (png, pdf,
-- log, csv) to show evidence is not limited to screenshots (PRD v1204 story 2).
-- Prerequisites: v1203 (project, suite, 2 of the test cases, defects table ready)
-- Idempotent: fixed hex-only UUIDs + ON CONFLICT (id) DO NOTHING. Safe to re-run.
--
-- Same storage limitation as v1203: this inserts database rows only, so "open
-- file" on a seeded row will not resolve to a real object in the
-- 'testing-centre-evidence' bucket.
-- =============================================================================

DO $$
DECLARE
  v_project_id   UUID;
  v_project_code TEXT := 'SEED334-PRJ-08';
  v_user_id      UUID;
  v_auth_uid     UUID;

  v_suite      UUID := 'a1203001-7501-4a01-9c01-534433340801'; -- from v1203
  v_case_pass1 UUID := 'a1203002-7c01-4a01-9c01-534433340801'; -- from v1203, reused in run2
  v_case_pass2 UUID := 'a1203002-7c01-4a01-9c01-534433340802'; -- from v1203, reused in run2

  v_case4 UUID := 'b1204002-7c01-4a01-9c01-534433340804';
  v_case5 UUID := 'b1204002-7c01-4a01-9c01-534433340805';
  v_case6 UUID := 'b1204002-7c01-4a01-9c01-534433340806';
  v_case7 UUID := 'b1204002-7c01-4a01-9c01-534433340807';
  v_case8 UUID := 'b1204002-7c01-4a01-9c01-534433340808';

  v_run2 UUID := 'b1204003-7201-4a01-9c01-534433340802';

  v_defect2 UUID := 'b1204005-df01-4a01-9c01-534433340802';
  v_defect3 UUID := 'b1204005-df01-4a01-9c01-534433340803';

  v_exec1 UUID := 'b1204004-7e01-4a01-9c01-534433340804'; -- case4, passed
  v_exec2 UUID := 'b1204004-7e01-4a01-9c01-534433340805'; -- case5, passed
  v_exec3 UUID := 'b1204004-7e01-4a01-9c01-534433340806'; -- case6, passed
  v_exec4 UUID := 'b1204004-7e01-4a01-9c01-534433340807'; -- case7, failed
  v_exec5 UUID := 'b1204004-7e01-4a01-9c01-534433340808'; -- case8, passed
  v_exec6 UUID := 'b1204004-7e01-4a01-9c01-534433340809'; -- case_pass1 (run2), passed
  v_exec7 UUID := 'b1204004-7e01-4a01-9c01-534433340810'; -- case_pass2 (run2), failed

  v_ev1  UUID := 'b1204006-ed01-4a01-9c01-534433340804';
  v_ev2  UUID := 'b1204006-ed01-4a01-9c01-534433340805';
  v_ev3  UUID := 'b1204006-ed01-4a01-9c01-534433340806';
  v_ev4  UUID := 'b1204006-ed01-4a01-9c01-534433340807';
  v_ev5  UUID := 'b1204006-ed01-4a01-9c01-534433340808';
  v_ev6  UUID := 'b1204006-ed01-4a01-9c01-534433340809';
  v_ev7  UUID := 'b1204006-ed01-4a01-9c01-534433340810';
  v_ev8  UUID := 'b1204006-ed01-4a01-9c01-534433340811';
  v_ev9  UUID := 'b1204006-ed01-4a01-9c01-534433340812';
  v_ev10 UUID := 'b1204006-ed01-4a01-9c01-534433340813';
BEGIN

  SELECT id INTO v_project_id
  FROM public.projects
  WHERE project_code = v_project_code
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'v1204: project % not found — run v334 first', v_project_code;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.test_cases WHERE id = v_case_pass1) THEN
    RAISE EXCEPTION 'v1204: v1203 has not been run yet (test case % missing) — run v1203 first', v_case_pass1;
  END IF;

  SELECT owner_user_id INTO v_user_id FROM public.projects WHERE id = v_project_id;
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id FROM public.users WHERE COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
  END IF;
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'v1204: No user available to attribute seed rows. Skipping.';
    RETURN;
  END IF;

  SELECT auth_user_id INTO v_auth_uid FROM public.users WHERE id = v_user_id LIMIT 1;
  IF v_auth_uid IS NOT NULL THEN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_auth_uid::text)::text, true);
  END IF;

  -- ---------------------------------------------------------------------------
  -- 5 MORE TEST CASES (on the existing v1203 suite)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.test_cases (
    id, project_id, suite_id, title, description, preconditions,
    test_type, priority, status, expected_result, environment,
    is_deleted, created_at, created_by
  ) VALUES
    (v_case4, v_project_id, v_suite, 'Search returns relevant results for a partial query',
     'Verify search returns relevant matches when only part of a term is entered.',
     'Catalogue contains searchable items.', 'manual', 'medium', 'active',
     'Top results include items matching the partial term.', 'UAT',
     false, NOW() - INTERVAL '1 day', v_user_id),

    (v_case5, v_project_id, v_suite, 'Invoice PDF generates with correct line items',
     'Verify a generated invoice PDF lists every line item with the correct amount.',
     'Order has at least 2 line items.', 'manual', 'high', 'active',
     'PDF line items and totals match the order exactly.', 'UAT',
     false, NOW() - INTERVAL '1 day', v_user_id),

    (v_case6, v_project_id, v_suite, 'Password reset email is sent within SLA',
     'Verify a password reset email arrives within the 2-minute SLA.',
     'User account exists and is active.', 'manual', 'medium', 'active',
     'Reset email arrives within 2 minutes of the request.', 'UAT',
     false, NOW() - INTERVAL '1 day', v_user_id),

    (v_case7, v_project_id, v_suite, 'Bulk CSV import rejects malformed rows with a clear error',
     'Verify malformed rows in a bulk CSV import are rejected with a readable error, not a silent failure.',
     'A CSV file with at least one malformed row is prepared.', 'manual', 'high', 'active',
     'Malformed rows are listed with a row number and reason; valid rows still import.', 'UAT',
     false, NOW() - INTERVAL '1 day', v_user_id),

    (v_case8, v_project_id, v_suite, 'Dashboard widgets load within 3 seconds',
     'Verify all dashboard widgets finish loading within 3 seconds on a standard connection.',
     'User has at least one project with data.', 'manual', 'low', 'active',
     'All widgets render within 3 seconds.', 'UAT',
     false, NOW() - INTERVAL '1 day', v_user_id)
  ON CONFLICT (id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- SECOND TEST RUN
  -- ---------------------------------------------------------------------------
  INSERT INTO public.test_runs (
    id, project_id, suite_id, run_name, description, environment, run_date,
    build_version, status, started_at, completed_at, run_by, summary,
    is_deleted, created_at, created_by
  ) VALUES
    (v_run2, v_project_id, v_suite, 'Sprint 8 Regression — Search, Invoicing & Import',
     'Regression pass covering search, invoicing, password reset, bulk import and dashboard performance.',
     'uat', CURRENT_DATE - 1, '2.5.0', 'completed',
     NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '2 hours', v_user_id,
     '{"total":7,"passed":5,"failed":2,"blocked":0,"skipped":0,"pending":0}'::jsonb,
     false, NOW() - INTERVAL '1 day', v_user_id)
  ON CONFLICT (id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- DEFECTS (for the 2 failed executions in this run)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.defects (
    id, project_id, test_case_id, title, description,
    severity, priority, defect_type, status, environment,
    steps_to_reproduce, expected_behavior, actual_behavior,
    reported_by, cursor_prompt_generated,
    is_deleted, created_at, created_by
  ) VALUES
    (v_defect2, v_project_id, v_case7,
     'Bulk CSV import silently skips malformed rows',
     'Malformed rows in a bulk CSV import are dropped without any error shown to the user.',
     'medium', 'high', 'functional', 'open', 'UAT',
     '1. Prepare a CSV with one malformed row. 2. Import it. 3. Check the result.',
     'Malformed rows are listed with a row number and reason.',
     'Malformed rows are silently skipped; no error or row count mismatch is shown.',
     v_user_id, false,
     false, NOW() - INTERVAL '1 day', v_user_id),

    (v_defect3, v_project_id, v_case_pass2,
     'Login succeeds but session expires after 1 minute',
     'A second login attempt during this run showed the session expiring far earlier than the configured timeout.',
     'medium', 'medium', 'functional', 'open', 'UAT',
     '1. Log in. 2. Wait 1 minute without activity. 3. Navigate to another page.',
     'Session remains active for the configured timeout (30 minutes).',
     'Session expires and the user is signed out after about 1 minute.',
     v_user_id, false,
     false, NOW() - INTERVAL '1 day', v_user_id)
  ON CONFLICT (id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- 7 EXECUTIONS (5 passed, 2 failed)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.test_case_executions (
    id, run_id, test_case_id, project_id, status, actual_result, notes,
    executed_by, executed_at, duration_minutes, environment, browser_os,
    defect_id, created_at, created_by
  ) VALUES
    (v_exec1, v_run2, v_case4, v_project_id, 'passed',
     'Partial query returned relevant results.', 'Verified successfully, no issues.',
     v_user_id, NOW() - INTERVAL '1 day' + INTERVAL '10 minutes', 6, 'UAT', 'Chrome 128 / Windows 11',
     NULL, NOW() - INTERVAL '1 day' + INTERVAL '10 minutes', v_user_id),

    (v_exec2, v_run2, v_case5, v_project_id, 'passed',
     'Invoice PDF line items matched the order exactly.', 'Verified successfully, no issues.',
     v_user_id, NOW() - INTERVAL '1 day' + INTERVAL '25 minutes', 7, 'UAT', 'Chrome 128 / Windows 11',
     NULL, NOW() - INTERVAL '1 day' + INTERVAL '25 minutes', v_user_id),

    (v_exec3, v_run2, v_case6, v_project_id, 'passed',
     'Reset email arrived in 40 seconds.', 'Verified successfully, no issues.',
     v_user_id, NOW() - INTERVAL '1 day' + INTERVAL '38 minutes', 4, 'UAT', 'Chrome 128 / Windows 11',
     NULL, NOW() - INTERVAL '1 day' + INTERVAL '38 minutes', v_user_id),

    (v_exec4, v_run2, v_case7, v_project_id, 'failed',
     'Malformed rows were skipped with no error shown.', 'Reproduced on 2 different malformed CSVs.',
     v_user_id, NOW() - INTERVAL '1 day' + INTERVAL '55 minutes', 14, 'UAT', 'Chrome 128 / Windows 11',
     v_defect2, NOW() - INTERVAL '1 day' + INTERVAL '55 minutes', v_user_id),

    (v_exec5, v_run2, v_case8, v_project_id, 'passed',
     'All widgets rendered in under 2 seconds.', 'Verified successfully, no issues.',
     v_user_id, NOW() - INTERVAL '1 day' + INTERVAL '70 minutes', 5, 'UAT', 'Chrome 128 / Windows 11',
     NULL, NOW() - INTERVAL '1 day' + INTERVAL '70 minutes', v_user_id),

    (v_exec6, v_run2, v_case_pass1, v_project_id, 'passed',
     'User reached the dashboard after login.', 'Re-verified in this run, no issues.',
     v_user_id, NOW() - INTERVAL '1 day' + INTERVAL '85 minutes', 5, 'UAT', 'Chrome 128 / Windows 11',
     NULL, NOW() - INTERVAL '1 day' + INTERVAL '85 minutes', v_user_id),

    (v_exec7, v_run2, v_case_pass2, v_project_id, 'failed',
     'Session expired after about 1 minute of inactivity.', 'Reproduced on 2 consecutive attempts.',
     v_user_id, NOW() - INTERVAL '1 day' + INTERVAL '100 minutes', 9, 'UAT', 'Chrome 128 / Windows 11',
     v_defect3, NOW() - INTERVAL '1 day' + INTERVAL '100 minutes', v_user_id)
  ON CONFLICT (id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- 10 EVIDENCE FILES (mixed types: png, pdf, log, csv)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.test_case_execution_evidence (
    id, test_case_execution_id, run_id, project_id,
    storage_bucket, storage_path, file_name, mime_type, file_size,
    uploaded_by, created_at
  ) VALUES
    (v_ev1, v_exec1, v_run2, v_project_id,
     'testing-centre-evidence', 'executions/' || v_exec1 || '/seed-search-results-screenshot.png',
     'search-results-screenshot.png', 'image/png', 176128,
     v_user_id, NOW() - INTERVAL '1 day' + INTERVAL '10 minutes'),

    (v_ev2, v_exec1, v_run2, v_project_id,
     'testing-centre-evidence', 'executions/' || v_exec1 || '/seed-search-query-log.log',
     'search-query-log.log', 'text/plain', 8192,
     v_user_id, NOW() - INTERVAL '1 day' + INTERVAL '11 minutes'),

    (v_ev3, v_exec2, v_run2, v_project_id,
     'testing-centre-evidence', 'executions/' || v_exec2 || '/seed-generated-invoice.pdf',
     'generated-invoice.pdf', 'application/pdf', 102400,
     v_user_id, NOW() - INTERVAL '1 day' + INTERVAL '25 minutes'),

    (v_ev4, v_exec3, v_run2, v_project_id,
     'testing-centre-evidence', 'executions/' || v_exec3 || '/seed-reset-email-screenshot.png',
     'reset-email-screenshot.png', 'image/png', 143360,
     v_user_id, NOW() - INTERVAL '1 day' + INTERVAL '38 minutes'),

    (v_ev5, v_exec4, v_run2, v_project_id,
     'testing-centre-evidence', 'executions/' || v_exec4 || '/seed-import-result-screenshot.png',
     'import-result-screenshot.png', 'image/png', 198656,
     v_user_id, NOW() - INTERVAL '1 day' + INTERVAL '55 minutes'),

    (v_ev6, v_exec4, v_run2, v_project_id,
     'testing-centre-evidence', 'executions/' || v_exec4 || '/seed-malformed-rows-sample.csv',
     'malformed-rows-sample.csv', 'text/csv', 4096,
     v_user_id, NOW() - INTERVAL '1 day' + INTERVAL '56 minutes'),

    (v_ev7, v_exec5, v_run2, v_project_id,
     'testing-centre-evidence', 'executions/' || v_exec5 || '/seed-dashboard-load-timing.png',
     'dashboard-load-timing.png', 'image/png', 165888,
     v_user_id, NOW() - INTERVAL '1 day' + INTERVAL '70 minutes'),

    (v_ev8, v_exec6, v_run2, v_project_id,
     'testing-centre-evidence', 'executions/' || v_exec6 || '/seed-login-success-screenshot-2.png',
     'login-success-screenshot-2.png', 'image/png', 180224,
     v_user_id, NOW() - INTERVAL '1 day' + INTERVAL '85 minutes'),

    (v_ev9, v_exec7, v_run2, v_project_id,
     'testing-centre-evidence', 'executions/' || v_exec7 || '/seed-session-expiry-screenshot.png',
     'session-expiry-screenshot.png', 'image/png', 172032,
     v_user_id, NOW() - INTERVAL '1 day' + INTERVAL '100 minutes'),

    (v_ev10, v_exec7, v_run2, v_project_id,
     'testing-centre-evidence', 'executions/' || v_exec7 || '/seed-session-timeout-console-log.log',
     'session-timeout-console-log.log', 'text/plain', 6144,
     v_user_id, NOW() - INTERVAL '1 day' + INTERVAL '101 minutes')
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'v1204: 10 more Test Evidence records seeded for % (5 cases, 1 run, 7 executions, 2 defects, 10 evidence files).', v_project_code;

END $$;

-- Verification: expect 10 evidence rows for run2 (Sprint 8 Regression).
SELECT
  tcee.file_name,
  tcee.mime_type,
  tce.status AS outcome,
  tc.title AS test_case,
  tr.run_name,
  u.full_name AS uploaded_by,
  tcee.created_at
FROM public.test_case_execution_evidence tcee
JOIN public.test_case_executions tce ON tce.id = tcee.test_case_execution_id
JOIN public.test_cases tc ON tc.id = tce.test_case_id
JOIN public.test_runs tr ON tr.id = tcee.run_id
LEFT JOIN public.users u ON u.id = tcee.uploaded_by
WHERE tcee.run_id = 'b1204003-7201-4a01-9c01-534433340802'
  AND tcee.deleted_at IS NULL
ORDER BY tcee.created_at;
