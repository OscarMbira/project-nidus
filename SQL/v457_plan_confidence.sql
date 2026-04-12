-- =============================================================================
-- v457_plan_confidence.sql
-- Confidence-Based Planning — Probability Forecasts per Task/Milestone
-- Platform: public schema
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.plan_confidence_forecasts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  milestone_id          UUID,                             -- optional FK to milestone
  task_id               UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  confidence_pct        INTEGER NOT NULL DEFAULT 50
                          CHECK (confidence_pct BETWEEN 0 AND 100),
  optimistic_date       DATE,
  likely_date           DATE,
  pessimistic_date      DATE,
  uncertainty_band_days INTEGER DEFAULT 0,
  basis_notes           TEXT,
  created_by            UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.trg_set_confidence_forecasts_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_confidence_forecasts_updated_at ON public.plan_confidence_forecasts;
CREATE TRIGGER trg_confidence_forecasts_updated_at
  BEFORE UPDATE ON public.plan_confidence_forecasts
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_confidence_forecasts_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_confidence_project   ON public.plan_confidence_forecasts(project_id);
CREATE INDEX IF NOT EXISTS idx_confidence_task      ON public.plan_confidence_forecasts(task_id);

-- RLS
ALTER TABLE public.plan_confidence_forecasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS confidence_select ON public.plan_confidence_forecasts;
CREATE POLICY confidence_select ON public.plan_confidence_forecasts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_projects up
      WHERE up.project_id = plan_confidence_forecasts.project_id
        AND up.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS confidence_insert ON public.plan_confidence_forecasts;
CREATE POLICY confidence_insert ON public.plan_confidence_forecasts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_projects up
      JOIN public.project_roles pr ON pr.project_id = up.project_id
      WHERE up.project_id = plan_confidence_forecasts.project_id
        AND up.user_id = auth.uid()
        AND pr.role_name IN (
          'Project Manager','Team Manager','Team Lead','PMO Admin','System Admin'
        )
    )
  );

DROP POLICY IF EXISTS confidence_update ON public.plan_confidence_forecasts;
CREATE POLICY confidence_update ON public.plan_confidence_forecasts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_projects up
      JOIN public.project_roles pr ON pr.project_id = up.project_id
      WHERE up.project_id = plan_confidence_forecasts.project_id
        AND up.user_id = auth.uid()
        AND pr.role_name IN (
          'Project Manager','Team Manager','Team Lead','PMO Admin','System Admin'
        )
    )
  );

DROP POLICY IF EXISTS confidence_delete ON public.plan_confidence_forecasts;
CREATE POLICY confidence_delete ON public.plan_confidence_forecasts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_projects up
      JOIN public.project_roles pr ON pr.project_id = up.project_id
      WHERE up.project_id = plan_confidence_forecasts.project_id
        AND up.user_id = auth.uid()
        AND pr.role_name IN ('Project Manager','PMO Admin','System Admin')
    )
  );

-- DB Registry
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('plan_confidence_forecasts',
   'Three-point (optimistic/likely/pessimistic) probability forecasts per task or milestone',
   FALSE, TRUE)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table   = EXCLUDED.is_system_table,
  updated_at        = NOW();
