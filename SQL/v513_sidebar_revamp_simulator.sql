-- =============================================================================
-- v513_sidebar_revamp_simulator.sql
-- Purpose: Mirror PM/PMO sidebar revamp rows into sim.sidebar_config
-- =============================================================================

DO $$
BEGIN
  IF to_regclass('sim.sidebar_config') IS NULL THEN
    RAISE NOTICE 'sim.sidebar_config not found. Skipping v513 simulator sidebar seed.';
    RETURN;
  END IF;

  -- Deactivate standalone legacy group rows that were absorbed.
  UPDATE sim.sidebar_config
  SET is_active = FALSE, updated_at = NOW()
  WHERE dashboard_type = 'PM'
    AND section_name IN ('ITTO Management', 'Delays');

  -- PM simulator Process Group Forms.
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

  -- PM simulator section normalization.
  UPDATE sim.sidebar_config
  SET section_name = 'Delivery Management', updated_at = NOW()
  WHERE dashboard_type = 'PM'
    AND document_type IN ('itto-templates', 'itto-project', 'itto-drafts');

  UPDATE sim.sidebar_config
  SET section_name = 'Controls & Registers', updated_at = NOW()
  WHERE dashboard_type = 'PM'
    AND document_type IN ('delay-register', 'delay-drafts');

  -- PMO simulator Process Group Forms.
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

  -- PMO simulator section normalization.
  UPDATE sim.sidebar_config
  SET section_name = 'Governance & Standards', updated_at = NOW()
  WHERE dashboard_type = 'PMO'
    AND section_name = 'ITTO Management';

  UPDATE sim.sidebar_config
  SET section_name = 'Project Oversight', updated_at = NOW()
  WHERE dashboard_type = 'PMO'
    AND section_name = 'Delay Management';
END $$;
