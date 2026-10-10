-- ============================================================================
-- v1202: Simulator practice execution evidence (PRD v1204 Platform–Simulator parity)
-- ============================================================================
-- projectprd/v1204_test_evidence_revamp_PRD.md
-- projectplan/v1205_test_evidence_revamp_plan.md
--
-- The Simulator execution screen (pages/sim/testing/SimTestRunExecute) writes to
-- sim.practice_test_case_executions (SQL/v348), not public.test_case_executions.
-- This mirrors public.test_case_execution_evidence (SQL/v1201) for the sim schema.
--
-- Removal rule (PRD decision 5), Simulator form:
--   * the uploader may soft-delete their own file while the run is open;
--   * the practice project owner may soft-delete any file at any time.
-- Access uses the SECURITY DEFINER helper sim.auth_user_can_access_practice_project
-- (SQL/v520), not raw JOINs.
--
-- Organisation default is NOT created here: practice projects have no account link.
-- The owner has to decide where the Simulator's organisation default lives first.
-- ============================================================================

-- Project override on practice projects (NULL = inherit the default, once decided).
ALTER TABLE sim.practice_projects
  ADD COLUMN IF NOT EXISTS test_evidence_requirement VARCHAR(16);

ALTER TABLE sim.practice_projects
  DROP CONSTRAINT IF EXISTS chk_practice_projects_test_evidence_requirement;
ALTER TABLE sim.practice_projects
  ADD CONSTRAINT chk_practice_projects_test_evidence_requirement
  CHECK (test_evidence_requirement IS NULL OR test_evidence_requirement IN ('optional', 'required'));

CREATE TABLE IF NOT EXISTS sim.practice_test_case_execution_evidence (
    id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_test_case_execution_id UUID NOT NULL REFERENCES sim.practice_test_case_executions(id) ON DELETE CASCADE,
    run_id                          UUID NOT NULL REFERENCES sim.practice_test_runs(id) ON DELETE CASCADE,
    practice_project_id             UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    storage_bucket                  TEXT NOT NULL DEFAULT 'testing-centre-evidence',
    storage_path                    TEXT NOT NULL,
    file_name                       TEXT NOT NULL,
    mime_type                       TEXT,
    file_size                       BIGINT,
    uploaded_by                     UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at                      TIMESTAMPTZ,
    deleted_by                      UUID REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sim_pt_evidence_execution_live
    ON sim.practice_test_case_execution_evidence(practice_test_case_execution_id)
    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sim_pt_evidence_project
    ON sim.practice_test_case_execution_evidence(practice_project_id);

CREATE OR REPLACE FUNCTION sim.practice_evidence_run_is_open(p_run_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
    SELECT COALESCE(
        (SELECT r.status NOT IN ('completed', 'cancelled', 'aborted')
           FROM sim.practice_test_runs r
          WHERE r.id = p_run_id),
        FALSE
    )
$$;

REVOKE ALL ON FUNCTION sim.practice_evidence_run_is_open(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sim.practice_evidence_run_is_open(UUID) TO authenticated;

-- Owner check for the practice project (Simulator's equivalent of Project Manager here).
CREATE OR REPLACE FUNCTION sim.practice_evidence_is_project_owner(p_practice_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM sim.practice_projects pp
        WHERE pp.id = p_practice_project_id
          AND pp.user_id = sim.get_current_user_id()
    )
$$;

REVOKE ALL ON FUNCTION sim.practice_evidence_is_project_owner(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sim.practice_evidence_is_project_owner(UUID) TO authenticated;

ALTER TABLE sim.practice_test_case_execution_evidence ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON sim.practice_test_case_execution_evidence TO authenticated;

DROP POLICY IF EXISTS policy_sim_pt_evidence_select ON sim.practice_test_case_execution_evidence;
CREATE POLICY policy_sim_pt_evidence_select
    ON sim.practice_test_case_execution_evidence FOR SELECT
    TO authenticated
    USING (sim.auth_user_can_access_practice_project(practice_project_id));

DROP POLICY IF EXISTS policy_sim_pt_evidence_insert ON sim.practice_test_case_execution_evidence;
CREATE POLICY policy_sim_pt_evidence_insert
    ON sim.practice_test_case_execution_evidence FOR INSERT
    TO authenticated
    WITH CHECK (sim.auth_user_can_access_practice_project(practice_project_id));

DROP POLICY IF EXISTS policy_sim_pt_evidence_update ON sim.practice_test_case_execution_evidence;
CREATE POLICY policy_sim_pt_evidence_update
    ON sim.practice_test_case_execution_evidence FOR UPDATE
    TO authenticated
    USING (
        sim.practice_evidence_is_project_owner(practice_project_id)
        OR (
            uploaded_by = public.auth_internal_user_id()
            AND sim.practice_evidence_run_is_open(run_id)
        )
    )
    WITH CHECK (sim.auth_user_can_access_practice_project(practice_project_id));

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('practice_test_case_execution_evidence', 'Simulator practice files attached as evidence to a test case execution, soft-deleted with audit fields', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

NOTIFY pgrst, 'reload schema';
