-- =============================================================================
-- v451_plan_scenarios.sql
-- Planning Intelligence Module — Scenario Planning Tables
-- Platform: public schema
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. plan_scenarios — what-if schedule scenarios per project
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plan_scenarios (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  organisation_id       UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  scenario_type         TEXT NOT NULL DEFAULT 'custom'
                          CHECK (scenario_type IN (
                            'best_case','most_likely','worst_case',
                            'recovery','accelerated','constrained_resource','custom'
                          )),
  description           TEXT,
  status                TEXT NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft','active','promoted','archived')),
  is_baseline           BOOLEAN NOT NULL DEFAULT FALSE,
  promoted_from_id      UUID REFERENCES public.plan_scenarios(id) ON DELETE SET NULL,
  promoted_at           TIMESTAMPTZ,
  promoted_by           UUID REFERENCES public.users(id) ON DELETE SET NULL,
  approved_by           UUID REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at           TIMESTAMPTZ,
  milestone_delta_days  INTEGER DEFAULT 0,
  cost_delta            NUMERIC(18,2) DEFAULT 0,
  is_draft              BOOLEAN NOT NULL DEFAULT FALSE,
  draft_expires_at      TIMESTAMPTZ,
  created_by            UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_plan_scenario_project_name UNIQUE (project_id, name)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. plan_scenario_task_snapshots — frozen copy of tasks for a scenario
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plan_scenario_task_snapshots (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id           UUID NOT NULL REFERENCES public.plan_scenarios(id) ON DELETE CASCADE,
  source_task_id        UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  task_name             TEXT NOT NULL,
  start_date            DATE,
  end_date              DATE,
  duration_days         INTEGER,
  progress_percentage   INTEGER DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
  assigned_to           UUID REFERENCES public.users(id) ON DELETE SET NULL,
  is_milestone          BOOLEAN NOT NULL DEFAULT FALSE,
  is_critical_path      BOOLEAN NOT NULL DEFAULT FALSE,
  dependency_type       TEXT,
  confidence_level      INTEGER DEFAULT 50 CHECK (confidence_level BETWEEN 0 AND 100),
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. clone_scenario() — deep copies task snapshots to a new scenario
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.clone_scenario(
  p_source_scenario_id UUID,
  p_new_name           TEXT,
  p_created_by         UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_source     public.plan_scenarios%ROWTYPE;
  v_new_id     UUID := gen_random_uuid();
BEGIN
  SELECT * INTO v_source FROM public.plan_scenarios WHERE id = p_source_scenario_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source scenario % not found', p_source_scenario_id;
  END IF;

  INSERT INTO public.plan_scenarios (
    id, project_id, organisation_id, name, scenario_type, description,
    status, is_baseline, promoted_from_id, milestone_delta_days, cost_delta,
    is_draft, created_by, created_at, updated_at
  ) VALUES (
    v_new_id, v_source.project_id, v_source.organisation_id,
    p_new_name, v_source.scenario_type, v_source.description,
    'draft', FALSE, p_source_scenario_id, v_source.milestone_delta_days,
    v_source.cost_delta, FALSE, p_created_by, NOW(), NOW()
  );

  INSERT INTO public.plan_scenario_task_snapshots (
    scenario_id, source_task_id, task_name, start_date, end_date,
    duration_days, progress_percentage, assigned_to, is_milestone,
    is_critical_path, dependency_type, confidence_level, notes
  )
  SELECT
    v_new_id, source_task_id, task_name, start_date, end_date,
    duration_days, progress_percentage, assigned_to, is_milestone,
    is_critical_path, dependency_type, confidence_level, notes
  FROM public.plan_scenario_task_snapshots
  WHERE scenario_id = p_source_scenario_id;

  RETURN v_new_id;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. updated_at trigger
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_set_plan_scenarios_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_plan_scenarios_updated_at ON public.plan_scenarios;
CREATE TRIGGER trg_plan_scenarios_updated_at
  BEFORE UPDATE ON public.plan_scenarios
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_plan_scenarios_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Indexes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_plan_scenarios_project_id    ON public.plan_scenarios(project_id);
CREATE INDEX IF NOT EXISTS idx_plan_scenarios_org_id        ON public.plan_scenarios(organisation_id);
CREATE INDEX IF NOT EXISTS idx_plan_scenarios_status        ON public.plan_scenarios(status);
CREATE INDEX IF NOT EXISTS idx_plan_scenarios_is_baseline   ON public.plan_scenarios(is_baseline);
CREATE INDEX IF NOT EXISTS idx_scenario_snapshots_scenario  ON public.plan_scenario_task_snapshots(scenario_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.plan_scenarios               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_scenario_task_snapshots ENABLE ROW LEVEL SECURITY;

-- plan_scenarios RLS
DROP POLICY IF EXISTS plan_scenarios_select ON public.plan_scenarios;
CREATE POLICY plan_scenarios_select ON public.plan_scenarios
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_projects up
      WHERE up.project_id = plan_scenarios.project_id
        AND up.user_id = auth.uid()::uuid
        AND up.is_deleted = FALSE
    )
  );

DROP POLICY IF EXISTS plan_scenarios_insert ON public.plan_scenarios;
CREATE POLICY plan_scenarios_insert ON public.plan_scenarios
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_projects up
      JOIN public.project_roles pr ON pr.project_id = up.project_id
      WHERE up.project_id = plan_scenarios.project_id
        AND up.user_id = auth.uid()::uuid
        AND pr.role_name IN ('Project Manager','PMO Admin','System Admin')
        AND up.is_deleted = FALSE
    )
  );

