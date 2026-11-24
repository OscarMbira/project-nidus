-- ============================================================================
-- v1565 tests: background jobs Slice 1 (v1352) — reminders, lead times, digest, reports, recurring
-- tasks, timesheet reminders, EVM snapshots. Run after v1562, v1563, v1564.
-- Everything runs in one transaction that ROLLS BACK at the end: nothing is kept, no table is created
-- (test state lives in transaction settings). The worker is not woken (its address is cleared inside
-- the transaction). Each block raises an exception (the editor shows the failing test) or a NOTICE "PASS …".
--
--   S1  reminder_kind: before window, due day, overdue window, nothing outside
--   S2  bj_format_date tokens; bj_zone_due; bj_week_start for Monday / Sunday / Saturday weeks
--   S3  scheduled_report_next_run: weekly, monthly, quarterly, in an organisation time zone
--   S4  recurring_task_next_date patterns; evm_planned_fraction
--   S5  reminder_mark: one marker per item × kind × due date, both schemas
--   S6  every seeded record type builds and runs (dry run, no skipped types)
--   S7  engine end to end on a test record type: one "before" + one "overdue", nothing on a second run
--   S8  organisation lead-time override changes what is due
--   S9  the other jobs run cleanly (digest / timesheets dry run, recurring tasks, EVM, due reports)
--   S10 catalogue: the eight Slice 1 jobs are registered with the right kind and schedule basis
-- ============================================================================

BEGIN;

UPDATE public.background_job_config SET functions_base_url = NULL WHERE id;

-- S1 ─────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  ASSERT public.reminder_kind('2026-11-10', '2026-11-06', 3, 14) IS NULL, 'S1 too early';
  ASSERT public.reminder_kind('2026-11-10', '2026-11-07', 3, 14) = 'before', 'S1 first day of the lead window';
  ASSERT public.reminder_kind('2026-11-10', '2026-11-10', 3, 14) = 'before', 'S1 due today counts as before';
  ASSERT public.reminder_kind('2026-11-10', '2026-11-11', 3, 14) = 'overdue', 'S1 day after is overdue';
  ASSERT public.reminder_kind('2026-11-10', '2026-11-24', 3, 14) = 'overdue', 'S1 last day of the overdue window';
  ASSERT public.reminder_kind('2026-11-10', '2026-11-25', 3, 14) IS NULL, 'S1 long overdue: nothing';
  ASSERT public.reminder_kind('2026-11-10', '2026-11-10', 0, 14) = 'before', 'S1 lead 0 = on the day';
  ASSERT public.reminder_kind(NULL, '2026-11-10', 3, 14) IS NULL, 'S1 no date';
  RAISE NOTICE 'PASS S1 reminder kind';
END $$;

-- S2 ─────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  ASSERT public.bj_format_date('2026-03-05', 'D MMM YYYY') = '5 Mar 2026', 'S2 D MMM YYYY: ' || public.bj_format_date('2026-03-05', 'D MMM YYYY');
  ASSERT public.bj_format_date('2026-03-05', 'DD/MM/YYYY') = '05/03/2026', 'S2 DD/MM/YYYY';
  ASSERT public.bj_format_date('2026-03-05', 'YYYY-MM-DD') = '2026-03-05', 'S2 ISO';
  ASSERT public.bj_format_date('2026-03-05', 'MM/DD/YY') = '03/05/26', 'S2 MM/DD/YY';
  ASSERT public.bj_format_date('2026-03-05', NULL) = '5 Mar 2026', 'S2 default format';
  ASSERT public.bj_zone_due('{}'::jsonb, 'Africa/Cairo'), 'S2 manual run covers every zone';
  ASSERT public.bj_zone_due('{"time_zones": ["Africa/Cairo"]}'::jsonb, 'Africa/Cairo'), 'S2 zone listed';
  ASSERT NOT public.bj_zone_due('{"time_zones": ["Africa/Cairo"]}'::jsonb, 'Asia/Dubai'), 'S2 zone not listed';
  ASSERT public.bj_zone_due('{"time_zones": ["UTC"]}'::jsonb, NULL), 'S2 no zone = UTC';
  -- 2026-11-26 is a Thursday
  ASSERT public.bj_week_start('2026-11-26', 'monday') = '2026-11-23', 'S2 Monday week';
  ASSERT public.bj_week_start('2026-11-26', 'sunday') = '2026-11-22', 'S2 Sunday week';
  ASSERT public.bj_week_start('2026-11-26', 'saturday') = '2026-11-21', 'S2 Saturday week';
  ASSERT public.bj_week_start('2026-11-23', 'monday') = '2026-11-23', 'S2 Monday itself';
  RAISE NOTICE 'PASS S2 date format, zones, week start';
END $$;

