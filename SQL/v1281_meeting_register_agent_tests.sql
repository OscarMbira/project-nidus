-- ============================================================================
-- v1281 tests: Meeting-to-Register staging. Run after v1281. Read-only (no data is changed).
--   T1 decisions staging tables exist in public and sim, with RLS
--   T2 enrichment columns exist on all eight staging tables
--   T3 'merged' is an allowed status on the staging tables
--   T4 record-update tables exist with RLS
--   T5 a stranger (no session user) may not file any meeting
--   T6 no staging table has an open (USING true) policy
-- ============================================================================

CREATE TEMP TABLE IF NOT EXISTS v1281_results (test TEXT PRIMARY KEY, passed BOOLEAN, detail TEXT);
TRUNCATE v1281_results;

DO $$
DECLARE
  v_missing TEXT;
  v_meeting UUID;
  v_ok BOOLEAN;
BEGIN
  INSERT INTO v1281_results VALUES ('T1 decisions staging + RLS',
    to_regclass('public.comm_meeting_extracted_decisions') IS NOT NULL AND to_regclass('sim.comm_meeting_extracted_decisions') IS NOT NULL
    AND (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.comm_meeting_extracted_decisions'::regclass)
    AND (SELECT relrowsecurity FROM pg_class WHERE oid = 'sim.comm_meeting_extracted_decisions'::regclass), NULL);

  SELECT string_agg(s || '.' || t || '.' || c, ', ') INTO v_missing
    FROM unnest(ARRAY['public', 'sim']) s
    CROSS JOIN unnest(ARRAY['comm_meeting_extracted_issues', 'comm_meeting_extracted_risks', 'comm_meeting_action_items', 'comm_meeting_extracted_decisions']) t
    CROSS JOIN unnest(ARRAY['duplicate_of_id', 'duplicate_score', 'suggested_owner_id', 'suggested_due_date', 'mapped_values', 'agent_enriched_at']) c
   WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns ic WHERE ic.table_schema = s AND ic.table_name = t AND ic.column_name = c);
  INSERT INTO v1281_results VALUES ('T2 enrichment columns', v_missing IS NULL, v_missing);

  INSERT INTO v1281_results SELECT 'T3 merged status allowed', COUNT(*) = 6, COUNT(*)::text
    FROM pg_constraint
   WHERE contype = 'c' AND pg_get_constraintdef(oid) LIKE '%merged%'
     AND conrelid IN ('public.comm_meeting_extracted_issues'::regclass, 'public.comm_meeting_extracted_risks'::regclass,
                      'public.comm_meeting_action_items'::regclass, 'sim.comm_meeting_extracted_issues'::regclass,
                      'sim.comm_meeting_extracted_risks'::regclass, 'sim.comm_meeting_action_items'::regclass);

  INSERT INTO v1281_results VALUES ('T4 record updates + RLS',
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.comm_meeting_record_updates'::regclass)
    AND (SELECT relrowsecurity FROM pg_class WHERE oid = 'sim.comm_meeting_record_updates'::regclass), NULL);

  SELECT id INTO v_meeting FROM public.comm_meetings LIMIT 1;
  IF v_meeting IS NULL THEN
    INSERT INTO v1281_results VALUES ('T5 skipped', TRUE, 'no meetings to test with');
  ELSE
    PERFORM set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, TRUE);
    PERFORM set_config('role', 'authenticated', TRUE);
    v_ok := public.comm_user_can_file_meeting(v_meeting);
    PERFORM set_config('role', 'postgres', TRUE);
    PERFORM set_config('request.jwt.claims', NULL, TRUE);
    INSERT INTO v1281_results VALUES ('T5 stranger cannot file a meeting', v_ok = FALSE, v_ok::text);
  END IF;

  INSERT INTO v1281_results SELECT 'T6 no open staging policies', COUNT(*) = 0,
         string_agg(schemaname || '.' || tablename || ':' || policyname, ', ')
    FROM pg_policies
   WHERE tablename IN ('comm_meeting_extracted_issues', 'comm_meeting_extracted_risks', 'comm_meeting_action_items',
                       'comm_meeting_extracted_decisions', 'comm_meeting_record_updates')
     AND (qual = 'true' OR with_check = 'true');
END $$;

SELECT CASE WHEN passed THEN 'PASS' ELSE 'FAIL' END AS result, test, detail FROM v1281_results ORDER BY test;
