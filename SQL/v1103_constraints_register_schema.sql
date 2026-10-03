-- ============================================================================
-- v1103: constraints_register (Platform public schema)
-- ============================================================================
-- projectplan/v1100_constraints_register_and_assumptions_enrichment_plan.md Phase 0 /
-- projectprd/v1100_constraints_register_and_assumptions_enrichment_PRD.md.
--
-- New standalone Constraints Register, mirroring the shape/conventions of the existing
-- Assumptions Register (public.assumptions, SQL/v26_risk_management.sql + SQL/v963b), since no
-- Constraints equivalent existed anywhere in the codebase. RLS via
-- public.auth_user_can_access_project() (same pattern as SQL/v1025_control_accounts_and_
-- deliverable_register.sql). No display_id / Admin ID Generation wiring (rule 16.3 exception) —
-- constraint descriptions have no natural human-readable reference column, same call already made
-- for public.assumptions (v963b).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.constraints_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  constraint_text TEXT NOT NULL,
  category VARCHAR(50)
    CHECK (category IN ('budget', 'schedule', 'resource', 'regulatory', 'technical', 'other')),
  status VARCHAR(20) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'managed', 'resolved')),
  owner_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  due_date DATE,
  impact_severity VARCHAR(20)
    CHECK (impact_severity IN ('low', 'medium', 'high', 'critical')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES public.users(id),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.users(id)
);

CREATE INDEX IF NOT EXISTS idx_constraints_register_project
  ON public.constraints_register(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_constraints_register_owner
  ON public.constraints_register(owner_user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_constraints_register_status
  ON public.constraints_register(project_id, status) WHERE is_deleted = FALSE;

ALTER TABLE public.constraints_register ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS policy_constraints_register_select ON public.constraints_register;
CREATE POLICY policy_constraints_register_select ON public.constraints_register
  FOR SELECT TO authenticated
  USING (is_deleted = FALSE AND public.auth_user_can_access_project(project_id));

DROP POLICY IF EXISTS policy_constraints_register_insert ON public.constraints_register;
CREATE POLICY policy_constraints_register_insert ON public.constraints_register
  FOR INSERT TO authenticated
  WITH CHECK (public.auth_user_can_access_project(project_id));

DROP POLICY IF EXISTS policy_constraints_register_update ON public.constraints_register;
CREATE POLICY policy_constraints_register_update ON public.constraints_register
  FOR UPDATE TO authenticated
  USING (public.auth_user_can_access_project(project_id))
  WITH CHECK (public.auth_user_can_access_project(project_id));

GRANT SELECT, INSERT, UPDATE ON public.constraints_register TO authenticated;
GRANT ALL ON public.constraints_register TO service_role;

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('constraints_register', 'Project Constraints Register: tracked limitations (budget/schedule/resource/regulatory/technical/other) with owner, due date, impact and status (v1100/v1103)', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v1103: constraints_register created';
END $$;
