-- =============================================================================
-- v974: Seed Data — Testing group (Core PM sidebar).
-- Covers: public.test_suites, public.test_cases, public.test_runs, public.defects
-- (each has ~1500 rows system-wide but 0 for the anchor seed projects).
-- Quality group's public.quality_register (36 rows) and public.quality_reviews
-- (15 rows) already cover the anchor projects — skipped, matching the
-- "Template Library was already populated" precedent.
-- Prerequisites: v305 (anchor projects), v338/v339/v340 (testing tables).
-- Idempotent: fixed hex-only UUIDs + ON CONFLICT (id) DO NOTHING. Safe to re-run.
-- Display IDs (CORRECTED 2026-08-24): test_case_ref and defect_ref are NOT plain optional
--   text — both have a real UNIQUE constraint plus their own auto-generation trigger
--   (trg_test_cases_generate_ref / fn_generate_test_case_ref in v338; the equivalent for
--   defect_ref in v340), which assigns TC-YYYYMMDD-NNNN / DEF-YYYYMMDD-NNNN whenever the
--   column is left NULL/blank on insert. The original hand-assigned 'SEED-TC-01'/'SEED-DEF-01'
--   values collided across different rows in the same INSERT (23505 unique violation) —
--   dropped from both column lists below; the triggers assign real, guaranteed-unique refs.
-- =============================================================================

DO $$
DECLARE
  v_proj_dw  UUID; -- SEED-PP-01 Digital Workspace Rollout
  v_proj_bi  UUID; -- SEED-PP-02 BI Platform Implementation
  v_user_id  UUID;
  v_auth_uid UUID;

  v_suite1 UUID := '97400001-7501-4a01-9c01-534433340001';
  v_suite2 UUID := '97400001-7501-4a01-9c01-534433340002';
  v_case1  UUID := '97400002-7c01-4a01-9c01-534433340001';
  v_case2  UUID := '97400002-7c01-4a01-9c01-534433340002';
