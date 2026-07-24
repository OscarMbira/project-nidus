-- v734_05: Competency framework seed per practice role
-- Prerequisites: v734_01 sim.role_competencies

INSERT INTO sim.role_competencies (role_id, competency_key, competency_label, weight, sort_order)
VALUES
  -- Project Manager
  ('project_manager', 'planning_scheduling', 'Planning & Scheduling', 1.2, 10),
  ('project_manager', 'risk_management', 'Risk Management', 1.1, 20),
  ('project_manager', 'stakeholder_management', 'Stakeholder Management', 1.0, 30),
  ('project_manager', 'budget_control', 'Budget Control', 1.0, 40),
  ('project_manager', 'quality_management', 'Quality Management', 0.9, 50),
  ('project_manager', 'change_control', 'Change Control', 1.0, 60),
  ('project_manager', 'team_leadership', 'Team Leadership', 0.9, 70),
  -- Programme Manager
  ('programme_manager', 'strategic_alignment', 'Strategic Alignment', 1.1, 10),
  ('programme_manager', 'benefits_management', 'Benefits Management', 1.2, 20),
  ('programme_manager', 'dependency_management', 'Dependency Management', 1.2, 30),
  ('programme_manager', 'governance', 'Governance', 1.0, 40),
  ('programme_manager', 'stakeholder_engagement', 'Stakeholder Engagement', 1.0, 50),
  ('programme_manager', 'resource_optimisation', 'Resource Optimisation', 1.0, 60),
  ('programme_manager', 'programme_reporting', 'Programme Reporting', 0.9, 70),
  -- Portfolio Manager
  ('portfolio_manager', 'strategic_prioritisation', 'Strategic Prioritisation', 1.2, 10),
  ('portfolio_manager', 'investment_decisions', 'Investment Decision-Making', 1.2, 20),
  ('portfolio_manager', 'portfolio_balancing', 'Portfolio Balancing', 1.1, 30),
  ('portfolio_manager', 'resource_allocation', 'Resource Allocation', 1.0, 40),
  ('portfolio_manager', 'benefits_realisation', 'Benefits Realisation', 1.0, 50),
  ('portfolio_manager', 'risk_appetite', 'Risk Appetite Management', 0.9, 60),
  ('portfolio_manager', 'executive_reporting', 'Executive Reporting', 1.0, 70),
  -- PMO Analyst
  ('pmo_analyst', 'governance_compliance', 'Governance & Compliance', 1.2, 10),
  ('pmo_analyst', 'methodology_knowledge', 'Methodology Knowledge', 1.1, 20),
  ('pmo_analyst', 'reporting_analytics', 'Reporting & Analytics', 1.1, 30),
  ('pmo_analyst', 'process_improvement', 'Process Improvement', 1.0, 40),
  ('pmo_analyst', 'standards_management', 'Standards Management', 1.0, 50),
  ('pmo_analyst', 'audit_assurance', 'Audit & Assurance', 1.0, 60),
  ('pmo_analyst', 'knowledge_management', 'Knowledge Management', 0.9, 70),
  -- Project Coordinator
  ('project_coordinator', 'schedule_management', 'Schedule Management', 1.2, 10),
  ('project_coordinator', 'documentation', 'Documentation', 1.1, 20),
  ('project_coordinator', 'communication', 'Communication', 1.1, 30),
  ('project_coordinator', 'action_tracking', 'Action Tracking', 1.0, 40),
  ('project_coordinator', 'meeting_facilitation', 'Meeting Facilitation', 0.9, 50),
  ('project_coordinator', 'data_accuracy', 'Data Accuracy', 1.0, 60),
  ('project_coordinator', 'stakeholder_coordination', 'Stakeholder Coordination', 1.0, 70)
ON CONFLICT (role_id, competency_key) DO UPDATE SET
  competency_label = EXCLUDED.competency_label,
  weight = EXCLUDED.weight,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE,
  updated_at = NOW();

-- Learning path definitions (modules as JSON array)
INSERT INTO sim.learning_paths (role_id, title, description, sequence, modules, prerequisites, estimated_hours)
SELECT v.role_id, v.title, v.description, v.sequence, v.modules, v.prerequisites, v.estimated_hours
FROM (VALUES
  (
    'project_coordinator'::varchar,
    'Project Coordinator Foundations'::varchar,
    'Entry-level path covering PM fundamentals through RAID management.'::text,
    1,
    '[
      {"id":"coord_fundamentals","title":"PM Fundamentals","order":1},
      {"id":"coord_schedule_docs","title":"Schedule & Document Basics","order":2},
      {"id":"coord_stakeholder_comms","title":"Stakeholder Comms","order":3},
      {"id":"coord_action_raid","title":"Action & RAID Management","order":4}
    ]'::jsonb,
    '[]'::jsonb,
    8::numeric
  ),
  (
    'pmo_analyst',
    'PMO Analyst Certification Path',
    'Governance, standards, reporting, and process improvement.',
    1,
    '[
      {"id":"pmo_methodology","title":"PM Methodology Overview","order":1},
      {"id":"pmo_governance","title":"Governance & Standards","order":2},
      {"id":"pmo_reporting","title":"Reporting & Analytics","order":3},
      {"id":"pmo_compliance","title":"Compliance & Audit","order":4},
      {"id":"pmo_improvement","title":"Process Improvement","order":5}
    ]'::jsonb,
    '[]'::jsonb,
    12
  ),
  (
    'project_manager',
    'Project Manager Professional Path',
    'Full delivery lifecycle from initiation through closure.',
    1,
    '[
      {"id":"pm_initiation","title":"Initiation & Planning","order":1},
      {"id":"pm_delivery","title":"Delivery & Control","order":2},
      {"id":"pm_risk_issues","title":"Risk & Issue Mgmt","order":3},
      {"id":"pm_stakeholders","title":"Stakeholder & Comms","order":4},
      {"id":"pm_evm","title":"EVM & Reporting","order":5},
      {"id":"pm_closure","title":"Closure & Lessons","order":6}
    ]'::jsonb,
    '[]'::jsonb,
    18
  ),
  (
    'programme_manager',
    'Programme Manager Advanced Path',
    'Multi-project coordination, benefits, and governance.',
    1,
    '[
      {"id":"pgm_setup","title":"Programme Setup","order":1},
      {"id":"pgm_dependencies","title":"Dependency & Tranche Mgmt","order":2},
      {"id":"pgm_benefits","title":"Benefits Realisation","order":3},
      {"id":"pgm_governance","title":"Programme Governance","order":4},
      {"id":"pgm_reporting","title":"Programme Reporting","order":5}
    ]'::jsonb,
    '[]'::jsonb,
    15
  ),
  (
    'portfolio_manager',
    'Portfolio Manager Strategic Path',
    'Portfolio strategy, investment, and governance.',
    1,
    '[
      {"id":"pf_strategy","title":"Portfolio Strategy","order":1},
      {"id":"pf_investment","title":"Investment Prioritisation","order":2},
      {"id":"pf_balancing","title":"Portfolio Balancing","order":3},
      {"id":"pf_capacity","title":"Resource Capacity","order":4},
      {"id":"pf_governance","title":"Portfolio Governance","order":5}
    ]'::jsonb,
    '[]'::jsonb,
    14
  )
) AS v(role_id, title, description, sequence, modules, prerequisites, estimated_hours)
WHERE NOT EXISTS (
  SELECT 1 FROM sim.learning_paths lp
  WHERE lp.role_id = v.role_id AND lp.title = v.title
);
