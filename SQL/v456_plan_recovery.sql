-- =============================================================================
-- v456_plan_recovery.sql
-- Recovery Planning Engine — Recovery Options Table
-- Platform: public schema
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.plan_recovery_options (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  trigger_type          TEXT NOT NULL
                          CHECK (trigger_type IN (
                            'milestone_slippage','resource_overload',
                            'budget_overrun','risk_materialised'
                          )),
  trigger_source_id     UUID,       -- ID of the milestone / risk / task that triggered this
  strategy              TEXT NOT NULL
                          CHECK (strategy IN (
                            'fast_track','crash','scope_defer','resequence',
                            'parallelise','wave_split','alternate_resource'
                          )),
  strategy_description  TEXT NOT NULL,
  schedule_saving_days  INTEGER DEFAULT 0,
  cost_impact           NUMERIC(18,2) DEFAULT 0,
  risk_impact           TEXT,
  requires_approval     BOOLEAN NOT NULL DEFAULT FALSE,
  status                TEXT NOT NULL DEFAULT 'suggested'
                          CHECK (status IN (
                            'suggested','under_review','approved','applied','rejected'
                          )),
  approved_by           UUID REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at           TIMESTAMPTZ,
  generated_by_ai       BOOLEAN NOT NULL DEFAULT FALSE,
  created_by            UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.trg_set_plan_recovery_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_plan_recovery_updated_at ON public.plan_recovery_options;
CREATE TRIGGER trg_plan_recovery_updated_at
  BEFORE UPDATE ON public.plan_recovery_options
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_plan_recovery_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_plan_recovery_project ON public.plan_recovery_options(project_id);
CREATE INDEX IF NOT EXISTS idx_plan_recovery_status  ON public.plan_recovery_options(status);

-- RLS
ALTER TABLE public.plan_recovery_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS recovery_select ON public.plan_recovery_options;
CREATE POLICY recovery_select ON public.plan_recovery_options
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_projects up
      WHERE up.project_id = plan_recovery_options.project_id
        AND up.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS recovery_insert ON public.plan_recovery_options;
CREATE POLICY recovery_insert ON public.plan_recovery_options
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_projects up
      WHERE up.project_id = plan_recovery_options.project_id
        AND up.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS recovery_update ON public.plan_recovery_options;
CREATE POLICY recovery_update ON public.plan_recovery_options
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_projects up
      JOIN public.project_roles pr ON pr.project_id = up.project_id
      WHERE up.project_id = plan_recovery_options.project_id
        AND up.user_id = auth.uid()
        AND pr.role_name IN ('Project Manager','PMO Admin','System Admin')
    )
  );

DROP POLICY IF EXISTS recovery_delete ON public.plan_recovery_options;
CREATE POLICY recovery_delete ON public.plan_recovery_options
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_projects up
      JOIN public.project_roles pr ON pr.project_id = up.project_id
      WHERE up.project_id = plan_recovery_options.project_id
        AND up.user_id = auth.uid()
        AND pr.role_name IN ('Project Manager','PMO Admin','System Admin')
    )
  );

-- DB Registry
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('plan_recovery_options',
   'Recovery strategies for projects in distress — AI-suggested and manually entered, with approval workflow',
   FALSE, TRUE)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table   = EXCLUDED.is_system_table,
  updated_at        = NOW();
