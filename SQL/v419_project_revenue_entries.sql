-- ============================================================================
-- v419: project_revenue_entries (Platform)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.project_revenue_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  revenue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  revenue_type VARCHAR(50) NOT NULL DEFAULT 'other'
    CHECK (revenue_type IN ('contract_payment', 'milestone', 'retainer', 'grant', 'other')),
  description TEXT,
  is_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_revenue_entries_project ON public.project_revenue_entries(project_id) WHERE is_deleted = FALSE;

ALTER TABLE public.project_revenue_entries ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_revenue_entries TO authenticated;

DROP POLICY IF EXISTS policy_project_revenue_entries_all ON public.project_revenue_entries;
CREATE POLICY policy_project_revenue_entries_all ON public.project_revenue_entries
  FOR ALL TO authenticated
  USING (public.can_access_project_budget(project_id) AND is_deleted = FALSE)
  WITH CHECK (public.can_access_project_budget(project_id));

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('project_revenue_entries', 'Project revenue lines for profitability', FALSE, TRUE, 'financial')
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, updated_at = NOW();
