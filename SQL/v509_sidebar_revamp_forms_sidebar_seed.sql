-- =============================================================================
-- v509_sidebar_revamp_forms_sidebar_seed.sql
-- Purpose: Seed Process Group Forms sidebar rows for PM/PMO (Platform + Simulator)
-- =============================================================================

-- -----------------------------
-- Platform PM Dashboard (public.sidebar_config)
-- -----------------------------
INSERT INTO public.sidebar_config (
  dashboard_type, section_name, document_type, display_label, display_order, route_path, icon_name, is_active
)
VALUES
  ('PM', 'Process Group Forms', 'forms-initiating', 'Initiating', 80, '/pm/projects/:projectId/forms?group=Initiating', 'FileText', TRUE),
  ('PM', 'Process Group Forms', 'forms-planning', 'Planning', 81, '/pm/projects/:projectId/forms?group=Planning', 'FileText', TRUE),
  ('PM', 'Process Group Forms', 'forms-executing', 'Executing', 82, '/pm/projects/:projectId/forms?group=Executing', 'FileText', TRUE),
  ('PM', 'Process Group Forms', 'forms-monitoring', 'Monitoring & Controlling', 83, '/pm/projects/:projectId/forms?group=Monitoring', 'FileText', TRUE),
  ('PM', 'Process Group Forms', 'forms-closing', 'Closing', 84, '/pm/projects/:projectId/forms?group=Closing', 'FileText', TRUE),
  ('PM', 'Process Group Forms', 'forms-agile', 'Agile', 85, '/pm/projects/:projectId/forms?group=Agile', 'FileText', TRUE),
  ('PM', 'Process Group Forms', 'forms-drafts', 'My Drafts', 86, '/pm/projects/:projectId/forms/drafts', 'FileClock', TRUE),
  ('PM', 'Process Group Forms', 'forms-approvals', 'Pending Approvals', 87, '/pm/projects/:projectId/forms?status=in_review', 'FileCheck', TRUE)
ON CONFLICT (dashboard_type, section_name, document_type) DO UPDATE SET
  display_label = EXCLUDED.display_label,
  display_order = EXCLUDED.display_order,
  route_path = EXCLUDED.route_path,
  icon_name = EXCLUDED.icon_name,
  is_active = TRUE,
  updated_at = NOW();

-- -----------------------------
-- Platform PMO Dashboard (public.sidebar_config)
-- -----------------------------
INSERT INTO public.sidebar_config (
  dashboard_type, section_name, document_type, display_label, display_order, route_path, icon_name, is_active
)
VALUES
  ('PMO', 'Process Group Forms', 'forms-initiating', 'Initiating', 90, '/pmo/forms?group=Initiating', 'FileText', TRUE),
  ('PMO', 'Process Group Forms', 'forms-planning', 'Planning', 91, '/pmo/forms?group=Planning', 'FileText', TRUE),
  ('PMO', 'Process Group Forms', 'forms-executing', 'Executing', 92, '/pmo/forms?group=Executing', 'FileText', TRUE),
  ('PMO', 'Process Group Forms', 'forms-monitoring', 'Monitoring & Controlling', 93, '/pmo/forms?group=Monitoring', 'FileText', TRUE),
  ('PMO', 'Process Group Forms', 'forms-closing', 'Closing', 94, '/pmo/forms?group=Closing', 'FileText', TRUE),
  ('PMO', 'Process Group Forms', 'forms-agile', 'Agile', 95, '/pmo/forms?group=Agile', 'FileText', TRUE),
  ('PMO', 'Process Group Forms', 'forms-templates', 'Form Templates', 96, '/platform/admin/form-templates', 'Settings2', TRUE)
ON CONFLICT (dashboard_type, section_name, document_type) DO UPDATE SET
  display_label = EXCLUDED.display_label,
  display_order = EXCLUDED.display_order,
  route_path = EXCLUDED.route_path,
  icon_name = EXCLUDED.icon_name,
  is_active = TRUE,
  updated_at = NOW();

-- -----------------------------
-- Simulator PM Dashboard (sim.sidebar_config)
-- -----------------------------
DO $$
BEGIN
  IF to_regclass('sim.sidebar_config') IS NOT NULL THEN
    INSERT INTO sim.sidebar_config (
      dashboard_type, section_name, document_type, display_order, route_path, icon_name, is_active
    )
    VALUES
      ('PM', 'Process Group Forms', 'forms-initiating', 80, '/simulator/pm/projects/:projectId/forms?group=Initiating', 'FileText', TRUE),
      ('PM', 'Process Group Forms', 'forms-planning', 81, '/simulator/pm/projects/:projectId/forms?group=Planning', 'FileText', TRUE),
      ('PM', 'Process Group Forms', 'forms-executing', 82, '/simulator/pm/projects/:projectId/forms?group=Executing', 'FileText', TRUE),
      ('PM', 'Process Group Forms', 'forms-monitoring', 83, '/simulator/pm/projects/:projectId/forms?group=Monitoring', 'FileText', TRUE),
      ('PM', 'Process Group Forms', 'forms-closing', 84, '/simulator/pm/projects/:projectId/forms?group=Closing', 'FileText', TRUE),
      ('PM', 'Process Group Forms', 'forms-agile', 85, '/simulator/pm/projects/:projectId/forms?group=Agile', 'FileText', TRUE),
      ('PM', 'Process Group Forms', 'forms-drafts', 86, '/simulator/pm/projects/:projectId/forms/drafts', 'FileClock', TRUE),
      ('PM', 'Process Group Forms', 'forms-approvals', 87, '/simulator/pm/projects/:projectId/forms?status=in_review', 'FileCheck', TRUE)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- -----------------------------
-- Simulator PMO Dashboard (sim.sidebar_config)
-- -----------------------------
DO $$
BEGIN
  IF to_regclass('sim.sidebar_config') IS NOT NULL THEN
    INSERT INTO sim.sidebar_config (
      dashboard_type, section_name, document_type, display_order, route_path, icon_name, is_active
    )
    VALUES
      ('PMO', 'Process Group Forms', 'forms-initiating', 90, '/simulator/pmo/forms?group=Initiating', 'FileText', TRUE),
      ('PMO', 'Process Group Forms', 'forms-planning', 91, '/simulator/pmo/forms?group=Planning', 'FileText', TRUE),
      ('PMO', 'Process Group Forms', 'forms-executing', 92, '/simulator/pmo/forms?group=Executing', 'FileText', TRUE),
      ('PMO', 'Process Group Forms', 'forms-monitoring', 93, '/simulator/pmo/forms?group=Monitoring', 'FileText', TRUE),
      ('PMO', 'Process Group Forms', 'forms-closing', 94, '/simulator/pmo/forms?group=Closing', 'FileText', TRUE),
      ('PMO', 'Process Group Forms', 'forms-agile', 95, '/simulator/pmo/forms?group=Agile', 'FileText', TRUE),
      ('PMO', 'Process Group Forms', 'forms-templates', 96, '/platform/admin/form-templates', 'Settings2', TRUE)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
