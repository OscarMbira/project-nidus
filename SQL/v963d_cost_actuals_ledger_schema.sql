-- =============================================================================
-- v963d: Cost Actuals Ledger — schema (Platform + Simulator)
-- =============================================================================
-- projectplan/v963_pmis_core_gap_closure_plan.md Phase 6 / projectprd/v963_pmis_core_gap_closure_PRD.md
-- user story 4 / PRD decision d.3.
--
-- Gap: cost tracking today is EVM-snapshot-based (project_evm_snapshots — a point-in-time rollup
-- of planned/earned/actual value), not a transaction ledger of individual actual costs,
-- commitments, and accruals against a project's budget. This table is that ledger.
--
-- Explicitly NOT linked to any vendor/invoice table — Procurement (vendors, purchase_orders,
-- invoices, etc.) is out of scope for this whole initiative (PRD decision d.2). Cost Actuals is a
-- general ledger, vendor or not (PRD decision d.3).
--
-- No display_id / Admin ID Generation wiring (rule 16.2) — no natural human-readable reference
-- column; UUID-in-URL is acceptable per rule 16.3's explicit exception for a transaction-log-style
-- record with no obvious unique human label.
--
-- Prerequisites: public.projects/users, public.project_memberships (v820), sim.practice_projects/
-- practice_project_memberships (v80/v227), public.is_user_pmo_admin (v397).
-- =============================================================================

-- ── 1. public.cost_actuals ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.cost_actuals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  transaction_type  VARCHAR(20) NOT NULL CHECK (transaction_type IN ('actual', 'commitment', 'accrual')),
  amount            NUMERIC(15,2) NOT NULL,
  description       TEXT,
  transaction_date  DATE NOT NULL,
  category          VARCHAR(100),
  is_deleted        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES public.users(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES public.users(id)
);

COMMENT ON TABLE public.cost_actuals IS
  'v963d: general transaction ledger of actual costs/commitments/accruals against a project''s '
  'budget — distinct from the EVM-snapshot mechanism (project_evm_snapshots). Not linked to any '
  'vendor/invoice table; Procurement is out of scope for this initiative (PRD v963 decision d.2).';

CREATE INDEX IF NOT EXISTS idx_cost_actuals_project ON public.cost_actuals(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_cost_actuals_type ON public.cost_actuals(transaction_type) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_cost_actuals_date ON public.cost_actuals(transaction_date) WHERE is_deleted = FALSE;

-- ── 2. sim.cost_actuals ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sim.cost_actuals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  transaction_type  VARCHAR(20) NOT NULL CHECK (transaction_type IN ('actual', 'commitment', 'accrual')),
  amount            NUMERIC(15,2) NOT NULL,
  description       TEXT,
  transaction_date  DATE NOT NULL,
  category          VARCHAR(100),
  is_deleted        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES public.users(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES public.users(id)
);

COMMENT ON TABLE sim.cost_actuals IS
  'v963d: Simulator mirror of public.cost_actuals, scoped to the practice hierarchy.';

CREATE INDEX IF NOT EXISTS idx_sim_cost_actuals_project ON sim.cost_actuals(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sim_cost_actuals_type ON sim.cost_actuals(transaction_type) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sim_cost_actuals_date ON sim.cost_actuals(transaction_date) WHERE is_deleted = FALSE;

-- ── 3. database_tables registry ─────────────────────────────────────────────────

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('cost_actuals', 'Cost Actuals ledger: transaction-level actual costs/commitments/accruals against a project budget (v963)', false, true),
  ('sim.cost_actuals', 'Cost Actuals ledger (Simulator): practice-hierarchy mirror of public.cost_actuals (v963)', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

-- ── 4. RLS — public.cost_actuals ────────────────────────────────────────────────

ALTER TABLE public.cost_actuals ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.cost_actuals TO authenticated;
GRANT ALL ON public.cost_actuals TO service_role;

DROP POLICY IF EXISTS policy_cost_actuals_select ON public.cost_actuals;
CREATE POLICY policy_cost_actuals_select ON public.cost_actuals
  FOR SELECT TO authenticated
  USING (
    is_deleted = FALSE
    AND (
      public.is_user_pmo_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.project_memberships pm
        JOIN public.users u ON pm.user_id = u.id
        WHERE u.auth_user_id = auth.uid()
          AND pm.project_id = cost_actuals.project_id
          AND pm.is_active = TRUE
      )
    )
  );

DROP POLICY IF EXISTS policy_cost_actuals_insert ON public.cost_actuals;
CREATE POLICY policy_cost_actuals_insert ON public.cost_actuals
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_memberships pm
      JOIN public.users u ON pm.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
        AND pm.project_id = cost_actuals.project_id
        AND pm.is_active = TRUE
    )
  );

DROP POLICY IF EXISTS policy_cost_actuals_update ON public.cost_actuals;
CREATE POLICY policy_cost_actuals_update ON public.cost_actuals
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_memberships pm
      JOIN public.users u ON pm.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
        AND pm.project_id = cost_actuals.project_id
        AND pm.is_active = TRUE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_memberships pm
      JOIN public.users u ON pm.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
        AND pm.project_id = cost_actuals.project_id
        AND pm.is_active = TRUE
    )
  );

-- ── 5. RLS — sim.cost_actuals ────────────────────────────────────────────────────

ALTER TABLE sim.cost_actuals ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON sim.cost_actuals TO authenticated;
GRANT ALL ON sim.cost_actuals TO service_role;

DROP POLICY IF EXISTS policy_sim_cost_actuals_select ON sim.cost_actuals;
CREATE POLICY policy_sim_cost_actuals_select ON sim.cost_actuals
  FOR SELECT TO authenticated
  USING (
    is_deleted = FALSE
    AND EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = cost_actuals.project_id
        AND (pp.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM sim.practice_project_memberships m
          WHERE m.practice_project_id = pp.id AND m.user_id = auth.uid() AND m.is_active = TRUE
        ))
    )
  );

DROP POLICY IF EXISTS policy_sim_cost_actuals_insert ON sim.cost_actuals;
CREATE POLICY policy_sim_cost_actuals_insert ON sim.cost_actuals
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = cost_actuals.project_id
        AND (pp.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM sim.practice_project_memberships m
          WHERE m.practice_project_id = pp.id AND m.user_id = auth.uid() AND m.is_active = TRUE
        ))
    )
  );

DROP POLICY IF EXISTS policy_sim_cost_actuals_update ON sim.cost_actuals;
CREATE POLICY policy_sim_cost_actuals_update ON sim.cost_actuals
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = cost_actuals.project_id
        AND (pp.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM sim.practice_project_memberships m
          WHERE m.practice_project_id = pp.id AND m.user_id = auth.uid() AND m.is_active = TRUE
        ))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = cost_actuals.project_id
        AND (pp.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM sim.practice_project_memberships m
          WHERE m.practice_project_id = pp.id AND m.user_id = auth.uid() AND m.is_active = TRUE
        ))
    )
  );

DO $$ BEGIN
  RAISE NOTICE 'v963d_cost_actuals_ledger_schema.sql applied successfully';
END $$;
