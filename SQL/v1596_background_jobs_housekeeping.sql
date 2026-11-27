-- ============================================================================
-- v1596 — v1352 background jobs, Slice 3: log retention (3.3, D11), storage clean-up (3.2),
--          Simulator housekeeping (3.5), roll-up refresh finding (3.1), context fix for organisation-time jobs
-- ============================================================================
-- PRD: projectprd/v1352_background_jobs_PRD.md (D5, D8, D11, A1.5) · Plan: projectplan/v1352_background_jobs_plan.md
-- Prerequisites: v1559, v1560 (framework + tick), v1562, v1592, v1593. Idempotent.
--
-- Jobs (catalogue + single tick, rule 80):
--   retention.purge        sql      Sunday 03:00 UTC   D11 run history (succeeded / skipped runs and finished work
--                                                      items after background_job_settings.success_retention_days,
--                                                      failed / partly failed runs and dead items after
--                                                      failure_retention_days) + every active row of
--                                                      public.retention_targets, in bounded batches.
--   storage.cleanup        handler  Saturday 04:00 UTC Files in Storage that no registered reference column points to
--                                                      any more, older than the bucket's safety window. Report only
--                                                      until a bucket's delete_enabled is switched on (Admin, reason,
--                                                      audited). Files are removed through the Storage API by the
--                                                      worker (handlers/storage.cleanup.js), never by SQL.
--   simulator.housekeeping sql      daily 02:45 UTC    Practice runs idle for sim_run_abandon_days → 'abandoned';
--                                                      collaborative lobbies never started → 'abandoned'.
--
-- 3.1 Roll-up refresh — nothing to refresh: there are no materialised views or cached roll-up tables in public or
-- sim. Portfolio, programme and PMO dashboards compute from live tables; public.portfolio_metrics is written only
-- by v36 test data and read by no live page. No job is registered (the plan's review records this).
--
-- Fix: public.background_job_function_shape now reports 'context' for a job function whose single argument is
-- jsonb even when that argument has a default. Before, such functions (all organisation-time jobs: reminders,
-- digest, renewal reminders, timesheet reminders, health reports) were called without the tick's context, so
-- they never saw the due time zones and ran for every organisation at the first zone's time.
--
-- New tables: public.retention_targets (same shape and key as v1586 creates — either file may run first),
-- public.storage_cleanup_buckets, public.storage_cleanup_references. RLS on, no client access; Admin edits
-- them only through the Admin SQL v262 RPCs. After running: re-run SQL/v1251_planner_table_wall.sql.
-- ============================================================================

-- ── 0. Context for jobs whose jsonb argument has a default ───────────────────
CREATE OR REPLACE FUNCTION public.background_job_function_shape(p_fn TEXT)
RETURNS TEXT
LANGUAGE sql STABLE
AS $$
  SELECT CASE
           WHEN p.pronargs = 1 AND p.proargtypes[0] = 'jsonb'::regtype AND p.prorettype <> 'void'::regtype THEN 'context'
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

-- ── 1. Retention list (A1.5) ─────────────────────────────────────────────────
-- Base shape and key exactly as v1586 (v1356) creates it.
CREATE TABLE IF NOT EXISTS public.retention_targets (
  table_schema TEXT NOT NULL DEFAULT 'public',
  table_name TEXT NOT NULL,
  date_column TEXT NOT NULL DEFAULT 'created_at',
  retain_days INTEGER NOT NULL DEFAULT 90,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (table_schema, table_name)
);
ALTER TABLE public.retention_targets
  ADD COLUMN IF NOT EXISTS status_column      TEXT,
  ADD COLUMN IF NOT EXISTS status_values      TEXT[],
  ADD COLUMN IF NOT EXISTS batch_size         INTEGER NOT NULL DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS max_batches        INTEGER NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS notes              TEXT,
  ADD COLUMN IF NOT EXISTS last_purged_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_deleted_count INTEGER,
  ADD COLUMN IF NOT EXISTS last_result        TEXT,
  ADD COLUMN IF NOT EXISTS created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_by_admin   UUID,
  ADD COLUMN IF NOT EXISTS change_reason      TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'retention_targets_names_valid') THEN
    ALTER TABLE public.retention_targets ADD CONSTRAINT retention_targets_names_valid CHECK (
      table_schema ~ '^[a-z_][a-z0-9_]*$' AND table_name ~ '^[a-z_][a-z0-9_]*$' AND date_column ~ '^[a-z_][a-z0-9_]*$'
      AND (status_column IS NULL OR status_column ~ '^[a-z_][a-z0-9_]*$'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'retention_targets_limits_valid') THEN
    ALTER TABLE public.retention_targets ADD CONSTRAINT retention_targets_limits_valid CHECK (
      retain_days BETWEEN 7 AND 3650 AND batch_size BETWEEN 100 AND 50000 AND max_batches BETWEEN 1 AND 1000);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'retention_targets_status_filter') THEN
    ALTER TABLE public.retention_targets ADD CONSTRAINT retention_targets_status_filter CHECK (
      status_column IS NULL OR cardinality(COALESCE(status_values, ARRAY[]::TEXT[])) >= 1);
  END IF;
