-- =============================================================================
-- v1600 — v1358 Slice 1: organisation data export (owner self-service)
-- PRD:  projectprd/v1358_organisation_data_export_and_deletion_PRD.md (D2, D3, D4)
-- Plan: projectplan/v1358_organisation_data_export_and_deletion_plan.md
-- =============================================================================
-- The Account Owner requests a full export; a background job (organisation.export_build, rule 80) writes
-- one ZIP (or a few numbered ZIP parts for large organisations) with a CSV and a JSON file per table, the
-- uploaded files, and a read-me with a data dictionary. The owner is emailed (no link) and downloads it in
-- the app; the files are removed after 7 days (organisation.export_expire).
--
--   1. public.organisation_data_table_rules  per-table rules: in the export or not, delete or keep (Slice 3),
--                                            allowed columns, extra scope (members), keep reason / period
--   2. public.organisation_data_requests     requests (export now; deletion in Slice 3), display ID
--   3. public.organisation_data_scope()       every table that holds organisation data: rows with
--                                            account_id / organisation_id / project_id, then rows linked to
--                                            those by a foreign key (up to three levels), plus rule scopes
--   4. export plan / page / files RPCs for the worker (service role only); secrets never leave
--   5. owner RPCs: request an export, list requests; private bucket + download policy
--   6. messages, catalogue rows (rule 80), menus (rules 70, 75), registry
-- Simulator is excluded (D9): practice data belongs to learners (v1108 Privacy Center).
-- After running: re-run SQL/v1251_planner_table_wall.sql; Admin SQL v264 (ID generation rule).
-- =============================================================================

-- ── 1. Per-table rules (data, not code) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.organisation_data_table_rules (
  table_schema       TEXT NOT NULL DEFAULT 'public' CHECK (table_schema = 'public'),
  table_name         TEXT NOT NULL CHECK (table_name ~ '^[a-z_][a-z0-9_]*$'),
  include_in_export  BOOLEAN NOT NULL DEFAULT TRUE,
  on_delete          TEXT NOT NULL DEFAULT 'delete' CHECK (on_delete IN ('delete', 'keep')),
  keep_reason        TEXT,
  keep_days          INTEGER CHECK (keep_days IS NULL OR keep_days BETWEEN 1 AND 36500),
  allowed_columns    TEXT[],
  scope_filter       TEXT,
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (table_schema, table_name)
);
COMMENT ON TABLE public.organisation_data_table_rules IS
  'v1358: per-table rules for organisation export / deletion. include_in_export; on_delete keep (with reason and period) or delete; allowed_columns limits a table to safe columns; scope_filter ({a} = table alias, $1 = account id) adds a table the automatic scope does not find.';

ALTER TABLE public.organisation_data_table_rules ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.organisation_data_table_rules FROM anon, authenticated;
GRANT ALL ON public.organisation_data_table_rules TO service_role;

INSERT INTO public.organisation_data_table_rules
  (table_name, include_in_export, on_delete, keep_reason, keep_days, allowed_columns, scope_filter, notes) VALUES
  ('payment_transactions', TRUE, 'keep', 'Our own billing record, kept for the tax period (D6)', 2555, NULL, NULL, NULL),
  ('platform_subscriptions', TRUE, 'keep', 'Our own billing record, kept for the tax period (D6)', 2555, NULL, NULL, NULL),
  ('audit_log', TRUE, 'keep', 'Audit log kept 7 years after deletion, system admins only (D7)', 2555, NULL, NULL, NULL),
  ('data_access_logs', TRUE, 'keep', 'Security log kept 7 years after deletion, system admins only (D7)', 2555, NULL, NULL, NULL),
  ('security_events', TRUE, 'keep', 'Security log kept 7 years after deletion, system admins only (D7)', 2555, NULL, NULL, NULL),
  ('organisation_data_requests', FALSE, 'delete', NULL, NULL, NULL, NULL, 'Requests themselves; the deletion record (Slice 3) is kept instead.'),
  ('background_job_queue', FALSE, 'delete', NULL, NULL, NULL, NULL, 'Internal job queue.'),
  ('background_job_runs', FALSE, 'delete', NULL, NULL, NULL, NULL, 'Internal job history.'),
  ('background_job_markers', FALSE, 'delete', NULL, NULL, NULL, NULL, 'Internal job markers.'),
  ('users', TRUE, 'delete', NULL, NULL,
   ARRAY['id', 'full_name', 'display_name', 'email', 'job_title', 'is_active', 'created_at'],
   '{a}.id IN (SELECT ur.user_id FROM public.user_roles ur JOIN public.projects pp ON pp.id = ur.project_id WHERE pp.account_id = $1) OR {a}.id IN (SELECT ao.owner_user_id FROM public.accounts ao WHERE ao.id = $1)',
   'People of the organisation (owner and everyone with a project role): name, email and job title only. Slice 3 applies D8 to these rows, not a plain delete.')
