-- =============================================================================
-- v354: Dev seed — Platform Testing & QA (bulk: ≥50 rows per table per project)
-- Description: For each selected project, inserts ≥50 test_suites, test_cases,
--              test_case_steps, test_runs, test_case_executions, defects, and
--              defect_comments. Idempotent per project (seed354 tags / names).
-- Database: PostgreSQL 15+ (Supabase public schema)
-- Prerequisites: v338–v340, v344 (triggers), v334 if using SEED334 projects
--
-- Scope (set ONE of these at start of DO block):
--   v_seed_scope = 'seed334' → only projects where project_code LIKE 'SEED334-PRJ-%'
--                    (typical: up to 30 v334 dev projects)
--   v_seed_scope = 'all'      → every project with is_deleted = false (can be large)
--
-- Note: Failed executions get 10 linked defects; 40 standalone defects; INSERT
--       failed status does not fire auto-defect (trigger is UPDATE OF status).
-- =============================================================================

DO $$
DECLARE
  v_seed_scope TEXT := 'seed334';  -- 'seed334' | 'all'
  v_project_id   UUID;
  v_user_id      UUID;
  r_project      RECORD;
  v_done         INT := 0;
BEGIN
  FOR r_project IN
    SELECT p.id, p.project_code
    FROM public.projects p
    WHERE COALESCE(p.is_deleted, FALSE) = FALSE
      AND (
        (v_seed_scope = 'seed334' AND p.project_code LIKE 'SEED334-PRJ-%')
        OR (v_seed_scope = 'all')
      )
    ORDER BY p.project_code
  LOOP
    v_project_id := r_project.id;

    SELECT COALESCE(a.owner_user_id, (
      SELECT u.id FROM public.users u
      WHERE COALESCE(u.is_deleted, FALSE) = FALSE
      ORDER BY u.created_at ASC NULLS LAST
      LIMIT 1
    ))
    INTO v_user_id
    FROM public.accounts a
    JOIN public.projects p ON p.account_id = a.id AND p.id = v_project_id
    LIMIT 1;

    IF v_user_id IS NULL THEN
      RAISE NOTICE 'v354: skipping % — could not resolve user id for account.', r_project.project_code;
      CONTINUE;
    END IF;

    -- -------------------------------------------------------------------------
    -- Remove previous v354 seed for this project
    -- -------------------------------------------------------------------------
    DELETE FROM public.defect_history dh
    USING public.defects d
    WHERE dh.defect_id = d.id
      AND d.project_id = v_project_id
      AND d.title LIKE 'SEED354 |%';

    DELETE FROM public.defect_comments dc
    USING public.defects d
    WHERE dc.defect_id = d.id
      AND d.project_id = v_project_id
      AND d.title LIKE 'SEED354 |%';

    DELETE FROM public.defect_attachments da
    USING public.defects d
    WHERE da.defect_id = d.id
      AND d.project_id = v_project_id
      AND d.title LIKE 'SEED354 |%';

    DELETE FROM public.defects d
    WHERE d.project_id = v_project_id
      AND d.title LIKE 'SEED354 |%';

    DELETE FROM public.test_case_executions tce
    USING public.test_runs tr
    WHERE tce.run_id = tr.id
      AND tr.project_id = v_project_id
      AND tr.run_name LIKE 'SEED354 %';

    DELETE FROM public.test_runs tr
    WHERE tr.project_id = v_project_id
      AND tr.run_name LIKE 'SEED354 %';

    DELETE FROM public.test_case_steps tcs
    USING public.test_cases tc
    WHERE tcs.test_case_id = tc.id
      AND tc.project_id = v_project_id
      AND tc.tags @> '["seed354"]'::jsonb;

    DELETE FROM public.test_cases tc
    WHERE tc.project_id = v_project_id
      AND tc.tags @> '["seed354"]'::jsonb;

    DELETE FROM public.test_suites ts
    WHERE ts.project_id = v_project_id
      AND ts.tags @> '["seed354"]'::jsonb;

    -- -------------------------------------------------------------------------
    -- 50 test_suites
    -- -------------------------------------------------------------------------
    INSERT INTO public.test_suites (
      project_id, name, description, suite_type, status, version,
      tags, environment, estimated_duration_minutes
    )
    SELECT
      v_project_id,
      'SEED354 - Suite ' || LPAD(i::text, 3, '0'),
      'Synthetic suite ' || i || ' for list, filter, and dashboard validation (v354).',
      (ARRAY['functional','regression','smoke','uat','performance','security','integration','exploratory','sanity'])[1 + ((i - 1) % 9)],
      'active',
      '1.' || LPAD(((i - 1) % 20 + 1)::text, 2, '0'),
      '["seed354"]'::jsonb,
      (ARRAY['dev','staging','uat','production'])[1 + ((i - 1) % 4)],
      15 + (i % 120)
    FROM generate_series(1, 50) AS i;

    -- -------------------------------------------------------------------------
    -- 50 test_cases (case i ↔ suite i)
    -- -------------------------------------------------------------------------
    INSERT INTO public.test_cases (
      project_id, suite_id, title, description, preconditions,
      test_type, priority, status, expected_result, test_data,
      module_area, requirement_ref, tags, estimated_duration_minutes, environment
    )
    SELECT
      v_project_id,
      ts.id,
      'SEED354 - Case ' || LPAD(i::text, 3, '0'),
      'Validates behaviour slice ' || i || ' for the paired suite (API gateway programme theme).',
      CASE WHEN i % 3 = 0 THEN 'Staging tenant and test credentials available.' ELSE NULL END,
      CASE
        WHEN i % 11 = 0 THEN 'exploratory'
        WHEN i % 7 = 0 THEN 'automated'
        ELSE 'manual'
      END,
      (ARRAY['critical','high','medium','low'])[1 + ((i - 1) % 4)],
      CASE WHEN i % 9 = 0 THEN 'draft' ELSE 'active' END,
      'Expected: observable outcome matches requirement REQ-SEED-' || LPAD(i::text, 4, '0') || '.',
      CASE WHEN i % 4 = 0 THEN 'seed_data_row_' || i ELSE NULL END,
      (ARRAY['API Gateway','Merchant Portal','Webhooks','Payments API','Identity'])[1 + ((i - 1) % 5)],
      'REQ-SEED-' || LPAD(i::text, 4, '0'),
      '["seed354"]'::jsonb,
      5 + (i % 40),
      (ARRAY['dev','staging','uat','production'])[1 + ((i - 1) % 4)]
    FROM generate_series(1, 50) AS i
    JOIN public.test_suites ts
      ON ts.project_id = v_project_id
     AND ts.name = 'SEED354 - Suite ' || LPAD(i::text, 3, '0')
     AND ts.tags @> '["seed354"]'::jsonb;

    -- -------------------------------------------------------------------------
    -- 100 test_case_steps (2 per case)
    -- -------------------------------------------------------------------------
    INSERT INTO public.test_case_steps (test_case_id, step_number, action, expected_result, test_data)
    SELECT
      tc.id,
      s.step_num,
      'Step ' || s.step_num || ': Perform action for ' || tc.title || ' (document actuals).',
      'Step ' || s.step_num || ' completes without error; response matches REQ-SEED expectations.',
      CASE WHEN s.step_num = 2 THEN 'payload_seed_' || right(tc.title, 3) ELSE NULL END
    FROM public.test_cases tc
    CROSS JOIN (SELECT 1 AS step_num UNION ALL SELECT 2) AS s
    WHERE tc.project_id = v_project_id
      AND tc.tags @> '["seed354"]'::jsonb
      AND tc.title LIKE 'SEED354 - Case %';

    -- -------------------------------------------------------------------------
    -- 50 test_runs
    -- -------------------------------------------------------------------------
    INSERT INTO public.test_runs (
      project_id, suite_id, run_name, description, environment, run_date,
      build_version, status, started_at, completed_at, run_by,
      notes, pass_criteria, summary
    )
    SELECT
      v_project_id,
      ts.id,
      'SEED354 Run ' || LPAD(i::text, 3, '0'),
      'Synthetic execution run ' || i || ' for exports and test dashboard widgets.',
      (ARRAY['dev','staging','uat','production'])[1 + ((i - 1) % 4)],
      (CURRENT_DATE - ((i % 21) || ' days')::interval)::date,
      '1.2.0-b' || LPAD((i % 99 + 1)::text, 2, '0'),
      (ARRAY['planned','in_progress','completed','cancelled','aborted','on_hold'])[1 + ((i - 1) % 6)],
      CASE WHEN (i % 6) IN (2, 3, 4) THEN NOW() - (i::text || ' days')::interval ELSE NULL END,
      CASE WHEN (i % 6) IN (2, 3, 4) THEN NOW() - (i::text || ' days')::interval + INTERVAL '2 hours' ELSE NULL END,
      v_user_id,
      CASE WHEN i % 8 = 0 THEN 'Watch rate limiter keys for staging.' ELSE NULL END,
      'Critical paths green; failures triaged within SLA.',
      '{"total":0,"passed":0,"failed":0,"blocked":0,"skipped":0,"pending":0}'::jsonb
    FROM generate_series(1, 50) AS i
    JOIN public.test_suites ts
      ON ts.project_id = v_project_id
     AND ts.name = 'SEED354 - Suite ' || LPAD(i::text, 3, '0')
     AND ts.tags @> '["seed354"]'::jsonb;

    -- -------------------------------------------------------------------------
    -- 50 test_case_executions
    -- -------------------------------------------------------------------------
    INSERT INTO public.test_case_executions (
      run_id, test_case_id, project_id, status, actual_result, notes,
      executed_by, executed_at, duration_minutes, environment, browser_os
    )
    SELECT
      tr.id,
      tc.id,
      v_project_id,
      CASE (i % 5)
        WHEN 0 THEN 'failed'
        WHEN 1 THEN 'passed'
        WHEN 2 THEN 'blocked'
        WHEN 3 THEN 'skipped'
        ELSE 'in_progress'
      END,
      CASE (i % 5)
        WHEN 0 THEN 'Actual output diverged from expected (seed row ' || i || ').'
        WHEN 1 THEN 'Observed behaviour matches expected result.'
        ELSE NULL
      END,
      CASE WHEN (i % 5) = 2 THEN 'Blocked: dependency ticket CHG-' || (5000 + i) ELSE NULL END,
      v_user_id,
      NOW() - (i::text || ' hours')::interval,
      CASE WHEN i % 2 = 0 THEN 5 + (i % 45) ELSE NULL END,
      tr.environment,
      'Chrome / Win11'
    FROM generate_series(1, 50) AS i
    JOIN public.test_runs tr
      ON tr.project_id = v_project_id
     AND tr.run_name = 'SEED354 Run ' || LPAD(i::text, 3, '0')
    JOIN public.test_cases tc
      ON tc.project_id = v_project_id
     AND tc.title = 'SEED354 - Case ' || LPAD(i::text, 3, '0');

    -- -------------------------------------------------------------------------
    -- 10 linked defects + UPDATE execution.defect_id
    -- -------------------------------------------------------------------------
    WITH ins AS (
      INSERT INTO public.defects (
        project_id, test_case_id, execution_id, title, description,
        severity, priority, defect_type, status, environment, module_area,
        reported_by, created_by, assigned_to
      )
      SELECT
        tce.project_id,
        tce.test_case_id,
        tce.id,
        'SEED354 | Linked defect ' || LPAD(row_number() OVER (ORDER BY tce.id)::text, 2, '0'),
        'Created for failed execution (v354 seed). Triage and assign severity.',
        'high',
        'high',
        'functional',
        'open',
        'staging',
        'API Gateway',
        v_user_id,
        v_user_id,
        v_user_id
      FROM public.test_case_executions tce
      JOIN public.test_runs tr ON tr.id = tce.run_id
      WHERE tr.project_id = v_project_id
        AND tr.run_name LIKE 'SEED354 %'
        AND tce.status = 'failed'
      ORDER BY tce.id
      LIMIT 10
      RETURNING id, execution_id
    )
    UPDATE public.test_case_executions tce
    SET defect_id = ins.id
    FROM ins
    WHERE tce.id = ins.execution_id;

    -- -------------------------------------------------------------------------
    -- 40 standalone defects (50 defects total per project)
    -- -------------------------------------------------------------------------
    INSERT INTO public.defects (
      project_id, title, description,
      severity, priority, defect_type, status,
      environment, module_area,
      expected_behavior, actual_behavior,
      reported_by, created_by
    )
    SELECT
      v_project_id,
      'SEED354 | Synthetic defect ' || LPAD(i::text, 3, '0'),
      'Standalone defect ' || i || ' for backlog, filters, and defect reports (no execution link).',
      (ARRAY['critical','high','medium','low','trivial'])[1 + ((i - 1) % 5)],
      (ARRAY['critical','high','medium','low'])[1 + ((i - 1) % 4)],
      (ARRAY['functional','ui','performance','security','data','integration','regression','environment','other'])[1 + ((i - 1) % 9)],
      (ARRAY['new','open','in_progress','resolved','closed','deferred'])[1 + ((i - 1) % 6)],
      (ARRAY['staging','uat','dev'])[1 + ((i - 1) % 3)],
      (ARRAY['API Gateway','Merchant Portal','Webhooks','Payments API','Identity'])[1 + ((i - 1) % 5)],
      'Documented expected behaviour per REQ.',
      'Observed drift or failure in test or production-like env.',
      v_user_id,
      v_user_id
    FROM generate_series(1, 40) AS i;

    -- -------------------------------------------------------------------------
    -- 50 defect_comments
    -- -------------------------------------------------------------------------
    INSERT INTO public.defect_comments (defect_id, comment, is_internal, created_by)
    SELECT
      d.id,
      'SEED354: triage note #' || row_number() OVER (ORDER BY d.title, d.id) || ' — priority confirmed for sprint planning.',
      FALSE,
      v_user_id
    FROM public.defects d
    WHERE d.project_id = v_project_id
      AND d.title LIKE 'SEED354 |%';

    v_done := v_done + 1;
    RAISE NOTICE 'v354: seeded project % (%)', r_project.project_code, v_project_id;
  END LOOP;

  IF v_done = 0 THEN
    RAISE NOTICE 'v354: No projects matched scope "%". Adjust v_seed_scope or create SEED334 projects (v334).', v_seed_scope;
  ELSE
    RAISE NOTICE 'v354: Complete — % project(s); each: 50 suites, 50 cases, 100 steps, 50 runs, 50 executions, 50 defects, 50 comments.', v_done;
  END IF;
END $$;
