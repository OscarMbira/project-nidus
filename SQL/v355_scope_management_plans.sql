-- ============================================================================
-- v355: Scope Management Plans (Process Guide 5.2) + portfolio_manager role template
-- Prerequisites: projects, users, project_roles, stakeholders (optional)
-- Date: 2026-03-31
-- ============================================================================

-- Portfolio Manager template (plan §RBAC)
-- NOTE (2026-08-24): originally an ON CONFLICT (role_name) WHERE is_template = TRUE AND
-- project_id IS NULL upsert. That target no longer matches any live index — v902
-- (organisation custom roles) dropped and replaced uq_project_roles_template with a wider
-- column list (role_name, COALESCE(account_id, ...)), still under the same WHERE predicate,
-- causing ERROR 42P10 (no matching unique/exclusion constraint) when this file is run today.
-- Rewritten as an update-then-insert-if-missing pair instead of ON CONFLICT, so it no longer
-- depends on knowing the exact current index shape (same resilient pattern used throughout
-- this session's v966 initiative).
UPDATE project_roles SET
  role_display_name = 'Portfolio Manager',
  role_description = 'Portfolio-level oversight and project coordination',
  role_level = 10,
  permissions = '["project.view", "project.edit", "project.manage_users", "reports.view", "portfolio.manage", "scope.manage", "schedule.manage"]'::jsonb,
  updated_at = NOW()
WHERE role_name = 'portfolio_manager' AND is_template = TRUE AND project_id IS NULL;

INSERT INTO project_roles (
  role_name, role_display_name, role_description,
  is_system_default, is_template, role_level, permissions, is_active
)
SELECT
  'portfolio_manager', 'Portfolio Manager', 'Portfolio-level oversight and project coordination',
  TRUE, TRUE, 10,
  '["project.view", "project.edit", "project.manage_users", "reports.view", "portfolio.manage", "scope.manage", "schedule.manage"]'::jsonb,
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM project_roles WHERE role_name = 'portfolio_manager' AND is_template = TRUE AND project_id IS NULL
);

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