ON CONFLICT (table_schema, table_name) DO NOTHING;

-- ── 2. Requests ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.organisation_data_requests (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_reference     TEXT NOT NULL DEFAULT '',
  account_id            UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  kind                  TEXT NOT NULL DEFAULT 'export' CHECK (kind IN ('export')),
  status                TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'building', 'ready', 'failed', 'expired')),
  requested_by_user_id  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  plan                  JSONB,
  checkpoint            JSONB,
  files                 JSONB NOT NULL DEFAULT '[]'::jsonb,
  table_count           INTEGER,
  row_count             BIGINT,
  file_count            INTEGER,
  byte_size             BIGINT,
  last_error            TEXT,
  started_at            TIMESTAMPTZ,
  finished_at           TIMESTAMPTZ,
  expires_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.organisation_data_requests IS
  'v1358: organisation export requests (deletion requests join in Slice 3). Written only by SECURITY DEFINER functions; the Account Owner reads their own through organisation_data_requests_list().';
CREATE INDEX IF NOT EXISTS idx_organisation_data_requests_account ON public.organisation_data_requests (account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_organisation_data_requests_status ON public.organisation_data_requests (status)
  WHERE status IN ('queued', 'building', 'ready');

ALTER TABLE public.organisation_data_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.organisation_data_requests FROM anon, authenticated;
GRANT ALL ON public.organisation_data_requests TO service_role;

DROP TRIGGER IF EXISTS trg_organisation_data_requests_display_id ON public.organisation_data_requests;
CREATE TRIGGER trg_organisation_data_requests_display_id
  AFTER INSERT ON public.organisation_data_requests
  FOR EACH ROW EXECUTE FUNCTION public.trg_apply_admin_display_id('public.organisation_data_requests', 'request_reference');

-- ── 3. Scope: every table holding organisation data ──────────────────────────
-- Returns one row per table with a filter using {a} as the table alias and $1 as the account id.
-- depth 0: account_id / organisation_id / project_id columns (uuid), the accounts row, rule scopes;
-- depth 1–3: tables whose single-column foreign key points at the id of a table already in scope.
-- users is never followed as a parent (people belong to several organisations).
CREATE OR REPLACE FUNCTION public.organisation_data_scope()
RETURNS TABLE (table_schema TEXT, table_name TEXT, depth INTEGER, via TEXT, filter_sql TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_scope JSONB := '{}'::jsonb;
  t       RECORD;
  v_key   TEXT;
  v_d     INTEGER;
  v_pf    TEXT;
BEGIN
  v_scope := v_scope || jsonb_build_object('public.accounts',
               jsonb_build_object('depth', 0, 'via', 'id', 'filter', '{a}.id = $1'));

  FOR t IN
    SELECT c.relname AS tbl, a.attname AS col
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
      JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
     WHERE c.relkind IN ('r', 'p') AND NOT c.relispartition AND a.atttypid = 'uuid'::regtype
       AND a.attname IN ('account_id', 'organisation_id', 'project_id')
       AND c.relname NOT IN ('accounts', 'users')
     ORDER BY c.relname, CASE a.attname WHEN 'account_id' THEN 1 WHEN 'organisation_id' THEN 2 ELSE 3 END
  LOOP
    v_key := 'public.' || t.tbl;
    CONTINUE WHEN v_scope ? v_key;
    v_scope := v_scope || jsonb_build_object(v_key, jsonb_build_object(
      'depth', 0, 'via', t.col,
      'filter', CASE WHEN t.col = 'project_id'
                     THEN '{a}.project_id IN (SELECT p0.id FROM public.projects p0 WHERE p0.account_id = $1)'
                     ELSE format('{a}.%I = $1', t.col) END));
  END LOOP;

  FOR t IN
    SELECT r.table_name AS tbl, r.scope_filter
      FROM public.organisation_data_table_rules r
     WHERE r.scope_filter IS NOT NULL AND to_regclass('public.' || r.table_name) IS NOT NULL
  LOOP
    v_scope := v_scope || jsonb_build_object('public.' || t.tbl,
                 jsonb_build_object('depth', 0, 'via', 'rule', 'filter', t.scope_filter));
  END LOOP;

  FOR v_d IN 1..3 LOOP
    FOR t IN
      SELECT child.relname AS child, ca.attname AS col, parent.relname AS parent
        FROM pg_constraint con
        JOIN pg_class child ON child.oid = con.conrelid
        JOIN pg_namespace cn ON cn.oid = child.relnamespace AND cn.nspname = 'public'
        JOIN pg_class parent ON parent.oid = con.confrelid
        JOIN pg_namespace pn ON pn.oid = parent.relnamespace AND pn.nspname = 'public'
        JOIN pg_attribute ca ON ca.attrelid = con.conrelid AND ca.attnum = con.conkey[1]
        JOIN pg_attribute pa ON pa.attrelid = con.confrelid AND pa.attnum = con.confkey[1]
       WHERE con.contype = 'f' AND cardinality(con.conkey) = 1 AND pa.attname = 'id' AND NOT child.relispartition
         AND parent.relname <> 'users' AND child.relname <> parent.relname
       ORDER BY child.relname, ca.attname
    LOOP
      v_key := 'public.' || t.child;
      CONTINUE WHEN v_scope ? v_key;
      CONTINUE WHEN NOT (v_scope ? ('public.' || t.parent));
      CONTINUE WHEN (v_scope -> ('public.' || t.parent) ->> 'depth')::INTEGER <> v_d - 1;
      v_pf := replace(v_scope -> ('public.' || t.parent) ->> 'filter', '{a}', 'p' || v_d);
      v_scope := v_scope || jsonb_build_object(v_key, jsonb_build_object(
        'depth', v_d, 'via', t.col || ' → ' || t.parent,
        'filter', format('{a}.%I IN (SELECT p%s.id FROM public.%I p%s WHERE %s)', t.col, v_d, t.parent, v_d, v_pf)));
    END LOOP;
  END LOOP;

  RETURN QUERY
    SELECT 'public'::TEXT, substr(e.key, 8), (e.value ->> 'depth')::INTEGER, e.value ->> 'via', e.value ->> 'filter'
      FROM jsonb_each(v_scope) e
     ORDER BY 2;
END;
$$;

-- Secret-looking columns never leave the database; a rule's allowed_columns narrows a table further.
CREATE OR REPLACE FUNCTION public.organisation_export_column_allowed(p_table TEXT, p_column TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  SELECT p_column !~ '(^|_)(hash|hashed|secret|secrets|token|password|passwd|encrypted|salt|private_key|otp)(_|$)'
     AND COALESCE((SELECT p_column = ANY (r.allowed_columns) FROM public.organisation_data_table_rules r
                    WHERE r.table_schema = 'public' AND r.table_name = p_table AND r.allowed_columns IS NOT NULL), TRUE);
$$;

CREATE OR REPLACE FUNCTION public.organisation_export_clean(p_table TEXT, p_row JSONB)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  SELECT COALESCE(jsonb_object_agg(e.key, e.value), '{}'::jsonb)
    FROM jsonb_each(p_row) e
   WHERE public.organisation_export_column_allowed(p_table, e.key);
$$;

-- ── 4. Worker functions (service role only) ──────────────────────────────────
-- Plan: tables with rows (count, columns with type / nullability / description) and the Storage files the
-- rows point to. Stored on the request the first time, so a resumed run uses the same plan.
CREATE OR REPLACE FUNCTION public.organisation_export_build_plan(p_account_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  s        RECORD;
  rec      RECORD;
  f        RECORD;
  v_n      BIGINT;
  v_tables JSONB := '[]'::jsonb;
  v_files  JSONB := '[]'::jsonb;
  v_skip   JSONB := '[]'::jsonb;
  v_cols   JSONB;
  v_where  TEXT;
BEGIN
  FOR s IN
    SELECT sc.* FROM public.organisation_data_scope() sc
     WHERE NOT EXISTS (SELECT 1 FROM public.organisation_data_table_rules r
                        WHERE r.table_schema = 'public' AND r.table_name = sc.table_name AND NOT r.include_in_export)
  LOOP
    v_n := NULL;
    v_where := replace(s.filter_sql, '{a}', 'x');
    BEGIN
      FOR rec IN EXECUTE format('SELECT count(*)::BIGINT AS n FROM public.%I x WHERE %s', s.table_name, v_where)
        USING p_account_id LOOP v_n := rec.n; END LOOP;
    EXCEPTION WHEN OTHERS THEN
      v_skip := v_skip || jsonb_build_object('table', s.table_name, 'error', SQLERRM);
      CONTINUE;
    END;
    CONTINUE WHEN COALESCE(v_n, 0) = 0;
    v_cols := (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                        'name', c.column_name, 'type', c.data_type, 'nullable', c.is_nullable = 'YES',
                        'description', (SELECT col_description(pa.attrelid, pa.attnum) FROM pg_attribute pa
                                         WHERE pa.attrelid = ('public.' || quote_ident(s.table_name))::regclass
                                           AND pa.attname = c.column_name))
                      ORDER BY c.ordinal_position), '[]'::jsonb)
                 FROM information_schema.columns c
                WHERE c.table_schema = 'public' AND c.table_name = s.table_name
                  AND public.organisation_export_column_allowed(s.table_name, c.column_name));
    v_tables := v_tables || jsonb_build_object('table', s.table_name, 'rows', v_n, 'via', s.via, 'depth', s.depth,
                  'description', obj_description(('public.' || quote_ident(s.table_name))::regclass, 'pg_class'),
                  'columns', v_cols);
  END LOOP;

  -- Files: registered path columns (v1352 storage_cleanup_references) on tables in the export.
  FOR f IN
    SELECT r.bucket_id, r.ref_table, r.ref_column, sc.filter_sql
      FROM public.storage_cleanup_references r
      JOIN public.organisation_data_scope() sc ON sc.table_name = r.ref_table
     WHERE r.ref_schema = 'public'
       AND EXISTS (SELECT 1 FROM jsonb_array_elements(v_tables) t WHERE t ->> 'table' = r.ref_table)
  LOOP
    BEGIN
      FOR rec IN EXECUTE format(
        'SELECT DISTINCT public.storage_cleanup_normalise(x.%I::TEXT, $2) AS p FROM public.%I x WHERE %s',
        f.ref_column, f.ref_table, replace(f.filter_sql, '{a}', 'x'))
        USING p_account_id, f.bucket_id
      LOOP
        CONTINUE WHEN rec.p IS NULL;
        v_files := v_files || jsonb_build_object('bucket', f.bucket_id, 'path', rec.p, 'table', f.ref_table);
      END LOOP;
    EXCEPTION WHEN OTHERS THEN
      v_skip := v_skip || jsonb_build_object('table', f.ref_table, 'column', f.ref_column, 'error', SQLERRM);
    END;
  END LOOP;

  RETURN jsonb_build_object('tables', v_tables, 'files', v_files, 'skipped', v_skip);
END;
$$;

-- Starts (or resumes) a build. Returns {skip} when the request is no longer open.
CREATE OR REPLACE FUNCTION public.organisation_export_begin(p_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  r      public.organisation_data_requests;
  v_plan JSONB;
BEGIN
  r := (SELECT x FROM public.organisation_data_requests x WHERE x.id = p_request_id);
  IF r.id IS NULL THEN RETURN jsonb_build_object('skip', 'request not found'); END IF;
  IF r.status NOT IN ('queued', 'building') THEN RETURN jsonb_build_object('skip', 'request is ' || r.status); END IF;
  v_plan := r.plan;
  IF v_plan IS NULL THEN
    v_plan := public.organisation_export_build_plan(r.account_id);
    UPDATE public.organisation_data_requests
       SET plan = v_plan,
           table_count = jsonb_array_length(v_plan -> 'tables'),
           row_count = (SELECT COALESCE(sum((t ->> 'rows')::BIGINT), 0) FROM jsonb_array_elements(v_plan -> 'tables') t),
           file_count = jsonb_array_length(v_plan -> 'files')
     WHERE id = r.id;
  END IF;
  UPDATE public.organisation_data_requests
     SET status = 'building', started_at = COALESCE(started_at, NOW()), updated_at = NOW()
   WHERE id = r.id;
  RETURN jsonb_build_object(
    'request_id', r.id, 'account_id', r.account_id, 'reference', NULLIF(r.request_reference, ''),
    'organisation_name', (SELECT a.account_name FROM public.accounts a WHERE a.id = r.account_id),
    'requested_at', r.created_at, 'plan', v_plan, 'checkpoint', r.checkpoint, 'files', r.files);
END;
$$;

-- One page of a table's rows (secrets removed). p_table must be in the request's plan.
CREATE OR REPLACE FUNCTION public.organisation_export_page(p_request_id UUID, p_table TEXT, p_offset INTEGER, p_limit INTEGER)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  r       public.organisation_data_requests;
  v_f     TEXT;
  v_order TEXT;
  v_out   JSONB := '[]'::jsonb;
  rec     RECORD;
BEGIN
  r := (SELECT x FROM public.organisation_data_requests x WHERE x.id = p_request_id);
  IF r.id IS NULL OR r.status <> 'building' THEN RAISE EXCEPTION 'Export request is not being built'; END IF;
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(r.plan -> 'tables') t WHERE t ->> 'table' = p_table) THEN
    RAISE EXCEPTION 'Table % is not part of this export', p_table;
  END IF;
  v_f := (SELECT sc.filter_sql FROM public.organisation_data_scope() sc WHERE sc.table_name = p_table);
  IF v_f IS NULL THEN RAISE EXCEPTION 'Table % is no longer in the organisation scope', p_table; END IF;
  v_order := CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns c
                                WHERE c.table_schema = 'public' AND c.table_name = p_table AND c.column_name = 'id')
                  THEN 'x.id' ELSE 'x.ctid' END;
  FOR rec IN EXECUTE format(
    'SELECT COALESCE(jsonb_agg(q.j), ''[]''::jsonb) AS rows FROM (SELECT public.organisation_export_clean($4, to_jsonb(x)) AS j FROM public.%I x WHERE %s ORDER BY %s OFFSET $2 LIMIT $3) q',
    p_table, replace(v_f, '{a}', 'x'), v_order)
    USING r.account_id, GREATEST(p_offset, 0), LEAST(GREATEST(p_limit, 1), 5000), p_table
  LOOP
    v_out := rec.rows;
  END LOOP;
  RETURN v_out;
