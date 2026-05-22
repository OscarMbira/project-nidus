-- =============================================================================
-- v610_team_member_appointment_records.sql
-- Team member formal appointment ledger (Platform)
-- Prerequisites: v85, v03
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.team_member_appointment_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  invitation_id UUID REFERENCES public.project_invitations(id) ON DELETE SET NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  member_role_name VARCHAR(50) NOT NULL,
  role_title VARCHAR(100),
  appointee_user_id UUID NOT NULL REFERENCES public.users(id),
  appointed_by_user_id UUID NOT NULL REFERENCES public.users(id),
  reporting_to_user_id UUID REFERENCES public.users(id),

  assignment_start_date DATE,
  assignment_end_date DATE,
  time_commitment_pct INTEGER
    CONSTRAINT chk_team_appt_time_pct CHECK (time_commitment_pct IS NULL OR time_commitment_pct BETWEEN 1 AND 100),
  primary_responsibilities TEXT,
  required_skills TEXT,
  working_arrangement VARCHAR(20)
    CONSTRAINT chk_team_appt_working
    CHECK (working_arrangement IS NULL OR working_arrangement IN ('remote', 'onsite', 'hybrid')),
  work_location TEXT,
  appointment_message TEXT,

  appointment_status VARCHAR(30) NOT NULL DEFAULT 'pending_acceptance'
    CONSTRAINT chk_team_appt_status
    CHECK (appointment_status IN ('pending_acceptance', 'active', 'declined', 'withdrawn', 'ended')),

  accepted_at TIMESTAMPTZ,
  availability_confirmed BOOLEAN,
  actual_start_date DATE,
  conflict_of_interest BOOLEAN,
  coi_detail TEXT,
  skills_acknowledged BOOLEAN,
  acceptance_conditions TEXT,
  initial_observations TEXT,

  declined_at TIMESTAMPTZ,
  decline_reason VARCHAR(50)
    CONSTRAINT chk_team_appt_decline_reason
    CHECK (decline_reason IS NULL OR decline_reason IN ('unavailable', 'skills_mismatch', 'conflict_of_interest', 'overloaded', 'other')),
  decline_note TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

COMMENT ON TABLE public.team_member_appointment_records IS
  'Formal team member assignment ledger linked to project invitations (v593 extension).';

CREATE INDEX IF NOT EXISTS idx_team_appt_invitation ON public.team_member_appointment_records (invitation_id)
  WHERE invitation_id IS NOT NULL AND COALESCE(is_deleted, FALSE) = FALSE;
CREATE INDEX IF NOT EXISTS idx_team_appt_project ON public.team_member_appointment_records (project_id)
  WHERE COALESCE(is_deleted, FALSE) = FALSE;
CREATE INDEX IF NOT EXISTS idx_team_appt_appointee ON public.team_member_appointment_records (appointee_user_id, appointment_status)
  WHERE COALESCE(is_deleted, FALSE) = FALSE;

CREATE TRIGGER trg_team_appt_before_update
  BEFORE UPDATE ON public.team_member_appointment_records
  FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

ALTER TABLE public.team_member_appointment_records ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.team_member_appointment_records TO authenticated;

DROP POLICY IF EXISTS policy_team_appt_pmo_all ON public.team_member_appointment_records;
CREATE POLICY policy_team_appt_pmo_all ON public.team_member_appointment_records
  FOR ALL TO authenticated
  USING (public.is_user_pmo_admin(auth.uid()))
  WITH CHECK (public.is_user_pmo_admin(auth.uid()));

DROP POLICY IF EXISTS policy_team_appt_appointer ON public.team_member_appointment_records;
CREATE POLICY policy_team_appt_appointer ON public.team_member_appointment_records
  FOR ALL TO authenticated
  USING (
    appointed_by_user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
    AND COALESCE(is_deleted, FALSE) = FALSE
  )
  WITH CHECK (
    appointed_by_user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS policy_team_appt_appointee_select ON public.team_member_appointment_records;
CREATE POLICY policy_team_appt_appointee_select ON public.team_member_appointment_records
  FOR SELECT TO authenticated
  USING (
    appointee_user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
    AND COALESCE(is_deleted, FALSE) = FALSE
  );

DROP POLICY IF EXISTS policy_team_appt_appointee_update ON public.team_member_appointment_records;
CREATE POLICY policy_team_appt_appointee_update ON public.team_member_appointment_records
  FOR UPDATE TO authenticated
  USING (
    appointee_user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  )
  WITH CHECK (
    appointee_user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS policy_team_appt_pm_project_select ON public.team_member_appointment_records;
CREATE POLICY policy_team_appt_pm_project_select ON public.team_member_appointment_records
  FOR SELECT TO authenticated
  USING (
    COALESCE(is_deleted, FALSE) = FALSE
    AND project_id IN (
      SELECT id FROM public.projects p
      WHERE p.project_manager_user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
        AND COALESCE(p.is_deleted, FALSE) = FALSE
    )
  );

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES (
  'team_member_appointment_records',
  'Formal team member assignment ledger for project invitations',
  false,
  true,
  'governance'
)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v610_team_member_appointment_records.sql applied'; END $$;
