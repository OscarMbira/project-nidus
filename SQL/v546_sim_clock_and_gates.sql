-- v546: Simulation clock + phase gate requirements + stage gate reviews (v505)

CREATE TABLE IF NOT EXISTS sim.sim_clock_ticks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES sim.simulation_runs(id) ON DELETE CASCADE,
  sim_day INTEGER NOT NULL,
  sim_date DATE NOT NULL,
  real_ticked_at TIMESTAMPTZ DEFAULT NOW(),
  events_generated INTEGER DEFAULT 0,
  evm_updated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sim_clock_ticks_run ON sim.sim_clock_ticks (run_id);

CREATE TABLE IF NOT EXISTS sim.phase_gate_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_phase VARCHAR(50) NOT NULL,
  to_phase VARCHAR(50) NOT NULL,
  methodology VARCHAR(20) DEFAULT 'traditional'
    CHECK (methodology IN ('traditional','agile','hybrid')),
  requirement_type VARCHAR(50) NOT NULL
    CHECK (requirement_type IN ('artefact','approval','event','score')),
  artefact_table VARCHAR(100),
  artefact_status_field VARCHAR(50),
  artefact_status_required VARCHAR(50),
  description TEXT NOT NULL,
  is_mandatory BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phase_gate_req_transition ON sim.phase_gate_requirements (from_phase, to_phase, methodology);

CREATE TABLE IF NOT EXISTS sim.stage_gate_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES sim.simulation_runs(id) ON DELETE CASCADE,
  stage_name VARCHAR(50) NOT NULL,
  review_type VARCHAR(30) NOT NULL
    CHECK (review_type IN ('end_stage','exception','closure','sprint_review')),
  status VARCHAR(30) DEFAULT 'pending'
    CHECK (status IN ('pending','submitted','approved','rejected','exception_raised')),
  submitted_at TIMESTAMPTZ,
  board_response JSONB DEFAULT '{}'::jsonb,
  board_decision VARCHAR(30)
    CHECK (board_decision IS NULL OR board_decision IN ('authorized','rejected','exception','deferred')),
  decided_at TIMESTAMPTZ,
  score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stage_gate_reviews_run ON sim.stage_gate_reviews (run_id);

ALTER TABLE sim.sim_clock_ticks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.phase_gate_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.stage_gate_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sim_clock_ticks_owner ON sim.sim_clock_ticks;
CREATE POLICY sim_clock_ticks_owner ON sim.sim_clock_ticks FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM sim.simulation_runs sr WHERE sr.id = run_id AND sr.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM sim.simulation_runs sr WHERE sr.id = run_id AND sr.user_id = auth.uid()));

DROP POLICY IF EXISTS sim_phase_gate_req_read ON sim.phase_gate_requirements;
CREATE POLICY sim_phase_gate_req_read ON sim.phase_gate_requirements FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS sim_stage_gate_reviews_owner ON sim.stage_gate_reviews;
CREATE POLICY sim_stage_gate_reviews_owner ON sim.stage_gate_reviews FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM sim.simulation_runs sr WHERE sr.id = run_id AND sr.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM sim.simulation_runs sr WHERE sr.id = run_id AND sr.user_id = auth.uid()));

-- Seed gate catalogue (idempotent by description keys)
DELETE FROM sim.phase_gate_requirements WHERE description IN (
  'Project Brief approved',
  'Business Case captured (minimum v1)',
  'PID approved',
  'Project Plan approved',
  'Risk register has entries',
  'All work packages complete',
  'End stage report submitted',
  'Sprint retrospective recorded'
);

INSERT INTO sim.phase_gate_requirements (
  from_phase, to_phase, methodology, requirement_type,
  artefact_table, artefact_status_field, artefact_status_required,
  description, is_mandatory
) VALUES
  ('initiation','planning','traditional','artefact','practice_project_briefs','is_approved','true','Project Brief approved', true),
  ('initiation','planning','traditional','artefact','practice_business_cases','document_version','1','Business Case captured (minimum v1)', true),
  ('planning','execution','traditional','artefact','practice_project_initiation_documents','is_approved','true','PID approved', true),
  ('planning','execution','traditional','artefact','practice_project_plans','status','approved','Project Plan approved', false),
  ('planning','execution','traditional','artefact','practice_risks',NULL,'has_entries','Risk register has entries', true),
  ('execution','closure','traditional','artefact','practice_work_packages',NULL,'all_completed','All work packages marked completed', false),
  ('execution','closure','traditional','artefact','practice_end_stage_reports',NULL,'exists','End stage report submitted', true),
  ('execution','execution','agile','event','',NULL,'sprint_retrospective','Sprint retrospective recorded', false);

DO $$ BEGIN RAISE NOTICE 'v546_sim_clock_and_gates.sql applied'; END $$;
