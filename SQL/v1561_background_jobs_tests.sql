-- ============================================================================
-- v1561 tests: background jobs framework (v1352 Slice 0). Run after v1559 and v1560.
-- Everything runs in one transaction that ROLLS BACK at the end: nothing is kept.
-- Real catalogue jobs are switched off inside the transaction so only the test jobs run.
-- Each block raises an exception (the editor shows the failing test) or a NOTICE "PASS …".
--
--   T1  cron next-fire in UTC and in an organisation time zone; due-zone selection
--   T2  the tick starts a due UTC job and writes a succeeded run row with its count
--   T3  the same minute is not ticked twice; a disabled job is skipped
--   T4  organisation-time job: due in UTC zone, zones passed to the job in its context
--   T5  overlap: a job with a live running run is skipped
--   T6  failure: run row failed with the error; retry policy; alert after retries; success clears it
--   T7  late detection: due but not started → one grouped 'late' alert; stuck run closed
--   T8  enqueue dedupe; sql job refused by enqueue
--   T9  claim respects run_after and the per-organisation cap
--   T10 item back-off, dead after max_attempts, dead when expired
--   T11 single-item replay (reason required; organisation check)
--   T12 worker run finish: dead items → failed + alert, retrying items → partial
--   T13 a scheduled handler run queues one item per minute (dedupe)
--   T14 Admin "Run now" request: started by the next tick with its reason; turned-off job refused
-- ============================================================================

BEGIN;

UPDATE public.background_jobs SET enabled = FALSE;
UPDATE public.background_job_settings SET alert_hook_function = NULL, late_grace_minutes = 15 WHERE id;

-- Test state lives in transaction-local settings (no table is created here: the SQL editor appends an
-- RLS statement after every created table, which fails once the transaction has rolled back).
SELECT set_config('bgtest.ok_hits', '0', true),
       set_config('bgtest.ctx', '', true),
       set_config('bgtest.fail', 'on', true);

CREATE FUNCTION public.bgtest_ok() RETURNS JSONB LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('bgtest.ok_hits', (current_setting('bgtest.ok_hits')::INT + 1)::TEXT, true);
  RETURN jsonb_build_object('processed', 3);
END $$;

CREATE FUNCTION public.bgtest_ctx(p_context JSONB) RETURNS INTEGER LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('bgtest.ctx') = '' THEN
    PERFORM set_config('bgtest.ctx', p_context::TEXT, true);
  END IF;
  RETURN 1;
END $$;

CREATE FUNCTION public.bgtest_flaky() RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('bgtest.fail') = 'on' THEN RAISE EXCEPTION 'boom from bgtest_flaky'; END IF;
END $$;

SELECT public.background_job_register(p_code => 'test.ok', p_name => 'Test OK', p_kind => 'sql',
  p_sql_function => 'public.bgtest_ok', p_cron => '0 10 * * *');
SELECT public.background_job_register(p_code => 'test.off', p_name => 'Test off', p_kind => 'sql',
  p_sql_function => 'public.bgtest_ok', p_cron => '* * * * *');
UPDATE public.background_jobs SET enabled = FALSE WHERE code = 'test.off';
SELECT public.background_job_register(p_code => 'test.org', p_name => 'Test organisation time', p_kind => 'sql',
  p_sql_function => 'public.bgtest_ctx', p_cron => '0 9 * * *', p_time_basis => 'organisation');
SELECT public.background_job_register(p_code => 'test.flaky', p_name => 'Test flaky', p_kind => 'sql',
  p_sql_function => 'public.bgtest_flaky', p_cron => '0 0 1 1 *', p_max_retries => 1, p_retry_delay_seconds => 300);
SELECT public.background_job_register(p_code => 'test.late', p_name => 'Test late', p_kind => 'sql',
  p_sql_function => 'public.bgtest_ok', p_cron => '0 0 1 1 *');
SELECT public.background_job_register(p_code => 'test.q', p_name => 'Test queue', p_kind => 'handler',
  p_max_attempts => 2, p_backoff_schedule => ARRAY[60, 300], p_per_org_batch_cap => 1, p_batch_size => 10);