END;
$$;

CREATE OR REPLACE FUNCTION public.organisation_export_checkpoint(p_request_id UUID, p_checkpoint JSONB, p_files JSONB)
RETURNS VOID
LANGUAGE sql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  UPDATE public.organisation_data_requests
     SET checkpoint = p_checkpoint, files = COALESCE(p_files, files), last_error = NULL, updated_at = NOW()
   WHERE id = p_request_id AND status = 'building';
$$;

CREATE OR REPLACE FUNCTION public.organisation_export_note_error(p_request_id UUID, p_error TEXT)
RETURNS VOID
LANGUAGE sql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  UPDATE public.organisation_data_requests SET last_error = left(p_error, 2000), updated_at = NOW()
   WHERE id = p_request_id AND status IN ('queued', 'building');
$$;

CREATE OR REPLACE FUNCTION public.organisation_export_owner(p_account_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  SELECT a.owner_user_id FROM public.accounts a WHERE a.id = p_account_id;
$$;

CREATE OR REPLACE FUNCTION public.organisation_export_finish(p_request_id UUID, p_files JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  r      public.organisation_data_requests;
  v_exp  TIMESTAMPTZ := NOW() + INTERVAL '7 days';
  v_tz   TEXT;
BEGIN
  r := (SELECT x FROM public.organisation_data_requests x WHERE x.id = p_request_id);
  IF r.id IS NULL OR r.status <> 'building' THEN RETURN jsonb_build_object('skip', TRUE); END IF;
  UPDATE public.organisation_data_requests
     SET status = 'ready', files = COALESCE(p_files, '[]'::jsonb), checkpoint = NULL, last_error = NULL,
         byte_size = (SELECT COALESCE(sum((f ->> 'size')::BIGINT), 0) FROM jsonb_array_elements(COALESCE(p_files, '[]'::jsonb)) f),
         finished_at = NOW(), expires_at = v_exp, updated_at = NOW()
   WHERE id = r.id;
  v_tz := public.bj_account_time_zone(r.account_id);
  PERFORM public.bj_notice(public.organisation_export_owner(r.account_id), 'organisation_export_ready',
            jsonb_build_object('reference', COALESCE(NULLIF(r.request_reference, ''), 'export'),
                               'expires', public.bj_format_date((v_exp AT TIME ZONE v_tz)::DATE, public.bj_account_date_format(r.account_id))),
            'system', 'info', TRUE, 'orgexport-ready:' || r.id::TEXT, r.account_id, 'public',
            'organisation_data_request', r.id);
  RETURN jsonb_build_object('ready', TRUE, 'expires_at', v_exp);
END;
$$;

CREATE OR REPLACE FUNCTION public.organisation_export_fail(p_request_id UUID, p_error TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  r public.organisation_data_requests;
BEGIN
  r := (SELECT x FROM public.organisation_data_requests x WHERE x.id = p_request_id);
  IF r.id IS NULL OR r.status NOT IN ('queued', 'building') THEN RETURN; END IF;
  UPDATE public.organisation_data_requests
     SET status = 'failed', last_error = left(COALESCE(p_error, 'unknown error'), 2000), finished_at = NOW(), updated_at = NOW()
   WHERE id = r.id;
  PERFORM public.bj_notice(public.organisation_export_owner(r.account_id), 'organisation_export_failed',
            jsonb_build_object('reference', COALESCE(NULLIF(r.request_reference, ''), 'export')),
            'system', 'warning', TRUE, 'orgexport-failed:' || r.id::TEXT, r.account_id, 'public',
            'organisation_data_request', r.id);
END;
$$;

-- Expiry sweep (job organisation.export_expire): ready exports past their 7 days (the worker removes the
-- files, then marks them expired), and builds with no progress for 24 hours (failed, owner told).
CREATE OR REPLACE FUNCTION public.organisation_export_due_expiry()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  r       RECORD;
  v_stale INTEGER := 0;
BEGIN
  FOR r IN SELECT x.id FROM public.organisation_data_requests x
            WHERE x.status IN ('queued', 'building') AND x.updated_at < NOW() - INTERVAL '24 hours'
  LOOP
    PERFORM public.organisation_export_fail(r.id, 'The export stopped making progress for 24 hours. Please request a new export.');
    v_stale := v_stale + 1;
  END LOOP;
  RETURN jsonb_build_object(
    'stale_failed', v_stale,
    'expired', COALESCE((SELECT jsonb_agg(jsonb_build_object('request_id', x.id, 'files', x.files) ORDER BY x.expires_at)
                           FROM public.organisation_data_requests x
                          WHERE x.status = 'ready' AND x.expires_at < NOW()), '[]'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION public.organisation_export_mark_expired(p_request_id UUID)
RETURNS VOID
LANGUAGE sql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  UPDATE public.organisation_data_requests SET status = 'expired', files = '[]'::jsonb, updated_at = NOW()
   WHERE id = p_request_id AND status = 'ready';
$$;

CREATE OR REPLACE FUNCTION public.organisation_export_has_work()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  SELECT EXISTS (SELECT 1 FROM public.organisation_data_requests x
                  WHERE (x.status = 'ready' AND x.expires_at < NOW())
                     OR (x.status IN ('queued', 'building') AND x.updated_at < NOW() - INTERVAL '24 hours'));
$$;

-- ── 5. Owner functions (authenticated) ───────────────────────────────────────
-- The caller's organisation when they are its Account Owner, else NULL.
CREATE OR REPLACE FUNCTION public.organisation_data_owned_account()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  SELECT a.id FROM public.accounts a
    JOIN public.users u ON u.id = a.owner_user_id
   WHERE a.id = public.auth_user_current_account_id() AND u.auth_user_id = auth.uid()
     AND NOT COALESCE(a.is_deleted, FALSE);
$$;

CREATE OR REPLACE FUNCTION public.organisation_data_request_export()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_acc  UUID := public.organisation_data_owned_account();
  v_user UUID;
  v_id   UUID := gen_random_uuid();
BEGIN
  IF v_acc IS NULL THEN
    RAISE EXCEPTION 'Only the Account Owner can request an organisation export' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM public.organisation_data_requests x
              WHERE x.account_id = v_acc AND x.kind = 'export' AND x.status IN ('queued', 'building')) THEN
    RAISE EXCEPTION 'An export is already being prepared. You’ll get an email when it’s ready.' USING ERRCODE = 'P0001';
  END IF;
  v_user := (SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid() LIMIT 1);
  INSERT INTO public.organisation_data_requests (id, account_id, kind, status, requested_by_user_id)
  VALUES (v_id, v_acc, 'export', 'queued', v_user);
  PERFORM public.enqueue_background_job('organisation.export_build', jsonb_build_object('request_id', v_id),
                                        NULL, 'orgexport:' || v_id::TEXT || ':0', v_acc);
  RETURN jsonb_build_object('id', v_id, 'status', 'queued',
           'reference', (SELECT NULLIF(x.request_reference, '') FROM public.organisation_data_requests x WHERE x.id = v_id));
END;
$$;

CREATE OR REPLACE FUNCTION public.organisation_data_requests_list()
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  SELECT jsonb_build_object(
    'is_owner', public.organisation_data_owned_account() IS NOT NULL,
    'requests', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'id', x.id, 'reference', NULLIF(x.request_reference, ''), 'kind', x.kind, 'status', x.status,
               'requested_by', (SELECT COALESCE(u.display_name, u.full_name, u.email) FROM public.users u WHERE u.id = x.requested_by_user_id),
               'created_at', x.created_at, 'finished_at', x.finished_at, 'expires_at', x.expires_at,
               'table_count', x.table_count, 'row_count', x.row_count, 'file_count', x.file_count,
               'byte_size', x.byte_size, 'files', CASE WHEN x.status = 'ready' THEN x.files ELSE '[]'::jsonb END,
               'error', CASE WHEN x.status = 'failed' THEN x.last_error END)
             ORDER BY x.created_at DESC)
        FROM public.organisation_data_requests x
       WHERE x.account_id = public.organisation_data_owned_account()), '[]'::jsonb));
