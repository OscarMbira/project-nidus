-- ============================================================================
-- v1285: Simulator AI stakeholders (PRD D15, stories 43–44, 47–48; plan SQL #14). sim schema only.
--
--   * sim.npc_characters persona fields, edited by scenario authors in Admin → AI Centre →
--     Stakeholder personas (Admin SQL v239): goals, concerns, priorities, red lines (one per line),
--     persona notes.
--   * sim.npc_run_memory — one row per NPC per run: trust score (−100 … +100), a running summary
--     and the learner's key decisions the NPC remembers. No memory carries across runs.
--     Learners can read their own runs' memory; only the sim-ai-npc edge function writes it
--     (service role, after checking the run belongs to the caller) so trust can't be edited.
--   * sim.npc_user_messages: trust change per reply and whether the reply was AI-written.
--   * sim.npc_trust_band(trust) — 'low' below −30 (escalations speed up), 'high' above +30.
-- Run numbers (health, scores, event selection) stay rule-based; AI wording never changes them.
-- Prerequisites: v540–v548 (NPC tables), v1272. Idempotent.
-- ============================================================================

ALTER TABLE sim.npc_characters
  ADD COLUMN IF NOT EXISTS goals TEXT,
  ADD COLUMN IF NOT EXISTS concerns TEXT,
  ADD COLUMN IF NOT EXISTS priorities TEXT,
  ADD COLUMN IF NOT EXISTS red_lines TEXT,
  ADD COLUMN IF NOT EXISTS persona_notes TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_by_admin UUID;

CREATE TABLE IF NOT EXISTS sim.npc_run_memory (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id           UUID NOT NULL REFERENCES sim.simulation_runs(id) ON DELETE CASCADE,
  npc_character_id UUID NOT NULL REFERENCES sim.npc_characters(id) ON DELETE CASCADE,
  trust_score      INTEGER NOT NULL DEFAULT 0 CHECK (trust_score BETWEEN -100 AND 100),
  summary          TEXT,
  key_decisions    JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(key_decisions) = 'array'),
  interactions     INTEGER NOT NULL DEFAULT 0,
  counted_events   UUID[] NOT NULL DEFAULT '{}',   -- decisions that already moved trust (each counts once)
  last_interaction_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (run_id, npc_character_id)
);
CREATE INDEX IF NOT EXISTS idx_npc_run_memory_run ON sim.npc_run_memory (run_id);
ALTER TABLE sim.npc_run_memory ADD COLUMN IF NOT EXISTS counted_events UUID[] NOT NULL DEFAULT '{}';

ALTER TABLE sim.npc_run_memory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sim_npc_run_memory_owner_read ON sim.npc_run_memory;
CREATE POLICY sim_npc_run_memory_owner_read ON sim.npc_run_memory
  FOR SELECT TO authenticated USING (public.sim_auth_user_owns_run(run_id));
GRANT SELECT ON sim.npc_run_memory TO authenticated;
GRANT ALL ON sim.npc_run_memory TO service_role;

ALTER TABLE sim.npc_user_messages
  ADD COLUMN IF NOT EXISTS trust_delta INTEGER,
  ADD COLUMN IF NOT EXISTS trust_after INTEGER,
  ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN NOT NULL DEFAULT FALSE;

CREATE OR REPLACE FUNCTION sim.npc_trust_band(p_trust INTEGER)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN p_trust < -30 THEN 'low' WHEN p_trust > 30 THEN 'high' ELSE 'neutral' END;
$$;
GRANT EXECUTE ON FUNCTION sim.npc_trust_band(INTEGER) TO authenticated, service_role;

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES ('sim.npc_run_memory', 'Simulator: what each AI stakeholder remembers about the learner in one run — trust, summary, key decisions (v1285)', false, true)
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, updated_at = NOW();

NOTIFY pgrst, 'reload schema';
DO $$ BEGIN RAISE NOTICE 'v1285_sim_npc_ai.sql completed'; END $$;
