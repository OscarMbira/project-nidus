-- =============================================================================
-- v963f_okr_sim_schema_mirror.sql
-- v963 PMIS Core Gap Closure — Phase 8 (GAP-03 OKR): sim schema mirror.
-- Mirrors public.okr_cycles / public.objectives / public.key_results (SQL/v643) into the
-- sim schema so Simulator's OKR routes (currently pointed at nonexistent sim tables) work.
-- OKRs are account-scoped (not project-scoped) in public schema too, so no dependency on
-- sim.practice_projects here. Prerequisites: v66 (sim core schema — sim.update_updated_at).
-- No seed data.
-- =============================================================================

CREATE TABLE IF NOT EXISTS sim.okr_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  cycle_name VARCHAR(120) NOT NULL,
  cycle_code VARCHAR(40) NOT NULL,
  period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('quarter', 'half_year', 'full_year', 'custom')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'closed')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT uq_sim_okr_cycles_code UNIQUE (account_id, cycle_code)
);

CREATE TABLE IF NOT EXISTS sim.objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES sim.okr_cycles(id) ON DELETE CASCADE,
  owner_user_id UUID REFERENCES auth.users(id),
  objective_title VARCHAR(500) NOT NULL,
  objective_description TEXT,
  scope_level VARCHAR(30) NOT NULL DEFAULT 'organisation'
    CHECK (scope_level IN ('organisation', 'department', 'team')),
  health_status VARCHAR(20) NOT NULL DEFAULT 'on_track'
    CHECK (health_status IN ('on_track', 'at_risk', 'behind', 'completed')),
  progress_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_sim_objectives_cycle ON sim.objectives (cycle_id) WHERE is_deleted = FALSE;

CREATE TABLE IF NOT EXISTS sim.key_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID NOT NULL REFERENCES sim.objectives(id) ON DELETE CASCADE,
  kr_title VARCHAR(500) NOT NULL,
  kr_description TEXT,
  target_value NUMERIC(18,4),
  current_value NUMERIC(18,4) DEFAULT 0,
  baseline_value NUMERIC(18,4) DEFAULT 0,
  unit_label VARCHAR(60),
  health_status VARCHAR(20) NOT NULL DEFAULT 'on_track'
    CHECK (health_status IN ('on_track', 'at_risk', 'behind', 'completed')),
  progress_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_sim_key_results_objective ON sim.key_results (objective_id) WHERE is_deleted = FALSE;

-- ── Triggers ─────────────────────────────────────────────────────────────────

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['okr_cycles', 'objectives', 'key_results']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_sim_%s_updated_at ON sim.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_sim_%s_updated_at BEFORE UPDATE ON sim.%I FOR EACH ROW EXECUTE FUNCTION sim.update_updated_at()', t, t);
  END LOOP;
END $$;

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- Mirrors public schema's policy shape (v643): account-scoped for cycles/objectives via
-- is_user_pmo_admin (org-wide PMO admin), scoped to sim's own project-membership check for
-- objectives owned by a specific user; key_results inherit via their parent objective.

ALTER TABLE sim.okr_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.key_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS policy_sim_okr_cycles ON sim.okr_cycles;
CREATE POLICY policy_sim_okr_cycles ON sim.okr_cycles FOR ALL TO authenticated
  USING (public.is_user_pmo_admin(auth.uid()) OR created_by = auth.uid())
  WITH CHECK (public.is_user_pmo_admin(auth.uid()) OR created_by = auth.uid());

DROP POLICY IF EXISTS policy_sim_objectives ON sim.objectives;
CREATE POLICY policy_sim_objectives ON sim.objectives FOR ALL TO authenticated
  USING (public.is_user_pmo_admin(auth.uid()) OR owner_user_id = auth.uid() OR created_by = auth.uid())
  WITH CHECK (public.is_user_pmo_admin(auth.uid()) OR owner_user_id = auth.uid() OR created_by = auth.uid());

DROP POLICY IF EXISTS policy_sim_key_results ON sim.key_results;
CREATE POLICY policy_sim_key_results ON sim.key_results FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sim.objectives o
    WHERE o.id = key_results.objective_id
      AND (public.is_user_pmo_admin(auth.uid()) OR o.owner_user_id = auth.uid() OR o.created_by = auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM sim.objectives o
    WHERE o.id = key_results.objective_id
      AND (public.is_user_pmo_admin(auth.uid()) OR o.owner_user_id = auth.uid() OR o.created_by = auth.uid())
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON sim.okr_cycles, sim.objectives, sim.key_results TO authenticated;

-- ── database_tables registry ────────────────────────────────────────────────

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('sim.okr_cycles', 'Simulator OKR review cycles (GAP-03 sim mirror)', false, true),
  ('sim.objectives', 'Simulator OKR objectives (GAP-03 sim mirror)', false, true),
  ('sim.key_results', 'Simulator OKR key results (GAP-03 sim mirror)', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v963f_okr_sim_schema_mirror.sql completed'; END $$;
