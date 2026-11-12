-- ============================================================================
-- v1443: Core PM wave 2b — custom field screens for hand-built record pages (Platform + Simulator)
-- ============================================================================
-- PRD/plan v1340. Registers a Local Data Extensions screen for each main project-scoped hand-built
-- record, so an organisation can define its own fields for it (Local Data Extensions → Field
-- Definitions / Screen Mapping) without a release. The record pages mount the existing
-- CustomFieldRenderer through components/shared-app/RecordCustomFields.jsx (both apps); it shows
-- nothing until fields are published for that screen.
--   Platform (public): assumption, constraint, milestone, deliverable, decision, delay,
--                      stakeholder, benefit, lesson, stage gate
--   Simulator (sim):   assumption, constraint, milestone, delay — the Simulator pages that read
--                      sim tables (its decision, benefit, deliverable and stage gate pages still
--                      read public tables — an existing parity gap, see the v1340 plan review).
-- Prerequisites: v515–v519 (Local Data Extensions). Idempotent (ON CONFLICT … DO UPDATE).
-- ============================================================================

INSERT INTO public.system_screens (module_id, screen_code, screen_name, entity_type, route_hint, sort_order, is_active)
SELECT m.id, v.screen_code, v.screen_name, v.entity_type, v.route_hint, v.sort_order, TRUE
FROM public.system_modules m
JOIN (
  VALUES
    ('risk',           'assumption_detail',  'Assumption',          'assumption',  '/platform/assumptions/:id', 2),
    ('risk',           'constraint_detail',  'Constraint',          'constraint',  '/platform/constraints/:id', 3),
    ('planning',       'milestone_detail',   'Milestone',           'milestone',   '/platform/milestones/:id', 1),
    ('planning',       'delay_detail',       'Delay',               'delay',       '/platform/delays', 2),
    ('projects',       'deliverable_detail', 'Deliverable',         'deliverable', '/platform/deliverable-register/:id', 2),
    ('projects',       'decision_detail',    'Decision log entry',  'decision',    '/platform/governance/decisions/:id', 3),
    ('projects',       'benefit_detail',     'Benefit',             'benefit',     '/platform/benefits/register/:id', 4),
    ('projects',       'stage_gate_detail',  'Stage gate review',   'stage_gate',  '/platform/stage-gates/:id', 5),
    ('communications', 'stakeholder_detail', 'Stakeholder',         'stakeholder', '/platform/stakeholders/register/view/:id', 1),
    ('quality',        'lesson_detail',      'Lesson',              'lesson',      '/platform/lessons/:id', 1)
) AS v(module_code, screen_code, screen_name, entity_type, route_hint, sort_order)
  ON m.module_code = v.module_code
ON CONFLICT (module_id, screen_code) DO UPDATE SET
  screen_name = EXCLUDED.screen_name,
  entity_type = EXCLUDED.entity_type,
  route_hint = EXCLUDED.route_hint,
  is_active = TRUE,
  updated_at = NOW();

INSERT INTO sim.system_screens (module_id, screen_code, screen_name, entity_type, route_hint, sort_order, is_active)
SELECT m.id, v.screen_code, v.screen_name, v.entity_type, v.route_hint, v.sort_order, TRUE
FROM sim.system_modules m
JOIN (
  VALUES
    ('risk',     'assumption_detail', 'Assumption', 'assumption', '/simulator/assumptions/:id', 2),
    ('risk',     'constraint_detail', 'Constraint', 'constraint', '/simulator/constraints/:id', 3),
    ('planning', 'milestone_detail',  'Milestone',  'milestone',  '/simulator/milestones/:id', 1),
    ('planning', 'delay_detail',      'Delay',      'delay',      '/simulator/delays', 2)
) AS v(module_code, screen_code, screen_name, entity_type, route_hint, sort_order)
  ON m.module_code = v.module_code
ON CONFLICT (module_id, screen_code) DO UPDATE SET
  screen_name = EXCLUDED.screen_name,
  entity_type = EXCLUDED.entity_type,
  route_hint = EXCLUDED.route_hint,
  is_active = TRUE,
  updated_at = NOW();

-- Check: the screens now registered (14 expected: 10 public + 4 sim).
SELECT 'public' AS schema_name, s.screen_code, s.entity_type, m.module_code
FROM public.system_screens s JOIN public.system_modules m ON m.id = s.module_id
WHERE s.screen_code IN ('assumption_detail', 'constraint_detail', 'milestone_detail', 'delay_detail', 'deliverable_detail',
                        'decision_detail', 'benefit_detail', 'stage_gate_detail', 'stakeholder_detail', 'lesson_detail')
UNION ALL
SELECT 'sim', s.screen_code, s.entity_type, m.module_code
FROM sim.system_screens s JOIN sim.system_modules m ON m.id = s.module_id
WHERE s.screen_code IN ('assumption_detail', 'constraint_detail', 'milestone_detail', 'delay_detail')
ORDER BY 1, 2;
