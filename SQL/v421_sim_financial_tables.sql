-- ============================================================================
-- v421: Simulator financial tables (sim schema) — mirrors v417–v420
-- Prerequisites: sim.practice_projects, sim.get_current_user_id (v242)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sim.project_cost_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  budget_category_id UUID REFERENCES public.budget_categories(id) ON DELETE SET NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  description TEXT,
  entered_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  approval_status VARCHAR(30) NOT NULL DEFAULT 'recorded',
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sim.project_budget_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
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
  UNIQUE (practice_project_id, version_number)
);

CREATE TABLE IF NOT EXISTS sim.project_evm_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  period_date DATE NOT NULL,
  planned_value NUMERIC(18, 4) NOT NULL DEFAULT 0,
  earned_value NUMERIC(18, 4) NOT NULL DEFAULT 0,
  actual_cost NUMERIC(18, 4) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (practice_project_id, period_date)
);

CREATE TABLE IF NOT EXISTS sim.project_revenue_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  revenue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  revenue_type VARCHAR(50) NOT NULL DEFAULT 'other',
  description TEXT,
  is_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sim.project_expense_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  submitted_by_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  expense_type VARCHAR(40) NOT NULL DEFAULT 'other',
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(15, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  description TEXT,
  receipt_url TEXT,
  vendor_name VARCHAR(300),
  claim_status VARCHAR(30) NOT NULL DEFAULT 'draft',
  current_approval_level INTEGER,
  total_approval_levels INTEGER,
  approval_chain JSONB DEFAULT '[]'::jsonb,
  is_reimbursable BOOLEAN NOT NULL DEFAULT TRUE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sim.expense_approval_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_claim_id UUID NOT NULL REFERENCES sim.project_expense_claims(id) ON DELETE CASCADE,
  approval_level INTEGER NOT NULL,
  approver_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  approver_role_name VARCHAR(100),
  action VARCHAR(20) NOT NULL,
  comments TEXT,
  actioned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sim.expense_approval_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  threshold_name VARCHAR(100) NOT NULL,
  min_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  max_amount NUMERIC(15, 2),
  required_approval_level INTEGER NOT NULL DEFAULT 3,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Grants
GRANT USAGE ON SCHEMA sim TO authenticated;
GRANT ALL ON sim.project_cost_entries TO authenticated;
GRANT ALL ON sim.project_budget_baselines TO authenticated;
GRANT ALL ON sim.project_evm_snapshots TO authenticated;
GRANT ALL ON sim.project_revenue_entries TO authenticated;
GRANT ALL ON sim.project_expense_claims TO authenticated;
GRANT ALL ON sim.expense_approval_steps TO authenticated;
GRANT ALL ON sim.expense_approval_thresholds TO authenticated;

ALTER TABLE sim.project_cost_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.project_budget_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.project_evm_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.project_revenue_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.project_expense_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.expense_approval_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.expense_approval_thresholds ENABLE ROW LEVEL SECURITY;

-- Owner or PMO (reuse v415 pattern)
DROP POLICY IF EXISTS sim_project_cost_entries_access ON sim.project_cost_entries;
CREATE POLICY sim_project_cost_entries_access ON sim.project_cost_entries FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = practice_project_id AND COALESCE(pp.is_deleted, FALSE) = FALSE
        AND (pp.user_id = sim.get_current_user_id() OR public.is_pmo_admin_user())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = practice_project_id AND COALESCE(pp.is_deleted, FALSE) = FALSE
        AND (pp.user_id = sim.get_current_user_id() OR public.is_pmo_admin_user())
    )
  );

DROP POLICY IF EXISTS sim_project_budget_baselines_access ON sim.project_budget_baselines;
CREATE POLICY sim_project_budget_baselines_access ON sim.project_budget_baselines FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM sim.practice_projects pp WHERE pp.id = practice_project_id AND (pp.user_id = sim.get_current_user_id() OR public.is_pmo_admin_user())))
  WITH CHECK (EXISTS (SELECT 1 FROM sim.practice_projects pp WHERE pp.id = practice_project_id AND (pp.user_id = sim.get_current_user_id() OR public.is_pmo_admin_user())));

