-- ============================================================================
-- v1567 — Quantitative risk analysis, slice 2: schedule model and saved runs
-- PRD/plan: v1355 (D5, D7, D8). Prerequisites: v1566.
-- Creates the run tables. Then run Admin SQL v257 so new runs receive a display id.
-- Idempotent.
-- ============================================================================

-- ── 1. Groups, task ranges, risk–task links ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.qra_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  strength TEXT NOT NULL DEFAULT 'medium',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT qra_groups_strength CHECK (strength IN ('low', 'medium', 'high'))
);
CREATE TABLE IF NOT EXISTS sim.qra_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID,
  project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  strength TEXT NOT NULL DEFAULT 'medium',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT qra_groups_strength CHECK (strength IN ('low', 'medium', 'high'))
);

CREATE TABLE IF NOT EXISTS public.task_duration_ranges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  min_days NUMERIC(10,2),
  ml_days NUMERIC(10,2),
  max_days NUMERIC(10,2),
  distribution TEXT NOT NULL DEFAULT 'triangular',
  qra_group_id UUID REFERENCES public.qra_groups(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT task_duration_ranges_order CHECK (min_days IS NULL OR ml_days IS NULL OR max_days IS NULL OR (min_days <= ml_days AND ml_days <= max_days)),
  CONSTRAINT task_duration_ranges_distribution CHECK (distribution IN ('triangular', 'pert', 'uniform')),
  CONSTRAINT task_duration_ranges_task UNIQUE (task_id)
);
CREATE TABLE IF NOT EXISTS sim.task_duration_ranges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES sim.tasks(id) ON DELETE CASCADE,
  min_days NUMERIC(10,2),
  ml_days NUMERIC(10,2),
  max_days NUMERIC(10,2),
  distribution TEXT NOT NULL DEFAULT 'triangular',
  qra_group_id UUID REFERENCES sim.qra_groups(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT task_duration_ranges_order CHECK (min_days IS NULL OR ml_days IS NULL OR max_days IS NULL OR (min_days <= ml_days AND ml_days <= max_days)),
  CONSTRAINT task_duration_ranges_distribution CHECK (distribution IN ('triangular', 'pert', 'uniform')),
  CONSTRAINT task_duration_ranges_task UNIQUE (task_id)
);

CREATE TABLE IF NOT EXISTS public.risk_task_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  risk_id UUID NOT NULL REFERENCES public.risks(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT risk_task_links_pair UNIQUE (risk_id, task_id)
);
CREATE TABLE IF NOT EXISTS sim.risk_task_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  risk_id UUID NOT NULL REFERENCES sim.practice_risks(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES sim.tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT risk_task_links_pair UNIQUE (risk_id, task_id)
);

ALTER TABLE public.risks DROP CONSTRAINT IF EXISTS risks_qra_group_fk;
ALTER TABLE public.risks
  ADD CONSTRAINT risks_qra_group_fk FOREIGN KEY (qra_group_id) REFERENCES public.qra_groups(id) ON DELETE SET NULL;
ALTER TABLE sim.practice_risks DROP CONSTRAINT IF EXISTS practice_risks_qra_group_fk;
ALTER TABLE sim.practice_risks
  ADD CONSTRAINT practice_risks_qra_group_fk FOREIGN KEY (qra_group_id) REFERENCES sim.qra_groups(id) ON DELETE SET NULL;

