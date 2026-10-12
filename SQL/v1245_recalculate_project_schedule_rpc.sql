-- ============================================================================
-- v1245: Working-calendar-aware schedule recalculation (database authority, decision D7)
-- Plan: projectplan/v1239_dual_mode_planning_product_plan.md (Slice 3.3)
--
-- Same rules as packages/planning/src/engine/schedule.js (client preview). Keep them in step;
-- SQL/v1245_schedule_engine_test_vectors.sql runs the JS test cases against this engine.
--
--   public.planning_schedule_compute(...)        pure engine (jsonb in, jsonb out)
--   public.recalculate_project_schedule(project, expected_versions)
--   sim.recalculate_project_schedule(practice_project, expected_versions)
--
-- Save rules: access check → lock the project's tasks → reject if any task's row_version differs
-- from the caller's copy (SCHEDULE_CONFLICT) → write early/late dates, slack, critical flag and,
-- for auto tasks, planned dates → one audit_log row. Run AFTER v1242 and v1243.
-- ============================================================================

-- ── Working-day helpers (dow: 0 = Sunday … 6 = Saturday) ────────────────────
CREATE OR REPLACE FUNCTION public.planning_is_working_day(d DATE, p_weekdays INT[], p_holidays DATE[], p_extra DATE[])
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (d = ANY(COALESCE(p_extra, '{}')))
      OR (EXTRACT(DOW FROM d)::int = ANY(p_weekdays) AND NOT (d = ANY(COALESCE(p_holidays, '{}'))));
$$;

-- Move n working days (n may be negative); a non-working start rolls to the next (n >= 0) or
-- previous (n < 0) working day first, which counts as day 0.
CREATE OR REPLACE FUNCTION public.planning_add_working_days(d DATE, n INT, p_weekdays INT[], p_holidays DATE[], p_extra DATE[])
RETURNS DATE
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  dir INT := CASE WHEN n < 0 THEN -1 ELSE 1 END;
  cur DATE := d;
  remaining INT := abs(n);
  guard INT := 0;
BEGIN
  IF COALESCE(array_length(p_weekdays, 1), 0) = 0 AND COALESCE(array_length(p_extra, 1), 0) = 0 THEN
    RAISE EXCEPTION 'A calendar needs at least one working weekday';
  END IF;
  WHILE NOT public.planning_is_working_day(cur, p_weekdays, p_holidays, p_extra) LOOP
    cur := cur + dir;
    guard := guard + 1;
    IF guard > 3660 THEN RAISE EXCEPTION 'No working day found within 10 years — check the calendar'; END IF;
  END LOOP;
  WHILE remaining > 0 LOOP
    cur := cur + dir;
    IF public.planning_is_working_day(cur, p_weekdays, p_holidays, p_extra) THEN
      remaining := remaining - 1;
    END IF;
    guard := guard + 1;
    IF guard > 366000 THEN RAISE EXCEPTION 'Working-day calculation did not finish — check the calendar'; END IF;
  END LOOP;
  RETURN cur;
END;
$$;

-- Working days from a to b, excluding a (negative when b is before a).
CREATE OR REPLACE FUNCTION public.planning_working_days_between(a DATE, b DATE, p_weekdays INT[], p_holidays DATE[], p_extra DATE[])
RETURNS INT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN a = b THEN 0
    WHEN b > a THEN (SELECT COUNT(*)::int FROM generate_series(a + 1, b, interval '1 day') g
                     WHERE public.planning_is_working_day(g::date, p_weekdays, p_holidays, p_extra))
    ELSE -(SELECT COUNT(*)::int FROM generate_series(b, a - 1, interval '1 day') g
           WHERE public.planning_is_working_day(g::date, p_weekdays, p_holidays, p_extra))
  END;
$$;

-- ── Pure engine ─────────────────────────────────────────────────────────────
-- p_tasks: [{ id, duration, mode, start, constraint_type, constraint_date }]
-- p_deps:  [{ pred, succ, type, lag }]
-- returns { tasks: { <id>: { es, ef, ls, lf, slack, critical } }, project_finish }
CREATE OR REPLACE FUNCTION public.planning_schedule_compute(
  p_project_start DATE, p_tasks JSONB, p_deps JSONB, p_weekdays INT[], p_holidays DATE[], p_extra DATE[]
)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
#variable_conflict use_column
-- Query columns (p, s, ty, lg) share names with variables below: columns win.
DECLARE
  n INT;
  ids TEXT[]; dur INT[]; t_mode TEXT[]; tstart DATE[]; ctype TEXT[]; cdate DATE[];
  idx JSONB;
  m INT;
  -- deps sorted by successor (incoming) and by predecessor (outgoing)
  in_pred INT[]; in_succ INT[]; in_type TEXT[]; in_lag INT[];
  out_pred INT[]; out_succ INT[]; out_type TEXT[]; out_lag INT[];
  in_first INT[]; in_last INT[]; out_first INT[]; out_last INT[];
  indeg INT[]; q INT[]; head INT := 1; tail INT := 0;
  ord INT[] := '{}';
  es DATE[]; ef DATE[]; ls DATE[]; lf DATE[];
  i INT; k INT; j INT; cand DATE; s DATE; f DATE; start0 DATE; pfinish DATE;
  res JSONB := '{}'::jsonb;
  slack INT;