$$;

-- Private bucket; the owner may read only their own ready, unexpired export files.
-- Path layout: <account id>/<request id>/<file name>.
INSERT INTO storage.buckets (id, name, public) VALUES ('organisation-exports', 'organisation-exports', FALSE)
ON CONFLICT (id) DO UPDATE SET public = FALSE;

CREATE OR REPLACE FUNCTION public.organisation_export_can_read(p_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organisation_data_requests x
     WHERE x.account_id::TEXT = split_part(p_name, '/', 1)
       AND x.id::TEXT = split_part(p_name, '/', 2)
       AND x.status = 'ready' AND x.expires_at > NOW()
       AND x.account_id = public.organisation_data_owned_account());
$$;

DROP POLICY IF EXISTS organisation_exports_owner_read ON storage.objects;
CREATE POLICY organisation_exports_owner_read ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'organisation-exports' AND public.organisation_export_can_read(name));

-- ── 6. Grants ────────────────────────────────────────────────────────────────
DO $$
DECLARE
  fn TEXT;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.organisation_data_scope()',
    'public.organisation_export_column_allowed(text, text)',
    'public.organisation_export_clean(text, jsonb)',
    'public.organisation_export_build_plan(uuid)',
    'public.organisation_export_begin(uuid)',
    'public.organisation_export_page(uuid, text, integer, integer)',
    'public.organisation_export_checkpoint(uuid, jsonb, jsonb)',
    'public.organisation_export_note_error(uuid, text)',
    'public.organisation_export_owner(uuid)',
    'public.organisation_export_finish(uuid, jsonb)',
    'public.organisation_export_fail(uuid, text)',
    'public.organisation_export_due_expiry()',
    'public.organisation_export_mark_expired(uuid)',
    'public.organisation_export_has_work()'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
  FOREACH fn IN ARRAY ARRAY[
    'public.organisation_data_owned_account()',
    'public.organisation_data_request_export()',
    'public.organisation_data_requests_list()',
    'public.organisation_export_can_read(text)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', fn);
  END LOOP;
