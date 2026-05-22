-- =============================================================================
-- v606_manager_appointment_records.sql
-- Formal manager appointment ledger (Platform public schema)
-- Prerequisites: v85 (project_invitations), v591 (entity scope), v03 (users)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.manager_appointment_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  invitation_id UUID REFERENCES public.project_invitations(id) ON DELETE SET NULL,

  entity_type VARCHAR(20) NOT NULL
    CONSTRAINT chk_manager_appt_entity_type
    CHECK (entity_type IN ('project', 'programme', 'portfolio')),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  programme_id UUID REFERENCES public.programmes(id) ON DELETE CASCADE,
  portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE,

  manager_role_name VARCHAR(50) NOT NULL,
  appointee_user_id UUID NOT NULL REFERENCES public.users(id),
  appointed_by_user_id UUID NOT NULL REFERENCES public.users(id),
  reporting_to_user_id UUID REFERENCES public.users(id),

  assignment_start_date DATE,
  assignment_end_date DATE,
  time_commitment_pct INTEGER
    CONSTRAINT chk_manager_appt_time_pct CHECK (time_commitment_pct IS NULL OR time_commitment_pct BETWEEN 1 AND 100),
  budget_authority_limit NUMERIC(18, 2),
  authority_notes TEXT,
  reporting_frequency VARCHAR(20)
    CONSTRAINT chk_manager_appt_reporting_freq
    CHECK (reporting_frequency IS NULL OR reporting_frequency IN ('weekly', 'fortnightly', 'monthly', 'as_required')),
  known_constraints TEXT,
  reference_document TEXT,
  appointment_message TEXT,

  appointment_status VARCHAR(30) NOT NULL DEFAULT 'pending_acceptance'
    CONSTRAINT chk_manager_appt_status
    CHECK (appointment_status IN ('pending_acceptance', 'active', 'declined', 'withdrawn', 'ended')),

  accepted_at TIMESTAMPTZ,
  availability_confirmed BOOLEAN,
  actual_start_date DATE,
  conflict_of_interest BOOLEAN,
  coi_detail TEXT,
  capability_acknowledged BOOLEAN,
  acceptance_conditions TEXT,
  initial_observations TEXT,

  declined_at TIMESTAMPTZ,
  decline_reason VARCHAR(50)
    CONSTRAINT chk_manager_appt_decline_reason
    CHECK (decline_reason IS NULL OR decline_reason IN ('unavailable', 'skills_mismatch', 'conflict_of_interest', 'overloaded', 'other')),
  decline_note TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,

  CONSTRAINT chk_manager_appt_entity_keys CHECK (
    (entity_type = 'project' AND project_id IS NOT NULL AND programme_id IS NULL AND portfolio_id IS NULL)
    OR (entity_type = 'programme' AND programme_id IS NOT NULL AND project_id IS NULL AND portfolio_id IS NULL)
    OR (entity_type = 'portfolio' AND portfolio_id IS NOT NULL AND project_id IS NULL AND programme_id IS NULL)
  )
);

COMMENT ON TABLE public.manager_appointment_records IS
  'Governance-grade manager appointment ledger linked to project_invitations (v593).';

CREATE INDEX IF NOT EXISTS idx_manager_appt_invitation
  ON public.manager_appointment_records (invitation_id)
  WHERE invitation_id IS NOT NULL AND COALESCE(is_deleted, FALSE) = FALSE;

CREATE INDEX IF NOT EXISTS idx_manager_appt_appointee_status
  ON public.manager_appointment_records (appointee_user_id, appointment_status)
  WHERE COALESCE(is_deleted, FALSE) = FALSE;

CREATE INDEX IF NOT EXISTS idx_manager_appt_entity_project
  ON public.manager_appointment_records (project_id)
  WHERE project_id IS NOT NULL AND COALESCE(is_deleted, FALSE) = FALSE;

CREATE INDEX IF NOT EXISTS idx_manager_appt_entity_programme
  ON public.manager_appointment_records (programme_id)
  WHERE programme_id IS NOT NULL AND COALESCE(is_deleted, FALSE) = FALSE;

CREATE INDEX IF NOT EXISTS idx_manager_appt_entity_portfolio
  ON public.manager_appointment_records (portfolio_id)
  WHERE portfolio_id IS NOT NULL AND COALESCE(is_deleted, FALSE) = FALSE;

CREATE TRIGGER trg_manager_appt_before_update
  BEFORE UPDATE ON public.manager_appointment_records
  FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

ALTER TABLE public.manager_appointment_records ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.manager_appointment_records TO authenticated;

