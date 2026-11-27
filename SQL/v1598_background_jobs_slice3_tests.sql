-- ============================================================================
-- v1598 tests: background jobs Slice 3 (v1352) — context fix, log retention (D11 + retention list), storage
-- clean-up scan, Simulator housekeeping, weekly data check, manual jobs. Run after v1596 and v1597.
-- Everything runs in one transaction that ROLLS BACK at the end: nothing is kept, no table is created
-- (test state lives in transaction settings). The worker is not woken (its address is cleared inside the
-- transaction). Each block raises an exception (the editor shows the failing test) or a NOTICE "PASS …".
-- Blocks that need data the database does not have print "SKIP …" instead.
--
--   T1  job functions with a defaulted jsonb argument get the tick's context ('context' shape)
--   T2  retention_target_problem: valid target, missing table / column, refused schema
--   T3  D11 run history: succeeded runs after 90 days, failed runs after 365 days, running runs never;
--       finished work items the same, waiting items never; dry run deletes nothing
--   T4  retention list: an old marker is purged, a recent one kept; a target whose table is missing is
--       skipped and reported without stopping the others; v1356's insert shape still works
--   T5  storage scan: URL / path references, safety window, report only until deletion is on, dry run;
--       a bucket with a missing reference column is skipped
--   T6  Simulator housekeeping: an idle practice run becomes abandoned, a recent one is untouched
--   T7  weekly data check: counts per check, a broken check is skipped, one notice per admin, once a week
--   T8  manual jobs and catalogue: no schedule for back-fill / re-index, dry runs, Slice 3 jobs registered
-- ============================================================================

BEGIN;

UPDATE public.background_job_config SET functions_base_url = NULL WHERE id;
UPDATE public.background_job_settings SET success_retention_days = 90, failure_retention_days = 365 WHERE id;

-- T1 ─────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  ASSERT public.background_job_function_shape('public.run_due_reminders') = 'context', 'T1 reminders get the context';
  ASSERT public.background_job_function_shape('public.run_retention_purge') = 'context', 'T1 retention gets the context';
  ASSERT public.background_job_function_shape('public.background_job_wake_for_ready_items') = 'jsonb', 'T1 no-argument job unchanged';
  ASSERT public.background_job_function_shape('public.v1598_no_such_function') IS NULL, 'T1 unknown function';
  RAISE NOTICE 'PASS T1 context shape';
END $$;

-- T2 ─────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  ASSERT public.retention_target_problem('public', 'background_job_runs', 'started_at', 'status') IS NULL, 'T2 valid target';
  ASSERT public.retention_target_problem('public', 'v1598_missing_table', 'created_at', NULL) = 'table not found', 'T2 missing table';
  ASSERT public.retention_target_problem('public', 'background_job_runs', 'v1598_col', NULL) = 'date column not found', 'T2 missing column';
  ASSERT public.retention_target_problem('public', 'background_job_runs', 'status', NULL) = 'date column is not a date or time', 'T2 not a date';
  ASSERT public.retention_target_problem('public', 'background_job_runs', 'started_at', 'v1598_col') = 'status column not found', 'T2 missing status column';
  ASSERT public.retention_target_problem('auth', 'users', 'created_at', NULL) = 'schema not allowed', 'T2 refused schema';
  RAISE NOTICE 'PASS T2 target checks';
END $$;

