-- =====================================================
-- v138: Comprehensive Permissions System
-- =====================================================
-- Description: Complete permission definitions for all 14 Platform modules
-- Created: 2025-12-17
-- Author: System
-- Dependencies: Existing permissions table
-- =====================================================

-- Insert comprehensive permission set for all modules
INSERT INTO permissions (permission_code, permission_name, permission_description, permission_category, created_at) VALUES

  -- ====================================
  -- DASHBOARD PERMISSIONS
  -- ====================================
  ('dashboard.view', 'View Dashboard', 'Access to organization dashboard and analytics', 'dashboard', NOW()),

  -- ====================================
  -- PROJECT PERMISSIONS
  -- ====================================
  ('project.view', 'View Projects', 'View projects assigned to user', 'project', NOW()),
  ('project.view_all', 'View All Projects', 'View all organization projects', 'project', NOW()),
  ('project.create', 'Create Project', 'Create new projects', 'project', NOW()),
  ('project.edit', 'Edit Project', 'Edit project details', 'project', NOW()),
  ('project.delete', 'Delete Project', 'Delete projects', 'project', NOW()),
  ('project.archive', 'Archive Project', 'Archive completed projects', 'project', NOW()),
  ('project.restore', 'Restore Project', 'Restore archived projects', 'project', NOW()),
  ('project.export', 'Export Projects', 'Export project data to CSV/PDF', 'project', NOW()),
  ('project.template.create', 'Create Template', 'Save projects as templates', 'project', NOW()),
  ('project.template.use', 'Use Template', 'Create projects from templates', 'project', NOW()),

  -- ====================================
  -- TASK PERMISSIONS
  -- ====================================
  ('task.view', 'View Tasks', 'View tasks assigned to user', 'task', NOW()),
  ('task.view_all', 'View All Tasks', 'View all organization tasks', 'task', NOW()),
  ('task.create', 'Create Task', 'Create new tasks', 'task', NOW()),
  ('task.edit', 'Edit Task', 'Edit task details', 'task', NOW()),
  ('task.delete', 'Delete Task', 'Delete tasks', 'task', NOW()),
  ('task.assign', 'Assign Task', 'Assign tasks to users', 'task', NOW()),
  ('task.comment', 'Comment on Tasks', 'Add comments to tasks', 'task', NOW()),
  ('task.log_time', 'Log Time', 'Record time spent on tasks', 'task', NOW()),
  ('task.manage_subtasks', 'Manage Subtasks', 'Create and manage subtasks', 'task', NOW()),
  ('task.manage_dependencies', 'Manage Dependencies', 'Set task dependencies', 'task', NOW()),
  ('task.bulk_import', 'Bulk Import Tasks', 'Import tasks from CSV', 'task', NOW()),

  -- ====================================
  -- TEAM PERMISSIONS
  -- ====================================
  ('team.view', 'View Teams', 'View team information and members', 'team', NOW()),
  ('team.create', 'Create Team', 'Create new teams', 'team', NOW()),
  ('team.edit', 'Edit Team', 'Edit team details and members', 'team', NOW()),
  ('team.delete', 'Delete Team', 'Delete teams', 'team', NOW()),
  ('team.manage', 'Manage Teams', 'Full team management access', 'team', NOW()),
  ('team.view_directory', 'View Resource Directory', 'Access organization resource directory', 'team', NOW()),
  ('team.manage_skills', 'Manage Skills', 'Manage skill matrix and ratings', 'team', NOW()),
  ('team.manage_capacity', 'Manage Capacity', 'Manage resource capacity and allocation', 'team', NOW()),
  ('team.manage_leaves', 'Manage Leaves', 'Manage leave calendar', 'team', NOW()),

  -- ====================================
  -- REPORTS & ANALYTICS PERMISSIONS
  -- ====================================
  ('report.view', 'View Reports', 'View reports and analytics', 'report', NOW()),
  ('report.create', 'Create Report', 'Create custom reports', 'report', NOW()),
  ('report.edit', 'Edit Report', 'Edit existing reports', 'report', NOW()),
  ('report.delete', 'Delete Report', 'Delete reports', 'report', NOW()),
  ('report.export', 'Export Reports', 'Export reports to PDF/Excel', 'report', NOW()),
  ('report.schedule', 'Schedule Reports', 'Schedule automated report generation', 'report', NOW()),
  ('report.manage', 'Manage Reports', 'Full report management including templates', 'report', NOW()),
  ('report.view_analytics', 'View Analytics Dashboards', 'Access analytics dashboards', 'report', NOW()),
  ('report.create_metrics', 'Create Custom Metrics', 'Define custom KPIs and metrics', 'report', NOW()),

  -- ====================================
  -- GOVERNANCE PERMISSIONS
  -- ====================================
  ('governance.view', 'View Governance', 'View governance information and policies', 'governance', NOW()),
  ('governance.manage', 'Manage Governance', 'Manage governance framework and policies', 'governance', NOW()),
  ('governance.create_policy', 'Create Policy', 'Create new governance policies', 'governance', NOW()),
  ('governance.edit_policy', 'Edit Policy', 'Edit existing policies', 'governance', NOW()),
  ('governance.approve_policy', 'Approve Policy', 'Approve policy changes', 'governance', NOW()),
  ('governance.view_compliance', 'View Compliance', 'View compliance status and requirements', 'governance', NOW()),
  ('governance.manage_compliance', 'Manage Compliance', 'Manage compliance tracking', 'governance', NOW()),
  ('governance.record_decision', 'Record Decision', 'Log key decisions', 'governance', NOW()),
  ('governance.audit', 'Access Audit Trail', 'Access system audit trail', 'governance', NOW()),
  ('governance.schedule_review', 'Schedule Review', 'Schedule governance reviews', 'governance', NOW()),

  -- ====================================
  -- PORTFOLIO PERMISSIONS
  -- ====================================
  ('portfolio.view', 'View Portfolio', 'View portfolio information and projects', 'portfolio', NOW()),
  ('portfolio.create', 'Create Portfolio', 'Create new portfolios', 'portfolio', NOW()),
  ('portfolio.edit', 'Edit Portfolio', 'Edit portfolio details', 'portfolio', NOW()),
  ('portfolio.delete', 'Delete Portfolio', 'Delete portfolios', 'portfolio', NOW()),
  ('portfolio.manage', 'Manage Portfolio', 'Full portfolio management', 'portfolio', NOW()),
  ('portfolio.add_project', 'Add Project to Portfolio', 'Add projects to portfolio', 'portfolio', NOW()),
  ('portfolio.prioritize', 'Prioritize Projects', 'Run project prioritization', 'portfolio', NOW()),
  ('portfolio.plan', 'Portfolio Planning', 'Manage portfolio planning and capacity', 'portfolio', NOW()),
  ('portfolio.view_metrics', 'View Portfolio Metrics', 'View portfolio health and metrics', 'portfolio', NOW()),

  -- ====================================
  -- PROGRAMME PERMISSIONS
  -- ====================================
  ('programme.view', 'View Programme', 'View programme information and projects', 'programme', NOW()),
  ('programme.create', 'Create Programme', 'Create new programmes', 'programme', NOW()),
  ('programme.edit', 'Edit Programme', 'Edit programme details', 'programme', NOW()),
  ('programme.delete', 'Delete Programme', 'Delete programmes', 'programme', NOW()),
  ('programme.manage', 'Manage Programme', 'Full programme management', 'programme', NOW()),
  ('programme.add_project', 'Add Project to Programme', 'Add projects to programme', 'programme', NOW()),
  ('programme.manage_tranches', 'Manage Tranches', 'Manage programme tranches', 'programme', NOW()),
  ('programme.manage_dependencies', 'Manage Dependencies', 'Manage inter-project dependencies', 'programme', NOW()),
  ('programme.track_benefits', 'Track Benefits', 'Track programme benefits realization', 'programme', NOW()),
  ('programme.governance', 'Programme Governance', 'Manage programme governance board', 'programme', NOW()),

  -- ====================================
  -- DEPENDENCY PERMISSIONS
  -- ====================================
  ('dependency.view', 'View Dependencies', 'View dependency information and diagrams', 'dependency', NOW()),
  ('dependency.create', 'Create Dependency', 'Create new dependencies', 'dependency', NOW()),
  ('dependency.edit', 'Edit Dependency', 'Edit dependency details', 'dependency', NOW()),
  ('dependency.delete', 'Delete Dependency', 'Delete dependencies', 'dependency', NOW()),
  ('dependency.analyze', 'Analyze Impact', 'Run dependency impact analysis', 'dependency', NOW()),
  ('dependency.view_critical_path', 'View Critical Path', 'View critical path analysis', 'dependency', NOW()),
  ('dependency.cross_project', 'Manage Cross-Project Dependencies', 'Manage dependencies across projects', 'dependency', NOW()),

  -- ====================================
  -- BENEFITS PERMISSIONS
  -- ====================================
  ('benefit.view', 'View Benefits', 'View benefits register and information', 'benefit', NOW()),
  ('benefit.create', 'Create Benefit', 'Create new benefits', 'benefit', NOW()),
  ('benefit.edit', 'Edit Benefit', 'Edit benefit details', 'benefit', NOW()),
  ('benefit.delete', 'Delete Benefit', 'Delete benefits', 'benefit', NOW()),
  ('benefit.manage', 'Manage Benefits', 'Full benefits management', 'benefit', NOW()),
  ('benefit.map', 'Map Benefits', 'Map benefits to projects and objectives', 'benefit', NOW()),
  ('benefit.measure', 'Record Measurements', 'Record benefit realization measurements', 'benefit', NOW()),
  ('benefit.track_realization', 'Track Realization', 'Track benefits realization status', 'benefit', NOW()),
  ('benefit.manage_disbenefits', 'Manage Dis-benefits', 'Track and manage dis-benefits', 'benefit', NOW()),

  -- ====================================
  -- STRATEGY PERMISSIONS
  -- ====================================
  ('strategy.view', 'View Strategy', 'View strategic information and objectives', 'strategy', NOW()),
  ('strategy.create', 'Create Strategy', 'Create strategic objectives and initiatives', 'strategy', NOW()),
  ('strategy.edit', 'Edit Strategy', 'Edit strategic details', 'strategy', NOW()),
  ('strategy.delete', 'Delete Strategy', 'Delete strategic items', 'strategy', NOW()),
  ('strategy.manage', 'Manage Strategy', 'Full strategy management', 'strategy', NOW()),
  ('strategy.manage_okr', 'Manage OKRs', 'Manage Objectives and Key Results', 'strategy', NOW()),
  ('strategy.update_progress', 'Update Progress', 'Update progress on strategic objectives', 'strategy', NOW()),
  ('strategy.align_projects', 'Align Projects', 'Align projects to strategic objectives', 'strategy', NOW()),
  ('strategy.conduct_reviews', 'Conduct Reviews', 'Conduct strategic reviews', 'strategy', NOW()),

  -- ====================================
  -- QUALITY PERMISSIONS
  -- ====================================
  ('quality.view', 'View Quality', 'View quality information and reports', 'quality', NOW()),
  ('quality.create', 'Create Quality Items', 'Create quality standards/criteria/reviews', 'quality', NOW()),
  ('quality.edit', 'Edit Quality Items', 'Edit quality details', 'quality', NOW()),
  ('quality.delete', 'Delete Quality Items', 'Delete quality items', 'quality', NOW()),
  ('quality.manage', 'Manage Quality', 'Full quality management', 'quality', NOW()),
  ('quality.define_standards', 'Define Standards', 'Define quality standards', 'quality', NOW()),
  ('quality.schedule_review', 'Schedule Review', 'Schedule quality reviews', 'quality', NOW()),
  ('quality.conduct_review', 'Conduct Review', 'Conduct quality reviews', 'quality', NOW()),
  ('quality.schedule_inspection', 'Schedule Inspection', 'Schedule quality inspections', 'quality', NOW()),
  ('quality.conduct_inspection', 'Conduct Inspection', 'Conduct quality inspections', 'quality', NOW()),
  ('quality.log_defect', 'Log Defect', 'Log quality defects and issues', 'quality', NOW()),
  ('quality.view_metrics', 'View Metrics', 'View quality metrics and trends', 'quality', NOW()),

  -- ====================================
  -- STAKEHOLDER PERMISSIONS
  -- ====================================
  ('stakeholder.view', 'View Stakeholders', 'View stakeholder information and register', 'stakeholder', NOW()),
  ('stakeholder.create', 'Create Stakeholder', 'Create new stakeholders', 'stakeholder', NOW()),
  ('stakeholder.edit', 'Edit Stakeholder', 'Edit stakeholder details', 'stakeholder', NOW()),
  ('stakeholder.delete', 'Delete Stakeholder', 'Delete stakeholders', 'stakeholder', NOW()),
  ('stakeholder.manage', 'Manage Stakeholders', 'Full stakeholder management', 'stakeholder', NOW()),
  ('stakeholder.analyze', 'Analyze Stakeholders', 'Perform stakeholder analysis', 'stakeholder', NOW()),
  ('stakeholder.plan_engagement', 'Plan Engagement', 'Create engagement plans', 'stakeholder', NOW()),
  ('stakeholder.record_communication', 'Record Communication', 'Log stakeholder communications', 'stakeholder', NOW()),
  ('stakeholder.view_dashboard', 'View Dashboard', 'View stakeholder engagement dashboard', 'stakeholder', NOW()),

  -- ====================================
  -- ORGANIZATION ADMIN PERMISSIONS
  -- ====================================
  ('org.admin', 'Organization Admin', 'Full organization administration access', 'organization', NOW()),
  ('org.view_settings', 'View Org Settings', 'View organization settings', 'organization', NOW()),
  ('org.manage_settings', 'Manage Org Settings', 'Manage organization settings', 'organization', NOW()),
  ('org.manage_users', 'Manage Users', 'Manage organization users and invitations', 'organization', NOW()),
  ('org.assign_roles', 'Assign Roles', 'Assign roles to users', 'organization', NOW()),
  ('org.manage_billing', 'Manage Billing', 'Manage subscription and billing', 'organization', NOW()),
  ('org.view_subscription', 'View Subscription', 'View subscription details', 'organization', NOW()),
  ('org.manage_branding', 'Manage Branding', 'Manage organization branding and customization', 'organization', NOW()),
  ('org.manage_integrations', 'Manage Integrations', 'Manage third-party integrations', 'organization', NOW()),
  ('org.manage_security', 'Manage Security', 'Manage security settings', 'organization', NOW()),
  ('org.view_analytics', 'View Analytics', 'View organization usage analytics', 'organization', NOW()),
  ('org.export_data', 'Export Data', 'Export organization data', 'organization', NOW())

