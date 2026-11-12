-- ============================================================================
-- v1447: Mandate dependencies — access fix (Platform) + Simulator table
-- PRD/plan: projectprd/v1340 / projectplan/v1340 (wave 4 follow-up: mandate dependencies)
--
-- 1. public.mandate_dependencies (v160) gets a Dependencies section on the mandate edit and
--    view pages. Its v162 SELECT policy let any signed-in user read the dependencies of every
--    active mandate in every organisation, and its write policy let a PMO admin of any
--    organisation change them. Both now follow the mandate itself: a dependency is visible
--    only when its mandate is visible to the user (project_mandates RLS, v837), and writable
--    by the mandate's creator or a PM / PMO role holder who can see that mandate.
-- 2. sim.mandate_dependencies is new (parity): the Simulator's practice mandates
--    (sim.project_mandates, v80) had no dependencies table. Rows are private to the owner of
--    the practice mandate (sim.project_mandates.user_id = auth.uid()).
--
-- No reference column, so no Admin ID Generation rule is needed.
-- Idempotent. Run after v1446.
-- ============================================================================

-- ── 1. Platform: dependencies follow their mandate ──────────────────────────

DROP POLICY IF EXISTS policy_mandate_dependencies_auth_select ON public.mandate_dependencies;
CREATE POLICY policy_mandate_dependencies_auth_select
  ON public.mandate_dependencies FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_mandates m
      WHERE m.id = mandate_dependencies.mandate_id
        AND COALESCE(m.is_deleted, FALSE) = FALSE
    )
  );

DROP POLICY IF EXISTS policy_mandate_dependencies_auth_all ON public.mandate_dependencies;
CREATE POLICY policy_mandate_dependencies_auth_all
  ON public.mandate_dependencies FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_mandates m
      WHERE m.id = mandate_dependencies.mandate_id
        AND COALESCE(m.is_deleted, FALSE) = FALSE
        AND (
          m.created_by = public.get_user_id_from_auth(auth.uid())
          OR public.user_has_pmo_role(auth.uid())
          OR public.user_has_pm_role(auth.uid())
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_mandates m
      WHERE m.id = mandate_dependencies.mandate_id
        AND COALESCE(m.is_deleted, FALSE) = FALSE
        AND (
          m.created_by = public.get_user_id_from_auth(auth.uid())
          OR public.user_has_pmo_role(auth.uid())
          OR public.user_has_pm_role(auth.uid())
        )
    )
  );

-- ── 2. Simulator: practice mandate dependencies ─────────────────────────────

CREATE TABLE IF NOT EXISTS sim.mandate_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mandate_id UUID NOT NULL REFERENCES sim.project_mandates(id) ON DELETE CASCADE,
  dependency_type VARCHAR(50) CHECK (dependency_type IN ('internal', 'external', 'interdependency', 'unknown')),
  dependency_description TEXT NOT NULL,
  impact_during_project BOOLEAN NOT NULL DEFAULT TRUE,
  impact_after_implementation BOOLEAN NOT NULL DEFAULT FALSE,
  dependency_status VARCHAR(50) NOT NULL DEFAULT 'identified'
    CHECK (dependency_status IN ('identified', 'analysed', 'managed')),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_sim_mandate_dependencies_mandate_id
  ON sim.mandate_dependencies(mandate_id) WHERE is_deleted = FALSE;

COMMENT ON TABLE sim.mandate_dependencies IS 'Dependencies for simulated project mandates (practice), v1447';

ALTER TABLE sim.mandate_dependencies ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.mandate_dependencies TO authenticated;
GRANT ALL ON sim.mandate_dependencies TO service_role;

DROP POLICY IF EXISTS policy_sim_mandate_dependencies_owner ON sim.mandate_dependencies;
CREATE POLICY policy_sim_mandate_dependencies_owner
  ON sim.mandate_dependencies FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.project_mandates m
      WHERE m.id = mandate_dependencies.mandate_id AND m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.project_mandates m
      WHERE m.id = mandate_dependencies.mandate_id AND m.user_id = auth.uid()
    )
  );

-- Register new table in database_tables registry
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('sim.mandate_dependencies', 'Dependencies for simulated project mandates (practice), with impact during / after the project', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

-- ── Check ───────────────────────────────────────────────────────────────────
SELECT
  -- Expected: only the two policies above. Any other name listed here is an older policy to review.
  (SELECT string_agg(policyname, ', ' ORDER BY policyname) FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'mandate_dependencies') AS public_policies,
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'sim' AND tablename = 'mandate_dependencies') AS sim_policies_expected_1,
  to_regclass('sim.mandate_dependencies') IS NOT NULL AS sim_table_exists;