-- S3 ─────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  -- Weekly, default Monday 07:00 local. 2026-11-23 is a Monday.
  ASSERT public.scheduled_report_next_run('weekly', '{}', '2026-11-23 06:00+00', 'UTC') = '2026-11-23 07:00+00', 'S3 weekly later today';
  ASSERT public.scheduled_report_next_run('weekly', '{}', '2026-11-23 07:00+00', 'UTC') = '2026-11-30 07:00+00', 'S3 weekly next week';
  ASSERT public.scheduled_report_next_run('weekly', '{"weekday": 5, "send_hour": 9}', '2026-11-23 06:00+00', 'Asia/Dubai')
         = '2026-11-27 05:00+00', 'S3 weekly Friday 09:00 Dubai';
  -- Monthly, default the 1st at 07:00 local
  ASSERT public.scheduled_report_next_run('monthly', '{}', '2026-11-23 06:00+00', 'UTC') = '2026-12-01 07:00+00', 'S3 monthly';
  ASSERT public.scheduled_report_next_run('monthly', '{"day_of_month": 31}', '2026-11-23 06:00+00', 'UTC') = '2026-11-28 07:00+00', 'S3 day capped at 28';
  -- Quarterly: first months of a quarter
  ASSERT public.scheduled_report_next_run('quarterly', '{}', '2026-11-23 06:00+00', 'UTC') = '2027-01-01 07:00+00', 'S3 quarterly';
  ASSERT public.scheduled_report_next_run('quarterly', '{}', '2026-10-01 06:00+00', 'UTC') = '2026-10-01 07:00+00', 'S3 quarterly same day';
  -- Invalid zone falls back to UTC
  ASSERT public.scheduled_report_next_run('monthly', '{}', '2026-11-23 06:00+00', 'Nowhere/Town') = '2026-12-01 07:00+00', 'S3 bad zone';
  RAISE NOTICE 'PASS S3 report send times';
END $$;

-- S4 ─────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  ASSERT public.recurring_task_next_date('daily', '2026-11-23') = '2026-11-24', 'S4 daily';
  ASSERT public.recurring_task_next_date('weekly', '2026-11-23') = '2026-11-30', 'S4 weekly';
  ASSERT public.recurring_task_next_date('biweekly', '2026-11-23') = '2026-12-07', 'S4 biweekly';
  ASSERT public.recurring_task_next_date('monthly', '2026-11-23') = '2026-12-23', 'S4 monthly';
  ASSERT public.recurring_task_next_date('quarterly', '2026-11-23') = '2027-02-23', 'S4 quarterly';
  ASSERT public.recurring_task_next_date('yearly', '2026-11-23') IS NULL, 'S4 unknown pattern stops';
  ASSERT public.evm_planned_fraction('2026-01-01', '2026-01-10', '2025-12-31') = 0, 'S4 before start';
  ASSERT public.evm_planned_fraction('2026-01-01', '2026-01-10', '2026-01-05') = 0.5, 'S4 half way';
  ASSERT public.evm_planned_fraction('2026-01-01', '2026-01-10', '2026-02-01') = 1, 'S4 after end';
  ASSERT public.evm_planned_fraction(NULL, '2026-01-10', '2026-02-01') IS NULL, 'S4 no start';
  RAISE NOTICE 'PASS S4 recurrence and planned share';
END $$;

-- S5 ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_item UUID := gen_random_uuid();
BEGIN
  ASSERT public.reminder_mark('public', 'zz_test', v_item, 'before', '2026-11-30', NULL) IS NOT NULL, 'S5 first before';
  ASSERT public.reminder_mark('public', 'zz_test', v_item, 'before', '2026-11-30', NULL) IS NULL, 'S5 second before refused';
  ASSERT public.reminder_mark('public', 'zz_test', v_item, 'overdue', '2026-11-30', NULL) IS NOT NULL, 'S5 overdue is separate';
  ASSERT public.reminder_mark('public', 'zz_test', v_item, 'before', '2026-12-07', NULL) IS NOT NULL, 'S5 a moved date reminds again';
  ASSERT public.reminder_mark('sim', 'zz_test', v_item, 'before', '2026-11-30', NULL) IS NOT NULL, 'S5 Simulator markers are separate';
  ASSERT public.reminder_mark('sim', 'zz_test', v_item, 'before', '2026-11-30', NULL) IS NULL, 'S5 Simulator second refused';
  RAISE NOTICE 'PASS S5 markers';
END $$;

