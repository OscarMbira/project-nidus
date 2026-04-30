-- ============================================================================
-- v355: Scope Management Plans (Process Guide 5.2) + portfolio_manager role template
-- Prerequisites: projects, users, project_roles, stakeholders (optional)
-- Date: 2026-03-31
-- ============================================================================

-- Portfolio Manager template (plan §RBAC)
INSERT INTO project_roles (
  role_name, role_display_name, role_description,
  is_system_default, is_template, role_level, permissions, is_active
) VALUES
  ('portfolio_manager', 'Portfolio Manager', 'Portfolio-level oversight and project coordination',
   TRUE, TRUE, 10,
   '["project.view", "project.edit", "project.manage_users", "reports.view", "portfolio.manage", "scope.manage", "schedule.manage"]'::jsonb,
   TRUE)
ON CONFLICT (role_name) WHERE is_template = TRUE AND project_id IS NULL DO UPDATE SET
  role_display_name = EXCLUDED.role_display_name,
  role_description = EXCLUDED.role_description,
  role_level = EXCLUDED.role_level,
  permissions = EXCLUDED.permissions,
  updated_at = NOW();

CREATE TABLE IF NOT EXISTS scope_management_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scope_definition_approach TEXT,
  change_control_process TEXT,
  scope_validation_method TEXT,
  deliverable_acceptance_process TEXT,
  roles_responsibilities TEXT,
  wbs_maintenance_process TEXT,
  scope_baseline_info TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  version VARCHAR(50) DEFAULT '1.0',
  created_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_scope_mgmt_plans_project ON scope_management_plans(project_id) WHERE is_deleted = FALSE;

COMMENT ON TABLE scope_management_plans IS 'Plan Scope Management (5.2) — how scope is defined, validated, and controlled';

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES ('scope_management_plans', 'Scope management plan document per project', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at = NOW();