END $$;

-- ── 7. Messages ──────────────────────────────────────────────────────────────
INSERT INTO public.background_job_messages (message_key, title, body, description) VALUES
  ('organisation_export_ready', 'Your organisation export {reference} is ready',
   'Your organisation export {reference} is ready. Sign in and open Data export to download it. It is available until {expires}, then removed.',
   'v1358: sent to the Account Owner when an export finishes (in-app + email, no link).'),
  ('organisation_export_failed', 'Your organisation export {reference} could not be completed',
   'Your organisation export {reference} could not be completed. Please request a new export from Data export. If it fails again, contact support.',
   'v1358: sent to the Account Owner when an export fails.')
ON CONFLICT (message_key) DO UPDATE SET title = EXCLUDED.title, body = EXCLUDED.body,
  description = EXCLUDED.description, updated_at = NOW();

-- ── 8. Catalogue rows (rule 80) ──────────────────────────────────────────────
SELECT public.background_job_register(
  p_code => 'organisation.export_build',
  p_name => 'Organisation export',
  p_kind => 'handler',
  p_description => 'v1358: builds an organisation export ZIP (CSV + JSON per table, files, data dictionary) for the Account Owner. Queued by the owner’s request; resumes from its checkpoint.',
  p_owner_system => 'platform',
  p_timeout_seconds => 300,
  p_max_attempts => 5,
  p_backoff_schedule => ARRAY[60, 300, 900, 3600],
  p_item_ttl_seconds => 86400,
  p_batch_size => 1
);