-- T1 ──────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  ASSERT public.background_job_next_fire('0 0 * * *', '2026-01-01 10:00+00', 'UTC') = '2026-01-02 00:00+00', 'T1 daily UTC';
  ASSERT public.background_job_next_fire('*/15 * * * *', '2026-01-01 10:07+00', 'UTC') = '2026-01-01 10:15+00', 'T1 every 15 min';
  ASSERT public.background_job_next_fire('0 6 * * 1', '2026-01-01 00:00+00', 'UTC') = '2026-01-05 06:00+00', 'T1 weekly Monday';
  ASSERT public.background_job_next_fire('30 2 1 * *', '2026-01-15 00:00+00', 'UTC') = '2026-02-01 02:30+00', 'T1 monthly';
  ASSERT public.background_job_next_fire('0 9 * * *', '2026-01-01 00:00+00', 'Asia/Dubai') = '2026-01-01 05:00+00', 'T1 Dubai 09:00';
  ASSERT public.background_job_next_fire('0 9 * * *', '2026-07-01 00:00+00', 'Europe/London') = '2026-07-01 08:00+00', 'T1 London summer time';
  ASSERT public.background_job_due_zones('0 9 * * *', '2026-01-01 04:59+00', '2026-01-01 05:00+00', ARRAY['UTC', 'Asia/Dubai'])
         = ARRAY['Asia/Dubai'], 'T1 due zones';
  ASSERT public.background_job_cron_is_valid('*/5 1-3,7 * * 1-5') AND NOT public.background_job_cron_is_valid('every day'), 'T1 validation';
  RAISE NOTICE 'PASS T1 cron next-fire and due zones';
END $$;

-- T2 / T3 ─────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_res JSONB;
  v_run public.background_job_runs;
BEGIN
  UPDATE public.background_job_settings SET last_tick_at = '2026-03-01 09:59+00' WHERE id;
  v_res := public.run_due_background_jobs('2026-03-01 10:00+00');
  ASSERT v_res -> 'started' ? 'test.ok', 'T2 test.ok started: ' || v_res::TEXT;
  ASSERT NOT (v_res -> 'started' ? 'test.off'), 'T3 disabled job skipped';
  v_run := (SELECT r FROM public.background_job_runs r WHERE r.job_code = 'test.ok' ORDER BY r.started_at DESC LIMIT 1);
  ASSERT v_run.status = 'succeeded' AND v_run.records_processed = 3 AND v_run.triggered_by = 'schedule', 'T2 run row';
  ASSERT (SELECT last_status FROM public.background_jobs WHERE code = 'test.ok') = 'succeeded', 'T2 job state';
  ASSERT current_setting('bgtest.ok_hits')::INT = 1, 'T2 job ran once';

  v_res := public.run_due_background_jobs('2026-03-01 10:00+00');
  ASSERT v_res ->> 'note' = 'already ticked', 'T3 same minute not ticked twice';
  v_res := public.run_due_background_jobs('2026-03-01 10:01+00');
  ASSERT jsonb_array_length(v_res -> 'started') = 0, 'T3 nothing due at 10:01: ' || v_res::TEXT;
  RAISE NOTICE 'PASS T2/T3 tick, run row, disabled skipped';
END $$;

-- T4 ──────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_res JSONB;
  v_ctx JSONB;
BEGIN
  UPDATE public.background_job_settings SET last_tick_at = '2026-03-02 08:59+00' WHERE id;
  v_res := public.run_due_background_jobs('2026-03-02 09:00+00');
  ASSERT v_res -> 'started' ? 'test.org', 'T4 organisation job started (UTC zone): ' || v_res::TEXT;
  v_ctx := NULLIF(current_setting('bgtest.ctx'), '')::JSONB;
  ASSERT v_ctx -> 'time_zones' ? 'UTC', 'T4 context carries the due zones: ' || COALESCE(v_ctx::TEXT, 'null');
  RAISE NOTICE 'PASS T4 organisation time basis';
END $$;

-- T5 ──────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_res JSONB;
BEGIN
  INSERT INTO public.background_job_runs (job_code, status, triggered_by) VALUES ('test.ok', 'running', 'manual');
  v_res := public.run_background_job('test.ok', 'manual', 'Test overlap');
  ASSERT v_res ->> 'status' = 'skipped', 'T5 overlap skipped: ' || v_res::TEXT;
  DELETE FROM public.background_job_runs WHERE job_code = 'test.ok' AND status = 'running';
  RAISE NOTICE 'PASS T5 overlap prevented';
END $$;

-- T6 ──────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_res JSONB;
  v_job public.background_jobs;
  v_run public.background_job_runs;
  v_now TIMESTAMPTZ := date_trunc('minute', NOW()) + INTERVAL '10 minutes';
