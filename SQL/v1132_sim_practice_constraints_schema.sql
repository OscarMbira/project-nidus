-- ============================================================================
-- v1132: sim.practice_constraints (Simulator sim schema)
-- (renamed from v1104 to resolve a filename collision with the unrelated
-- v1104_tasks_functional_role_id.sql — content unchanged, already applied
-- to the database under the original name)
-- ============================================================================
-- projectplan/v1100_constraints_register_and_assumptions_enrichment_plan.md Phase 0 /
-- projectprd/v1100_constraints_register_and_assumptions_enrichment_PRD.md.
--
-- Simulator parity (rule 34.1) for SQL/v1103_constraints_register_schema.sql. Named
-- sim.practice_constraints to match the sim.practice_risks / sim.practice_issues naming
-- convention. RLS mirrors sim.assumptions' existing policy shape (SQL/v963b) exactly: ownership
-- of sim.practice_projects OR an active sim.practice_project_memberships row, matched directly
-- against auth.uid() (v389 convention, no join through public.users needed in sim).
-- ============================================================================

CREATE TABLE IF NOT EXISTS sim.practice_constraints (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  constraint_text   TEXT NOT NULL,
  category          VARCHAR(50)
                      CHECK (category IN ('budget', 'schedule', 'resource', 'regulatory', 'technical', 'other')),
  status            VARCHAR(20) NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open', 'managed', 'resolved')),
  owner_user_id     UUID REFERENCES public.users(id),
  due_date          DATE,
  impact_severity   VARCHAR(20)
                      CHECK (impact_severity IN ('low', 'medium', 'high', 'critical')),
  notes             TEXT,
  is_deleted        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES public.users(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES public.users(id)
);

COMMENT ON TABLE sim.practice_constraints IS
  'v1100/v1104: standalone Simulator Constraints Register, scoped to the practice hierarchy '
  '(sim.practice_projects). Mirrors public.constraints_register (v1103).';

CREATE INDEX IF NOT EXISTS idx_sim_practice_constraints_project ON sim.practice_constraints(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sim_practice_constraints_owner ON sim.practice_constraints(owner_user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sim_practice_constraints_status ON sim.practice_constraints(project_id, status) WHERE is_deleted = FALSE;

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('sim.practice_constraints', 'Constraints Register (Simulator): standalone practice-hierarchy constraints with owner, due date, impact and status (v1100/v1104)', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

ALTER TABLE sim.practice_constraints ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON sim.practice_constraints TO authenticated;
GRANT ALL ON sim.practice_constraints TO service_role;

DROP POLICY IF EXISTS policy_sim_practice_constraints_select ON sim.practice_constraints;
CREATE POLICY policy_sim_practice_constraints_select ON sim.practice_constraints
  FOR SELECT TO authenticated
  USING (
    is_deleted = FALSE
    AND EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = practice_constraints.project_id
        AND (pp.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM sim.practice_project_memberships m
          WHERE m.practice_project_id = pp.id AND m.user_id = auth.uid() AND m.is_active = TRUE
        ))
    )
  );

DROP POLICY IF EXISTS policy_sim_practice_constraints_insert ON sim.practice_constraints;
CREATE POLICY policy_sim_practice_constraints_insert ON sim.practice_constraints
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = practice_constraints.project_id
        AND (pp.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM sim.practice_project_memberships m
          WHERE m.practice_project_id = pp.id AND m.user_id = auth.uid() AND m.is_active = TRUE
        ))
    )
  );

DROP POLICY IF EXISTS policy_sim_practice_constraints_update ON sim.practice_constraints;
CREATE POLICY policy_sim_practice_constraints_update ON sim.practice_constraints
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = practice_constraints.project_id
        AND (pp.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM sim.practice_project_memberships m
          WHERE m.practice_project_id = pp.id AND m.user_id = auth.uid() AND m.is_active = TRUE
        ))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = practice_constraints.project_id
        AND (pp.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM sim.practice_project_memberships m
          WHERE m.practice_project_id = pp.id AND m.user_id = auth.uid() AND m.is_active = TRUE
        ))
    )
  );

DO $$ BEGIN
  RAISE NOTICE 'v1132_sim_practice_constraints_schema.sql applied successfully';
END $$;
