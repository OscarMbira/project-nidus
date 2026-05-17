-- v543: sim.scenario_seed_data — JSONB snapshots per scenario (v505)
-- Prerequisites: sim.scenarios (v66)

CREATE TABLE IF NOT EXISTS sim.scenario_seed_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES sim.scenarios(id) ON DELETE CASCADE,
  seed_type VARCHAR(50) NOT NULL
    CHECK (seed_type IN (
      'project_brief','team','risks','stakeholders','budget','schedule',
      'issues','quality_criteria','work_packages','evm_baseline',
      'period_actuals','lessons_starters'
    )),
  seed_payload JSONB NOT NULL,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scenario_seed_scenario ON sim.scenario_seed_data (scenario_id);

ALTER TABLE sim.scenario_seed_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sim_scenario_seed_read ON sim.scenario_seed_data;
CREATE POLICY sim_scenario_seed_read ON sim.scenario_seed_data
  FOR SELECT TO authenticated USING (true);

DO $$ BEGIN RAISE NOTICE 'v543_sim_scenario_seed_data.sql applied'; END $$;