-- S6 ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_res JSONB;
BEGIN
  ASSERT (SELECT count(*) FROM public.reminder_record_types WHERE is_active AND schema_name = 'public') >= 6, 'S6 Platform types seeded';
  ASSERT (SELECT count(*) FROM public.reminder_record_types WHERE is_active AND schema_name = 'sim') >= 6, 'S6 Simulator types seeded';
  ASSERT NOT EXISTS (SELECT 1 FROM public.reminder_record_types t
                      WHERE NOT EXISTS (SELECT 1 FROM public.reminder_messages m WHERE m.message_key = t.message_key)), 'S6 messages exist';
  v_res := public.run_due_reminders('{"dry_run": true}'::jsonb);
  ASSERT v_res -> 'skipped_types' = '[]'::jsonb, 'S6 a record type does not build or run: ' || (v_res -> 'skipped_types')::TEXT;
  ASSERT (v_res ->> 'processed')::INT = 0, 'S6 dry run sends nothing';
  RAISE NOTICE 'PASS S6 seeded record types run (% items due today)', v_res ->> 'due_items';
END $$;

-- S7 / S8 ── a test record type that reads its items from reminder_markers itself (no table is created).
-- Items: marker rows of record type 'zz_source' for one non-Planner organisation.
DO $$
DECLARE
  v_acc   UUID;
  v_today DATE;
BEGIN
  v_acc := (SELECT a.id FROM public.accounts a
             WHERE NOT COALESCE(a.is_deleted, FALSE) AND COALESCE(a.product_edition::TEXT, 'platform') <> 'planner'
             ORDER BY a.created_at LIMIT 1);
  PERFORM set_config('bjs1.account', COALESCE(v_acc::TEXT, ''), true);
  IF v_acc IS NULL THEN RETURN; END IF;
  v_today := (NOW() AT TIME ZONE public.bj_account_time_zone(v_acc))::DATE;

  UPDATE public.reminder_record_types SET is_active = FALSE;
  INSERT INTO public.reminder_record_types (schema_name, record_type, label, table_name, id_column, date_column, title_column,
    account_column, status_filter, recipient_rule, default_lead_days, overdue_window_days, message_key, planner_tables, sort_order)
  VALUES ('public', 'zz_test_type', 'Test items', 'reminder_markers', 'id', 'due_date', 'record_type',
    'account_id', 'r.record_type = ''zz_source''', 'org_admins', 3, 14, 'risk_review', ARRAY['reminder_markers'], 1);

  INSERT INTO public.reminder_markers (record_type, record_id, reminder_kind, due_date, account_id) VALUES
    ('zz_source', gen_random_uuid(), 'before', v_today + 1, v_acc),    -- due tomorrow → before
    ('zz_source', gen_random_uuid(), 'before', v_today - 2, v_acc),    -- two days ago → overdue
    ('zz_source', gen_random_uuid(), 'before', v_today + 30, v_acc),   -- far ahead → nothing
    ('zz_source', gen_random_uuid(), 'before', v_today - 60, v_acc);   -- long overdue → nothing
END $$;

DO $$
DECLARE
  v_acc    UUID := NULLIF(current_setting('bjs1.account'), '')::UUID;
  v_admins INTEGER;
  v_before INTEGER;
  v_res    JSONB;
BEGIN
  IF v_acc IS NULL THEN RAISE NOTICE 'SKIP S7/S8 — no non-Planner organisation in this database'; RETURN; END IF;
  v_admins := cardinality(public.reminder_recipients('public', 'org_admins', NULL, 'user', NULL, v_acc));
  v_before := (SELECT count(*) FROM public.notifications WHERE notification_category = 'reminder');

  v_res := public.run_due_reminders('{}'::jsonb);
  ASSERT v_res -> 'skipped_types' = '[]'::jsonb, 'S7 test type runs: ' || v_res::TEXT;
  ASSERT (SELECT count(*) FROM public.reminder_markers WHERE record_type = 'zz_test_type' AND reminder_kind = 'before') = 1, 'S7 one before';
  ASSERT (SELECT count(*) FROM public.reminder_markers WHERE record_type = 'zz_test_type' AND reminder_kind = 'overdue') = 1, 'S7 one overdue';
  ASSERT (v_res ->> 'processed')::INT = 2 * v_admins, 'S7 one notice per item per recipient: ' || v_res::TEXT;
  ASSERT (SELECT count(*) FROM public.notifications WHERE notification_category = 'reminder') = v_before + 2 * v_admins, 'S7 notices written';

  v_res := public.run_due_reminders('{}'::jsonb);
  ASSERT (v_res ->> 'processed')::INT = 0, 'S7 second run sends nothing';
  ASSERT (SELECT count(*) FROM public.reminder_markers WHERE record_type = 'zz_test_type') = 2, 'S7 no extra markers';

  v_res := public.run_due_reminders('{"time_zones": ["Zz/None"]}'::jsonb);
  ASSERT (v_res ->> 'due_items')::INT = 0, 'S7 organisation outside the due zones is left alone';
  RAISE NOTICE 'PASS S7 engine end to end (% recipients)', v_admins;

  -- S8: lead time 0 for this organisation → tomorrow's item is no longer due; a manual dry run shows it.
  DELETE FROM public.reminder_markers WHERE record_type = 'zz_test_type';
  INSERT INTO public.reminder_lead_time_settings (account_id, record_type, lead_days) VALUES (v_acc, 'zz_test_type', 0);
  v_res := public.run_due_reminders('{"dry_run": true}'::jsonb);
  ASSERT (v_res ->> 'due_items')::INT = 1, 'S8 only the overdue item with lead 0: ' || v_res::TEXT;
  UPDATE public.reminder_lead_time_settings SET lead_days = 5 WHERE account_id = v_acc AND record_type = 'zz_test_type';
  v_res := public.run_due_reminders('{"dry_run": true}'::jsonb);
  ASSERT (v_res ->> 'due_items')::INT = 2, 'S8 lead 5 brings tomorrow back';
  ASSERT public.reminder_lead_days('public', v_acc, 'zz_test_type', 3) = 5, 'S8 override read';
  ASSERT public.reminder_lead_days('sim', v_acc, 'zz_test_type', 3) = 3, 'S8 Simulator keeps its own default';
  RAISE NOTICE 'PASS S8 lead-time override';
