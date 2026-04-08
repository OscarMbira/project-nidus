-- v324: Simulator AI Debriefs and Real-Time Coach Events (sim schema)

-- Post-simulation AI debrief per run
CREATE TABLE IF NOT EXISTS sim.ai_debriefs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id     UUID,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Real-time coaching hint events during a simulation run
CREATE TABLE IF NOT EXISTS sim.ai_coach_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id         UUID,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id      TEXT,
  trigger_reason TEXT CHECK (trigger_reason IN (
    'score_low', 'idle', 'blank_field', 'stage_entry', 'bad_decision'
  )),
  hint_text      TEXT NOT NULL,
  dismissed      BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sim.ai_debriefs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.ai_coach_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own debriefs" ON sim.ai_debriefs;
CREATE POLICY "Users manage own debriefs" ON sim.ai_debriefs
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own coach events" ON sim.ai_coach_events;
CREATE POLICY "Users manage own coach events" ON sim.ai_coach_events
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_sim_ai_debriefs_user_id  ON sim.ai_debriefs(user_id);
CREATE INDEX IF NOT EXISTS idx_sim_ai_debriefs_run_id   ON sim.ai_debriefs(run_id);
CREATE INDEX IF NOT EXISTS idx_sim_coach_events_run_id  ON sim.ai_coach_events(run_id);

-- Note: sim schema tables are managed separately from the public registry
