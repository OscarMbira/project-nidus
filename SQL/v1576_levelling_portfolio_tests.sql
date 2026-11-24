-- ============================================================================
-- v1576 — Rolled-back checks for levelling apply / undo and scenario approval.
-- Nothing is kept. Skip with a notice when the database has no project to use.
-- ============================================================================

BEGIN;

DO $$
DECLARE
  v_project UUID;
  v_task UUID;
  v_start DATE;
  v_run UUID;
  v_portfolio UUID;
  v_scenario UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE NOTICE 'SKIP levelling tests — this session has no signed-in user';
    RETURN;
  END IF;
  SELECT id INTO v_project FROM public.projects WHERE COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
  IF v_project IS NULL THEN
    RAISE NOTICE 'SKIP levelling tests — no project';
    RETURN;
  END IF;
  SELECT id, planned_start_date INTO v_task, v_start
  FROM public.tasks
  WHERE project_id = v_project AND COALESCE(is_deleted, FALSE) = FALSE AND planned_start_date IS NOT NULL
  LIMIT 1;
  IF v_task IS NULL THEN
    RAISE NOTICE 'SKIP levelling tests — project has no dated task';
    RETURN;
  END IF;

  v_run := public.apply_levelling_run(jsonb_build_object(
    'project_id', v_project, 'scope', 'project', 'mode', 'beyond_float', 'status', 'applied',
    'moves', jsonb_build_array(jsonb_build_object(
      'task_id', v_task, 'old_start', v_start, 'old_end', v_start,
      'new_start', v_start + 7, 'new_end', v_start + 7, 'delay_days', 5, 'reason', 'Test', 'accepted', true
    ))
  ));
  IF (SELECT planned_start_date FROM public.tasks WHERE id = v_task) IS DISTINCT FROM (v_start + 7) THEN
    RAISE EXCEPTION 'T1 apply did not move the task';
  END IF;
  PERFORM public.undo_levelling_run(v_run);
  IF (SELECT planned_start_date FROM public.tasks WHERE id = v_task) IS DISTINCT FROM v_start THEN
    RAISE EXCEPTION 'T2 undo did not restore the task';
  END IF;
  BEGIN
    PERFORM public.apply_levelling_run(jsonb_build_object(
      'project_id', v_project, 'status', 'applied',
      'moves', jsonb_build_array(jsonb_build_object(
        'task_id', v_task, 'old_start', v_start + 30, 'new_start', v_start, 'accepted', true
      ))
    ));
    RAISE EXCEPTION 'T3 stale preview was accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'LEVEL_STALE:%' THEN RAISE; END IF;
  END;

  SELECT portfolio_id INTO v_portfolio FROM public.portfolio_projects WHERE project_id = v_project LIMIT 1;
  IF v_portfolio IS NULL THEN
    RAISE NOTICE 'SKIP scenario tests — project is not in a portfolio';
    RETURN;
  END IF;
  INSERT INTO public.portfolio_scenarios (portfolio_id, name, status) VALUES (v_portfolio, 'Test scenario', 'draft') RETURNING id INTO v_scenario;
  BEGIN
    PERFORM public.apply_portfolio_scenario(v_scenario);
    RAISE EXCEPTION 'T4 draft scenario was applied';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'SCENARIO_STATE:%' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.decide_portfolio_scenario(v_scenario, 'approve', '   ');
    RAISE EXCEPTION 'T5 blank justification was accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'SCENARIO_NOTES:%' AND SQLERRM NOT LIKE 'SCENARIO_STATE:%' THEN RAISE; END IF;
  END;
END $$;

ROLLBACK;
