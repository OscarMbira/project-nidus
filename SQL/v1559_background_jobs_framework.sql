-- ============================================================================
-- v1559: Background jobs framework — v1352 Slice 0 (PRD D2, D3, D4, D9, D11, A1)
-- PRD:  projectprd/v1352_background_jobs_PRD.md
-- Plan: projectplan/v1352_background_jobs_plan.md
--
-- One catalogue, one run log, one work queue and one clock tick for every background job.
--   public.background_jobs          catalogue (code, kind sql | handler, cron + time_basis, enabled,
--                                   timeout, retry policy, owner_system, back-off, batch limits)
--   public.background_job_runs      one row per run (status, start / finish, counts, error, trigger, reason)
--   public.background_job_queue     work items for handler jobs (run_after, attempts, max_attempts,
--                                   expires_at, dedupe_key, organisation_id, status incl. dead)
--   public.background_job_settings  singleton: run-history retention (D11), late grace, alert settings (D4)
--   public.background_job_config    singleton, server-only: worker URL + shared secret (ai_job_config pattern)
--
--   public.run_background_job(code, triggered_by, reason, …)   one run: advisory lock, run row, retry, alerts
--   public.run_due_background_jobs(now)                        the tick — pg_cron (or any scheduler) calls it
--   public.background_jobs_detect_late(now)                    stuck runs and due-but-never-started jobs
--   public.enqueue_background_job(code, payload, run_after, dedupe_key, organisation_id)
--   public.background_job_request_run(code, reason, admin, rerun_of)  Admin "Run now" / re-run request
--   public.background_job_replay_item(item, reason, actor)     single-item replay (Admin RPC calls it)
--   public.background_job_replay_item_for_org(item, org, reason, actor)  for the owning feature’s own page
--   worker RPCs (service role only): background_job_claim / _item_complete / _run_start / _run_finish
--
-- No client policies: every table has RLS on and no grants to anon / authenticated. Admin reaches
-- this only through the public.admin_background_job_* RPCs (Admin SQL v255, CLAUDE.md rule 34.5).
-- This file does not schedule anything; v1560 moves the existing jobs and creates the tick.
-- Idempotent. Re-run SQL/v1251_planner_table_wall.sql after this file (table registration rule 6).
-- ============================================================================

-- ── 1. Catalogue ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.background_jobs (
  code                 TEXT PRIMARY KEY CHECK (code ~ '^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$'),
  name                 TEXT NOT NULL,
  description          TEXT,
  owner_system         TEXT NOT NULL DEFAULT 'platform'
                         CHECK (owner_system IN ('platform', 'simulator', 'planner', 'admin', 'system')),
  kind                 TEXT NOT NULL CHECK (kind IN ('sql', 'handler')),
  sql_function         TEXT CHECK (sql_function IS NULL OR sql_function ~ '^[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*$'),
  cron                 TEXT,
  time_basis           TEXT NOT NULL DEFAULT 'utc' CHECK (time_basis IN ('utc', 'organisation')),
  enabled              BOOLEAN NOT NULL DEFAULT TRUE,
  timeout_seconds      INTEGER NOT NULL DEFAULT 600 CHECK (timeout_seconds BETWEEN 10 AND 86400),
  max_retries          INTEGER NOT NULL DEFAULT 0 CHECK (max_retries BETWEEN 0 AND 10),
  retry_delay_seconds  INTEGER NOT NULL DEFAULT 300 CHECK (retry_delay_seconds BETWEEN 10 AND 86400),
  max_attempts         INTEGER NOT NULL DEFAULT 5 CHECK (max_attempts BETWEEN 1 AND 50),
  backoff_schedule     INTEGER[] NOT NULL DEFAULT ARRAY[60, 300, 1800, 7200, 86400],
  item_ttl_seconds     INTEGER CHECK (item_ttl_seconds IS NULL OR item_ttl_seconds >= 60),
  batch_size           INTEGER NOT NULL DEFAULT 50 CHECK (batch_size BETWEEN 1 AND 1000),
  per_org_batch_cap    INTEGER CHECK (per_org_batch_cap IS NULL OR per_org_batch_cap >= 1),
  enqueue_guard        TEXT CHECK (enqueue_guard IS NULL OR enqueue_guard ~ '^[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*$'),
  -- live state, written by the runner
  last_due_at          TIMESTAMPTZ,
  last_started_at      TIMESTAMPTZ,
  last_finished_at     TIMESTAMPTZ,
  last_status          TEXT,
  last_run_id          UUID,
  last_success_at      TIMESTAMPTZ,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  next_retry_at        TIMESTAMPTZ,
  -- a manual run / re-run asked for by Admin; the next tick starts it (keeps long jobs out of web requests)
  run_requested_at     TIMESTAMPTZ,
  run_requested_by     UUID,
  run_request_reason   TEXT,
  run_request_rerun_of UUID,
  alert_open           BOOLEAN NOT NULL DEFAULT FALSE,
  alert_kind           TEXT CHECK (alert_kind IS NULL OR alert_kind IN ('failed', 'late')),
  alert_raised_at      TIMESTAMPTZ,
  alert_cleared_at     TIMESTAMPTZ,
  -- record history
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by_admin     UUID,
  enabled_changed_at   TIMESTAMPTZ,
  enabled_reason       TEXT,
  CONSTRAINT background_jobs_sql_has_function CHECK (kind <> 'sql' OR sql_function IS NOT NULL),
  CONSTRAINT background_jobs_backoff_not_empty CHECK (cardinality(backoff_schedule) >= 1)
);

COMMENT ON TABLE public.background_jobs IS
  'v1352: catalogue of background jobs. The tick (run_due_background_jobs) starts whatever is due. Rule 80.';

