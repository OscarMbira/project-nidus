-- ============================================================================
-- v1201: Test case execution evidence — files attached to a passed/failed result
-- ============================================================================
-- projectprd/v1204_test_evidence_revamp_PRD.md (decision 1, revised 2026-10)
-- projectplan/v1205_test_evidence_revamp_plan.md (Slice 1–2)
--
-- Evidence attaches to a manual execution row (public.test_case_executions, SQL/v339),
-- the table the execution screen writes to. Files live in the existing
-- 'testing-centre-evidence' storage bucket.
--
-- Removal rule (PRD decision 5):
--   * the uploader may soft-delete their own file while the run is not completed/cancelled/aborted;
--   * a Project Manager may soft-delete any file at any time.
-- Enforced in RLS through SECURITY DEFINER helpers (row_security = off), not raw JOINs.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.test_case_execution_evidence (
    id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_case_execution_id     UUID NOT NULL REFERENCES public.test_case_executions(id) ON DELETE CASCADE,
    run_id                     UUID NOT NULL REFERENCES public.test_runs(id) ON DELETE CASCADE,
    project_id                 UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    storage_bucket             TEXT NOT NULL DEFAULT 'testing-centre-evidence',
    storage_path               TEXT NOT NULL,
    file_name                  TEXT NOT NULL,
    mime_type                  TEXT,
    file_size                  BIGINT,
    uploaded_by               UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at                 TIMESTAMPTZ,
    deleted_by                 UUID REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tcee_execution_live
    ON public.test_case_execution_evidence(test_case_execution_id)
    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tcee_project
    ON public.test_case_execution_evidence(project_id);

-- Run-closed check, used by the removal policy. Row security is off so the check
-- reads the run regardless of the caller's own access to test_runs.
CREATE OR REPLACE FUNCTION public.test_evidence_run_is_open(p_run_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET row_security = off
AS $$
    SELECT COALESCE(
        (SELECT r.status NOT IN ('completed', 'cancelled', 'aborted')
           FROM public.test_runs r
          WHERE r.id = p_run_id),
        FALSE
    )
$$;

REVOKE ALL ON FUNCTION public.test_evidence_run_is_open(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.test_evidence_run_is_open(UUID) TO authenticated;

ALTER TABLE public.test_case_execution_evidence ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.test_case_execution_evidence TO authenticated;

DROP POLICY IF EXISTS policy_tcee_select ON public.test_case_execution_evidence;
CREATE POLICY policy_tcee_select
    ON public.test_case_execution_evidence FOR SELECT
    TO authenticated
    USING (public.auth_user_can_access_project(project_id));

DROP POLICY IF EXISTS policy_tcee_insert ON public.test_case_execution_evidence;
CREATE POLICY policy_tcee_insert
    ON public.test_case_execution_evidence FOR INSERT
    TO authenticated
    WITH CHECK (public.auth_user_can_access_project(project_id));

-- Soft delete is an UPDATE of deleted_at / deleted_by.
DROP POLICY IF EXISTS policy_tcee_update ON public.test_case_execution_evidence;
CREATE POLICY policy_tcee_update
    ON public.test_case_execution_evidence FOR UPDATE
    TO authenticated
    USING (
        public.is_project_manager(auth.uid(), project_id)
        OR (
            uploaded_by = public.auth_internal_user_id()
            AND public.test_evidence_run_is_open(run_id)
        )
    )
    WITH CHECK (public.auth_user_can_access_project(project_id));

-- Register the new table in the ID / database registry (CLAUDE.md database registration rule).
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('test_case_execution_evidence', 'Files attached as evidence to a manual test case execution (passed or failed), soft-deleted with audit fields', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

NOTIFY pgrst, 'reload schema';
