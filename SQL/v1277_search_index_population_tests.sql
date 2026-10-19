-- ============================================================================
-- v1277 tests: search index population + keyword search. Run after v1277.
--   T1 sim.search_index exists with RLS; triggers exist on the source tables
--   T2 the old "every signed-in user reads everything" policy is gone
--   T3 index rows exist for existing records (if any risks exist)
--   T4 a soft-deleted record drops out of the index
--   T5 a stranger (no project access) gets no search hits
--   T6 an exact reference ranks first
-- ============================================================================

CREATE TEMP TABLE IF NOT EXISTS v1277_results (test TEXT PRIMARY KEY, passed BOOLEAN, detail TEXT);
TRUNCATE v1277_results;

DO $$
DECLARE
  v_risk RECORD;
  v_n INT;
  v_hits INT;
  v_first TEXT;
BEGIN
  INSERT INTO v1277_results VALUES ('T1 sim index + triggers',
    to_regclass('sim.search_index') IS NOT NULL
    AND (SELECT relrowsecurity FROM pg_class WHERE oid = 'sim.search_index'::regclass)
    AND (SELECT COUNT(*) FROM pg_trigger WHERE tgname = 'trg_ai_search_index') >= 20,
    (SELECT COUNT(*)::text FROM pg_trigger WHERE tgname = 'trg_ai_search_index'));

  INSERT INTO v1277_results SELECT 'T2 open read policy removed',
    NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'search_index'
                 AND policyname = 'policy_search_index_select' AND qual = '(is_deleted = false)')
    AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'search_index' AND policyname = 'policy_search_index_pmo_write'),
    NULL;

  SELECT r.id, COALESCE(r.risk_identifier, r.risk_code) AS ref INTO v_risk
    FROM public.risks r WHERE COALESCE(r.is_deleted, FALSE) = FALSE AND r.moved_to_history_at IS NULL
     AND COALESCE(r.risk_identifier, r.risk_code) IS NOT NULL LIMIT 1;

  IF v_risk.id IS NULL THEN
    INSERT INTO v1277_results VALUES ('T3-T6 skipped', TRUE, 'no risks to test with');
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_n FROM public.search_index WHERE entity_type = 'risks' AND entity_id = v_risk.id AND NOT is_deleted;
  INSERT INTO v1277_results VALUES ('T3 existing record indexed', v_n = 1, v_risk.ref);

  -- T6 (as the SQL editor role, which can see the row)
  SELECT title INTO v_first FROM public.ai_search_records(v_risk.ref, ARRAY['risks'], NULL, 5) LIMIT 1;
  INSERT INTO v1277_results VALUES ('T6 exact reference ranks first',
    v_first IS NOT NULL AND v_first = (SELECT title FROM public.search_index WHERE entity_type = 'risks' AND entity_id = v_risk.id),
    v_first);

  -- T5 stranger
  PERFORM set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, TRUE);
  PERFORM set_config('role', 'authenticated', TRUE);
  SELECT COUNT(*) INTO v_hits FROM public.ai_search_records(v_risk.ref, NULL, NULL, 10);
  PERFORM set_config('role', 'postgres', TRUE);
  PERFORM set_config('request.jwt.claims', NULL, TRUE);
  INSERT INTO v1277_results VALUES ('T5 stranger sees no hits', v_hits = 0, v_hits::text);

  -- T4 no soft-deleted risk is live in the index (read-only check; no data is changed)
  SELECT COUNT(*) INTO v_n FROM public.search_index si JOIN public.risks r ON r.id = si.entity_id
   WHERE si.entity_type = 'risks' AND NOT si.is_deleted AND COALESCE(r.is_deleted, FALSE);
  INSERT INTO v1277_results VALUES ('T4 soft-deleted records are not searchable', v_n = 0, v_n::text);
END $$;

SELECT CASE WHEN passed THEN 'PASS' ELSE 'FAIL' END AS result, test, detail FROM v1277_results ORDER BY test;
