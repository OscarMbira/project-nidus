-- ============================================================================
-- v1597 — v1352 background jobs, Slice 3: weekly data-quality report (3.4) and manual jobs (M.2, M.3, M.5 dry run)
-- ============================================================================
-- PRD: projectprd/v1352_background_jobs_PRD.md (D5, D6, M.1–M.5) · Plan: projectplan/v1352_background_jobs_plan.md
-- Prerequisites: v1559–v1563, v1592, v1593, v1596. Idempotent.
--
-- Jobs (catalogue + single tick, rule 80):
--   quality.weekly_report      sql  Monday 07:00 organisation time  Counts a small set of data gaps per organisation
--                                                                  (public.data_quality_checks — rows, not code) and
--                                                                  sends one in-app notice to the owner and PMO
--                                                                  Admins when any count is above zero. Email comes
--                                                                  through the daily digest (D6, Reports switch).
--                                                                  Once per organisation and ISO week (marker with
--                                                                  the counts = the stored result).
--   backfill.global_templates  sql  manual only (no schedule)       M.2: organisations missing Global Template copies
--                                                                  catch up (sync_global_templates_to_account, v1001),
--                                                                  at most 50 per run; run again for more.
--   search.reindex             sql  manual only (no schedule)       M.3: rebuilds public|sim.search_index rows from the
--                                                                  source records (ai_search_backfill, v1277). Changed
--                                                                  rows are embedded again by ai.embed. Re-embedding
--                                                                  everything is Admin › AI › Embeddings (Admin v238).
-- Manual jobs are started from Admin › System › Background Jobs › Run now (reason required, audited — Admin v255).
--
-- M.5 organisation data export / deletion is not built (owner decision, see the plan). This file adds only a
-- read-only dry run for the owner: public.organisation_data_footprint(account_id) lists the tables and row counts
-- that belong to one organisation. It changes nothing and has no client or Admin grant.
-- M.4 large bulk-import processing is not built: every bulk import today parses the file in the browser and saves
-- through the normal services, so there is no server-side import to move to the queue (see the plan).
--
-- Data quality is Platform only: practice projects belong to one learner and have no PMO Admin (see the plan).
-- New table: public.data_quality_checks (RLS on, no client access). After running: re-run
-- SQL/v1251_planner_table_wall.sql.
-- ============================================================================

