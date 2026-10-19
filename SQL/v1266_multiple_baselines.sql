-- ============================================================================
-- v1266 (feature v1265, step S2): multiple schedule baselines (B0, B1, …) with one active baseline, approval, and a
-- project status date for Planned % complete.
-- PRD: projectprd/v1265_plan_sheet_and_task_classification_PRD.md (stories 14–18, 36–42; D6, D16–D18)
-- Plan: projectplan/v1265_plan_sheet_and_task_classification_plan.md (S2). Run after v1265 S1. Idempotent.
--
--   project_baselines (+ sim twin):
--     baseline_number     0 = original (B0), 1, 2 … per project, schedule baselines only (trigger)
--     reason              why the plan was re-baselined (required from B1 in the Baselines tab)
--     change_request_ref  optional change request reference (e.g. CR-0012)
--     approval_notes      the approver's justification (rule 53); approval itself reuses the
--                         existing approved_by / approval_date (also used by Planning > Baselines)
--     is_active_baseline  exactly one per project (partial unique index); drives Planned %, Variance,
--                         baseline bars and the task form via tasks.baseline_* (copied on activation)
--   projects.status_date / sim.practice_projects.status_date   reporting cut-off (NULL = today)
--
--   RPCs (access-checked, SECURITY DEFINER):
--     public.approve_schedule_baseline(id, notes)   sim.approve_schedule_baseline(id, notes)
--     public.activate_schedule_baseline(id)        sim.activate_schedule_baseline(id)
--     public.set_project_status_date(project, date)  sim.set_practice_project_status_date(project, date)
-- ============================================================================

-- ── Columns ─────────────────────────────────────────────────────────────────
DO $$
DECLARE s TEXT;
BEGIN
  FOREACH s IN ARRAY ARRAY['public', 'sim'] LOOP
    EXECUTE format('ALTER TABLE %I.project_baselines ADD COLUMN IF NOT EXISTS baseline_number INTEGER', s);
    EXECUTE format('ALTER TABLE %I.project_baselines ADD COLUMN IF NOT EXISTS reason TEXT', s);
    EXECUTE format('ALTER TABLE %I.project_baselines ADD COLUMN IF NOT EXISTS change_request_ref TEXT', s);
    EXECUTE format('ALTER TABLE %I.project_baselines ADD COLUMN IF NOT EXISTS approval_notes TEXT', s);
    EXECUTE format('ALTER TABLE %I.project_baselines ADD COLUMN IF NOT EXISTS is_active_baseline BOOLEAN NOT NULL DEFAULT FALSE', s);
    -- present on the original table; added only if a database has the other shape
    EXECUTE format('ALTER TABLE %I.project_baselines ADD COLUMN IF NOT EXISTS approved_by UUID', s);
    EXECUTE format('ALTER TABLE %I.project_baselines ADD COLUMN IF NOT EXISTS approval_date TIMESTAMPTZ', s);
    EXECUTE format('ALTER TABLE %I.project_baselines ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE', s);
    EXECUTE format('ALTER TABLE %I.project_baselines ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()', s);
    -- The table has an updated_at trigger (set_pmis_updated_at, v644) but the original table had
    -- no updated_at column, so every UPDATE failed (42703). Add it.
    EXECUTE format('ALTER TABLE %I.project_baselines ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()', s);
    BEGIN
      EXECUTE format('ALTER TABLE %I.project_baselines ADD CONSTRAINT project_baselines_text_len CHECK (
        (reason IS NULL OR length(reason) <= 1000) AND (change_request_ref IS NULL OR length(change_request_ref) <= 50)
        AND (approval_notes IS NULL OR length(approval_notes) <= 1000))', s);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;

-- One active baseline per project.
CREATE UNIQUE INDEX IF NOT EXISTS uq_public_project_baselines_active ON public.project_baselines (project_id) WHERE is_active_baseline AND NOT is_deleted;
CREATE UNIQUE INDEX IF NOT EXISTS uq_sim_project_baselines_active ON sim.project_baselines (practice_project_id) WHERE is_active_baseline AND NOT is_deleted;

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS status_date DATE;
ALTER TABLE sim.practice_projects ADD COLUMN IF NOT EXISTS status_date DATE;
COMMENT ON COLUMN public.projects.status_date IS 'v1265: reporting cut-off for Planned % complete (NULL = today).';
COMMENT ON COLUMN public.project_baselines.is_active_baseline IS 'v1265: the one baseline that Planned %, Variance and baseline bars compare against.';