BEGIN
  n := COALESCE(jsonb_array_length(p_tasks), 0);
  start0 := public.planning_add_working_days(COALESCE(p_project_start, CURRENT_DATE), 0, p_weekdays, p_holidays, p_extra);
  IF n = 0 THEN
    RETURN jsonb_build_object('tasks', '{}'::jsonb, 'project_finish', start0);
  END IF;

  SELECT array_agg(t->>'id' ORDER BY o),
         array_agg(GREATEST(0, ROUND(COALESCE((t->>'duration')::numeric, 0)))::int ORDER BY o),
         array_agg(COALESCE(t->>'mode', 'auto') ORDER BY o),
         array_agg(NULLIF(t->>'start', '')::date ORDER BY o),
         array_agg(COALESCE(t->>'constraint_type', 'asap') ORDER BY o),
         array_agg(NULLIF(t->>'constraint_date', '')::date ORDER BY o),
         jsonb_object_agg(t->>'id', o)
    INTO ids, dur, t_mode, tstart, ctype, cdate, idx
  FROM jsonb_array_elements(p_tasks) WITH ORDINALITY AS x(t, o);

  -- valid dependencies only (both ends known, not self)
  WITH d AS (
    SELECT (idx->>(e->>'pred'))::int AS p, (idx->>(e->>'succ'))::int AS s,
           upper(COALESCE(e->>'type', 'FS')) AS ty, ROUND(COALESCE((e->>'lag')::numeric, 0))::int AS lg
    FROM jsonb_array_elements(COALESCE(p_deps, '[]'::jsonb)) e
  ), v AS (SELECT * FROM d WHERE p IS NOT NULL AND s IS NOT NULL AND p <> s)
  SELECT array_agg(p ORDER BY s, p), array_agg(s ORDER BY s, p), array_agg(ty ORDER BY s, p), array_agg(lg ORDER BY s, p)
    INTO in_pred, in_succ, in_type, in_lag FROM v;
  m := COALESCE(array_length(in_pred, 1), 0);
  IF m > 0 THEN
    SELECT array_agg(p ORDER BY p, s), array_agg(s ORDER BY p, s), array_agg(ty ORDER BY p, s), array_agg(lg ORDER BY p, s)
      INTO out_pred, out_succ, out_type, out_lag
    FROM unnest(in_pred, in_succ, in_type, in_lag) AS u(p, s, ty, lg);
  END IF;

  in_first := array_fill(0, ARRAY[n]); in_last := array_fill(-1, ARRAY[n]);
  out_first := array_fill(0, ARRAY[n]); out_last := array_fill(-1, ARRAY[n]);
  indeg := array_fill(0, ARRAY[n]);
  FOR k IN 1..m LOOP
    IF in_first[in_succ[k]] = 0 THEN in_first[in_succ[k]] := k; END IF;
    in_last[in_succ[k]] := k;
    indeg[in_succ[k]] := indeg[in_succ[k]] + 1;
    IF out_first[out_pred[k]] = 0 THEN out_first[out_pred[k]] := k; END IF;
    out_last[out_pred[k]] := k;
  END LOOP;

  -- Kahn topological order
  q := array_fill(0, ARRAY[n]);
  FOR i IN 1..n LOOP
    IF indeg[i] = 0 THEN tail := tail + 1; q[tail] := i; END IF;
  END LOOP;
  WHILE head <= tail LOOP
    i := q[head]; head := head + 1;
    ord := ord || i;
    IF out_first[i] > 0 THEN
      FOR k IN out_first[i]..out_last[i] LOOP
        j := out_succ[k];
        indeg[j] := indeg[j] - 1;
        IF indeg[j] = 0 THEN tail := tail + 1; q[tail] := j; END IF;
      END LOOP;
    END IF;
  END LOOP;
  IF COALESCE(array_length(ord, 1), 0) <> n THEN
    RAISE EXCEPTION 'SCHEDULE_CYCLE: circular dependency between tasks %',
      (SELECT string_agg(ids[x], ', ') FROM generate_series(1, n) x WHERE indeg[x] > 0);
  END IF;

  -- Forward pass
  es := array_fill(NULL::date, ARRAY[n]); ef := array_fill(NULL::date, ARRAY[n]);
  FOREACH i IN ARRAY ord LOOP
    IF t_mode[i] = 'manual' AND tstart[i] IS NOT NULL THEN
      s := public.planning_add_working_days(tstart[i], 0, p_weekdays, p_holidays, p_extra);
    ELSIF ctype[i] = 'mso' AND cdate[i] IS NOT NULL THEN
      s := public.planning_add_working_days(cdate[i], 0, p_weekdays, p_holidays, p_extra);
    ELSE
      s := start0;
      IF ctype[i] = 'snet' AND cdate[i] IS NOT NULL THEN
        s := GREATEST(s, public.planning_add_working_days(cdate[i], 0, p_weekdays, p_holidays, p_extra));
      END IF;
      IF in_first[i] > 0 THEN
        FOR k IN in_first[i]..in_last[i] LOOP
          j := in_pred[k];
          IF in_type[k] = 'SS' THEN
            cand := public.planning_add_working_days(es[j], in_lag[k], p_weekdays, p_holidays, p_extra);
          ELSIF in_type[k] = 'FF' THEN
            f := public.planning_add_working_days(ef[j], in_lag[k], p_weekdays, p_holidays, p_extra);
            cand := public.planning_add_working_days(f, CASE WHEN dur[i] > 0 THEN -(dur[i] - 1) ELSE 0 END, p_weekdays, p_holidays, p_extra);
          ELSIF in_type[k] = 'SF' THEN
            f := public.planning_add_working_days(es[j], in_lag[k] - 1, p_weekdays, p_holidays, p_extra);
            cand := public.planning_add_working_days(f, CASE WHEN dur[i] > 0 THEN -(dur[i] - 1) ELSE 0 END, p_weekdays, p_holidays, p_extra);
          ELSE
            cand := public.planning_add_working_days(ef[j], in_lag[k] + 1, p_weekdays, p_holidays, p_extra);
          END IF;
          s := GREATEST(s, cand);
        END LOOP;
      END IF;
    END IF;
    es[i] := s;
    ef[i] := public.planning_add_working_days(s, CASE WHEN dur[i] > 0 THEN dur[i] - 1 ELSE 0 END, p_weekdays, p_holidays, p_extra);
  END LOOP;
  SELECT max(x) INTO pfinish FROM unnest(ef) x;

  -- Backward pass
  ls := array_fill(NULL::date, ARRAY[n]); lf := array_fill(NULL::date, ARRAY[n]);
  FOR k IN REVERSE n..1 LOOP
    i := ord[k];
    f := pfinish;
    IF ctype[i] = 'fnlt' AND cdate[i] IS NOT NULL THEN
      f := LEAST(f, public.planning_add_working_days(cdate[i], 0, p_weekdays, p_holidays, p_extra));
    END IF;
    IF out_first[i] > 0 THEN
      FOR j IN out_first[i]..out_last[i] LOOP
        IF out_type[j] = 'SS' THEN
          s := public.planning_add_working_days(ls[out_succ[j]], -out_lag[j], p_weekdays, p_holidays, p_extra);
          cand := public.planning_add_working_days(s, CASE WHEN dur[i] > 0 THEN dur[i] - 1 ELSE 0 END, p_weekdays, p_holidays, p_extra);
        ELSIF out_type[j] = 'FF' THEN
          cand := public.planning_add_working_days(lf[out_succ[j]], -out_lag[j], p_weekdays, p_holidays, p_extra);
        ELSIF out_type[j] = 'SF' THEN
          s := public.planning_add_working_days(lf[out_succ[j]], -(out_lag[j] - 1), p_weekdays, p_holidays, p_extra);
          cand := public.planning_add_working_days(s, CASE WHEN dur[i] > 0 THEN dur[i] - 1 ELSE 0 END, p_weekdays, p_holidays, p_extra);
        ELSE
          cand := public.planning_add_working_days(ls[out_succ[j]], -(out_lag[j] + 1), p_weekdays, p_holidays, p_extra);
        END IF;
        f := LEAST(f, cand);
      END LOOP;
    END IF;
    lf[i] := f;
    ls[i] := public.planning_add_working_days(f, CASE WHEN dur[i] > 0 THEN -(dur[i] - 1) ELSE 0 END, p_weekdays, p_holidays, p_extra);
  END LOOP;

  FOR i IN 1..n LOOP
    slack := public.planning_working_days_between(es[i], ls[i], p_weekdays, p_holidays, p_extra);
    res := res || jsonb_build_object(ids[i], jsonb_build_object(
      'es', es[i], 'ef', ef[i], 'ls', ls[i], 'lf', lf[i], 'slack', slack, 'critical', slack <= 0));
  END LOOP;
  RETURN jsonb_build_object('tasks', res, 'project_finish', pfinish);
