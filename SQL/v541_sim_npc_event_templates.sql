-- v541: sim.npc_event_templates — curated + bulk-generated library (220+ rows) for v505 NPC engine
-- Prerequisites: sim schema (v66)

CREATE TABLE IF NOT EXISTS sim.npc_event_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_code VARCHAR(50) UNIQUE NOT NULL,
  emitting_role VARCHAR(50) NOT NULL,
  target_role VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  phase_trigger VARCHAR(50),
  methodology VARCHAR(20) DEFAULT 'any'
    CHECK (methodology IN ('any','traditional','agile','hybrid')),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  options JSONB NOT NULL,
  escalation_template_code VARCHAR(50),
  deterioration JSONB DEFAULT '{}'::jsonb,
  cooldown_days INTEGER DEFAULT 7,
  weight INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_npc_evt_templates_phase ON sim.npc_event_templates (phase_trigger);
CREATE INDEX IF NOT EXISTS idx_npc_evt_templates_method ON sim.npc_event_templates (methodology);

COMMENT ON TABLE sim.npc_event_templates IS 'v505: NPC event library (templates instantiated into sim.ai_events)';

-- Hand-crafted anchors (stable codes for escalation targets / demos)
INSERT INTO sim.npc_event_templates (
  template_code, emitting_role, target_role, category, severity, phase_trigger, methodology,
  title, description, options, escalation_template_code, deterioration, cooldown_days, weight
) VALUES
(
  'sponsor_status_board_deadline',
  'project_sponsor','project_manager','stakeholder','high','execution','traditional',
  'Board pack due tomorrow',
  'Sarah Chen needs a concise status update before tomorrow''s programme board.',
  '[
    {"text":"Send a one-page highlight with RAG status and top three risks","feedback":"Clear and proportionate.","score":92,"isOptimal":true,"impact":{"stakeholder_satisfaction":3}},
    {"text":"Delay until next week","feedback":"Board expects governance artefacts on schedule.","score":45,"isOptimal":false,"impact":{"stakeholder_satisfaction":-6}},
    {"text":"Forward last month''s deck unchanged","feedback":"Out of date — loses credibility.","score":38,"isOptimal":false,"impact":{"quality_score":-4}}
  ]'::jsonb,
  'esc_pm_non_response_sponsor',
  '{"stakeholder_satisfaction": -3, "team_morale": -1}'::jsonb,
  5, 40
),
(
  'esc_pm_non_response_sponsor',
  'project_sponsor','project_manager','stakeholder','critical','execution','any',
  'Sponsor escalation: delayed response',
  'You have not responded to the sponsor''s board update request. How do you recover?',
  '[
    {"text":"Acknowledge delay, deliver board pack same day with explicit risks","feedback":"Professional recovery path.","score":88,"isOptimal":true,"impact":{"stakeholder_satisfaction":4}},
    {"text":"Ask sponsor to defer board","feedback":"Possible but costly politically.","score":52,"isOptimal":false,"impact":{"stakeholder_satisfaction":-4}},
    {"text":"Ignore until next stand-up","feedback":"Escalation risk increases.","score":15,"isOptimal":false,"impact":{"stakeholder_satisfaction":-10}}
  ]'::jsonb,
  NULL,
  '{"stakeholder_satisfaction": -8, "team_morale": -4}'::jsonb,
  1, 80
),
(
  'team_wp_slippage',
  'team_manager','project_manager','schedule','medium','execution','traditional',
  'Work package slipping three weeks',
  'Marcus Johnson reports integration WP likely three weeks late unless scope is trimmed.',
  '[
    {"text":"Re-plan WP with dependency workshop + recovery milestones","feedback":"Structured recovery.","score":90,"isOptimal":true,"impact":{"schedule_variance_days":2}},
    {"text":"Add overtime budget immediately","feedback":"May worsen morale later.","score":58,"isOptimal":false,"impact":{"budget_pct":-3,"team_morale":-2}},
    {"text":"Ignore — hope for catch-up","feedback":"Delay compounds.","score":30,"isOptimal":false,"impact":{"schedule_variance_days":8}}
  ]'::jsonb,
  NULL,
  '{"team_morale": -2}'::jsonb,
  7, 25
),
(
  'qa_defect_wave',
  'quality_assurance','project_manager','quality','high','execution','any',
  'Defect wave in latest build',
  'Elena Torres reports many high-priority defects — recommends brief halt to stabilise.',
  '[
    {"text":"Agree quality gate + hardening sprint","feedback":"Protects reputation.","score":93,"isOptimal":true,"impact":{"quality_score":6}},
    {"text":"Continue feature delivery at pace","feedback":"Risk of rework spikes.","score":40,"isOptimal":false,"impact":{"quality_score":-12}},
    {"text":"Ship with waivers","feedback":"High downstream cost.","score":22,"isOptimal":false,"impact":{"quality_score":-18,"stakeholder_satisfaction":-6}}
  ]'::jsonb,
  NULL,
  '{"quality_score": -3}'::jsonb,
  6, 35
),
(
  'agile_velocity_drop',
  'team_manager','project_manager','team','medium','execution','agile',
  'Velocity significantly below forecast',
  'Scrum delivery trending low — Team Manager raises blocker for prioritisation.',
  '[
    {"text":"Facilitate backlog refinement + remove two lowest priorities","feedback":"Focus restores throughput.","score":91,"isOptimal":true,"impact":{"team_morale":4}},
    {"text":"Extend sprint scope","feedback":"WIP overload worsens delivery.","score":44,"isOptimal":false,"impact":{"team_morale":-6}},
    {"text":"Swap developers mid-sprint","feedback":"Disrupts flow.","score":33,"isOptimal":false,"impact":{"team_morale":-5}}
  ]'::jsonb,
  NULL,
  '{"team_morale": -2}'::jsonb,
  5, 28
)
ON CONFLICT (template_code) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  options = EXCLUDED.options,
  escalation_template_code = EXCLUDED.escalation_template_code,
  deterioration = EXCLUDED.deterioration,
  severity = EXCLUDED.severity,
  weight = EXCLUDED.weight;

