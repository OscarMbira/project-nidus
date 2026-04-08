-- =============================================================================
-- v245: Practice Sidebar Config Table
-- Purpose: Create sidebar configuration table for practice PMO and PM dashboards in sim schema
-- PRD Reference: Simulator_PMO_PM_Independent_Dashboards_Implementation_Plan.md Phase 7
-- =============================================================================

-- Create practice sidebar config table
CREATE TABLE IF NOT EXISTS sim.sidebar_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_type TEXT NOT NULL CHECK (dashboard_type IN ('PMO', 'PM')),
  section_name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  route_path TEXT NOT NULL,
  icon_name TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE sim.sidebar_config IS 'Sidebar menu configuration for practice PMO and PM dashboards';
COMMENT ON COLUMN sim.sidebar_config.dashboard_type IS 'Dashboard type: PMO or PM';
COMMENT ON COLUMN sim.sidebar_config.section_name IS 'Menu section name (e.g., "PMO Governance", "Delivery Management")';
COMMENT ON COLUMN sim.sidebar_config.document_type IS 'Document type identifier (e.g., "mandate", "work-packages")';
COMMENT ON COLUMN sim.sidebar_config.route_path IS 'Route path for the menu item (e.g., "/simulator/pmo/governance/mandate")';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sim_sidebar_config_dashboard_type ON sim.sidebar_config(dashboard_type);
CREATE INDEX IF NOT EXISTS idx_sim_sidebar_config_is_active ON sim.sidebar_config(is_active);

