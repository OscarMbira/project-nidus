-- ============================================================================
-- v1266 tests (feature v1265, step S2): numbered schedule baselines, approval and the active baseline.
-- Run after v1266_multiple_baselines.sql. Uses an existing project and user; every change is
-- rolled back at the end (nothing is left behind). Calls the *_impl functions directly (the
-- public wrappers add the project-access check, which needs a signed-in user).
--
--   T1 first schedule baseline is B0 and approved automatically
--   T2 the next is B1 and not approved
--   T3 an unapproved baseline cannot be made active
--   T4 approving needs a justification
--   T5 approve + activate: B1 becomes the only active baseline and its dates reach the tasks
--   T6 scope / cost baselines are not numbered
--   T7 status date is saved on the project
-- ============================================================================

CREATE TEMP TABLE IF NOT EXISTS v1265b_results (test TEXT PRIMARY KEY, passed BOOLEAN, detail TEXT);
TRUNCATE v1265b_results;

DO $$
DECLARE
  v_project UUID := (SELECT id FROM public.projects ORDER BY created_at LIMIT 1);
  v_user UUID := (SELECT id FROM public.users ORDER BY created_at LIMIT 1);
  r BOOLEAN[] := ARRAY[]::BOOLEAN[]; d TEXT[] := ARRAY[]::TEXT[];
  v_task UUID; v_b0 UUID; v_b1 UUID; v_scope UUID;
  v_row RECORD; v_count INT; v_date DATE;
BEGIN
  IF v_project IS NULL OR v_user IS NULL THEN
    INSERT INTO v1265b_results VALUES ('setup', FALSE, 'Needs at least one project and one user');
    RETURN;
  END IF;

  BEGIN
    -- start from a project with no schedule baselines in this transaction
    UPDATE public.project_baselines SET is_deleted = TRUE WHERE project_id = v_project;
    INSERT INTO public.tasks (project_id, task_name, task_code, planned_start_date, planned_end_date, estimated_duration_days)
      VALUES (v_project, 'v1265 test task', '', '2026-03-02', '2026-03-06', 5) RETURNING id INTO v_task;

    -- T1
    INSERT INTO public.project_baselines (project_id, baseline_name, baseline_type, baseline_date, baseline_data, created_by)
      VALUES (v_project, 'Original', 'schedule', CURRENT_DATE, jsonb_build_object('tasks', jsonb_build_array(jsonb_build_object('id', v_task, 'start', '2026-03-02', 'finish', '2026-03-06'))), v_user)
      RETURNING id INTO v_b0;
    SELECT baseline_number, approval_date INTO v_row FROM public.project_baselines WHERE id = v_b0;
    r := array_append(r, v_row.baseline_number = 0 AND v_row.approval_date IS NOT NULL); d := array_append(d, format('number %s, approved %s', v_row.baseline_number, v_row.approval_date IS NOT NULL));

    -- T2
    INSERT INTO public.project_baselines (project_id, baseline_name, baseline_type, baseline_date, baseline_data, reason, created_by)
      VALUES (v_project, 'Re-plan', 'schedule', CURRENT_DATE, jsonb_build_object('tasks', jsonb_build_array(jsonb_build_object('id', v_task, 'start', '2026-03-09', 'finish', '2026-03-13'))), 'CR-0012', v_user)
      RETURNING id INTO v_b1;
    SELECT baseline_number, approval_date INTO v_row FROM public.project_baselines WHERE id = v_b1;
    r := array_append(r, v_row.baseline_number = 1 AND v_row.approval_date IS NULL); d := array_append(d, format('number %s', v_row.baseline_number));

    -- T3
    BEGIN
      PERFORM public.planning_activate_baseline_impl('public', v_b1);
      r := array_append(r, FALSE); d := array_append(d, 'unapproved baseline was activated');
    EXCEPTION WHEN raise_exception THEN r := array_append(r, TRUE); d := array_append(d, 'refused (expected)');
    END;

    -- T4
    BEGIN
      PERFORM public.planning_approve_baseline_impl('public', v_b1, '   ');
      r := array_append(r, FALSE); d := array_append(d, 'approved without a note');
    EXCEPTION WHEN raise_exception THEN r := array_append(r, TRUE); d := array_append(d, 'refused (expected)');
    END;

    -- T5
    PERFORM public.planning_activate_baseline_impl('public', v_b0);
    PERFORM public.planning_approve_baseline_impl('public', v_b1, 'Steering committee approved CR-0012');
    PERFORM public.planning_activate_baseline_impl('public', v_b1);
    SELECT COUNT(*) INTO v_count FROM public.project_baselines WHERE project_id = v_project AND is_active_baseline AND NOT is_deleted;
    SELECT baseline_start_date, baseline_end_date INTO v_row FROM public.tasks WHERE id = v_task;
    r := array_append(r, v_count = 1 AND (SELECT is_active_baseline FROM public.project_baselines WHERE id = v_b1)
                         AND v_row.baseline_start_date = '2026-03-09' AND v_row.baseline_end_date = '2026-03-13');
    d := array_append(d, format('active %s, task baseline %s → %s', v_count, v_row.baseline_start_date, v_row.baseline_end_date));

    -- T6
    INSERT INTO public.project_baselines (project_id, baseline_name, baseline_type, baseline_date, baseline_data, created_by)
      VALUES (v_project, 'Scope', 'scope', CURRENT_DATE, '{}', v_user) RETURNING id INTO v_scope;
    r := array_append(r, (SELECT baseline_number FROM public.project_baselines WHERE id = v_scope) IS NULL); d := array_append(d, NULL);

    -- T7
    PERFORM public.planning_set_status_date_impl('public', v_project, '2026-03-11');
    SELECT status_date INTO v_date FROM public.projects WHERE id = v_project;
    r := array_append(r, v_date = '2026-03-11'); d := array_append(d, v_date::text);

    RAISE EXCEPTION 'v1265b_rollback';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'v1265b_rollback' THEN RAISE; END IF;
  END;

  INSERT INTO v1265b_results VALUES
    ('T1 first baseline is B0, approved', r[1], d[1]),
    ('T2 next is B1, not approved', r[2], d[2]),
    ('T3 unapproved cannot be active', r[3], d[3]),
    ('T4 approval needs a justification', r[4], d[4]),
    ('T5 approve + activate copies dates; one active', r[5], d[5]),
    ('T6 scope baselines not numbered', r[6], d[6]),
    ('T7 status date saved', r[7], d[7]);
END $$;

SELECT CASE WHEN passed THEN 'PASS' ELSE 'FAIL' END AS result, test, detail FROM v1265b_results ORDER BY test;
