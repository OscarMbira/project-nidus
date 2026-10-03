-- ============================================================================
-- v1113: sim.practice_project_industries (Simulator sim schema)
-- ============================================================================
-- projectplan/v1106_project_multi_industry_plan.md Phase 0.
-- Simulator parity for SQL/v1112_project_industries_schema.sql — a genuinely NEW capability for
-- Simulator, not a port: sim.practice_projects has never had an industry field of any kind.
-- industry_category_id references the shared public.industry_categories catalog (same table both
-- apps already read — the industry LIST never diverges between Platform and Simulator, only the
-- per-project tagging does). RLS mirrors sim.practice_constraints (v1132) exactly: ownership of
-- sim.practice_projects OR an active sim.practice_project_memberships row.
-- ============================================================================

CREATE TABLE IF NOT EXISTS sim.practice_project_industries (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id   UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  industry_category_id  UUID NOT NULL REFERENCES public.industry_categories(id),
  is_primary            BOOLEAN NOT NULL DEFAULT FALSE,
  added_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  added_by              UUID REFERENCES public.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE sim.practice_project_industries IS
  'v1106/v1113: multi-industry classification for a practice project (one primary + N secondary). '
  'New capability — sim.practice_projects had no industry field before this. Drives the pm-layout '
  'sidebar industry-pack restriction in useSimMenu.js (previously nonexistent for Simulator) and '
  'the "Add from Built-in Roles" picker default (v1105).';

CREATE UNIQUE INDEX IF NOT EXISTS uq_sim_practice_project_industries_project_industry
  ON sim.practice_project_industries (practice_project_id, industry_category_id);

-- At most one primary industry per practice project.
CREATE UNIQUE INDEX IF NOT EXISTS uq_sim_practice_project_industries_one_primary
  ON sim.practice_project_industries (practice_project_id) WHERE is_primary = TRUE;

CREATE INDEX IF NOT EXISTS idx_sim_practice_project_industries_project
  ON sim.practice_project_industries(practice_project_id);
CREATE INDEX IF NOT EXISTS idx_sim_practice_project_industries_industry_category
  ON sim.practice_project_industries(industry_category_id);

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('sim.practice_project_industries', 'Multi-industry classification for a practice project (one primary + N secondary), new Simulator capability (v1106/v1113)', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

ALTER TABLE sim.practice_project_industries ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.practice_project_industries TO authenticated;
GRANT ALL ON sim.practice_project_industries TO service_role;

DROP POLICY IF EXISTS policy_sim_practice_project_industries_select ON sim.practice_project_industries;
CREATE POLICY policy_sim_practice_project_industries_select ON sim.practice_project_industries
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = practice_project_industries.practice_project_id
        AND (pp.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM sim.practice_project_memberships m
          WHERE m.practice_project_id = pp.id AND m.user_id = auth.uid() AND m.is_active = TRUE
        ))
    )
  );

DROP POLICY IF EXISTS policy_sim_practice_project_industries_insert ON sim.practice_project_industries;
CREATE POLICY policy_sim_practice_project_industries_insert ON sim.practice_project_industries
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = practice_project_industries.practice_project_id
        AND (pp.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM sim.practice_project_memberships m
          WHERE m.practice_project_id = pp.id AND m.user_id = auth.uid() AND m.is_active = TRUE
        ))
    )
  );

DROP POLICY IF EXISTS policy_sim_practice_project_industries_update ON sim.practice_project_industries;
CREATE POLICY policy_sim_practice_project_industries_update ON sim.practice_project_industries
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = practice_project_industries.practice_project_id
        AND (pp.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM sim.practice_project_memberships m
          WHERE m.practice_project_id = pp.id AND m.user_id = auth.uid() AND m.is_active = TRUE
        ))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = practice_project_industries.practice_project_id
        AND (pp.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM sim.practice_project_memberships m
          WHERE m.practice_project_id = pp.id AND m.user_id = auth.uid() AND m.is_active = TRUE
        ))
    )
  );

DROP POLICY IF EXISTS policy_sim_practice_project_industries_delete ON sim.practice_project_industries;
CREATE POLICY policy_sim_practice_project_industries_delete ON sim.practice_project_industries
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = practice_project_industries.practice_project_id
        AND (pp.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM sim.practice_project_memberships m
          WHERE m.practice_project_id = pp.id AND m.user_id = auth.uid() AND m.is_active = TRUE
        ))
    )
  );

DO $$ BEGIN
  RAISE NOTICE 'v1113_sim_practice_project_industries_schema.sql applied successfully';
END $$;
