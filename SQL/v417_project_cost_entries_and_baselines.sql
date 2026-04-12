-- ============================================================================
-- v417: project_cost_entries + project_budget_baselines (Platform public)
-- Prerequisites: projects, users, budget_categories, can_access_project_budget (v268)
-- Date: 2026-04-10 — v349 Financial Management Plan
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.project_cost_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  budget_category_id UUID REFERENCES public.budget_categories(id) ON DELETE SET NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  description TEXT,
  entered_by_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  approval_status VARCHAR(30) NOT NULL DEFAULT 'recorded'
    CHECK (approval_status IN ('recorded', 'pending', 'approved', 'rejected')),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_cost_entries_project ON public.project_cost_entries(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_cost_entries_date ON public.project_cost_entries(entry_date DESC);

CREATE TABLE IF NOT EXISTS public.project_budget_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  baseline_name VARCHAR(200) NOT NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  locked_at TIMESTAMPTZ,
  total_amount NUMERIC(18, 2),
  categories_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_project_budget_baselines_project ON public.project_budget_baselines(project_id) WHERE is_deleted = FALSE;

ALTER TABLE public.project_cost_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_budget_baselines ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_cost_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_budget_baselines TO authenticated;

DROP POLICY IF EXISTS policy_project_cost_entries_all ON public.project_cost_entries;
CREATE POLICY policy_project_cost_entries_all ON public.project_cost_entries
  FOR ALL TO authenticated
  USING (public.can_access_project_budget(project_id))
  WITH CHECK (public.can_access_project_budget(project_id));

DROP POLICY IF EXISTS policy_project_budget_baselines_all ON public.project_budget_baselines;
CREATE POLICY policy_project_budget_baselines_all ON public.project_budget_baselines
  FOR ALL TO authenticated
  USING (public.can_access_project_budget(project_id))
  WITH CHECK (public.can_access_project_budget(project_id));

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
  ('project_cost_entries', 'Project actual cost line entries by budget category', FALSE, TRUE, 'financial'),
  ('project_budget_baselines', 'Locked budget baseline versions with category JSON snapshot', FALSE, TRUE, 'financial')
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at = NOW();
