-- ============================================================================
-- v1276 tests: Ask Nidus query runner. Run after v1272–v1276.
--
--   T01 runner functions exist in public and sim; runner is STABLE (read-only) and SECURITY INVOKER
--   T02 unknown register refused
--   T03 unknown field refused
--   T04 SQL in a field name refused
--   T05 SQL in a value is treated as data (no error, no extra rows)
--   T06 row cap enforced
--   T07 count matches direct SQL on the view
--   T08 group by + having + aggregate alias sort
--   T09 link field (project_id.budget_amount) works
--   T10 RLS isolation: a signed-in stranger sees no projects through the runner
--   T11 planner scope: schedule/resources/dependencies have the planner edition, risks do not
--   T12 sim runner answers on sim data
--   T13 every catalogue field exists as a column of its view (public + sim)
-- ============================================================================

CREATE TEMP TABLE IF NOT EXISTS v1276_results (test TEXT PRIMARY KEY, passed BOOLEAN, detail TEXT);
TRUNCATE v1276_results;

DO $$
DECLARE
  r JSONB;
  v_err TEXT;
  v_direct BIGINT;
  v_missing TEXT;
BEGIN
  -- T01
  INSERT INTO v1276_results SELECT 'T01 runner exists, STABLE, invoker',
    COUNT(*) = 2 AND bool_and(p.provolatile = 's' AND NOT p.prosecdef), string_agg(n.nspname, ',')
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE p.proname = 'ai_run_query' AND n.nspname IN ('public', 'sim');

  -- T02
  BEGIN r := public.ai_run_query('{"entity":"pg_authid"}'); v_err := NULL; EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO v1276_results VALUES ('T02 unknown register refused', v_err LIKE 'AIQ:%', v_err);

  -- T03
  BEGIN r := public.ai_run_query('{"entity":"risks","fields":["password"]}'); v_err := NULL; EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO v1276_results VALUES ('T03 unknown field refused', v_err LIKE 'AIQ:%', v_err);

  -- T04
  BEGIN r := public.ai_run_query('{"entity":"risks","filters":[{"field":"status; DROP TABLE risks","op":"eq","value":"x"}]}'); v_err := NULL;
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO v1276_results VALUES ('T04 SQL in field name refused', v_err LIKE 'AIQ:%', v_err);

  -- T05
  BEGIN
    r := public.ai_run_query('{"entity":"risks","filters":[{"field":"title","op":"eq","value":"x'' OR ''1''=''1"}]}');
    v_err := NULL;
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO v1276_results VALUES ('T05 SQL in value is data', v_err IS NULL AND (r ->> 'total_count')::int = 0, COALESCE(v_err, r ->> 'total_count'));

  -- T06
  r := public.ai_run_query('{"entity":"projects","limit":100000}');
  INSERT INTO v1276_results VALUES ('T06 row cap enforced',
    (r ->> 'limit')::int = (SELECT query_row_cap FROM public.ai_platform_settings WHERE id), r ->> 'limit');

  -- T07 (runs as the SQL editor role, which sees all rows — same as the direct count)
  r := public.ai_run_query('{"entity":"risks","aggregates":[{"fn":"count","alias":"n"}]}');
  SELECT COUNT(*) INTO v_direct FROM public.ai_v_risks;
  INSERT INTO v1276_results VALUES ('T07 count matches direct SQL',
    COALESCE((r -> 'rows' -> 0 ->> 'n')::bigint, 0) = v_direct, (r -> 'rows' -> 0 ->> 'n') || ' vs ' || v_direct);

  -- T08
  BEGIN
    r := public.ai_run_query('{"entity":"risks","group_by":["project_name"],"aggregates":[{"fn":"count","alias":"risk_count"}],
                               "having":[{"aggregate":"risk_count","op":"gte","value":1}],"sort":[{"field":"risk_count","dir":"desc"}],"limit":5}');
    v_err := NULL;
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO v1276_results VALUES ('T08 group/having/sort', v_err IS NULL AND r ->> 'mode' = 'grouped', COALESCE(v_err, r ->> 'explanation'));

  -- T09
  BEGIN
    r := public.ai_run_query('{"entity":"risks","fields":["display_id","title","project_id.budget_amount"],"sort":[{"field":"project_id.budget_amount","dir":"desc"}],"limit":3}');
    v_err := NULL;
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO v1276_results VALUES ('T09 link field', v_err IS NULL AND (r -> 'columns') @> '[{"key":"project_id__budget_amount"}]', COALESCE(v_err, (r -> 'columns')::text));

  -- T10
  PERFORM set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, TRUE);
  PERFORM set_config('role', 'authenticated', TRUE);
  BEGIN
    r := public.ai_run_query('{"entity":"projects"}');
    v_err := NULL;
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  PERFORM set_config('role', 'postgres', TRUE);
  PERFORM set_config('request.jwt.claims', NULL, TRUE);
  INSERT INTO v1276_results VALUES ('T10 RLS isolation (stranger sees no projects)',
    v_err IS NULL AND (r ->> 'total_count')::int = 0, COALESCE(v_err, r ->> 'total_count'));

  -- T11
  INSERT INTO v1276_results SELECT 'T11 planner scope',
    bool_and(CASE WHEN entity_key IN ('projects', 'tasks', 'task_dependencies', 'baselines', 'resource_assignments', 'task_assignments')
                  THEN 'planner' = ANY (editions) ELSE NOT ('planner' = ANY (editions)) END),
    string_agg(entity_key || ':' || array_to_string(editions, '/'), ', ')
    FROM public.ai_catalogue_entities;

  -- T12
  BEGIN r := sim.ai_run_query('{"entity":"projects","limit":1}'); v_err := NULL; EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  INSERT INTO v1276_results VALUES ('T12 sim runner', v_err IS NULL AND r ? 'rows', v_err);

  -- T13
  SELECT string_agg(x.s || '.' || x.entity_key || '.' || x.field_key, ', ') INTO v_missing
    FROM (SELECT 'public' AS s, e.entity_key, e.view_name, f.field_key FROM public.ai_catalogue_entities e JOIN public.ai_catalogue_fields f USING (entity_key)
          UNION ALL
          SELECT 'sim', e.entity_key, e.view_name, f.field_key FROM sim.ai_catalogue_entities e JOIN sim.ai_catalogue_fields f USING (entity_key)) x
   WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns c
                      WHERE c.table_schema = x.s AND c.table_name = x.view_name AND c.column_name = x.field_key);
  INSERT INTO v1276_results VALUES ('T13 catalogue matches views', v_missing IS NULL, v_missing);
END $$;

SELECT CASE WHEN passed THEN 'PASS' ELSE 'FAIL' END AS result, test, detail FROM v1276_results ORDER BY test;