END;
$$;

-- ── Shared save step (schema-agnostic via dynamic SQL) ──────────────────────
CREATE OR REPLACE FUNCTION public.planning_recalculate_schedule_impl(
  p_schema TEXT, p_project_id UUID, p_expected_versions JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sim
AS $$
DECLARE
  v_fk TEXT := CASE WHEN p_schema = 'sim' THEN 'practice_project_id' ELSE 'project_id' END;
  v_start DATE;
  v_weekdays INT[];
  v_holidays DATE[];
  v_extra DATE[];
  v_tasks JSONB;
  v_deps JSONB;
  v_conflicts TEXT;
  v_result JSONB;
  v_updated INT;
BEGIN
  IF p_schema NOT IN ('public', 'sim') THEN RAISE EXCEPTION 'Unknown schema %', p_schema; END IF;

  -- 1. Lock this project's tasks for the whole recalculation.
  EXECUTE format('SELECT 1 FROM %I.tasks WHERE %I = $1 AND COALESCE(is_deleted, FALSE) = FALSE FOR UPDATE', p_schema, v_fk)
    USING p_project_id;

  -- 2. Optimistic concurrency: caller sends {task_id: row_version} for the rows it edited.
  IF p_expected_versions IS NOT NULL AND p_expected_versions <> '{}'::jsonb THEN
    EXECUTE format(
      'SELECT string_agg(t.id::text, '','') FROM %I.tasks t
         JOIN jsonb_each_text($1) e ON e.key::uuid = t.id
        WHERE t.%I = $2 AND t.row_version <> e.value::int', p_schema, v_fk)
      INTO v_conflicts USING p_expected_versions, p_project_id;
    IF v_conflicts IS NOT NULL THEN
      RAISE EXCEPTION 'SCHEDULE_CONFLICT: % changed since you loaded the plan', v_conflicts
        USING HINT = 'Reload the plan and apply your change again.';
    END IF;
  END IF;

  -- 3. Calendar (defaults Mon–Fri when the project has none).
  EXECUTE format(
    'SELECT ARRAY_REMOVE(ARRAY[CASE WHEN sunday THEN 0 END, CASE WHEN monday THEN 1 END, CASE WHEN tuesday THEN 2 END,
            CASE WHEN wednesday THEN 3 END, CASE WHEN thursday THEN 4 END, CASE WHEN friday THEN 5 END,
            CASE WHEN saturday THEN 6 END], NULL)
       FROM %I.project_calendars WHERE %I = $1 AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1', p_schema, v_fk)
    INTO v_weekdays USING p_project_id;
  v_weekdays := COALESCE(v_weekdays, ARRAY[1, 2, 3, 4, 5]);
  EXECUTE format(
    'SELECT COALESCE(array_agg(exception_date) FILTER (WHERE NOT is_working_day), ''{}''),
            COALESCE(array_agg(exception_date) FILTER (WHERE is_working_day), ''{}'')
       FROM %I.project_calendar_exceptions WHERE %I = $1 AND COALESCE(is_deleted, FALSE) = FALSE', p_schema, v_fk)
    INTO v_holidays, v_extra USING p_project_id;

  -- 4. Project start.
  IF p_schema = 'sim' THEN
    SELECT start_date INTO v_start FROM sim.practice_projects WHERE id = p_project_id;
  ELSE
    SELECT planned_start_date INTO v_start FROM public.projects WHERE id = p_project_id;
  END IF;

  -- 5. Tasks and dependencies as engine input.
  EXECUTE format(
    'SELECT COALESCE(jsonb_agg(jsonb_build_object(
        ''id'', t.id,
        ''duration'', CASE WHEN COALESCE(t.is_milestone, FALSE) THEN 0
                           ELSE COALESCE(t.estimated_duration_days,
                                CASE WHEN t.planned_start_date IS NOT NULL AND t.planned_end_date IS NOT NULL
                                     THEN public.planning_working_days_between(t.planned_start_date, t.planned_end_date, $2, $3, $4) + 1 END,
                                1) END,
        ''mode'', t.schedule_mode, ''start'', t.planned_start_date,
        ''constraint_type'', t.constraint_type, ''constraint_date'', t.constraint_date)), ''[]''::jsonb)
       FROM %I.tasks t WHERE t.%I = $1 AND COALESCE(t.is_deleted, FALSE) = FALSE', p_schema, v_fk)
    INTO v_tasks USING p_project_id, v_weekdays, v_holidays, v_extra;
  EXECUTE format(
    'SELECT COALESCE(jsonb_agg(jsonb_build_object(''pred'', d.predecessor_task_id, ''succ'', d.successor_task_id,
            ''type'', CASE upper(COALESCE(d.dependency_type, ''FS''))
                        WHEN ''FINISH_TO_START'' THEN ''FS'' WHEN ''START_TO_START'' THEN ''SS''
                        WHEN ''FINISH_TO_FINISH'' THEN ''FF'' WHEN ''START_TO_FINISH'' THEN ''SF''
                        ELSE upper(COALESCE(d.dependency_type, ''FS'')) END,
            ''lag'', COALESCE(d.lag_days, 0))), ''[]''::jsonb)
       FROM %I.task_dependencies d JOIN %I.tasks t ON t.id = d.successor_task_id
      WHERE t.%I = $1 AND COALESCE(d.is_deleted, FALSE) = FALSE', p_schema, p_schema, v_fk)
    INTO v_deps USING p_project_id;

  -- 6. Compute (raises SCHEDULE_CYCLE on a loop).
  v_result := public.planning_schedule_compute(v_start, v_tasks, v_deps, v_weekdays, v_holidays, v_extra);

  -- 7. Write back. Auto tasks also move their planned dates; manual tasks keep theirs.
  EXECUTE format(
    'UPDATE %I.tasks t SET
        earliest_start_date  = (r.value->>''es'')::date,
        earliest_finish_date = (r.value->>''ef'')::date,
        latest_start_date    = (r.value->>''ls'')::date,
        latest_finish_date   = (r.value->>''lf'')::date,
        slack_days           = (r.value->>''slack'')::int,
        is_critical_path     = (r.value->>''critical'')::boolean,
        planned_start_date   = CASE WHEN t.schedule_mode = ''manual'' THEN t.planned_start_date ELSE (r.value->>''es'')::date END,
        planned_end_date     = CASE WHEN t.schedule_mode = ''manual'' THEN t.planned_end_date ELSE (r.value->>''ef'')::date END
       FROM jsonb_each($1->''tasks'') r
      WHERE t.id = r.key::uuid AND t.%I = $2', p_schema, v_fk)
    USING v_result, p_project_id;
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  -- 8. Audit (public projects only; audit_log.record_id is the project).
  IF p_schema = 'public' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, action_details, performed_by)
    VALUES ('tasks', p_project_id, 'schedule_recalculated',
            jsonb_build_object('tasks_updated', v_updated, 'project_finish', v_result->'project_finish'),
            (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1));
  END IF;

  RETURN jsonb_build_object('tasks_updated', v_updated, 'project_finish', v_result->'project_finish', 'tasks', v_result->'tasks');
