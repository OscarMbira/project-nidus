-- =============================================================================
-- v1203: Seed sample Test Evidence for SEED334-PRJ-08 ONLY
-- Purpose: Populate Testing → Evidence (v1204/v1205) with 2 passed executions that
--          carry evidence, and 1 failed execution with both evidence and a defect,
--          so the Passed / Failed / All filters all have rows to show.
-- Prerequisites:
--   v334 (SEED334 projects), v338/v339/v340 (test cases/runs/executions/defects),
--   v1201 (public.test_case_execution_evidence)
-- Idempotent: fixed hex-only UUIDs + ON CONFLICT (id) DO NOTHING. Safe to re-run.
--
-- IMPORTANT — storage limitation: this is a data-only seed run from SQL. It cannot
-- place real files in the 'testing-centre-evidence' bucket, so the storage_path
-- values below do not point at a real object. The Evidence page will list the
-- rows (file name, test case, run, outcome, uploader, date) correctly, but
-- clicking a file name to open it will fail because the file itself does not
-- exist in storage. Upload a real file through the execution screen's Attach
-- button to get a working "open file" link.
-- =============================================================================

DO $$
DECLARE
  v_project_id   UUID;
  v_project_code TEXT := 'SEED334-PRJ-08';
  v_user_id      UUID;
  v_auth_uid     UUID;

  v_suite      UUID := 'a1203001-7501-4a01-9c01-534433340801';
  v_case_pass1 UUID := 'a1203002-7c01-4a01-9c01-534433340801';
  v_case_pass2 UUID := 'a1203002-7c01-4a01-9c01-534433340802';
  v_case_fail1 UUID := 'a1203002-7c01-4a01-9c01-534433340803';
  v_run        UUID := 'a1203003-7201-4a01-9c01-534433340801';
  v_exec_pass1 UUID := 'a1203004-7e01-4a01-9c01-534433340801';
  v_exec_pass2 UUID := 'a1203004-7e01-4a01-9c01-534433340802';
  v_exec_fail1 UUID := 'a1203004-7e01-4a01-9c01-534433340803';
  v_defect1    UUID := 'a1203005-df01-4a01-9c01-534433340801';
  v_evid_pass1 UUID := 'a1203006-ed01-4a01-9c01-534433340801';
  v_evid_pass2 UUID := 'a1203006-ed01-4a01-9c01-534433340802';
  v_evid_fail1 UUID := 'a1203006-ed01-4a01-9c01-534433340803';