-- ── 2. Run log ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.background_job_runs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_code            TEXT NOT NULL REFERENCES public.background_jobs(code) ON DELETE CASCADE,
  status              TEXT NOT NULL CHECK (status IN ('running', 'succeeded', 'failed', 'partial', 'skipped')),
  triggered_by        TEXT NOT NULL CHECK (triggered_by IN ('schedule', 'retry', 'manual', 'rerun', 'worker')),
  triggered_by_admin  UUID,
  reason              TEXT,
  rerun_of            UUID REFERENCES public.background_job_runs(id) ON DELETE SET NULL,
  context             JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  finished_at         TIMESTAMPTZ,
  duration_ms         INTEGER,
  records_processed   INTEGER,
  items_failed        INTEGER NOT NULL DEFAULT 0,
  result              JSONB,
  error               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_background_job_runs_job_started ON public.background_job_runs (job_code, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_background_job_runs_status ON public.background_job_runs (status, started_at);

-- ── 3. Work queue (A1) ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.background_job_queue (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_code            TEXT NOT NULL REFERENCES public.background_jobs(code) ON DELETE CASCADE,
  payload             JSONB NOT NULL DEFAULT '{}'::jsonb,
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'succeeded', 'dead')),
  run_after           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attempts            INTEGER NOT NULL DEFAULT 0,
  max_attempts        INTEGER NOT NULL DEFAULT 5 CHECK (max_attempts >= 1),
  expires_at          TIMESTAMPTZ,
  dedupe_key          TEXT,
  organisation_id     UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  locked_at           TIMESTAMPTZ,
  locked_by           TEXT,
  last_attempt_at     TIMESTAMPTZ,
  last_error          TEXT,
  result              JSONB,
  last_run_id         UUID REFERENCES public.background_job_runs(id) ON DELETE SET NULL,
  finished_at         TIMESTAMPTZ,
  replay_count        INTEGER NOT NULL DEFAULT 0,
  last_replayed_at    TIMESTAMPTZ,
  last_replay_reason  TEXT,
  last_replayed_by    TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_background_job_queue_dedupe
  ON public.background_job_queue (job_code, dedupe_key) WHERE dedupe_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_background_job_queue_ready
  ON public.background_job_queue (status, run_after) WHERE status IN ('pending', 'running');
