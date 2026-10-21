-- ============================================================================
-- v1295 tests: Ask Nidus result drill-down. Run after v1295_ai_result_drilldown.sql.
-- Impersonates the oldest account owner (read-only: nothing is written).
--
--   T1  list_route column exists in public and sim, risks has a list page
--   T2  a grouped result returns list_route
--   T3  drilling into a grouped row returns exactly that row's count, as records (mode rows)
--   T4  drill on a blank group value matches blank records (no error)
--   T5  drill on two group fields (project + status) still matches that row's count
-- ============================================================================

CREATE TEMP TABLE IF NOT EXISTS v1295_results (test TEXT PRIMARY KEY, passed BOOLEAN, detail TEXT);
TRUNCATE v1295_results;

DO $$
DECLARE
  v_owner_auth UUID;
  v_grouped    JSONB;
  v_row        JSONB;
  v_drill      JSONB;
  v_spec       JSONB;
BEGIN
  INSERT INTO v1295_results VALUES ('T1 list_route column + risks list page',
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_catalogue_entities' AND column_name = 'list_route')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'sim' AND table_name = 'ai_catalogue_entities' AND column_name = 'list_route')
    AND (SELECT list_route FROM public.ai_catalogue_entities WHERE entity_key = 'risks') = '/platform/risks',
    (SELECT list_route FROM public.ai_catalogue_entities WHERE entity_key = 'risks'));

  SELECT u.auth_user_id INTO v_owner_auth
    FROM public.accounts a JOIN public.users u ON u.id = a.owner_user_id
   WHERE u.auth_user_id IS NOT NULL AND COALESCE(a.is_deleted, FALSE) = FALSE
   ORDER BY a.created_at LIMIT 1;
  IF v_owner_auth IS NULL THEN
    INSERT INTO v1295_results VALUES ('T2-T5 skipped', TRUE, 'no account owner to test with');
    RETURN;
  END IF;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner_auth, 'role', 'authenticated')::text, TRUE);

  -- T2 / T3: risks grouped by status
  v_spec := jsonb_build_object('entity', 'risks', 'group_by', jsonb_build_array('status'),
              'aggregates', jsonb_build_array(jsonb_build_object('fn', 'count', 'alias', 'n')),
              'sort', jsonb_build_array(jsonb_build_object('field', 'n', 'dir', 'desc')));
  v_grouped := public.ai_run_query_in('public', v_spec);
  INSERT INTO v1295_results VALUES ('T2 grouped result returns list_route', v_grouped ->> 'list_route' = '/platform/risks', v_grouped ->> 'list_route');

  v_row := v_grouped -> 'rows' -> 0;
  IF v_row IS NULL THEN
    INSERT INTO v1295_results VALUES ('T3-T5 skipped', TRUE, 'no risks visible to the test user');
  ELSE
    BEGIN
      v_drill := public.ai_run_query_in('public', v_spec || jsonb_build_object('drill', jsonb_build_object('status', v_row -> 'status'), 'limit', 500));
      INSERT INTO v1295_results VALUES ('T3 drill returns that row''s records',
        v_drill ->> 'mode' = 'rows' AND (v_drill ->> 'total_count')::int = (v_row ->> 'n')::int,
        format('row count %s, drill %s — %s', v_row ->> 'n', v_drill ->> 'total_count', v_drill ->> 'explanation'));
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO v1295_results VALUES ('T3 drill returns that row''s records', FALSE, SQLERRM);
    END;

    BEGIN
      v_drill := public.ai_run_query_in('public', v_spec || jsonb_build_object('drill', jsonb_build_object('status', NULL)));
      INSERT INTO v1295_results VALUES ('T4 drill on a blank value', v_drill ->> 'mode' = 'rows', v_drill ->> 'explanation');
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO v1295_results VALUES ('T4 drill on a blank value', FALSE, SQLERRM);
    END;

    BEGIN
      v_spec := jsonb_set(v_spec, '{group_by}', jsonb_build_array('project_name', 'status'));
      v_grouped := public.ai_run_query_in('public', v_spec);
      v_row := v_grouped -> 'rows' -> 0;
      v_drill := public.ai_run_query_in('public', v_spec || jsonb_build_object(
                   'drill', jsonb_build_object('project_name', v_row -> 'project_name', 'status', v_row -> 'status'), 'limit', 500));
      INSERT INTO v1295_results VALUES ('T5 drill on project + status',
        (v_drill ->> 'total_count')::int = (v_row ->> 'n')::int,
        format('row count %s, drill %s', v_row ->> 'n', v_drill ->> 'total_count'));
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO v1295_results VALUES ('T5 drill on project + status', FALSE, SQLERRM);
    END;
  END IF;

  PERFORM set_config('request.jwt.claims', NULL, TRUE);
END $$;

SELECT CASE WHEN passed THEN 'PASS' ELSE 'FAIL' END AS result, test, detail FROM v1295_results ORDER BY test;