-- ── Numbering trigger (schedule baselines only; B0 is approved automatically) ─
CREATE OR REPLACE FUNCTION public.planning_number_schedule_baseline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sim
AS $$
DECLARE
  v_fk TEXT := CASE WHEN TG_TABLE_SCHEMA = 'sim' THEN 'practice_project_id' ELSE 'project_id' END;
  v_project UUID := (to_jsonb(NEW)->>v_fk)::uuid;
  v_next INT;
BEGIN
  IF COALESCE(NEW.baseline_type, 'schedule') <> 'schedule' OR NEW.baseline_number IS NOT NULL THEN
    RETURN NEW;
  END IF;
  EXECUTE format('SELECT COALESCE(MAX(baseline_number) + 1, 0) FROM %I.project_baselines
                   WHERE %I = $1 AND COALESCE(baseline_type, ''schedule'') = ''schedule'' AND NOT COALESCE(is_deleted, FALSE)',
                 TG_TABLE_SCHEMA, v_fk)
    INTO v_next USING v_project;
  NEW.baseline_number := v_next;
  IF v_next = 0 AND NEW.approval_date IS NULL THEN
    NEW.approval_date := NOW();
    NEW.approved_by := COALESCE(NEW.approved_by, NEW.created_by);
    NEW.approval_notes := COALESCE(NEW.approval_notes, 'Original baseline (B0).');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_public_number_schedule_baseline ON public.project_baselines;
CREATE TRIGGER trg_public_number_schedule_baseline BEFORE INSERT ON public.project_baselines
  FOR EACH ROW EXECUTE FUNCTION public.planning_number_schedule_baseline();
DROP TRIGGER IF EXISTS trg_sim_number_schedule_baseline ON sim.project_baselines;
CREATE TRIGGER trg_sim_number_schedule_baseline BEFORE INSERT ON sim.project_baselines
  FOR EACH ROW EXECUTE FUNCTION public.planning_number_schedule_baseline();

-- ── Backfill existing schedule baselines ─────────────────────────────────────
-- Numbered by date; the latest becomes active (and approved if it was not), matching what the
-- tasks' baseline dates already show.
DO $$
DECLARE s TEXT; fk TEXT;
BEGIN
  FOREACH s IN ARRAY ARRAY['public', 'sim'] LOOP
    fk := CASE WHEN s = 'sim' THEN 'practice_project_id' ELSE 'project_id' END;
    EXECUTE format(
      'UPDATE %1$I.project_baselines b SET baseline_number = o.n
         FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY %2$I ORDER BY created_at, id) - 1 AS n
                 FROM %1$I.project_baselines
                WHERE COALESCE(baseline_type, ''schedule'') = ''schedule'' AND NOT COALESCE(is_deleted, FALSE)) o
        WHERE b.id = o.id AND b.baseline_number IS NULL', s, fk);
    EXECUTE format(
      'UPDATE %1$I.project_baselines b SET
          is_active_baseline = TRUE,
          approval_date  = COALESCE(b.approval_date, NOW()),
          approval_notes = COALESCE(b.approval_notes, ''Approved automatically when multiple baselines were introduced (v1265).'')
         FROM (SELECT DISTINCT ON (%2$I) id FROM %1$I.project_baselines
                WHERE COALESCE(baseline_type, ''schedule'') = ''schedule'' AND NOT COALESCE(is_deleted, FALSE)
                ORDER BY %2$I, baseline_number DESC) latest
        WHERE b.id = latest.id
          AND NOT EXISTS (SELECT 1 FROM %1$I.project_baselines a WHERE a.%2$I = b.%2$I AND a.is_active_baseline AND NOT COALESCE(a.is_deleted, FALSE))',
      s, fk);
  END LOOP;
END $$;

-- ── Shared implementations (schema-agnostic) ────────────────────────────────
CREATE OR REPLACE FUNCTION public.planning_current_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1), auth.uid());
$$;

