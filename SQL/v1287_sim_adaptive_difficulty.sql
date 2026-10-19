-- ============================================================================
-- v1287: Simulator adaptive difficulty (PRD D27, story 45; plan SQL #16). sim schema only.
--
-- Rule-based: each simulated day the engine works out a performance band (struggling / on track /
-- excelling) from project health, module scores, stakeholder trust (v1285) and Assessor results
-- (v1286), and moves the run's difficulty level one step (1–5) — always within the scenario
-- author's minimum and maximum. The level tunes the existing template controls (weight, severity
-- cap, cooldown, response time). Options, impacts and scoring are never changed. Every change is
-- logged with its reason in sim.run_difficulty_log (shown in the run's debrief / history).
--
--   * sim.scenarios: adaptive_enabled, min_difficulty, max_difficulty (1–5; authors set them in
--     Admin → AI Centre → Assessor Calibration, Admin SQL v239)
--   * sim.simulation_runs.difficulty_level (starts at the scenario's middle of the range)
--   * sim.run_difficulty_log (run owner reads and adds rows; rows are never changed)
-- Prerequisites: v66, v1285, v1286. Idempotent.
-- ============================================================================

ALTER TABLE sim.scenarios
  ADD COLUMN IF NOT EXISTS adaptive_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS min_difficulty SMALLINT NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS max_difficulty SMALLINT NOT NULL DEFAULT 4;
ALTER TABLE sim.scenarios DROP CONSTRAINT IF EXISTS scenarios_difficulty_range;
ALTER TABLE sim.scenarios ADD CONSTRAINT scenarios_difficulty_range
  CHECK (min_difficulty BETWEEN 1 AND 5 AND max_difficulty BETWEEN 1 AND 5 AND min_difficulty <= max_difficulty);

ALTER TABLE sim.simulation_runs ADD COLUMN IF NOT EXISTS difficulty_level SMALLINT;
ALTER TABLE sim.simulation_runs DROP CONSTRAINT IF EXISTS simulation_runs_difficulty_level_range;
ALTER TABLE sim.simulation_runs ADD CONSTRAINT simulation_runs_difficulty_level_range CHECK (difficulty_level IS NULL OR difficulty_level BETWEEN 1 AND 5);

CREATE TABLE IF NOT EXISTS sim.run_difficulty_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id           UUID NOT NULL REFERENCES sim.simulation_runs(id) ON DELETE CASCADE,
  sim_day          INTEGER,
  band             TEXT NOT NULL CHECK (band IN ('struggling', 'on_track', 'excelling')),
  previous_level   SMALLINT,
  difficulty_level SMALLINT NOT NULL CHECK (difficulty_level BETWEEN 1 AND 5),
  reason           JSONB NOT NULL DEFAULT '{}'::jsonb,   -- the metrics behind the band
  adjustments      JSONB NOT NULL DEFAULT '{}'::jsonb,   -- the template controls in force
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_run_difficulty_log_run ON sim.run_difficulty_log (run_id, created_at);

ALTER TABLE sim.run_difficulty_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sim_run_difficulty_log_read ON sim.run_difficulty_log;
CREATE POLICY sim_run_difficulty_log_read ON sim.run_difficulty_log FOR SELECT TO authenticated USING (public.sim_auth_user_owns_run(run_id));
DROP POLICY IF EXISTS sim_run_difficulty_log_insert ON sim.run_difficulty_log;
CREATE POLICY sim_run_difficulty_log_insert ON sim.run_difficulty_log FOR INSERT TO authenticated WITH CHECK (public.sim_auth_user_owns_run(run_id));
GRANT SELECT, INSERT ON sim.run_difficulty_log TO authenticated;
GRANT ALL ON sim.run_difficulty_log TO service_role;

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES ('sim.run_difficulty_log', 'Simulator: each adaptive difficulty change in a run, with the performance band and reason (v1287)', false, true)
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, updated_at = NOW();

NOTIFY pgrst, 'reload schema';
DO $$ BEGIN RAISE NOTICE 'v1287_sim_adaptive_difficulty.sql completed'; END $$;