BEGIN

  SELECT id INTO v_project_id
  FROM public.projects
  WHERE project_code = v_project_code
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'v1203: project % not found — run v334 first', v_project_code;
  END IF;

  SELECT owner_user_id INTO v_user_id FROM public.projects WHERE id = v_project_id;
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id FROM public.users WHERE COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
  END IF;
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'v1203: No user available to attribute seed rows. Skipping.';
    RETURN;
  END IF;

  SELECT auth_user_id INTO v_auth_uid FROM public.users WHERE id = v_user_id LIMIT 1;
  IF v_auth_uid IS NOT NULL THEN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_auth_uid::text)::text, true);
  END IF;

  -- ---------------------------------------------------------------------------
  -- TEST SUITE
  -- ---------------------------------------------------------------------------
  INSERT INTO public.test_suites (
    id, project_id, name, description, suite_type, status, version, environment,
    estimated_duration_minutes, is_deleted, created_at, created_by
  ) VALUES
    (v_suite, v_project_id, 'Checkout & Login Regression Suite',
     'Core login and checkout coverage for Velocity Freight — Dynamic Route Optimization Pilot.',
     'regression', 'active', '1.0', 'UAT', 90, false, NOW() - INTERVAL '6 days', v_user_id)
  ON CONFLICT (id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- TEST CASES
  -- ---------------------------------------------------------------------------
  INSERT INTO public.test_cases (
    id, project_id, suite_id, title, description, preconditions,
    test_type, priority, status, expected_result, environment,
    is_deleted, created_at, created_by
  ) VALUES
    (v_case_pass1, v_project_id, v_suite, 'User can log in with valid credentials',
     'Verify a registered user can sign in with a valid email and password.',
     'User account exists and is active.',
     'manual', 'high', 'active', 'User reaches the dashboard after login.', 'UAT',
     false, NOW() - INTERVAL '6 days', v_user_id),

    (v_case_pass2, v_project_id, v_suite, 'Checkout confirmation email is sent',
     'Verify a confirmation email is generated after a successful checkout.',
     'Cart contains at least one item and payment details are valid.',
     'manual', 'medium', 'active', 'Confirmation email arrives within 2 minutes of checkout.', 'UAT',
     false, NOW() - INTERVAL '6 days', v_user_id),

    (v_case_fail1, v_project_id, v_suite, 'Checkout completes with a valid card',
     'Verify checkout completes successfully when a valid card is used.',
     'Cart contains at least one item.',
     'manual', 'critical', 'active', 'Order is confirmed and payment is captured.', 'UAT',
     false, NOW() - INTERVAL '6 days', v_user_id)
  ON CONFLICT (id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- TEST RUN
  -- ---------------------------------------------------------------------------
  INSERT INTO public.test_runs (
    id, project_id, suite_id, run_name, description, environment, run_date,
    build_version, status, started_at, completed_at, run_by, summary,
    is_deleted, created_at, created_by
  ) VALUES
    (v_run, v_project_id, v_suite, 'Sprint 7 Regression — Checkout & Login',
     'Regression pass ahead of the sprint 7 release.',
     'uat', CURRENT_DATE - 2, '2.4.1', 'completed',
     NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '90 minutes', v_user_id,
     '{"total":3,"passed":2,"failed":1,"blocked":0,"skipped":0,"pending":0}'::jsonb,
     false, NOW() - INTERVAL '2 days', v_user_id)
  ON CONFLICT (id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- DEFECT (for the failed execution)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.defects (
    id, project_id, test_case_id, title, description,
    severity, priority, defect_type, status, environment,
    steps_to_reproduce, expected_behavior, actual_behavior,
    reported_by, cursor_prompt_generated,
    is_deleted, created_at, created_by
  ) VALUES
    (v_defect1, v_project_id, v_case_fail1,
     'Checkout fails with a 502 on the payment gateway',
     'Checkout does not complete when paying with a valid card; the gateway returns a 502.',
     'high', 'high', 'functional', 'open', 'UAT',
     '1. Add an item to cart. 2. Enter a valid card. 3. Submit checkout.',
     'Order is confirmed and payment is captured.',
     'Checkout fails with a 502 error from the payment gateway; no order is created.',
     v_user_id, false,
     false, NOW() - INTERVAL '2 days', v_user_id)
  ON CONFLICT (id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- TEST CASE EXECUTIONS (2 passed, 1 failed)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.test_case_executions (
    id, run_id, test_case_id, project_id, status, actual_result, notes,
    executed_by, executed_at, duration_minutes, environment, browser_os,
    defect_id, created_at, created_by
  ) VALUES
    (v_exec_pass1, v_run, v_case_pass1, v_project_id, 'passed',
     'User reached the dashboard after login.', 'Verified successfully, no issues.',
     v_user_id, NOW() - INTERVAL '2 days' + INTERVAL '10 minutes', 5, 'UAT', 'Chrome 128 / Windows 11',
     NULL, NOW() - INTERVAL '2 days' + INTERVAL '10 minutes', v_user_id),

    (v_exec_pass2, v_run, v_case_pass2, v_project_id, 'passed',
     'Confirmation email arrived within 30 seconds.', 'Verified successfully, no issues.',
     v_user_id, NOW() - INTERVAL '2 days' + INTERVAL '25 minutes', 8, 'UAT', 'Chrome 128 / Windows 11',
     NULL, NOW() - INTERVAL '2 days' + INTERVAL '25 minutes', v_user_id),

    (v_exec_fail1, v_run, v_case_fail1, v_project_id, 'failed',
     'Checkout failed with a 502 from the payment gateway.', 'Reproduced on 3 consecutive attempts.',
     v_user_id, NOW() - INTERVAL '2 days' + INTERVAL '40 minutes', 12, 'UAT', 'Chrome 128 / Windows 11',
     v_defect1, NOW() - INTERVAL '2 days' + INTERVAL '40 minutes', v_user_id)
  ON CONFLICT (id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- EVIDENCE (public.test_case_execution_evidence, v1201)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.test_case_execution_evidence (
    id, test_case_execution_id, run_id, project_id,
    storage_bucket, storage_path, file_name, mime_type, file_size,
    uploaded_by, created_at
  ) VALUES
    (v_evid_pass1, v_exec_pass1, v_run, v_project_id,
     'testing-centre-evidence', 'executions/' || v_exec_pass1 || '/seed-login-success-screenshot.png',
     'login-success-screenshot.png', 'image/png', 184320,
     v_user_id, NOW() - INTERVAL '2 days' + INTERVAL '10 minutes'),

    (v_evid_pass2, v_exec_pass2, v_run, v_project_id,
     'testing-centre-evidence', 'executions/' || v_exec_pass2 || '/seed-checkout-confirmation-receipt.pdf',
     'checkout-confirmation-receipt.pdf', 'application/pdf', 92160,
     v_user_id, NOW() - INTERVAL '2 days' + INTERVAL '25 minutes'),

    (v_evid_fail1, v_exec_fail1, v_run, v_project_id,
     'testing-centre-evidence', 'executions/' || v_exec_fail1 || '/seed-checkout-payment-error-502.png',
     'checkout-payment-error-502.png', 'image/png', 210432,
     v_user_id, NOW() - INTERVAL '2 days' + INTERVAL '40 minutes')
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'v1203: Test Evidence seed complete for % (1 suite, 3 cases, 1 run, 3 executions, 1 defect, 3 evidence files).', v_project_code;

END $$;

-- Verification: expect 3 evidence rows for SEED334-PRJ-08 (2 passed, 1 failed).
SELECT
  tcee.file_name,
  tce.status AS outcome,
  tc.title AS test_case,
  tr.run_name,
  u.full_name AS uploaded_by,
  tcee.created_at
FROM public.test_case_execution_evidence tcee
JOIN public.test_case_executions tce ON tce.id = tcee.test_case_execution_id
JOIN public.test_cases tc ON tc.id = tce.test_case_id
JOIN public.test_runs tr ON tr.id = tcee.run_id
JOIN public.projects p ON p.id = tcee.project_id
LEFT JOIN public.users u ON u.id = tcee.uploaded_by
WHERE p.project_code = 'SEED334-PRJ-08'
  AND tcee.deleted_at IS NULL
ORDER BY tcee.created_at;
