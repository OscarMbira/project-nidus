-- ============================================================================
-- v1265 S1 tests: summary expansion and roll-up (pure functions, no table rows needed).
-- Same cases as packages/planning/src/services/__tests__/planOutline.test.js. Run after v1265.
--
--   T1 only leaves are scheduled
--   T2 a link into a summary reaches every leaf under it
--   T3 a link out of a summary leaves from every leaf under it
--   T4 links between a summary and its own sub-task are ignored
--   T5 roll-up: earliest start, latest finish, critical if any leaf is
--   T6 roll-up % complete weighted by duration (90d @100% + 10d @0% = 90%)
--   T7 nested summaries roll up through every level
--   T8 columns exist in both schemas
-- ============================================================================

CREATE TEMP TABLE IF NOT EXISTS v1265_results (test TEXT PRIMARY KEY, passed BOOLEAN, detail TEXT);
TRUNCATE v1265_results;

DO $$
DECLARE
  -- S (summary) has children A, B; X is a separate task; N (summary) ⊃ M (summary) ⊃ L (leaf)
  v_tasks JSONB := '[
    {"id":"S","parent":null},{"id":"A","parent":"S"},{"id":"B","parent":"S"},{"id":"X","parent":null},
    {"id":"N","parent":null},{"id":"M","parent":"N"},{"id":"L","parent":"M"}]';
  v_exp JSONB;
  v_ids TEXT;
  v_pairs TEXT;
  v_roll JSONB;
BEGIN
  -- T1
  v_exp := public.planning_expand_summaries(v_tasks, '[]');
  SELECT string_agg(e->>'id', ',' ORDER BY e->>'id') INTO v_ids FROM jsonb_array_elements(v_exp->'tasks') e;
  INSERT INTO v1265_results VALUES ('T1 only leaves are scheduled', v_ids = 'A,B,L,X', v_ids);

  -- T2
  v_exp := public.planning_expand_summaries(v_tasks, '[{"pred":"X","succ":"S","type":"FS","lag":2}]');
  SELECT string_agg((e->>'pred') || '>' || (e->>'succ') || ':' || (e->>'lag'), ',' ORDER BY e->>'succ') INTO v_pairs FROM jsonb_array_elements(v_exp->'deps') e;
  INSERT INTO v1265_results VALUES ('T2 link into summary reaches every leaf', v_pairs = 'X>A:2,X>B:2', v_pairs);

  -- T3
  v_exp := public.planning_expand_summaries(v_tasks, '[{"pred":"S","succ":"X","type":"FS","lag":0}]');
  SELECT string_agg((e->>'pred') || '>' || (e->>'succ'), ',' ORDER BY e->>'pred') INTO v_pairs FROM jsonb_array_elements(v_exp->'deps') e;
  INSERT INTO v1265_results VALUES ('T3 link out of summary leaves from every leaf', v_pairs = 'A>X,B>X', v_pairs);

  -- T4
  v_exp := public.planning_expand_summaries(v_tasks, '[{"pred":"S","succ":"A"},{"pred":"L","succ":"N"}]');
  INSERT INTO v1265_results VALUES ('T4 summary-to-own-descendant links ignored',
    jsonb_array_length(v_exp->'deps') = 0, (v_exp->'deps')::text);

  -- T5 / T6 / T7
  v_roll := public.planning_rollup_summaries('[
    {"id":"S","parent":null},
    {"id":"A","parent":"S","duration":90,"pct":100,"start":"2026-01-05","finish":"2026-05-08","es":"2026-01-05","ef":"2026-05-08","slack":0,"critical":true},
    {"id":"B","parent":"S","duration":10,"pct":0,"start":"2026-02-02","finish":"2026-02-13","es":"2026-02-02","ef":"2026-02-13","slack":5,"critical":false},
    {"id":"N","parent":null},{"id":"M","parent":"N"},
    {"id":"L","parent":"M","duration":3,"pct":50,"start":"2026-03-02","finish":"2026-03-04","slack":1,"critical":false}]');
  INSERT INTO v1265_results VALUES ('T5 roll-up dates / critical',
    v_roll->'S'->>'start' = '2026-01-05' AND v_roll->'S'->>'finish' = '2026-05-08' AND (v_roll->'S'->>'critical')::boolean AND (v_roll->'S'->>'slack')::int = 0,
    (v_roll->'S')::text);
  INSERT INTO v1265_results VALUES ('T6 % complete weighted by duration', (v_roll->'S'->>'pct')::numeric = 90, v_roll->'S'->>'pct');
  INSERT INTO v1265_results VALUES ('T7 nested summaries roll up',
    v_roll->'N'->>'start' = '2026-03-02' AND v_roll->'M'->>'finish' = '2026-03-04' AND (v_roll->'N'->>'pct')::numeric = 50,
    (v_roll - 'S')::text);

  -- T8
  INSERT INTO v1265_results VALUES ('T8 columns exist in public and sim',
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema IN ('public', 'sim') AND table_name = 'tasks'
      AND column_name IN ('outline_position', 'wbs_code')) = 4, NULL);
END $$;

SELECT CASE WHEN passed THEN 'PASS' ELSE 'FAIL' END AS result, test, detail FROM v1265_results ORDER BY test;
