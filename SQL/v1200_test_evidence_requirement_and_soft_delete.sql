-- ============================================================================
-- v1200: Passed-test evidence — settings and soft delete (PRD v1204, Slice 0)
-- ============================================================================
-- projectprd/v1204_test_evidence_revamp_PRD.md
-- projectplan/v1205_test_evidence_revamp_plan.md
--
-- 1. Organisation default (accounts.test_evidence_default) — same pattern as
--    v673 methodology setting on public.accounts.
-- 2. Project override (projects.test_evidence_requirement) — NULL = inherit.
-- 3. Soft delete on tc_evidence_files (public + sim) so removed files stay in
--    the audit history and are excluded from reads.
--
-- No new tables are created, so no database_tables registration is needed.
-- ============================================================================

-- 1. Organisation default --------------------------------------------------------
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS test_evidence_default VARCHAR(16) NOT NULL DEFAULT 'optional';

ALTER TABLE public.accounts
  DROP CONSTRAINT IF EXISTS chk_accounts_test_evidence_default;
ALTER TABLE public.accounts
  ADD CONSTRAINT chk_accounts_test_evidence_default
  CHECK (test_evidence_default IN ('optional', 'required'));

-- 2. Project override ------------------------------------------------------------
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS test_evidence_requirement VARCHAR(16);

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS chk_projects_test_evidence_requirement;
ALTER TABLE public.projects
  ADD CONSTRAINT chk_projects_test_evidence_requirement
  CHECK (test_evidence_requirement IS NULL OR test_evidence_requirement IN ('optional', 'required'));

-- 3. Soft delete on evidence files -----------------------------------------------
ALTER TABLE public.tc_evidence_files
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tc_evidence_files_live
  ON public.tc_evidence_files(tc_test_run_result_id)
  WHERE deleted_at IS NULL;

-- Simulator mirror (sim.tc_evidence_files exists per v494). The sim project
-- override is added only where sim.projects exists.
ALTER TABLE sim.tc_evidence_files
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sim_tc_evidence_files_live
  ON sim.tc_evidence_files(tc_test_run_result_id)
  WHERE deleted_at IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'sim' AND table_name = 'projects'
  ) THEN
    EXECUTE 'ALTER TABLE sim.projects ADD COLUMN IF NOT EXISTS test_evidence_requirement VARCHAR(16)';
    EXECUTE 'ALTER TABLE sim.projects DROP CONSTRAINT IF EXISTS chk_sim_projects_test_evidence_requirement';
    EXECUTE 'ALTER TABLE sim.projects ADD CONSTRAINT chk_sim_projects_test_evidence_requirement
             CHECK (test_evidence_requirement IS NULL OR test_evidence_requirement IN (''optional'', ''required''))';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
