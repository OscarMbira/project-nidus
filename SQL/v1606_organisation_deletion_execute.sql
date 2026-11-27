-- =============================================================================
-- v1606 — v1358 Slice 3b: organisation deletion on day 30 — deletion record, deletion in dependency order,
--         members (D8), kept records (D6, D7), certificate (D15)
-- PRD:  projectprd/v1358_organisation_data_export_and_deletion_PRD.md (D5–D8, D13, D15)
-- Plan: projectplan/v1358_organisation_data_export_and_deletion_plan.md
-- =============================================================================
-- How a deletion runs:
--   1. The hourly job organisation.deletion_lifecycle finds locked organisations whose 30 days are over and that
--      are not on legal hold. organisation_deletion_begin writes the deletion record (who asked, approved,
--      confirmed; the tables to delete, in order; the Storage files; the members and whether each one belongs to
--      another organisation or has a Simulator record; who gets the certificate) and queues
--      organisation.deletion_execute.
--   2. The worker (handler organisation.deletion_execute) removes the Storage files, then calls
--      organisation_deletion_step again and again: each call deletes rows in batches for up to 15 seconds,
--      children before parents, and saves its place. When its own time is used up it queues itself again.
--   3. organisation_deletion_finish checks no rows are left, counts what was kept, applies D8 to the members
--      (sign-in and profile removed only for people with no other organisation and no Simulator record; the
--      others are told), anonymises the organisation row (kept, because our billing records point at it) and
--      completes the record.
--   4. The worker builds the PDF certificate, stores it in the private bucket
--      organisation-deletion-certificates (system admins read it, Admin SQL v267) and emails it to the Account
--      Owner (and the requester, if different).
-- A legal hold pauses the deletion at the next step; the lifecycle job resumes it when the hold is lifted, and
-- resumes any run that stopped.
-- Kept (per public.organisation_data_table_rules, on_delete = 'keep'): our billing records, audit and security
-- logs (their Housekeeping retention targets keep 7 years once switched on), internal job records, and the
-- deletion record itself.
-- Run after v1600–v1605; then Admin SQL v267 (ID rule, Admin views, certificate access); then the tests v1607.
-- =============================================================================