BEGIN
  v_res := public.run_background_job('test.flaky', 'manual', 'First try');
  ASSERT v_res ->> 'status' = 'failed', 'T6 failed status';
  v_run := (SELECT r FROM public.background_job_runs r WHERE r.id = (v_res ->> 'run_id')::UUID);
  ASSERT v_run.error LIKE '%boom from bgtest_flaky%' AND v_run.finished_at IS NOT NULL, 'T6 error recorded';
  v_job := (SELECT j FROM public.background_jobs j WHERE j.code = 'test.flaky');
  ASSERT v_job.next_retry_at IS NOT NULL AND NOT v_job.alert_open AND v_job.consecutive_failures = 1,
         'T6 retry scheduled, no alert yet';

  -- the tick picks up the retry even though the cron is not due
  UPDATE public.background_job_settings SET last_tick_at = v_now - INTERVAL '1 minute' WHERE id;
  v_res := public.run_due_background_jobs(v_now);
  ASSERT v_res -> 'started' ? 'test.flaky', 'T6 retry started by the tick: ' || v_res::TEXT;
  v_run := (SELECT r FROM public.background_job_runs r WHERE r.job_code = 'test.flaky' ORDER BY r.started_at DESC LIMIT 1);
  ASSERT v_run.triggered_by = 'retry' AND v_run.status = 'failed', 'T6 retry run failed again';
  v_job := (SELECT j FROM public.background_jobs j WHERE j.code = 'test.flaky');
  ASSERT v_job.alert_open AND v_job.alert_kind = 'failed' AND v_job.next_retry_at IS NULL, 'T6 alert after retries used up';

  PERFORM set_config('bgtest.fail', 'off', true);
  v_res := public.run_background_job('test.flaky', 'manual', 'After the fix');
  ASSERT v_res ->> 'status' = 'succeeded', 'T6 succeeds after fix';
  v_job := (SELECT j FROM public.background_jobs j WHERE j.code = 'test.flaky');
  ASSERT NOT v_job.alert_open AND v_job.alert_cleared_at IS NOT NULL AND v_job.consecutive_failures = 0, 'T6 success clears alert';
  RAISE NOTICE 'PASS T6 failure, retry policy, grouped alert';
END $$;

-- T7 ──────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_res    JSONB;
  v_raised TIMESTAMPTZ;
  v_stuck  UUID;
BEGIN
  UPDATE public.background_jobs SET last_due_at = NOW() - INTERVAL '1 hour', last_started_at = NULL WHERE code = 'test.late';
  v_res := public.background_jobs_detect_late(NOW());
  ASSERT (v_res ->> 'late_alerts')::INT >= 1, 'T7 late alert raised: ' || v_res::TEXT;
  ASSERT (SELECT alert_open AND alert_kind = 'late' FROM public.background_jobs WHERE code = 'test.late'), 'T7 late alert open';
  v_raised := (SELECT alert_raised_at FROM public.background_jobs WHERE code = 'test.late');
  v_res := public.background_jobs_detect_late(NOW());
  ASSERT (v_res ->> 'late_alerts')::INT = 0, 'T7 grouped: no second alert';
  ASSERT (SELECT alert_raised_at FROM public.background_jobs WHERE code = 'test.late') = v_raised, 'T7 raised time unchanged';

  v_stuck := gen_random_uuid();
  INSERT INTO public.background_job_runs (id, job_code, status, triggered_by, started_at)
  VALUES (v_stuck, 'test.ok', 'running', 'schedule', NOW() - INTERVAL '2 days');
  v_res := public.background_jobs_detect_late(NOW());
  ASSERT (v_res ->> 'stuck_runs')::INT >= 1, 'T7 stuck run found';
  ASSERT (SELECT status FROM public.background_job_runs WHERE id = v_stuck) = 'failed', 'T7 stuck run closed as failed';
  RAISE NOTICE 'PASS T7 late and stuck detection';
END $$;

-- T8 ──────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_a UUID;
  v_b UUID;
  v_refused BOOLEAN := FALSE;
BEGIN
  v_a := public.enqueue_background_job('test.q', '{"n": 1}'::jsonb, NULL, 'k1', NULL);
  v_b := public.enqueue_background_job('test.q', '{"n": 2}'::jsonb, NULL, 'k1', NULL);
  ASSERT v_a = v_b, 'T8 same dedupe key returns the same item';
  ASSERT (SELECT count(*) FROM public.background_job_queue WHERE job_code = 'test.q' AND dedupe_key = 'k1') = 1, 'T8 one row';
  ASSERT (SELECT payload ->> 'n' FROM public.background_job_queue WHERE id = v_a) = '1', 'T8 first payload kept';
  BEGIN
    PERFORM public.enqueue_background_job('test.ok', '{}'::jsonb, NULL, NULL, NULL);
  EXCEPTION WHEN OTHERS THEN v_refused := TRUE;
  END;
  ASSERT v_refused, 'T8 sql job cannot be queued';
  RAISE NOTICE 'PASS T8 enqueue dedupe';