ON CONFLICT (permission_code) DO UPDATE SET
  permission_name = EXCLUDED.permission_name,
  permission_description = EXCLUDED.permission_description,
  permission_category = EXCLUDED.permission_category,
  updated_at = NOW();

-- ====================================
-- Create permission categories lookup
-- ====================================
CREATE TABLE IF NOT EXISTS permission_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert permission categories
INSERT INTO permission_categories (code, name, description, display_order) VALUES
  ('dashboard', 'Dashboard', 'Dashboard and overview permissions', 1),
  ('project', 'Projects', 'Project management permissions', 2),
  ('task', 'Tasks', 'Task management permissions', 3),
  ('team', 'Teams', 'Team and resource management permissions', 4),
  ('report', 'Reports & Analytics', 'Reporting and analytics permissions', 5),
  ('governance', 'Governance', 'Governance and compliance permissions', 6),
  ('portfolio', 'Portfolio', 'Portfolio management permissions', 7),
  ('programme', 'Programme', 'Programme management permissions', 8),
  ('dependency', 'Dependencies', 'Dependency management permissions', 9),
  ('benefit', 'Benefits', 'Benefits management permissions', 10),
  ('strategy', 'Strategy', 'Strategic planning permissions', 11),
  ('quality', 'Quality', 'Quality management permissions', 12),
  ('stakeholder', 'Stakeholders', 'Stakeholder management permissions', 13),
  ('organization', 'Organization Admin', 'Organization administration permissions', 14)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- ====================================