BEGIN

  SELECT id INTO v_proj_dw FROM public.projects WHERE project_code = 'SEED-PP-01' AND COALESCE(is_deleted, false) = false LIMIT 1;
  SELECT id INTO v_proj_bi FROM public.projects WHERE project_code = 'SEED-PP-02' AND COALESCE(is_deleted, false) = false LIMIT 1;

  IF v_proj_dw IS NULL OR v_proj_bi IS NULL THEN
    RAISE NOTICE 'v974: Anchor seed projects (SEED-PP-01/02) not found — run v305 first. Skipping.';
    RETURN;
  END IF;

  SELECT id INTO v_user_id FROM public.users WHERE COALESCE(is_deleted, false) = false LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'v974: No user available to attribute seed rows. Skipping.';
    RETURN;
  END IF;

  SELECT auth_user_id INTO v_auth_uid FROM public.users WHERE id = v_user_id LIMIT 1;
  IF v_auth_uid IS NOT NULL THEN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_auth_uid::text)::text, true);
  END IF;

  -- ---------------------------------------------------------------------------
  -- TEST SUITES (public.test_suites)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.test_suites (
    id, project_id, name, description, suite_type, status, version, environment,
    estimated_duration_minutes, is_deleted, created_at, created_by
  ) VALUES
    (v_suite1, v_proj_dw, 'Workspace Client Regression Suite', 'Regression coverage for the digital workspace client across supported OS versions.',
     'regression', 'active', '1.2', 'UAT', 180, false, NOW() - INTERVAL '50 days', v_user_id),

    (v_suite2, v_proj_bi, 'BI Report Accuracy Suite', 'Validates report output against known-good source data extracts.',
     'functional', 'active', '1.0', 'UAT', 240, false, NOW() - INTERVAL '40 days', v_user_id)
  ON CONFLICT (id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- TEST CASES (public.test_cases)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.test_cases (
    id, project_id, suite_id, title, description, preconditions,
    test_type, priority, status, expected_result, environment,
    is_deleted, created_at, created_by
  ) VALUES
    (v_case1, v_proj_dw, v_suite1, 'Workspace client launches on managed Windows 11 device',
     'Verify the workspace client installs and launches correctly on a managed Windows 11 laptop.',
     'Device is enrolled in MDM and has the standard image applied.',
     'manual', 'high', 'active', 'Client launches within 10 seconds and displays the SSO login screen.', 'UAT',
     false, NOW() - INTERVAL '48 days', v_user_id),

    ('97400002-7c01-4a01-9c01-534433340003', v_proj_dw, v_suite1, 'Offline file sync resumes after reconnect',
     'Verify files edited offline sync correctly once network connectivity is restored.',
     'Client is signed in and has at least one file open for offline editing.',
     'manual', 'medium', 'active', 'All offline edits sync without conflict within 2 minutes of reconnecting.', 'UAT',
     false, NOW() - INTERVAL '48 days', v_user_id),

    (v_case2, v_proj_bi, v_suite2, 'Month-end financial report matches source ledger totals',
     'Verify the month-end financial summary report totals reconcile with the finance source system.',
     'Test finance dataset loaded into the BI staging environment.',
     'manual', 'critical', 'active', 'Report totals match source ledger to the cent for all test accounts.', 'UAT',
     false, NOW() - INTERVAL '38 days', v_user_id)
  ON CONFLICT (id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- TEST RUNS (public.test_runs)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.test_runs (
    id, project_id, suite_id, run_name, description, environment, run_date,
    build_version, status, started_at, completed_at, run_by, summary,
    is_deleted, created_at, created_by
  ) VALUES
    ('97400003-7201-4a01-9c01-534433340001', v_proj_dw, v_suite1, 'Wave 1 UAT Regression Run 1', 'First full regression pass ahead of wave 1 go-live.',
     'uat', CURRENT_DATE - 40, '1.2.0', 'completed',
     NOW() - INTERVAL '40 days', NOW() - INTERVAL '40 days' + INTERVAL '3 hours', v_user_id,
     '{"total":20,"passed":18,"failed":2,"blocked":0,"skipped":0,"pending":0}'::jsonb,
     false, NOW() - INTERVAL '40 days', v_user_id),

    ('97400003-7201-4a01-9c01-534433340002', v_proj_bi, v_suite2, 'BI Report Accuracy Run 1', 'First accuracy validation pass against Finance test dataset.',
     'uat', CURRENT_DATE - 12, '1.0.0', 'in_progress',
     NOW() - INTERVAL '12 days', NULL, v_user_id,
     '{"total":10,"passed":6,"failed":0,"blocked":0,"skipped":0,"pending":4}'::jsonb,
     false, NOW() - INTERVAL '12 days', v_user_id)
  ON CONFLICT (id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- DEFECTS (public.defects)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.defects (
    id, project_id, test_case_id, title, description,
    severity, priority, defect_type, status, environment,
    steps_to_reproduce, expected_behavior, actual_behavior,
    reported_by, cursor_prompt_generated,
    is_deleted, created_at, created_by
  ) VALUES
    ('97400004-df01-4a01-9c01-534433340001', v_proj_dw, v_case1,
     'Client fails to launch on devices with older GPU drivers',
     'Workspace client crashes on launch for a subset of devices running outdated GPU drivers.',
     'high', 'high', 'functional', 'open', 'UAT',
     '1. Install client on a device with GPU driver older than v27. 2. Launch client.',
     'Client launches to the SSO login screen.',
     'Client crashes with an unhandled exception dialog before reaching login.',
     v_user_id, false,
     false, NOW() - INTERVAL '40 days', v_user_id),

    ('97400004-df01-4a01-9c01-534433340002', v_proj_bi, v_case2,
     'Rounding discrepancy in month-end summary for multi-currency accounts',
     'Report totals for multi-currency accounts differ from source ledger by up to 0.02 due to a rounding order issue.',
     'medium', 'high', 'data', 'in_progress', 'UAT',
     '1. Run month-end report for an account with mixed-currency transactions. 2. Compare to source ledger.',
     'Report total matches source ledger exactly.',
     'Report total differs from source ledger by 1-2 cents on affected accounts.',
     v_user_id, false,
     false, NOW() - INTERVAL '10 days', v_user_id)
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'v974: Testing seed complete (test suites/cases/runs/defects) for SEED-PP-01/02.';

END $$;
