-- ============================================================================
-- v1339: One record per project + content version history (register switches)
-- ============================================================================
-- Owner rule 2026-10-24 (PRD v1336 d.1 #9–#12): a project has at most one Data Migration Strategy
-- (an organisation has many — one per project); every save keeps the replaced values as history
-- (old → new, who, when) and only the current version is live.
--   * Switches on local_registers (v1336): one_record_per_project, versioned — on for
--     fin_migration_strategy only.
--   * local_register_records.content_version (separate from the approval module's record_version).
--   * local_register_record_versions (public + sim) — append-only (read-only to clients).
--   * BEFORE INSERT/UPDATE trigger: refuses a second live record in a project; on versioned
--     registers writes the history row and increments content_version. Status changes made by the
--     sign-off actions (v1319) are not versions — the signing history records them.
--   * Data Migration Strategy statuses: Draft → In Review → Approved ("Superseded" removed — one
--     live record per project; records still marked superseded go back to Draft).
-- Prerequisites: v1318, v1336. Idempotent.
-- ============================================================================

-- ═════════════════════════════════════════════════════════════════════════════
-- PUBLIC
-- ═════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.local_register_records ADD COLUMN IF NOT EXISTS content_version INT NOT NULL DEFAULT 1;
COMMENT ON COLUMN public.local_register_records.content_version IS
  'v1339: version of the record''s content on registers with versioned = TRUE; +1 on every save that changes title, description, status or field values (separate from the approval module''s record_version).';

CREATE TABLE IF NOT EXISTS public.local_register_record_versions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id      UUID NOT NULL REFERENCES public.local_register_records(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  changed_by     UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  changed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changes        JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT uq_lrrv_version UNIQUE (record_id, version_number)
);
CREATE INDEX IF NOT EXISTS idx_lrrv_record ON public.local_register_record_versions (record_id, version_number DESC);
COMMENT ON TABLE public.local_register_record_versions IS
  'v1339: append-only content history of versioned register records — one row per save: version_number = the version the save created, changes = { key: { old, new } } for title, description, status and each changed field.';

ALTER TABLE public.local_register_record_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.local_register_record_versions FROM anon, authenticated;
GRANT SELECT ON public.local_register_record_versions TO authenticated;
GRANT ALL ON public.local_register_record_versions TO service_role;
DROP POLICY IF EXISTS policy_lrrv_select ON public.local_register_record_versions;
CREATE POLICY policy_lrrv_select ON public.local_register_record_versions
  FOR SELECT TO authenticated
  USING (public.auth_user_can_access_local_register_record(record_id));

-- One live record per project (registers with one_record_per_project) + content versioning
-- (registers with versioned). SECURITY DEFINER so the history row is written whoever saves.
CREATE OR REPLACE FUNCTION public.local_register_record_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_reg     RECORD;
  v_changes JSONB := '{}'::jsonb;
  v_key     TEXT;
BEGIN
  SELECT lr.one_record_per_project, lr.versioned, lr.label FROM public.local_registers lr WHERE lr.id = NEW.register_id
  INTO v_reg;
  IF v_reg IS NULL THEN
    RETURN NEW;
  END IF;

  -- One live record per project.
  IF v_reg.one_record_per_project AND NEW.is_deleted = FALSE AND NEW.record_project_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.record_project_id IS DISTINCT FROM OLD.record_project_id OR OLD.is_deleted <> NEW.is_deleted) THEN
    PERFORM pg_advisory_xact_lock(hashtext(NEW.register_id::text || NEW.record_project_id::text));
    IF EXISTS (
      SELECT 1 FROM public.local_register_records r
      WHERE r.register_id = NEW.register_id AND r.record_project_id = NEW.record_project_id
        AND r.is_deleted = FALSE AND r.id <> NEW.id
    ) THEN
      RAISE EXCEPTION 'This project already has a % — open it instead.', v_reg.label USING ERRCODE = '23505';
    END IF;
  END IF;

  -- Content versioning (not for the sign-off actions' own status changes).
  IF TG_OP = 'UPDATE' AND v_reg.versioned
     AND COALESCE(current_setting('nidus.local_register_signoff', TRUE), '') <> 'on' THEN
    IF NEW.title IS DISTINCT FROM OLD.title THEN
      v_changes := v_changes || jsonb_build_object('title', jsonb_build_object('old', OLD.title, 'new', NEW.title));
    END IF;
    IF NEW.description IS DISTINCT FROM OLD.description THEN
      v_changes := v_changes || jsonb_build_object('description', jsonb_build_object('old', OLD.description, 'new', NEW.description));
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      v_changes := v_changes || jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
    END IF;
    FOR v_key IN
      SELECT k FROM jsonb_object_keys(COALESCE(OLD.field_values, '{}'::jsonb)) k
      UNION
      SELECT k FROM jsonb_object_keys(COALESCE(NEW.field_values, '{}'::jsonb)) k
    LOOP
      IF (OLD.field_values -> v_key) IS DISTINCT FROM (NEW.field_values -> v_key) THEN
        v_changes := v_changes || jsonb_build_object('fv:' || v_key,
          jsonb_build_object('old', OLD.field_values -> v_key, 'new', NEW.field_values -> v_key));
      END IF;
    END LOOP;
    IF v_changes <> '{}'::jsonb THEN
      NEW.content_version := COALESCE(OLD.content_version, 1) + 1;
      INSERT INTO public.local_register_record_versions (record_id, version_number, changed_by, changes)
      VALUES (NEW.id, NEW.content_version, (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1), v_changes);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lrr_version_rules ON public.local_register_records;
CREATE TRIGGER trg_lrr_version_rules
  BEFORE INSERT OR UPDATE ON public.local_register_records
  FOR EACH ROW
  EXECUTE FUNCTION public.local_register_record_rules();


-- ═════════════════════════════════════════════════════════════════════════════
-- SIM
-- ═════════════════════════════════════════════════════════════════════════════
ALTER TABLE sim.local_register_records ADD COLUMN IF NOT EXISTS content_version INT NOT NULL DEFAULT 1;
COMMENT ON COLUMN sim.local_register_records.content_version IS
  'v1339: version of the record''s content on registers with versioned = TRUE; +1 on every save that changes title, description, status or field values (separate from the approval module''s record_version).';

CREATE TABLE IF NOT EXISTS sim.local_register_record_versions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id      UUID NOT NULL REFERENCES sim.local_register_records(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  changed_by     UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  changed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changes        JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT uq_sim_lrrv_version UNIQUE (record_id, version_number)
);
CREATE INDEX IF NOT EXISTS idx_sim_lrrv_record ON sim.local_register_record_versions (record_id, version_number DESC);
COMMENT ON TABLE sim.local_register_record_versions IS
  'v1339: append-only content history of versioned register records — one row per save: version_number = the version the save created, changes = { key: { old, new } } for title, description, status and each changed field.';

ALTER TABLE sim.local_register_record_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON sim.local_register_record_versions FROM anon, authenticated;
GRANT SELECT ON sim.local_register_record_versions TO authenticated;
GRANT ALL ON sim.local_register_record_versions TO service_role;
DROP POLICY IF EXISTS policy_sim_lrrv_select ON sim.local_register_record_versions;
CREATE POLICY policy_sim_lrrv_select ON sim.local_register_record_versions
  FOR SELECT TO authenticated
  USING (sim.auth_user_can_access_local_register_record(record_id));

-- One live record per project (registers with one_record_per_project) + content versioning
-- (registers with versioned). SECURITY DEFINER so the history row is written whoever saves.
CREATE OR REPLACE FUNCTION sim.local_register_record_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
DECLARE
  v_reg     RECORD;
  v_changes JSONB := '{}'::jsonb;
  v_key     TEXT;
BEGIN
  SELECT lr.one_record_per_project, lr.versioned, lr.label FROM public.local_registers lr WHERE NEW.is_system_register AND lr.id = NEW.register_id
        UNION ALL
        SELECT lr.one_record_per_project, lr.versioned, lr.label FROM sim.local_registers lr WHERE NOT NEW.is_system_register AND lr.id = NEW.register_id
  INTO v_reg;
  IF v_reg IS NULL THEN
    RETURN NEW;
  END IF;

  -- One live record per project.
  IF v_reg.one_record_per_project AND NEW.is_deleted = FALSE AND NEW.record_project_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.record_project_id IS DISTINCT FROM OLD.record_project_id OR OLD.is_deleted <> NEW.is_deleted) THEN
    PERFORM pg_advisory_xact_lock(hashtext(NEW.register_id::text || NEW.record_project_id::text));
    IF EXISTS (
      SELECT 1 FROM sim.local_register_records r
      WHERE r.register_id = NEW.register_id AND r.record_project_id = NEW.record_project_id
        AND r.is_deleted = FALSE AND r.id <> NEW.id
    ) THEN
      RAISE EXCEPTION 'This project already has a % — open it instead.', v_reg.label USING ERRCODE = '23505';
    END IF;
  END IF;

  -- Content versioning (not for the sign-off actions' own status changes).
  IF TG_OP = 'UPDATE' AND v_reg.versioned
     AND COALESCE(current_setting('nidus.local_register_signoff', TRUE), '') <> 'on' THEN
    IF NEW.title IS DISTINCT FROM OLD.title THEN
      v_changes := v_changes || jsonb_build_object('title', jsonb_build_object('old', OLD.title, 'new', NEW.title));
    END IF;
    IF NEW.description IS DISTINCT FROM OLD.description THEN
      v_changes := v_changes || jsonb_build_object('description', jsonb_build_object('old', OLD.description, 'new', NEW.description));
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      v_changes := v_changes || jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
    END IF;
    FOR v_key IN
      SELECT k FROM jsonb_object_keys(COALESCE(OLD.field_values, '{}'::jsonb)) k
      UNION
      SELECT k FROM jsonb_object_keys(COALESCE(NEW.field_values, '{}'::jsonb)) k
    LOOP
      IF (OLD.field_values -> v_key) IS DISTINCT FROM (NEW.field_values -> v_key) THEN
        v_changes := v_changes || jsonb_build_object('fv:' || v_key,
          jsonb_build_object('old', OLD.field_values -> v_key, 'new', NEW.field_values -> v_key));
      END IF;
    END LOOP;
    IF v_changes <> '{}'::jsonb THEN
      NEW.content_version := COALESCE(OLD.content_version, 1) + 1;
      INSERT INTO sim.local_register_record_versions (record_id, version_number, changed_by, changes)
      VALUES (NEW.id, NEW.content_version, (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1), v_changes);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sim_lrr_version_rules ON sim.local_register_records;
CREATE TRIGGER trg_sim_lrr_version_rules
  BEFORE INSERT OR UPDATE ON sim.local_register_records
  FOR EACH ROW
  EXECUTE FUNCTION sim.local_register_record_rules();

-- ── Switch on for the Data Migration Strategy ─────────────────────────────────────────
DO $$
BEGIN
  PERFORM set_config('nidus.local_register_signoff', 'on', TRUE);
  UPDATE public.local_register_records r SET status = 'draft', updated_at = NOW()
  FROM public.local_registers lr
  WHERE lr.id = r.register_id AND lr.register_key = 'fin_migration_strategy' AND r.status = 'superseded';
  UPDATE sim.local_register_records r SET status = 'draft', updated_at = NOW()
  FROM public.local_registers lr
  WHERE r.is_system_register AND lr.id = r.register_id AND lr.register_key = 'fin_migration_strategy' AND r.status = 'superseded';
  PERFORM set_config('nidus.local_register_signoff', '', TRUE);
END $$;

UPDATE public.local_registers
SET one_record_per_project = TRUE,
    versioned = TRUE,
    status_workflow = '[{"key":"draft","label":"Draft"},{"key":"in_review","label":"In Review"},{"key":"approved","label":"Approved"}]'::jsonb,
    updated_at = NOW()
WHERE register_key = 'fin_migration_strategy';

-- Projects that already hold more than one strategy (the rule applies to new saves; tidy these by hand).
DO $$
DECLARE
  v_dupes INT;
BEGIN
  SELECT COUNT(*) INTO v_dupes FROM (
    SELECT r.record_project_id
    FROM public.local_register_records r JOIN public.local_registers lr ON lr.id = r.register_id
    WHERE lr.register_key = 'fin_migration_strategy' AND r.is_deleted = FALSE AND r.record_project_id IS NOT NULL
    GROUP BY r.record_project_id HAVING COUNT(*) > 1
  ) d;
  RAISE NOTICE 'v1339: % project(s) already hold more than one Data Migration Strategy', v_dupes;
END $$;

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES ('local_register_record_versions', 'Local Register records: append-only content version history (old → new per save) for versioned registers (v1339)', true, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

NOTIFY pgrst, 'reload schema';