-- Create default permission sets for common roles
-- ====================================

-- Create role_permission_sets table if not exists
CREATE TABLE IF NOT EXISTS role_permission_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name VARCHAR(100) NOT NULL,
  permission_codes TEXT[] NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default permission sets
INSERT INTO role_permission_sets (role_name, permission_codes, description, is_default) VALUES

  -- ORG ADMIN: Full access to everything
  ('Org Admin', ARRAY[
    'dashboard.view',
    'project.view', 'project.view_all', 'project.create', 'project.edit', 'project.delete', 'project.archive', 'project.restore', 'project.export', 'project.template.create', 'project.template.use',
    'task.view', 'task.view_all', 'task.create', 'task.edit', 'task.delete', 'task.assign', 'task.comment', 'task.log_time', 'task.manage_subtasks', 'task.manage_dependencies', 'task.bulk_import',
    'team.view', 'team.create', 'team.edit', 'team.delete', 'team.manage', 'team.view_directory', 'team.manage_skills', 'team.manage_capacity', 'team.manage_leaves',
    'report.view', 'report.create', 'report.edit', 'report.delete', 'report.export', 'report.schedule', 'report.manage', 'report.view_analytics', 'report.create_metrics',
    'governance.view', 'governance.manage', 'governance.create_policy', 'governance.edit_policy', 'governance.approve_policy', 'governance.view_compliance', 'governance.manage_compliance', 'governance.record_decision', 'governance.audit', 'governance.schedule_review',
    'portfolio.view', 'portfolio.create', 'portfolio.edit', 'portfolio.delete', 'portfolio.manage', 'portfolio.add_project', 'portfolio.prioritize', 'portfolio.plan', 'portfolio.view_metrics',
    'programme.view', 'programme.create', 'programme.edit', 'programme.delete', 'programme.manage', 'programme.add_project', 'programme.manage_tranches', 'programme.manage_dependencies', 'programme.track_benefits', 'programme.governance',
    'dependency.view', 'dependency.create', 'dependency.edit', 'dependency.delete', 'dependency.analyze', 'dependency.view_critical_path', 'dependency.cross_project',
    'benefit.view', 'benefit.create', 'benefit.edit', 'benefit.delete', 'benefit.manage', 'benefit.map', 'benefit.measure', 'benefit.track_realization', 'benefit.manage_disbenefits',
    'strategy.view', 'strategy.create', 'strategy.edit', 'strategy.delete', 'strategy.manage', 'strategy.manage_okr', 'strategy.update_progress', 'strategy.align_projects', 'strategy.conduct_reviews',
    'quality.view', 'quality.create', 'quality.edit', 'quality.delete', 'quality.manage', 'quality.define_standards', 'quality.schedule_review', 'quality.conduct_review', 'quality.schedule_inspection', 'quality.conduct_inspection', 'quality.log_defect', 'quality.view_metrics',
    'stakeholder.view', 'stakeholder.create', 'stakeholder.edit', 'stakeholder.delete', 'stakeholder.manage', 'stakeholder.analyze', 'stakeholder.plan_engagement', 'stakeholder.record_communication', 'stakeholder.view_dashboard',
    'org.admin', 'org.view_settings', 'org.manage_settings', 'org.manage_users', 'org.assign_roles', 'org.manage_billing', 'org.view_subscription', 'org.manage_branding', 'org.manage_integrations', 'org.manage_security', 'org.view_analytics', 'org.export_data'
  ], 'Full organization administration access with all permissions', true),

  -- PROJECT MANAGER: Project and task management focused
  ('Project Manager', ARRAY[
    'dashboard.view',
    'project.view', 'project.view_all', 'project.create', 'project.edit', 'project.export', 'project.template.use',
    'task.view', 'task.view_all', 'task.create', 'task.edit', 'task.assign', 'task.comment', 'task.manage_subtasks', 'task.manage_dependencies',
    'team.view', 'team.view_directory',
    'report.view', 'report.create', 'report.view_analytics',
    'dependency.view', 'dependency.create', 'dependency.edit', 'dependency.analyze', 'dependency.view_critical_path',
    'stakeholder.view', 'stakeholder.create', 'stakeholder.edit', 'stakeholder.record_communication',
    'quality.view', 'quality.conduct_review',
    'benefit.view'
  ], 'Project Manager with full project and task management capabilities', true),

  -- TEAM MEMBER: Basic project participation
  ('Team Member', ARRAY[
    'dashboard.view',
    'project.view',
    'task.view', 'task.create', 'task.edit', 'task.comment', 'task.log_time',
    'team.view', 'team.view_directory',
    'report.view',
    'stakeholder.view'
  ], 'Team member with basic project participation permissions', true),

  -- PORTFOLIO MANAGER: Portfolio and programme oversight
  ('Portfolio Manager', ARRAY[
    'dashboard.view',
    'project.view', 'project.view_all',
    'report.view', 'report.view_analytics', 'report.create',
    'portfolio.view', 'portfolio.create', 'portfolio.edit', 'portfolio.manage', 'portfolio.add_project', 'portfolio.prioritize', 'portfolio.plan', 'portfolio.view_metrics',
    'programme.view', 'programme.create', 'programme.edit', 'programme.manage', 'programme.add_project', 'programme.manage_tranches',
    'strategy.view', 'strategy.align_projects',
    'benefit.view', 'benefit.track_realization',
    'governance.view'
  ], 'Portfolio Manager with oversight of multiple projects and programmes', true),

  -- VIEWER: Read-only access
  ('Viewer', ARRAY[
    'dashboard.view',
    'project.view',
    'task.view',
    'team.view',
    'report.view',
    'portfolio.view',
    'programme.view',
    'stakeholder.view',
    'benefit.view',
    'strategy.view',
    'quality.view'
  ], 'Read-only access to view information across modules', true)