END $$;

COMMENT ON TABLE public.retention_targets IS
  'v1352 A1.5 / v1356: tables the retention.purge job trims by age (date column, keep period, optional status filter). Later features add rows. Admin edits keep period / active only (Admin SQL v262).';
COMMENT ON COLUMN public.retention_targets.status_values IS
  'When status_column is set, only rows whose status (as text) is one of these are purged, e.g. {true} for is_read.';

-- Seed rows: technical logs only, with conservative keep periods. Audit, security and consent evidence
-- tables are listed but switched off (is_active = FALSE) — keeping or trimming them is an owner decision.
-- A row whose table or column does not exist here is skipped by the job and reported in the run result.
INSERT INTO public.retention_targets (table_schema, table_name, date_column, retain_days, is_active, status_column, status_values, notes) VALUES
  ('public', 'background_job_markers', 'created_at', 400, TRUE, NULL, NULL,
   'Job "already done" markers. Every job window is under 100 days, so a 400-day-old marker can never block or allow a send.'),
  ('public', 'reminder_markers', 'due_date', 400, TRUE, NULL, NULL,
   'Reminder markers by due date. Overdue reminders stop 14 days after the due date.'),
  ('sim', 'reminder_markers', 'due_date', 400, TRUE, NULL, NULL,
   'Practice reminder markers by due date.'),
  ('public', 'email_logs', 'created_at', 365, TRUE, NULL, NULL, 'Email send log (v49).'),
  ('public', 'error_logs', 'created_at', 180, TRUE, NULL, NULL, 'Application error log (v02).'),
  ('sim', 'error_logs', 'created_at', 180, TRUE, NULL, NULL, 'Simulator error log (v78).'),
  ('public', 'api_logs', 'created_at', 90, TRUE, NULL, NULL, 'Legacy API log (v42).'),
  ('sim', 'api_usage_logs', 'created_at', 90, TRUE, NULL, NULL, 'Simulator API usage log (v77).'),
  ('public', 'session_logs', 'created_at', 180, TRUE, NULL, NULL, 'Sign-in session log (v02).'),
  ('public', 'google_calendar_sync_logs', 'created_at', 180, TRUE, NULL, NULL, 'Calendar sync log (v47).'),
  ('public', 'outlook_sync_logs', 'created_at', 180, TRUE, NULL, NULL, 'Calendar sync log (v46).'),
  ('public', 'jira_sync_logs', 'created_at', 180, TRUE, NULL, NULL, 'Integration sync log (v45).'),
  ('public', 'integration_sync_log', 'created_at', 180, TRUE, NULL, NULL, 'Integration sync log (v29).'),
  ('public', 'webhook_logs', 'created_at', 90, TRUE, NULL, NULL, 'Legacy webhook delivery log (v43).'),
  ('public', 'mfa_verification_logs', 'created_at', 365, TRUE, NULL, NULL, 'Two-factor check attempts (v50).'),
  ('public', 'sso_login_logs', 'created_at', 365, TRUE, NULL, NULL, 'Single sign-on attempts (v51).'),
  ('public', 'field_help_events', 'created_at', 730, TRUE, NULL, NULL, 'Field help usage and votes (v1345); two years keeps a full trend.'),
  ('sim', 'field_help_events', 'created_at', 730, TRUE, NULL, NULL, 'Field help usage and votes, Simulator (v1345).'),
  ('sim', 'analytics_events', 'created_at', 365, TRUE, NULL, NULL, 'Simulator usage events (v78).'),
  ('public', 'notifications', 'created_at', 365, FALSE, 'is_read', ARRAY['true'],
   'Read in-app notices older than a year. Off until the owner decides (people may look back at old notices).'),
  ('public', 'audit_log', 'created_at', 2555, FALSE, NULL, NULL, 'Audit evidence. Off: keeping or trimming audit logs is an owner decision.'),
  ('public', 'activity_logs', 'created_at', 2555, FALSE, NULL, NULL, 'Record activity history. Off: owner decision.'),
  ('public', 'data_access_logs', 'created_at', 2555, FALSE, NULL, NULL, 'Data access audit. Off: owner decision.'),
  ('public', 'security_events', 'created_at', 2555, FALSE, NULL, NULL, 'Security events. Off: owner decision.')
