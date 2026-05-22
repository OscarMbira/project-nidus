-- =============================================================================
-- v594_sim_entity_invitations.sql
-- Simulator invitation tracker table (sim schema)
-- Prerequisites: v66 (sim.scenarios), v242 (sim.get_current_user_id)
-- =============================================================================

CREATE TABLE IF NOT EXISTS sim.entity_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID REFERENCES sim.scenarios(id) ON DELETE SET NULL,
  entity_type VARCHAR(20) NOT NULL DEFAULT 'scenario'
    CONSTRAINT chk_sim_entity_invitations_entity_type
    CHECK (entity_type IN ('scenario', 'practice_project', 'portfolio', 'programme', 'project')),
  entity_name TEXT NOT NULL DEFAULT '',
  invited_email VARCHAR(255) NOT NULL,
  invited_first_name VARCHAR(100),
  invited_last_name VARCHAR(100),
  role_name VARCHAR(120),
  role_display_name VARCHAR(200),
  invited_by_user_id UUID NOT NULL REFERENCES public.users(id),
  invitation_token VARCHAR(255) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  invitation_message TEXT,
  invitation_status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CONSTRAINT chk_sim_entity_invitations_status
    CHECK (invitation_status IN ('pending', 'accepted', 'declined', 'expired', 'cancelled')),
  invitation_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invitation_expires_at TIMESTAMPTZ,
  reminder_sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  invitation_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE sim.entity_invitations IS
  'Simulator: practice invitation records for PMO/PM invitation tracker (scenario-linked, free-text entity name).';

CREATE INDEX IF NOT EXISTS idx_sim_entity_invitations_invited_by
  ON sim.entity_invitations (invited_by_user_id)
  WHERE COALESCE(is_deleted, FALSE) = FALSE;

CREATE INDEX IF NOT EXISTS idx_sim_entity_invitations_status
  ON sim.entity_invitations (invitation_status)
  WHERE COALESCE(is_deleted, FALSE) = FALSE;

CREATE INDEX IF NOT EXISTS idx_sim_entity_invitations_scenario
  ON sim.entity_invitations (scenario_id)
  WHERE scenario_id IS NOT NULL AND COALESCE(is_deleted, FALSE) = FALSE;

ALTER TABLE sim.entity_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sim_entity_invitations_sender_select ON sim.entity_invitations;
CREATE POLICY sim_entity_invitations_sender_select ON sim.entity_invitations
  FOR SELECT TO authenticated
  USING (
    invited_by_user_id = sim.get_current_user_id()
    AND COALESCE(is_deleted, FALSE) = FALSE
  );

DROP POLICY IF EXISTS sim_entity_invitations_sender_insert ON sim.entity_invitations;
CREATE POLICY sim_entity_invitations_sender_insert ON sim.entity_invitations
  FOR INSERT TO authenticated
  WITH CHECK (invited_by_user_id = sim.get_current_user_id());

DROP POLICY IF EXISTS sim_entity_invitations_sender_update ON sim.entity_invitations;
CREATE POLICY sim_entity_invitations_sender_update ON sim.entity_invitations
  FOR UPDATE TO authenticated
  USING (
    invited_by_user_id = sim.get_current_user_id()
    AND invitation_status = 'pending'
    AND COALESCE(is_deleted, FALSE) = FALSE
  )
  WITH CHECK (invited_by_user_id = sim.get_current_user_id());

DROP POLICY IF EXISTS sim_entity_invitations_pmo_select ON sim.entity_invitations;
CREATE POLICY sim_entity_invitations_pmo_select ON sim.entity_invitations
  FOR SELECT TO authenticated
  USING (
    public.is_pmo_admin_user()
    AND COALESCE(is_deleted, FALSE) = FALSE
  );

GRANT SELECT, INSERT, UPDATE ON sim.entity_invitations TO authenticated;
GRANT ALL ON sim.entity_invitations TO service_role;

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES ('sim.entity_invitations', 'Simulator: entity-scoped practice invitations for tracker UI', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE 'v594_sim_entity_invitations.sql applied';
END $$;
