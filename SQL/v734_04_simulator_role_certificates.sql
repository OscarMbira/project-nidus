-- v734_04: Role-specific certificate templates
-- Prerequisites: sim.certificates (v66), v734_01

CREATE TABLE IF NOT EXISTS sim.certificate_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_code VARCHAR(80) NOT NULL UNIQUE,
  role_id VARCHAR(50) NOT NULL,
  certificate_name VARCHAR(255) NOT NULL,
  certificate_type VARCHAR(50) NOT NULL DEFAULT 'role_mastery',
  description TEXT,
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  min_score NUMERIC(5,2),
  required_modules JSONB NOT NULL DEFAULT '[]'::jsonb,
  required_scenarios JSONB NOT NULL DEFAULT '[]'::jsonb,
  visual_theme VARCHAR(50) NOT NULL DEFAULT 'default',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE sim.certificate_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS certificate_templates_read ON sim.certificate_templates;
CREATE POLICY certificate_templates_read ON sim.certificate_templates
  FOR SELECT TO authenticated
  USING (is_active = TRUE);

INSERT INTO sim.certificate_templates (
  template_code, role_id, certificate_name, description, criteria, min_score, required_modules, visual_theme
) VALUES
  (
    'coord_foundations',
    'project_coordinator',
    'Project Coordinator Foundations',
    'Complete all coordinator learning modules.',
    '{"type":"learning_path","module_count":4}'::jsonb,
    70,
    '["coord_fundamentals","coord_schedule_docs","coord_stakeholder_comms","coord_action_raid"]'::jsonb,
    'coordinator'
  ),
  (
    'pmo_analyst_certified',
    'pmo_analyst',
    'PMO Analyst Certified',
    'Complete PMO modules and pass governance audit scenario.',
    '{"type":"learning_path_plus_scenario","scenario_template":"pmo_audit_findings"}'::jsonb,
    75,
    '["pmo_methodology","pmo_governance","pmo_reporting","pmo_compliance","pmo_improvement"]'::jsonb,
    'pmo_analyst'
  ),
  (
    'pm_professional',
    'project_manager',
    'Project Manager Professional',
    'Complete PM modules and three advanced scenarios at 80%+.',
    '{"type":"learning_path_plus_scenarios","scenario_count":3,"min_avg_score":80}'::jsonb,
    80,
    '["pm_initiation","pm_delivery","pm_risk_issues","pm_stakeholders","pm_evm","pm_closure"]'::jsonb,
    'project_manager'
  ),
  (
    'pgm_advanced',
    'programme_manager',
    'Programme Manager Advanced',
    'Complete programme modules and multi-project scenario at 85%+.',
    '{"type":"learning_path_plus_scenario","scenario_template":"pgm_dependency_failure","min_score":85}'::jsonb,
    85,
    '["pgm_setup","pgm_dependencies","pgm_benefits","pgm_governance","pgm_reporting"]'::jsonb,
    'programme_manager'
  ),
  (
    'pf_strategic',
    'portfolio_manager',
    'Portfolio Manager Strategic',
    'Complete portfolio modules and rebalancing scenario at 85%+.',
    '{"type":"learning_path_plus_scenario","scenario_template":"pf_budget_rebalance","min_score":85}'::jsonb,
    85,
    '["pf_strategy","pf_investment","pf_balancing","pf_capacity","pf_governance"]'::jsonb,
    'portfolio_manager'
  )
ON CONFLICT (template_code) DO UPDATE SET
  certificate_name = EXCLUDED.certificate_name,
  description = EXCLUDED.description,
  criteria = EXCLUDED.criteria,
  min_score = EXCLUDED.min_score,
  required_modules = EXCLUDED.required_modules,
  visual_theme = EXCLUDED.visual_theme,
  updated_at = NOW();

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('sim.certificate_templates', 'Role-specific certificate eligibility templates for the simulator', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();