-- ── 2. Saved runs (immutable once saved) and per-task criticality ───────────
CREATE TABLE IF NOT EXISTS public.qra_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_id TEXT NOT NULL DEFAULT '',
  organisation_id UUID,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  response_basis TEXT NOT NULL DEFAULT 'pre',
  iterations INTEGER NOT NULL,
  seed BIGINT NOT NULL,
  inputs_snapshot JSONB NOT NULL,
  summary JSONB NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT qra_runs_kind CHECK (kind IN ('schedule', 'cost', 'both')),
  CONSTRAINT qra_runs_basis CHECK (response_basis IN ('pre', 'post')),
  CONSTRAINT qra_runs_iterations CHECK (iterations BETWEEN 1000 AND 20000)
);
CREATE TABLE IF NOT EXISTS sim.qra_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_id TEXT NOT NULL DEFAULT '',
  organisation_id UUID,
  project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  response_basis TEXT NOT NULL DEFAULT 'pre',
  iterations INTEGER NOT NULL,
  seed BIGINT NOT NULL,
  inputs_snapshot JSONB NOT NULL,
  summary JSONB NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT qra_runs_kind CHECK (kind IN ('schedule', 'cost', 'both')),
  CONSTRAINT qra_runs_basis CHECK (response_basis IN ('pre', 'post')),
  CONSTRAINT qra_runs_iterations CHECK (iterations BETWEEN 1000 AND 20000)
);
CREATE INDEX IF NOT EXISTS idx_qra_runs_project ON public.qra_runs (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sim_qra_runs_project ON sim.qra_runs (project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.qra_run_task_stats (
  run_id UUID NOT NULL REFERENCES public.qra_runs(id) ON DELETE CASCADE,
  task_id UUID NOT NULL,
  task_label TEXT,
  criticality NUMERIC(8,5) NOT NULL,
  mean_duration NUMERIC(10,2),
  PRIMARY KEY (run_id, task_id)
);
CREATE TABLE IF NOT EXISTS sim.qra_run_task_stats (
  run_id UUID NOT NULL REFERENCES sim.qra_runs(id) ON DELETE CASCADE,
  task_id UUID NOT NULL,
  task_label TEXT,
  criticality NUMERIC(8,5) NOT NULL,
  mean_duration NUMERIC(10,2),
  PRIMARY KEY (run_id, task_id)
);

-- Display id. The shared AFTER INSERT helper updates the row; immutability allows that one fill.
DROP TRIGGER IF EXISTS trg_qra_runs_display_id ON public.qra_runs;
CREATE TRIGGER trg_qra_runs_display_id
  AFTER INSERT ON public.qra_runs
  FOR EACH ROW EXECUTE FUNCTION public.trg_apply_admin_display_id('public.qra_runs', 'display_id');
DROP TRIGGER IF EXISTS trg_sim_qra_runs_display_id ON sim.qra_runs;
CREATE TRIGGER trg_sim_qra_runs_display_id
  AFTER INSERT ON sim.qra_runs
  FOR EACH ROW EXECUTE FUNCTION sim.trg_apply_admin_display_id('sim.qra_runs', 'display_id');

CREATE OR REPLACE FUNCTION public.qra_runs_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'A saved analysis cannot be deleted';
  END IF;
  IF COALESCE(btrim(OLD.display_id), '') = ''
     AND NEW.display_id IS DISTINCT FROM OLD.display_id
     AND NEW.summary IS NOT DISTINCT FROM OLD.summary
     AND NEW.inputs_snapshot IS NOT DISTINCT FROM OLD.inputs_snapshot
     AND NEW.iterations = OLD.iterations AND NEW.seed = OLD.seed THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'A saved analysis cannot be changed';
END;
$$;
CREATE OR REPLACE FUNCTION sim.qra_runs_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'A saved analysis cannot be deleted';
  END IF;
  IF COALESCE(btrim(OLD.display_id), '') = ''
     AND NEW.display_id IS DISTINCT FROM OLD.display_id
     AND NEW.summary IS NOT DISTINCT FROM OLD.summary
     AND NEW.inputs_snapshot IS NOT DISTINCT FROM OLD.inputs_snapshot
     AND NEW.iterations = OLD.iterations AND NEW.seed = OLD.seed THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'A saved analysis cannot be changed';
END;
$$;
DROP TRIGGER IF EXISTS trg_qra_runs_immutable ON public.qra_runs;
CREATE TRIGGER trg_qra_runs_immutable
  BEFORE UPDATE OR DELETE ON public.qra_runs
  FOR EACH ROW EXECUTE FUNCTION public.qra_runs_immutable();
DROP TRIGGER IF EXISTS trg_sim_qra_runs_immutable ON sim.qra_runs;
CREATE TRIGGER trg_sim_qra_runs_immutable
  BEFORE UPDATE OR DELETE ON sim.qra_runs
  FOR EACH ROW EXECUTE FUNCTION sim.qra_runs_immutable();

CREATE OR REPLACE FUNCTION public.qra_stats_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Saved analysis results cannot be changed';
END;
$$;
CREATE OR REPLACE FUNCTION sim.qra_stats_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Saved analysis results cannot be changed';
END;
$$;
DROP TRIGGER IF EXISTS trg_qra_stats_immutable ON public.qra_run_task_stats;
CREATE TRIGGER trg_qra_stats_immutable
  BEFORE UPDATE OR DELETE ON public.qra_run_task_stats
  FOR EACH ROW EXECUTE FUNCTION public.qra_stats_immutable();
DROP TRIGGER IF EXISTS trg_sim_qra_stats_immutable ON sim.qra_run_task_stats;
CREATE TRIGGER trg_sim_qra_stats_immutable
  BEFORE UPDATE OR DELETE ON sim.qra_run_task_stats
  FOR EACH ROW EXECUTE FUNCTION sim.qra_stats_immutable();

-- ── 3. save_qra_run ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.save_qra_run(p_payload JSONB)
RETURNS public.qra_runs
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_project UUID := (p_payload ->> 'project_id')::UUID;
  v_row public.qra_runs;
  v_user UUID;
  v_stat JSONB;
BEGIN
  IF v_project IS NULL OR NOT public.auth_user_can_access_project(v_project) THEN
    RAISE EXCEPTION 'You cannot save an analysis for this project';
  END IF;
  IF COALESCE((p_payload ->> 'iterations')::INT, 0) NOT BETWEEN 1000 AND 20000 THEN
    RAISE EXCEPTION 'Iterations must be between 1,000 and 20,000';
  END IF;
  SELECT id INTO v_user FROM public.users WHERE auth_user_id = auth.uid() AND NOT COALESCE(is_deleted, FALSE) LIMIT 1;
  INSERT INTO public.qra_runs (display_id, organisation_id, project_id, kind, response_basis, iterations, seed, inputs_snapshot, summary, created_by)
  VALUES (
    '',
    NULLIF(p_payload ->> 'organisation_id', '')::UUID,
    v_project,
    COALESCE(p_payload ->> 'kind', 'schedule'),
    COALESCE(p_payload ->> 'response_basis', 'pre'),
    (p_payload ->> 'iterations')::INT,
    (p_payload ->> 'seed')::BIGINT,
    COALESCE(p_payload -> 'inputs_snapshot', '{}'::JSONB),
    COALESCE(p_payload -> 'summary', '{}'::JSONB),
    v_user
  )
  RETURNING * INTO v_row;
  SELECT * INTO v_row FROM public.qra_runs WHERE id = v_row.id;
  FOR v_stat IN SELECT * FROM jsonb_array_elements(COALESCE(p_payload -> 'task_stats', '[]'::JSONB))
  LOOP
    INSERT INTO public.qra_run_task_stats (run_id, task_id, task_label, criticality, mean_duration)
    VALUES (
      v_row.id,
      (v_stat ->> 'task_id')::UUID,
      v_stat ->> 'task_label',
      COALESCE((v_stat ->> 'criticality')::NUMERIC, 0),
      NULLIF(v_stat ->> 'mean_duration', '')::NUMERIC
    );
  END LOOP;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION sim.save_qra_run(p_payload JSONB)
RETURNS sim.qra_runs
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
DECLARE
  v_project UUID := (p_payload ->> 'project_id')::UUID;
  v_row sim.qra_runs;
  v_stat JSONB;
BEGIN
  IF v_project IS NULL OR NOT sim.qra_can_access(v_project) THEN
    RAISE EXCEPTION 'You cannot save an analysis for this project';
  END IF;
  IF COALESCE((p_payload ->> 'iterations')::INT, 0) NOT BETWEEN 1000 AND 20000 THEN
    RAISE EXCEPTION 'Iterations must be between 1,000 and 20,000';
  END IF;
  INSERT INTO sim.qra_runs (display_id, project_id, kind, response_basis, iterations, seed, inputs_snapshot, summary, created_by)
  VALUES (
    '',
    v_project,
    COALESCE(p_payload ->> 'kind', 'schedule'),
    COALESCE(p_payload ->> 'response_basis', 'pre'),
    (p_payload ->> 'iterations')::INT,
    (p_payload ->> 'seed')::BIGINT,
    COALESCE(p_payload -> 'inputs_snapshot', '{}'::JSONB),
    COALESCE(p_payload -> 'summary', '{}'::JSONB),
    auth.uid()
  )
  RETURNING * INTO v_row;
  SELECT * INTO v_row FROM sim.qra_runs WHERE id = v_row.id;
  FOR v_stat IN SELECT * FROM jsonb_array_elements(COALESCE(p_payload -> 'task_stats', '[]'::JSONB))
  LOOP
    INSERT INTO sim.qra_run_task_stats (run_id, task_id, task_label, criticality, mean_duration)
    VALUES (
      v_row.id,
      (v_stat ->> 'task_id')::UUID,
      v_stat ->> 'task_label',
      COALESCE((v_stat ->> 'criticality')::NUMERIC, 0),
      NULLIF(v_stat ->> 'mean_duration', '')::NUMERIC
    );
  END LOOP;
  RETURN v_row;
END;
$$;
GRANT EXECUTE ON FUNCTION public.save_qra_run(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION sim.save_qra_run(JSONB) TO authenticated;

-- ── 4. Access ───────────────────────────────────────────────────────────────
ALTER TABLE public.qra_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_duration_ranges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_task_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qra_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qra_run_task_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.qra_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.task_duration_ranges ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.risk_task_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.qra_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.qra_run_task_stats ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.qra_groups, public.task_duration_ranges, public.risk_task_links TO authenticated;
GRANT SELECT, INSERT ON public.qra_runs, public.qra_run_task_stats TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.qra_groups, sim.task_duration_ranges, sim.risk_task_links TO authenticated;
GRANT SELECT, INSERT ON sim.qra_runs, sim.qra_run_task_stats TO authenticated;
GRANT ALL ON public.qra_groups, public.task_duration_ranges, public.risk_task_links, public.qra_runs, public.qra_run_task_stats TO service_role;
GRANT ALL ON sim.qra_groups, sim.task_duration_ranges, sim.risk_task_links, sim.qra_runs, sim.qra_run_task_stats TO service_role;

DROP POLICY IF EXISTS qra_groups_all ON public.qra_groups;
CREATE POLICY qra_groups_all ON public.qra_groups FOR ALL TO authenticated
  USING (public.auth_user_can_access_project(project_id))
  WITH CHECK (public.auth_user_can_access_project(project_id));
DROP POLICY IF EXISTS task_duration_ranges_all ON public.task_duration_ranges;
CREATE POLICY task_duration_ranges_all ON public.task_duration_ranges FOR ALL TO authenticated
  USING (public.auth_user_can_access_project(project_id))
  WITH CHECK (public.auth_user_can_access_project(project_id));
DROP POLICY IF EXISTS risk_task_links_all ON public.risk_task_links;
CREATE POLICY risk_task_links_all ON public.risk_task_links FOR ALL TO authenticated
  USING (public.auth_user_can_access_project(project_id))
  WITH CHECK (public.auth_user_can_access_project(project_id));
DROP POLICY IF EXISTS qra_runs_select ON public.qra_runs;
CREATE POLICY qra_runs_select ON public.qra_runs FOR SELECT TO authenticated
  USING (public.auth_user_can_access_project(project_id));
DROP POLICY IF EXISTS qra_runs_insert ON public.qra_runs;
CREATE POLICY qra_runs_insert ON public.qra_runs FOR INSERT TO authenticated
  WITH CHECK (public.auth_user_can_access_project(project_id));
DROP POLICY IF EXISTS qra_stats_select ON public.qra_run_task_stats;
CREATE POLICY qra_stats_select ON public.qra_run_task_stats FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.qra_runs r WHERE r.id = run_id AND public.auth_user_can_access_project(r.project_id)));
DROP POLICY IF EXISTS qra_stats_insert ON public.qra_run_task_stats;
CREATE POLICY qra_stats_insert ON public.qra_run_task_stats FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.qra_runs r WHERE r.id = run_id AND public.auth_user_can_access_project(r.project_id)));