-- ── 1. Data-quality checks (data, not code) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.data_quality_checks (
  check_code      TEXT PRIMARY KEY CHECK (check_code ~ '^[a-z][a-z0-9_]*$'),
  label           TEXT NOT NULL,
  description     TEXT,
  count_sql       TEXT NOT NULL,              -- one scalar count; $1 = organisation (account) id, $2 = its local date
  planner_tables  TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  sort_order      INTEGER NOT NULL DEFAULT 100,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.data_quality_checks IS
  'v1352 Slice 3.4: checks of the weekly data-quality report. count_sql returns one count for an organisation ($1) on its local date ($2). A check that fails to run is skipped and listed in the run result.';
ALTER TABLE public.data_quality_checks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.data_quality_checks FROM anon, authenticated;
GRANT ALL ON public.data_quality_checks TO service_role;

-- Open project = not deleted, not archived, and its status is not a final status.
INSERT INTO public.data_quality_checks (check_code, label, description, count_sql, planner_tables, sort_order) VALUES
  ('project_without_manager', 'Open projects without a project manager',
   'Open projects whose project manager is not set.',
   'SELECT count(*) FROM public.projects p WHERE p.account_id = $1 AND NOT COALESCE(p.is_deleted, FALSE) AND NOT COALESCE(p.is_archived, FALSE)
      AND NOT EXISTS (SELECT 1 FROM public.project_statuses ps WHERE ps.id = p.status_id AND COALESCE(ps.is_final_status, FALSE))
      AND p.project_manager_user_id IS NULL',
   ARRAY['projects'], 10),
  ('project_missing_dates', 'Open projects without planned start or finish dates',
   'Open projects missing a planned start date or a planned finish date.',
   'SELECT count(*) FROM public.projects p WHERE p.account_id = $1 AND NOT COALESCE(p.is_deleted, FALSE) AND NOT COALESCE(p.is_archived, FALSE)
      AND NOT EXISTS (SELECT 1 FROM public.project_statuses ps WHERE ps.id = p.status_id AND COALESCE(ps.is_final_status, FALSE))
      AND (p.planned_start_date IS NULL OR p.planned_end_date IS NULL)',
   ARRAY['projects'], 20),
  ('project_dates_reversed', 'Projects that finish before they start',
   'Projects whose planned finish date is before their planned start date.',
   'SELECT count(*) FROM public.projects p WHERE p.account_id = $1 AND NOT COALESCE(p.is_deleted, FALSE)
      AND p.planned_end_date < p.planned_start_date',
   ARRAY['projects'], 30),
  ('project_open_past_finish', 'Open projects more than 30 days past their planned finish',
   'Projects still open more than 30 days after their planned finish date: update the plan or close the project.',
   'SELECT count(*) FROM public.projects p WHERE p.account_id = $1 AND NOT COALESCE(p.is_deleted, FALSE) AND NOT COALESCE(p.is_archived, FALSE)
      AND NOT EXISTS (SELECT 1 FROM public.project_statuses ps WHERE ps.id = p.status_id AND COALESCE(ps.is_final_status, FALSE))
      AND p.planned_end_date < $2 - 30',
   ARRAY['projects'], 40),
  ('risk_without_owner', 'Open risks without an owner',
   'Open risks on open projects with no risk owner.',
   'SELECT count(*) FROM public.risks r JOIN public.projects p ON p.id = r.project_id
     WHERE p.account_id = $1 AND NOT COALESCE(p.is_deleted, FALSE) AND NOT COALESCE(r.is_deleted, FALSE)
       AND lower(COALESCE(r.status, '''')) NOT IN (''closed'', ''expired'', ''realized'')
       AND r.risk_owner_user_id IS NULL AND r.risk_owner_id IS NULL',
   ARRAY['risks', 'projects'], 50),
  ('issue_without_owner', 'Open issues without an owner',
   'Open issues on open projects with no owner and nobody assigned.',
   'SELECT count(*) FROM public.issues i JOIN public.projects p ON p.id = i.project_id
     WHERE p.account_id = $1 AND NOT COALESCE(p.is_deleted, FALSE) AND NOT COALESCE(i.is_deleted, FALSE)
       AND lower(COALESCE(i.status, '''')) NOT IN (''resolved'', ''closed'', ''cancelled'')
       AND i.owner_id IS NULL AND i.assigned_to_user_id IS NULL',
   ARRAY['issues', 'projects'], 60),
  ('milestone_overdue_open', 'Milestones more than 30 days overdue and not complete',
   'Milestones whose date passed more than 30 days ago and that are not marked complete.',
   'SELECT count(*) FROM public.project_milestones m JOIN public.projects p ON p.id = m.project_id
     WHERE p.account_id = $1 AND NOT COALESCE(p.is_deleted, FALSE) AND NOT COALESCE(m.is_deleted, FALSE)
       AND NOT COALESCE(m.is_completed, FALSE)
       AND lower(COALESCE(m.status, '''')) NOT IN (''achieved'', ''completed'', ''cancelled'')
       AND m.milestone_date < $2 - 30',
   ARRAY['project_milestones', 'projects'], 70)
ON CONFLICT (check_code) DO NOTHING;

INSERT INTO public.background_job_messages (message_key, title, body, description) VALUES
  ('data_quality_weekly',
   'Data check: {total} item(s) need attention',
   'This week’s data check for your organisation found:
{summary}
Open the projects and registers concerned to complete or correct them.',
   'Weekly data-quality notice for the owner and PMO Admins (only when something needs attention).')
ON CONFLICT (message_key) DO NOTHING;

-- ── 2. quality.weekly_report (3.4) ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.run_data_quality_report(p_context JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_dry      BOOLEAN := COALESCE((p_context ->> 'dry_run')::BOOLEAN, FALSE);
  a          RECORD;
  c          public.data_quality_checks;
  v_tz       TEXT;
  v_today    DATE;
  v_week     TEXT;
  v_n        INTEGER;
  v_total    INTEGER;
  v_counts   JSONB;
  v_skipped  JSONB;
  v_summary  TEXT;
  v_user     UUID;
  v_orgs     INTEGER := 0;
  v_flagged  INTEGER := 0;
  v_notified INTEGER := 0;
  v_failed   JSONB := '[]'::jsonb;
BEGIN
  FOR a IN
    SELECT acc.id FROM public.accounts acc
     WHERE NOT COALESCE(acc.is_deleted, FALSE)
       AND EXISTS (SELECT 1 FROM public.projects p WHERE p.account_id = acc.id AND NOT COALESCE(p.is_deleted, FALSE))
     ORDER BY acc.created_at
  LOOP
    v_tz := public.bj_account_time_zone(a.id);
    CONTINUE WHEN NOT public.bj_zone_due(p_context, v_tz);
    v_today := (NOW() AT TIME ZONE v_tz)::DATE;
    v_week  := to_char(v_today, 'IYYY-"W"IW');
    v_orgs  := v_orgs + 1;
    v_total := 0; v_counts := '{}'::jsonb; v_skipped := '[]'::jsonb; v_summary := '';

    FOR c IN SELECT * FROM public.data_quality_checks WHERE is_active ORDER BY sort_order, check_code LOOP
      CONTINUE WHEN cardinality(c.planner_tables) > 0 AND NOT public.bj_account_allows_tables(a.id, c.planner_tables);
      v_n := public.bj_safe_count(c.count_sql, a.id, v_today);
      IF v_n IS NULL THEN
        v_skipped := v_skipped || to_jsonb(c.check_code);
        CONTINUE;
      END IF;
      v_counts := v_counts || jsonb_build_object(c.check_code, v_n);
      IF v_n > 0 THEN
        v_total := v_total + v_n;
        v_summary := v_summary || '- ' || c.label || ': ' || v_n::TEXT || E'\n';
      END IF;
    END LOOP;
    IF jsonb_array_length(v_skipped) > 0 THEN
      v_failed := v_failed || jsonb_build_object('organisation_id', a.id, 'checks_skipped', v_skipped);
    END IF;
    IF v_total > 0 THEN v_flagged := v_flagged + 1; END IF;
    CONTINUE WHEN v_dry;

    -- once per organisation and week; the marker keeps the counts (the stored result)
    CONTINUE WHEN NOT public.bj_mark_once('quality.weekly_report', 'dq:' || a.id::TEXT || ':' || v_week, a.id,
                    jsonb_build_object('week', v_week, 'total', v_total, 'counts', v_counts, 'skipped', v_skipped));
    CONTINUE WHEN v_total = 0;
    FOREACH v_user IN ARRAY public.bj_account_admin_users(a.id) LOOP
      PERFORM public.bj_notice(v_user, 'data_quality_weekly',
                jsonb_build_object('total', v_total, 'summary', rtrim(v_summary, E'\n'), 'week', v_week),
                'reports', 'warning', FALSE, NULL, a.id, 'public', 'data_quality', NULL);
      v_notified := v_notified + 1;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('processed', v_notified, 'organisations_checked', v_orgs,
                            'organisations_with_findings', v_flagged, 'skipped_checks', v_failed, 'dry_run', v_dry);
END;
$$;

-- ── 3. backfill.global_templates (M.2) ───────────────────────────────────────
-- The reference organisation is the one with the most current Global Template copies (as v1001). Organisations
-- with fewer copies than the reference catch up; the sync is an upsert, so running it again changes nothing more.
CREATE OR REPLACE FUNCTION public.run_global_template_backfill(p_context JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
DECLARE
  v_dry     BOOLEAN := COALESCE((p_context ->> 'dry_run')::BOOLEAN, FALSE);
  v_limit   INTEGER := LEAST(GREATEST(COALESCE((p_context ->> 'limit')::INTEGER, 50), 1), 500);
  v_ref     UUID;
  v_ref_n   INTEGER;
  a         RECORD;
  v_res     JSONB;
  v_done    INTEGER := 0;
  v_behind  INTEGER;
  v_errors  JSONB := '[]'::jsonb;
BEGIN
  IF to_regprocedure('public.sync_global_templates_to_account(uuid,uuid)') IS NULL THEN
    RETURN jsonb_build_object('processed', 0, 'note', 'sync_global_templates_to_account not found (SQL v1001)');
  END IF;
  v_ref := (SELECT n.account_id FROM public.pm_template_nodes n
             WHERE n.is_system_synced AND n.is_current GROUP BY n.account_id ORDER BY count(*) DESC LIMIT 1);
  IF v_ref IS NULL THEN
    RETURN jsonb_build_object('processed', 0, 'note', 'no Global Templates have been published yet');
  END IF;
  v_ref_n := (SELECT count(*) FROM public.pm_template_nodes n
               WHERE n.account_id = v_ref AND n.is_system_synced AND n.is_current AND n.source_global_template_id IS NOT NULL);

  v_behind := (SELECT count(*) FROM public.accounts acc
                WHERE NOT COALESCE(acc.is_deleted, FALSE) AND acc.id <> v_ref
                  AND (SELECT count(*) FROM public.pm_template_nodes n
                        WHERE n.account_id = acc.id AND n.is_system_synced AND n.is_current) < v_ref_n);
  IF v_dry THEN
    RETURN jsonb_build_object('processed', 0, 'organisations_behind', v_behind, 'reference_copies', v_ref_n, 'dry_run', TRUE);
  END IF;

  FOR a IN
    SELECT acc.id FROM public.accounts acc
     WHERE NOT COALESCE(acc.is_deleted, FALSE) AND acc.id <> v_ref
       AND (SELECT count(*) FROM public.pm_template_nodes n
             WHERE n.account_id = acc.id AND n.is_system_synced AND n.is_current) < v_ref_n
     ORDER BY acc.created_at
     LIMIT v_limit
  LOOP
    BEGIN
      v_res := public.sync_global_templates_to_account(a.id, v_ref);
      v_done := v_done + 1;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors || jsonb_build_object('organisation_id', a.id, 'error', left(SQLERRM, 300));
    END;
  END LOOP;

  IF jsonb_array_length(v_errors) > 0 AND v_done = 0 THEN
    RAISE EXCEPTION 'Global Template back-fill failed for every organisation tried: %', v_errors::TEXT;
  END IF;
  RETURN jsonb_build_object('processed', v_done, 'organisations_behind', v_behind, 'reference_copies', v_ref_n,
                            'errors', v_errors, 'more_left', v_behind > v_done + jsonb_array_length(v_errors),
                            'dry_run', FALSE);
END;
$$;

-- ── 4. search.reindex (M.3) ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.run_search_reindex(p_context JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
DECLARE
  v_schema TEXT := NULLIF(p_context ->> 'schema', '');
  v_res    JSONB;
  v_total  INTEGER;
BEGIN
  IF v_schema IS NOT NULL AND v_schema NOT IN ('public', 'sim') THEN
    RAISE EXCEPTION 'schema must be public or sim';
  END IF;
  IF to_regprocedure('public.ai_search_backfill(text)') IS NULL THEN
    RETURN jsonb_build_object('processed', 0, 'note', 'ai_search_backfill not found (SQL v1277)');
  END IF;
  IF COALESCE((p_context ->> 'dry_run')::BOOLEAN, FALSE) THEN
    RETURN jsonb_build_object('processed', 0, 'dry_run', TRUE, 'note', 'would rebuild the search index for ' || COALESCE(v_schema, 'public and sim'));
  END IF;
  v_res := public.ai_search_backfill(v_schema);
  v_total := (SELECT COALESCE(sum(value::INTEGER), 0) FROM jsonb_each_text(COALESCE(v_res, '{}'::jsonb)));
  RETURN jsonb_build_object('processed', v_total, 'by_entity', v_res, 'dry_run', FALSE);
END;
$$;

-- ── 5. M.5 dry run: what belongs to one organisation (read-only) ─────────────
-- Tables in public and sim with an account_id / organisation_id column, plus public tables with a project_id
-- column (rows of the organisation's projects). A first estimate for an export or deletion request — nothing
-- is changed. Run by the owner in the SQL editor: SELECT public.organisation_data_footprint('<account id>');
CREATE OR REPLACE FUNCTION public.organisation_data_footprint(p_account_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
DECLARE
  t       RECORD;
  rec     RECORD;
  v_n     BIGINT;
  v_out   JSONB := '[]'::jsonb;
  v_total BIGINT := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE id = p_account_id) THEN
    RAISE EXCEPTION 'Organisation not found';
  END IF;
  FOR t IN
    SELECT n.nspname AS sch, c.relname AS tbl, a.attname AS col
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
     WHERE c.relkind = 'r' AND n.nspname IN ('public', 'sim')
       AND a.atttypid = 'uuid'::regtype
       AND (a.attname IN ('account_id', 'organisation_id') OR (n.nspname = 'public' AND a.attname = 'project_id'))
       AND NOT (n.nspname = 'public' AND c.relname = 'accounts')
     ORDER BY n.nspname, c.relname, a.attname
  LOOP
    v_n := NULL;
    BEGIN
      IF t.col = 'project_id' THEN
        FOR rec IN EXECUTE format('SELECT count(*) AS n FROM %I.%I x WHERE x.project_id IN (SELECT p.id FROM public.projects p WHERE p.account_id = $1)', t.sch, t.tbl)
          USING p_account_id LOOP v_n := rec.n; END LOOP;
      ELSE
        FOR rec IN EXECUTE format('SELECT count(*) AS n FROM %I.%I x WHERE x.%I = $1', t.sch, t.tbl, t.col)
          USING p_account_id LOOP v_n := rec.n; END LOOP;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_n := NULL;
    END;
    CONTINUE WHEN COALESCE(v_n, 0) = 0;
    v_total := v_total + v_n;
    v_out := v_out || jsonb_build_object('table', t.sch || '.' || t.tbl, 'by', t.col, 'rows', v_n);
  END LOOP;
  RETURN jsonb_build_object('organisation_id', p_account_id, 'rows_total', v_total, 'tables', v_out,
                            'note', 'Estimate only: rows linked through other parents (tasks of a plan, comments of a record) are not counted separately unless they carry project_id.');
END;
$$;

-- ── 6. Grants (service role only) ────────────────────────────────────────────
DO $$
DECLARE
  fn TEXT;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.run_data_quality_report(jsonb)',
    'public.run_global_template_backfill(jsonb)',
    'public.run_search_reindex(jsonb)',
    'public.organisation_data_footprint(uuid)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END $$;

-- ── 7. Catalogue rows (rule 80) ──────────────────────────────────────────────
SELECT public.background_job_register(
  p_code => 'quality.weekly_report',
  p_name => 'Weekly data check',
  p_kind => 'sql',
  p_description => 'Counts open projects without a manager or dates, owner-less risks and issues and long-overdue milestones, and tells the owner and PMO Admins once a week.',
  p_owner_system => 'platform',
  p_sql_function => 'public.run_data_quality_report',
  p_cron => '0 7 * * 1',
  p_time_basis => 'organisation',
  p_timeout_seconds => 900
);
SELECT public.background_job_register(
  p_code => 'backfill.global_templates',
  p_name => 'Global Template back-fill',
  p_kind => 'sql',
  p_description => 'Manual: gives organisations that are missing Global Template copies the current set (50 per run; run again for more).',
  p_owner_system => 'platform',
  p_sql_function => 'public.run_global_template_backfill',
  p_cron => NULL,
  p_timeout_seconds => 1800
);
SELECT public.background_job_register(
  p_code => 'search.reindex',
  p_name => 'Search re-index',
  p_kind => 'sql',
  p_description => 'Manual: rebuilds the search index from the records in Platform and Simulator; changed rows are embedded again by the AI embedding job.',
  p_owner_system => 'system',
  p_sql_function => 'public.run_search_reindex',
  p_cron => NULL,
  p_timeout_seconds => 3600
);

-- ── 8. Register the new table ────────────────────────────────────────────────
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('data_quality_checks', 'Checks counted by the weekly data-quality report, one count query per check (v1352 Slice 3)', true, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

NOTIFY pgrst, 'reload schema';

-- Checks: the new jobs and what they would do today (dry runs change nothing).
SELECT code, kind, cron, time_basis, enabled FROM public.background_jobs
 WHERE code IN ('quality.weekly_report', 'backfill.global_templates', 'search.reindex') ORDER BY code;
SELECT public.run_data_quality_report('{"dry_run": true}') AS data_quality,
       public.run_global_template_backfill('{"dry_run": true}') AS template_backfill;