END $$;

-- T9 / T10 / T11 ──────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_org_a  UUID := (SELECT id FROM public.accounts ORDER BY created_at LIMIT 1);
  v_org_b  UUID := (SELECT id FROM public.accounts ORDER BY created_at OFFSET 1 LIMIT 1);
  v_k1     UUID := (SELECT id FROM public.background_job_queue WHERE job_code = 'test.q' AND dedupe_key = 'k1');
  v_future UUID;
  v_exp    UUID;
  v_claimed UUID[];
  v_status TEXT;
  v_item   public.background_job_queue;
  v_refused BOOLEAN;
BEGIN
  v_future := public.enqueue_background_job('test.q', '{}'::jsonb, NOW() + INTERVAL '1 hour', 'future', NULL);
  IF v_org_a IS NOT NULL AND v_org_b IS NOT NULL THEN
    PERFORM public.enqueue_background_job('test.q', '{}'::jsonb, NOW() - INTERVAL '3 minutes', 'a1', v_org_a);
    PERFORM public.enqueue_background_job('test.q', '{}'::jsonb, NOW() - INTERVAL '2 minutes', 'a2', v_org_a);
    PERFORM public.enqueue_background_job('test.q', '{}'::jsonb, NOW() - INTERVAL '1 minute', 'a3', v_org_a);
    PERFORM public.enqueue_background_job('test.q', '{}'::jsonb, NOW(), 'b1', v_org_b);
  END IF;

  v_claimed := ARRAY(SELECT c.id FROM public.background_job_claim('test-worker', 100) c WHERE c.job_code = 'test.q');
  ASSERT NOT (v_future = ANY (v_claimed)), 'T9 future item not claimed';
  ASSERT v_k1 = ANY (v_claimed), 'T9 ready item claimed';
  IF v_org_a IS NOT NULL AND v_org_b IS NOT NULL THEN
    ASSERT cardinality(v_claimed) = 3, 'T9 per-organisation cap 1: expected 3 items, got ' || cardinality(v_claimed);
    ASSERT (SELECT dedupe_key FROM public.background_job_queue WHERE id = ANY (v_claimed) AND organisation_id = v_org_a) = 'a1',
           'T9 oldest item of the capped organisation first';
  ELSE
    RAISE NOTICE 'T9 per-organisation cap not checked: fewer than two organisations exist';
  END IF;
  ASSERT (SELECT status = 'running' AND attempts = 1 FROM public.background_job_queue WHERE id = v_k1), 'T9 claimed item running';
  ASSERT cardinality(ARRAY(SELECT c.id FROM public.background_job_claim('test-worker-2', 100) c WHERE c.id = v_k1)) = 0,
         'T9 a running item is not claimed again';

  -- T10 back-off, dead after max_attempts
  v_status := public.background_job_item_complete(v_k1, FALSE, 'endpoint down');
  v_item := (SELECT q FROM public.background_job_queue q WHERE q.id = v_k1);
  ASSERT v_status = 'pending' AND v_item.run_after BETWEEN NOW() + INTERVAL '59 seconds' AND NOW() + INTERVAL '61 seconds',
         'T10 first back-off step 60 s';
  UPDATE public.background_job_queue SET run_after = NOW() - INTERVAL '1 second' WHERE id = v_k1;
  ASSERT v_k1 = ANY (ARRAY(SELECT c.id FROM public.background_job_claim('test-worker', 100) c)), 'T10 claimed again after back-off';
  v_status := public.background_job_item_complete(v_k1, FALSE, 'still down');
  ASSERT v_status = 'dead', 'T10 dead after max_attempts';

  v_exp := public.enqueue_background_job('test.q', '{}'::jsonb, NULL, 'exp', NULL);
  UPDATE public.background_job_queue SET expires_at = NOW() - INTERVAL '1 minute' WHERE id = v_exp;
  PERFORM public.background_job_claim('test-worker', 100);
  ASSERT (SELECT status FROM public.background_job_queue WHERE id = v_exp) = 'dead', 'T10 expired item dead';

  -- T11 replay
  v_refused := FALSE;
  BEGIN
    PERFORM public.background_job_replay_item(v_k1, '  ', 'test');
  EXCEPTION WHEN OTHERS THEN v_refused := TRUE;
  END;
  ASSERT v_refused, 'T11 reason required';
  PERFORM public.background_job_replay_item(v_k1, 'Endpoint fixed', 'test');
  v_item := (SELECT q FROM public.background_job_queue q WHERE q.id = v_k1);
  ASSERT v_item.status = 'pending' AND v_item.attempts = 0 AND v_item.replay_count = 1
         AND v_item.last_replay_reason = 'Endpoint fixed', 'T11 replayed item waiting again';
  IF v_org_a IS NOT NULL THEN
    v_refused := FALSE;
    BEGIN
      PERFORM public.background_job_replay_item_for_org(v_k1, v_org_a, 'Wrong organisation', 'test');
    EXCEPTION WHEN OTHERS THEN v_refused := TRUE;
    END;
    ASSERT v_refused, 'T11 another organisation''s item is refused';
  END IF;
  RAISE NOTICE 'PASS T9/T10/T11 claim, back-off, dead, replay';