-- ── 1. Deletion record ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.organisation_deletion_records (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deletion_reference   TEXT NOT NULL DEFAULT '',
  account_id           UUID NOT NULL,
  request_id           UUID,
  request_reference    TEXT,
  status               TEXT NOT NULL DEFAULT 'deleting' CHECK (status IN ('deleting', 'completed')),
  organisation_name    TEXT NOT NULL,
  product_edition      TEXT,
  reason               TEXT,
  requested_by_name    TEXT,
  opened_by_admin      UUID,
  requested_at         TIMESTAMPTZ,
  approved_by_admin    UUID,
  approved_at          TIMESTAMPTZ,
  approval_reason      TEXT,
  confirmed_by_name    TEXT,
  confirmed_at         TIMESTAMPTZ,
  locked_at            TIMESTAMPTZ,
  due_at               TIMESTAMPTZ,
  started_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at          TIMESTAMPTZ,
  plan                 JSONB NOT NULL DEFAULT '[]'::jsonb,
  progress             JSONB NOT NULL DEFAULT '{}'::jsonb,
  tables_deleted       JSONB NOT NULL DEFAULT '[]'::jsonb,
  rows_deleted         BIGINT NOT NULL DEFAULT 0,
  kept                 JSONB NOT NULL DEFAULT '[]'::jsonb,
  files                JSONB NOT NULL DEFAULT '[]'::jsonb,
  files_total          INTEGER NOT NULL DEFAULT 0,
  files_done           INTEGER NOT NULL DEFAULT 0,
  files_failed         JSONB NOT NULL DEFAULT '[]'::jsonb,
  members              JSONB NOT NULL DEFAULT '[]'::jsonb,
  members_removed      INTEGER,
  members_kept         INTEGER,
  recipients           JSONB NOT NULL DEFAULT '[]'::jsonb,
  regional             JSONB NOT NULL DEFAULT '{}'::jsonb,
  warnings             JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_error           TEXT,
  certificate_path     TEXT,
  certificate_sent_at  TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.organisation_deletion_records IS
  'v1358 D6/D15: one row per organisation deletion — who asked, approved and confirmed, the dates, the tables and row counts deleted, what was kept and why, and the certificate. Kept after the organisation is deleted; system admins read it in Admin (SQL v267). Members and certificate recipients are cleared once used.';
CREATE UNIQUE INDEX IF NOT EXISTS uq_organisation_deletion_records_request
  ON public.organisation_deletion_records (request_id) WHERE request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_organisation_deletion_records_account
  ON public.organisation_deletion_records (account_id, created_at DESC);

ALTER TABLE public.organisation_deletion_records ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.organisation_deletion_records FROM anon, authenticated;
GRANT ALL ON public.organisation_deletion_records TO service_role;

DROP TRIGGER IF EXISTS trg_organisation_deletion_records_display_id ON public.organisation_deletion_records;
CREATE TRIGGER trg_organisation_deletion_records_display_id
  AFTER INSERT ON public.organisation_deletion_records
  FOR EACH ROW EXECUTE FUNCTION public.trg_apply_admin_display_id('public.organisation_deletion_records', 'deletion_reference');

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES ('organisation_deletion_records', 'Record of each organisation deletion: who asked, approved and confirmed, tables and rows deleted, what was kept, certificate (v1358)', TRUE, TRUE)
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, is_system_table = EXCLUDED.is_system_table, updated_at = NOW();

-- ── 2. Rules: what is kept ───────────────────────────────────────────────────
-- Internal job records stay (the deletion's own queue items live there); Housekeeping removes them by age.
INSERT INTO public.organisation_data_table_rules (table_name, include_in_export, on_delete, keep_reason, keep_days, notes) VALUES
  ('organisation_deletion_records', FALSE, 'keep', 'The deletion record (D6)', NULL, 'v1358 Slice 3b.')
ON CONFLICT (table_schema, table_name) DO UPDATE SET
  include_in_export = EXCLUDED.include_in_export, on_delete = EXCLUDED.on_delete, keep_reason = EXCLUDED.keep_reason,
  keep_days = EXCLUDED.keep_days, updated_at = NOW();
UPDATE public.organisation_data_table_rules
   SET on_delete = 'keep', keep_reason = 'Internal job records; Housekeeping removes them by age', updated_at = NOW()
 WHERE table_name IN ('background_job_queue', 'background_job_runs', 'background_job_markers');

-- ── 3. Certificates bucket (private; Admin reads through a policy in Admin SQL v267) ──
INSERT INTO storage.buckets (id, name, public) VALUES ('organisation-deletion-certificates', 'organisation-deletion-certificates', FALSE)
ON CONFLICT (id) DO UPDATE SET public = FALSE;

-- ── 4. People: other organisations, Simulator records (D8) ───────────────────
CREATE OR REPLACE FUNCTION public.organisation_person_has_other_organisation(p_user_id UUID, p_account_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  SELECT EXISTS (SELECT 1 FROM public.accounts a
                  WHERE a.owner_user_id = p_user_id AND a.id <> p_account_id AND NOT COALESCE(a.is_deleted, FALSE))
      OR EXISTS (SELECT 1 FROM public.user_roles ur
                   JOIN public.projects p ON p.id = ur.project_id
                   JOIN public.accounts a ON a.id = p.account_id
                  WHERE ur.user_id = p_user_id AND ur.is_active AND NOT COALESCE(ur.is_deleted, FALSE)
                    AND p.account_id <> p_account_id AND NOT COALESCE(a.is_deleted, FALSE))
      OR EXISTS (SELECT 1 FROM public.users u JOIN public.accounts a ON a.id = u.last_active_account_id
                  WHERE u.id = p_user_id AND a.id <> p_account_id AND NOT COALESCE(a.is_deleted, FALSE));
$$;

-- Any row in a Simulator table that belongs to this sign-in (a foreign key to auth.users, or a user_id column).
-- An error counts as "has a record", so a person is never removed on a failed check.
CREATE OR REPLACE FUNCTION public.organisation_person_has_simulator_record(p_auth_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  t   RECORD;
  x   RECORD;
  v   BOOLEAN := FALSE;
BEGIN
  IF p_auth_user_id IS NULL THEN RETURN FALSE; END IF;
  FOR t IN
    SELECT DISTINCT c.relname AS tbl, a.attname AS col
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'sim'
      JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
     WHERE c.relkind IN ('r', 'p') AND NOT c.relispartition AND a.atttypid = 'uuid'::regtype
       AND (a.attname = 'user_id'
            OR EXISTS (SELECT 1 FROM pg_constraint con
                        WHERE con.contype = 'f' AND con.conrelid = c.oid AND con.confrelid = 'auth.users'::regclass
                          AND cardinality(con.conkey) = 1 AND con.conkey[1] = a.attnum))
  LOOP
    FOR x IN EXECUTE format('SELECT EXISTS (SELECT 1 FROM sim.%I s WHERE s.%I = $1) AS e', t.tbl, t.col) USING p_auth_user_id LOOP
      v := x.e;
    END LOOP;
    IF v THEN RETURN TRUE; END IF;
  END LOOP;
  RETURN FALSE;
EXCEPTION WHEN OTHERS THEN
  RETURN TRUE;
END;
$$;

-- ── 5. Delete order ──────────────────────────────────────────────────────────
-- The tables to delete (scope minus kept tables, accounts and users), children before parents: a table that
-- holds a foreign key to another, or is found through another (its scope filter reads that table), comes first.
-- A cycle is broken at the table with the fewest waiting children; the step function sorts out the rest.
-- self_refs: nullable, non-cascading foreign keys of a table to itself (cleared before its rows are deleted).
CREATE OR REPLACE FUNCTION public.organisation_deletion_plan(p_account_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_scope JSONB;
  v_edges JSONB;
  v_left  TEXT[];
  v_ready TEXT[];
  v_order TEXT[] := ARRAY[]::TEXT[];
BEGIN
  v_scope := (
    SELECT COALESCE(jsonb_object_agg(sc.table_name, jsonb_build_object(
             'filter', sc.filter_sql, 'via', sc.via, 'depth', sc.depth,
             'kind', (SELECT c.relkind::TEXT FROM pg_class c WHERE c.oid = ('public.' || quote_ident(sc.table_name))::regclass))), '{}'::jsonb)
      FROM public.organisation_data_scope() sc
     WHERE sc.table_name NOT IN ('accounts', 'users')
       AND NOT EXISTS (SELECT 1 FROM public.organisation_data_table_rules r
                        WHERE r.table_schema = 'public' AND r.table_name = sc.table_name AND r.on_delete = 'keep'));

  v_edges := (
    SELECT COALESCE(jsonb_agg(DISTINCT jsonb_build_array(e.child, e.parent)), '[]'::jsonb)
      FROM (
        SELECT ch.relname::TEXT AS child, pa.relname::TEXT AS parent
          FROM pg_constraint con
          JOIN pg_class ch ON ch.oid = con.conrelid
          JOIN pg_namespace chn ON chn.oid = ch.relnamespace AND chn.nspname = 'public'
          JOIN pg_class pa ON pa.oid = con.confrelid
          JOIN pg_namespace pan ON pan.oid = pa.relnamespace AND pan.nspname = 'public'
         WHERE con.contype = 'f' AND ch.oid <> pa.oid
        UNION
        SELECT k.key, CASE WHEN k.value ->> 'via' = 'project_id' THEN 'projects' ELSE split_part(k.value ->> 'via', ' → ', 2) END
          FROM jsonb_each(v_scope) k
         WHERE k.value ->> 'via' = 'project_id' OR k.value ->> 'via' LIKE '% → %'
      ) e
     WHERE v_scope ? e.child AND v_scope ? e.parent AND e.child <> e.parent);

  v_left := ARRAY(SELECT k FROM jsonb_object_keys(v_scope) k ORDER BY k);
  WHILE cardinality(v_left) > 0 LOOP
    v_ready := ARRAY(SELECT t FROM unnest(v_left) t
                      WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_edges) e
                                         WHERE e ->> 1 = t AND (e ->> 0) = ANY (v_left))
                      ORDER BY t);
    IF cardinality(v_ready) = 0 THEN
      v_ready := ARRAY(SELECT t FROM unnest(v_left) t
                        ORDER BY (SELECT count(*) FROM jsonb_array_elements(v_edges) e
                                   WHERE e ->> 1 = t AND (e ->> 0) = ANY (v_left)), t
                        LIMIT 1);
    END IF;
    v_order := v_order || v_ready;
    v_left := ARRAY(SELECT t FROM unnest(v_left) t WHERE NOT (t = ANY (v_ready)) ORDER BY t);
  END LOOP;

  RETURN (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
             'table', o.t,
             'filter', v_scope -> o.t ->> 'filter',
             'kind', v_scope -> o.t ->> 'kind',
             'self_refs', (SELECT COALESCE(jsonb_agg(a.attname ORDER BY a.attname), '[]'::jsonb)
                             FROM pg_constraint con
                             JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = con.conkey[1]
                            WHERE con.contype = 'f' AND con.conrelid = con.confrelid AND cardinality(con.conkey) = 1
                              AND con.conrelid = ('public.' || quote_ident(o.t))::regclass
                              AND NOT a.attnotnull AND con.confdeltype <> 'c'))
           ORDER BY o.n), '[]'::jsonb)
      FROM unnest(v_order) WITH ORDINALITY o(t, n));
END;
$$;