-- Returns the baseline's project id, or raises when it does not exist.
CREATE OR REPLACE FUNCTION public.planning_baseline_project(p_schema TEXT, p_baseline_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, sim
AS $$
DECLARE
  v_fk TEXT := CASE WHEN p_schema = 'sim' THEN 'practice_project_id' ELSE 'project_id' END;
  v_project UUID;
BEGIN
  IF p_schema NOT IN ('public', 'sim') THEN RAISE EXCEPTION 'Unknown schema %', p_schema; END IF;
  EXECUTE format('SELECT %I FROM %I.project_baselines WHERE id = $1 AND NOT COALESCE(is_deleted, FALSE)', v_fk, p_schema)
    INTO v_project USING p_baseline_id;
  IF v_project IS NULL THEN RAISE EXCEPTION 'Baseline not found'; END IF;
  RETURN v_project;
END;
$$;

CREATE OR REPLACE FUNCTION public.planning_approve_baseline_impl(p_schema TEXT, p_baseline_id UUID, p_notes TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sim
AS $$
DECLARE
  v_notes TEXT := btrim(COALESCE(p_notes, ''));
  v_row JSONB;
BEGIN
  IF v_notes = '' THEN RAISE EXCEPTION 'Write why you are approving this baseline.'; END IF;
  IF length(v_notes) > 1000 THEN RAISE EXCEPTION 'The approval note can be up to 1,000 characters.'; END IF;
  EXECUTE format('UPDATE %I.project_baselines SET approved_by = $2, approval_date = NOW(), approval_notes = $3
                   WHERE id = $1 RETURNING to_jsonb(project_baselines.*)', p_schema)
    INTO v_row USING p_baseline_id, public.planning_current_user_id(), v_notes;
  RETURN v_row;
END;
$$;

-- Makes an approved schedule baseline the active one and copies its task dates into
-- tasks.baseline_* (tasks not in the snapshot get no baseline). One transaction.
CREATE OR REPLACE FUNCTION public.planning_activate_baseline_impl(p_schema TEXT, p_baseline_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sim
AS $$
DECLARE
  v_fk TEXT := CASE WHEN p_schema = 'sim' THEN 'practice_project_id' ELSE 'project_id' END;
  v_project UUID := public.planning_baseline_project(p_schema, p_baseline_id);
  v_row JSONB;
  v_tasks INT;
BEGIN
  EXECUTE format('SELECT to_jsonb(b.*) FROM %I.project_baselines b WHERE id = $1 FOR UPDATE', p_schema) INTO v_row USING p_baseline_id;
  IF COALESCE(v_row->>'baseline_type', 'schedule') <> 'schedule' THEN RAISE EXCEPTION 'Only schedule baselines can be made active.'; END IF;
  IF v_row->>'approval_date' IS NULL AND v_row->>'approved_by' IS NULL THEN
    RAISE EXCEPTION 'Approve this baseline before making it active.';
  END IF;

  EXECUTE format('UPDATE %I.project_baselines SET is_active_baseline = FALSE WHERE %I = $1 AND is_active_baseline AND id <> $2', p_schema, v_fk)
    USING v_project, p_baseline_id;
  EXECUTE format('UPDATE %I.project_baselines SET is_active_baseline = TRUE WHERE id = $1', p_schema) USING p_baseline_id;

  EXECUTE format(
    'UPDATE %1$I.tasks t SET
        baseline_start_date    = NULLIF(s.e->>''start'', '''')::date,
        baseline_end_date      = NULLIF(s.e->>''finish'', '''')::date,
        baseline_duration_days = NULLIF(s.e->>''duration'', '''')::numeric
       FROM (SELECT t2.id AS task_id,
                    (SELECT e FROM jsonb_array_elements(COALESCE($2->''baseline_data''->''tasks'', ''[]''::jsonb)) e
                      WHERE e->>''id'' = t2.id::text OR (t2.task_code <> '''' AND e->>''task_code'' = t2.task_code) LIMIT 1) AS e
               FROM %1$I.tasks t2 WHERE t2.%2$I = $1 AND NOT COALESCE(t2.is_deleted, FALSE)) s
      WHERE t.id = s.task_id', p_schema, v_fk)
    USING v_project, v_row;
  GET DIAGNOSTICS v_tasks = ROW_COUNT;
  RETURN jsonb_build_object('baseline_id', p_baseline_id, 'tasks_updated', v_tasks);
END;
$$;

CREATE OR REPLACE FUNCTION public.planning_set_status_date_impl(p_schema TEXT, p_project_id UUID, p_date DATE)
RETURNS DATE
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sim
AS $$
BEGIN
  IF p_schema = 'sim' THEN
    UPDATE sim.practice_projects SET status_date = p_date WHERE id = p_project_id;
  ELSIF p_schema = 'public' THEN
    UPDATE public.projects SET status_date = p_date WHERE id = p_project_id;
  ELSE
    RAISE EXCEPTION 'Unknown schema %', p_schema;
  END IF;
  RETURN p_date;
END;
$$;

REVOKE ALL ON FUNCTION public.planning_baseline_project(TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.planning_approve_baseline_impl(TEXT, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.planning_activate_baseline_impl(TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.planning_set_status_date_impl(TEXT, UUID, DATE) FROM PUBLIC;

-- ── Access-checked wrappers ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.approve_schedule_baseline(p_baseline_id UUID, p_notes TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.auth_user_can_access_project(public.planning_baseline_project('public', p_baseline_id)) THEN
    RAISE EXCEPTION 'Not allowed to approve baselines on this project' USING ERRCODE = '42501';
  END IF;
  RETURN public.planning_approve_baseline_impl('public', p_baseline_id, p_notes);
END;
$$;

CREATE OR REPLACE FUNCTION sim.approve_schedule_baseline(p_baseline_id UUID, p_notes TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = sim, public AS $$
BEGIN
  IF NOT sim.auth_user_can_access_practice_project(public.planning_baseline_project('sim', p_baseline_id)) THEN
    RAISE EXCEPTION 'Not allowed to approve baselines on this practice project' USING ERRCODE = '42501';
  END IF;
  RETURN public.planning_approve_baseline_impl('sim', p_baseline_id, p_notes);
END;
$$;

CREATE OR REPLACE FUNCTION public.activate_schedule_baseline(p_baseline_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.auth_user_can_access_project(public.planning_baseline_project('public', p_baseline_id)) THEN
    RAISE EXCEPTION 'Not allowed to change baselines on this project' USING ERRCODE = '42501';
  END IF;
  RETURN public.planning_activate_baseline_impl('public', p_baseline_id);
END;
$$;

CREATE OR REPLACE FUNCTION sim.activate_schedule_baseline(p_baseline_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = sim, public AS $$
BEGIN
  IF NOT sim.auth_user_can_access_practice_project(public.planning_baseline_project('sim', p_baseline_id)) THEN
    RAISE EXCEPTION 'Not allowed to change baselines on this practice project' USING ERRCODE = '42501';
  END IF;
  RETURN public.planning_activate_baseline_impl('sim', p_baseline_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_project_status_date(p_project_id UUID, p_date DATE)
RETURNS DATE LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.auth_user_can_access_project(p_project_id) THEN
    RAISE EXCEPTION 'Not allowed to change this project' USING ERRCODE = '42501';
  END IF;
  RETURN public.planning_set_status_date_impl('public', p_project_id, p_date);
END;
$$;

CREATE OR REPLACE FUNCTION sim.set_practice_project_status_date(p_practice_project_id UUID, p_date DATE)
RETURNS DATE LANGUAGE plpgsql SECURITY DEFINER SET search_path = sim, public AS $$
BEGIN
  IF NOT sim.auth_user_can_access_practice_project(p_practice_project_id) THEN
    RAISE EXCEPTION 'Not allowed to change this practice project' USING ERRCODE = '42501';
  END IF;
  RETURN public.planning_set_status_date_impl('sim', p_practice_project_id, p_date);
END;
$$;

GRANT EXECUTE ON FUNCTION public.planning_current_user_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.approve_schedule_baseline(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION sim.approve_schedule_baseline(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.activate_schedule_baseline(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION sim.activate_schedule_baseline(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_project_status_date(UUID, DATE) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION sim.set_practice_project_status_date(UUID, DATE) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE 'v1265 S2: multiple schedule baselines (number, reason, approval, active) + status date installed.';
END $$;