END $$;

-- T12 ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_run UUID;
BEGIN
  UPDATE public.background_jobs SET alert_open = FALSE WHERE code = 'test.q';
  v_run := public.background_job_run_start('test.q');
  ASSERT public.background_job_run_finish(v_run, 1, 0, 1, 'one retrying') = 'partial', 'T12 retrying → partial';
  ASSERT NOT (SELECT alert_open FROM public.background_jobs WHERE code = 'test.q'), 'T12 no alert for partial';
  v_run := public.background_job_run_start('test.q');
  ASSERT public.background_job_run_finish(v_run, 1, 1, 0, 'one dead') = 'failed', 'T12 dead → failed';
  ASSERT (SELECT alert_open FROM public.background_jobs WHERE code = 'test.q'), 'T12 alert raised for dead items';
  RAISE NOTICE 'PASS T12 worker run finish';
END $$;

-- T13 ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_a JSONB;
  v_b JSONB;
BEGIN
  v_a := public.run_background_job('test.q', 'schedule');
  v_b := public.run_background_job('test.q', 'schedule');
  ASSERT v_a ->> 'status' = 'queued' AND v_a ->> 'queued_item_id' = v_b ->> 'queued_item_id', 'T13 one item per scheduled minute';
  RAISE NOTICE 'PASS T13 scheduled handler run queues once';
END $$;

-- T14 ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_res  JSONB;
  v_run  public.background_job_runs;
  v_now  TIMESTAMPTZ := date_trunc('minute', NOW()) + INTERVAL '20 minutes';
  v_refused BOOLEAN := FALSE;
BEGIN
  v_res := public.background_job_request_run('test.ok', 'Owner check after the fix', NULL, NULL);
  ASSERT v_res ->> 'status' = 'requested', 'T14 SQL job run is requested, not run in the request';
  BEGIN
    PERFORM public.background_job_request_run('test.ok', 'Twice', NULL, NULL);
  EXCEPTION WHEN OTHERS THEN v_refused := TRUE;
  END;
  ASSERT v_refused, 'T14 a second request waits for the first';
  UPDATE public.background_job_settings SET last_tick_at = v_now - INTERVAL '1 minute' WHERE id;
  v_res := public.run_due_background_jobs(v_now);
  ASSERT v_res -> 'started' ? 'test.ok', 'T14 the tick starts the requested run: ' || v_res::TEXT;
  v_run := (SELECT r FROM public.background_job_runs r WHERE r.job_code = 'test.ok' ORDER BY r.started_at DESC LIMIT 1);
  ASSERT v_run.triggered_by = 'manual' AND v_run.reason = 'Owner check after the fix', 'T14 manual run keeps its reason';
  ASSERT (SELECT run_requested_at IS NULL FROM public.background_jobs WHERE code = 'test.ok'), 'T14 request cleared';

  v_refused := FALSE;
  BEGIN
    PERFORM public.background_job_request_run('test.off', 'Disabled job', NULL, NULL);
  EXCEPTION WHEN OTHERS THEN v_refused := TRUE;
  END;
  ASSERT v_refused, 'T14 a turned-off job cannot be run';
  RAISE NOTICE 'PASS T14 run request picked up by the tick';
END $$;

DO $$ BEGIN RAISE NOTICE 'v1561: all background job tests passed (rolling back)'; END $$;

ROLLBACK;
