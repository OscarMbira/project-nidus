-- =============================================================================
-- v225: Sidebar Configuration Table
-- Purpose: Reference table for PMO/PM dashboard sidebar menu structure
-- PRD Reference: Documents/PMO_PM_Independent_Dashboards_PRD.md Section 8
-- =============================================================================

-- Create sidebar_config table
CREATE TABLE IF NOT EXISTS sidebar_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_type TEXT NOT NULL CHECK (dashboard_type IN ('PMO', 'PM')),
  section_name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  display_label TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  route_path TEXT NOT NULL,
  icon_name TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique constraint to prevent duplicate entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_sidebar_config_unique
  ON sidebar_config(dashboard_type, section_name, document_type);

-- Create index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_sidebar_config_dashboard
  ON sidebar_config(dashboard_type, display_order);

-- Seed PMO Dashboard sidebar items (PRD Section 4)
INSERT INTO sidebar_config (dashboard_type, section_name, document_type, display_label, display_order, route_path, icon_name) VALUES
  -- PMO Governance (Baselines)
  ('PMO', 'PMO Governance', 'mandate', 'Project Mandate', 1, '/pmo/governance/mandate', 'FileText'),
  ('PMO', 'PMO Governance', 'communication-strategy', 'Communication Management Strategy', 2, '/pmo/governance/communication-strategy', 'Megaphone'),
  ('PMO', 'PMO Governance', 'configuration-strategy', 'Configuration Management Strategy', 3, '/pmo/governance/configuration-strategy', 'Settings2'),
  ('PMO', 'PMO Governance', 'quality-strategy', 'Quality Management Strategy', 4, '/pmo/governance/quality-strategy', 'CheckSquare'),
  ('PMO', 'PMO Governance', 'risk-strategy', 'Risk Management Strategy', 5, '/pmo/governance/risk-strategy', 'AlertTriangle'),
  -- Initiation & Business Justification
  ('PMO', 'Initiation & Business Justification', 'business-case', 'Business Case', 6, '/pmo/initiation/business-case', 'Briefcase'),
  ('PMO', 'Initiation & Business Justification', 'project-brief', 'Project Brief', 7, '/pmo/initiation/project-brief', 'FileText'),
  ('PMO', 'Initiation & Business Justification', 'benefits-review-plan', 'Benefits Review Plan', 8, '/pmo/initiation/benefits-review-plan', 'BookOpen'),
  -- Project Oversight (Read-Only)
  ('PMO', 'Project Oversight', 'risk-register', 'Risk Register', 9, '/pmo/oversight/risk-register', 'AlertTriangle'),
  ('PMO', 'Project Oversight', 'issue-register', 'Issue Register', 10, '/pmo/oversight/issue-register', 'AlertCircle'),
  ('PMO', 'Project Oversight', 'quality-register', 'Quality Register', 11, '/pmo/oversight/quality-register', 'ClipboardList'),
  ('PMO', 'Project Oversight', 'lessons-log', 'Lessons Log', 12, '/pmo/oversight/lessons-log', 'GraduationCap'),
  -- Reporting & Assurance
  ('PMO', 'Reporting & Assurance', 'highlight-reports', 'Highlight Reports', 13, '/pmo/reporting/highlight-reports', 'Flag'),
  ('PMO', 'Reporting & Assurance', 'exception-reports', 'Exception Reports', 14, '/pmo/reporting/exception-reports', 'FileWarning'),
  ('PMO', 'Reporting & Assurance', 'end-stage-reports', 'End Stage Reports', 15, '/pmo/reporting/end-stage-reports', 'FileClock'),
  ('PMO', 'Reporting & Assurance', 'end-project-reports', 'End Project Reports', 16, '/pmo/reporting/end-project-reports', 'FileCheck')
ON CONFLICT (dashboard_type, section_name, document_type) DO NOTHING;

