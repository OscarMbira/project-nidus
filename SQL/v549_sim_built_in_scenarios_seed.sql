-- v549: Built-in NPC scenarios + scenario_seed_data payloads (v505)
-- Prerequisites: sim.scenarios (v66), scenario_code + triggers (v528); if inserts fail with
--   relation "sim.scenarios" inside phase12_max_suffix_sim, apply v550_sim_fix_phase12_max_suffix_sim.sql first.
-- scenario_seed_data (v543).

ALTER TABLE sim.scenarios
  ADD COLUMN IF NOT EXISTS allowed_user_roles TEXT[],
  ADD COLUMN IF NOT EXISTS project_duration_days INTEGER DEFAULT 180,
  ADD COLUMN IF NOT EXISTS project_budget_baseline NUMERIC(14,2);

-- Stable IDs for seed FK references
INSERT INTO sim.scenarios (
  id, scenario_code, name, description, short_description, industry, methodology, difficulty_level,
  duration_minutes, estimated_time_display, is_active, is_featured,
  allowed_user_roles, project_duration_days, project_budget_baseline, scenario_data
) VALUES
(
  'f5050001-0001-4001-8001-000000000001'::uuid,
  'SCN-5051',
  'Infrastructure Modernisation',
  'Legacy dependencies and vendor delays threaten an 18-month infrastructure programme.',
  'Traditional medium scenario — 540 sim days, £2.4M baseline.',
  'Technology',
  'traditional',
  'intermediate',
  180,
  '~3 hours',
  true,
  true,
  ARRAY['project_manager','programme_manager','project_sponsor','team_manager','project_assurance','change_authority'],
  540,
  2400000,
  '{"v505": true, "sim_days": 540, "team_size": 8}'::jsonb
),
(
  'f5050001-0001-4001-8001-000000000002'::uuid,
  'SCN-5052',
  'Digital Product Launch',
  'Agile delivery with regulatory pressure and shifting priorities.',
  'Agile high difficulty — 270 sim days, £950K baseline.',
  'Technology',
  'agile',
  'advanced',
  150,
  '~2.5 hours',
  true,
  true,
  ARRAY['project_manager','team_manager','quality_assurance','project_sponsor'],
  270,
  950000,
  '{"v505": true, "sim_days": 270, "sprints": 6}'::jsonb
),
(
  'f5050001-0001-4001-8001-000000000003'::uuid,
  'SCN-5053',
  'Organisational Restructure',
  'Hybrid governance with political stakeholders and regulatory constraints.',
  'Hybrid expert scenario — 365 sim days, £650K baseline.',
  'Financial Services',
  'hybrid',
  'expert',
  200,
  '~3+ hours',
  true,
  false,
  ARRAY['project_manager','project_sponsor','project_board_member','change_authority'],
  365,
  650000,
  '{"v505": true, "sim_days": 365, "team_size": 5}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  scenario_code = EXCLUDED.scenario_code,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  methodology = EXCLUDED.methodology,
  allowed_user_roles = EXCLUDED.allowed_user_roles,
  project_duration_days = EXCLUDED.project_duration_days,
  project_budget_baseline = EXCLUDED.project_budget_baseline,
  scenario_data = EXCLUDED.scenario_data;

-- Minimal seed payloads (bootstrap service merges into practice project)
INSERT INTO sim.scenario_seed_data (scenario_id, seed_type, seed_payload) VALUES
(
  'f5050001-0001-4001-8001-000000000001'::uuid,
  'risks',
  '{"items":[{"risk_title":"Vendor delay on core platform","risk_description":"Primary supplier slipped milestone by 6 weeks","risk_level":"high","status":"open"},{"risk_title":"Legacy API instability","risk_description":"Intermittent outages affecting migration tests","risk_level":"medium","status":"open"}]}'::jsonb
),
(
  'f5050001-0001-4001-8001-000000000001'::uuid,
  'evm_baseline',
  '{"curve":[{"sim_day":1,"pv":40000},{"sim_day":30,"pv":210000},{"sim_day":120,"pv":900000},{"sim_day":480,"pv":2200000},{"sim_day":540,"pv":2400000}]}'::jsonb
),
(
  'f5050001-0001-4001-8001-000000000001'::uuid,
  'period_actuals',
  '{"points":[{"sim_day":1,"ac":38000},{"sim_day":7,"ac":78000},{"sim_day":14,"ac":125000},{"sim_day":21,"ac":178000},{"sim_day":30,"ac":232000}]}'::jsonb
),
(
  'f5050001-0001-4001-8001-000000000002'::uuid,
  'risks',
  '{"items":[{"risk_title":"Regulatory submission drift","risk_level":"high","status":"open"},{"risk_title":"Scope churn from marketing","risk_level":"medium","status":"open"}]}'::jsonb
),
(
  'f5050001-0001-4001-8001-000000000002'::uuid,
  'evm_baseline',
  '{"curve":[{"sim_day":1,"pv":25000},{"sim_day":270,"pv":950000}]}'::jsonb
),
(
  'f5050001-0001-4001-8001-000000000003'::uuid,
  'issues',
  '{"items":[{"title":"Union consultation delays","severity":"high","status":"open"},{"title":"Data residency clarification","severity":"medium","status":"open"},{"title":"Executive sponsor turnover","severity":"medium","status":"open"}]}'::jsonb
),
(
  'f5050001-0001-4001-8001-000000000003'::uuid,
  'evm_baseline',
  '{"curve":[{"sim_day":1,"pv":65000},{"sim_day":365,"pv":650000}]}'::jsonb
);

DO $$ BEGIN RAISE NOTICE 'v549_sim_built_in_scenarios_seed.sql applied'; END $$;