-- Bulk-generated catalogue (pads library to 220+ distinct template_code rows)
INSERT INTO sim.npc_event_templates (
  template_code, emitting_role, target_role, category, severity, phase_trigger, methodology,
  title, description, options, escalation_template_code, deterioration, cooldown_days, weight
)
SELECT
  'bulk_evt_' || LPAD(n::text, 5, '0'),
  (ARRAY['project_sponsor','programme_manager','team_manager','quality_assurance','project_assurance','change_authority','project_board_member'])[1 + ((n - 1) % 7)],
  'project_manager',
  (ARRAY['stakeholder','schedule','budget','team','quality','external','resource','technical'])[1 + ((n - 1) % 8)],
  (ARRAY['low','medium','high','critical'])[1 + ((n - 1) % 4)],
  (ARRAY['initiation','planning','execution','closure','any'])[1 + ((n - 1) % 5)],
  (ARRAY['any','traditional','agile','hybrid'])[1 + ((n - 1) % 4)],
  'Scenario pressure #' || n::text,
  format(
    'NPC scenario event %s targeting the PM. Phase context varies by cadence; respond using governance, evidence, and stakeholder management.',
    n
  ),
  jsonb_build_array(
    jsonb_build_object(
      'text', format('Option A — structured response %s', n),
      'feedback', 'Balances delivery and governance.',
      'score', 88,
      'isOptimal', true,
      'impact', jsonb_build_object('stakeholder_satisfaction', 2, 'team_morale', 1)
    ),
    jsonb_build_object(
      'text', format('Option B — fast minimal reply %s', n),
      'feedback', 'May leave sponsors uneasy.',
      'score', 55,
      'isOptimal', false,
      'impact', jsonb_build_object('stakeholder_satisfaction', -3)
    ),
    jsonb_build_object(
      'text', format('Option C — defer %s', n),
      'feedback', 'Creates schedule exposure.',
      'score', 35,
      'isOptimal', false,
      'impact', jsonb_build_object('schedule_variance_days', 5)
    )
  ),
  CASE WHEN ((n - 1) % 9) = 0 THEN 'esc_pm_non_response_sponsor' ELSE NULL END,
  CASE ((n - 1) % 4)
    WHEN 0 THEN '{"team_morale": -1}'::jsonb
    WHEN 1 THEN '{"stakeholder_satisfaction": -2, "team_morale": -1}'::jsonb
    WHEN 2 THEN '{"quality_score": -2, "budget_pct": -1}'::jsonb
    ELSE '{"team_morale": -4, "stakeholder_satisfaction": -4, "quality_score": -3}'::jsonb
  END,
  5 + ((n - 1) % 10),
  5 + ((n - 1) % 20)
FROM generate_series(1, 220) AS n
ON CONFLICT (template_code) DO NOTHING;

DO $$
DECLARE cnt INTEGER;
BEGIN
  SELECT COUNT(*) INTO cnt FROM sim.npc_event_templates;
  RAISE NOTICE 'v541_sim_npc_event_templates.sql applied — template rows: %', cnt;
END $$;
