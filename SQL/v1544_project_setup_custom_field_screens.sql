-- ============================================================================
-- v1544: Project Setup — LDE system_screens for Custom Fields tabs (Platform + Simulator)
-- ============================================================================
-- PRD/plan: projectprd/v1347_project_setup_custom_fields_tab_PRD.md
--           projectplan/v1348_project_setup_custom_fields_tab_plan.md
-- Registers Local Data Extensions screens so organisations can map fields to Project Setup
-- record forms. Pages mount RecordCustomFields on a Custom Fields tab (just before Audit).
-- project_detail already exists (v517) — not re-seeded here.
-- Brief and Charter share entity_type project_brief but have separate screen codes.
-- Prerequisites: v515–v519 (Local Data Extensions). Idempotent.
-- ============================================================================

INSERT INTO public.system_screens (module_id, screen_code, screen_name, entity_type, route_hint, sort_order, is_active)
SELECT m.id, v.screen_code, v.screen_name, v.entity_type, v.route_hint, v.sort_order, TRUE
FROM public.system_modules m
JOIN (
  VALUES
    ('projects', 'mandate_detail',                 'Project Mandate',              'project_mandate',               '/platform/project-mandate/:id', 10),
    ('projects', 'brief_detail',                   'Project Brief',                'project_brief',                 '/platform/project-brief/:id', 11),
    ('projects', 'charter_detail',                 'Project Charter',              'project_brief',                 '/platform/project-charter/:id', 12),
    ('projects', 'business_case_detail',           'Business Case (org fields)',   'business_case',                 '/platform/business-case/:id', 13),
    ('projects', 'pid_detail',                     'Project Initiation Document',  'pid',                           '/platform/pids/:id', 14),
    ('projects', 'benefits_review_plan_detail',    'Benefits Review Plan',         'benefits_review_plan',          '/platform/benefits-review-plans/:id', 15),
    ('projects', 'team_charter_detail',            'Team Charter',                 'team_charter',                  '/platform/team-charter', 16),
    ('projects', 'governance_structure_detail',    'Governance Setup',             'project_governance_structure',  '/platform/governance-setup', 17)
) AS v(module_code, screen_code, screen_name, entity_type, route_hint, sort_order)
  ON m.module_code = v.module_code
ON CONFLICT (module_id, screen_code) DO UPDATE SET
  screen_name = EXCLUDED.screen_name,
  entity_type = EXCLUDED.entity_type,
  route_hint = EXCLUDED.route_hint,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE,
  updated_at = NOW();

INSERT INTO sim.system_screens (module_id, screen_code, screen_name, entity_type, route_hint, sort_order, is_active)
SELECT m.id, v.screen_code, v.screen_name, v.entity_type, v.route_hint, v.sort_order, TRUE
FROM sim.system_modules m
JOIN (
  VALUES
    ('projects', 'mandate_detail',                 'Project Mandate',              'project_mandate',               '/simulator/project-mandate/:id', 10),
    ('projects', 'brief_detail',                   'Project Brief',                'project_brief',                 '/simulator/project-brief/:id', 11),
    ('projects', 'charter_detail',                 'Project Charter',              'project_brief',                 '/simulator/project-charter/:id', 12),
    ('projects', 'business_case_detail',           'Business Case (org fields)',   'business_case',                 '/simulator/business-case/:id', 13),
    ('projects', 'pid_detail',                     'Project Initiation Document',  'pid',                           '/simulator/pids/:id', 14),
    ('projects', 'benefits_review_plan_detail',    'Benefits Review Plan',         'benefits_review_plan',          '/simulator/benefits-review-plans/:id', 15),
    ('projects', 'team_charter_detail',            'Team Charter',                 'team_charter',                  '/simulator/team-charter', 16),
    ('projects', 'governance_structure_detail',    'Governance Setup',             'project_governance_structure',  '/simulator/governance-setup', 17)
) AS v(module_code, screen_code, screen_name, entity_type, route_hint, sort_order)
  ON m.module_code = v.module_code
ON CONFLICT (module_id, screen_code) DO UPDATE SET
  screen_name = EXCLUDED.screen_name,
  entity_type = EXCLUDED.entity_type,
  route_hint = EXCLUDED.route_hint,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE,
  updated_at = NOW();

-- Check: 8 public + 8 sim screens expected.
SELECT 'public' AS schema_name, s.screen_code, s.entity_type, m.module_code
FROM public.system_screens s
JOIN public.system_modules m ON m.id = s.module_id
WHERE s.screen_code IN (
  'mandate_detail', 'brief_detail', 'charter_detail', 'business_case_detail',
  'pid_detail', 'benefits_review_plan_detail', 'team_charter_detail', 'governance_structure_detail'
)
UNION ALL
SELECT 'sim', s.screen_code, s.entity_type, m.module_code
FROM sim.system_screens s
JOIN sim.system_modules m ON m.id = s.module_id
WHERE s.screen_code IN (
  'mandate_detail', 'brief_detail', 'charter_detail', 'business_case_detail',
  'pid_detail', 'benefits_review_plan_detail', 'team_charter_detail', 'governance_structure_detail'
)
ORDER BY 1, 2;