END;
$$;

REVOKE ALL ON FUNCTION public.planning_recalculate_schedule_impl(TEXT, UUID, JSONB) FROM PUBLIC;

-- ── Public RPCs (access-checked wrappers) ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.recalculate_project_schedule(p_project_id UUID, p_expected_versions JSONB DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.auth_user_can_access_project(p_project_id) THEN
    RAISE EXCEPTION 'Not allowed to recalculate this project' USING ERRCODE = '42501';
  END IF;
  RETURN public.planning_recalculate_schedule_impl('public', p_project_id, p_expected_versions);
END;
$$;

CREATE OR REPLACE FUNCTION sim.recalculate_project_schedule(p_practice_project_id UUID, p_expected_versions JSONB DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sim, public
AS $$
BEGIN
  IF NOT sim.auth_user_can_access_practice_project(p_practice_project_id) THEN
    RAISE EXCEPTION 'Not allowed to recalculate this practice project' USING ERRCODE = '42501';
  END IF;
  RETURN public.planning_recalculate_schedule_impl('sim', p_practice_project_id, p_expected_versions);
END;
$$;

GRANT EXECUTE ON FUNCTION public.planning_is_working_day(DATE, INT[], DATE[], DATE[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.planning_add_working_days(DATE, INT, INT[], DATE[], DATE[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.planning_working_days_between(DATE, DATE, INT[], DATE[], DATE[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.planning_schedule_compute(DATE, JSONB, JSONB, INT[], DATE[], DATE[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.recalculate_project_schedule(UUID, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION sim.recalculate_project_schedule(UUID, JSONB) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE 'v1245: schedule engine + recalculate_project_schedule (public, sim) installed.';
END $$;