DROP POLICY IF EXISTS qra_groups_all ON sim.qra_groups;
CREATE POLICY qra_groups_all ON sim.qra_groups FOR ALL TO authenticated
  USING (sim.qra_can_access(project_id)) WITH CHECK (sim.qra_can_access(project_id));
DROP POLICY IF EXISTS task_duration_ranges_all ON sim.task_duration_ranges;
CREATE POLICY task_duration_ranges_all ON sim.task_duration_ranges FOR ALL TO authenticated
  USING (sim.qra_can_access(project_id)) WITH CHECK (sim.qra_can_access(project_id));
DROP POLICY IF EXISTS risk_task_links_all ON sim.risk_task_links;
CREATE POLICY risk_task_links_all ON sim.risk_task_links FOR ALL TO authenticated
  USING (sim.qra_can_access(project_id)) WITH CHECK (sim.qra_can_access(project_id));
DROP POLICY IF EXISTS qra_runs_select ON sim.qra_runs;
CREATE POLICY qra_runs_select ON sim.qra_runs FOR SELECT TO authenticated
  USING (sim.qra_can_access(project_id));
DROP POLICY IF EXISTS qra_runs_insert ON sim.qra_runs;
CREATE POLICY qra_runs_insert ON sim.qra_runs FOR INSERT TO authenticated
  WITH CHECK (sim.qra_can_access(project_id));
