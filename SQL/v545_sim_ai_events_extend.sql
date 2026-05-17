-- v545: Extend sim.ai_events with NPC / escalation fields (v505)
-- Prerequisites: v540 npc_characters, v541 npc_event_templates

ALTER TABLE sim.ai_events
  ADD COLUMN IF NOT EXISTS npc_character_id UUID REFERENCES sim.npc_characters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS npc_event_template_id UUID REFERENCES sim.npc_event_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS response_options JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS selected_option_index INTEGER,
  ADD COLUMN IF NOT EXISTS escalated BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS escalated_from_event_id UUID REFERENCES sim.ai_events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS auto_deteriorated BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_ai_events_npc ON sim.ai_events (npc_character_id);
CREATE INDEX IF NOT EXISTS idx_ai_events_template ON sim.ai_events (npc_event_template_id);

COMMENT ON COLUMN sim.ai_events.response_options IS 'v505: Multiple-choice options copied from npc_event_templates.options';

DO $$ BEGIN RAISE NOTICE 'v545_sim_ai_events_extend.sql applied'; END $$;
