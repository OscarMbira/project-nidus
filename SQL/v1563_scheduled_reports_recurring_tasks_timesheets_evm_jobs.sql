-- ============================================================================
-- v1563: Scheduled health reports, recurring tasks, timesheet reminders, EVM snapshots — v1352 Slice 1
--        (1.1, 1.2, 1.4, 1.5), both schemas (D8)
-- PRD:  projectprd/v1352_background_jobs_PRD.md     Plan: projectplan/v1352_background_jobs_plan.md
--
-- Jobs (rule 80, catalogue rows at the end of this file):
--   reports.health_due       sql      public.run_due_health_reports(jsonb)        */15 * * * *  UTC — next_run_at
--                                      already holds the project's local send time (D5)
--   reports.health_send      handler  builds and emails one report run (queue only); "Run now" in both apps
--                                      queues the same item through scheduled_health_report_run_now (D3 / story 10)
--   tasks.recurring_generate sql      public.run_recurring_task_generation(jsonb) 30 0 * * *    UTC, plus on schedule save
--   timesheets.reminders     sql      public.run_timesheet_reminders(jsonb)       0 14 * * 5    organisation time
--   evm.period_snapshots     sql      public.run_evm_period_snapshots(jsonb)      15 1 * * *    UTC, project-local month end
--
-- Idempotency: report runs are queued once per schedule and send time (queue dedupe key); recurring tasks
-- once per (template, occurrence date); timesheet reminders once per (project, period) through
-- reminder_markers; EVM snapshots once per (project, period) — UNIQUE, existing rows are never overwritten.
-- Planner-edition accounts: only recurring tasks / timesheet reminders whose tables are allow-listed run
-- (bj_account_allows_tables, v1562). No new tables; timesheet_reminders gains is_automatic.
-- Prerequisites: v1562 (helpers, reminder markers and messages), v645, v963u, v644, v963l, v418, v421,
-- v417, v628e, v1473. Idempotent.
-- ============================================================================

-- ── 1. Scheduled health reports (1.1) ────────────────────────────────────────
-- Next send time after p_after, in the given time zone. schedule_config may hold send_hour (0–23,
-- default 7), weekday (ISO 1 = Monday, default 1) and day_of_month (1–28, default 1).
CREATE OR REPLACE FUNCTION public.scheduled_report_next_run(p_frequency TEXT, p_config JSONB, p_after TIMESTAMPTZ, p_tz TEXT)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_tz    TEXT := COALESCE(public.bj_valid_time_zone(p_tz), 'UTC');
  v_local TIMESTAMP := p_after AT TIME ZONE COALESCE(public.bj_valid_time_zone(p_tz), 'UTC');
  v_hour  INTEGER := CASE WHEN COALESCE(p_config ->> 'send_hour', '') ~ '^\d{1,2}$' THEN LEAST((p_config ->> 'send_hour')::INTEGER, 23) ELSE 7 END;
  v_wday  INTEGER := CASE WHEN COALESCE(p_config ->> 'weekday', '') ~ '^[1-7]$' THEN (p_config ->> 'weekday')::INTEGER ELSE 1 END;
  v_mday  INTEGER := CASE WHEN COALESCE(p_config ->> 'day_of_month', '') ~ '^\d{1,2}$'
                          THEN LEAST(GREATEST((p_config ->> 'day_of_month')::INTEGER, 1), 28) ELSE 1 END;
  v_step  INTEGER;
  v_month INTEGER;
  v_cand  TIMESTAMP;
BEGIN
  IF p_frequency = 'weekly' THEN
    v_cand := (v_local::DATE + ((v_wday - EXTRACT(ISODOW FROM v_local)::INTEGER + 7) % 7)) + make_interval(hours => v_hour);
    IF v_cand <= v_local THEN v_cand := v_cand + INTERVAL '7 days'; END IF;
  ELSE
    v_step := CASE WHEN p_frequency = 'quarterly' THEN 3 ELSE 1 END;
    v_month := EXTRACT(MONTH FROM v_local)::INTEGER;
    IF v_step = 3 THEN v_month := ((v_month - 1) / 3) * 3 + 1; END IF;
    v_cand := make_date(EXTRACT(YEAR FROM v_local)::INTEGER, v_month, v_mday) + make_interval(hours => v_hour);
    WHILE v_cand <= v_local LOOP
      v_cand := v_cand + make_interval(months => v_step);
    END LOOP;
  END IF;
  RETURN v_cand AT TIME ZONE v_tz;
END;
$$;

-- Keeps next_run_at filled (both schemas): set on create, recalculated when the frequency or the
-- schedule settings change. The due job moves it on after each run.
CREATE OR REPLACE FUNCTION public.trg_scheduled_report_next_run()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
BEGIN
  IF COALESCE(NEW.is_active, TRUE) AND NOT COALESCE(NEW.is_deleted, FALSE)
     AND (NEW.next_run_at IS NULL
          OR (TG_OP = 'UPDATE' AND (NEW.frequency IS DISTINCT FROM OLD.frequency
                                    OR NEW.schedule_config IS DISTINCT FROM OLD.schedule_config
                                    OR (NEW.is_active AND NOT COALESCE(OLD.is_active, TRUE))))) THEN
    NEW.next_run_at := public.scheduled_report_next_run(NEW.frequency, NEW.schedule_config, NOW(),
                         public.bj_project_time_zone(TG_TABLE_SCHEMA, NEW.project_id));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_scheduled_health_reports_next_run ON public.scheduled_health_reports;
CREATE TRIGGER trg_scheduled_health_reports_next_run BEFORE INSERT OR UPDATE ON public.scheduled_health_reports
  FOR EACH ROW EXECUTE FUNCTION public.trg_scheduled_report_next_run();
DROP TRIGGER IF EXISTS trg_scheduled_health_reports_next_run ON sim.scheduled_health_reports;
CREATE TRIGGER trg_scheduled_health_reports_next_run BEFORE INSERT OR UPDATE ON sim.scheduled_health_reports
  FOR EACH ROW EXECUTE FUNCTION public.trg_scheduled_report_next_run();