ON CONFLICT (table_schema, table_name) DO NOTHING;

-- ── 2. Storage clean-up tables (3.2) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.storage_cleanup_buckets (
  bucket_id           TEXT PRIMARY KEY CHECK (bucket_id ~ '^[a-z0-9][a-z0-9_-]*$'),
  min_age_days        INTEGER NOT NULL DEFAULT 30 CHECK (min_age_days BETWEEN 7 AND 3650),
  delete_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  max_files_per_run   INTEGER NOT NULL DEFAULT 500 CHECK (max_files_per_run BETWEEN 1 AND 5000),
  notes               TEXT,
  last_scanned_at     TIMESTAMPTZ,
  last_object_count   INTEGER,
  last_orphan_count   INTEGER,
  last_deleted_count  INTEGER,
  last_result         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by_admin    UUID,
  change_reason       TEXT
);
COMMENT ON TABLE public.storage_cleanup_buckets IS
  'v1352 Slice 3.2: Storage buckets the storage.cleanup job looks at. Report only until delete_enabled (Admin, reason, audited).';

CREATE TABLE IF NOT EXISTS public.storage_cleanup_references (
  bucket_id   TEXT NOT NULL REFERENCES public.storage_cleanup_buckets(bucket_id) ON DELETE CASCADE,
  ref_schema  TEXT NOT NULL CHECK (ref_schema ~ '^[a-z_][a-z0-9_]*$'),
  ref_table   TEXT NOT NULL CHECK (ref_table ~ '^[a-z_][a-z0-9_]*$'),
  ref_column  TEXT NOT NULL CHECK (ref_column ~ '^[a-z_][a-z0-9_]*$'),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_storage_cleanup_references PRIMARY KEY (bucket_id, ref_schema, ref_table, ref_column)
);
COMMENT ON TABLE public.storage_cleanup_references IS
  'v1352 Slice 3.2: columns that hold a file path (or a Storage URL) for a bucket. A file is orphaned only when none of its bucket''s columns point to it; a bucket with a missing column is skipped.';

ALTER TABLE public.retention_targets          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_cleanup_buckets    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_cleanup_references ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.retention_targets, public.storage_cleanup_buckets, public.storage_cleanup_references FROM anon, authenticated;
GRANT ALL ON public.retention_targets, public.storage_cleanup_buckets, public.storage_cleanup_references TO service_role;

-- Buckets whose reference columns were checked in the code (upload path stored as-is). All report only.
INSERT INTO public.storage_cleanup_buckets (bucket_id, min_age_days, notes) VALUES
  ('risk-attachments', 30, 'riskAttachmentService.js stores the upload path in risk_attachments.file_path.'),
  ('defect-attachments', 30, 'defectService.js (both apps, public tables) stores the path in defect_attachments.file_path.'),
  ('sim-defect-attachments', 30, 'practiceDefectService.js stores the path in sim.practice_defect_attachments.file_path.'),
  ('local-register-attachments', 30, 'localRegisterAttachmentService.js stores storage_path; replaced versions keep their rows.'),
  ('change-log-attachments', 30, 'changeLogService.js stores the path in change_log_attachments.file_path.'),
  ('user-avatars', 30, 'userAvatarService.js stores the path in users.avatar_url.'),
  ('stakeholder-photos', 30, 'stakeholderPhotoService.js stores photo_path on stakeholders and practice stakeholders.')
ON CONFLICT (bucket_id) DO NOTHING;

INSERT INTO public.storage_cleanup_references (bucket_id, ref_schema, ref_table, ref_column) VALUES
  ('risk-attachments', 'public', 'risk_attachments', 'file_path'),
  ('defect-attachments', 'public', 'defect_attachments', 'file_path'),
  ('sim-defect-attachments', 'sim', 'practice_defect_attachments', 'file_path'),
  ('local-register-attachments', 'public', 'local_register_record_attachments', 'storage_path'),
  ('local-register-attachments', 'sim', 'local_register_record_attachments', 'storage_path'),
  ('change-log-attachments', 'public', 'change_log_attachments', 'file_path'),
  ('user-avatars', 'public', 'users', 'avatar_url'),
  ('stakeholder-photos', 'public', 'stakeholders', 'photo_path'),
  ('stakeholder-photos', 'sim', 'practice_stakeholder_register', 'photo_path')
