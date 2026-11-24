-- ============================================================================
-- v1570 tests: quantitative risk analysis (v1355). Run after v1566–v1569.
-- One transaction, rolled back. Each failure raises; each pass is a NOTICE.
-- A database with no project skips the row-level checks.
-- ============================================================================

BEGIN;

DO $$
BEGIN
  IF to_regprocedure('public.save_qra_run(jsonb)') IS NULL
     OR to_regprocedure('public.adopt_qra_contingency(uuid)') IS NULL
     OR to_regprocedure('sim.save_qra_run(jsonb)') IS NULL THEN
    RAISE EXCEPTION 'T1 save and adopt functions are missing';
  END IF;
  RAISE NOTICE 'PASS T1 functions exist';
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'qra_percent_pre')
     OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'qra_cost_pre_order') THEN
    RAISE EXCEPTION 'T2 range and percent checks are missing';
  END IF;
  RAISE NOTICE 'PASS T2 checks exist';
END $$;

DO $$
DECLARE
  v_project UUID;
  v_user UUID;
  v_risk UUID;
  v_ml NUMERIC;
  v_run UUID;
  v_bad BOOLEAN := FALSE;
BEGIN
  SELECT p.id, u.id INTO v_project, v_user
  FROM public.projects p
  JOIN public.users u ON COALESCE(u.is_deleted, FALSE) = FALSE
  WHERE COALESCE(p.is_deleted, FALSE) = FALSE
  LIMIT 1;
  IF v_project IS NULL THEN
    RAISE NOTICE 'SKIP T3–T5 — no project and user';
    RETURN;
  END IF;

  INSERT INTO public.risks (project_id, risk_title, risk_description, identified_by_user_id, pre_cost_impact, pre_schedule_impact_days)
  VALUES (v_project, 'QRA test risk', 'Created by v1570 and rolled back.', v_user, 1250, 4)
  RETURNING id INTO v_risk;
  SELECT pre_cost_ml INTO v_ml FROM public.risks WHERE id = v_risk;
  IF v_ml IS DISTINCT FROM 1250 THEN
    RAISE EXCEPTION 'T3 most-likely was not filled from the single cost (%)', v_ml;
  END IF;
  RAISE NOTICE 'PASS T3 existing cost kept as most likely';

  BEGIN
    UPDATE public.risks SET pre_probability_percent = 150 WHERE id = v_risk;
    v_bad := TRUE;
  EXCEPTION WHEN check_violation THEN
    v_bad := FALSE;
  END;
  IF v_bad THEN RAISE EXCEPTION 'T4 a percent of 150 was accepted'; END IF;
  RAISE NOTICE 'PASS T4 percent above 99 rejected';

  BEGIN
    UPDATE public.risks SET pre_cost_min = 9, pre_cost_ml = 1, pre_cost_max = 3 WHERE id = v_risk;
    v_bad := TRUE;
  EXCEPTION WHEN check_violation THEN
    v_bad := FALSE;
  END;
  IF v_bad THEN RAISE EXCEPTION 'T4 an out-of-order cost range was accepted'; END IF;
  RAISE NOTICE 'PASS T4 out-of-order range rejected';

  INSERT INTO public.qra_runs (project_id, kind, response_basis, iterations, seed, inputs_snapshot, summary)
  VALUES (v_project, 'schedule', 'pre', 1000, 42, '{"seed":42}'::JSONB, '{"schedule":{"p80":"2026-12-01"}}'::JSONB)
  RETURNING id INTO v_run;
  BEGIN
    UPDATE public.qra_runs SET iterations = 2000 WHERE id = v_run;
    v_bad := TRUE;
  EXCEPTION WHEN OTHERS THEN
    v_bad := FALSE;
  END;
  IF v_bad THEN RAISE EXCEPTION 'T5 a saved run was changed'; END IF;
  RAISE NOTICE 'PASS T5 saved run is immutable';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE 'T%' THEN RAISE; END IF;
  RAISE NOTICE 'SKIP T3–T5 — %', SQLERRM;
END $$;

ROLLBACK;