-- Seed PM Dashboard sidebar items (PRD Section 5)
INSERT INTO sidebar_config (dashboard_type, section_name, document_type, display_label, display_order, route_path, icon_name) VALUES
  -- Governance Reference & Tailoring
  ('PM', 'Governance Reference', 'mandate', 'Project Mandate', 1, '/pm/governance/mandate', 'FileText'),
  ('PM', 'Governance Reference', 'communication-strategy', 'Communication Management Strategy', 2, '/pm/governance/communication-strategy', 'Megaphone'),
  ('PM', 'Governance Reference', 'configuration-strategy', 'Configuration Management Strategy', 3, '/pm/governance/configuration-strategy', 'Settings2'),
  ('PM', 'Governance Reference', 'quality-strategy', 'Quality Management Strategy', 4, '/pm/governance/quality-strategy', 'CheckSquare'),
  ('PM', 'Governance Reference', 'risk-strategy', 'Risk Management Strategy', 5, '/pm/governance/risk-strategy', 'AlertTriangle'),
  -- Initiation & Business Justification
  ('PM', 'Initiation & Business Justification', 'business-case', 'Business Case', 6, '/pm/initiation/business-case', 'Briefcase'),
  ('PM', 'Initiation & Business Justification', 'project-brief', 'Project Brief', 7, '/pm/initiation/project-brief', 'FileText'),
  ('PM', 'Initiation & Business Justification', 'pid', 'Project Initiation Document (PID)', 8, '/pm/initiation/pid', 'FileBox'),
  ('PM', 'Initiation & Business Justification', 'benefits-review-plan', 'Benefits Review Plan', 9, '/pm/initiation/benefits-review-plan', 'BookOpen'),
  -- Delivery Management
  ('PM', 'Delivery Management', 'work-packages', 'Work Packages', 10, '/pm/delivery/work-packages', 'Layers'),
  ('PM', 'Delivery Management', 'product-description', 'Product Description', 11, '/pm/delivery/product-description', 'FileText'),
  ('PM', 'Delivery Management', 'project-product-description', 'Project Product Description', 12, '/pm/delivery/project-product-description', 'ClipboardList'),
  ('PM', 'Delivery Management', 'product-status-account', 'Product Status Account', 13, '/pm/delivery/product-status-account', 'Activity'),
  ('PM', 'Delivery Management', 'daily-log', 'Daily Log', 14, '/pm/delivery/daily-log', 'Calendar'),
  -- Controls & Registers
  ('PM', 'Controls & Registers', 'risk-register', 'Risk Register', 15, '/pm/controls/risk-register', 'AlertTriangle'),
  ('PM', 'Controls & Registers', 'issue-register', 'Issue Register', 16, '/pm/controls/issue-register', 'AlertCircle'),
  ('PM', 'Controls & Registers', 'quality-register', 'Quality Register', 17, '/pm/controls/quality-register', 'CheckSquare'),
  ('PM', 'Controls & Registers', 'configuration-items', 'Configuration Item Records', 18, '/pm/controls/configuration-items', 'Wrench'),
  ('PM', 'Controls & Registers', 'lessons-log', 'Lessons Log', 19, '/pm/controls/lessons-log', 'GraduationCap'),
  -- Reporting
  ('PM', 'Reporting', 'checkpoint-reports', 'Checkpoint Reports', 20, '/pm/reporting/checkpoint-reports', 'Flag'),
  ('PM', 'Reporting', 'highlight-reports', 'Highlight Reports', 21, '/pm/reporting/highlight-reports', 'Flag'),
  ('PM', 'Reporting', 'issue-reports', 'Issue Reports', 22, '/pm/reporting/issue-reports', 'AlertCircle'),
  ('PM', 'Reporting', 'exception-reports', 'Exception Reports', 23, '/pm/reporting/exception-reports', 'FileWarning'),
  ('PM', 'Reporting', 'end-stage-reports', 'End Stage Report', 24, '/pm/reporting/end-stage-reports', 'FileClock'),
  -- Project Closure
  ('PM', 'Project Closure', 'lessons-report', 'Lessons Report', 25, '/pm/closure/lessons-report', 'GraduationCap'),
  ('PM', 'Project Closure', 'end-project-report', 'End Project Report', 26, '/pm/closure/end-project-report', 'FileCheck')
ON CONFLICT (dashboard_type, section_name, document_type) DO NOTHING;

-- Enable RLS
ALTER TABLE sidebar_config ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read sidebar config
CREATE POLICY "sidebar_config_read_all" ON sidebar_config
  FOR SELECT TO authenticated
  USING (true);

-- Only allow service role to modify sidebar config
CREATE POLICY "sidebar_config_admin_write" ON sidebar_config
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Register table in database_tables registry
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('sidebar_config', 'Sidebar menu configuration for PMO and PM dashboards', true, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();