-- Seed PMO dashboard menu items
INSERT INTO sim.sidebar_config (dashboard_type, section_name, document_type, display_order, route_path, icon_name, is_active)
VALUES
  -- PMO Governance Section
  ('PMO', 'PMO Governance', 'mandate', 1, '/simulator/pmo/governance/mandate', 'FileText', TRUE),
  ('PMO', 'PMO Governance', 'communication-strategy', 2, '/simulator/pmo/governance/communication-strategy', 'Megaphone', TRUE),
  ('PMO', 'PMO Governance', 'configuration-strategy', 3, '/simulator/pmo/governance/configuration-strategy', 'Settings2', TRUE),
  ('PMO', 'PMO Governance', 'quality-strategy', 4, '/simulator/pmo/governance/quality-strategy', 'CheckSquare', TRUE),
  ('PMO', 'PMO Governance', 'risk-strategy', 5, '/simulator/pmo/governance/risk-strategy', 'AlertTriangle', TRUE),
  
  -- PMO Initiation Section
  ('PMO', 'Initiation & Business Justification', 'business-case', 1, '/simulator/pmo/initiation/business-case', 'Briefcase', TRUE),
  ('PMO', 'Initiation & Business Justification', 'project-brief', 2, '/simulator/pmo/initiation/project-brief', 'FileText', TRUE),
  ('PMO', 'Initiation & Business Justification', 'benefits-review-plan', 3, '/simulator/pmo/initiation/benefits-review-plan', 'BookOpen', TRUE),
  
  -- PMO Oversight Section
  ('PMO', 'Practice Project Oversight', 'risk-register', 1, '/simulator/pmo/oversight/risk-register', 'AlertTriangle', TRUE),
  ('PMO', 'Practice Project Oversight', 'issue-register', 2, '/simulator/pmo/oversight/issue-register', 'AlertCircle', TRUE),
  ('PMO', 'Practice Project Oversight', 'quality-register', 3, '/simulator/pmo/oversight/quality-register', 'ClipboardList', TRUE),
  ('PMO', 'Practice Project Oversight', 'lessons-log', 4, '/simulator/pmo/oversight/lessons-log', 'GraduationCap', TRUE),
  
  -- PMO Reporting Section
  ('PMO', 'Reporting & Assurance', 'highlight-reports', 1, '/simulator/pmo/reporting/highlight-reports', 'Flag', TRUE),
  ('PMO', 'Reporting & Assurance', 'exception-reports', 2, '/simulator/pmo/reporting/exception-reports', 'FileWarning', TRUE),
  ('PMO', 'Reporting & Assurance', 'end-stage-reports', 3, '/simulator/pmo/reporting/end-stage-reports', 'FileClock', TRUE),
  ('PMO', 'Reporting & Assurance', 'end-project-reports', 4, '/simulator/pmo/reporting/end-project-reports', 'FileCheck', TRUE),
  
  -- PM Governance Section
  ('PM', 'Governance Reference', 'mandate', 1, '/simulator/pm/governance/mandate', 'FileText', TRUE),
  ('PM', 'Governance Reference', 'communication-strategy', 2, '/simulator/pm/governance/communication-strategy', 'Megaphone', TRUE),
  ('PM', 'Governance Reference', 'configuration-strategy', 3, '/simulator/pm/governance/configuration-strategy', 'Settings2', TRUE),
  ('PM', 'Governance Reference', 'quality-strategy', 4, '/simulator/pm/governance/quality-strategy', 'CheckSquare', TRUE),
  ('PM', 'Governance Reference', 'risk-strategy', 5, '/simulator/pm/governance/risk-strategy', 'AlertTriangle', TRUE),
  
  -- PM Initiation Section
  ('PM', 'Initiation & Business Justification', 'business-case', 1, '/simulator/pm/initiation/business-case', 'Briefcase', TRUE),
  ('PM', 'Initiation & Business Justification', 'project-brief', 2, '/simulator/pm/initiation/project-brief', 'FileText', TRUE),
  ('PM', 'Initiation & Business Justification', 'pid', 3, '/simulator/pm/initiation/pid', 'FileBox', TRUE),
  ('PM', 'Initiation & Business Justification', 'benefits-review-plan', 4, '/simulator/pm/initiation/benefits-review-plan', 'BookOpen', TRUE),
  
  -- PM Delivery Section
  ('PM', 'Delivery Management', 'work-packages', 1, '/simulator/pm/delivery/work-packages', 'Layers', TRUE),
  ('PM', 'Delivery Management', 'product-description', 2, '/simulator/pm/delivery/product-description', 'FileText', TRUE),
  ('PM', 'Delivery Management', 'project-product-description', 3, '/simulator/pm/delivery/project-product-description', 'ClipboardList', TRUE),
  ('PM', 'Delivery Management', 'product-status-account', 4, '/simulator/pm/delivery/product-status-account', 'Activity', TRUE),
  ('PM', 'Delivery Management', 'daily-log', 5, '/simulator/pm/delivery/daily-log', 'Calendar', TRUE),
  
  -- PM Controls Section
  ('PM', 'Controls & Registers', 'risk-register', 1, '/simulator/pm/controls/risk-register', 'AlertTriangle', TRUE),
  ('PM', 'Controls & Registers', 'issue-register', 2, '/simulator/pm/controls/issue-register', 'AlertCircle', TRUE),
  ('PM', 'Controls & Registers', 'quality-register', 3, '/simulator/pm/controls/quality-register', 'CheckSquare', TRUE),
  ('PM', 'Controls & Registers', 'configuration-items', 4, '/simulator/pm/controls/configuration-items', 'Wrench', TRUE),
  ('PM', 'Controls & Registers', 'lessons-log', 5, '/simulator/pm/controls/lessons-log', 'GraduationCap', TRUE),
  
  -- PM Reporting Section
  ('PM', 'Reporting', 'checkpoint-reports', 1, '/simulator/pm/reporting/checkpoint-reports', 'Flag', TRUE),
  ('PM', 'Reporting', 'highlight-reports', 2, '/simulator/pm/reporting/highlight-reports', 'Flag', TRUE),
  ('PM', 'Reporting', 'issue-reports', 3, '/simulator/pm/reporting/issue-reports', 'AlertCircle', TRUE),
  ('PM', 'Reporting', 'exception-reports', 4, '/simulator/pm/reporting/exception-reports', 'FileWarning', TRUE),
  ('PM', 'Reporting', 'end-stage-reports', 5, '/simulator/pm/reporting/end-stage-reports', 'FileClock', TRUE),
  
  -- PM Closure Section
  ('PM', 'Project Closure', 'lessons-report', 1, '/simulator/pm/closure/lessons-report', 'GraduationCap', TRUE),
  ('PM', 'Project Closure', 'end-project-report', 2, '/simulator/pm/closure/end-project-report', 'FileCheck', TRUE)
ON CONFLICT DO NOTHING;

-- Register table in database_tables registry
INSERT INTO database_tables (table_schema, table_name, table_type, description, is_active)
VALUES 
  ('sim', 'sidebar_config', 'lookup', 'Sidebar menu configuration for practice PMO and PM dashboards', TRUE)
ON CONFLICT (table_schema, table_name) 
DO UPDATE SET 
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
