-- =============================================================================
-- v963q_pmis_gap_phase16_project_clone_sim_and_rls.sql
-- v963 PMIS Core Gap Closure — Phase 16: Project Clone (GAP-22)
--
-- 1) Fixes a real RLS gap: public.project_clone_jobs (v645) was created with no RLS
--    enabled — every authenticated user could read/write every account's clone jobs.
-- 2) Builds sim.project_clone_jobs — Platform-Simulator parity. Simulator's project
--    analog (sim.practice_projects) is single-owner (user_id), not multi-member, so the
--    RLS shape here is simpler than the Platform version's project-membership check.
--
-- Prerequisites: v645 (public.project_clone_jobs), v80 (sim.practice_projects),
-- v397/v398 (public.is_user_pmo_admin), v66 (sim.update_updated_at).
-- =============================================================================

-- ── 1) Close the RLS gap on the existing public table ───────────────────────────

ALTER TABLE public.project_clone_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS policy_project_clone_jobs ON public.project_clone_jobs;
CREATE POLICY policy_project_clone_jobs ON public.project_clone_jobs FOR ALL TO authenticated
  USING (
    public.is_user_pmo_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_projects up
      WHERE up.project_id = project_clone_jobs.source_project_id
        AND up.user_id = auth.uid()
        AND up.is_deleted = FALSE
    )
  )
  WITH CHECK (
    public.is_user_pmo_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_projects up
      WHERE up.project_id = project_clone_jobs.source_project_id
        AND up.user_id = auth.uid()
        AND up.is_deleted = FALSE
    )
  );

-- ── 2) Sim schema mirror ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sim.project_clone_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  target_project_id UUID REFERENCES sim.practice_projects(id) ON DELETE SET NULL,
  clone_options JSONB NOT NULL DEFAULT '{}'::jsonb,
  date_shift_days INTEGER DEFAULT 0,
  job_status VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (job_status IN ('pending', 'running', 'completed', 'failed')),
  error_message TEXT,
  started_by UUID REFERENCES auth.users(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sim_project_clone_jobs_source ON sim.project_clone_jobs (source_project_id);

DROP TRIGGER IF EXISTS trg_sim_project_clone_jobs_updated_at ON sim.project_clone_jobs;
CREATE TRIGGER trg_sim_project_clone_jobs_updated_at BEFORE UPDATE ON sim.project_clone_jobs
  FOR EACH ROW EXECUTE FUNCTION sim.update_updated_at();

ALTER TABLE sim.project_clone_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_sim_project_clone_jobs ON sim.project_clone_jobs;
CREATE POLICY policy_sim_project_clone_jobs ON sim.project_clone_jobs FOR ALL TO authenticated
  USING (
    started_by = auth.uid()
    OR EXISTS (SELECT 1 FROM sim.practice_projects pp WHERE pp.id = project_clone_jobs.source_project_id AND pp.user_id = auth.uid())
  )
  WITH CHECK (
    started_by = auth.uid()
    OR EXISTS (SELECT 1 FROM sim.practice_projects pp WHERE pp.id = project_clone_jobs.source_project_id AND pp.user_id = auth.uid())
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON sim.project_clone_jobs TO authenticated;

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('sim.project_clone_jobs', 'Practice project clone operation job log (GAP-22, Simulator)', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v963q_pmis_gap_phase16_project_clone_sim_and_rls.sql completed'; END $$;
