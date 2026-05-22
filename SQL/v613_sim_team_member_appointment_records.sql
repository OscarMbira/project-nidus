-- =============================================================================
-- v613_sim_team_member_appointment_records.sql
-- Simulator team member appointment ledger
-- =============================================================================

CREATE TABLE IF NOT EXISTS sim.sim_team_member_appointment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  invitation_id UUID REFERENCES sim.entity_invitations(id) ON DELETE SET NULL,
  practice_project_id UUID,
  scenario_id UUID REFERENCES sim.scenarios(id) ON DELETE SET NULL,
  entity_name TEXT NOT NULL DEFAULT '',

  member_role_name VARCHAR(50) NOT NULL,
  role_title VARCHAR(100),
  appointee_user_id UUID NOT NULL REFERENCES public.users(id),
  appointed_by_user_id UUID NOT NULL REFERENCES public.users(id),
  reporting_to_user_id UUID REFERENCES public.users(id),

  assignment_start_date DATE,
  assignment_end_date DATE,
  time_commitment_pct INTEGER
    CONSTRAINT chk_sim_team_appt_time_pct CHECK (time_commitment_pct IS NULL OR time_commitment_pct BETWEEN 1 AND 100),
  primary_responsibilities TEXT,
  required_skills TEXT,
  working_arrangement VARCHAR(20)
    CONSTRAINT chk_sim_team_appt_working
    CHECK (working_arrangement IS NULL OR working_arrangement IN ('remote', 'onsite', 'hybrid')),
  work_location TEXT,
  appointment_message TEXT,

  appointment_status VARCHAR(30) NOT NULL DEFAULT 'pending_acceptance'
    CONSTRAINT chk_sim_team_appt_status
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
  decline_reason VARCHAR(50),
  decline_note TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE sim.sim_team_member_appointment_records ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON sim.sim_team_member_appointment_records TO authenticated;

DROP POLICY IF EXISTS sim_team_appt_sender_all ON sim.sim_team_member_appointment_records;
CREATE POLICY sim_team_appt_sender_all ON sim.sim_team_member_appointment_records
  FOR ALL TO authenticated
  USING (appointed_by_user_id = sim.get_current_user_id())
  WITH CHECK (appointed_by_user_id = sim.get_current_user_id());

DROP POLICY IF EXISTS sim_team_appt_appointee ON sim.sim_team_member_appointment_records;
CREATE POLICY sim_team_appt_appointee ON sim.sim_team_member_appointment_records
  FOR SELECT TO authenticated
  USING (appointee_user_id = sim.get_current_user_id() AND COALESCE(is_deleted, FALSE) = FALSE);

DROP POLICY IF EXISTS sim_team_appt_appointee_update ON sim.sim_team_member_appointment_records;
CREATE POLICY sim_team_appt_appointee_update ON sim.sim_team_member_appointment_records
  FOR UPDATE TO authenticated
  USING (appointee_user_id = sim.get_current_user_id())
  WITH CHECK (appointee_user_id = sim.get_current_user_id());

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES (
  'sim_team_member_appointment_records',
  'Simulator team member appointment ledger (sim schema)',
  false,
  true,
  'simulation'
)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v613_sim_team_member_appointment_records.sql applied'; END $$;