DROP POLICY IF EXISTS plan_scenarios_update ON public.plan_scenarios;
CREATE POLICY plan_scenarios_update ON public.plan_scenarios
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_projects up
      JOIN public.project_roles pr ON pr.project_id = up.project_id
      WHERE up.project_id = plan_scenarios.project_id
        AND up.user_id = auth.uid()::uuid
        AND pr.role_name IN ('Project Manager','PMO Admin','System Admin')
        AND up.is_deleted = FALSE
    )
  );

DROP POLICY IF EXISTS plan_scenarios_delete ON public.plan_scenarios;
CREATE POLICY plan_scenarios_delete ON public.plan_scenarios
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_projects up
      JOIN public.project_roles pr ON pr.project_id = up.project_id
      WHERE up.project_id = plan_scenarios.project_id
        AND up.user_id = auth.uid()::uuid
        AND pr.role_name IN ('Project Manager','PMO Admin','System Admin')
        AND up.is_deleted = FALSE
    )
  );

-- task snapshots — inherit from parent scenario
DROP POLICY IF EXISTS plan_scenario_snapshots_select ON public.plan_scenario_task_snapshots;
CREATE POLICY plan_scenario_snapshots_select ON public.plan_scenario_task_snapshots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.plan_scenarios ps
      JOIN public.user_projects up ON up.project_id = ps.project_id
      WHERE ps.id = plan_scenario_task_snapshots.scenario_id
        AND up.user_id = auth.uid()::uuid
        AND up.is_deleted = FALSE
    )
  );

DROP POLICY IF EXISTS plan_scenario_snapshots_insert ON public.plan_scenario_task_snapshots;
CREATE POLICY plan_scenario_snapshots_insert ON public.plan_scenario_task_snapshots
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.plan_scenarios ps
      JOIN public.user_projects up ON up.project_id = ps.project_id
      JOIN public.project_roles pr ON pr.project_id = up.project_id
      WHERE ps.id = plan_scenario_task_snapshots.scenario_id
        AND up.user_id = auth.uid()::uuid
        AND pr.role_name IN ('Project Manager','PMO Admin','System Admin')
        AND up.is_deleted = FALSE
    )
  );

DROP POLICY IF EXISTS plan_scenario_snapshots_update ON public.plan_scenario_task_snapshots;
CREATE POLICY plan_scenario_snapshots_update ON public.plan_scenario_task_snapshots
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.plan_scenarios ps
      JOIN public.user_projects up ON up.project_id = ps.project_id
      JOIN public.project_roles pr ON pr.project_id = up.project_id
      WHERE ps.id = plan_scenario_task_snapshots.scenario_id
        AND up.user_id = auth.uid()::uuid
        AND pr.role_name IN ('Project Manager','PMO Admin','System Admin')
        AND up.is_deleted = FALSE
    )
  );

DROP POLICY IF EXISTS plan_scenario_snapshots_delete ON public.plan_scenario_task_snapshots;
CREATE POLICY plan_scenario_snapshots_delete ON public.plan_scenario_task_snapshots
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.plan_scenarios ps
      JOIN public.user_projects up ON up.project_id = ps.project_id
      JOIN public.project_roles pr ON pr.project_id = up.project_id
      WHERE ps.id = plan_scenario_task_snapshots.scenario_id
        AND up.user_id = auth.uid()::uuid
        AND pr.role_name IN ('Project Manager','PMO Admin','System Admin')
        AND up.is_deleted = FALSE
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. DB Registry
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('plan_scenarios',
   'What-if schedule scenarios per project — supports best/worst/recovery planning',
   FALSE, TRUE),
  ('plan_scenario_task_snapshots',
   'Frozen copy of task data at the time a planning scenario was created',
   FALSE, TRUE)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table   = EXCLUDED.is_system_table,
  updated_at        = NOW();