ON CONFLICT DO NOTHING;

-- ── 3. Settings for Simulator housekeeping (one row, existing thresholds table) ─
ALTER TABLE public.saas_job_settings
  ADD COLUMN IF NOT EXISTS sim_run_abandon_days   INTEGER NOT NULL DEFAULT 90,
  ADD COLUMN IF NOT EXISTS sim_lobby_abandon_days INTEGER NOT NULL DEFAULT 30;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'saas_job_settings_sim_days') THEN
    ALTER TABLE public.saas_job_settings ADD CONSTRAINT saas_job_settings_sim_days CHECK (
      sim_run_abandon_days BETWEEN 14 AND 730 AND sim_lobby_abandon_days BETWEEN 7 AND 365);
  END IF;
END $$;
COMMENT ON TABLE public.saas_job_settings IS
  'v1352 Slice 2–3: thresholds of the payment, renewal, invitation, allowance and Simulator housekeeping jobs (one row; edited with SQL until an Admin screen exists).';

-- ── 4. Retention helpers ─────────────────────────────────────────────────────
-- NULL when the target can be purged here, otherwise the reason it is skipped. Names are checked against the
-- catalog, so the purge never builds a statement for a table or column that is not there.
CREATE OR REPLACE FUNCTION public.retention_target_problem(p_schema TEXT, p_table TEXT, p_date_column TEXT, p_status_column TEXT)
RETURNS TEXT
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_kind CHAR;
  v_type TEXT;
BEGIN
  IF p_schema IN ('admin', 'auth', 'storage', 'pg_catalog', 'information_schema', 'cron', 'net') THEN
    RETURN 'schema not allowed';
  END IF;
  v_kind := (SELECT c.relkind FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
              WHERE n.nspname = p_schema AND c.relname = p_table);
  IF v_kind IS NULL THEN RETURN 'table not found'; END IF;
  IF v_kind <> 'r' THEN RETURN 'not a plain table'; END IF;   -- batches use ctid, unique only in a plain table
  v_type := (SELECT format_type(a.atttypid, a.atttypmod) FROM pg_attribute a
              WHERE a.attrelid = format('%I.%I', p_schema, p_table)::regclass AND a.attname = p_date_column
                AND a.attnum > 0 AND NOT a.attisdropped);
  IF v_type IS NULL THEN RETURN 'date column not found'; END IF;
  IF v_type NOT IN ('date', 'timestamp without time zone', 'timestamp with time zone') THEN
    RETURN 'date column is not a date or time';
  END IF;
  IF p_status_column IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM pg_attribute a
        WHERE a.attrelid = format('%I.%I', p_schema, p_table)::regclass AND a.attname = p_status_column
          AND a.attnum > 0 AND NOT a.attisdropped) THEN
    RETURN 'status column not found';
  END IF;
  RETURN NULL;
END;
$$;

-- Deletes (or counts, when p_dry_run) rows older than the cutoff, at most p_batch × p_max_batches.
CREATE OR REPLACE FUNCTION public.retention_purge_table(
  p_schema TEXT, p_table TEXT, p_date_column TEXT, p_cutoff TIMESTAMPTZ,
  p_status_column TEXT DEFAULT NULL, p_status_values TEXT[] DEFAULT NULL,
  p_batch INTEGER DEFAULT 5000, p_max_batches INTEGER DEFAULT 20, p_dry_run BOOLEAN DEFAULT FALSE
)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_where TEXT;
  v_total INTEGER := 0;
  v_n     INTEGER;
  v_i     INTEGER := 0;
  rec     RECORD;
BEGIN
  IF public.retention_target_problem(p_schema, p_table, p_date_column, p_status_column) IS NOT NULL THEN
    RAISE EXCEPTION 'retention target %.% is not valid: %', p_schema, p_table,
      public.retention_target_problem(p_schema, p_table, p_date_column, p_status_column);
  END IF;
  v_where := format('%I < $1', p_date_column)
          || CASE WHEN p_status_column IS NOT NULL THEN format(' AND %I::text = ANY($2)', p_status_column) ELSE '' END;

  IF p_dry_run THEN
    FOR rec IN EXECUTE format('SELECT count(*)::INTEGER AS n FROM %I.%I WHERE ', p_schema, p_table) || v_where
      USING p_cutoff, p_status_values LOOP
      v_total := rec.n;
    END LOOP;
    RETURN v_total;
  END IF;

  LOOP
    v_i := v_i + 1;
    EXIT WHEN v_i > GREATEST(1, p_max_batches);
    EXECUTE format('DELETE FROM %I.%I WHERE ctid = ANY(ARRAY(SELECT ctid FROM %I.%I WHERE ',
                   p_schema, p_table, p_schema, p_table) || v_where || format(' LIMIT %s))', GREATEST(1, p_batch))
      USING p_cutoff, p_status_values;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    v_total := v_total + v_n;
    EXIT WHEN v_n < GREATEST(1, p_batch);
  END LOOP;
  RETURN v_total;