END $$;

-- S9 ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_res JSONB;
  v_err BOOLEAN := FALSE;
BEGIN
  v_res := public.run_daily_digest('{"dry_run": true}'::jsonb);
  ASSERT (v_res ->> 'processed') IS NOT NULL, 'S9 digest dry run';
  ASSERT public.notifications_digest_wanted('public', gen_random_uuid()), 'S9 digest on by default';
  ASSERT NOT public.notifications_digest_wanted('public', NULL), 'S9 no user, no digest';
  v_res := public.run_timesheet_reminders('{"dry_run": true}'::jsonb);
  ASSERT (v_res ->> 'processed')::INT = 0, 'S9 timesheet dry run sends nothing';
  v_res := public.run_recurring_task_generation('{}'::jsonb);
  ASSERT (v_res ->> 'processed') IS NOT NULL, 'S9 recurring tasks';
  ASSERT public.run_recurring_task_generation('{}'::jsonb) ->> 'processed' = '0', 'S9 recurring tasks: second run creates nothing';
  v_res := public.run_evm_period_snapshots('{}'::jsonb);
  ASSERT (v_res ->> 'processed') IS NOT NULL, 'S9 EVM snapshots';
  ASSERT public.run_evm_period_snapshots('{}'::jsonb) ->> 'processed' = '0', 'S9 EVM: second run adds nothing';
  v_res := public.run_due_health_reports('{}'::jsonb);
  ASSERT (v_res ->> 'processed') IS NOT NULL, 'S9 due health reports';
  ASSERT NOT EXISTS (SELECT 1 FROM public.scheduled_health_reports WHERE is_active AND NOT is_deleted AND next_run_at IS NULL),
         'S9 every active Platform schedule has a send time';
  ASSERT NOT EXISTS (SELECT 1 FROM sim.scheduled_health_reports WHERE is_active AND NOT is_deleted AND next_run_at IS NULL),
         'S9 every active Simulator schedule has a send time';
  BEGIN
    PERFORM public.scheduled_report_build('public', gen_random_uuid());
  EXCEPTION WHEN OTHERS THEN v_err := TRUE;
  END;
  ASSERT v_err, 'S9 building an unknown run fails';
  RAISE NOTICE 'PASS S9 other jobs run cleanly';
END $$;

-- S10 ────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  ASSERT (SELECT count(*) FROM public.background_jobs WHERE
           (code = 'reports.health_due'        AND kind = 'sql'     AND time_basis = 'utc')
        OR (code = 'reports.health_send'       AND kind = 'handler' AND cron IS NULL)
        OR (code = 'tasks.recurring_generate'  AND kind = 'sql')
        OR (code = 'reminders.due_dates'       AND kind = 'sql'     AND time_basis = 'organisation')
        OR (code = 'timesheets.reminders'      AND kind = 'sql'     AND time_basis = 'organisation')
        OR (code = 'evm.period_snapshots'      AND kind = 'sql')
        OR (code = 'notifications.daily_digest' AND kind = 'sql'    AND time_basis = 'organisation')
        OR (code = 'notifications.digest_send' AND kind = 'handler' AND cron IS NULL)) = 8, 'S10 eight Slice 1 jobs';
  ASSERT NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname <> 'nidus_background_tick'
                       AND jobname IN ('reports.health_due', 'reminders.due_dates', 'notifications.daily_digest')), 'S10 no own pg_cron entries';
  RAISE NOTICE 'PASS S10 catalogue';
END $$;

DO $$ BEGIN RAISE NOTICE 'v1565: all Slice 1 background job tests passed (rolling back)'; END $$;

ROLLBACK;
