-- v547: User → NPC messages (v505)
-- Prerequisites: v540 npc_characters, v66 simulation_runs

CREATE TABLE IF NOT EXISTS sim.npc_user_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES sim.simulation_runs(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_npc_character_id UUID NOT NULL REFERENCES sim.npc_characters(id) ON DELETE CASCADE,
  message_type VARCHAR(50) NOT NULL
    CHECK (message_type IN (
      'status_request','report_submission','delegation',
      'approval_request','escalation','general_message'
    )),
  subject VARCHAR(255),
  body TEXT NOT NULL,
  linked_artefact_type VARCHAR(50),
  linked_artefact_id UUID,
  npc_response TEXT,
  npc_response_score INTEGER,
  npc_responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_npc_user_messages_run ON sim.npc_user_messages (run_id);

ALTER TABLE sim.npc_user_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sim_npc_user_messages_owner ON sim.npc_user_messages;
CREATE POLICY sim_npc_user_messages_owner ON sim.npc_user_messages FOR ALL TO authenticated
  USING (
    from_user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM sim.simulation_runs sr WHERE sr.id = run_id AND sr.user_id = auth.uid())
  )
  WITH CHECK (
    from_user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM sim.simulation_runs sr WHERE sr.id = run_id AND sr.user_id = auth.uid())
  );

DO $$ BEGIN RAISE NOTICE 'v547_sim_npc_messaging.sql applied'; END $$;