-- ── 6. Begin (called by the lifecycle job for a locked organisation whose 30 days are over) ──
CREATE OR REPLACE FUNCTION public.organisation_deletion_begin(p_request_id UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  r         public.organisation_data_requests;
  v_acc     public.accounts;
  v_id      UUID;
  v_plan    JSONB;
  v_files   JSONB := '[]'::jsonb;
  v_warn    JSONB := '[]'::jsonb;
  v_ids     UUID[];
  v_members JSONB;
  v_recips  JSONB;
  f         RECORD;
  x         RECORD;
BEGIN
  v_id := (SELECT d.id FROM public.organisation_deletion_records d WHERE d.request_id = p_request_id);
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  r := (SELECT q FROM public.organisation_data_requests q WHERE q.id = p_request_id AND q.kind = 'deletion');
  IF r.id IS NULL THEN RAISE EXCEPTION 'Deletion request not found'; END IF;
  IF r.status <> 'locked' THEN RAISE EXCEPTION 'Only a locked organisation can be deleted (the request is %)', r.status; END IF;
  v_acc := (SELECT a FROM public.accounts a WHERE a.id = r.account_id);
  IF v_acc.legal_hold THEN RAISE EXCEPTION 'The organisation is on legal hold'; END IF;

  v_plan := public.organisation_deletion_plan(r.account_id);

  -- Files: registered path columns on the tables being deleted, and the organisation's own export files.
  FOR f IN
    SELECT sr.bucket_id, sr.ref_table, sr.ref_column, p.value ->> 'filter' AS filter_sql
      FROM public.storage_cleanup_references sr
      JOIN jsonb_array_elements(v_plan) p ON p.value ->> 'table' = sr.ref_table
     WHERE sr.ref_schema = 'public'
  LOOP
    BEGIN
      FOR x IN EXECUTE format(
        'SELECT DISTINCT public.storage_cleanup_normalise(q.%I::TEXT, $2) AS p FROM public.%I q WHERE %s',
        f.ref_column, f.ref_table, replace(f.filter_sql, '{a}', 'q'))
        USING r.account_id, f.bucket_id
      LOOP
        CONTINUE WHEN x.p IS NULL;
        v_files := v_files || jsonb_build_object('bucket', f.bucket_id, 'path', x.p);
      END LOOP;
    EXCEPTION WHEN OTHERS THEN
      v_warn := v_warn || jsonb_build_object('step', 'files', 'table', f.ref_table, 'column', f.ref_column, 'error', SQLERRM);
    END;
  END LOOP;
  v_files := v_files || COALESCE((
    SELECT jsonb_agg(jsonb_build_object('bucket', 'organisation-exports', 'path', ef.value ->> 'path'))
      FROM public.organisation_data_requests q, jsonb_array_elements(q.files) ef
     WHERE q.account_id = r.account_id AND q.kind = 'export' AND ef.value ->> 'path' IS NOT NULL), '[]'::jsonb);
  v_files := (SELECT COALESCE(jsonb_agg(DISTINCT e), '[]'::jsonb) FROM jsonb_array_elements(v_files) e);

  -- Export builds still open stop here (their files are removed with the rest).
  UPDATE public.organisation_data_requests
     SET status = 'failed', last_error = 'The organisation is being deleted', updated_at = NOW()
   WHERE account_id = r.account_id AND kind = 'export' AND status IN ('queued', 'building');

  -- Members now (user_roles are about to go) and those signed out at the lock.
  v_ids := ARRAY(SELECT DISTINCT m FROM unnest(public.organisation_member_user_ids(r.account_id)
                   || ARRAY(SELECT (e #>> '{}')::UUID FROM jsonb_array_elements(COALESCE(r.lock_state -> 'members', '[]'::jsonb)) e)) m
                  WHERE m IS NOT NULL);
  v_members := (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
             'user_id', u.id,
             'is_owner', u.id = v_acc.owner_user_id,
             'other_org', public.organisation_person_has_other_organisation(u.id, r.account_id),
             'simulator', public.organisation_person_has_simulator_record(u.auth_user_id))), '[]'::jsonb)
      FROM public.users u WHERE u.id = ANY (v_ids));

  -- Certificate recipients (D15): the Account Owner, and the person who asked if that is someone else.
  v_recips := (
    SELECT COALESCE(jsonb_agg(jsonb_build_object('name', COALESCE(u.display_name, u.full_name, u.email), 'email', u.email)), '[]'::jsonb)
      FROM public.users u
     WHERE u.email IS NOT NULL AND (u.id = v_acc.owner_user_id OR u.id = r.requested_by_user_id));

  v_id := gen_random_uuid();
  INSERT INTO public.organisation_deletion_records (
    id, account_id, request_id, request_reference, organisation_name, product_edition, reason,
    requested_by_name, opened_by_admin, requested_at, approved_by_admin, approved_at, approval_reason,
    confirmed_by_name, confirmed_at, locked_at, due_at, plan, files, files_total, members, recipients, regional, warnings)
  VALUES (
    v_id, r.account_id, r.id, NULLIF(r.request_reference, ''), v_acc.account_name, COALESCE(v_acc.product_edition::TEXT, 'platform'), r.reason,
    (SELECT COALESCE(u.display_name, u.full_name, u.email) FROM public.users u WHERE u.id = r.requested_by_user_id),
    r.opened_by_admin, r.created_at, r.decided_by_admin, r.decided_at, r.decision_reason,
    (SELECT COALESCE(u.display_name, u.full_name, u.email) FROM public.users u WHERE u.id = r.confirmed_by_user_id),
    r.confirmed_at, r.locked_at, r.deletion_due_at, v_plan, v_files, jsonb_array_length(v_files), v_members, v_recips,
    jsonb_build_object('time_zone', public.bj_account_time_zone(r.account_id), 'date_format', public.bj_account_date_format(r.account_id)),
    v_warn);

  UPDATE public.organisation_data_requests SET status = 'deleting', updated_at = NOW() WHERE id = r.id;
  UPDATE public.accounts SET lock_reason = 'deleting', updated_at = NOW() WHERE id = r.account_id;
  PERFORM public.enqueue_background_job('organisation.deletion_execute', jsonb_build_object('record_id', v_id),
                                        NULL, 'orgdel-exec:' || v_id::TEXT || ':0', r.account_id);
  RETURN v_id;
END;
$$;

-- ── 7. Keep what must stay ───────────────────────────────────────────────────
-- Rows that stay (kept tables, people, the organisation row) must not be removed by a cascade, nor block a
-- delete: a nullable link from them to a row being deleted is cleared first. A required (NOT NULL) link from a
-- row that stays stops the deletion with a clear message, so nothing kept is lost.
CREATE OR REPLACE FUNCTION public.organisation_deletion_protect(p_record_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  rec     public.organisation_deletion_records;
  fk      RECORD;
  x       RECORD;
  v_n     BIGINT;
  v_notes JSONB := '[]'::jsonb;
BEGIN
  rec := (SELECT d FROM public.organisation_deletion_records d WHERE d.id = p_record_id);
  FOR fk IN
    SELECT ch.relname AS child, ca.attname AS col, NOT ca.attnotnull AS nullable, pa.relname AS parent, p.value ->> 'filter' AS filter_sql
      FROM pg_constraint con
      JOIN pg_class ch ON ch.oid = con.conrelid
      JOIN pg_namespace chn ON chn.oid = ch.relnamespace AND chn.nspname = 'public'
      JOIN pg_class pa ON pa.oid = con.confrelid
      JOIN pg_namespace pan ON pan.oid = pa.relnamespace AND pan.nspname = 'public'
      JOIN pg_attribute ca ON ca.attrelid = con.conrelid AND ca.attnum = con.conkey[1]
      JOIN pg_attribute paa ON paa.attrelid = con.confrelid AND paa.attnum = con.confkey[1]
      JOIN jsonb_array_elements(rec.plan) p ON p.value ->> 'table' = pa.relname
     WHERE con.contype = 'f' AND cardinality(con.conkey) = 1 AND paa.attname = 'id' AND NOT ch.relispartition
       AND (ch.relname IN ('accounts', 'users')
            OR EXISTS (SELECT 1 FROM public.organisation_data_table_rules r
                        WHERE r.table_schema = 'public' AND r.table_name = ch.relname AND r.on_delete = 'keep'))
     ORDER BY ch.relname, ca.attname
  LOOP
    IF fk.nullable THEN
      EXECUTE format('UPDATE public.%I k SET %I = NULL WHERE k.%I IN (SELECT q0.id FROM public.%I q0 WHERE %s)',
                     fk.child, fk.col, fk.col, fk.parent, replace(fk.filter_sql, '{a}', 'q0'))
        USING rec.account_id;
      GET DIAGNOSTICS v_n = ROW_COUNT;
      IF v_n > 0 THEN
        v_notes := v_notes || jsonb_build_object('step', 'kept rows unlinked', 'table', fk.child, 'column', fk.col, 'rows', v_n);
      END IF;
    ELSE
      v_n := 0;
      FOR x IN EXECUTE format('SELECT count(*)::BIGINT AS n FROM public.%I k WHERE k.%I IN (SELECT q0.id FROM public.%I q0 WHERE %s)',
                              fk.child, fk.col, fk.parent, replace(fk.filter_sql, '{a}', 'q0'))
        USING rec.account_id LOOP v_n := x.n; END LOOP;
      IF v_n > 0 THEN
        RAISE EXCEPTION 'Cannot delete %: % row(s) of % must be kept but need it (column %). Clear that link first.',
          fk.parent, v_n, fk.child, fk.col;
      END IF;
    END IF;
  END LOOP;
  RETURN v_notes;
END;
$$;

-- When a pass deletes nothing because of foreign keys: clear nullable, non-cascading links that point at the
-- rows still to delete (from any public table), so the next pass can go on.
CREATE OR REPLACE FUNCTION public.organisation_deletion_unlink(p_record_id UUID, p_tables TEXT[])
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  rec  public.organisation_deletion_records;
  fk   RECORD;
  v_n  BIGINT;
  v_k  INTEGER := 0;
BEGIN
  rec := (SELECT d FROM public.organisation_deletion_records d WHERE d.id = p_record_id);
  FOR fk IN
    SELECT ch.relname AS child, ca.attname AS col, pa.relname AS parent, p.value ->> 'filter' AS filter_sql
      FROM pg_constraint con
      JOIN pg_class ch ON ch.oid = con.conrelid
      JOIN pg_namespace chn ON chn.oid = ch.relnamespace AND chn.nspname = 'public'
      JOIN pg_class pa ON pa.oid = con.confrelid
      JOIN pg_namespace pan ON pan.oid = pa.relnamespace AND pan.nspname = 'public'
      JOIN pg_attribute ca ON ca.attrelid = con.conrelid AND ca.attnum = con.conkey[1]
      JOIN pg_attribute paa ON paa.attrelid = con.confrelid AND paa.attnum = con.confkey[1]
      JOIN jsonb_array_elements(rec.plan) p ON p.value ->> 'table' = pa.relname
     WHERE con.contype = 'f' AND cardinality(con.conkey) = 1 AND paa.attname = 'id' AND NOT ch.relispartition
       AND con.confdeltype IN ('a', 'r') AND NOT ca.attnotnull AND pa.relname = ANY (p_tables)
  LOOP
    BEGIN
      EXECUTE format('UPDATE public.%I k SET %I = NULL WHERE k.%I IN (SELECT q0.id FROM public.%I q0 WHERE %s)',
                     fk.child, fk.col, fk.col, fk.parent, replace(fk.filter_sql, '{a}', 'q0'))
        USING rec.account_id;
      GET DIAGNOSTICS v_n = ROW_COUNT;
      IF v_n > 0 THEN v_k := v_k + 1; END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
  RETURN v_k;
END;
$$;

-- ── 8. One step: delete in batches for up to p_budget_ms, save the place ─────
-- Returns {done} when every table is empty, {held} on legal hold, {stalled, errors} when nothing more can be
-- deleted (the worker reports the error; the queue retries; Admin is alerted when it gives up).
CREATE OR REPLACE FUNCTION public.organisation_deletion_step(p_record_id UUID, p_budget_ms INTEGER DEFAULT 15000)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  rec       public.organisation_deletion_records;
  v_start   TIMESTAMPTZ := clock_timestamp();
  v_budget  INTERVAL := make_interval(secs => GREATEST(LEAST(COALESCE(p_budget_ms, 15000), 60000), 1000) / 1000.0);
  v_batch   CONSTANT INTEGER := 2000;
  v_prog    JSONB;
  v_entry   JSONB;
  v_name    TEXT;
  v_where   TEXT;
  v_sql     TEXT;
  v_col     TEXT;
  v_n       BIGINT;
  v_moved   BIGINT;
  v_total   BIGINT := 0;
  v_waiting TEXT[];
  v_errors  JSONB;
  v_relaxed BOOLEAN;
  v_out     BOOLEAN := FALSE;
  v_stalled BOOLEAN := FALSE;
  t         RECORD;
BEGIN
  PERFORM 1 FROM public.organisation_deletion_records d WHERE d.id = p_record_id FOR UPDATE;
  rec := (SELECT d FROM public.organisation_deletion_records d WHERE d.id = p_record_id);
  IF rec.id IS NULL THEN RETURN jsonb_build_object('skip', 'deletion record not found'); END IF;
  IF rec.status <> 'deleting' THEN RETURN jsonb_build_object('done', TRUE, 'status', rec.status); END IF;
  IF (SELECT a.legal_hold FROM public.accounts a WHERE a.id = rec.account_id) THEN
    RETURN jsonb_build_object('held', TRUE);
  END IF;

  v_prog := rec.progress;
  IF NOT COALESCE((v_prog ->> '_protected')::BOOLEAN, FALSE) THEN
    v_errors := public.organisation_deletion_protect(rec.id);
    v_prog := v_prog || jsonb_build_object('_protected', TRUE);
    IF jsonb_array_length(v_errors) > 0 THEN
      UPDATE public.organisation_deletion_records SET warnings = warnings || v_errors WHERE id = rec.id;
    END IF;
  END IF;
  v_relaxed := COALESCE((v_prog ->> '_relaxed')::BOOLEAN, FALSE);

  <<passes>>
  LOOP
    v_moved := 0;
    v_waiting := ARRAY[]::TEXT[];
    v_errors := '{}'::jsonb;
    FOR t IN SELECT e.value AS entry FROM jsonb_array_elements(rec.plan) WITH ORDINALITY e(value, n) ORDER BY e.n LOOP
      v_name := t.entry ->> 'table';
      v_entry := COALESCE(v_prog -> v_name, '{}'::jsonb);
      CONTINUE WHEN COALESCE((v_entry ->> 'done')::BOOLEAN, FALSE);
      IF to_regclass('public.' || quote_ident(v_name)) IS NULL THEN
        v_prog := v_prog || jsonb_build_object(v_name, v_entry || jsonb_build_object('done', TRUE));
        CONTINUE;
      END IF;
      IF v_out OR clock_timestamp() - v_start > v_budget THEN
        v_out := TRUE;
        v_waiting := v_waiting || v_name;
        CONTINUE;
      END IF;
      v_where := replace(t.entry ->> 'filter', '{a}', 'x');

      IF jsonb_array_length(COALESCE(t.entry -> 'self_refs', '[]'::jsonb)) > 0 AND NOT COALESCE((v_entry ->> 'unlinked')::BOOLEAN, FALSE) THEN
        BEGIN
          FOR v_col IN SELECT jsonb_array_elements_text(t.entry -> 'self_refs') LOOP
            EXECUTE format('UPDATE public.%I x SET %I = NULL WHERE x.%I IS NOT NULL AND (%s)', v_name, v_col, v_col, v_where)
              USING rec.account_id;
          END LOOP;
          v_entry := v_entry || jsonb_build_object('unlinked', TRUE);
        EXCEPTION WHEN OTHERS THEN
          v_errors := v_errors || jsonb_build_object(v_name, SQLERRM);
        END;
      END IF;

      v_sql := CASE WHEN t.entry ->> 'kind' = 'p'
        THEN format('DELETE FROM public.%I d WHERE (d.tableoid, d.ctid) IN (SELECT x.tableoid, x.ctid FROM public.%I x WHERE %s LIMIT %s)',
                    v_name, v_name, v_where, v_batch)
        ELSE format('DELETE FROM public.%I d WHERE d.ctid = ANY (ARRAY(SELECT x.ctid FROM public.%I x WHERE %s LIMIT %s))',
                    v_name, v_name, v_where, v_batch) END;
      LOOP
        IF clock_timestamp() - v_start > v_budget THEN v_out := TRUE; EXIT; END IF;
        BEGIN
          EXECUTE v_sql USING rec.account_id;
          GET DIAGNOSTICS v_n = ROW_COUNT;
        EXCEPTION WHEN OTHERS THEN
          v_errors := v_errors || jsonb_build_object(v_name, SQLERRM);
          EXIT;
        END;
        v_moved := v_moved + v_n;
        v_total := v_total + v_n;
        v_entry := v_entry || jsonb_build_object('deleted', COALESCE((v_entry ->> 'deleted')::BIGINT, 0) + v_n);
        IF v_n < v_batch THEN
          v_entry := v_entry || jsonb_build_object('done', TRUE);
          EXIT;
        END IF;
      END LOOP;
      v_prog := v_prog || jsonb_build_object(v_name, v_entry);
      IF NOT COALESCE((v_entry ->> 'done')::BOOLEAN, FALSE) THEN v_waiting := v_waiting || v_name; END IF;
    END LOOP;

    EXIT passes WHEN v_out OR cardinality(v_waiting) = 0;
    IF v_moved = 0 THEN
      IF v_relaxed THEN v_stalled := TRUE; EXIT passes; END IF;
      PERFORM public.organisation_deletion_unlink(rec.id, v_waiting);
      v_relaxed := TRUE;
    END IF;
  END LOOP;

  UPDATE public.organisation_deletion_records
     SET progress = v_prog || jsonb_build_object('_relaxed', v_relaxed),
         rows_deleted = (SELECT COALESCE(sum((v.value ->> 'deleted')::BIGINT), 0) FROM jsonb_each(v_prog) v
                          WHERE jsonb_typeof(v.value) = 'object'),
         last_error = CASE WHEN v_stalled
                           THEN 'The deletion cannot go on: ' || (SELECT string_agg(e.key || ': ' || (e.value #>> '{}'), '; ' ORDER BY e.key)
                                                                   FROM jsonb_each(v_errors) e)
                           ELSE NULL END,
         updated_at = NOW()
   WHERE id = rec.id;

  RETURN jsonb_build_object('done', cardinality(v_waiting) = 0 AND NOT v_out, 'deleted', v_total,
                            'tables_left', cardinality(v_waiting), 'stalled', v_stalled, 'errors', v_errors);
END;
$$;

-- ── 9. Worker context, files, errors ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.organisation_deletion_context(p_record_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  rec public.organisation_deletion_records;
BEGIN
  rec := (SELECT d FROM public.organisation_deletion_records d WHERE d.id = p_record_id);
  IF rec.id IS NULL THEN RETURN jsonb_build_object('skip', 'deletion record not found'); END IF;
  IF rec.status = 'completed' AND rec.certificate_sent_at IS NOT NULL THEN
    RETURN jsonb_build_object('skip', 'deletion and certificate already done');
  END IF;
  RETURN jsonb_build_object(
    'id', rec.id,
    'status', rec.status,
    'account_id', rec.account_id,
    'reference', COALESCE(NULLIF(rec.deletion_reference, ''), 'deletion'),
    'held', COALESCE((SELECT a.legal_hold FROM public.accounts a WHERE a.id = rec.account_id), FALSE),
    'files_total', rec.files_total,
    'files_done', rec.files_done,
    'next_files', (SELECT COALESCE(jsonb_agg(f.value ORDER BY f.n), '[]'::jsonb)
                     FROM jsonb_array_elements(rec.files) WITH ORDINALITY f(value, n)
                    WHERE f.n > rec.files_done AND f.n <= rec.files_done + 500),
    'certificate', CASE WHEN rec.status = 'completed' THEN public.organisation_deletion_certificate_data(rec.id) END);
END;
$$;

-- The worker removed p_count more files (p_failed: those Storage refused, kept for the record).
CREATE OR REPLACE FUNCTION public.organisation_deletion_files_done(p_record_id UUID, p_count INTEGER, p_failed JSONB DEFAULT '[]'::jsonb)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_done INTEGER;
  v_total INTEGER;
BEGIN
  UPDATE public.organisation_deletion_records
     SET files_done = LEAST(files_total, files_done + GREATEST(COALESCE(p_count, 0), 0)),
         files_failed = files_failed || COALESCE(p_failed, '[]'::jsonb),
         updated_at = NOW()
   WHERE id = p_record_id AND status = 'deleting';
  v_done := (SELECT d.files_done FROM public.organisation_deletion_records d WHERE d.id = p_record_id);
  v_total := (SELECT d.files_total FROM public.organisation_deletion_records d WHERE d.id = p_record_id);
  RETURN jsonb_build_object('files_done', v_done, 'files_total', v_total);
END;
$$;

CREATE OR REPLACE FUNCTION public.organisation_deletion_note_error(p_record_id UUID, p_error TEXT)
RETURNS VOID
LANGUAGE sql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  UPDATE public.organisation_deletion_records SET last_error = left(p_error, 2000), updated_at = NOW() WHERE id = p_record_id;
$$;

-- ── 10. People and the organisation row ──────────────────────────────────────
-- D8: a person with no other organisation and no Simulator record. Their profile is anonymised (it stays,
-- because kept logs and billing rows point at it) and their sign-in is deleted. If the sign-in cannot be
-- deleted it is blocked instead, and the reason returned.
CREATE OR REPLACE FUNCTION public.organisation_deletion_remove_person(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_auth   UUID := (SELECT u.auth_user_id FROM public.users u WHERE u.id = p_user_id);
  v_set    TEXT;
  v_signin  TEXT := 'none';
  v_profile TEXT;
BEGIN
  v_set := (
    SELECT string_agg(CASE
             WHEN c.column_name = 'email' THEN format('%I = %L', c.column_name, 'deleted-' || p_user_id::TEXT || '@deleted.example')
             WHEN c.column_name IN ('full_name', 'display_name', 'first_name', 'last_name', 'name') THEN format('%I = %L', c.column_name, 'Deleted user')
             WHEN c.column_name = 'is_active' THEN 'is_active = FALSE'
             WHEN c.column_name = 'is_deleted' THEN 'is_deleted = TRUE'
             WHEN c.column_name = 'deleted_at' THEN 'deleted_at = NOW()'
             ELSE format('%I = NULL', c.column_name) END, ', ')
      FROM information_schema.columns c
     WHERE c.table_schema = 'public' AND c.table_name = 'users' AND c.column_name <> 'id'
       AND (c.column_name IN ('email', 'full_name', 'display_name', 'first_name', 'last_name', 'name', 'is_active', 'is_deleted', 'deleted_at')
            OR (c.column_name = 'auth_user_id' AND c.is_nullable = 'YES')
            OR (c.is_nullable = 'YES'
                AND c.data_type IN ('text', 'character varying', 'character', 'jsonb', 'json', 'inet', 'date', 'bytea', 'ARRAY')
                AND c.column_name !~ '(^|_)(status|type|role|edition)$')));
  BEGIN
    EXECUTE format('UPDATE public.users SET %s WHERE id = $1', v_set) USING p_user_id;
    v_profile := 'anonymised';
  EXCEPTION WHEN OTHERS THEN
    v_profile := 'partly anonymised: ' || SQLERRM;
    BEGIN
      UPDATE public.users SET email = 'deleted-' || p_user_id::TEXT || '@deleted.example' WHERE id = p_user_id;
    EXCEPTION WHEN OTHERS THEN
      v_profile := 'not anonymised: ' || SQLERRM;
    END;
  END;

  IF v_auth IS NOT NULL THEN
    BEGIN
      DELETE FROM auth.users WHERE id = v_auth;
      v_signin := 'deleted';
    EXCEPTION WHEN OTHERS THEN
      v_signin := 'blocked: ' || SQLERRM;
      BEGIN
        UPDATE auth.users SET banned_until = 'infinity'::TIMESTAMPTZ WHERE id = v_auth;
        DELETE FROM auth.sessions WHERE user_id = v_auth;
      EXCEPTION WHEN OTHERS THEN
        v_signin := 'kept: ' || SQLERRM;
      END;
    END;
  END IF;
  RETURN jsonb_build_object('user_id', p_user_id, 'sign_in', v_signin, 'profile', v_profile);
END;
$$;

-- The organisation row stays (our billing records point at it), with its name, contact and address details
-- removed. Status, type and edition columns stay, so lists still read correctly.
CREATE OR REPLACE FUNCTION public.organisation_deletion_anonymise_account(p_account_id UUID, p_reference TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_set TEXT;
BEGIN
  v_set := (
    SELECT string_agg(CASE
             WHEN c.column_name = 'account_name' THEN format('account_name = %L', 'Deleted organisation ' || p_reference)
             WHEN c.column_name = 'account_code' THEN format('account_code = %L', 'DEL-' || replace(p_account_id::TEXT, '-', ''))
             WHEN c.column_name = 'is_deleted' THEN 'is_deleted = TRUE'
             WHEN c.column_name = 'deleted_at' THEN 'deleted_at = NOW()'
             WHEN c.column_name = 'lock_reason' THEN 'lock_reason = ''deleted'''
             WHEN c.column_name = 'updated_at' THEN 'updated_at = NOW()'
             ELSE format('%I = NULL', c.column_name) END, ', ')
      FROM information_schema.columns c
     WHERE c.table_schema = 'public' AND c.table_name = 'accounts'
       AND (c.column_name IN ('account_name', 'account_code', 'is_deleted', 'deleted_at', 'lock_reason', 'updated_at')
            OR (c.is_nullable = 'YES'
                AND c.data_type IN ('text', 'character varying', 'character', 'jsonb', 'json', 'inet', 'date', 'bytea', 'ARRAY')
                AND c.column_name !~ '(^|_)(status|type|edition|currency|currency_code)$'
                AND c.column_name NOT IN ('country_code')
                AND c.column_name NOT LIKE 'legal\_hold%')));
  BEGIN
    EXECUTE format('UPDATE public.accounts SET %s WHERE id = $1', v_set) USING p_account_id;
  EXCEPTION WHEN OTHERS THEN
    UPDATE public.accounts
       SET account_name = 'Deleted organisation ' || p_reference, is_deleted = TRUE, lock_reason = 'deleted', updated_at = NOW()
     WHERE id = p_account_id;
  END;
END;
$$;

-- ── 11. Finish: check, count what was kept, members (D8), anonymise, complete ──
CREATE OR REPLACE FUNCTION public.organisation_deletion_finish(p_record_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  rec       public.organisation_deletion_records;
  t         RECORD;
  x         RECORD;
  m         JSONB;
  v_n       BIGINT;
  v_left    TEXT[] := ARRAY[]::TEXT[];
  v_kept    JSONB := '[]'::jsonb;
  v_removed INTEGER := 0;
  v_stayed  INTEGER := 0;
  v_warn    JSONB := '[]'::jsonb;
  v_res     JSONB;
  v_ref     TEXT;
  v_vars    JSONB;
BEGIN
  PERFORM 1 FROM public.organisation_deletion_records d WHERE d.id = p_record_id FOR UPDATE;
  rec := (SELECT d FROM public.organisation_deletion_records d WHERE d.id = p_record_id);
  IF rec.id IS NULL THEN RAISE EXCEPTION 'Deletion record not found'; END IF;
  IF rec.status = 'completed' THEN RETURN public.organisation_deletion_certificate_data(rec.id); END IF;
  IF rec.files_done < rec.files_total THEN RAISE EXCEPTION 'Files are still being removed (% of %)', rec.files_done, rec.files_total; END IF;
  IF (SELECT a.legal_hold FROM public.accounts a WHERE a.id = rec.account_id) THEN RAISE EXCEPTION 'The organisation is on legal hold'; END IF;
  v_ref := COALESCE(NULLIF(rec.deletion_reference, ''), rec.id::TEXT);

  -- Nothing may be left.
  FOR t IN SELECT e.value AS entry FROM jsonb_array_elements(rec.plan) e LOOP
    CONTINUE WHEN to_regclass('public.' || quote_ident(t.entry ->> 'table')) IS NULL;
    v_n := 0;
    FOR x IN EXECUTE format('SELECT count(*)::BIGINT AS n FROM public.%I x WHERE %s', t.entry ->> 'table', replace(t.entry ->> 'filter', '{a}', 'x'))
      USING rec.account_id LOOP v_n := x.n; END LOOP;
    IF v_n > 0 THEN v_left := v_left || ((t.entry ->> 'table') || ' (' || v_n || ')'); END IF;
  END LOOP;
  IF cardinality(v_left) > 0 THEN
    -- Rows came back (or a delete was skipped): those tables go back to the step function.
    UPDATE public.organisation_deletion_records d
       SET progress = d.progress || (SELECT jsonb_object_agg(split_part(l, ' (', 1),
                                              COALESCE(d.progress -> split_part(l, ' (', 1), '{}'::jsonb) || '{"done": false}'::jsonb)
                                       FROM unnest(v_left) l),
           last_error = 'Rows were still left in: ' || array_to_string(v_left, ', '), updated_at = NOW()
     WHERE d.id = rec.id;
    RETURN jsonb_build_object('retry', TRUE, 'left', to_jsonb(v_left));
  END IF;

  -- What was kept (D6, D7), with the reason.
  FOR t IN
    SELECT sc.table_name, sc.filter_sql, r.keep_reason, r.keep_days
      FROM public.organisation_data_scope() sc
      JOIN public.organisation_data_table_rules r ON r.table_schema = 'public' AND r.table_name = sc.table_name AND r.on_delete = 'keep'
     WHERE sc.table_name <> 'organisation_deletion_records'
     ORDER BY sc.table_name
  LOOP
    v_n := 0;
    BEGIN
      FOR x IN EXECUTE format('SELECT count(*)::BIGINT AS n FROM public.%I x WHERE %s', t.table_name, replace(t.filter_sql, '{a}', 'x'))
        USING rec.account_id LOOP v_n := x.n; END LOOP;
    EXCEPTION WHEN OTHERS THEN v_n := 0;
    END;
    IF v_n > 0 THEN
      v_kept := v_kept || jsonb_build_object('table', t.table_name, 'rows', v_n, 'reason', t.keep_reason, 'keep_days', t.keep_days);
    END IF;
  END LOOP;

  -- Members (D8).
  v_vars := jsonb_build_object('organisation', rec.organisation_name,
              'date', public.bj_format_date((NOW() AT TIME ZONE COALESCE(rec.regional ->> 'time_zone', 'UTC'))::DATE,
                                            COALESCE(rec.regional ->> 'date_format', public.bj_account_date_format(NULL))));
  FOR m IN SELECT e FROM jsonb_array_elements(rec.members) e LOOP
    CONTINUE WHEN NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = (m ->> 'user_id')::UUID);
    IF COALESCE((m ->> 'other_org')::BOOLEAN, TRUE) OR COALESCE((m ->> 'simulator')::BOOLEAN, TRUE) THEN
      v_stayed := v_stayed + 1;
      CONTINUE WHEN COALESCE((m ->> 'is_owner')::BOOLEAN, FALSE);
      PERFORM public.bj_notice((m ->> 'user_id')::UUID, 'organisation_deleted_member', v_vars, 'system', 'info', TRUE,
                               'orgdel-deleted-member:' || rec.id::TEXT, NULL, 'public', NULL, NULL);
    ELSE
      v_res := public.organisation_deletion_remove_person((m ->> 'user_id')::UUID);
      v_removed := v_removed + 1;
      IF v_res ->> 'sign_in' NOT IN ('deleted', 'none') OR v_res ->> 'profile' <> 'anonymised' THEN
        v_warn := v_warn || jsonb_build_object('step', 'member', 'user_id', m ->> 'user_id',
                                               'sign_in', v_res ->> 'sign_in', 'profile', v_res ->> 'profile');
      END IF;
    END IF;
  END LOOP;

  PERFORM public.organisation_deletion_anonymise_account(rec.account_id, v_ref);

  UPDATE public.organisation_deletion_records
     SET status = 'completed', finished_at = NOW(), kept = v_kept,
         tables_deleted = (SELECT COALESCE(jsonb_agg(jsonb_build_object('table', v.key, 'rows', (v.value ->> 'deleted')::BIGINT) ORDER BY v.key), '[]'::jsonb)
                             FROM jsonb_each(progress) v
                            WHERE jsonb_typeof(v.value) = 'object' AND COALESCE((v.value ->> 'deleted')::BIGINT, 0) > 0),
         rows_deleted = (SELECT COALESCE(sum((v.value ->> 'deleted')::BIGINT), 0) FROM jsonb_each(progress) v
                          WHERE jsonb_typeof(v.value) = 'object'),
         members_removed = v_removed, members_kept = v_stayed, members = '[]'::jsonb,
         files = '[]'::jsonb, warnings = warnings || v_warn, last_error = NULL, updated_at = NOW()
   WHERE id = rec.id;
  RETURN public.organisation_deletion_certificate_data(rec.id);
END;
$$;

-- ── 12. Certificate (D15) ────────────────────────────────────────────────────
-- Dates in the organisation's own date format and time zone (captured when the deletion began).
CREATE OR REPLACE FUNCTION public.organisation_deletion_certificate_data(p_record_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  rec  public.organisation_deletion_records;
  v_tz TEXT;
  v_fm TEXT;
BEGIN
  rec := (SELECT d FROM public.organisation_deletion_records d WHERE d.id = p_record_id);
  IF rec.id IS NULL THEN RETURN NULL; END IF;
  v_tz := COALESCE(rec.regional ->> 'time_zone', 'UTC');
  v_fm := COALESCE(rec.regional ->> 'date_format', public.bj_account_date_format(NULL));
  RETURN jsonb_build_object(
    'record_id', rec.id,
    'reference', COALESCE(NULLIF(rec.deletion_reference, ''), 'deletion'),
    'request_reference', rec.request_reference,
    'organisation', rec.organisation_name,
    'edition', rec.product_edition,
    'reason', rec.reason,
    'requested_by', COALESCE(rec.requested_by_name, CASE WHEN rec.opened_by_admin IS NOT NULL THEN 'Our support team, on the organisation’s behalf' END),
    'requested_on', public.bj_format_date((rec.requested_at AT TIME ZONE v_tz)::DATE, v_fm),
    'approved_on', public.bj_format_date((rec.approved_at AT TIME ZONE v_tz)::DATE, v_fm),
    'confirmed_by', rec.confirmed_by_name,
    'confirmed_on', public.bj_format_date((rec.confirmed_at AT TIME ZONE v_tz)::DATE, v_fm),
    'locked_on', public.bj_format_date((rec.locked_at AT TIME ZONE v_tz)::DATE, v_fm),
    'deleted_on', public.bj_format_date((COALESCE(rec.finished_at, NOW()) AT TIME ZONE v_tz)::DATE, v_fm),
    'tables', rec.tables_deleted,
    'table_count', jsonb_array_length(rec.tables_deleted),
    'rows_deleted', rec.rows_deleted,
    'files_removed', rec.files_total - jsonb_array_length(rec.files_failed),
    'files_not_removed', jsonb_array_length(rec.files_failed),
    'members_removed', rec.members_removed,
    'members_kept', rec.members_kept,
    'kept', rec.kept,
    'recipients', rec.recipients,
    'certificate_path', rec.certificate_path);
END;
$$;

-- The worker stored the PDF and emailed it; recipients' email addresses are not kept after that.
CREATE OR REPLACE FUNCTION public.organisation_deletion_certificate_saved(p_record_id UUID, p_path TEXT, p_sent INTEGER)
RETURNS VOID
LANGUAGE sql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  UPDATE public.organisation_deletion_records
     SET certificate_path = p_path, certificate_sent_at = NOW(),
         recipients = (SELECT COALESCE(jsonb_agg(jsonb_build_object('name', e ->> 'name', 'sent', p_sent > 0)), '[]'::jsonb)
                         FROM jsonb_array_elements(recipients) e),
         last_error = NULL, updated_at = NOW()
   WHERE id = p_record_id AND status = 'completed';
$$;

-- ── 13. Lifecycle job (replaces v1604): reminders, lapse, start and resume deletions ──
CREATE OR REPLACE FUNCTION public.run_organisation_deletion_lifecycle(p_context JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_dry      BOOLEAN := COALESCE((p_context ->> 'dry_run')::BOOLEAN, FALSE);
  r          RECORD;
  v_reminded INTEGER := 0;
  v_lapsed   INTEGER := 0;
  v_due      INTEGER := 0;
  v_started  INTEGER := 0;
  v_resumed  INTEGER := 0;
  v_held     INTEGER := 0;
  v_errors   JSONB := '[]'::jsonb;
BEGIN
  FOR r IN SELECT x.id, x.account_id, x.request_reference FROM public.organisation_data_requests x
            WHERE x.kind = 'deletion' AND x.status = 'awaiting_confirmation'
              AND x.confirm_expires_at > NOW() AND x.confirm_expires_at <= NOW() + INTERVAL '2 days'
              AND x.confirm_reminded_at IS NULL
  LOOP
    v_reminded := v_reminded + 1;
    CONTINUE WHEN v_dry;
    UPDATE public.organisation_data_requests SET confirm_reminded_at = NOW() WHERE id = r.id;
    PERFORM public.organisation_deletion_issue_token(r.id, 'reminder');
  END LOOP;

  FOR r IN SELECT x.id, x.account_id, x.request_reference FROM public.organisation_data_requests x
            WHERE x.kind = 'deletion' AND x.status = 'awaiting_confirmation' AND x.confirm_expires_at <= NOW()
  LOOP
    v_lapsed := v_lapsed + 1;
    CONTINUE WHEN v_dry;
    UPDATE public.organisation_data_requests SET status = 'lapsed', confirm_token_hash = NULL, updated_at = NOW() WHERE id = r.id;
    PERFORM public.bj_notice(public.organisation_export_owner(r.account_id), 'organisation_deletion_lapsed',
              jsonb_build_object('organisation', (SELECT a.account_name FROM public.accounts a WHERE a.id = r.account_id),
                                 'reference', COALESCE(NULLIF(r.request_reference, ''), 'deletion')),
              'system', 'info', TRUE, 'orgdel-lapsed:' || r.id::TEXT, r.account_id, 'public', 'organisation_data_request', r.id);
  END LOOP;

  -- Day 30: start the deletion (each in its own block, so one failure does not stop the others).
  FOR r IN SELECT x.id FROM public.organisation_data_requests x JOIN public.accounts a ON a.id = x.account_id
            WHERE x.kind = 'deletion' AND x.status = 'locked' AND x.deletion_due_at <= NOW() AND NOT a.legal_hold
            ORDER BY x.deletion_due_at
  LOOP
    v_due := v_due + 1;
    CONTINUE WHEN v_dry;
    BEGIN
      PERFORM public.organisation_deletion_begin(r.id);
      v_started := v_started + 1;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors || jsonb_build_object('request_id', r.id, 'error', SQLERRM);
      UPDATE public.organisation_data_requests SET last_error = left('Deletion could not start: ' || SQLERRM, 2000), updated_at = NOW()
       WHERE id = r.id;
    END;
  END LOOP;

  -- Resume a deletion (or its certificate) whose worker run stopped, or that a lifted legal hold released.
  FOR r IN SELECT d.id, d.account_id FROM public.organisation_deletion_records d JOIN public.accounts a ON a.id = d.account_id
            WHERE (d.status = 'deleting' OR (d.status = 'completed' AND d.certificate_sent_at IS NULL))
              AND NOT a.legal_hold AND d.updated_at < NOW() - INTERVAL '30 minutes'
              AND NOT EXISTS (SELECT 1 FROM public.background_job_queue q
                               WHERE q.job_code = 'organisation.deletion_execute' AND q.payload ->> 'record_id' = d.id::TEXT
                                 AND (q.status IN ('pending', 'running')
                                      OR (q.status = 'dead' AND q.updated_at > NOW() - INTERVAL '1 day')))
  LOOP
    v_resumed := v_resumed + 1;
    CONTINUE WHEN v_dry;
    PERFORM public.enqueue_background_job('organisation.deletion_execute', jsonb_build_object('record_id', r.id),
              NULL, 'orgdel-exec:' || r.id::TEXT || ':' || extract(epoch FROM clock_timestamp())::TEXT, r.account_id);
  END LOOP;

  v_held := (SELECT count(*) FROM public.organisation_data_requests x JOIN public.accounts a ON a.id = x.account_id
              WHERE x.kind = 'deletion' AND x.status IN ('locked', 'deleting') AND x.deletion_due_at <= NOW() AND a.legal_hold);

  -- A deletion that could not start keeps its error on the request (Organisation Data Requests shows it) and
  -- is tried again next hour. The run fails (so Admin is alerted) only when that undoes nothing else.
  IF jsonb_array_length(v_errors) > 0 AND v_started + v_reminded + v_lapsed = 0 THEN
    RAISE EXCEPTION 'Organisation deletion could not start: %', v_errors::TEXT;
  END IF;
  RETURN jsonb_build_object('processed', v_reminded + v_lapsed + v_started + v_resumed,
                            'reminded', v_reminded, 'lapsed', v_lapsed, 'due_for_deletion', v_due,
                            'deletions_started', v_started, 'deletions_resumed', v_resumed,
                            'paused_by_legal_hold', v_held, 'errors', v_errors, 'dry_run', v_dry);
END;
$$;

-- ── 14. Messages ─────────────────────────────────────────────────────────────
INSERT INTO public.background_job_messages (message_key, title, body, description) VALUES
  ('organisation_deletion_locked_member', '{organisation} is closing',
   'The Account Owner of {organisation} has asked for it to be deleted. You can no longer use it. Its data is deleted on {date}. If you belong to another organisation (or use the Simulator), your account stays; otherwise your sign-in is removed with it.',
   'v1358: sent to members when the organisation is locked for deletion.'),
  ('organisation_deleted_member', '{organisation} has been deleted',
   'The Account Owner asked for {organisation} to be deleted, and its data was deleted permanently on {date}. Your own account and the other organisations you belong to are not affected.',
   'v1358 Slice 3b: sent to members who keep their account (another organisation or a Simulator record) when the organisation is deleted.')
ON CONFLICT (message_key) DO UPDATE SET title = EXCLUDED.title, body = EXCLUDED.body,
  description = EXCLUDED.description, updated_at = NOW();

-- ── 15. Catalogue rows (rule 80) ─────────────────────────────────────────────
SELECT public.background_job_register(
  p_code => 'organisation.deletion_execute',
  p_name => 'Organisation deletion',
  p_kind => 'handler',
  p_description => 'v1358: deletes a locked organisation on day 30 — Storage files, rows in dependency order in batches, members (D8), the organisation row anonymised — then stores and emails the PDF deletion certificate. Resumes from its place; paused by a legal hold.',
  p_owner_system => 'platform',
  p_timeout_seconds => 300,
  p_max_attempts => 6,
  p_backoff_schedule => ARRAY[300, 900, 3600, 7200, 21600],
  p_item_ttl_seconds => 604800,
  p_batch_size => 1
);

SELECT public.background_job_register(
  p_code => 'organisation.deletion_lifecycle',
  p_name => 'Organisation deletion lifecycle',
  p_kind => 'sql',
  p_description => 'v1358: day-5 confirmation reminders and lapse after 7 days; starts the day-30 deletion of locked organisations (paused by a legal hold) and resumes any that stopped.',
  p_owner_system => 'platform',
  p_sql_function => 'public.run_organisation_deletion_lifecycle',
  p_cron => '15 * * * *',
  p_time_basis => 'utc',
  p_timeout_seconds => 300
);

-- ── 16. Grants (service role only: the lifecycle job and the worker) ─────────
DO $$
DECLARE
  fn TEXT;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.organisation_person_has_other_organisation(uuid, uuid)',
    'public.organisation_person_has_simulator_record(uuid)',
    'public.organisation_deletion_plan(uuid)',
    'public.organisation_deletion_begin(uuid)',
    'public.organisation_deletion_protect(uuid)',
    'public.organisation_deletion_unlink(uuid, text[])',
    'public.organisation_deletion_step(uuid, integer)',
    'public.organisation_deletion_context(uuid)',
    'public.organisation_deletion_files_done(uuid, integer, jsonb)',
    'public.organisation_deletion_note_error(uuid, text)',
    'public.organisation_deletion_remove_person(uuid)',
    'public.organisation_deletion_anonymise_account(uuid, text)',
    'public.organisation_deletion_finish(uuid)',
    'public.organisation_deletion_certificate_data(uuid)',
    'public.organisation_deletion_certificate_saved(uuid, text, integer)',
    'public.run_organisation_deletion_lifecycle(jsonb)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';

-- ── Check (read-only) ────────────────────────────────────────────────────────
-- The delete order for the oldest organisation (nothing is deleted), and a dry run of the lifecycle job.
SELECT jsonb_array_length(public.organisation_deletion_plan(
         (SELECT a.id FROM public.accounts a WHERE NOT COALESCE(a.is_deleted, FALSE) ORDER BY a.created_at LIMIT 1))) AS tables_to_delete_for_oldest_organisation,
       public.run_organisation_deletion_lifecycle('{"dry_run": true}'::jsonb) AS lifecycle_dry_run;