DROP POLICY IF EXISTS qra_stats_select ON sim.qra_run_task_stats;
CREATE POLICY qra_stats_select ON sim.qra_run_task_stats FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM sim.qra_runs r WHERE r.id = run_id AND sim.qra_can_access(r.project_id)));
DROP POLICY IF EXISTS qra_stats_insert ON sim.qra_run_task_stats;
CREATE POLICY qra_stats_insert ON sim.qra_run_task_stats FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM sim.qra_runs r WHERE r.id = run_id AND sim.qra_can_access(r.project_id)));

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('qra_groups', 'Risks and ranges that move together', FALSE, TRUE),
  ('task_duration_ranges', 'Three-point duration ranges for schedule tasks', FALSE, TRUE),
  ('risk_task_links', 'Risks linked to the tasks they affect', FALSE, TRUE),
  ('qra_runs', 'Saved quantitative risk analysis runs', FALSE, TRUE),
  ('qra_run_task_stats', 'Criticality index for each task in a saved run', FALSE, TRUE),
  ('sim.qra_groups', 'Simulator groups of risks and ranges that move together', FALSE, TRUE),
  ('sim.task_duration_ranges', 'Simulator three-point task duration ranges', FALSE, TRUE),
  ('sim.risk_task_links', 'Simulator risk to task links', FALSE, TRUE),
  ('sim.qra_runs', 'Simulator saved quantitative risk analysis runs', FALSE, TRUE),
  ('sim.qra_run_task_stats', 'Simulator criticality index rows', FALSE, TRUE)
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, is_active = TRUE, updated_at = NOW();

-- Planner sessions that open Risk analysis read these public tables (v1251 wall).
INSERT INTO public.planner_table_allowlist (table_name) VALUES
  ('qra_settings'), ('qra_groups'), ('task_duration_ranges'), ('qra_runs'), ('qra_run_task_stats')
ON CONFLICT (table_name) DO NOTHING;