CREATE INDEX IF NOT EXISTS idx_background_job_queue_job ON public.background_job_queue (job_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_background_job_queue_org ON public.background_job_queue (organisation_id) WHERE organisation_id IS NOT NULL;

-- ── 4. Settings (D4 alert grouping, D11 retention) ───────────────────────────
CREATE TABLE IF NOT EXISTS public.background_job_settings (
  id                       BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  success_retention_days   INTEGER NOT NULL DEFAULT 90  CHECK (success_retention_days BETWEEN 1 AND 3650),
  failure_retention_days   INTEGER NOT NULL DEFAULT 365 CHECK (failure_retention_days BETWEEN 1 AND 3650),
  late_grace_minutes       INTEGER NOT NULL DEFAULT 15  CHECK (late_grace_minutes BETWEEN 1 AND 1440),
  alerts_enabled           BOOLEAN NOT NULL DEFAULT TRUE,
  alert_email_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  -- function the runner calls once per open alert: fn(job_code text, kind text, message text, run_id uuid).
  -- Set by Admin SQL v255 (admin.background_job_alert); NULL = alerts are only recorded on the job row.
  alert_hook_function      TEXT CHECK (alert_hook_function IS NULL OR alert_hook_function ~ '^[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*$'),
  last_tick_at             TIMESTAMPTZ,
  last_worker_wake_at      TIMESTAMPTZ,
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by_admin         UUID
);
INSERT INTO public.background_job_settings (id) VALUES (TRUE) ON CONFLICT (id) DO NOTHING;

-- ── 5. Server-only worker configuration (P9, ai_job_config pattern from v1272) ─
CREATE TABLE IF NOT EXISTS public.background_job_config (
  id                  BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  functions_base_url  TEXT,          -- e.g. https://<project>.supabase.co/functions/v1
  worker_secret       TEXT,          -- must equal the BACKGROUND_JOB_SECRET edge secret
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO public.background_job_config (id) VALUES (TRUE) ON CONFLICT (id) DO NOTHING;
-- Start from the AI job settings when they exist, so the moved AI embed job keeps working once the
-- worker is deployed with BACKGROUND_JOB_SECRET equal to the same value.
DO $$
BEGIN
  IF to_regclass('public.ai_job_config') IS NOT NULL THEN
    UPDATE public.background_job_config c
       SET functions_base_url = COALESCE(c.functions_base_url, a.functions_base_url),
           worker_secret      = COALESCE(c.worker_secret, a.cron_secret),
           updated_at         = NOW()
      FROM public.ai_job_config a
     WHERE c.id AND a.id;
  END IF;
END $$;

-- ── 6. RLS on, no client access ──────────────────────────────────────────────
ALTER TABLE public.background_jobs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.background_job_runs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.background_job_queue    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.background_job_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.background_job_config   ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.background_jobs, public.background_job_runs, public.background_job_queue,
              public.background_job_settings, public.background_job_config FROM anon, authenticated;
GRANT ALL ON public.background_jobs, public.background_job_runs, public.background_job_queue,
             public.background_job_settings, public.background_job_config TO service_role;

-- ── 7. Cron helpers (5 fields: minute hour day-of-month month day-of-week) ───
CREATE OR REPLACE FUNCTION public.background_job_cron_is_valid(p_cron TEXT)
RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE
AS $$
  SELECT p_cron IS NOT NULL
     AND array_length(regexp_split_to_array(btrim(p_cron), '\s+'), 1) = 5
     AND NOT EXISTS (
       SELECT 1 FROM unnest(regexp_split_to_array(btrim(p_cron), '\s+')) f
        WHERE f !~ '^(\*|[0-9]+(-[0-9]+)?)(/[0-9]+)?(,(\*|[0-9]+(-[0-9]+)?)(/[0-9]+)?)*$'
     );
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'background_jobs_cron_valid') THEN
    ALTER TABLE public.background_jobs ADD CONSTRAINT background_jobs_cron_valid
      CHECK (cron IS NULL OR public.background_job_cron_is_valid(cron));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.background_job_cron_field_match(p_field TEXT, p_value INTEGER, p_min INTEGER, p_max INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  v_part  TEXT;
  v_range TEXT;
  v_step  INTEGER;
  v_lo    INTEGER;
  v_hi    INTEGER;
BEGIN
  FOREACH v_part IN ARRAY string_to_array(p_field, ',') LOOP
    v_range := split_part(v_part, '/', 1);
    v_step  := COALESCE(NULLIF(split_part(v_part, '/', 2), '')::INTEGER, 1);
    IF v_step < 1 THEN v_step := 1; END IF;
    IF v_range = '*' THEN
      v_lo := p_min; v_hi := p_max;
    ELSIF position('-' IN v_range) > 0 THEN
      v_lo := split_part(v_range, '-', 1)::INTEGER; v_hi := split_part(v_range, '-', 2)::INTEGER;
    ELSE
      v_lo := v_range::INTEGER;
      v_hi := CASE WHEN position('/' IN v_part) > 0 THEN p_max ELSE v_lo END;
    END IF;
    IF p_value BETWEEN v_lo AND v_hi AND (p_value - v_lo) % v_step = 0 THEN
      RETURN TRUE;
    END IF;
  END LOOP;
  RETURN FALSE;
END;
$$;

-- True when the cron expression matches the given local wall-clock minute.
CREATE OR REPLACE FUNCTION public.background_job_cron_matches(p_cron TEXT, p_local TIMESTAMP)
RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  f TEXT[] := regexp_split_to_array(btrim(p_cron), '\s+');
  v_dow INTEGER := EXTRACT(DOW FROM p_local)::INTEGER;
  v_dom_ok BOOLEAN;
  v_dow_ok BOOLEAN;
BEGIN
  IF NOT public.background_job_cron_field_match(f[1], EXTRACT(MINUTE FROM p_local)::INTEGER, 0, 59) THEN RETURN FALSE; END IF;
  IF NOT public.background_job_cron_field_match(f[2], EXTRACT(HOUR FROM p_local)::INTEGER, 0, 23) THEN RETURN FALSE; END IF;
  IF NOT public.background_job_cron_field_match(f[4], EXTRACT(MONTH FROM p_local)::INTEGER, 1, 12) THEN RETURN FALSE; END IF;
  v_dom_ok := public.background_job_cron_field_match(f[3], EXTRACT(DAY FROM p_local)::INTEGER, 1, 31);
  v_dow_ok := public.background_job_cron_field_match(f[5], v_dow, 0, 7)
              OR (v_dow = 0 AND public.background_job_cron_field_match(f[5], 7, 0, 7));
  -- Standard cron: when both day fields are restricted, either may match.
  IF f[3] = '*' AND f[5] = '*' THEN RETURN TRUE; END IF;
  IF f[3] = '*' THEN RETURN v_dow_ok; END IF;
  IF f[5] = '*' THEN RETURN v_dom_ok; END IF;
  RETURN v_dom_ok OR v_dow_ok;
END;
$$;

-- First time strictly after p_after when the cron fires in time zone p_tz (NULL if none within ~2 years).
-- Skips whole months / days / hours that cannot match, so it needs a few hundred steps at most.
CREATE OR REPLACE FUNCTION public.background_job_next_fire(p_cron TEXT, p_after TIMESTAMPTZ, p_tz TEXT DEFAULT 'UTC')
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  f TEXT[];
  v_local TIMESTAMP;
  v_dow INTEGER;
  v_day_ok BOOLEAN;
  v_dom_ok BOOLEAN;
  v_dow_ok BOOLEAN;
  i INTEGER := 0;
BEGIN
  IF p_cron IS NULL OR NOT public.background_job_cron_is_valid(p_cron) THEN RETURN NULL; END IF;
  f := regexp_split_to_array(btrim(p_cron), '\s+');
  v_local := date_trunc('minute', p_after AT TIME ZONE COALESCE(p_tz, 'UTC')) + INTERVAL '1 minute';
  WHILE i < 20000 LOOP
    i := i + 1;
    IF NOT public.background_job_cron_field_match(f[4], EXTRACT(MONTH FROM v_local)::INTEGER, 1, 12) THEN
      v_local := date_trunc('month', v_local) + INTERVAL '1 month';
      CONTINUE;
    END IF;
    v_dow := EXTRACT(DOW FROM v_local)::INTEGER;
    v_dom_ok := public.background_job_cron_field_match(f[3], EXTRACT(DAY FROM v_local)::INTEGER, 1, 31);
    v_dow_ok := public.background_job_cron_field_match(f[5], v_dow, 0, 7)
                OR (v_dow = 0 AND public.background_job_cron_field_match(f[5], 7, 0, 7));
    v_day_ok := CASE
                  WHEN f[3] = '*' AND f[5] = '*' THEN TRUE
                  WHEN f[3] = '*' THEN v_dow_ok
                  WHEN f[5] = '*' THEN v_dom_ok
                  ELSE v_dom_ok OR v_dow_ok
                END;
    IF NOT v_day_ok THEN
      v_local := date_trunc('day', v_local) + INTERVAL '1 day';
      CONTINUE;
    END IF;
    IF NOT public.background_job_cron_field_match(f[2], EXTRACT(HOUR FROM v_local)::INTEGER, 0, 23) THEN
      v_local := date_trunc('hour', v_local) + INTERVAL '1 hour';
      CONTINUE;
    END IF;
    IF NOT public.background_job_cron_field_match(f[1], EXTRACT(MINUTE FROM v_local)::INTEGER, 0, 59) THEN
      v_local := v_local + INTERVAL '1 minute';
      CONTINUE;
    END IF;
    RETURN v_local AT TIME ZONE COALESCE(p_tz, 'UTC');
  END LOOP;
  RETURN NULL;
END;
$$;

-- Time zones (from p_zones) in which the cron fired in the window (p_from, p_to].
CREATE OR REPLACE FUNCTION public.background_job_due_zones(p_cron TEXT, p_from TIMESTAMPTZ, p_to TIMESTAMPTZ, p_zones TEXT[])
RETURNS TEXT[]
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(array_agg(z ORDER BY z), ARRAY[]::TEXT[])
    FROM unnest(p_zones) z
   WHERE public.background_job_next_fire(p_cron, p_from, z) <= p_to;
$$;

-- Organisation time zones in use (Regional & Format Settings, rule 68) plus UTC for organisations without one.
CREATE OR REPLACE FUNCTION public.background_job_organisation_zones()
RETURNS TEXT[]
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  SELECT array_agg(DISTINCT z ORDER BY z) FROM (
    SELECT 'UTC'::TEXT AS z
    UNION
    SELECT s.time_zone::TEXT FROM public.organisation_regional_format_settings s
     WHERE s.time_zone IS NOT NULL AND s.time_zone IN (SELECT name FROM pg_timezone_names)
  ) t;
$$;

-- ── 8. Function lookup + alert helpers ───────────────────────────────────────
-- Runs one dynamic statement that returns a single jsonb column (job functions and guards).
CREATE OR REPLACE FUNCTION public.background_job_exec_jsonb(p_sql TEXT, p_arg JSONB)
RETURNS SETOF JSONB
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_arg IS NULL THEN
    RETURN QUERY EXECUTE p_sql;
  ELSE
    RETURN QUERY EXECUTE p_sql USING p_arg;
  END IF;
END;
$$;

-- Return type of a schema-qualified function callable with no arguments ('void', 'jsonb', …),
-- 'context' when its single required argument is jsonb (it receives the run context), or NULL.
CREATE OR REPLACE FUNCTION public.background_job_function_shape(p_fn TEXT)
RETURNS TEXT
LANGUAGE sql STABLE
AS $$
  SELECT CASE
           WHEN p.pronargs - p.pronargdefaults = 0 THEN p.prorettype::regtype::TEXT
           WHEN p.pronargs = 1 AND p.proargtypes[0] = 'jsonb'::regtype THEN 'context'
         END
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = split_part(p_fn, '.', 1)
     AND p.proname = split_part(p_fn, '.', 2)
     AND (p.pronargs - p.pronargdefaults = 0 OR (p.pronargs = 1 AND p.proargtypes[0] = 'jsonb'::regtype))
   ORDER BY p.pronargs
   LIMIT 1;
$$;

-- D4: one alert per job until it succeeds again. Calls the Admin hook when one is configured.
CREATE OR REPLACE FUNCTION public.background_job_raise_alert(p_code TEXT, p_kind TEXT, p_message TEXT, p_run_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_settings public.background_job_settings;
  v_opened   BOOLEAN;
BEGIN
  UPDATE public.background_jobs
     SET alert_open = TRUE, alert_kind = p_kind, alert_raised_at = NOW(), alert_cleared_at = NULL
   WHERE code = p_code AND NOT alert_open
  RETURNING TRUE INTO v_opened;
  IF NOT COALESCE(v_opened, FALSE) THEN RETURN FALSE; END IF;

  v_settings := (SELECT s FROM public.background_job_settings s WHERE s.id);
  IF NOT COALESCE(v_settings.alerts_enabled, TRUE) OR v_settings.alert_hook_function IS NULL THEN
    RAISE NOTICE 'background job % alert (%): %', p_code, p_kind, p_message;
    RETURN TRUE;
  END IF;
  IF to_regprocedure(v_settings.alert_hook_function || '(text,text,text,uuid)') IS NULL THEN
    RAISE NOTICE 'background job alert hook % not found', v_settings.alert_hook_function;
    RETURN TRUE;
  END IF;
  BEGIN
    EXECUTE format('SELECT %s($1, $2, $3, $4)', v_settings.alert_hook_function)
      USING p_code, p_kind, left(COALESCE(p_message, ''), 2000), p_run_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'background job alert hook failed: %', SQLERRM;
  END;
  RETURN TRUE;
END;
$$;

-- Bookkeeping after every finished run (sql or handler): job state, retry policy, alerts.
CREATE OR REPLACE FUNCTION public.background_job_after_run(p_run_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_run public.background_job_runs;
  v_job public.background_jobs;
  v_fail INTEGER;
BEGIN
  v_run := (SELECT r FROM public.background_job_runs r WHERE r.id = p_run_id);
  IF v_run.id IS NULL OR v_run.status IN ('running', 'skipped') THEN RETURN; END IF;
  v_job := (SELECT j FROM public.background_jobs j WHERE j.code = v_run.job_code);

  IF v_run.status = 'succeeded' THEN
    UPDATE public.background_jobs
       SET last_finished_at = v_run.finished_at, last_status = v_run.status, last_run_id = v_run.id,
           last_success_at = v_run.finished_at, consecutive_failures = 0, next_retry_at = NULL,
           alert_open = FALSE, alert_kind = NULL,
           alert_cleared_at = CASE WHEN alert_open THEN NOW() ELSE alert_cleared_at END
     WHERE code = v_job.code;
    RETURN;
  END IF;

  IF v_run.status = 'partial' THEN
    -- Some items will be retried by their own back-off; not a final failure.
    UPDATE public.background_jobs
       SET last_finished_at = v_run.finished_at, last_status = v_run.status, last_run_id = v_run.id
     WHERE code = v_job.code;
    RETURN;
  END IF;

  -- failed
  v_fail := v_job.consecutive_failures + 1;
  UPDATE public.background_jobs
     SET last_finished_at = v_run.finished_at, last_status = v_run.status, last_run_id = v_run.id,
         consecutive_failures = v_fail,
         next_retry_at = CASE WHEN v_job.kind = 'sql' AND v_fail <= v_job.max_retries
                              THEN NOW() + make_interval(secs => v_job.retry_delay_seconds) END
   WHERE code = v_job.code;

  IF v_job.kind = 'handler' OR v_fail > v_job.max_retries THEN
    PERFORM public.background_job_raise_alert(v_job.code, 'failed',
      format('%s failed: %s', v_job.name, COALESCE(v_run.error, 'no error text')), v_run.id);
  END IF;
END;
$$;

-- ── 9. Queue: enqueue, wake, replay ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.enqueue_background_job(
  p_code TEXT,
  p_payload JSONB DEFAULT '{}'::jsonb,
  p_run_after TIMESTAMPTZ DEFAULT NULL,
  p_dedupe_key TEXT DEFAULT NULL,
  p_organisation_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_job public.background_jobs;
  v_id  UUID;
BEGIN
  v_job := (SELECT j FROM public.background_jobs j WHERE j.code = p_code);
  IF v_job.code IS NULL THEN RAISE EXCEPTION 'Unknown background job: %', p_code; END IF;
  IF v_job.kind <> 'handler' THEN RAISE EXCEPTION 'Background job % is not a queue (handler) job', p_code; END IF;

  INSERT INTO public.background_job_queue (job_code, payload, run_after, max_attempts, expires_at, dedupe_key, organisation_id)
  VALUES (p_code, COALESCE(p_payload, '{}'::jsonb), COALESCE(p_run_after, NOW()), v_job.max_attempts,
          CASE WHEN v_job.item_ttl_seconds IS NOT NULL
               THEN COALESCE(p_run_after, NOW()) + make_interval(secs => v_job.item_ttl_seconds) END,
          NULLIF(btrim(COALESCE(p_dedupe_key, '')), ''), p_organisation_id)
  ON CONFLICT (job_code, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    v_id := (SELECT q.id FROM public.background_job_queue q WHERE q.job_code = p_code AND q.dedupe_key = btrim(p_dedupe_key));
  END IF;
  RETURN v_id;
END;
$$;

-- One HTTP wake-up of the worker (pg_net adapter, D2). Does nothing until configured. After a host
-- move the new scheduler calls the worker directly and this function is no longer needed.
CREATE OR REPLACE FUNCTION public.background_job_wake_worker()
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_cfg public.background_job_config;
BEGIN
  v_cfg := (SELECT c FROM public.background_job_config c WHERE c.id);
  IF v_cfg.functions_base_url IS NULL OR v_cfg.worker_secret IS NULL THEN RETURN 'not configured'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN RETURN 'pg_net missing'; END IF;
  EXECUTE 'SELECT net.http_post(url := $1, headers := $2, body := $3, timeout_milliseconds := 60000)'
    USING rtrim(v_cfg.functions_base_url, '/') || '/background-job-worker',
          jsonb_build_object('Content-Type', 'application/json', 'x-background-job-secret', v_cfg.worker_secret),
          '{}'::jsonb;
  UPDATE public.background_job_settings SET last_worker_wake_at = NOW() WHERE id;
  RETURN 'requested';
END;
$$;

CREATE OR REPLACE FUNCTION public.background_job_replay_item(p_item_id UUID, p_reason TEXT, p_actor TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_item public.background_job_queue;
BEGIN
  IF COALESCE(btrim(p_reason), '') = '' THEN RAISE EXCEPTION 'A reason is required'; END IF;
  v_item := (SELECT q FROM public.background_job_queue q WHERE q.id = p_item_id);
  IF v_item.id IS NULL THEN RAISE EXCEPTION 'Queue item not found'; END IF;
  IF v_item.status NOT IN ('dead', 'pending') THEN
    RAISE EXCEPTION 'Only a dead or waiting item can be replayed (this one is %)', v_item.status;
  END IF;
  UPDATE public.background_job_queue
     SET status = 'pending', attempts = 0, run_after = NOW(), locked_at = NULL, locked_by = NULL, finished_at = NULL,
         expires_at = CASE WHEN expires_at IS NOT NULL AND expires_at <= NOW()
                           THEN NOW() + (expires_at - created_at) ELSE expires_at END,
         replay_count = replay_count + 1, last_replayed_at = NOW(), last_replay_reason = btrim(p_reason),
         last_replayed_by = p_actor, updated_at = NOW()
   WHERE id = p_item_id;
  RETURN jsonb_build_object('item_id', p_item_id, 'job_code', v_item.job_code, 'previous_status', v_item.status, 'status', 'pending');
END;
$$;

-- For a feature’s own page (A1.2): its SECURITY DEFINER RPC checks the caller’s rights, then calls this,
-- which refuses an item that belongs to another organisation.
CREATE OR REPLACE FUNCTION public.background_job_replay_item_for_org(p_item_id UUID, p_organisation_id UUID, p_reason TEXT, p_actor TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
BEGIN
  IF p_organisation_id IS NULL OR NOT EXISTS (
       SELECT 1 FROM public.background_job_queue q WHERE q.id = p_item_id AND q.organisation_id = p_organisation_id) THEN
    RAISE EXCEPTION 'Queue item not found for this organisation';
  END IF;
  RETURN public.background_job_replay_item(p_item_id, p_reason, p_actor);
END;
$$;

-- ── 10. The runner ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.run_background_job(
  p_code TEXT,
  p_triggered_by TEXT DEFAULT 'manual',
  p_reason TEXT DEFAULT NULL,
  p_triggered_by_admin UUID DEFAULT NULL,
  p_rerun_of UUID DEFAULT NULL,
  p_context JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_job     public.background_jobs;
  v_run_id  UUID;
  v_item_id UUID;
  v_shape   TEXT;
  v_result  JSONB;
  v_status  TEXT := 'succeeded';
  v_error   TEXT;
  v_count   INTEGER;
  v_start   TIMESTAMPTZ := clock_timestamp();
BEGIN
  v_job := (SELECT j FROM public.background_jobs j WHERE j.code = p_code);
  IF v_job.code IS NULL THEN RAISE EXCEPTION 'Unknown background job: %', p_code; END IF;
  IF p_triggered_by NOT IN ('schedule', 'retry', 'manual', 'rerun') THEN
    RAISE EXCEPTION 'Unknown trigger: %', p_triggered_by;
  END IF;

  -- Handler jobs: one queue item; the worker runs it and writes the run row.
  IF v_job.kind = 'handler' THEN
    v_item_id := public.enqueue_background_job(
      p_code,
      COALESCE(p_context, '{}'::jsonb) || jsonb_build_object('triggered_by', p_triggered_by, 'reason', p_reason),
      NOW(),
      CASE WHEN p_triggered_by = 'schedule'
           THEN 'schedule:' || to_char(date_trunc('minute', NOW()) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI') END,
      NULL);
    PERFORM public.background_job_wake_worker();
    RETURN jsonb_build_object('job_code', p_code, 'queued_item_id', v_item_id, 'status', 'queued');
  END IF;

  -- No overlap: the transaction lock covers this session, the running-row check covers runs that a
  -- crashed session left behind until they pass their time-out.
  IF NOT pg_try_advisory_xact_lock(hashtext('nidus_background_job:' || p_code))
     OR EXISTS (SELECT 1 FROM public.background_job_runs r
                 WHERE r.job_code = p_code AND r.status = 'running'
                   AND r.started_at > NOW() - make_interval(secs => v_job.timeout_seconds)) THEN
    INSERT INTO public.background_job_runs (job_code, status, triggered_by, triggered_by_admin, reason, rerun_of,
                                            context, started_at, finished_at, duration_ms, error)
    VALUES (p_code, 'skipped', p_triggered_by, p_triggered_by_admin, p_reason, p_rerun_of,
            COALESCE(p_context, '{}'::jsonb), v_start, clock_timestamp(), 0, 'Already running')
    RETURNING id INTO v_run_id;
    RETURN jsonb_build_object('job_code', p_code, 'run_id', v_run_id, 'status', 'skipped');
  END IF;

  INSERT INTO public.background_job_runs (job_code, status, triggered_by, triggered_by_admin, reason, rerun_of, context, started_at)
  VALUES (p_code, 'running', p_triggered_by, p_triggered_by_admin, p_reason, p_rerun_of, COALESCE(p_context, '{}'::jsonb), v_start)
  RETURNING id INTO v_run_id;
  UPDATE public.background_jobs SET last_started_at = v_start WHERE code = p_code;

  v_shape := public.background_job_function_shape(v_job.sql_function);
  BEGIN
    IF v_shape IS NULL THEN
      RAISE EXCEPTION 'Job function % not found (it must take no arguments, or one jsonb argument)', v_job.sql_function;
    ELSIF v_shape = 'void' THEN
      EXECUTE format('SELECT %s()', v_job.sql_function);
    ELSIF v_shape = 'context' THEN
      v_result := (SELECT x FROM public.background_job_exec_jsonb(
                     format('SELECT to_jsonb(%s($1))', v_job.sql_function), COALESCE(p_context, '{}'::jsonb)) x LIMIT 1);
    ELSE
      v_result := (SELECT x FROM public.background_job_exec_jsonb(
                     format('SELECT to_jsonb(%s())', v_job.sql_function), NULL) x LIMIT 1);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_status := 'failed';
    v_error  := SQLERRM;
    v_result := NULL;
  END;

  v_count := CASE
               WHEN jsonb_typeof(v_result) = 'number' THEN (v_result #>> '{}')::NUMERIC::INTEGER
               WHEN jsonb_typeof(v_result -> 'processed') = 'number' THEN (v_result ->> 'processed')::NUMERIC::INTEGER
             END;

  UPDATE public.background_job_runs
     SET status = v_status, finished_at = clock_timestamp(),
         duration_ms = (EXTRACT(EPOCH FROM clock_timestamp() - v_start) * 1000)::INTEGER,
         records_processed = v_count, result = v_result, error = v_error
   WHERE id = v_run_id;
  PERFORM public.background_job_after_run(v_run_id);

  RETURN jsonb_build_object('job_code', p_code, 'run_id', v_run_id, 'status', v_status, 'error', v_error, 'result', v_result);
END;
$$;

-- Manual run / re-run asked for by Admin (public.admin_background_job_run_now / _rerun, Admin SQL v255).
-- Handler jobs are queued at once; SQL jobs are started by the next tick (within a minute), so a long
-- job never runs inside a web request. A disabled job must be enabled first.
CREATE OR REPLACE FUNCTION public.background_job_request_run(
  p_code TEXT, p_reason TEXT, p_admin UUID DEFAULT NULL, p_rerun_of UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_job public.background_jobs;
BEGIN
  IF COALESCE(btrim(p_reason), '') = '' THEN RAISE EXCEPTION 'A reason is required'; END IF;
  v_job := (SELECT j FROM public.background_jobs j WHERE j.code = p_code);
  IF v_job.code IS NULL THEN RAISE EXCEPTION 'Unknown background job: %', p_code; END IF;
  IF NOT v_job.enabled THEN RAISE EXCEPTION 'This job is turned off. Turn it on first, then run it.'; END IF;
  IF v_job.kind = 'handler' THEN
    RETURN public.run_background_job(p_code, CASE WHEN p_rerun_of IS NULL THEN 'manual' ELSE 'rerun' END,
                                     btrim(p_reason), p_admin, p_rerun_of, '{}'::jsonb);
  END IF;
  IF v_job.run_requested_at IS NOT NULL THEN
    RAISE EXCEPTION 'A run of this job was already requested at % UTC and has not started yet',
      to_char(v_job.run_requested_at AT TIME ZONE 'UTC', 'HH24:MI');
  END IF;
  UPDATE public.background_jobs
     SET run_requested_at = NOW(), run_requested_by = p_admin, run_request_reason = btrim(p_reason),
         run_request_rerun_of = p_rerun_of
   WHERE code = p_code;
  RETURN jsonb_build_object('job_code', p_code, 'status', 'requested');
END;
$$;

-- ── 11. The tick ─────────────────────────────────────────────────────────────
-- Called every minute. Looks at every minute since the previous tick (up to 60), so a tick that was
-- delayed by a long job does not lose a due job. Organisation-time jobs are due when they fired in at
-- least one organisation's time zone; the zones go to the job in its context.
CREATE OR REPLACE FUNCTION public.run_due_background_jobs(p_now TIMESTAMPTZ DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_now     TIMESTAMPTZ := date_trunc('minute', COALESCE(p_now, NOW()));
  v_from    TIMESTAMPTZ;
  v_zones   TEXT[];
  v_due     TEXT[];
  v_job     public.background_jobs;
  v_trigger TEXT;
  v_guard   BOOLEAN;
  v_started TEXT[] := ARRAY[]::TEXT[];
  v_errors  JSONB := '[]'::jsonb;
BEGIN
  v_from := (SELECT s.last_tick_at FROM public.background_job_settings s WHERE s.id);
  v_from := GREATEST(COALESCE(v_from, v_now - INTERVAL '1 minute'), v_now - INTERVAL '60 minutes');
  IF v_from >= v_now THEN
    RETURN jsonb_build_object('now', v_now, 'started', '[]'::jsonb, 'note', 'already ticked');
  END IF;
  UPDATE public.background_job_settings SET last_tick_at = v_now WHERE id;

  FOR v_job IN SELECT j.* FROM public.background_jobs j WHERE j.enabled ORDER BY j.code LOOP
    v_trigger := NULL;
    v_due := NULL;
    IF v_job.cron IS NOT NULL THEN
      IF v_job.time_basis = 'organisation' THEN
        v_zones := COALESCE(v_zones, public.background_job_organisation_zones());
        v_due := public.background_job_due_zones(v_job.cron, v_from, v_now, v_zones);
        IF cardinality(v_due) > 0 THEN v_trigger := 'schedule'; END IF;
      ELSIF public.background_job_next_fire(v_job.cron, v_from, 'UTC') <= v_now THEN
        v_trigger := 'schedule';
      END IF;
    END IF;
    IF v_trigger IS NULL AND v_job.next_retry_at IS NOT NULL AND v_job.next_retry_at <= v_now THEN
      v_trigger := 'retry';
    END IF;

    -- A requested manual run / re-run (Admin "Run now") goes first and ignores the guard.
    IF v_job.run_requested_at IS NOT NULL THEN
      BEGIN
        UPDATE public.background_jobs
           SET run_requested_at = NULL, run_requested_by = NULL, run_request_reason = NULL, run_request_rerun_of = NULL
         WHERE code = v_job.code;
        PERFORM public.run_background_job(v_job.code,
          CASE WHEN v_job.run_request_rerun_of IS NOT NULL THEN 'rerun' ELSE 'manual' END,
          v_job.run_request_reason, v_job.run_requested_by, v_job.run_request_rerun_of, '{}'::jsonb);
        v_started := v_started || v_job.code;
      EXCEPTION WHEN OTHERS THEN
        v_errors := v_errors || jsonb_build_object('job', v_job.code, 'error', SQLERRM);
      END;
      -- the requested run counts for this minute's schedule / retry too
      UPDATE public.background_jobs SET last_due_at = CASE WHEN v_trigger IS NOT NULL THEN v_now ELSE last_due_at END,
             next_retry_at = CASE WHEN v_trigger = 'retry' THEN NULL ELSE next_retry_at END
       WHERE code = v_job.code;
      CONTINUE;
    END IF;
    CONTINUE WHEN v_trigger IS NULL;

    BEGIN
      IF v_job.enqueue_guard IS NOT NULL THEN
        v_guard := (SELECT x = 'true'::jsonb FROM public.background_job_exec_jsonb(
                      format('SELECT to_jsonb(%s())', v_job.enqueue_guard), NULL) x LIMIT 1);
        CONTINUE WHEN NOT COALESCE(v_guard, FALSE);
      END IF;
      UPDATE public.background_jobs SET last_due_at = v_now,
             next_retry_at = CASE WHEN v_trigger = 'retry' THEN NULL ELSE next_retry_at END
       WHERE code = v_job.code;
      PERFORM public.run_background_job(v_job.code, v_trigger, NULL, NULL, NULL,
        CASE WHEN v_due IS NOT NULL THEN jsonb_build_object('time_zones', to_jsonb(v_due)) ELSE '{}'::jsonb END);
      v_started := v_started || v_job.code;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors || jsonb_build_object('job', v_job.code, 'error', SQLERRM);
    END;
  END LOOP;

  RETURN jsonb_build_object('now', v_now, 'from', v_from, 'started', to_jsonb(v_started), 'errors', v_errors);
END;
$$;

-- ── 12. Late and stuck jobs (D4) ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.background_jobs_detect_late(p_now TIMESTAMPTZ DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_now   TIMESTAMPTZ := COALESCE(p_now, NOW());
  v_grace INTEGER := COALESCE((SELECT s.late_grace_minutes FROM public.background_job_settings s WHERE s.id), 15);
  r       RECORD;
  v_stuck INTEGER := 0;
  v_late  INTEGER := 0;
BEGIN
  -- Runs still 'running' long after their time-out: the session died or the worker stopped.
  FOR r IN
    SELECT run.id FROM public.background_job_runs run
      JOIN public.background_jobs j ON j.code = run.job_code
     WHERE run.status = 'running'
       AND run.started_at < v_now - make_interval(secs => j.timeout_seconds) - make_interval(mins => v_grace)
  LOOP
    UPDATE public.background_job_runs
       SET status = 'failed', finished_at = v_now, error = 'Stopped before finishing (time-out passed)'
     WHERE id = r.id;
    PERFORM public.background_job_after_run(r.id);
    v_stuck := v_stuck + 1;
  END LOOP;

  -- Due but never started (lock held, worker not configured or not running).
  FOR r IN
    SELECT j.code, j.name, j.last_due_at FROM public.background_jobs j
     WHERE j.enabled
       AND j.last_due_at IS NOT NULL
       AND j.last_due_at < v_now - make_interval(mins => v_grace)
       AND (j.last_started_at IS NULL OR j.last_started_at < j.last_due_at)
  LOOP
    IF public.background_job_raise_alert(r.code, 'late',
         format('%s was due at %s UTC and has not started.', r.name,
                to_char(r.last_due_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI')), NULL) THEN
      v_late := v_late + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('processed', v_stuck + v_late, 'stuck_runs', v_stuck, 'late_alerts', v_late);
END;
$$;

-- ── 13. Worker RPCs (service role only) ──────────────────────────────────────
-- Claim up to p_limit ready items: FOR UPDATE SKIP LOCKED, run_after respected, at most batch_size per
-- job and per_org_batch_cap per organisation in one claim. Expired items become dead first; items left
-- 'running' past their job's time-out count as a failed attempt.
CREATE OR REPLACE FUNCTION public.background_job_claim(p_worker_id TEXT DEFAULT NULL, p_limit INTEGER DEFAULT 50)
RETURNS TABLE (id UUID, job_code TEXT, payload JSONB, attempts INTEGER, max_attempts INTEGER, organisation_id UUID)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
BEGIN
  UPDATE public.background_job_queue q
     SET status = 'dead', finished_at = NOW(), updated_at = NOW(),
         last_error = COALESCE(q.last_error || ' · ', '') || 'Expired before it could run'
   WHERE q.status = 'pending' AND q.expires_at IS NOT NULL AND q.expires_at <= NOW();

  UPDATE public.background_job_queue q
     SET status = CASE WHEN q.attempts >= q.max_attempts THEN 'dead' ELSE 'pending' END,
         finished_at = CASE WHEN q.attempts >= q.max_attempts THEN NOW() END,
         run_after = NOW(), locked_at = NULL, locked_by = NULL, updated_at = NOW(),
         last_error = 'Worker stopped before finishing'
    FROM public.background_jobs j
   WHERE j.code = q.job_code AND q.status = 'running'
     AND q.locked_at < NOW() - make_interval(secs => j.timeout_seconds);

  RETURN QUERY
  WITH ranked AS (
    SELECT q.id AS item_id, q.job_code AS item_job, q.run_after AS item_after, q.created_at AS item_created,
           j.batch_size, j.per_org_batch_cap,
           row_number() OVER (PARTITION BY q.job_code, COALESCE(q.organisation_id, q.id)
                              ORDER BY q.run_after, q.created_at) AS org_rn
      FROM public.background_job_queue q
      JOIN public.background_jobs j ON j.code = q.job_code AND j.enabled
     WHERE q.status = 'pending' AND q.run_after <= NOW()
  ), capped AS (
    SELECT r.item_id, r.batch_size,
           row_number() OVER (PARTITION BY r.item_job ORDER BY r.item_after, r.item_created) AS job_rn
      FROM ranked r
     WHERE r.per_org_batch_cap IS NULL OR r.org_rn <= r.per_org_batch_cap
  ), picked AS (
    SELECT q.id AS picked_id
      FROM public.background_job_queue q
     WHERE q.id IN (SELECT c.item_id FROM capped c WHERE c.job_rn <= c.batch_size)
       AND q.status = 'pending'
     ORDER BY q.run_after, q.created_at
     LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 50), 500))
     FOR UPDATE SKIP LOCKED
  )
  UPDATE public.background_job_queue q
     SET status = 'running', attempts = q.attempts + 1, locked_at = NOW(), locked_by = p_worker_id,
         last_attempt_at = NOW(), updated_at = NOW()
    FROM picked
   WHERE q.id = picked.picked_id
  RETURNING q.id, q.job_code, q.payload, q.attempts, q.max_attempts, q.organisation_id;
END;
$$;

-- Result of one item. Failed items wait for the next back-off step, or become dead when out of
-- attempts or time. Returns the item's new status.
CREATE OR REPLACE FUNCTION public.background_job_item_complete(
  p_item_id UUID, p_ok BOOLEAN, p_error TEXT DEFAULT NULL, p_result JSONB DEFAULT NULL, p_run_id UUID DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_item   public.background_job_queue;
  v_job    public.background_jobs;
  v_delay  INTEGER;
  v_status TEXT;
BEGIN
  v_item := (SELECT q FROM public.background_job_queue q WHERE q.id = p_item_id);
  IF v_item.id IS NULL THEN RAISE EXCEPTION 'Queue item not found'; END IF;
  v_job := (SELECT j FROM public.background_jobs j WHERE j.code = v_item.job_code);

  IF p_ok THEN
    v_status := 'succeeded';
  ELSE
    v_delay := LEAST(86400, v_job.backoff_schedule[LEAST(GREATEST(v_item.attempts, 1), cardinality(v_job.backoff_schedule))]);
    v_status := CASE
                  WHEN v_item.attempts >= v_item.max_attempts THEN 'dead'
                  WHEN v_item.expires_at IS NOT NULL AND v_item.expires_at <= NOW() + make_interval(secs => v_delay) THEN 'dead'
                  ELSE 'pending'
                END;
  END IF;

  UPDATE public.background_job_queue
     SET status = v_status,
         run_after = CASE WHEN v_status = 'pending' THEN NOW() + make_interval(secs => v_delay) ELSE run_after END,
         finished_at = CASE WHEN v_status IN ('succeeded', 'dead') THEN NOW() END,
         locked_at = NULL, locked_by = NULL,
         last_error = CASE WHEN p_ok THEN last_error ELSE left(COALESCE(p_error, 'Failed'), 4000) END,
         result = COALESCE(p_result, result), last_run_id = COALESCE(p_run_id, last_run_id), updated_at = NOW()
   WHERE id = p_item_id;
  RETURN v_status;
END;
$$;

CREATE OR REPLACE FUNCTION public.background_job_run_start(p_job_code TEXT, p_context JSONB DEFAULT '{}'::jsonb)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.background_job_runs (job_code, status, triggered_by, context, started_at)
  VALUES (p_job_code, 'running', 'worker', COALESCE(p_context, '{}'::jsonb), clock_timestamp())
  RETURNING id INTO v_id;
  UPDATE public.background_jobs SET last_started_at = clock_timestamp() WHERE code = p_job_code;
  RETURN v_id;
END;
$$;

-- p_dead = items that became dead in this run (final failure → 'failed' + alert); p_retrying = items
-- waiting for their next back-off step ('partial', no alert yet).
CREATE OR REPLACE FUNCTION public.background_job_run_finish(
  p_run_id UUID, p_processed INTEGER DEFAULT 0, p_dead INTEGER DEFAULT 0, p_retrying INTEGER DEFAULT 0,
  p_error TEXT DEFAULT NULL, p_result JSONB DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_status TEXT := CASE WHEN COALESCE(p_dead, 0) > 0 THEN 'failed'
                        WHEN COALESCE(p_retrying, 0) > 0 THEN 'partial'
                        ELSE 'succeeded' END;
BEGIN
  UPDATE public.background_job_runs
     SET status = v_status, finished_at = clock_timestamp(),
         duration_ms = (EXTRACT(EPOCH FROM clock_timestamp() - started_at) * 1000)::INTEGER,
         records_processed = p_processed, items_failed = COALESCE(p_dead, 0) + COALESCE(p_retrying, 0),
         error = left(p_error, 4000), result = p_result
   WHERE id = p_run_id AND status = 'running';
  PERFORM public.background_job_after_run(p_run_id);
  RETURN v_status;
END;
$$;

-- ── 14. Registration helper (used by versioned SQL only; rule 80) ────────────
-- Re-running a registration keeps the job's enabled switch and live state.
CREATE OR REPLACE FUNCTION public.background_job_register(
  p_code TEXT,
  p_name TEXT,
  p_kind TEXT,
  p_description TEXT DEFAULT NULL,
  p_owner_system TEXT DEFAULT 'platform',
  p_sql_function TEXT DEFAULT NULL,
  p_cron TEXT DEFAULT NULL,
  p_time_basis TEXT DEFAULT 'utc',
  p_timeout_seconds INTEGER DEFAULT 600,
  p_max_retries INTEGER DEFAULT 0,
  p_retry_delay_seconds INTEGER DEFAULT 300,
  p_max_attempts INTEGER DEFAULT 5,
  p_backoff_schedule INTEGER[] DEFAULT ARRAY[60, 300, 1800, 7200, 86400],
  p_item_ttl_seconds INTEGER DEFAULT NULL,
  p_batch_size INTEGER DEFAULT 50,
  p_per_org_batch_cap INTEGER DEFAULT NULL,
  p_enqueue_guard TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
BEGIN
  IF p_kind = 'sql' AND public.background_job_function_shape(p_sql_function) IS NULL THEN
    RAISE EXCEPTION 'Job % — function % not found (no arguments, or one jsonb argument)', p_code, p_sql_function;
  END IF;
  INSERT INTO public.background_jobs (code, name, description, owner_system, kind, sql_function, cron, time_basis,
    timeout_seconds, max_retries, retry_delay_seconds, max_attempts, backoff_schedule, item_ttl_seconds,
    batch_size, per_org_batch_cap, enqueue_guard)
  VALUES (p_code, p_name, p_description, p_owner_system, p_kind, p_sql_function, p_cron, p_time_basis,
    p_timeout_seconds, p_max_retries, p_retry_delay_seconds, p_max_attempts, p_backoff_schedule, p_item_ttl_seconds,
    p_batch_size, p_per_org_batch_cap, p_enqueue_guard)
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, description = EXCLUDED.description, owner_system = EXCLUDED.owner_system,
    kind = EXCLUDED.kind, sql_function = EXCLUDED.sql_function, cron = EXCLUDED.cron, time_basis = EXCLUDED.time_basis,
    timeout_seconds = EXCLUDED.timeout_seconds, max_retries = EXCLUDED.max_retries,
    retry_delay_seconds = EXCLUDED.retry_delay_seconds, max_attempts = EXCLUDED.max_attempts,
    backoff_schedule = EXCLUDED.backoff_schedule, item_ttl_seconds = EXCLUDED.item_ttl_seconds,
    batch_size = EXCLUDED.batch_size, per_org_batch_cap = EXCLUDED.per_org_batch_cap,
    enqueue_guard = EXCLUDED.enqueue_guard, updated_at = NOW();
  RETURN p_code;
END;
$$;

-- ── 15. Grants: nothing for clients ──────────────────────────────────────────
DO $$
DECLARE
  fn TEXT;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.background_job_organisation_zones()',
    'public.background_job_exec_jsonb(text,jsonb)',
    'public.background_job_raise_alert(text,text,text,uuid)',
    'public.background_job_after_run(uuid)',
    'public.enqueue_background_job(text,jsonb,timestamptz,text,uuid)',
    'public.background_job_wake_worker()',
    'public.background_job_replay_item(uuid,text,text)',
    'public.background_job_replay_item_for_org(uuid,uuid,text,text)',
    'public.run_background_job(text,text,text,uuid,uuid,jsonb)',
    'public.background_job_request_run(text,text,uuid,uuid)',
    'public.run_due_background_jobs(timestamptz)',
    'public.background_jobs_detect_late(timestamptz)',
    'public.background_job_claim(text,integer)',
    'public.background_job_item_complete(uuid,boolean,text,jsonb,uuid)',
    'public.background_job_run_start(text,jsonb)',
    'public.background_job_run_finish(uuid,integer,integer,integer,text,jsonb)',
    'public.background_job_register(text,text,text,text,text,text,text,text,integer,integer,integer,integer,integer[],integer,integer,integer,text)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION public.background_job_claim(TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.background_job_item_complete(UUID, BOOLEAN, TEXT, JSONB, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.background_job_run_start(TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.background_job_run_finish(UUID, INTEGER, INTEGER, INTEGER, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_background_job(TEXT, JSONB, TIMESTAMPTZ, TEXT, UUID) TO service_role;

-- ── 16. Table registry (Database Table Registration Rule) ────────────────────
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('background_jobs', 'Catalogue of background jobs: schedule, kind, retry and queue settings, live status (v1352)', true, true),
  ('background_job_runs', 'One row per background job run: status, timing, counts, error, trigger and reason (v1352)', true, true),
  ('background_job_queue', 'Work items for queue (handler) background jobs with retry timing and dead items (v1352 A1)', true, true),
  ('background_job_settings', 'Singleton background job settings: run-history retention, late grace, alerts (v1352)', true, true),
  ('background_job_config', 'Singleton server-only background worker address and shared secret (v1352)', true, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

NOTIFY pgrst, 'reload schema';
DO $$ BEGIN RAISE NOTICE 'v1559 applied: background jobs framework (no schedules yet — run v1560 next)'; END $$;
