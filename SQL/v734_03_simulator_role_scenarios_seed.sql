-- v734_03: Scenario templates per v734 practice role (structure only — content via admin)
-- Prerequisites: v734_01

INSERT INTO sim.scenarios (
  name,
  short_description,
  description,
  industry,
  methodology,
  difficulty_level,
  target_role,
  duration_minutes,
  estimated_time_display,
  is_premium,
  is_active,
  is_featured,
  scenario_data,
  learning_objectives,
  skills_covered,
  sort_order
)
SELECT
  v.name,
  v.short_description,
  v.description,
  v.industry,
  v.methodology,
  v.difficulty_level,
  v.target_role,
  v.duration_minutes,
  v.estimated_time_display,
  v.is_premium,
  FALSE,
  FALSE,
  v.scenario_data,
  v.learning_objectives,
  v.skills_covered,
  v.sort_order
FROM (VALUES
  (
    'PM: Project Initiation Challenge',
    'Plan and kick off a new delivery project under stakeholder pressure.',
    'Practice project initiation, charter approval, and early risk identification as a Project Manager.',
    'General',
    'structured',
    'intermediate',
    'project_manager',
    120,
    '2 hours',
    FALSE,
    '{"template_code":"pm_initiation","turns":12,"granularity":"monthly"}'::jsonb,
    '["Initiation","Planning","Stakeholder management"]'::jsonb,
    '["Planning & Scheduling","Stakeholder Management"]'::jsonb,
    10
  ),
  (
    'PM: Scope Creep Recovery',
    'Control escalating scope changes while protecting delivery dates.',
    'Navigate scope creep, change control, and sponsor negotiations.',
    'IT/Software',
    'structured',
    'advanced',
    'project_manager',
    150,
    '2.5 hours',
    TRUE,
    '{"template_code":"pm_scope_creep","turns":18,"granularity":"monthly"}'::jsonb,
    '["Change control","Scope management"]'::jsonb,
    '["Change Control","Budget Control"]'::jsonb,
    20
  ),
  (
    'Programme: Dependency Failure',
    'Replan a programme when a critical cross-project dependency fails.',
    'Coordinate multiple projects and rebalance tranches after a dependency slip.',
    'Construction',
    'structured',
    'expert',
    'programme_manager',
    180,
    '3 hours',
    TRUE,
    '{"template_code":"pgm_dependency_failure","turns":24,"granularity":"monthly"}'::jsonb,
    '["Dependency management","Benefits tracking"]'::jsonb,
    '["Dependency Management","Governance"]'::jsonb,
    30
  ),
  (
    'Portfolio: Budget Rebalancing',
    'Re-prioritise portfolio investments after a funding cut.',
    'Balance strategic objectives against reduced budget and competing programmes.',
    'General',
    'structured',
    'expert',
    'portfolio_manager',
    150,
    '2.5 hours',
    TRUE,
    '{"template_code":"pf_budget_rebalance","turns":8,"granularity":"quarterly"}'::jsonb,
    '["Investment prioritisation","Portfolio balancing"]'::jsonb,
    '["Strategic Prioritisation","Investment Decision-Making"]'::jsonb,
    40
  ),
  (
    'PMO: Governance Audit Findings',
    'Respond to audit findings and improve PM methodology compliance.',
    'Address compliance gaps, reporting accuracy, and standards rollout resistance.',
    'General',
    'structured',
    'intermediate',
    'pmo_analyst',
    120,
    '2 hours',
    FALSE,
    '{"template_code":"pmo_audit_findings","turns":12,"granularity":"monthly"}'::jsonb,
    '["Governance","Compliance"]'::jsonb,
    '["Governance & Compliance","Reporting & Analytics"]'::jsonb,
    50
  ),
  (
    'Coordinator: Schedule Slippage Tracking',
    'Maintain schedules and RAID logs when delivery dates slip.',
    'Track actions, document control, and stakeholder communications under pressure.',
    'General',
    'structured',
    'beginner',
    'project_coordinator',
    90,
    '1.5 hours',
    FALSE,
    '{"template_code":"coord_schedule_slip","turns":12,"granularity":"weekly"}'::jsonb,
    '["Scheduling","Documentation"]'::jsonb,
    '["Schedule Management","Documentation"]'::jsonb,
    60
  )
) AS v(
  name, short_description, description, industry, methodology, difficulty_level,
  target_role, duration_minutes, estimated_time_display, is_premium,
  scenario_data, learning_objectives, skills_covered, sort_order
)
WHERE NOT EXISTS (
  SELECT 1 FROM sim.scenarios s
  WHERE s.scenario_data->>'template_code' = v.scenario_data->>'template_code'
);