-- Existing active schedules get their first send time.
UPDATE public.scheduled_health_reports SET next_run_at = NULL WHERE next_run_at IS NULL AND is_active AND NOT is_deleted;
UPDATE sim.scheduled_health_reports SET next_run_at = NULL WHERE next_run_at IS NULL AND is_active AND NOT is_deleted;

-- One report run: a pending run row and one queue item for reports.health_send (same path for the
-- schedule and for "Run now"). Returns the run id, or NULL when this send was already queued.
CREATE OR REPLACE FUNCTION public.scheduled_report_queue_run(p_schema TEXT, p_schedule_id UUID, p_trigger TEXT, p_dedupe_key TEXT,
                                                            p_account_id UUID DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
DECLARE
  v_run UUID;
BEGIN
  IF p_dedupe_key IS NOT NULL AND EXISTS (SELECT 1 FROM public.background_job_queue q
                                           WHERE q.job_code = 'reports.health_send' AND q.dedupe_key = p_dedupe_key) THEN
    RETURN NULL;
  END IF;
  IF p_schema = 'sim' THEN
    INSERT INTO sim.scheduled_report_runs (schedule_id, run_status, report_data)
    VALUES (p_schedule_id, 'pending', jsonb_build_object('triggered', p_trigger))
    RETURNING id INTO v_run;
  ELSE
    INSERT INTO public.scheduled_report_runs (schedule_id, run_status, report_data)
    VALUES (p_schedule_id, 'pending', jsonb_build_object('triggered', p_trigger))
    RETURNING id INTO v_run;
  END IF;
  PERFORM public.enqueue_background_job('reports.health_send',
    jsonb_build_object('schema', p_schema, 'run_id', v_run, 'schedule_id', p_schedule_id),
    NULL, COALESCE(p_dedupe_key, 'run:' || v_run::TEXT), p_account_id);
  RETURN v_run;
END;
$$;

-- The job (reports.health_due): every schedule whose send time has come, both schemas.
CREATE OR REPLACE FUNCTION public.run_due_health_reports(p_context JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
DECLARE
  s         RECORD;
  v_schema  TEXT;
  v_account UUID;
  v_run     UUID;
  v_queued  INTEGER := 0;
  v_planner INTEGER := 0;
BEGIN
  FOREACH v_schema IN ARRAY ARRAY['public', 'sim'] LOOP
    FOR s IN EXECUTE format(
      'SELECT h.id, h.project_id, h.frequency, h.schedule_config, h.next_run_at FROM %I.scheduled_health_reports h
        WHERE h.is_active AND NOT h.is_deleted AND h.next_run_at IS NOT NULL AND h.next_run_at <= NOW()
        ORDER BY h.next_run_at FOR UPDATE SKIP LOCKED', v_schema)
    LOOP
      v_account := public.bj_project_account(v_schema, s.project_id);
      IF v_account IS NOT NULL AND NOT public.bj_account_allows_tables(v_account,
           ARRAY[v_schema || '.scheduled_health_reports', v_schema || '.scheduled_report_runs']) THEN
        v_planner := v_planner + 1;
        CONTINUE;
      END IF;
      v_run := public.scheduled_report_queue_run(v_schema, s.id, 'schedule',
                 v_schema || ':' || s.id::TEXT || ':' || to_char(s.next_run_at AT TIME ZONE 'UTC', 'YYYYMMDDHH24MI'), v_account);
      IF v_run IS NOT NULL THEN v_queued := v_queued + 1; END IF;
      EXECUTE format('UPDATE %I.scheduled_health_reports SET next_run_at = $1 WHERE id = $2', v_schema)
        USING public.scheduled_report_next_run(s.frequency, s.schedule_config, NOW(),
                public.bj_project_time_zone(v_schema, s.project_id, v_account)), s.id;
    END LOOP;
  END LOOP;
  IF v_queued > 0 THEN PERFORM public.background_job_wake_worker(); END IF;
  RETURN jsonb_build_object('processed', v_queued, 'skipped_planner', v_planner);
END;
$$;

-- "Run now" (Platform). Same queue item as the schedule; the report arrives within a minute or two.
CREATE OR REPLACE FUNCTION public.scheduled_health_report_run_now(p_schedule_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_project UUID;
  v_run     UUID;
BEGIN
  v_project := (SELECT h.project_id FROM public.scheduled_health_reports h WHERE h.id = p_schedule_id AND NOT h.is_deleted);
  IF v_project IS NULL THEN RAISE EXCEPTION 'Scheduled report not found'; END IF;
  IF NOT public.auth_user_can_access_project(v_project) THEN
    RAISE EXCEPTION 'You do not have access to this project' USING ERRCODE = '42501';
  END IF;
  v_run := public.scheduled_report_queue_run('public', p_schedule_id, 'manual', NULL, public.bj_project_account('public', v_project));
  PERFORM public.background_job_wake_worker();
  RETURN (SELECT to_jsonb(r) FROM public.scheduled_report_runs r WHERE r.id = v_run);
END;
$$;

-- "Run now" (Simulator): the learner who owns the practice project, a member, or the schedule's creator.
CREATE OR REPLACE FUNCTION sim.scheduled_health_report_run_now(p_schedule_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
DECLARE
  v_sched RECORD;
  v_run   UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501'; END IF;
  FOR v_sched IN SELECT h.id, h.project_id, h.created_by FROM sim.scheduled_health_reports h
                  WHERE h.id = p_schedule_id AND NOT h.is_deleted LOOP
    IF NOT (v_sched.created_by = auth.uid()
            OR EXISTS (SELECT 1 FROM sim.practice_projects pp WHERE pp.id = v_sched.project_id AND pp.user_id = auth.uid())
            OR EXISTS (SELECT 1 FROM sim.practice_project_memberships m
                        WHERE m.practice_project_id = v_sched.project_id AND m.user_id = auth.uid() AND COALESCE(m.is_active, TRUE))) THEN
      RAISE EXCEPTION 'You do not have access to this practice project' USING ERRCODE = '42501';
    END IF;
    v_run := public.scheduled_report_queue_run('sim', p_schedule_id, 'manual', NULL, public.bj_project_account('sim', v_sched.project_id));
    PERFORM public.background_job_wake_worker();
    RETURN (SELECT to_jsonb(r) FROM sim.scheduled_report_runs r WHERE r.id = v_run);
  END LOOP;
  RAISE EXCEPTION 'Scheduled report not found';
END;
$$;

-- A count that is NULL when the source table / column does not exist in this environment.
CREATE OR REPLACE FUNCTION public.bj_safe_count(p_sql TEXT, p_id UUID, p_date DATE)
RETURNS INTEGER
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
DECLARE
  v   INTEGER;
  rec RECORD;
BEGIN
  FOR rec IN EXECUTE 'SELECT (' || p_sql || ') AS n' USING p_id, p_date LOOP
    v := rec.n;
  END LOOP;
  RETURN v;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.bj_safe_json(p_sql TEXT, p_id UUID, p_date DATE)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
DECLARE
  v   JSONB;
  rec RECORD;
BEGIN
  FOR rec IN EXECUTE 'SELECT (' || p_sql || ') AS j' USING p_id, p_date LOOP
    v := rec.j;
  END LOOP;
  RETURN v;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

-- Report content for one run (service role; called by the reports.health_send handler). Marks the run
-- running and stores the snapshot it sends. Practice reports carry practice = true (D8).
CREATE OR REPLACE FUNCTION public.scheduled_report_build(p_schema TEXT, p_run_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
DECLARE
  v_sched     JSONB;
  v_project   JSONB;
  v_pid       UUID;
  v_account   UUID;
  v_today     DATE;
  v_fmt       TEXT;
  v_recips    TEXT[];
  v_pcol      TEXT := CASE WHEN p_schema = 'sim' THEN 'practice_project_id' ELSE 'project_id' END;
  v_risks     TEXT := CASE WHEN p_schema = 'sim' THEN 'sim.practice_risks' ELSE 'public.risks' END;
  v_issues    TEXT := CASE WHEN p_schema = 'sim' THEN 'sim.practice_issues' ELSE 'public.issues' END;
  v_data      JSONB;
  v_rec       RECORD;
BEGIN
  IF p_schema NOT IN ('public', 'sim') THEN RAISE EXCEPTION 'Unknown schema %', p_schema; END IF;
  FOR v_rec IN EXECUTE format('SELECT to_jsonb(h) AS j FROM %I.scheduled_report_runs r JOIN %I.scheduled_health_reports h ON h.id = r.schedule_id WHERE r.id = $1',
                               p_schema, p_schema) USING p_run_id LOOP
    v_sched := v_rec.j;
  END LOOP;
  IF v_sched IS NULL THEN RAISE EXCEPTION 'Report run % not found', p_run_id; END IF;
  v_pid := (v_sched ->> 'project_id')::UUID;
  IF p_schema = 'sim' THEN
    v_project := (SELECT to_jsonb(pp) FROM sim.practice_projects pp WHERE pp.id = v_pid);
  ELSE
    v_project := (SELECT to_jsonb(p) || jsonb_build_object('status_name', ps.status_name)
                    FROM public.projects p LEFT JOIN public.project_statuses ps ON ps.id = p.status_id WHERE p.id = v_pid);
  END IF;
  v_account := public.bj_project_account(p_schema, v_pid);
  v_today := (NOW() AT TIME ZONE public.bj_project_time_zone(p_schema, v_pid, v_account))::DATE;
  v_fmt := public.bj_account_date_format(v_account);

  v_recips := ARRAY(SELECT DISTINCT btrim(e) FROM unnest(ARRAY(SELECT jsonb_array_elements_text(COALESCE(v_sched -> 'recipient_emails', '[]'::jsonb)))) AS e
                     WHERE btrim(e) ~ '^[^@\s]+@[^@\s]+$');
  IF cardinality(v_recips) = 0 THEN
    -- nobody listed: the person who set the schedule up
    v_recips := ARRAY(SELECT u.email FROM public.users u WHERE u.auth_user_id = (v_sched ->> 'created_by')::UUID AND COALESCE(u.email, '') <> '');
  END IF;

  v_data := jsonb_build_object(
    'schema', p_schema,
    'practice', p_schema = 'sim',
    'run_id', p_run_id,
    'schedule_name', v_sched ->> 'schedule_name',
    'frequency', v_sched ->> 'frequency',
    'recipients', to_jsonb(v_recips),
    'report_date', public.bj_format_date(v_today, v_fmt),
    'project', jsonb_build_object(
      'name', v_project ->> 'project_name',
      'code', COALESCE(v_project ->> 'project_code', v_project ->> 'practice_code'),
      'status', COALESCE(v_project ->> 'status_name', v_project ->> 'project_status'),
      'health', v_project ->> 'health_status',
      'percent_complete', v_project -> 'percentage_complete',
      'planned_start', public.bj_format_date((v_project ->> 'planned_start_date')::DATE, v_fmt),
      'planned_end', public.bj_format_date((v_project ->> 'planned_end_date')::DATE, v_fmt),
      'budget', v_project -> 'budget_amount',
      'currency', v_project ->> 'budget_currency'),
    'counts', jsonb_build_object(
      'open_risks', public.bj_safe_count(format(
         'SELECT count(*)::int FROM %s r WHERE r.%I = $1 AND $2 IS NOT NULL AND NOT COALESCE(r.is_deleted, FALSE)
            AND lower(COALESCE(to_jsonb(r) ->> ''status_enum'', r.status, '''')) NOT IN (''closed'', ''expired'', ''realized'')', v_risks, v_pcol), v_pid, v_today),
      'open_issues', public.bj_safe_count(format(
         'SELECT count(*)::int FROM %s r WHERE r.%I = $1 AND $2 IS NOT NULL AND NOT COALESCE(r.is_deleted, FALSE)
            AND lower(COALESCE(r.status, '''')) NOT IN (''resolved'', ''closed'', ''cancelled'')', v_issues, v_pcol), v_pid, v_today),
      'overdue_tasks', public.bj_safe_count(format(
         'SELECT count(*)::int FROM %I.tasks t WHERE t.%I = $1 AND NOT COALESCE(t.is_deleted, FALSE)
            AND COALESCE(t.percentage_complete, 0) < 100 AND COALESCE(t.due_date, t.planned_end_date) < $2', p_schema, v_pcol), v_pid, v_today),
      'overdue_milestones', public.bj_safe_count(format(
         'SELECT count(*)::int FROM %I.project_milestones m WHERE m.%I = $1 AND NOT COALESCE(m.is_deleted, FALSE)
            AND NOT COALESCE(m.is_completed, FALSE) AND m.milestone_date < $2', p_schema, v_pcol), v_pid, v_today),
      'actual_cost', public.bj_safe_json(format(
         'SELECT to_jsonb(COALESCE(sum(c.amount), 0)) FROM %I.project_cost_entries c WHERE c.%I = $1 AND NOT COALESCE(c.is_deleted, FALSE)
            AND c.entry_date <= $2', p_schema, v_pcol), v_pid, v_today)),
    'milestones', COALESCE(public.bj_safe_json(format(
         'SELECT jsonb_agg(jsonb_build_object(''name'', m.milestone_name, ''date'', m.milestone_date) ORDER BY m.milestone_date)
            FROM (SELECT * FROM %I.project_milestones m WHERE m.%I = $1 AND NOT COALESCE(m.is_deleted, FALSE)
                     AND NOT COALESCE(m.is_completed, FALSE) AND m.milestone_date BETWEEN $2 AND $2 + 30
                   ORDER BY m.milestone_date LIMIT 5) m', p_schema, v_pcol), v_pid, v_today), '[]'::jsonb),
    'evm', public.bj_safe_json(format(
         'SELECT to_jsonb(s) FROM (SELECT period_date, planned_value, earned_value, actual_cost FROM %I.project_evm_snapshots
            WHERE %I = $1 AND period_date <= $2 ORDER BY period_date DESC LIMIT 1) s',
         p_schema, CASE WHEN p_schema = 'sim' THEN 'practice_project_id' ELSE 'project_id' END), v_pid, v_today));

  -- milestone dates in the organisation's format
  v_data := jsonb_set(v_data, '{milestones}', COALESCE((
    SELECT jsonb_agg(jsonb_build_object('name', m ->> 'name', 'date', public.bj_format_date((m ->> 'date')::DATE, v_fmt)))
      FROM jsonb_array_elements(v_data -> 'milestones') m), '[]'::jsonb));

  EXECUTE format('UPDATE %I.scheduled_report_runs SET run_status = ''running'', report_data = COALESCE(report_data, ''{}''::jsonb) || $2, updated_at = NOW() WHERE id = $1',
                 p_schema) USING p_run_id, jsonb_build_object('snapshot', v_data - 'recipients');
  RETURN v_data;
END;
$$;

-- Result of one run (service role; called by the handler).
CREATE OR REPLACE FUNCTION public.scheduled_report_finish(p_schema TEXT, p_run_id UUID, p_ok BOOLEAN, p_error TEXT DEFAULT NULL, p_sent INTEGER DEFAULT 0)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
DECLARE
  v_status TEXT := CASE WHEN p_ok THEN 'completed' ELSE 'failed' END;
BEGIN
  IF p_schema NOT IN ('public', 'sim') THEN RAISE EXCEPTION 'Unknown schema %', p_schema; END IF;
  EXECUTE format('UPDATE %I.scheduled_report_runs SET run_status = $2, error_message = $3,
                    sent_at = CASE WHEN $4 > 0 THEN NOW() ELSE sent_at END,
                    report_data = COALESCE(report_data, ''{}''::jsonb) || jsonb_build_object(''emails_sent'', $4), updated_at = NOW()
                  WHERE id = $1', p_schema)
    USING p_run_id, v_status, left(p_error, 2000), COALESCE(p_sent, 0);
  RETURN v_status;
END;
$$;

-- ── 2. Recurring task generator (1.2) ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.recurring_task_next_date(p_pattern TEXT, p_from DATE)
RETURNS DATE
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE lower(COALESCE(p_pattern, ''))
           WHEN 'daily'     THEN p_from + 1
           WHEN 'weekly'    THEN p_from + 7
           WHEN 'biweekly'  THEN p_from + 14
           WHEN 'monthly'   THEN (p_from + INTERVAL '1 month')::DATE
           WHEN 'quarterly' THEN (p_from + INTERVAL '3 months')::DATE
         END;
$$;

-- Creates the task and its instance row for one occurrence unless that occurrence exists already.
CREATE OR REPLACE FUNCTION public.recurring_task_create_occurrence(p_schema TEXT, p_template_id UUID, p_project_id UUID,
                                                                  p_name TEXT, p_date DATE)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
DECLARE
  v_task UUID;
BEGIN
  IF p_schema = 'sim' THEN
    IF EXISTS (SELECT 1 FROM sim.recurring_task_instances i WHERE i.template_id = p_template_id AND i.scheduled_for = p_date AND NOT i.is_deleted) THEN
      RETURN FALSE;
    END IF;
    INSERT INTO sim.tasks (practice_project_id, task_name, task_description, task_type, planned_start_date, planned_end_date, due_date)
    VALUES (p_project_id, left(p_name, 200), 'Created from a recurring task schedule.', 'task', p_date, p_date, p_date)
    RETURNING id INTO v_task;
    INSERT INTO sim.recurring_task_instances (template_id, scheduled_for, generated_entity_type, generated_entity_id, instance_status)
    VALUES (p_template_id, p_date, 'task', v_task, 'created');
  ELSE
    IF EXISTS (SELECT 1 FROM public.recurring_task_instances i WHERE i.template_id = p_template_id AND i.scheduled_for = p_date AND NOT i.is_deleted) THEN
      RETURN FALSE;
    END IF;
    INSERT INTO public.tasks (project_id, task_name, task_description, task_type, planned_start_date, planned_end_date, due_date)
    VALUES (p_project_id, left(p_name, 200), 'Created from a recurring task schedule.', 'task', p_date, p_date, p_date)
    RETURNING id INTO v_task;
    INSERT INTO public.recurring_task_instances (template_id, scheduled_for, generated_entity_type, generated_entity_id, instance_status)
    VALUES (p_template_id, p_date, 'task', v_task, 'created');
  END IF;
  RETURN TRUE;
END;
$$;

-- Generates every occurrence from the schedule's next_run_at up to today + lead days (recurrence_config
-- lead_days, default 7, at most 90), respecting the end condition, then moves next_run_at on.
-- Idempotent per (template, occurrence date). p_template_id NULL = all templates of the schema.
CREATE OR REPLACE FUNCTION public.generate_recurring_tasks(p_schema TEXT, p_template_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
DECLARE
  t          RECORD;
  v_account  UUID;
  v_tz       TEXT;
  v_occ      DATE;
  v_next     DATE;
  v_time     TIME;
  v_horizon  DATE;
  v_count    INTEGER;
  v_guard    INTEGER;
  v_made     INTEGER := 0;
  v_rec      RECORD;
BEGIN
  IF p_schema NOT IN ('public', 'sim') THEN RAISE EXCEPTION 'Unknown schema %', p_schema; END IF;
  PERFORM set_config('nidus.recurring_generating', 'on', true);
  FOR t IN EXECUTE format(
    'SELECT tpl.id, tpl.%I AS project_id, tpl.template_name, tpl.recurrence_pattern, tpl.recurrence_config,
            tpl.end_condition, tpl.max_occurrences, tpl.end_date, s.id AS schedule_id, s.next_run_at, s.timezone
       FROM %I.recurring_task_templates tpl
       JOIN %I.recurring_task_schedules s ON s.template_id = tpl.id
      WHERE tpl.is_active AND NOT tpl.is_deleted AND lower(tpl.entity_type) = ''task'' AND s.next_run_at IS NOT NULL
        AND ($1::uuid IS NULL OR tpl.id = $1)',
    CASE WHEN p_schema = 'sim' THEN 'practice_project_id' ELSE 'project_id' END, p_schema, p_schema) USING p_template_id
  LOOP
    v_account := public.bj_project_account(p_schema, t.project_id);
    CONTINUE WHEN v_account IS NOT NULL AND NOT public.bj_account_allows_tables(v_account,
      ARRAY(SELECT CASE WHEN p_schema = 'sim' THEN 'sim.' ELSE '' END || x
              FROM unnest(ARRAY['recurring_task_templates', 'recurring_task_schedules', 'recurring_task_instances', 'tasks']) AS x));
    v_tz := COALESCE(public.bj_valid_time_zone(t.timezone), public.bj_project_time_zone(p_schema, t.project_id, v_account));
    v_occ := (t.next_run_at AT TIME ZONE v_tz)::DATE;
    v_time := (t.next_run_at AT TIME ZONE v_tz)::TIME;
    v_horizon := (NOW() AT TIME ZONE v_tz)::DATE
                 + CASE WHEN COALESCE(t.recurrence_config ->> 'lead_days', '') ~ '^\d{1,3}$'
                        THEN LEAST((t.recurrence_config ->> 'lead_days')::INTEGER, 90) ELSE 7 END;
    v_count := 0;
    FOR v_rec IN EXECUTE format('SELECT count(*)::int AS n FROM %I.recurring_task_instances i WHERE i.template_id = $1 AND NOT i.is_deleted', p_schema)
                 USING t.id LOOP
      v_count := v_rec.n;
    END LOOP;
    v_guard := 0;
    WHILE v_occ <= v_horizon AND v_guard < 120 LOOP
      EXIT WHEN t.end_condition = 'until_date' AND t.end_date IS NOT NULL AND v_occ > t.end_date;
      EXIT WHEN t.end_condition = 'after_count' AND t.max_occurrences IS NOT NULL AND v_count >= t.max_occurrences;
      IF public.recurring_task_create_occurrence(p_schema, t.id, t.project_id, t.template_name, v_occ) THEN
        v_made := v_made + 1;
        v_count := v_count + 1;
      END IF;
      v_next := public.recurring_task_next_date(t.recurrence_pattern, v_occ);
      EXIT WHEN v_next IS NULL OR v_next <= v_occ;
      v_occ := v_next;
      v_guard := v_guard + 1;
    END LOOP;
    EXECUTE format('UPDATE %I.recurring_task_schedules SET next_run_at = $1, last_run_at = NOW(), updated_at = NOW()
                     WHERE id = $2 AND next_run_at IS DISTINCT FROM $1', p_schema)
      USING ((v_occ + v_time) AT TIME ZONE v_tz), t.schedule_id;
  END LOOP;
  PERFORM set_config('nidus.recurring_generating', 'off', true);
  RETURN v_made;
END;
$$;

-- The job (tasks.recurring_generate): both schemas.
CREATE OR REPLACE FUNCTION public.run_recurring_task_generation(p_context JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
DECLARE
  v_public INTEGER;
  v_sim    INTEGER;
BEGIN
  v_public := public.generate_recurring_tasks('public', NULL);
  v_sim := public.generate_recurring_tasks('sim', NULL);
  RETURN jsonb_build_object('processed', v_public + v_sim, 'public', v_public, 'sim', v_sim);
END;
$$;

-- On schedule save: generate straight away (a failure never blocks the save; the daily job retries).
CREATE OR REPLACE FUNCTION public.trg_recurring_schedule_generate()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
BEGIN
  IF COALESCE(current_setting('nidus.recurring_generating', true), 'off') = 'on' THEN RETURN NEW; END IF;
  BEGIN
    PERFORM public.generate_recurring_tasks(TG_TABLE_SCHEMA, NEW.template_id);
  EXCEPTION WHEN OTHERS THEN
    PERFORM set_config('nidus.recurring_generating', 'off', true);
    RAISE NOTICE 'recurring task generation deferred to the daily job: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recurring_schedule_generate ON public.recurring_task_schedules;
CREATE TRIGGER trg_recurring_schedule_generate AFTER INSERT OR UPDATE OF next_run_at, timezone ON public.recurring_task_schedules
  FOR EACH ROW EXECUTE FUNCTION public.trg_recurring_schedule_generate();
DROP TRIGGER IF EXISTS trg_recurring_schedule_generate ON sim.recurring_task_schedules;
CREATE TRIGGER trg_recurring_schedule_generate AFTER INSERT OR UPDATE OF next_run_at, timezone ON sim.recurring_task_schedules
  FOR EACH ROW EXECUTE FUNCTION public.trg_recurring_schedule_generate();

-- ── 3. Timesheet reminders (1.4) ─────────────────────────────────────────────
-- Automatic reminders are logged too (no sender); the manual "Send reminder" is unchanged.
ALTER TABLE public.timesheet_reminders ALTER COLUMN sent_by DROP NOT NULL;
ALTER TABLE public.timesheet_reminders ADD COLUMN IF NOT EXISTS is_automatic BOOLEAN NOT NULL DEFAULT FALSE;
COMMENT ON COLUMN public.timesheet_reminders.is_automatic IS 'v1352: TRUE for reminders sent by the timesheets.reminders background job (sent_by is then NULL).';

-- First day of the week containing p_day, for the organisation's first day of week (rule 68).
CREATE OR REPLACE FUNCTION public.bj_week_start(p_day DATE, p_first_day TEXT)
RETURNS DATE
LANGUAGE sql IMMUTABLE
AS $$
  SELECT p_day - ((EXTRACT(ISODOW FROM p_day)::INTEGER
                   - CASE lower(COALESCE(p_first_day, 'monday')) WHEN 'sunday' THEN 7 WHEN 'saturday' THEN 6 ELSE 1 END + 7) % 7);
$$;

CREATE OR REPLACE FUNCTION public.bj_account_first_day(p_account_id UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  SELECT COALESCE((SELECT s.first_day_of_week::TEXT FROM public.organisation_regional_format_settings s
                    WHERE s.account_id = p_account_id AND NOT COALESCE(s.is_deleted, FALSE) LIMIT 1), 'monday');
$$;

-- The job (timesheets.reminders): before the current period closes, remind project members with no time
-- or with draft time this period. Only projects that used timesheets in the last 28 days. Once per
-- (project, period) through reminder_markers. In-app; email through the daily digest (D6).
CREATE OR REPLACE FUNCTION public.run_timesheet_reminders(p_context JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
DECLARE
  v_dry     BOOLEAN := COALESCE((p_context ->> 'dry_run')::BOOLEAN, FALSE);
  v_msg     public.reminder_messages;
  p         RECORD;
  v_schema  TEXT;
  v_tz      TEXT;
  v_today   DATE;
  v_start   DATE;
  v_end     DATE;
  v_users   UUID[];
  v_user    UUID;
  v_marker  UUID;
  v_date    TEXT;
  v_title   TEXT;
  v_body    TEXT;
  v_sent    INTEGER := 0;
  v_projects INTEGER := 0;
BEGIN
  v_msg := (SELECT m FROM public.reminder_messages m WHERE m.message_key = 'timesheet_period');
  FOREACH v_schema IN ARRAY ARRAY['public', 'sim'] LOOP
    FOR p IN
      SELECT x.id, x.name, x.account_id FROM (
        SELECT pr.id, pr.project_name AS name, pr.account_id
          FROM public.projects pr
         WHERE v_schema = 'public' AND NOT COALESCE(pr.is_deleted, FALSE) AND pr.account_id IS NOT NULL
           AND EXISTS (SELECT 1 FROM public.timesheet_entries e WHERE e.project_id = pr.id AND NOT e.is_deleted
                        AND e.entry_date >= CURRENT_DATE - 28)
        UNION ALL
        SELECT pp.id, pp.project_name, public.bj_project_account('sim', pp.id)
          FROM sim.practice_projects pp
         WHERE v_schema = 'sim' AND NOT COALESCE(pp.is_deleted, FALSE)
           AND EXISTS (SELECT 1 FROM sim.timesheet_entries e WHERE e.project_id = pp.id AND NOT e.is_deleted
                        AND e.entry_date >= CURRENT_DATE - 28)
      ) x
    LOOP
      CONTINUE WHEN p.account_id IS NULL;
      CONTINUE WHEN NOT public.bj_zone_due(p_context, public.bj_account_time_zone(p.account_id));
      CONTINUE WHEN NOT public.bj_account_allows_tables(p.account_id,
        CASE WHEN v_schema = 'sim' THEN ARRAY['sim.timesheet_entries'] ELSE ARRAY['timesheet_entries', 'user_projects'] END);
      v_tz := public.bj_project_time_zone(v_schema, p.id, p.account_id);
      v_today := (NOW() AT TIME ZONE v_tz)::DATE;
      v_start := public.bj_week_start(v_today, public.bj_account_first_day(p.account_id));
      v_end := v_start + 6;

      IF v_schema = 'sim' THEN
        v_users := ARRAY(
          SELECT DISTINCT u.id FROM (
              SELECT pp.user_id AS auth_id FROM sim.practice_projects pp WHERE pp.id = p.id
              UNION
              SELECT m.user_id FROM sim.practice_project_memberships m WHERE m.practice_project_id = p.id AND COALESCE(m.is_active, TRUE)
            ) mem
            JOIN public.users u ON u.auth_user_id = mem.auth_id AND COALESCE(u.is_active, TRUE) AND NOT COALESCE(u.is_deleted, FALSE)
           WHERE NOT EXISTS (SELECT 1 FROM sim.timesheet_entries e WHERE e.project_id = p.id AND e.user_id = mem.auth_id
                              AND NOT e.is_deleted AND e.entry_date BETWEEN v_start AND v_end)
              OR EXISTS (SELECT 1 FROM sim.timesheet_entries e WHERE e.project_id = p.id AND e.user_id = mem.auth_id
                          AND NOT e.is_deleted AND e.entry_date BETWEEN v_start AND v_end AND e.status = 'draft'));
      ELSE
        v_users := ARRAY(
          SELECT DISTINCT u.id FROM public.user_projects up
            JOIN public.users u ON u.id = up.user_id AND COALESCE(u.is_active, TRUE) AND NOT COALESCE(u.is_deleted, FALSE)
           WHERE up.project_id = p.id AND NOT COALESCE(up.is_deleted, FALSE)
             AND (NOT EXISTS (SELECT 1 FROM public.timesheet_entries e WHERE e.project_id = p.id AND e.user_id = u.auth_user_id
                               AND NOT e.is_deleted AND e.entry_date BETWEEN v_start AND v_end)
                  OR EXISTS (SELECT 1 FROM public.timesheet_entries e WHERE e.project_id = p.id AND e.user_id = u.auth_user_id
                              AND NOT e.is_deleted AND e.entry_date BETWEEN v_start AND v_end AND e.status = 'draft')));
      END IF;
      CONTINUE WHEN cardinality(v_users) = 0;
      v_projects := v_projects + 1;
      CONTINUE WHEN v_dry;

      v_marker := public.reminder_mark(v_schema, 'timesheet_period', p.id, 'before', v_end, p.account_id, v_users);
      CONTINUE WHEN v_marker IS NULL;   -- this period was reminded already
      v_date := public.bj_format_date(v_end, public.bj_account_date_format(p.account_id));
      v_title := public.reminder_render(v_msg.before_title, p.name, v_date, v_end - v_today);
      v_body := public.reminder_render(v_msg.before_body, p.name, v_date, v_end - v_today);
      IF v_schema = 'sim' THEN v_title := 'Practice: ' || v_title; END IF;
      FOREACH v_user IN ARRAY v_users LOOP
        PERFORM public.bj_notify(v_user, 'info', 'reminder', v_title, v_body,
          CASE WHEN v_schema = 'sim' THEN 'practice_projects' ELSE 'timesheet_reminders' END, p.id,
          CASE WHEN v_schema = 'public' THEN p.id END,
          jsonb_build_object('schema', v_schema, 'practice', v_schema = 'sim', 'record_type', 'timesheet_period',
                             'period_start', v_start, 'period_end', v_end, 'project_id', p.id));
        v_sent := v_sent + 1;
      END LOOP;
      IF v_schema = 'public' THEN
        INSERT INTO public.timesheet_reminders (project_id, period_start, period_end, sent_by, recipient_user_ids, recipient_count, note, is_automatic)
        VALUES (p.id, v_start, v_end, NULL, v_users, cardinality(v_users), 'Automatic reminder before the period closes', TRUE);
      END IF;
    END LOOP;
  END LOOP;
  RETURN jsonb_build_object('processed', v_sent, 'projects', v_projects, 'dry_run', v_dry);
END;
$$;

-- ── 4. EVM / progress snapshots (1.5) ────────────────────────────────────────
-- Share of the planned duration elapsed at p_at (0–1).
CREATE OR REPLACE FUNCTION public.evm_planned_fraction(p_start DATE, p_end DATE, p_at DATE)
RETURNS NUMERIC
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE
           WHEN p_start IS NULL OR p_end IS NULL OR p_at IS NULL OR p_end < p_start THEN NULL
           WHEN p_at < p_start THEN 0
           WHEN p_at >= p_end THEN 1
           ELSE round((p_at - p_start + 1)::NUMERIC / (p_end - p_start + 1), 6)
         END;
$$;

-- The job (evm.period_snapshots): at each project-local month end, one snapshot per project with a budget
-- and planned dates: PV = budget × planned share elapsed, EV = budget × % complete, AC = recorded costs
-- up to the month end. A snapshot already there (entered by hand or captured before) is never changed.
CREATE OR REPLACE FUNCTION public.run_evm_period_snapshots(p_context JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
DECLARE
  p        RECORD;
  v_schema TEXT;
  v_tz     TEXT;
  v_period DATE;
  v_pv     NUMERIC;
  v_ev     NUMERIC;
  v_ac     NUMERIC;
  v_n      INTEGER;
  v_made   INTEGER := 0;
BEGIN
  FOREACH v_schema IN ARRAY ARRAY['public', 'sim'] LOOP
    FOR p IN
      SELECT x.* FROM (
        SELECT pr.id, pr.budget_amount, pr.planned_start_date, pr.planned_end_date, pr.percentage_complete, pr.account_id
          FROM public.projects pr
         WHERE v_schema = 'public' AND NOT COALESCE(pr.is_deleted, FALSE) AND COALESCE(pr.budget_amount, 0) > 0
           AND pr.planned_start_date IS NOT NULL AND pr.planned_end_date IS NOT NULL
        UNION ALL
        SELECT pp.id, pp.budget_amount, pp.planned_start_date, pp.planned_end_date, pp.percentage_complete,
               public.bj_project_account('sim', pp.id)
          FROM sim.practice_projects pp
         WHERE v_schema = 'sim' AND NOT COALESCE(pp.is_deleted, FALSE) AND COALESCE(pp.budget_amount, 0) > 0
           AND pp.planned_start_date IS NOT NULL AND pp.planned_end_date IS NOT NULL
      ) x
    LOOP
      CONTINUE WHEN p.account_id IS NOT NULL AND NOT public.bj_account_allows_tables(p.account_id,
        ARRAY[CASE WHEN v_schema = 'sim' THEN 'sim.' ELSE '' END || 'project_evm_snapshots']);
      v_tz := public.bj_project_time_zone(v_schema, p.id, p.account_id);
      v_period := (date_trunc('month', (NOW() AT TIME ZONE v_tz)::DATE) - INTERVAL '1 day')::DATE;
      CONTINUE WHEN v_period < p.planned_start_date;
      CONTINUE WHEN v_period > p.planned_end_date + 92;   -- long finished: stop adding points
      v_pv := round(p.budget_amount * public.evm_planned_fraction(p.planned_start_date, p.planned_end_date, v_period), 4);
      v_ev := round(p.budget_amount * LEAST(GREATEST(COALESCE(p.percentage_complete, 0), 0), 100) / 100, 4);
      IF v_schema = 'sim' THEN
        v_ac := COALESCE((SELECT sum(c.amount) FROM sim.project_cost_entries c
                           WHERE c.practice_project_id = p.id AND NOT c.is_deleted AND c.entry_date <= v_period
                             AND lower(COALESCE(c.approval_status, '')) <> 'rejected'), 0);
        INSERT INTO sim.project_evm_snapshots (practice_project_id, period_date, planned_value, earned_value, actual_cost, notes)
        VALUES (p.id, v_period, v_pv, v_ev, v_ac, 'Captured automatically at the end of the period.')
        ON CONFLICT (practice_project_id, period_date) DO NOTHING;
      ELSE
        v_ac := COALESCE((SELECT sum(c.amount) FROM public.project_cost_entries c
                           WHERE c.project_id = p.id AND NOT c.is_deleted AND c.entry_date <= v_period
                             AND lower(COALESCE(c.approval_status, '')) <> 'rejected'), 0);
        INSERT INTO public.project_evm_snapshots (project_id, period_date, planned_value, earned_value, actual_cost, notes)
        VALUES (p.id, v_period, v_pv, v_ev, v_ac, 'Captured automatically at the end of the period.')
        ON CONFLICT (project_id, period_date) DO NOTHING;
      END IF;
      GET DIAGNOSTICS v_n = ROW_COUNT;
      v_made := v_made + v_n;
    END LOOP;
  END LOOP;
  RETURN jsonb_build_object('processed', v_made);
END;
$$;

-- ── 5. Grants ────────────────────────────────────────────────────────────────
DO $$
DECLARE
  fn TEXT;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.scheduled_report_queue_run(text,uuid,text,text,uuid)', 'public.run_due_health_reports(jsonb)',
    'public.bj_safe_count(text,uuid,date)', 'public.bj_safe_json(text,uuid,date)',
    'public.scheduled_report_build(text,uuid)', 'public.scheduled_report_finish(text,uuid,boolean,text,integer)',
    'public.recurring_task_create_occurrence(text,uuid,uuid,text,date)', 'public.generate_recurring_tasks(text,uuid)',
    'public.run_recurring_task_generation(jsonb)', 'public.bj_account_first_day(uuid)',
    'public.run_timesheet_reminders(jsonb)', 'public.run_evm_period_snapshots(jsonb)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION public.scheduled_report_build(TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.scheduled_report_finish(TEXT, UUID, BOOLEAN, TEXT, INTEGER) TO service_role;
REVOKE ALL ON FUNCTION public.scheduled_health_report_run_now(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION sim.scheduled_health_report_run_now(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.scheduled_health_report_run_now(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION sim.scheduled_health_report_run_now(UUID) TO authenticated;

-- ── 6. Catalogue rows (rule 80) ──────────────────────────────────────────────
SELECT public.background_job_register(
  p_code => 'reports.health_due',
  p_name => 'Scheduled health reports',
  p_kind => 'sql',
  p_description => 'Queues each scheduled health report whose send time (project or organisation time zone) has come, in both apps.',
  p_owner_system => 'platform',
  p_sql_function => 'public.run_due_health_reports',
  p_cron => '*/15 * * * *',
  p_timeout_seconds => 300
);
SELECT public.background_job_register(
  p_code => 'reports.health_send',
  p_name => 'Health report email',
  p_kind => 'handler',
  p_description => 'Builds one health report run and emails it to the schedule’s recipients (scheduled or Run now). Practice reports are marked Simulator.',
  p_owner_system => 'platform',
  p_timeout_seconds => 300,
  p_max_attempts => 3,
  p_item_ttl_seconds => 86400,
  p_batch_size => 20,
  p_per_org_batch_cap => 10
);
SELECT public.background_job_register(
  p_code => 'tasks.recurring_generate',
  p_name => 'Recurring task generator',
  p_kind => 'sql',
  p_description => 'Creates the next tasks of each recurring task schedule ahead of their dates (both apps), once per occurrence. Also runs when a schedule is saved.',
  p_owner_system => 'platform',
  p_sql_function => 'public.run_recurring_task_generation',
  p_cron => '30 0 * * *',
  p_timeout_seconds => 900
);
SELECT public.background_job_register(
  p_code => 'timesheets.reminders',
  p_name => 'Timesheet reminders',
  p_kind => 'sql',
  p_description => 'Before the timesheet period closes, reminds project members with missing or draft time (both apps), once per project and period.',
  p_owner_system => 'platform',
  p_sql_function => 'public.run_timesheet_reminders',
  p_cron => '0 14 * * 5',
  p_time_basis => 'organisation',
  p_timeout_seconds => 900
);
SELECT public.background_job_register(
  p_code => 'evm.period_snapshots',
  p_name => 'EVM period snapshots',
  p_kind => 'sql',
  p_description => 'Captures one earned value snapshot per project at each month end (both apps); never overwrites an existing snapshot.',
  p_owner_system => 'platform',
  p_sql_function => 'public.run_evm_period_snapshots',
  p_cron => '15 1 * * *',
  p_timeout_seconds => 900
);

NOTIFY pgrst, 'reload schema';

-- Check: the new jobs are in the catalogue.
SELECT code, kind, cron, time_basis, enabled FROM public.background_jobs
 WHERE code IN ('reports.health_due', 'reports.health_send', 'tasks.recurring_generate', 'timesheets.reminders',
                'evm.period_snapshots', 'reminders.due_dates', 'notifications.daily_digest', 'notifications.digest_send')
 ORDER BY code;
