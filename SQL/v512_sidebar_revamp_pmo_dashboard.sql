-- =============================================================================
-- v512_sidebar_revamp_pmo_dashboard.sql
-- Purpose: Revamp PMO dashboard sidebar_config rows (public.sidebar_config)
-- =============================================================================

-- Move misplaced rows out of Testing and QA, if present.
UPDATE public.sidebar_config
SET section_name = 'Administration', updated_at = NOW()
WHERE dashboard_type = 'PMO'
  AND section_name = 'Testing and QA'
  AND document_type IN ('form-templates', 'rfp-register', 'load-rfp', 'rfp-drafts');

UPDATE public.sidebar_config
SET section_name = 'Project Oversight', updated_at = NOW()
WHERE dashboard_type = 'PMO'
  AND section_name = 'Testing and QA'
  AND document_type IN ('risk-register-all', 'issue-register-all', 'change-register-all');

-- Move ITTO under Governance & Standards and delays under Project Oversight.
UPDATE public.sidebar_config
SET section_name = 'Governance & Standards', updated_at = NOW()
WHERE dashboard_type = 'PMO'
  AND section_name = 'ITTO Management';

UPDATE public.sidebar_config
SET section_name = 'Project Oversight', updated_at = NOW()
WHERE dashboard_type = 'PMO'
  AND section_name = 'Delay Management';

-- Ensure process group forms section uses PMO-wide paths (no :projectId).
INSERT INTO public.sidebar_config (
  dashboard_type, section_name, document_type, display_label, display_order, route_path, icon_name, is_active
)
VALUES
  ('PMO', 'Process Group Forms', 'forms-initiating', 'Initiating', 60, '/pmo/forms?group=Initiating', 'FileText', TRUE),
  ('PMO', 'Process Group Forms', 'forms-planning', 'Planning', 61, '/pmo/forms?group=Planning', 'FileText', TRUE),
  ('PMO', 'Process Group Forms', 'forms-executing', 'Executing', 62, '/pmo/forms?group=Executing', 'FileText', TRUE),
  ('PMO', 'Process Group Forms', 'forms-monitoring', 'Monitoring & Controlling', 63, '/pmo/forms?group=Monitoring', 'FileText', TRUE),
  ('PMO', 'Process Group Forms', 'forms-closing', 'Closing', 64, '/pmo/forms?group=Closing', 'FileText', TRUE),
  ('PMO', 'Process Group Forms', 'forms-agile', 'Agile', 65, '/pmo/forms?group=Agile', 'FileText', TRUE)
ON CONFLICT (dashboard_type, section_name, document_type) DO UPDATE SET
  display_label = EXCLUDED.display_label,
  display_order = EXCLUDED.display_order,
  route_path = EXCLUDED.route_path,
  icon_name = EXCLUDED.icon_name,
  is_active = TRUE,
  updated_at = NOW();

-- Clean Testing and QA section (testing-only rows).
UPDATE public.sidebar_config
SET is_active = FALSE, updated_at = NOW()
WHERE dashboard_type = 'PMO'
  AND section_name = 'Testing and QA'
  AND document_type IN ('form-templates', 'risk-register-all', 'issue-register-all', 'change-register-all');

-- Project Oversight expanded set.
INSERT INTO public.sidebar_config (
  dashboard_type, section_name, document_type, display_label, display_order, route_path, icon_name, is_active
)
VALUES
  ('PMO', 'Project Oversight', 'risk-register-all', 'Risk Register (All)', 40, '/pmo/oversight/risk-register', 'AlertTriangle', TRUE),
  ('PMO', 'Project Oversight', 'issue-register-all', 'Issue Register (All)', 41, '/pmo/oversight/issue-register', 'AlertCircle', TRUE),
  ('PMO', 'Project Oversight', 'quality-register-all', 'Quality Register (All)', 42, '/pmo/oversight/quality-register', 'ClipboardList', TRUE),
  ('PMO', 'Project Oversight', 'change-register-all', 'Change Register (All)', 43, '/pmo/registers/changes', 'RefreshCcw', TRUE),
  ('PMO', 'Project Oversight', 'lessons-log-all', 'Lessons Log (All)', 44, '/pmo/oversight/lessons-log', 'GraduationCap', TRUE),
  ('PMO', 'Project Oversight', 'delay-register', 'Delay Register', 45, '/pmo/oversight/delays', 'FileClock', TRUE)
ON CONFLICT (dashboard_type, section_name, document_type) DO UPDATE SET
  display_label = EXCLUDED.display_label,
  display_order = EXCLUDED.display_order,
  route_path = EXCLUDED.route_path,
  icon_name = EXCLUDED.icon_name,
  is_active = TRUE,
  updated_at = NOW();

-- Administration section seed.
INSERT INTO public.sidebar_config (
  dashboard_type, section_name, document_type, display_label, display_order, route_path, icon_name, is_active
)
VALUES
  ('PMO', 'Administration', 'form-templates', 'Form Templates', 90, '/platform/admin/form-templates', 'Settings2', TRUE),
  ('PMO', 'Administration', 'organisation-settings', 'Organisation Settings', 91, '/platform/pmo-admin/settings', 'Settings2', TRUE),
  ('PMO', 'Administration', 'user-management', 'User Management', 92, '/platform/pmo-admin/users', 'Users', TRUE),
  ('PMO', 'Administration', 'rfp-register', 'RFP Register', 93, '/pmo/procurement/rfp', 'FileSpreadsheet', TRUE),
  ('PMO', 'Administration', 'load-rfp', 'Load RFP', 94, '/pmo/rfp/create', 'FilePlus', TRUE),
  ('PMO', 'Administration', 'rfp-drafts', 'RFP Drafts', 95, '/pmo/rfp/on-hold', 'Pause', TRUE)
ON CONFLICT (dashboard_type, section_name, document_type) DO UPDATE SET
  display_label = EXCLUDED.display_label,
  display_order = EXCLUDED.display_order,
  route_path = EXCLUDED.route_path,
  icon_name = EXCLUDED.icon_name,
  is_active = TRUE,
  updated_at = NOW();
