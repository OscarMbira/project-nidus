-- v542: sim.npc_run_assignments + sim.npc_autonomous_actions (v505)
-- Prerequisites: v540 npc_characters, v66 simulation_runs

CREATE TABLE IF NOT EXISTS sim.npc_run_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES sim.simulation_runs(id) ON DELETE CASCADE,
  role_name VARCHAR(50) NOT NULL,
  npc_character_id UUID NOT NULL REFERENCES sim.npc_characters(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (run_id, role_name)
);

CREATE INDEX IF NOT EXISTS idx_npc_run_assignments_run ON sim.npc_run_assignments (run_id);

CREATE TABLE IF NOT EXISTS sim.npc_autonomous_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES sim.simulation_runs(id) ON DELETE CASCADE,
  npc_character_id UUID NOT NULL REFERENCES sim.npc_characters(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL
    CHECK (action_type IN (
      'work_package_update','checkpoint_report_submitted',
      'quality_review_submitted','change_request_raised',
      'expense_claim_submitted','risk_updated','lesson_logged'
    )),
  action_description TEXT NOT NULL,
  artefact_type VARCHAR(50),
  artefact_id UUID,
  health_impact JSONB DEFAULT '{}'::jsonb,
  sim_day INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_npc_autonomous_run ON sim.npc_autonomous_actions (run_id);

ALTER TABLE sim.npc_run_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.npc_autonomous_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sim_npc_run_assignments_owner ON sim.npc_run_assignments;
CREATE POLICY sim_npc_run_assignments_owner ON sim.npc_run_assignments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.simulation_runs sr
      WHERE sr.id = npc_run_assignments.run_id AND sr.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.simulation_runs sr
      WHERE sr.id = npc_run_assignments.run_id AND sr.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS sim_npc_autonomous_owner ON sim.npc_autonomous_actions;
CREATE POLICY sim_npc_autonomous_owner ON sim.npc_autonomous_actions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.simulation_runs sr
      WHERE sr.id = npc_autonomous_actions.run_id AND sr.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.simulation_runs sr
      WHERE sr.id = npc_autonomous_actions.run_id AND sr.user_id = auth.uid()
    )
  );

DO $$ BEGIN RAISE NOTICE 'v542_sim_npc_run_assignments.sql applied'; END $$;
