-- ============================================================================
-- v418: project_evm_snapshots (Platform) — time-phased EVM data points
-- Prerequisites: projects, can_access_project_budget
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.project_evm_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  period_date DATE NOT NULL,
  planned_value NUMERIC(18, 4) NOT NULL DEFAULT 0,
  earned_value NUMERIC(18, 4) NOT NULL DEFAULT 0,
  actual_cost NUMERIC(18, 4) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, period_date)
);

CREATE INDEX IF NOT EXISTS idx_project_evm_snapshots_project ON public.project_evm_snapshots(project_id);
CREATE INDEX IF NOT EXISTS idx_project_evm_snapshots_period ON public.project_evm_snapshots(period_date DESC);

ALTER TABLE public.project_evm_snapshots ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_evm_snapshots TO authenticated;

DROP POLICY IF EXISTS policy_project_evm_snapshots_all ON public.project_evm_snapshots;
CREATE POLICY policy_project_evm_snapshots_all ON public.project_evm_snapshots
  FOR ALL TO authenticated
  USING (public.can_access_project_budget(project_id))
  WITH CHECK (public.can_access_project_budget(project_id));

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('project_evm_snapshots', 'Time-phased planned/earned/actual for EVM per project', FALSE, TRUE, 'financial')
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, updated_at = NOW();