DROP POLICY IF EXISTS sim_project_evm_snapshots_access ON sim.project_evm_snapshots;
CREATE POLICY sim_project_evm_snapshots_access ON sim.project_evm_snapshots FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM sim.practice_projects pp WHERE pp.id = practice_project_id AND (pp.user_id = sim.get_current_user_id() OR public.is_pmo_admin_user())))
  WITH CHECK (EXISTS (SELECT 1 FROM sim.practice_projects pp WHERE pp.id = practice_project_id AND (pp.user_id = sim.get_current_user_id() OR public.is_pmo_admin_user())));

DROP POLICY IF EXISTS sim_project_revenue_entries_access ON sim.project_revenue_entries;
CREATE POLICY sim_project_revenue_entries_access ON sim.project_revenue_entries FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM sim.practice_projects pp WHERE pp.id = practice_project_id AND (pp.user_id = sim.get_current_user_id() OR public.is_pmo_admin_user())))
  WITH CHECK (EXISTS (SELECT 1 FROM sim.practice_projects pp WHERE pp.id = practice_project_id AND (pp.user_id = sim.get_current_user_id() OR public.is_pmo_admin_user())));

DROP POLICY IF EXISTS sim_project_expense_claims_access ON sim.project_expense_claims;
CREATE POLICY sim_project_expense_claims_access ON sim.project_expense_claims FOR ALL TO authenticated
  USING (
    COALESCE(is_deleted, FALSE) = FALSE
    AND (
      submitted_by_user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1)
      OR EXISTS (SELECT 1 FROM sim.practice_projects pp WHERE pp.id = practice_project_id AND (pp.user_id = sim.get_current_user_id() OR public.is_pmo_admin_user()))
    )
  )
  WITH CHECK (
    COALESCE(is_deleted, FALSE) = FALSE
    AND (
      submitted_by_user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1)
      OR EXISTS (SELECT 1 FROM sim.practice_projects pp WHERE pp.id = practice_project_id AND (pp.user_id = sim.get_current_user_id() OR public.is_pmo_admin_user()))
    )
  );

DROP POLICY IF EXISTS sim_expense_approval_steps_access ON sim.expense_approval_steps;
CREATE POLICY sim_expense_approval_steps_access ON sim.expense_approval_steps FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.project_expense_claims c
      JOIN sim.practice_projects pp ON pp.id = c.practice_project_id
      WHERE c.id = expense_claim_id
        AND (c.submitted_by_user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1)
          OR pp.user_id = sim.get_current_user_id() OR public.is_pmo_admin_user() OR approver_user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1))
    )
  )
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS sim_expense_approval_thresholds_access ON sim.expense_approval_thresholds;
CREATE POLICY sim_expense_approval_thresholds_access ON sim.expense_approval_thresholds FOR ALL TO authenticated
  USING (public.is_pmo_admin_user() OR account_id IN (SELECT a.id FROM public.accounts a JOIN public.users u ON u.id = a.owner_user_id WHERE u.auth_user_id = auth.uid()))
  WITH CHECK (public.is_pmo_admin_user());

INSERT INTO public.database_tables (table_name, table_description, schema_name, is_system_table, is_active, table_category)
VALUES
  ('sim.project_cost_entries', 'Simulator practice project cost entries', 'sim', FALSE, TRUE, 'simulation'),
  ('sim.project_budget_baselines', 'Simulator practice budget baselines', 'sim', FALSE, TRUE, 'simulation'),
  ('sim.project_evm_snapshots', 'Simulator practice EVM snapshots', 'sim', FALSE, TRUE, 'simulation'),
  ('sim.project_revenue_entries', 'Simulator practice revenue entries', 'sim', FALSE, TRUE, 'simulation'),
  ('sim.project_expense_claims', 'Simulator practice expense claims', 'sim', FALSE, TRUE, 'simulation'),
  ('sim.expense_approval_steps', 'Simulator expense approval audit', 'sim', FALSE, TRUE, 'simulation'),
  ('sim.expense_approval_thresholds', 'Simulator expense thresholds', 'sim', FALSE, TRUE, 'simulation')
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, updated_at = NOW();
