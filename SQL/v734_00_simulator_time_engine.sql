-- v734_00: Simulator turn-based time compression engine tables
-- Prerequisites: sim schema (v66), sim.simulation_runs

CREATE TABLE IF NOT EXISTS sim.simulation_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES sim.simulation_runs(id) ON DELETE CASCADE,
  turn_number INTEGER NOT NULL,
  sim_date_start DATE NOT NULL,
  sim_date_end DATE NOT NULL,
  time_granularity VARCHAR(20) NOT NULL DEFAULT 'monthly'
    CHECK (time_granularity IN ('weekly', 'monthly', 'quarterly')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'review', 'deciding', 'completed', 'skipped')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  decisions_made JSONB NOT NULL DEFAULT '[]'::jsonb,
  events_triggered JSONB NOT NULL DEFAULT '[]'::jsonb,
  metrics_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (run_id, turn_number)
);

CREATE INDEX IF NOT EXISTS idx_simulation_turns_run ON sim.simulation_turns(run_id, turn_number);
CREATE INDEX IF NOT EXISTS idx_simulation_turns_status ON sim.simulation_turns(run_id, status);

CREATE TABLE IF NOT EXISTS sim.turn_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES sim.simulation_runs(id) ON DELETE CASCADE,
  turn_id UUID REFERENCES sim.simulation_turns(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  requires_decision BOOLEAN NOT NULL DEFAULT TRUE,
  decision_options JSONB NOT NULL DEFAULT '[]'::jsonb,
  user_decision VARCHAR(100),
  outcome JSONB,
  target_role VARCHAR(50),
  npc_source VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_turn_events_run ON sim.turn_events(run_id);
CREATE INDEX IF NOT EXISTS idx_turn_events_turn ON sim.turn_events(turn_id);
CREATE INDEX IF NOT EXISTS idx_turn_events_role ON sim.turn_events(target_role);

CREATE TABLE IF NOT EXISTS sim.turn_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES sim.simulation_runs(id) ON DELETE CASCADE,
  turn_id UUID REFERENCES sim.simulation_turns(id) ON DELETE CASCADE,
  turn_number INTEGER NOT NULL,
  metric_category VARCHAR(50) NOT NULL,
  metric_name VARCHAR(100) NOT NULL,
  metric_value NUMERIC,
  trend VARCHAR(10) CHECK (trend IN ('improving', 'stable', 'declining')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_turn_metrics_run ON sim.turn_metrics(run_id, turn_number);
CREATE INDEX IF NOT EXISTS idx_turn_metrics_name ON sim.turn_metrics(run_id, metric_name);

ALTER TABLE sim.simulation_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.turn_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.turn_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS simulation_turns_own ON sim.simulation_turns;
CREATE POLICY simulation_turns_own ON sim.simulation_turns
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.simulation_runs r
      WHERE r.id = simulation_turns.run_id AND r.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.simulation_runs r
      WHERE r.id = simulation_turns.run_id AND r.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS turn_events_own ON sim.turn_events;
CREATE POLICY turn_events_own ON sim.turn_events
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.simulation_runs r
      WHERE r.id = turn_events.run_id AND r.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.simulation_runs r
      WHERE r.id = turn_events.run_id AND r.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS turn_metrics_own ON sim.turn_metrics;
CREATE POLICY turn_metrics_own ON sim.turn_metrics
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.simulation_runs r
      WHERE r.id = turn_metrics.run_id AND r.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.simulation_runs r
      WHERE r.id = turn_metrics.run_id AND r.user_id = auth.uid()
    )
  );

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('sim.simulation_turns', 'Turn-based time periods within a simulation run', false, true),
  ('sim.turn_events', 'Decision events injected into simulation turns', false, true),
  ('sim.turn_metrics', 'KPI snapshots per simulation turn for trend analysis', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();
