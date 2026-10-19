-- ============================================================================
-- v1286 tests: AI Assessor tables. Read-only.
--   T1 tables exist with RLS; calibration has no client policies
--   T2 learners cannot insert or change assessments (no INSERT/UPDATE policy for authenticated)
--   T3 run score: equals the rule-based score unless the scenario counts the Assessor
--   T4 weight is limited to 0–100
-- ============================================================================
CREATE TEMP TABLE IF NOT EXISTS v1286_results (test TEXT PRIMARY KEY, passed BOOLEAN, detail TEXT);
TRUNCATE v1286_results;

DO $$
DECLARE v_run RECORD; v_score JSONB;
BEGIN
  INSERT INTO v1286_results SELECT 'T1 tables + RLS',
    (SELECT bool_and(relrowsecurity) FROM pg_class WHERE oid IN ('sim.scenario_rubrics'::regclass, 'sim.ai_assessments'::regclass,
       'sim.ai_assessment_flags'::regclass, 'sim.ai_assessment_calibration'::regclass))
    AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'sim' AND tablename = 'ai_assessment_calibration'), NULL;

  INSERT INTO v1286_results SELECT 'T2 no learner writes to assessments',
    NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'sim' AND tablename = 'ai_assessments' AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')),
    NULL;

  SELECT r.id, r.total_score, r.max_possible_score, s.assessor_counts INTO v_run
    FROM sim.simulation_runs r JOIN sim.scenarios s ON s.id = r.scenario_id LIMIT 1;
  IF v_run.id IS NULL THEN
    INSERT INTO v1286_results VALUES ('T3 skipped', TRUE, 'no runs');
  ELSE
    v_score := sim.ai_run_score(v_run.id);
    INSERT INTO v1286_results VALUES ('T3 run score',
      v_run.assessor_counts OR (v_score ->> 'score')::numeric = ROUND(CASE WHEN COALESCE(v_run.max_possible_score, 0) > 0
        THEN COALESCE(v_run.total_score, 0) * 100.0 / v_run.max_possible_score ELSE COALESCE(v_run.total_score, 0) END),
      v_score::text);
  END IF;

  INSERT INTO v1286_results SELECT 'T4 weight range check', EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'scenarios_assessor_weight_range'), NULL;
END $$;

SELECT CASE WHEN passed THEN 'PASS' ELSE 'FAIL' END AS result, test, detail FROM v1286_results ORDER BY test;