-- T3 ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_res JSONB;
BEGIN
  INSERT INTO public.background_job_runs (job_code, status, triggered_by, reason, started_at, finished_at) VALUES
    ('retention.purge', 'succeeded', 'manual', 'v1598-ok-old',     NOW() - INTERVAL '100 days', NOW() - INTERVAL '100 days'),
    ('retention.purge', 'succeeded', 'manual', 'v1598-ok-new',     NOW() - INTERVAL '10 days',  NOW() - INTERVAL '10 days'),
    ('retention.purge', 'failed',    'manual', 'v1598-fail-mid',   NOW() - INTERVAL '100 days', NOW() - INTERVAL '100 days'),
    ('retention.purge', 'failed',    'manual', 'v1598-fail-old',   NOW() - INTERVAL '400 days', NOW() - INTERVAL '400 days'),
    ('retention.purge', 'running',   'manual', 'v1598-running-old', NOW() - INTERVAL '400 days', NULL);
  INSERT INTO public.background_job_queue (job_code, status, payload, finished_at, created_at, dedupe_key) VALUES
    ('storage.cleanup', 'succeeded', '{}'::jsonb, NOW() - INTERVAL '100 days', NOW() - INTERVAL '100 days', 'v1598-ok-old'),
    ('storage.cleanup', 'dead',      '{}'::jsonb, NOW() - INTERVAL '100 days', NOW() - INTERVAL '100 days', 'v1598-dead-mid'),
    ('storage.cleanup', 'pending',   '{}'::jsonb, NULL,                         NOW() - INTERVAL '900 days', 'v1598-pending-old');

  v_res := public.run_retention_purge('{"dry_run": true}');
  ASSERT (v_res ->> 'dry_run')::BOOLEAN, 'T3 dry run flagged';
  ASSERT (SELECT count(*) FROM public.background_job_runs WHERE reason LIKE 'v1598-%') = 5, 'T3 dry run deletes nothing';
  ASSERT (v_res #>> '{run_history,runs_succeeded}')::INT >= 1, 'T3 dry run counts the old success';

  v_res := public.run_retention_purge('{}'::jsonb);
  ASSERT NOT EXISTS (SELECT 1 FROM public.background_job_runs WHERE reason = 'v1598-ok-old'), 'T3 old success purged';
  ASSERT EXISTS (SELECT 1 FROM public.background_job_runs WHERE reason = 'v1598-ok-new'), 'T3 recent success kept';
  ASSERT EXISTS (SELECT 1 FROM public.background_job_runs WHERE reason = 'v1598-fail-mid'), 'T3 failure kept for a year';
  ASSERT NOT EXISTS (SELECT 1 FROM public.background_job_runs WHERE reason = 'v1598-fail-old'), 'T3 year-old failure purged';
  ASSERT EXISTS (SELECT 1 FROM public.background_job_runs WHERE reason = 'v1598-running-old'), 'T3 running run never purged';
  ASSERT NOT EXISTS (SELECT 1 FROM public.background_job_queue WHERE dedupe_key = 'v1598-ok-old'), 'T3 finished item purged';
  ASSERT EXISTS (SELECT 1 FROM public.background_job_queue WHERE dedupe_key = 'v1598-dead-mid'), 'T3 dead item kept for a year';
  ASSERT EXISTS (SELECT 1 FROM public.background_job_queue WHERE dedupe_key = 'v1598-pending-old'), 'T3 waiting item never purged';
  ASSERT NOT (v_res ->> 'dry_run')::BOOLEAN, 'T3 real run';
  RAISE NOTICE 'PASS T3 run history (D11)';
END $$;

-- T4 ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_res JSONB;
BEGIN
  INSERT INTO public.background_job_markers (job_code, marker_key, created_at) VALUES
    ('v1598.test', 'old', NOW() - INTERVAL '500 days'),
    ('v1598.test', 'new', NOW() - INTERVAL '5 days');
  INSERT INTO public.retention_targets (table_schema, table_name, date_column, retain_days, is_active)
  VALUES ('public', 'v1598_missing_table', 'created_at', 30, TRUE);
  -- v1586 (v1356) shape and conflict target
  INSERT INTO public.retention_targets (table_schema, table_name, date_column, retain_days) VALUES
    ('public', 'v1598_shape_check', 'created_at', 90)
  ON CONFLICT (table_schema, table_name) DO UPDATE SET retain_days = EXCLUDED.retain_days, is_active = TRUE;
  ASSERT (SELECT batch_size FROM public.retention_targets WHERE table_name = 'v1598_shape_check') = 5000, 'T4 defaults filled';

  v_res := public.run_retention_purge('{}'::jsonb);
  ASSERT NOT EXISTS (SELECT 1 FROM public.background_job_markers WHERE job_code = 'v1598.test' AND marker_key = 'old'), 'T4 old marker purged';
  ASSERT EXISTS (SELECT 1 FROM public.background_job_markers WHERE job_code = 'v1598.test' AND marker_key = 'new'), 'T4 recent marker kept';
  ASSERT EXISTS (SELECT 1 FROM jsonb_array_elements(v_res -> 'targets') e
                  WHERE e ->> 'table' = 'public.v1598_missing_table' AND e ->> 'skipped' = 'table not found'), 'T4 missing table reported';
  ASSERT (SELECT last_result FROM public.retention_targets WHERE table_name = 'v1598_missing_table') LIKE 'skipped:%', 'T4 skip recorded';
  ASSERT (SELECT last_result FROM public.retention_targets WHERE table_schema = 'public' AND table_name = 'background_job_markers') = 'ok',
    'T4 marker target recorded ok';
  ASSERT NOT EXISTS (SELECT 1 FROM public.retention_targets WHERE table_name = 'audit_log' AND is_active), 'T4 audit log seeded off';
  RAISE NOTICE 'PASS T4 retention list';
END $$;

-- T5 ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_res    JSONB;
  v_bucket JSONB;
BEGIN
  ASSERT public.storage_cleanup_normalise('https://x.example/storage/v1/object/public/v1598-test/kept/a.pdf?token=1', 'v1598-test') = 'kept/a.pdf',
    'T5 public URL normalised';
  ASSERT public.storage_cleanup_normalise('kept/a.pdf', 'v1598-test') = 'kept/a.pdf', 'T5 plain path unchanged';
  ASSERT public.storage_cleanup_normalise('v1598-test/kept/a.pdf', 'v1598-test') = 'kept/a.pdf', 'T5 bucket prefix dropped';
  ASSERT public.storage_cleanup_normalise('  ', 'v1598-test') IS NULL, 'T5 blank is no reference';

  -- a bucket that does not exist in Storage is skipped
  INSERT INTO public.storage_cleanup_buckets (bucket_id, min_age_days) VALUES ('v1598-missing-bucket', 30);
  INSERT INTO public.storage_cleanup_references (bucket_id, ref_schema, ref_table, ref_column)
  VALUES ('v1598-missing-bucket', 'public', 'storage_cleanup_buckets', 'notes');
  v_res := public.storage_cleanup_scan(TRUE);
  v_bucket := (SELECT e FROM jsonb_array_elements(v_res -> 'buckets') e WHERE e ->> 'bucket' = 'v1598-missing-bucket');
  ASSERT v_bucket ->> 'skipped' = 'bucket not found', 'T5 unknown bucket skipped';

  BEGIN
    INSERT INTO storage.buckets (id, name, public) VALUES ('v1598-test', 'v1598-test', FALSE);
    INSERT INTO storage.objects (bucket_id, name, created_at) VALUES
      ('v1598-test', 'kept/a.pdf',   NOW() - INTERVAL '60 days'),
      ('v1598-test', 'lost/b.pdf',   NOW() - INTERVAL '60 days'),
      ('v1598-test', 'lost/new.pdf', NOW());
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'SKIP T5 storage objects (cannot create test files here: %)', SQLERRM;
    RETURN;
  END;
  -- the bucket row's own notes column serves as the reference column for this test
  INSERT INTO public.storage_cleanup_buckets (bucket_id, min_age_days, delete_enabled, notes)
  VALUES ('v1598-test', 30, FALSE, 'https://x.example/storage/v1/object/public/v1598-test/kept/a.pdf?token=1');
  INSERT INTO public.storage_cleanup_references (bucket_id, ref_schema, ref_table, ref_column)
  VALUES ('v1598-test', 'public', 'storage_cleanup_buckets', 'notes');

  v_res := public.storage_cleanup_scan(FALSE);
  v_bucket := (SELECT e FROM jsonb_array_elements(v_res -> 'buckets') e WHERE e ->> 'bucket' = 'v1598-test');
  ASSERT (v_bucket ->> 'old_files')::INT = 2, 'T5 only files past the safety window';
  ASSERT (v_bucket ->> 'orphans')::INT = 1, 'T5 one orphan';
  ASSERT jsonb_array_length(v_bucket -> 'paths') = 0, 'T5 report only while deletion is off';
  ASSERT (SELECT last_orphan_count FROM public.storage_cleanup_buckets WHERE bucket_id = 'v1598-test') = 1, 'T5 scan recorded';

  UPDATE public.storage_cleanup_buckets SET delete_enabled = TRUE WHERE bucket_id = 'v1598-test';
  v_res := public.storage_cleanup_scan(FALSE);
  v_bucket := (SELECT e FROM jsonb_array_elements(v_res -> 'buckets') e WHERE e ->> 'bucket' = 'v1598-test');
  ASSERT v_bucket -> 'paths' = '["lost/b.pdf"]'::jsonb, 'T5 only the orphan is listed for deletion';
  v_res := public.storage_cleanup_scan(TRUE);
  v_bucket := (SELECT e FROM jsonb_array_elements(v_res -> 'buckets') e WHERE e ->> 'bucket' = 'v1598-test');
  ASSERT jsonb_array_length(v_bucket -> 'paths') = 0, 'T5 dry run lists nothing for deletion';

  INSERT INTO public.storage_cleanup_references (bucket_id, ref_schema, ref_table, ref_column)
  VALUES ('v1598-test', 'public', 'storage_cleanup_buckets', 'v1598_no_column');
  v_res := public.storage_cleanup_scan(FALSE);
  v_bucket := (SELECT e FROM jsonb_array_elements(v_res -> 'buckets') e WHERE e ->> 'bucket' = 'v1598-test');
  ASSERT v_bucket ->> 'skipped' LIKE 'reference%', 'T5 a missing reference column skips the whole bucket';
  ASSERT v_bucket -> 'paths' IS NULL, 'T5 nothing listed for deletion when a reference is missing';
  DELETE FROM public.storage_cleanup_references WHERE bucket_id = 'v1598-test' AND ref_column = 'v1598_no_column';

  PERFORM public.storage_cleanup_record('v1598-test', 1, NULL);
  ASSERT (SELECT last_deleted_count FROM public.storage_cleanup_buckets WHERE bucket_id = 'v1598-test') = 1, 'T5 deletion recorded';
  RAISE NOTICE 'PASS T5 storage scan';
END $$;

-- T6 ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_user     UUID;
  v_scenario UUID;
  v_old      UUID;
  v_new      UUID;
  v_res      JSONB;
BEGIN
  UPDATE public.saas_job_settings SET sim_run_abandon_days = 90, sim_lobby_abandon_days = 30 WHERE id;
  v_user := (SELECT au.id FROM auth.users au ORDER BY au.created_at LIMIT 1);
  v_scenario := (SELECT s.id FROM sim.scenarios s ORDER BY s.created_at LIMIT 1);
  IF v_user IS NULL OR v_scenario IS NULL THEN
    RAISE NOTICE 'SKIP T6 Simulator housekeeping (no sign-in user or scenario)';
    RETURN;
  END IF;
  v_old := gen_random_uuid();
  v_new := gen_random_uuid();
  BEGIN
    INSERT INTO sim.simulation_runs (id, user_id, scenario_id, status, started_at, last_activity_at)
    VALUES (v_old, v_user, v_scenario, 'in_progress', NOW() - INTERVAL '200 days', NOW() - INTERVAL '200 days');
    INSERT INTO sim.simulation_runs (id, user_id, scenario_id, status, started_at, last_activity_at)
    VALUES (v_new, v_user, v_scenario, 'paused', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days');
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'SKIP T6 Simulator housekeeping (cannot add a test run: %)', SQLERRM;
    RETURN;
  END;

  v_res := public.run_simulator_housekeeping('{"dry_run": true}');
  ASSERT (v_res ->> 'runs_abandoned')::INT >= 1, 'T6 dry run counts the idle run';
  ASSERT (SELECT status FROM sim.simulation_runs WHERE id = v_old) = 'in_progress', 'T6 dry run changes nothing';

  v_res := public.run_simulator_housekeeping('{}'::jsonb);
  ASSERT (SELECT status FROM sim.simulation_runs WHERE id = v_old) = 'abandoned', 'T6 idle run abandoned';
  ASSERT (SELECT status FROM sim.simulation_runs WHERE id = v_new) = 'paused', 'T6 recent run untouched';
  v_res := public.run_simulator_housekeeping('{}'::jsonb);
  ASSERT (v_res ->> 'runs_abandoned')::INT = 0 OR (SELECT status FROM sim.simulation_runs WHERE id = v_new) = 'paused',
    'T6 second run changes nothing more for these runs';
  RAISE NOTICE 'PASS T6 Simulator housekeeping';
END $$;

-- T7 ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_acc    UUID;
  v_tz     TEXT;
  v_ctx    JSONB;
  v_res    JSONB;
  v_marker public.background_job_markers;
  v_admins INTEGER;
  v_count  INTEGER;
BEGIN
  v_acc := (SELECT a.id FROM public.accounts a
             WHERE NOT COALESCE(a.is_deleted, FALSE)
               AND EXISTS (SELECT 1 FROM public.projects p WHERE p.account_id = a.id AND NOT COALESCE(p.is_deleted, FALSE))
             ORDER BY a.created_at LIMIT 1);
  IF v_acc IS NULL THEN
    RAISE NOTICE 'SKIP T7 weekly data check (no organisation with a project)';
    RETURN;
  END IF;
  UPDATE public.data_quality_checks SET is_active = FALSE WHERE is_active;
  DELETE FROM public.background_job_markers WHERE job_code = 'quality.weekly_report' AND organisation_id = v_acc;
  INSERT INTO public.data_quality_checks (check_code, label, count_sql, sort_order) VALUES
    ('v1598_three', 'Test check with three findings', 'SELECT 3', 1),
    ('v1598_broken', 'Test check that cannot run', 'SELECT count(*) FROM public.v1598_no_table', 2),
    ('v1598_zero', 'Test check with no findings', 'SELECT count(*) FROM public.projects WHERE account_id = $1 AND FALSE', 3);
  v_tz := public.bj_account_time_zone(v_acc);
  v_ctx := jsonb_build_object('time_zones', jsonb_build_array(v_tz));

  v_res := public.run_data_quality_report(v_ctx || '{"dry_run": true}'::jsonb);
  ASSERT NOT EXISTS (SELECT 1 FROM public.background_job_markers WHERE job_code = 'quality.weekly_report' AND organisation_id = v_acc),
    'T7 dry run marks nothing';

  v_res := public.run_data_quality_report(v_ctx);
  v_marker := (SELECT m FROM public.background_job_markers m WHERE m.job_code = 'quality.weekly_report' AND m.organisation_id = v_acc);
  ASSERT v_marker.marker_key IS NOT NULL, 'T7 result stored once for the week';
  ASSERT (v_marker.detail #>> '{counts,v1598_three}')::INT = 3, 'T7 count stored';
  ASSERT (v_marker.detail #>> '{counts,v1598_zero}')::INT = 0, 'T7 zero count stored';
  ASSERT (v_marker.detail -> 'skipped') ? 'v1598_broken', 'T7 broken check skipped';
  ASSERT (v_marker.detail ->> 'total')::INT = 3, 'T7 total';

  v_admins := cardinality(public.bj_account_admin_users(v_acc));
  -- (an admin of several organisations in the same time zone gets one notice per organisation)
  v_count := (SELECT count(*) FROM public.notifications n
               WHERE n.notification_data ->> 'message_key' = 'data_quality_weekly'
                 AND n.created_at >= NOW() - INTERVAL '1 minute'
                 AND n.user_id = ANY(public.bj_account_admin_users(v_acc)));
  ASSERT v_count >= v_admins, format('T7 a notice for every admin (%s for %s admins)', v_count, v_admins);
  ASSERT v_admins = 0 OR EXISTS (SELECT 1 FROM public.notifications n
                                  WHERE n.notification_data ->> 'message_key' = 'data_quality_weekly'
                                    AND n.message LIKE '%Test check with three findings: 3%'
                                    AND n.message NOT LIKE '%no findings%'), 'T7 notice lists only checks with findings';

  v_res := public.run_data_quality_report(v_ctx);
  ASSERT (SELECT count(*) FROM public.notifications n
           WHERE n.notification_data ->> 'message_key' = 'data_quality_weekly'
             AND n.created_at >= NOW() - INTERVAL '1 minute'
             AND n.user_id = ANY(public.bj_account_admin_users(v_acc))) = v_count, 'T7 once a week';
  IF v_admins = 0 THEN
    RAISE NOTICE 'PASS T7 weekly data check (organisation has no owner or PMO Admin, notice part not exercised)';
  ELSE
    RAISE NOTICE 'PASS T7 weekly data check';
  END IF;
END $$;

-- T8 ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_res JSONB;
BEGIN
  ASSERT (SELECT count(*) FROM public.background_jobs WHERE
           (code = 'retention.purge'           AND kind = 'sql'     AND time_basis = 'utc' AND cron = '0 3 * * 0')
        OR (code = 'storage.cleanup'           AND kind = 'handler' AND time_basis = 'utc' AND enqueue_guard = 'public.storage_cleanup_has_work')
        OR (code = 'simulator.housekeeping'    AND kind = 'sql'     AND time_basis = 'utc')
        OR (code = 'quality.weekly_report'     AND kind = 'sql'     AND time_basis = 'organisation')
        OR (code = 'backfill.global_templates' AND kind = 'sql'     AND cron IS NULL)
        OR (code = 'search.reindex'            AND kind = 'sql'     AND cron IS NULL)) = 6, 'T8 six Slice 3 jobs';
  ASSERT NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname <> 'nidus_background_tick'
                       AND jobname IN ('retention.purge', 'storage.cleanup', 'simulator.housekeeping')), 'T8 no own pg_cron entries';

  v_res := public.run_global_template_backfill('{"dry_run": true}');
  ASSERT (v_res ->> 'processed')::INT = 0, 'T8 back-fill dry run changes nothing';
  v_res := public.run_search_reindex('{"dry_run": true}');
  ASSERT (v_res ->> 'processed')::INT = 0, 'T8 re-index dry run changes nothing';
  BEGIN
    PERFORM public.run_search_reindex('{"schema": "admin"}');
    RAISE EXCEPTION 'T8 re-index accepted another schema';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'T8%' THEN RAISE; END IF;
  END;

  -- a manual job is not started by the tick, and Run now still works for it
  ASSERT public.background_job_function_shape('public.run_global_template_backfill') = 'context', 'T8 manual job callable';
  v_res := public.background_job_request_run('search.reindex', 'v1598 test', NULL, NULL);
  ASSERT v_res ->> 'status' = 'requested', 'T8 Run now requests a manual job';

  v_res := (SELECT public.organisation_data_footprint(a.id) FROM public.accounts a ORDER BY a.created_at LIMIT 1);
  ASSERT v_res IS NULL OR jsonb_typeof(v_res -> 'tables') = 'array', 'T8 footprint dry run lists tables';
  RAISE NOTICE 'PASS T8 manual jobs and catalogue';
END $$;

DO $$ BEGIN RAISE NOTICE 'v1598: all Slice 3 background job tests passed (rolling back)'; END $$;

ROLLBACK;