END;
$$;

-- ── 5. retention.purge (3.3 + D11) ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.run_retention_purge(p_context JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_dry      BOOLEAN := COALESCE((p_context ->> 'dry_run')::BOOLEAN, FALSE);
  s          public.background_job_settings;
  v_ok_cut   TIMESTAMPTZ;
  v_bad_cut  TIMESTAMPTZ;
  v_history  JSONB := '{}'::jsonb;
  v_targets  JSONB := '[]'::jsonb;
  v_n        INTEGER;
  v_total    INTEGER := 0;
  v_problem  TEXT;
  t          public.retention_targets;
BEGIN
  s := (SELECT x FROM public.background_job_settings x WHERE x.id);
  v_ok_cut  := NOW() - make_interval(days => COALESCE(s.success_retention_days, 90));
  v_bad_cut := NOW() - make_interval(days => COALESCE(s.failure_retention_days, 365));

  -- D11 run history. Never touches running runs or waiting / running work items.
  v_n := public.retention_purge_table('public', 'background_job_runs', 'started_at', v_ok_cut, 'status',
                                      ARRAY['succeeded', 'skipped'], 5000, 40, v_dry);
  v_history := v_history || jsonb_build_object('runs_succeeded', v_n);  v_total := v_total + v_n;
  v_n := public.retention_purge_table('public', 'background_job_runs', 'started_at', v_bad_cut, 'status',
                                      ARRAY['failed', 'partial'], 5000, 40, v_dry);
  v_history := v_history || jsonb_build_object('runs_failed', v_n);  v_total := v_total + v_n;
  v_n := public.retention_purge_table('public', 'background_job_queue', 'finished_at', v_ok_cut, 'status',
                                      ARRAY['succeeded'], 5000, 40, v_dry);
  v_history := v_history || jsonb_build_object('items_succeeded', v_n);  v_total := v_total + v_n;
  v_n := public.retention_purge_table('public', 'background_job_queue', 'finished_at', v_bad_cut, 'status',
                                      ARRAY['dead'], 5000, 40, v_dry);
  v_history := v_history || jsonb_build_object('items_dead', v_n);  v_total := v_total + v_n;

  -- Retention list (A1.5). One target failing never stops the others.
  FOR t IN SELECT * FROM public.retention_targets WHERE is_active ORDER BY table_schema, table_name LOOP
    v_problem := public.retention_target_problem(t.table_schema, t.table_name, t.date_column, t.status_column);
    IF v_problem IS NOT NULL THEN
      v_targets := v_targets || jsonb_build_object('table', t.table_schema || '.' || t.table_name, 'skipped', v_problem);
      IF NOT v_dry THEN
        UPDATE public.retention_targets SET last_purged_at = NOW(), last_deleted_count = 0, last_result = 'skipped: ' || v_problem
         WHERE table_schema = t.table_schema AND table_name = t.table_name;
      END IF;
      CONTINUE;
    END IF;
    BEGIN
      v_n := public.retention_purge_table(t.table_schema, t.table_name, t.date_column,
               NOW() - make_interval(days => t.retain_days), t.status_column, t.status_values,
               t.batch_size, t.max_batches, v_dry);
      v_total := v_total + v_n;
      v_targets := v_targets || jsonb_build_object('table', t.table_schema || '.' || t.table_name,
                                                   CASE WHEN v_dry THEN 'would_delete' ELSE 'deleted' END, v_n);
      IF NOT v_dry THEN
        UPDATE public.retention_targets
           SET last_purged_at = NOW(), last_deleted_count = v_n,
               last_result = CASE WHEN v_n >= t.batch_size * t.max_batches THEN 'more left for the next run' ELSE 'ok' END
         WHERE table_schema = t.table_schema AND table_name = t.table_name;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_targets := v_targets || jsonb_build_object('table', t.table_schema || '.' || t.table_name, 'error', left(SQLERRM, 300));
      IF NOT v_dry THEN
        UPDATE public.retention_targets SET last_purged_at = NOW(), last_deleted_count = 0, last_result = 'error: ' || left(SQLERRM, 300)
         WHERE table_schema = t.table_schema AND table_name = t.table_name;
      END IF;
    END;
  END LOOP;

  RETURN jsonb_build_object('processed', v_total, 'run_history', v_history, 'targets', v_targets,
                            'success_retention_days', s.success_retention_days,
                            'failure_retention_days', s.failure_retention_days, 'dry_run', v_dry);
END;
$$;

-- ── 6. storage.cleanup scan (3.2) ────────────────────────────────────────────
-- A stored value points to a file when, after dropping any ?query and any leading ".../<bucket>/" (public or
-- signed Storage URLs), it equals the file name (or the name with spaces written as %20).
CREATE OR REPLACE FUNCTION public.storage_cleanup_normalise(p_value TEXT, p_bucket TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE
AS $$
  SELECT NULLIF(regexp_replace(split_part(btrim(COALESCE(p_value, '')), '?', 1),
                               '^(.*/)?' || p_bucket || '/', ''), '');
$$;

-- Lists orphaned files per active bucket. Returns the paths to delete only for buckets with delete_enabled
-- (and not on a dry run); the worker removes them through the Storage API. Updates each bucket's last scan.
CREATE OR REPLACE FUNCTION public.storage_cleanup_scan(p_dry_run BOOLEAN DEFAULT FALSE)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, storage SET row_security = off
AS $$
DECLARE
  b          public.storage_cleanup_buckets;
  r          public.storage_cleanup_references;
  v_refs     TEXT;
  v_problem  TEXT;
  v_type     TEXT;
  v_cut      TIMESTAMPTZ;
  v_old      INTEGER;
  v_orphans  INTEGER;
  v_paths    TEXT[];
  v_out      JSONB := '[]'::jsonb;
  rec        RECORD;
BEGIN
  IF to_regclass('storage.objects') IS NULL THEN
    RETURN jsonb_build_object('buckets', '[]'::jsonb, 'note', 'storage.objects not found');
  END IF;

  FOR b IN SELECT * FROM public.storage_cleanup_buckets WHERE is_active ORDER BY bucket_id LOOP
    v_refs := NULL;
    v_problem := NULL;
    IF NOT EXISTS (SELECT 1 FROM storage.buckets sb WHERE sb.id = b.bucket_id) THEN
      v_problem := 'bucket not found';
    ELSIF NOT EXISTS (SELECT 1 FROM public.storage_cleanup_references x WHERE x.bucket_id = b.bucket_id) THEN
      v_problem := 'no reference columns registered';
    END IF;
    IF v_problem IS NULL THEN
      FOR r IN SELECT * FROM public.storage_cleanup_references x WHERE x.bucket_id = b.bucket_id LOOP
        v_type := NULL;
        IF to_regclass(format('%I.%I', r.ref_schema, r.ref_table)) IS NOT NULL THEN
          v_type := (SELECT format_type(a.atttypid, a.atttypmod) FROM pg_attribute a
                      WHERE a.attrelid = format('%I.%I', r.ref_schema, r.ref_table)::regclass AND a.attname = r.ref_column
                        AND a.attnum > 0 AND NOT a.attisdropped);
        END IF;
        IF v_type IS NULL OR v_type NOT IN ('text') AND v_type NOT LIKE 'character varying%' THEN
          v_problem := format('reference %s.%s.%s missing or not text', r.ref_schema, r.ref_table, r.ref_column);
          EXIT;
        END IF;
        v_refs := COALESCE(v_refs || ' UNION ', '')
               || format('SELECT public.storage_cleanup_normalise(%I::text, %L) AS ref FROM %I.%I WHERE %I IS NOT NULL',
                         r.ref_column, b.bucket_id, r.ref_schema, r.ref_table, r.ref_column);
      END LOOP;
    END IF;

    IF v_problem IS NOT NULL THEN
      v_out := v_out || jsonb_build_object('bucket', b.bucket_id, 'skipped', v_problem);
      IF NOT p_dry_run THEN
        UPDATE public.storage_cleanup_buckets SET last_scanned_at = NOW(), last_result = 'skipped: ' || v_problem
         WHERE bucket_id = b.bucket_id;
      END IF;
      CONTINUE;
    END IF;

    v_cut := NOW() - make_interval(days => b.min_age_days);
    v_old := 0; v_orphans := 0; v_paths := ARRAY[]::TEXT[];
    FOR rec IN EXECUTE format($q$
        WITH refs AS (%s),
        old AS (SELECT o.name FROM storage.objects o
                 WHERE o.bucket_id = $1 AND o.created_at < $2
                   AND o.name IS NOT NULL AND o.name !~ '(^|/)\.emptyFolderPlaceholder$'),
        orphan AS (SELECT old.name FROM old
                    WHERE NOT EXISTS (SELECT 1 FROM refs WHERE refs.ref = old.name OR refs.ref = replace(old.name, ' ', '%%20')))
        SELECT (SELECT count(*)::INTEGER FROM old) AS old_count,
               (SELECT count(*)::INTEGER FROM orphan) AS orphan_count,
               ARRAY(SELECT orphan.name FROM orphan ORDER BY orphan.name LIMIT $3) AS paths
      $q$, v_refs)
      USING b.bucket_id, v_cut, b.max_files_per_run
    LOOP
      v_old := rec.old_count; v_orphans := rec.orphan_count; v_paths := rec.paths;
    END LOOP;

    v_out := v_out || jsonb_build_object(
      'bucket', b.bucket_id, 'old_files', v_old, 'orphans', v_orphans,
      'delete_enabled', b.delete_enabled AND NOT p_dry_run,
      'paths', CASE WHEN b.delete_enabled AND NOT p_dry_run THEN to_jsonb(v_paths) ELSE '[]'::jsonb END);
    IF NOT p_dry_run THEN
      UPDATE public.storage_cleanup_buckets
         SET last_scanned_at = NOW(), last_object_count = v_old, last_orphan_count = v_orphans,
             last_deleted_count = CASE WHEN b.delete_enabled THEN last_deleted_count ELSE 0 END,
             last_result = CASE WHEN b.delete_enabled THEN 'scanned' ELSE 'report only (deletion is off)' END
       WHERE bucket_id = b.bucket_id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('buckets', v_out, 'dry_run', p_dry_run);
END;
$$;

-- What the worker removed for one bucket (or why it could not).
CREATE OR REPLACE FUNCTION public.storage_cleanup_record(p_bucket TEXT, p_deleted INTEGER, p_error TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE sql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  UPDATE public.storage_cleanup_buckets
     SET last_deleted_count = COALESCE(p_deleted, 0),
         last_result = CASE WHEN p_error IS NOT NULL THEN 'error: ' || left(p_error, 300)
                            ELSE format('deleted %s file(s)', COALESCE(p_deleted, 0)) END
   WHERE bucket_id = p_bucket;
$$;

-- Guard: only queue the worker when at least one bucket is active.
CREATE OR REPLACE FUNCTION public.storage_cleanup_has_work()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  SELECT EXISTS (SELECT 1 FROM public.storage_cleanup_buckets WHERE is_active);
$$;

-- ── 7. simulator.housekeeping (3.5) ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.run_simulator_housekeeping(p_context JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
DECLARE
  v_dry    BOOLEAN := COALESCE((p_context ->> 'dry_run')::BOOLEAN, FALSE);
  s        public.saas_job_settings;
  v_runs   INTEGER := 0;
  v_lobby  INTEGER := 0;
  v_active INTEGER := 0;
  v_run_cut   TIMESTAMPTZ;
  v_lobby_cut TIMESTAMPTZ;
BEGIN
  s := (SELECT x FROM public.saas_job_settings x WHERE x.id);
  v_run_cut   := NOW() - make_interval(days => COALESCE(s.sim_run_abandon_days, 90));
  v_lobby_cut := NOW() - make_interval(days => COALESCE(s.sim_lobby_abandon_days, 30));

  IF to_regclass('sim.simulation_runs') IS NOT NULL THEN
    IF v_dry THEN
      v_runs := (SELECT count(*) FROM sim.simulation_runs r
                  WHERE r.status IN ('in_progress', 'paused')
                    AND COALESCE(r.last_activity_at, r.updated_at, r.started_at, r.created_at) < v_run_cut);
    ELSE
      UPDATE sim.simulation_runs r
         SET status = 'abandoned', updated_at = NOW()
       WHERE r.id = ANY(ARRAY(SELECT x.id FROM sim.simulation_runs x
                               WHERE x.status IN ('in_progress', 'paused')
                                 AND COALESCE(x.last_activity_at, x.updated_at, x.started_at, x.created_at) < v_run_cut
                               LIMIT 5000));
      GET DIAGNOSTICS v_runs = ROW_COUNT;
    END IF;
  END IF;

  IF to_regclass('sim.collaborative_sessions') IS NOT NULL THEN
    IF v_dry THEN
      v_lobby  := (SELECT count(*) FROM sim.collaborative_sessions c WHERE c.status = 'forming' AND c.created_at < v_lobby_cut);
      v_active := (SELECT count(*) FROM sim.collaborative_sessions c WHERE c.status = 'active' AND c.updated_at < v_run_cut);
    ELSE
      UPDATE sim.collaborative_sessions c SET status = 'abandoned'
       WHERE c.status = 'forming' AND c.created_at < v_lobby_cut;
      GET DIAGNOSTICS v_lobby = ROW_COUNT;
      UPDATE sim.collaborative_sessions c SET status = 'abandoned'
       WHERE c.status = 'active' AND c.updated_at < v_run_cut;
      GET DIAGNOSTICS v_active = ROW_COUNT;
    END IF;
  END IF;

  RETURN jsonb_build_object('processed', v_runs + v_lobby + v_active, 'runs_abandoned', v_runs,
                            'lobbies_abandoned', v_lobby, 'sessions_abandoned', v_active,
                            'run_abandon_days', s.sim_run_abandon_days, 'lobby_abandon_days', s.sim_lobby_abandon_days,
                            'dry_run', v_dry);
END;
$$;

-- ── 8. Grants (job internals: service role only) ─────────────────────────────
DO $$
DECLARE
  fn TEXT;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.retention_target_problem(text,text,text,text)',
    'public.retention_purge_table(text,text,text,timestamptz,text,text[],integer,integer,boolean)',
    'public.run_retention_purge(jsonb)',
    'public.storage_cleanup_scan(boolean)',
    'public.storage_cleanup_record(text,integer,text)',
    'public.storage_cleanup_has_work()',
    'public.run_simulator_housekeeping(jsonb)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION public.storage_cleanup_scan(BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION public.storage_cleanup_record(TEXT, INTEGER, TEXT) TO service_role;

-- ── 9. Catalogue rows (rule 80) ──────────────────────────────────────────────
SELECT public.background_job_register(
  p_code => 'retention.purge',
  p_name => 'Log retention',
  p_kind => 'sql',
  p_description => 'Deletes background job history past its keep period (D11) and old rows of every active table in the retention list, in bounded batches.',
  p_owner_system => 'system',
  p_sql_function => 'public.run_retention_purge',
  p_cron => '0 3 * * 0',
  p_timeout_seconds => 1800
);
SELECT public.background_job_register(
  p_code => 'storage.cleanup',
  p_name => 'Storage clean-up',
  p_kind => 'handler',
  p_description => 'Finds uploaded files no record points to any more (older than each bucket’s safety window). Reports only, until deletion is switched on for a bucket.',
  p_owner_system => 'system',
  p_cron => '0 4 * * 6',
  p_timeout_seconds => 600,
  p_max_attempts => 2,
  p_backoff_schedule => ARRAY[3600],
  p_item_ttl_seconds => 21600,
  p_batch_size => 1,
  p_enqueue_guard => 'public.storage_cleanup_has_work'
);
SELECT public.background_job_register(
  p_code => 'simulator.housekeeping',
  p_name => 'Simulator housekeeping',
  p_kind => 'sql',
  p_description => 'Marks practice runs idle for a long time, and collaborative lobbies that never started, as abandoned.',
  p_owner_system => 'simulator',
  p_sql_function => 'public.run_simulator_housekeeping',
  p_cron => '45 2 * * *',
  p_timeout_seconds => 300
);

-- ── 10. Register the new tables ──────────────────────────────────────────────
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('retention_targets', 'Tables the log retention job trims by age: date column, keep period, optional status filter (v1352 A1 / v1356)', true, true),
  ('storage_cleanup_buckets', 'Storage buckets the storage clean-up job checks, safety window and deletion switch (v1352 Slice 3)', true, true),
  ('storage_cleanup_references', 'Columns that hold file paths for each Storage bucket checked by the clean-up job (v1352 Slice 3)', true, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

NOTIFY pgrst, 'reload schema';

-- Checks: the new jobs, the context fix, and what each would do today (dry runs change nothing).
SELECT code, kind, cron, time_basis, enabled, enqueue_guard FROM public.background_jobs
 WHERE code IN ('retention.purge', 'storage.cleanup', 'simulator.housekeeping') ORDER BY code;
SELECT public.background_job_function_shape('public.run_due_reminders') AS reminders_shape_expect_context;
SELECT public.run_retention_purge('{"dry_run": true}') AS retention,
       public.run_simulator_housekeeping('{"dry_run": true}') AS simulator;
SELECT public.storage_cleanup_scan(TRUE) AS storage;
