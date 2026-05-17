-- v544: Extend sim.simulation_runs for NPC / clock / health / EVM (v505)
-- Prerequisites: sim.practice_projects (for FK)

ALTER TABLE sim.simulation_runs
  ADD COLUMN IF NOT EXISTS user_role VARCHAR(50),
  ADD COLUMN IF NOT EXISTS methodology VARCHAR(20) DEFAULT 'traditional',
  ADD COLUMN IF NOT EXISTS practice_project_id UUID REFERENCES sim.practice_projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS project_health JSONB DEFAULT '{
    "budget_pct": 100,
    "schedule_variance_days": 0,
    "quality_score": 100,
    "team_morale": 100,
    "stakeholder_satisfaction": 100
  }'::jsonb,
  ADD COLUMN IF NOT EXISTS evm_snapshot JSONB DEFAULT '{
    "pv": 0, "ev": 0, "ac": 0,
    "cpi": 1.0, "spi": 1.0,
    "eac": 0, "tcpi": 1.0,
    "period_actuals": []
  }'::jsonb,
  ADD COLUMN IF NOT EXISTS sim_day INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS sim_start_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS phase_events_fired JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS active_stage VARCHAR(50) DEFAULT 'initiation',
  ADD COLUMN IF NOT EXISTS tolerance_breached BOOLEAN DEFAULT FALSE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_simulation_runs_methodology_v505'
  ) THEN
    ALTER TABLE sim.simulation_runs
      ADD CONSTRAINT chk_simulation_runs_methodology_v505
      CHECK (methodology IS NULL OR methodology IN ('traditional','agile','hybrid'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_simulation_runs_practice_project ON sim.simulation_runs (practice_project_id)
  WHERE practice_project_id IS NOT NULL;

COMMENT ON COLUMN sim.simulation_runs.user_role IS 'v505: Role played by the authenticated user in this run';
COMMENT ON COLUMN sim.simulation_runs.practice_project_id IS 'v505: Linked practice project holding artefacts';

DO $$ BEGIN RAISE NOTICE 'v544_sim_simulation_runs_extend.sql applied'; END $$;
