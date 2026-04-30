-- =============================================================================
-- v511_sidebar_revamp_pm_dashboard.sql
-- Purpose: Revamp PM dashboard sidebar_config seed rows (public.sidebar_config)
-- =============================================================================

-- Deactivate standalone sections now absorbed into grouped sections.
UPDATE public.sidebar_config
SET is_active = FALSE, updated_at = NOW()
WHERE dashboard_type = 'PM'
  AND section_name IN ('ITTO Management', 'Delays', 'Financial Management', 'Project Closure');

-- Normalize any fractional-like ordering drift into integers by section.
WITH section_order AS (
  SELECT * FROM (VALUES
    ('Governance Reference', 10),
    ('Initiation & Business Justification', 20),
    ('Delivery Management', 30),
    ('Controls & Registers', 40),
    ('Planning Intelligence', 50),
    ('Process Group Forms', 60),
    ('Quality & Testing', 70),
    ('Reporting & Closure', 80)
  ) AS t(section_name, base_order)
),
ordered_rows AS (
  SELECT
    sc.id,
    so.base_order +
      ROW_NUMBER() OVER (
        PARTITION BY sc.section_name
        ORDER BY sc.display_order, sc.document_type
      ) AS new_display_order
  FROM public.sidebar_config sc
  JOIN section_order so ON so.section_name = sc.section_name
  WHERE sc.dashboard_type = 'PM'
)
UPDATE public.sidebar_config sc
SET display_order = o.new_display_order,
    updated_at = NOW()
FROM ordered_rows o
WHERE sc.id = o.id;

-- Absorb ITTO + delays into delivery/controls.
UPDATE public.sidebar_config
SET section_name = 'Delivery Management', updated_at = NOW()
WHERE dashboard_type = 'PM'
  AND document_type IN ('itto-templates', 'itto-project', 'itto-drafts');

UPDATE public.sidebar_config
SET section_name = 'Controls & Registers', updated_at = NOW()
WHERE dashboard_type = 'PM'
  AND document_type IN ('delay-register', 'delay-drafts');

-- Process Group Forms section rows.
INSERT INTO public.sidebar_config (
  dashboard_type, section_name, document_type, display_label, display_order, route_path, icon_name, is_active
)
VALUES
  ('PM', 'Process Group Forms', 'forms-initiating', 'Initiating', 60, '/pm/projects/:projectId/forms?group=Initiating', 'FileText', TRUE),
  ('PM', 'Process Group Forms', 'forms-planning', 'Planning', 61, '/pm/projects/:projectId/forms?group=Planning', 'FileText', TRUE),
  ('PM', 'Process Group Forms', 'forms-executing', 'Executing', 62, '/pm/projects/:projectId/forms?group=Executing', 'FileText', TRUE),
  ('PM', 'Process Group Forms', 'forms-monitoring', 'Monitoring & Controlling', 63, '/pm/projects/:projectId/forms?group=Monitoring', 'FileText', TRUE),
  ('PM', 'Process Group Forms', 'forms-closing', 'Closing', 64, '/pm/projects/:projectId/forms?group=Closing', 'FileText', TRUE),
  ('PM', 'Process Group Forms', 'forms-agile', 'Agile', 65, '/pm/projects/:projectId/forms?group=Agile', 'FileText', TRUE),
  ('PM', 'Process Group Forms', 'forms-drafts', 'My Drafts', 66, '/pm/projects/:projectId/forms/drafts', 'FileClock', TRUE),
  ('PM', 'Process Group Forms', 'forms-approvals', 'Pending Approvals', 67, '/pm/projects/:projectId/forms?status=in_review', 'FileCheck', TRUE)
ON CONFLICT (dashboard_type, section_name, document_type) DO UPDATE SET
  display_label = EXCLUDED.display_label,
  display_order = EXCLUDED.display_order,
  route_path = EXCLUDED.route_path,
  icon_name = EXCLUDED.icon_name,
  is_active = TRUE,
  updated_at = NOW();

-- Reporting & Closure merged section.
INSERT INTO public.sidebar_config (
  dashboard_type, section_name, document_type, display_label, display_order, route_path, icon_name, is_active
)
VALUES
  ('PM', 'Reporting & Closure', 'checkpoint-reports', 'Checkpoint Reports', 80, '/pm/reporting/checkpoint-reports', 'Flag', TRUE),
  ('PM', 'Reporting & Closure', 'highlight-reports', 'Highlight Reports', 81, '/pm/reporting/highlight-reports', 'Flag', TRUE),
  ('PM', 'Reporting & Closure', 'issue-reports', 'Issue Reports', 82, '/pm/reporting/issue-reports', 'AlertCircle', TRUE),
  ('PM', 'Reporting & Closure', 'exception-reports', 'Exception Reports', 83, '/pm/reporting/exception-reports', 'FileWarning', TRUE),
  ('PM', 'Reporting & Closure', 'end-stage-reports', 'End Stage Report', 84, '/pm/reporting/end-stage-reports', 'FileClock', TRUE),
  ('PM', 'Reporting & Closure', 'financial-reports', 'Financial Reports', 85, '/platform/financial-reports', 'BarChart3', TRUE),
  ('PM', 'Reporting & Closure', 'portfolio-evm', 'Portfolio EVM', 86, '/platform/portfolio/evm', 'TrendingUp', TRUE),
  ('PM', 'Reporting & Closure', 'lessons-report', 'Lessons Report', 87, '/pm/closure/lessons-report', 'GraduationCap', TRUE),
  ('PM', 'Reporting & Closure', 'end-project-report', 'End Project Report', 88, '/pm/closure/end-project-report', 'FileCheck', TRUE)
ON CONFLICT (dashboard_type, section_name, document_type) DO UPDATE SET
  display_label = EXCLUDED.display_label,
  display_order = EXCLUDED.display_order,
  route_path = EXCLUDED.route_path,
  icon_name = EXCLUDED.icon_name,
  is_active = TRUE,
  updated_at = NOW();