SELECT public.background_job_register(
  p_code => 'organisation.export_expire',
  p_name => 'Organisation export expiry',
  p_kind => 'handler',
  p_description => 'v1358: removes organisation export files after 7 days and fails builds with no progress for 24 hours.',
  p_owner_system => 'platform',
  p_cron => '30 2 * * *',
  p_time_basis => 'utc',
  p_timeout_seconds => 300,
  p_enqueue_guard => 'public.organisation_export_has_work'
);

-- ── 9. Menus (rules 70, 75) ──────────────────────────────────────────────────
-- Platform: Account → Data export (/platform/organisation/data-export); Planner: Settings → Data export
-- (/app/settings/data). Account Owner only (the page and the functions check it again).
INSERT INTO public.menu_items (menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order,
                               methodology, menu_icon, is_active, is_visible)
SELECT 'plat_acct_data_export', 'Data export',
       'Download a full copy of the organisation’s data: every table as CSV and JSON, the uploaded files and a data dictionary (v1358).',
       '/platform/organisation/data-export', p.id, COALESCE(p.menu_level, 1) + 1, 48, 'universal', 'download', TRUE, TRUE
  FROM public.menu_items p WHERE p.menu_code = 'plat_sec_account' AND COALESCE(p.is_deleted, FALSE) = FALSE
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, menu_description = EXCLUDED.menu_description, route_path = EXCLUDED.route_path,
  parent_menu_id = EXCLUDED.parent_menu_id, menu_level = EXCLUDED.menu_level, sort_order = EXCLUDED.sort_order,
  menu_icon = EXCLUDED.menu_icon, is_active = TRUE, is_visible = TRUE, is_deleted = FALSE, updated_at = NOW();

