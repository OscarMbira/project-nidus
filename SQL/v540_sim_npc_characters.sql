-- v540: sim.npc_characters — NPC role engine (v505)
-- Prerequisites: sim schema (v66), uuid extension

CREATE TABLE IF NOT EXISTS sim.npc_characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name VARCHAR(50) NOT NULL,
  character_name VARCHAR(100) NOT NULL,
  character_initials VARCHAR(3) NOT NULL,
  avatar_colour VARCHAR(20) DEFAULT 'blue',
  personality VARCHAR(30) DEFAULT 'balanced'
    CHECK (personality IN ('demanding','supportive','cautious','optimistic','balanced')),
  communication_style TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_npc_characters_role_name ON sim.npc_characters (role_name);

COMMENT ON TABLE sim.npc_characters IS 'v505: Named NPC personas mapped from simulator roles';

INSERT INTO sim.npc_characters (role_name, character_name, character_initials, avatar_colour, personality, communication_style) VALUES
  ('project_sponsor', 'Sarah Chen', 'SC', 'purple', 'demanding', 'Direct, board-focused updates.'),
  ('programme_manager', 'James Okafor', 'JO', 'indigo', 'cautious', 'Cross-program coordination.'),
  ('project_manager', 'Alex Rivera', 'AR', 'blue', 'balanced', 'Structured cadence.'),
  ('team_manager', 'Marcus Johnson', 'MJ', 'green', 'optimistic', 'Team-centric.'),
  ('project_assurance', 'Priya Patel', 'PP', 'amber', 'cautious', 'Compliance-aware.'),
  ('change_authority', 'David Smith', 'DS', 'orange', 'balanced', 'Change governance.'),
  ('quality_assurance', 'Elena Torres', 'ET', 'red', 'demanding', 'Quality bar enforcement.'),
  ('team_member', 'Liam Nakamura', 'LN', 'teal', 'supportive', 'Collaborative.'),
  ('project_board_member', 'Fatima Al-Said', 'FA', 'violet', 'balanced', 'Governance lens.')
ON CONFLICT (role_name) DO UPDATE SET
  character_name = EXCLUDED.character_name,
  character_initials = EXCLUDED.character_initials,
  avatar_colour = EXCLUDED.avatar_colour,
  personality = EXCLUDED.personality,
  communication_style = EXCLUDED.communication_style;

DO $$
BEGIN
  RAISE NOTICE 'v540_sim_npc_characters.sql applied';
END $$;
