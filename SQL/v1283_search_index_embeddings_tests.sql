-- ============================================================================
-- v1283 tests: meaning search. Run after v1283. Checks that change data run inside a block that
-- raises at the end, so every change is rolled back.
--   T1 columns + HNSW index exist on public and sim search_index
--   T2 D23 types get embedding text, others do not
--   T3 a changed record goes back into the embedding queue
--   T4 a stranger gets no meaning-search results (access filter first)
--   T5 an exact reference ranks first in hybrid results
--   T6 a soft-deleted record drops out of hybrid results
--   T7 a row that failed 3 times leaves the queue and keeps its error
-- ============================================================================

SET search_path = public, extensions;

CREATE TEMP TABLE IF NOT EXISTS v1283_results (test TEXT PRIMARY KEY, passed BOOLEAN, detail TEXT);
TRUNCATE v1283_results;

DO $$
DECLARE
  v_vec TEXT := '[' || array_to_string(array_fill(0.01::float8, ARRAY[384]), ',') || ']';
  v_risk RECORD;
  v_n INT;
  v_first TEXT;
  v_ok BOOLEAN;
BEGIN
  INSERT INTO v1283_results SELECT 'T1 columns + hnsw index',
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'search_index' AND table_schema IN ('public', 'sim')
       AND column_name IN ('embedding', 'embed_text', 'content_hash', 'embedding_model', 'embedded_at', 'embed_attempts', 'embed_error', 'content_lang')) = 16
    AND (SELECT COUNT(*) FROM pg_indexes WHERE indexname IN ('idx_public_search_index_embedding', 'idx_sim_search_index_embedding')) = 2, NULL;

  INSERT INTO v1283_results SELECT 'T2 embedding text only for D23 types',
    NOT EXISTS (SELECT 1 FROM public.search_index WHERE embed_text IS NOT NULL AND entity_type IN ('projects', 'milestones', 'change_requests', 'stakeholders'))
    AND NOT EXISTS (SELECT 1 FROM public.search_index WHERE embed_text IS NULL AND entity_type = 'risks' AND NOT is_deleted
                     AND btrim(title) NOT IN ('', '(untitled)')),
    (SELECT string_agg(DISTINCT entity_type, ', ') FROM public.search_index WHERE embed_text IS NOT NULL);

  SELECT r.id, COALESCE(r.risk_identifier, r.risk_code) AS ref, si.id AS si_id INTO v_risk
    FROM public.risks r JOIN public.search_index si ON si.entity_type = 'risks' AND si.entity_id = r.id AND NOT si.is_deleted
   WHERE COALESCE(r.risk_identifier, r.risk_code) IS NOT NULL LIMIT 1;
  IF v_risk.id IS NULL THEN
    INSERT INTO v1283_results VALUES ('T3-T7 skipped', TRUE, 'no indexed risks to test with');
    RETURN;
  END IF;

  -- T3 re-queue on change
  BEGIN
    UPDATE public.search_index SET embedding = v_vec::vector, embedded_at = NOW() WHERE id = v_risk.si_id;
    UPDATE public.risks SET risk_description = COALESCE(risk_description, '') || ' (v1283 test)' WHERE id = v_risk.id;
    SELECT (embedding IS NULL AND embed_attempts = 0) INTO v_ok FROM public.search_index WHERE id = v_risk.si_id;
    RAISE EXCEPTION 'rollback';
  EXCEPTION WHEN raise_exception THEN NULL;
  END;
  INSERT INTO v1283_results VALUES ('T3 changed record re-queued', COALESCE(v_ok, FALSE), NULL);

  -- T4 stranger
  PERFORM set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, TRUE);
  PERFORM set_config('role', 'authenticated', TRUE);
  SELECT COUNT(*) INTO v_n FROM public.ai_hybrid_search('risk', v_vec, NULL, NULL, 20);
  PERFORM set_config('role', 'postgres', TRUE);
  PERFORM set_config('request.jwt.claims', NULL, TRUE);
  INSERT INTO v1283_results VALUES ('T4 stranger gets nothing', v_n = 0, v_n::text);

  -- T5 exact reference first (as the SQL editor role)
  SELECT display_id INTO v_first FROM public.ai_hybrid_search(v_risk.ref, v_vec, NULL, NULL, 5) LIMIT 1;
  INSERT INTO v1283_results VALUES ('T5 exact reference ranks first', v_first = v_risk.ref, v_first);

  -- T6 soft delete
  v_ok := NULL;
  BEGIN
    UPDATE public.risks SET is_deleted = TRUE WHERE id = v_risk.id;
    SELECT NOT EXISTS (SELECT 1 FROM public.ai_hybrid_search(v_risk.ref, v_vec, ARRAY['risks'], NULL, 20) h WHERE h.entity_id = v_risk.id) INTO v_ok;
    RAISE EXCEPTION 'rollback';
  EXCEPTION WHEN raise_exception THEN NULL;
  END;
  INSERT INTO v1283_results VALUES ('T6 deleted record drops out', COALESCE(v_ok, FALSE), NULL);

  -- T7 failures
  v_ok := NULL;
  BEGIN
    UPDATE public.search_index SET embedding = NULL, embed_attempts = 0 WHERE id = v_risk.si_id;
    PERFORM public.ai_embed_failed('public', v_risk.si_id, 'test failure');
    PERFORM public.ai_embed_failed('public', v_risk.si_id, 'test failure');
    PERFORM public.ai_embed_failed('public', v_risk.si_id, 'test failure');
    SELECT NOT EXISTS (SELECT 1 FROM public.ai_embed_pending('public', 200) p WHERE p.id = v_risk.si_id)
           AND (SELECT embed_error = 'test failure' FROM public.search_index WHERE id = v_risk.si_id) INTO v_ok;
    RAISE EXCEPTION 'rollback';
  EXCEPTION WHEN raise_exception THEN NULL;
  END;
  INSERT INTO v1283_results VALUES ('T7 failed rows leave the queue with their error', COALESCE(v_ok, FALSE), NULL);
END $$;

SELECT CASE WHEN passed THEN 'PASS' ELSE 'FAIL' END AS result, test, detail FROM v1283_results ORDER BY test;
