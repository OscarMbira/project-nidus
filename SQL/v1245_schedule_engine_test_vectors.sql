-- ============================================================================
-- v1245 test vectors: the database engine must give the same answers as the JS preview engine
-- (packages/planning/src/engine/__tests__/schedule.test.js). Read-only; raises on the first
-- mismatch, prints PASS lines otherwise. Run after v1245.
-- ============================================================================
-- Prerequisite: the engine itself (SQL/v1245_recalculate_project_schedule_rpc.sql).
DO $$
BEGIN
  IF to_regprocedure('public.planning_schedule_compute(date, jsonb, jsonb, integer[], date[], date[])') IS NULL THEN
    RAISE EXCEPTION 'Run SQL/v1245_recalculate_project_schedule_rpc.sql first (it needs v1243 for tasks.row_version / schedule_mode). This file only tests it.';
  END IF;
END $$;

DO $$
DECLARE
  wk INT[] := ARRAY[1, 2, 3, 4, 5];
  hol DATE[] := ARRAY['2026-10-14'::date];   -- Wednesday holiday
  r JSONB;
BEGIN
  -- Working-day arithmetic
  IF public.planning_add_working_days('2026-10-12', 2, wk, hol, '{}') <> '2026-10-15' THEN RAISE EXCEPTION 'FAIL add 2 over holiday'; END IF;
  IF public.planning_add_working_days('2026-10-16', 1, wk, hol, '{}') <> '2026-10-19' THEN RAISE EXCEPTION 'FAIL Fri+1'; END IF;
  IF public.planning_add_working_days('2026-10-19', -1, wk, hol, '{}') <> '2026-10-16' THEN RAISE EXCEPTION 'FAIL Mon-1'; END IF;
  IF public.planning_add_working_days('2026-10-17', 0, wk, hol, '{}') <> '2026-10-19' THEN RAISE EXCEPTION 'FAIL weekend roll'; END IF;
  IF public.planning_working_days_between('2026-10-12', '2026-10-16', wk, hol, '{}') <> 3 THEN RAISE EXCEPTION 'FAIL between'; END IF;
  IF public.planning_working_days_between('2026-10-16', '2026-10-12', wk, hol, '{}') <> -3 THEN RAISE EXCEPTION 'FAIL between negative'; END IF;
  IF public.planning_add_working_days('2026-10-16', 1, wk, '{}', ARRAY['2026-10-17'::date]) <> '2026-10-17' THEN RAISE EXCEPTION 'FAIL extra working day'; END IF;
  RAISE NOTICE 'PASS working-day arithmetic';

  -- FS chain + critical path
  r := public.planning_schedule_compute('2026-10-12',
    '[{"id":"a","duration":2},{"id":"b","duration":3},{"id":"c","duration":1}]',
    '[{"pred":"a","succ":"b","type":"FS"},{"pred":"b","succ":"c","type":"FS"}]', wk, '{}', '{}');
  IF r#>>'{tasks,a,ef}' <> '2026-10-13' OR r#>>'{tasks,b,es}' <> '2026-10-14' OR r#>>'{tasks,b,ef}' <> '2026-10-16'
     OR r#>>'{tasks,c,es}' <> '2026-10-19' OR r->>'project_finish' <> '2026-10-19' OR (r#>>'{tasks,a,critical}')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'FAIL FS chain: %', r;
  END IF;
  RAISE NOTICE 'PASS FS chain';

  -- Parallel branch slack
  r := public.planning_schedule_compute('2026-10-12',
    '[{"id":"a","duration":1},{"id":"long","duration":5},{"id":"short","duration":1},{"id":"z","duration":1}]',
    '[{"pred":"a","succ":"long"},{"pred":"a","succ":"short"},{"pred":"long","succ":"z"},{"pred":"short","succ":"z"}]', wk, '{}', '{}');
  IF (r#>>'{tasks,short,slack}')::int <> 4 OR (r#>>'{tasks,long,critical}')::boolean IS NOT TRUE THEN RAISE EXCEPTION 'FAIL slack: %', r; END IF;
  RAISE NOTICE 'PASS parallel slack';

  -- SS / FF / SF
  r := public.planning_schedule_compute('2026-10-12', '[{"id":"p","duration":3},{"id":"s","duration":2}]', '[{"pred":"p","succ":"s","type":"SS","lag":1}]', wk, '{}', '{}');
  IF r#>>'{tasks,s,es}' <> '2026-10-13' THEN RAISE EXCEPTION 'FAIL SS: %', r; END IF;
  r := public.planning_schedule_compute('2026-10-12', '[{"id":"p","duration":3},{"id":"s","duration":2}]', '[{"pred":"p","succ":"s","type":"FF","lag":0}]', wk, '{}', '{}');
  IF r#>>'{tasks,s,ef}' <> '2026-10-14' OR r#>>'{tasks,s,es}' <> '2026-10-13' THEN RAISE EXCEPTION 'FAIL FF: %', r; END IF;
  r := public.planning_schedule_compute('2026-10-12', '[{"id":"p","duration":1,"constraint_type":"snet","constraint_date":"2026-10-16"},{"id":"s","duration":2}]', '[{"pred":"p","succ":"s","type":"SF","lag":0}]', wk, '{}', '{}');
  IF r#>>'{tasks,s,ef}' <> '2026-10-15' THEN RAISE EXCEPTION 'FAIL SF: %', r; END IF;
  RAISE NOTICE 'PASS SS / FF / SF';

  -- Lag across a holiday
  r := public.planning_schedule_compute('2026-10-12', '[{"id":"a","duration":1},{"id":"b","duration":1}]', '[{"pred":"a","succ":"b","type":"FS","lag":1}]', wk, hol, '{}');
  IF r#>>'{tasks,b,es}' <> '2026-10-15' THEN RAISE EXCEPTION 'FAIL lag over holiday: %', r; END IF;
  RAISE NOTICE 'PASS lag over holiday';

  -- Manual task drives successor
  r := public.planning_schedule_compute('2026-10-12', '[{"id":"m","duration":1,"mode":"manual","start":"2026-10-20"},{"id":"n","duration":1}]', '[{"pred":"m","succ":"n"}]', wk, '{}', '{}');
  IF r#>>'{tasks,m,es}' <> '2026-10-20' OR r#>>'{tasks,n,es}' <> '2026-10-21' THEN RAISE EXCEPTION 'FAIL manual: %', r; END IF;
  RAISE NOTICE 'PASS manual task';

  -- Constraints
  r := public.planning_schedule_compute('2026-10-12',
    '[{"id":"snet","duration":1,"constraint_type":"snet","constraint_date":"2026-10-15"},{"id":"mso","duration":1,"constraint_type":"mso","constraint_date":"2026-10-13"},{"id":"fnlt","duration":1,"constraint_type":"fnlt","constraint_date":"2026-10-12"},{"id":"end","duration":1}]',
    '[{"pred":"snet","succ":"end"}]', wk, '{}', '{}');
  IF r#>>'{tasks,snet,es}' <> '2026-10-15' OR r#>>'{tasks,mso,es}' <> '2026-10-13' OR r#>>'{tasks,fnlt,lf}' <> '2026-10-12'
     OR (r#>>'{tasks,fnlt,critical}')::boolean IS NOT TRUE THEN RAISE EXCEPTION 'FAIL constraints: %', r; END IF;
  RAISE NOTICE 'PASS constraints';

  -- Milestone
  r := public.planning_schedule_compute('2026-10-12', '[{"id":"a","duration":2},{"id":"ms","duration":0}]', '[{"pred":"a","succ":"ms"}]', wk, '{}', '{}');
  IF r#>>'{tasks,ms,es}' <> '2026-10-14' OR r#>>'{tasks,ms,ef}' <> '2026-10-14' THEN RAISE EXCEPTION 'FAIL milestone: %', r; END IF;
  RAISE NOTICE 'PASS milestone';

  -- Cycle
  BEGIN
    r := public.planning_schedule_compute('2026-10-12', '[{"id":"a","duration":1},{"id":"b","duration":1}]', '[{"pred":"a","succ":"b"},{"pred":"b","succ":"a"}]', wk, '{}', '{}');
    RAISE EXCEPTION 'FAIL cycle not detected';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'SCHEDULE_CYCLE%' THEN RAISE; END IF;
    RAISE NOTICE 'PASS cycle rejected';
  END;
END $$;

-- v1239 Slice 9.2: server recalculation target < 1 s at 1,000 tasks (engine only, no I/O).
DO $$
DECLARE
  v_tasks JSONB;
  v_deps JSONB;
  t0 TIMESTAMPTZ;
  ms NUMERIC;
  r JSONB;
BEGIN
  SELECT jsonb_agg(jsonb_build_object('id', 't' || i, 'duration', 1 + (i % 3))) INTO v_tasks FROM generate_series(0, 999) i;
  SELECT jsonb_agg(jsonb_build_object('pred', 't' || (i - 1), 'succ', 't' || i, 'type', 'FS')) INTO v_deps FROM generate_series(1, 999) i;
  t0 := clock_timestamp();
  r := public.planning_schedule_compute('2026-10-12', v_tasks, v_deps, ARRAY[1, 2, 3, 4, 5], '{}', '{}');
  ms := EXTRACT(EPOCH FROM clock_timestamp() - t0) * 1000;
  IF jsonb_typeof(r -> 'tasks') <> 'object' THEN RAISE EXCEPTION 'FAIL perf: no result'; END IF;
  IF ms > 1000 THEN RAISE EXCEPTION 'FAIL perf: 1,000-task recalculation took % ms (target < 1000)', round(ms); END IF;
  RAISE NOTICE 'PASS perf: 1,000 tasks recalculated in % ms', round(ms);
END $$;