-- PMO / org admins: full access
DROP POLICY IF EXISTS policy_manager_appt_pmo_all ON public.manager_appointment_records;
CREATE POLICY policy_manager_appt_pmo_all ON public.manager_appointment_records
  FOR ALL TO authenticated
  USING (public.is_user_pmo_admin(auth.uid()))
  WITH CHECK (public.is_user_pmo_admin(auth.uid()));

-- Appointee: read + update own (acceptance / decline fields)
DROP POLICY IF EXISTS policy_manager_appt_appointee ON public.manager_appointment_records;
CREATE POLICY policy_manager_appt_appointee ON public.manager_appointment_records
  FOR SELECT TO authenticated
  USING (
    appointee_user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
    AND COALESCE(is_deleted, FALSE) = FALSE
  );

DROP POLICY IF EXISTS policy_manager_appt_appointee_update ON public.manager_appointment_records;
CREATE POLICY policy_manager_appt_appointee_update ON public.manager_appointment_records
  FOR UPDATE TO authenticated
  USING (
    appointee_user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
    AND COALESCE(is_deleted, FALSE) = FALSE
  )
  WITH CHECK (
    appointee_user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  );

-- Appointer: read rows they created
DROP POLICY IF EXISTS policy_manager_appt_appointer_select ON public.manager_appointment_records;
CREATE POLICY policy_manager_appt_appointer_select ON public.manager_appointment_records
  FOR SELECT TO authenticated
  USING (
    appointed_by_user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
    AND COALESCE(is_deleted, FALSE) = FALSE
  );

-- Portfolio manager: read appointments in their portfolios
DROP POLICY IF EXISTS policy_manager_appt_portfolio_scope ON public.manager_appointment_records;
CREATE POLICY policy_manager_appt_portfolio_scope ON public.manager_appointment_records
  FOR SELECT TO authenticated
  USING (
    COALESCE(is_deleted, FALSE) = FALSE
    AND (
      (entity_type = 'portfolio' AND portfolio_id IN (
        SELECT id FROM public.portfolios p
        WHERE p.portfolio_manager_user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
          AND COALESCE(p.is_deleted, FALSE) = FALSE
      ))
      OR (entity_type = 'programme' AND programme_id IN (
        SELECT pr.id FROM public.programmes pr
        INNER JOIN public.portfolios pf ON pf.id = pr.portfolio_id
        WHERE pf.portfolio_manager_user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
          AND COALESCE(pr.is_deleted, FALSE) = FALSE
          AND COALESCE(pf.is_deleted, FALSE) = FALSE
      ))
      OR (entity_type = 'project' AND project_id IN (
        SELECT pp.project_id
        FROM public.programme_projects pp
        INNER JOIN public.programmes pr ON pr.id = pp.programme_id AND COALESCE(pr.is_deleted, FALSE) = FALSE
        INNER JOIN public.portfolios pf ON pf.id = pr.portfolio_id AND COALESCE(pf.is_deleted, FALSE) = FALSE
        INNER JOIN public.projects pj ON pj.id = pp.project_id AND COALESCE(pj.is_deleted, FALSE) = FALSE
        WHERE pf.portfolio_manager_user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
          AND COALESCE(pp.is_deleted, FALSE) = FALSE
      ))
    )
  );

-- Programme manager: read appointments for their programmes / projects
DROP POLICY IF EXISTS policy_manager_appt_programme_scope ON public.manager_appointment_records;
CREATE POLICY policy_manager_appt_programme_scope ON public.manager_appointment_records
  FOR SELECT TO authenticated
  USING (
    COALESCE(is_deleted, FALSE) = FALSE
    AND (
      (entity_type = 'programme' AND programme_id IN (
        SELECT id FROM public.programmes pr
        WHERE pr.programme_manager_user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
          AND COALESCE(pr.is_deleted, FALSE) = FALSE
      ))
      OR (entity_type = 'project' AND project_id IN (
        SELECT pp.project_id
        FROM public.programme_projects pp
        INNER JOIN public.programmes pr ON pr.id = pp.programme_id AND COALESCE(pr.is_deleted, FALSE) = FALSE
        INNER JOIN public.projects pj ON pj.id = pp.project_id AND COALESCE(pj.is_deleted, FALSE) = FALSE
        WHERE pr.programme_manager_user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
          AND COALESCE(pp.is_deleted, FALSE) = FALSE
      ))
    )
  );

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES (
  'manager_appointment_records',
  'Formal PM/Programme/Portfolio manager appointment ledger linked to invitations',
  false,
  true,
  'governance'
)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v606_manager_appointment_records.sql applied'; END $$;
