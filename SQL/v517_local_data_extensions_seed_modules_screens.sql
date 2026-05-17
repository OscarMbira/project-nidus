-- =============================================================================
-- v517_local_data_extensions_seed_modules_screens.sql
-- Phase 11 — Seed system_modules + system_screens (idempotent)
-- =============================================================================

INSERT INTO public.system_modules (module_code, module_name, description, sort_order, is_active)
VALUES
  ('portfolio', 'Portfolio', 'Portfolio management', 10, TRUE),
  ('programme', 'Programme', 'Programme management', 20, TRUE),
  ('projects', 'Projects', 'Project delivery', 30, TRUE),
  ('planning', 'Planning', 'Schedules and planning', 40, TRUE),
  ('financial', 'Financial', 'Budget and cost', 50, TRUE),
  ('risk', 'Risk', 'Risk management', 60, TRUE),
  ('issues', 'Issues', 'Issue management', 70, TRUE),
  ('change', 'Change', 'Change control', 80, TRUE),
  ('quality', 'Quality & QA', 'Quality assurance', 90, TRUE),
  ('resources', 'Resources', 'People and capacity', 100, TRUE),
  ('communications', 'Communications', 'Stakeholders and comms', 110, TRUE),
  ('procurement', 'Procurement', 'Procurement and contracts', 120, TRUE),
  ('reporting', 'Reporting', 'Reports and analytics', 130, TRUE),
  ('administration', 'Administration', 'Configuration', 140, TRUE)
ON CONFLICT (module_code) DO UPDATE SET
  module_name = EXCLUDED.module_name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE,
  updated_at = NOW();

-- Screens wired for Phase 11 integrations (entity_type drives renderer lookups)
INSERT INTO public.system_screens (module_id, screen_code, screen_name, entity_type, route_hint, sort_order, is_active)
SELECT m.id, v.screen_code, v.screen_name, v.entity_type, v.route_hint, v.sort_order, TRUE
FROM public.system_modules m
JOIN (
  VALUES
    ('projects', 'project_detail', 'Project details', 'project', '/platform/projects/:id', 1),
    ('risk', 'risk_detail', 'Risk register entry', 'risk', '/platform/projects/:projectId/risks/:riskId', 1),
    ('issues', 'issue_detail', 'Issue register entry', 'issue', '/platform/projects/:projectId/issues/:issueId', 1),
    ('change', 'change_request_detail', 'Change request', 'change_request', '/platform/change-requests/:id', 1)
) AS v(module_code, screen_code, screen_name, entity_type, route_hint, sort_order)
  ON m.module_code = v.module_code
ON CONFLICT (module_id, screen_code) DO UPDATE SET
  screen_name = EXCLUDED.screen_name,
  entity_type = EXCLUDED.entity_type,
  route_hint = EXCLUDED.route_hint,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE,
  updated_at = NOW();