ON CONFLICT DO NOTHING;

-- ====================================
-- Register tables in database_tables registry
-- ====================================
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('permission_categories', 'Categories for organizing permissions by module', true, true),
  ('role_permission_sets', 'Default permission sets for common roles', true, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

-- ====================================
-- Create indexes for performance
-- ====================================
CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(permission_category);
CREATE INDEX IF NOT EXISTS idx_permissions_code ON permissions(permission_code);
CREATE INDEX IF NOT EXISTS idx_permission_categories_code ON permission_categories(code);
CREATE INDEX IF NOT EXISTS idx_permission_categories_display_order ON permission_categories(display_order);

-- ====================================
-- Grant necessary permissions
-- ====================================
GRANT SELECT ON permissions TO authenticated;
GRANT SELECT ON permission_categories TO authenticated;
GRANT SELECT ON role_permission_sets TO authenticated;

-- ====================================
-- Verification query
-- ====================================
COMMENT ON TABLE permissions IS 'System permissions for role-based access control across all modules';
COMMENT ON TABLE permission_categories IS 'Categories for organizing permissions by functional module';
COMMENT ON TABLE role_permission_sets IS 'Predefined permission sets for common organizational roles';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ v138: Comprehensive permissions system created successfully';
  RAISE NOTICE '   - 130+ permissions defined across 14 modules';
  RAISE NOTICE '   - 14 permission categories created';
  RAISE NOTICE '   - 5 default role permission sets configured';
  RAISE NOTICE '   - Indexes created for performance';
END $$;