INSERT INTO public.menu_items (menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order,
                               menu_icon, is_active, is_visible)
SELECT 'pln_settings_data_export', 'Data export',
       'Project Planner (v1358): download a full copy of the organisation’s data.',
       '/app/settings/data', p.id, 2, 40, 'download', TRUE, TRUE
  FROM public.menu_items p WHERE p.menu_code = 'pln_settings' AND COALESCE(p.is_deleted, FALSE) = FALSE
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, menu_description = EXCLUDED.menu_description, route_path = EXCLUDED.route_path,
  parent_menu_id = EXCLUDED.parent_menu_id, menu_level = EXCLUDED.menu_level, sort_order = EXCLUDED.sort_order,
  menu_icon = EXCLUDED.menu_icon, is_active = TRUE, is_visible = TRUE, is_deleted = FALSE, updated_at = NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
  FROM public.menu_items mi
  JOIN public.roles r ON r.role_name = 'account_owner' AND r.account_id IS NULL AND COALESCE(r.is_deleted, FALSE) = FALSE
 WHERE mi.menu_code IN ('plat_acct_data_export', 'pln_settings_data_export') AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

INSERT INTO public.planner_menu_allowlist (menu_item_id, menu_code)
SELECT id, menu_code FROM public.menu_items WHERE menu_code = 'pln_settings_data_export' AND COALESCE(is_deleted, FALSE) = FALSE
ON CONFLICT (menu_item_id) DO NOTHING;

-- Placement safety net (rule 75): the Account parent is placed in the organisation section.
UPDATE public.menu_items SET default_section_code = 'organisation'
 WHERE menu_code = 'plat_acct_data_export' AND default_section_code IS DISTINCT FROM 'organisation';

-- ── 10. Registry (Database Table Registration Rule) ──────────────────────────
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active) VALUES
  ('organisation_data_requests', 'Organisation data export (and later deletion) requests by the Account Owner (v1358)', FALSE, TRUE),
  ('organisation_data_table_rules', 'Per-table rules for organisation export / deletion: export, keep or delete, safe columns (v1358)', TRUE, TRUE)
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table, updated_at = NOW();

-- ── Check (read-only) ────────────────────────────────────────────────────────
SELECT (SELECT count(*) FROM public.organisation_data_scope()) AS tables_in_scope,
       (SELECT count(*) FROM public.organisation_data_scope() WHERE depth > 0) AS linked_by_foreign_key,
       (SELECT count(*) FROM public.menu_items WHERE menu_code IN ('plat_acct_data_export', 'pln_settings_data_export')) AS menu_rows,
       (SELECT count(*) FROM public.background_jobs WHERE code LIKE 'organisation.export%') AS jobs;
