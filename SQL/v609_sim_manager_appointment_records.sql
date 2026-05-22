-- =============================================================================
-- v609_sim_manager_appointment_records.sql
-- Simulator manager appointment ledger (sim schema)
-- Prerequisites: v594 (sim.entity_invitations), v242 (sim.get_current_user_id → public.users.id)
-- =============================================================================

CREATE TABLE IF NOT EXISTS sim.sim_manager_appointment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  invitation_id UUID REFERENCES sim.entity_invitations(id) ON DELETE SET NULL,

  entity_type VARCHAR(20) NOT NULL
    CONSTRAINT chk_sim_manager_appt_entity_type
    CHECK (entity_type IN ('project', 'programme', 'portfolio', 'practice_project', 'scenario')),
  practice_project_id UUID,
  scenario_id UUID REFERENCES sim.scenarios(id) ON DELETE SET NULL,
  entity_name TEXT NOT NULL DEFAULT '',

  manager_role_name VARCHAR(50) NOT NULL,
  appointee_user_id UUID NOT NULL REFERENCES public.users(id),
  appointed_by_user_id UUID NOT NULL REFERENCES public.users(id),
  reporting_to_user_id UUID REFERENCES public.users(id),

  assignment_start_date DATE,
  assignment_end_date DATE,
  time_commitment_pct INTEGER
    CONSTRAINT chk_sim_manager_appt_time_pct CHECK (time_commitment_pct IS NULL OR time_commitment_pct BETWEEN 1 AND 100),
  budget_authority_limit NUMERIC(18, 2),
  authority_notes TEXT,
  reporting_frequency VARCHAR(20)
    CONSTRAINT chk_sim_manager_appt_reporting_freq
    CHECK (reporting_frequency IS NULL OR reporting_frequency IN ('weekly', 'fortnightly', 'monthly', 'as_required')),
  known_constraints TEXT,
  reference_document TEXT,
  appointment_message TEXT,

  appointment_status VARCHAR(30) NOT NULL DEFAULT 'pending_acceptance'
    CONSTRAINT chk_sim_manager_appt_status
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
    CONSTRAINT chk_sim_manager_appt_decline_reason
    CHECK (decline_reason IS NULL OR decline_reason IN ('unavailable', 'skills_mismatch', 'conflict_of_interest', 'overloaded', 'other')),
  decline_note TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

COMMENT ON TABLE sim.sim_manager_appointment_records IS
  'Simulator: formal manager appointment records linked to sim.entity_invitations.';

CREATE INDEX IF NOT EXISTS idx_sim_manager_appt_invitation
  ON sim.sim_manager_appointment_records (invitation_id)
  WHERE invitation_id IS NOT NULL AND COALESCE(is_deleted, FALSE) = FALSE;

CREATE INDEX IF NOT EXISTS idx_sim_manager_appt_appointee
  ON sim.sim_manager_appointment_records (appointee_user_id, appointment_status)
  WHERE COALESCE(is_deleted, FALSE) = FALSE;

ALTER TABLE sim.sim_manager_appointment_records ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON sim.sim_manager_appointment_records TO authenticated;

DROP POLICY IF EXISTS sim_manager_appt_sender_all ON sim.sim_manager_appointment_records;
CREATE POLICY sim_manager_appt_sender_all ON sim.sim_manager_appointment_records
  FOR ALL TO authenticated
  USING (appointed_by_user_id = sim.get_current_user_id())
  WITH CHECK (appointed_by_user_id = sim.get_current_user_id());

DROP POLICY IF EXISTS sim_manager_appt_appointee_select ON sim.sim_manager_appointment_records;
CREATE POLICY sim_manager_appt_appointee_select ON sim.sim_manager_appointment_records
  FOR SELECT TO authenticated
  USING (
    appointee_user_id = sim.get_current_user_id()
    AND COALESCE(is_deleted, FALSE) = FALSE
  );

DROP POLICY IF EXISTS sim_manager_appt_appointee_update ON sim.sim_manager_appointment_records;
CREATE POLICY sim_manager_appt_appointee_update ON sim.sim_manager_appointment_records
  FOR UPDATE TO authenticated
  USING (appointee_user_id = sim.get_current_user_id())
  WITH CHECK (appointee_user_id = sim.get_current_user_id());

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES (
  'sim_manager_appointment_records',
  'Simulator manager appointment ledger (sim schema)',
  false,
  true,
  'simulation'
)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v609_sim_manager_appointment_records.sql applied'; END $$;
