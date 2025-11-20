-- ================================================
-- File: v12_seed_data_rbac.sql
-- Description: RBAC seed data - Roles, Permissions, and Assignments
-- Version: 1.0
-- Date: 2025-11-15
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - v01 through v09 must be run first (all tables must exist)
-- - v11_seed_data_system.sql should be run first

-- Purpose:
-- Creates complete RBAC foundation:
-- 1. Permissions (~60 permissions)
-- 2. Roles (7 roles)
-- 3. Role-Permission Assignments

-- Note: This script is idempotent and can be run multiple times safely

-- ================================================
-- SECTION 1: PERMISSIONS
-- ================================================

DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Seed Data: Permissions';
    RAISE NOTICE '================================================';
END $$;

-- ------------------------------------------------
-- MODULE: Projects
-- ------------------------------------------------

INSERT INTO permissions (permission_code, permission_name, permission_description, permission_category, permission_module, permission_type, is_active)
VALUES
    ('project.create', 'Create Projects', 'Create new projects', 'projects', 'projects', 'create', true),
    ('project.read', 'View Projects', 'View project information', 'projects', 'projects', 'read', true),
    ('project.update', 'Edit Projects', 'Edit project information', 'projects', 'projects', 'update', true),
    ('project.delete', 'Delete Projects', 'Delete projects', 'projects', 'projects', 'delete', true),
    ('project.archive', 'Archive Projects', 'Archive/unarchive projects', 'projects', 'projects', 'execute', true),
    ('project.export', 'Export Projects', 'Export project data', 'projects', 'projects', 'execute', true),
    ('project.manage_members', 'Manage Project Members', 'Add/remove project members', 'projects', 'projects', 'execute', true),
    ('project.manage_settings', 'Manage Project Settings', 'Configure project settings', 'projects', 'projects', 'execute', true),
    ('project.view_budget', 'View Project Budget', 'View budget information', 'projects', 'projects', 'read', true),
    ('project.manage_budget', 'Manage Project Budget', 'Edit budget information', 'projects', 'projects', 'update', true)
ON CONFLICT (permission_code) DO UPDATE SET
    permission_name = EXCLUDED.permission_name,
    permission_description = EXCLUDED.permission_description,
    updated_at = NOW();

-- ------------------------------------------------
-- MODULE: Tasks
-- ------------------------------------------------

INSERT INTO permissions (permission_code, permission_name, permission_description, permission_category, permission_module, permission_type, is_active)
VALUES
    ('task.create', 'Create Tasks', 'Create new tasks', 'tasks', 'tasks', 'create', true),
    ('task.read', 'View Tasks', 'View task information', 'tasks', 'tasks', 'read', true),
    ('task.update', 'Edit Tasks', 'Edit task information', 'tasks', 'tasks', 'update', true),
    ('task.delete', 'Delete Tasks', 'Delete tasks', 'tasks', 'tasks', 'delete', true),
    ('task.assign', 'Assign Tasks', 'Assign tasks to users', 'tasks', 'tasks', 'execute', true),
    ('task.update_status', 'Update Task Status', 'Change task status', 'tasks', 'tasks', 'update', true),
    ('task.comment', 'Comment on Tasks', 'Add comments to tasks', 'tasks', 'tasks', 'create', true),
    ('task.view_all', 'View All Tasks', 'View all tasks in projects', 'tasks', 'tasks', 'read', true)
ON CONFLICT (permission_code) DO UPDATE SET
    permission_name = EXCLUDED.permission_name,
    permission_description = EXCLUDED.permission_description,
    updated_at = NOW();

-- ------------------------------------------------
-- MODULE: Teams
-- ------------------------------------------------

INSERT INTO permissions (permission_code, permission_name, permission_description, permission_category, permission_module, permission_type, is_active)
VALUES
    ('team.create', 'Create Teams', 'Create new teams', 'teams', 'teams', 'create', true),
    ('team.read', 'View Teams', 'View team information', 'teams', 'teams', 'read', true),
    ('team.update', 'Edit Teams', 'Edit team information', 'teams', 'teams', 'update', true),
    ('team.delete', 'Delete Teams', 'Delete teams', 'teams', 'teams', 'delete', true),
    ('team.manage_members', 'Manage Team Members', 'Add/remove team members', 'teams', 'teams', 'execute', true),
    ('team.assign_roles', 'Assign Team Roles', 'Assign roles to team members', 'teams', 'teams', 'execute', true)
ON CONFLICT (permission_code) DO UPDATE SET
    permission_name = EXCLUDED.permission_name,
    permission_description = EXCLUDED.permission_description,
    updated_at = NOW();

-- ------------------------------------------------
-- MODULE: Users
-- ------------------------------------------------

INSERT INTO permissions (permission_code, permission_name, permission_description, permission_category, permission_module, permission_type, is_active)
VALUES
    ('user.create', 'Create Users', 'Create new user accounts', 'users', 'users', 'create', true),
    ('user.read', 'View Users', 'View user information', 'users', 'users', 'read', true),
    ('user.update', 'Edit Users', 'Edit user information', 'users', 'users', 'update', true),
    ('user.delete', 'Delete Users', 'Delete user accounts', 'users', 'users', 'delete', true),
    ('user.manage_roles', 'Manage User Roles', 'Assign/remove user roles', 'users', 'users', 'execute', true),
    ('user.manage_permissions', 'Manage User Permissions', 'Manage user permissions', 'users', 'users', 'execute', true),
    ('user.activate_deactivate', 'Activate/Deactivate Users', 'Enable/disable user accounts', 'users', 'users', 'execute', true),
    ('user.reset_password', 'Reset User Password', 'Reset user passwords', 'users', 'users', 'execute', true)
ON CONFLICT (permission_code) DO UPDATE SET
    permission_name = EXCLUDED.permission_name,
    permission_description = EXCLUDED.permission_description,
    updated_at = NOW();

-- ------------------------------------------------
-- MODULE: Reports
-- ------------------------------------------------

INSERT INTO permissions (permission_code, permission_name, permission_description, permission_category, permission_module, permission_type, is_active)
VALUES
    ('report.create', 'Create Reports', 'Create custom reports', 'reports', 'reports', 'create', true),
    ('report.read', 'View Reports', 'View reports and dashboards', 'reports', 'reports', 'read', true),
    ('report.update', 'Edit Reports', 'Edit report definitions', 'reports', 'reports', 'update', true),
    ('report.delete', 'Delete Reports', 'Delete custom reports', 'reports', 'reports', 'delete', true),
    ('report.export', 'Export Reports', 'Export reports to various formats', 'reports', 'reports', 'execute', true),
    ('report.schedule', 'Schedule Reports', 'Schedule automated report generation', 'reports', 'reports', 'execute', true),
    ('report.view_analytics', 'View Analytics', 'View analytics and insights', 'reports', 'reports', 'read', true)
ON CONFLICT (permission_code) DO UPDATE SET
    permission_name = EXCLUDED.permission_name,
    permission_description = EXCLUDED.permission_description,
    updated_at = NOW();

-- ------------------------------------------------
-- MODULE: System
-- ------------------------------------------------

INSERT INTO permissions (permission_code, permission_name, permission_description, permission_category, permission_module, permission_type, is_active)
VALUES
    ('system.settings', 'Manage System Settings', 'Configure system settings', 'system', 'system', 'update', true),
    ('system.audit', 'View Audit Logs', 'View system audit logs', 'system', 'system', 'read', true),
    ('system.backup', 'Manage Backups', 'Create and manage system backups', 'system', 'system', 'execute', true),
    ('system.maintenance', 'System Maintenance', 'Perform system maintenance tasks', 'system', 'system', 'execute', true),
    ('system.monitor', 'System Monitoring', 'Monitor system health and performance', 'system', 'system', 'read', true),
    ('system.manage_integrations', 'Manage Integrations', 'Configure third-party integrations', 'system', 'system', 'update', true)
ON CONFLICT (permission_code) DO UPDATE SET
    permission_name = EXCLUDED.permission_name,
    permission_description = EXCLUDED.permission_description,
    updated_at = NOW();

-- ------------------------------------------------
-- MODULE: Settings
-- ------------------------------------------------

INSERT INTO permissions (permission_code, permission_name, permission_description, permission_category, permission_module, permission_type, is_active)
VALUES
    ('settings.read', 'View Settings', 'View application settings', 'settings', 'settings', 'read', true),
    ('settings.update', 'Edit Settings', 'Edit application settings', 'settings', 'settings', 'update', true),
    ('settings.manage_roles', 'Manage Roles', 'Create and manage roles', 'settings', 'settings', 'update', true),
    ('settings.manage_permissions', 'Manage Permissions', 'Manage permission definitions', 'settings', 'settings', 'update', true),
    ('settings.manage_methodologies', 'Manage Methodologies', 'Configure methodologies', 'settings', 'settings', 'update', true),
    ('settings.manage_workflows', 'Manage Workflows', 'Configure workflows', 'settings', 'settings', 'update', true),
    ('settings.manage_templates', 'Manage Templates', 'Manage email and project templates', 'settings', 'settings', 'update', true),
    ('settings.manage_menus', 'Manage Menus', 'Configure navigation menus', 'settings', 'settings', 'update', true)
ON CONFLICT (permission_code) DO UPDATE SET
    permission_name = EXCLUDED.permission_name,
    permission_description = EXCLUDED.permission_description,
    updated_at = NOW();

-- ------------------------------------------------
-- MODULE: Documents
-- ------------------------------------------------

INSERT INTO permissions (permission_code, permission_name, permission_description, permission_category, permission_module, permission_type, is_active)
VALUES
    ('document.create', 'Upload Documents', 'Upload new documents', 'documents', 'documents', 'create', true),
    ('document.read', 'View Documents', 'View and download documents', 'documents', 'documents', 'read', true),
    ('document.update', 'Edit Documents', 'Edit document metadata', 'documents', 'documents', 'update', true),
    ('document.delete', 'Delete Documents', 'Delete documents', 'documents', 'documents', 'delete', true),
    ('document.manage_versions', 'Manage Document Versions', 'Manage document versions', 'documents', 'documents', 'execute', true)
ON CONFLICT (permission_code) DO UPDATE SET
    permission_name = EXCLUDED.permission_name,
    permission_description = EXCLUDED.permission_description,
    updated_at = NOW();

-- ------------------------------------------------
-- MODULE: Time Tracking
-- ------------------------------------------------

INSERT INTO permissions (permission_code, permission_name, permission_description, permission_category, permission_module, permission_type, is_active)
VALUES
    ('time.log', 'Log Time', 'Log time entries', 'time', 'time', 'create', true),
    ('time.read', 'View Time Entries', 'View time tracking data', 'time', 'time', 'read', true),
    ('time.update', 'Edit Time Entries', 'Edit time entries', 'time', 'time', 'update', true),
    ('time.delete', 'Delete Time Entries', 'Delete time entries', 'time', 'time', 'delete', true),
    ('time.approve', 'Approve Time Entries', 'Approve time entries', 'time', 'time', 'execute', true),
    ('time.view_all', 'View All Time Entries', 'View time entries for all users', 'time', 'time', 'read', true)
ON CONFLICT (permission_code) DO UPDATE SET
    permission_name = EXCLUDED.permission_name,
    permission_description = EXCLUDED.permission_description,
    updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'Permissions created successfully';
    RAISE NOTICE '';
END $$;

-- ================================================
-- SECTION 2: ROLES
-- ================================================

DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Seed Data: Roles';
    RAISE NOTICE '================================================';
END $$;

INSERT INTO roles (role_name, role_display_name, role_description, role_level, is_active, is_system_role)
VALUES
    ('system_admin', 'System Admin', 'Full system access with all permissions', 100, true, true),
    ('org_admin', 'Organization Admin', 'Organization-level administrator with most permissions', 80, true, false),
    ('project_manager', 'Project Manager', 'Manages projects, teams, and tasks', 60, true, false),
    ('team_lead', 'Team Lead', 'Leads teams and manages team tasks', 40, true, false),
    ('team_member', 'Team Member', 'Basic project and task participation', 20, true, false),
    ('stakeholder', 'Stakeholder', 'Read-only access to projects', 10, true, false),
    ('viewer', 'Viewer', 'Minimal read-only access', 5, true, false)
ON CONFLICT (role_name) DO UPDATE SET
    role_display_name = EXCLUDED.role_display_name,
    role_description = EXCLUDED.role_description,
    role_level = EXCLUDED.role_level,
    updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'Roles created successfully';
    RAISE NOTICE '';
END $$;

-- ================================================
-- SECTION 3: ROLE-PERMISSION ASSIGNMENTS
-- ================================================

DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Seed Data: Role-Permission Assignments';
    RAISE NOTICE '================================================';
END $$;

-- ------------------------------------------------
-- ROLE: System Admin
-- Permissions: ALL
-- ------------------------------------------------

INSERT INTO role_permissions (role_id, permission_id, is_active)
SELECT
    r.id AS role_id,
    p.id AS permission_id,
    true AS is_active
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name = 'system_admin'
  AND p.is_deleted = FALSE
  AND p.is_active = TRUE
ON CONFLICT (role_id, permission_id) DO UPDATE SET
    is_active = true,
    updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'System Admin role: ALL permissions assigned';
END $$;

-- ------------------------------------------------
-- ROLE: Organization Admin
-- Permissions: Most except system-level
-- ------------------------------------------------

INSERT INTO role_permissions (role_id, permission_id, is_active)
SELECT
    r.id AS role_id,
    p.id AS permission_id,
    true AS is_active
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name = 'org_admin'
  AND p.is_deleted = FALSE
  AND p.is_active = TRUE
  AND p.permission_code NOT IN (
      'system.settings',
      'system.backup',
      'system.maintenance',
      'settings.manage_permissions'
  )
ON CONFLICT (role_id, permission_id) DO UPDATE SET
    is_active = true,
    updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'Organization Admin role: permissions assigned';
END $$;

-- ------------------------------------------------
-- ROLE: Project Manager
-- Permissions: Projects, Tasks, Teams, Reports, Documents, Time
-- ------------------------------------------------

INSERT INTO role_permissions (role_id, permission_id, is_active)
SELECT
    r.id AS role_id,
    p.id AS permission_id,
    true AS is_active
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name = 'project_manager'
  AND p.is_deleted = FALSE
  AND p.is_active = TRUE
  AND p.permission_module IN ('projects', 'tasks', 'teams', 'reports', 'documents', 'time')
ON CONFLICT (role_id, permission_id) DO UPDATE SET
    is_active = true,
    updated_at = NOW();

-- Add settings read permission
INSERT INTO role_permissions (role_id, permission_id, is_active)
SELECT
    r.id AS role_id,
    p.id AS permission_id,
    true AS is_active
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name = 'project_manager'
  AND p.permission_code = 'settings.read'
ON CONFLICT (role_id, permission_id) DO UPDATE SET
    is_active = true,
    updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'Project Manager role: permissions assigned';
END $$;

-- ------------------------------------------------
-- ROLE: Team Lead
-- Permissions: Tasks, Teams (manage), Projects (read), Reports (read), Time
-- ------------------------------------------------

INSERT INTO role_permissions (role_id, permission_id, is_active)
SELECT
    r.id AS role_id,
    p.id AS permission_id,
    true AS is_active
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name = 'team_lead'
  AND p.is_deleted = FALSE
  AND p.is_active = TRUE
  AND p.permission_code IN (
      -- Tasks: Full access
      'task.create', 'task.read', 'task.update', 'task.delete', 'task.assign',
      'task.update_status', 'task.comment', 'task.view_all',
      -- Teams: Full access
      'team.create', 'team.read', 'team.update', 'team.manage_members', 'team.assign_roles',
      -- Projects: Read only
      'project.read',
      -- Reports: Read only
      'report.read', 'report.view_analytics', 'report.export',
      -- Documents: Read and create
      'document.create', 'document.read',
      -- Time: Full access
      'time.log', 'time.read', 'time.update', 'time.delete', 'time.approve', 'time.view_all'
  )
ON CONFLICT (role_id, permission_id) DO UPDATE SET
    is_active = true,
    updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'Team Lead role: permissions assigned';
END $$;

-- ------------------------------------------------
-- ROLE: Team Member
-- Permissions: Basic task and project participation
-- ------------------------------------------------

INSERT INTO role_permissions (role_id, permission_id, is_active)
SELECT
    r.id AS role_id,
    p.id AS permission_id,
    true AS is_active
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name = 'team_member'
  AND p.is_deleted = FALSE
  AND p.is_active = TRUE
  AND p.permission_code IN (
      -- Tasks: Create, read, update own tasks, comment
      'task.create', 'task.read', 'task.update', 'task.comment', 'task.update_status',
      -- Projects: Read only
      'project.read',
      -- Teams: Read only
      'team.read',
      -- Documents: Read and create
      'document.create', 'document.read',
      -- Time: Log and manage own time
      'time.log', 'time.read', 'time.update'
  )
ON CONFLICT (role_id, permission_id) DO UPDATE SET
    is_active = true,
    updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'Team Member role: permissions assigned';
END $$;

-- ------------------------------------------------
-- ROLE: Stakeholder
-- Permissions: Read-only access to projects, reports
-- ------------------------------------------------

INSERT INTO role_permissions (role_id, permission_id, is_active)
SELECT
    r.id AS role_id,
    p.id AS permission_id,
    true AS is_active
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name = 'stakeholder'
  AND p.is_deleted = FALSE
  AND p.is_active = TRUE
  AND p.permission_code IN (
      -- Projects: Read only
      'project.read', 'project.view_budget',
      -- Tasks: Read only
      'task.read',
      -- Teams: Read only
      'team.read',
      -- Reports: Read only
      'report.read', 'report.view_analytics',
      -- Documents: Read only
      'document.read'
  )
ON CONFLICT (role_id, permission_id) DO UPDATE SET
    is_active = true,
    updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'Stakeholder role: permissions assigned';
END $$;

-- ------------------------------------------------
-- ROLE: Viewer
-- Permissions: Minimal read-only access
-- ------------------------------------------------

INSERT INTO role_permissions (role_id, permission_id, is_active)
SELECT
    r.id AS role_id,
    p.id AS permission_id,
    true AS is_active
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name = 'viewer'
  AND p.is_deleted = FALSE
  AND p.is_active = TRUE
  AND p.permission_code IN (
      -- Projects: Read only
      'project.read',
      -- Tasks: Read only
      'task.read',
      -- Reports: Read only
      'report.read'
  )
ON CONFLICT (role_id, permission_id) DO UPDATE SET
    is_active = true,
    updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'Viewer role: permissions assigned';
    RAISE NOTICE '';
END $$;

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
DECLARE
    v_permissions_count INTEGER;
    v_roles_count INTEGER;
    v_assignments_count INTEGER;
    v_system_admin_perms INTEGER;
    v_role RECORD;
BEGIN
    -- Count permissions
    SELECT COUNT(*)
    INTO v_permissions_count
    FROM permissions
    WHERE is_deleted = FALSE;

    -- Count roles
    SELECT COUNT(*)
    INTO v_roles_count
    FROM roles
    WHERE is_deleted = FALSE;

    -- Count role-permission assignments
    SELECT COUNT(*)
    INTO v_assignments_count
    FROM role_permissions
    WHERE is_deleted = FALSE
      AND is_active = TRUE;

    -- Count System Admin permissions (should have all)
    SELECT COUNT(rp.*)
    INTO v_system_admin_perms
    FROM role_permissions rp
    JOIN roles r ON rp.role_id = r.id
    WHERE r.role_name = 'system_admin'
      AND rp.is_deleted = FALSE
      AND rp.is_active = TRUE;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'RBAC Seed Data Created';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Permissions Created:       %', v_permissions_count;
    RAISE NOTICE 'Roles Created:             %', v_roles_count;
    RAISE NOTICE 'Total Assignments:         %', v_assignments_count;
    RAISE NOTICE 'System Admin Permissions:  %', v_system_admin_perms;
    RAISE NOTICE '================================================';

    -- Display role summary
    RAISE NOTICE '';
    RAISE NOTICE 'ROLE SUMMARY:';
    RAISE NOTICE '----------------------------------------';

    FOR v_role IN
        SELECT
            r.role_name,
            COUNT(rp.permission_id) AS permission_count
        FROM roles r
        LEFT JOIN role_permissions rp ON r.id = rp.role_id AND rp.is_deleted = FALSE AND rp.is_active = TRUE
        WHERE r.is_deleted = FALSE
        GROUP BY r.id, r.role_name
        ORDER BY r.role_level DESC
    LOOP
        RAISE NOTICE '% - % permissions', v_role.role_name, v_role.permission_count;
    END LOOP;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'v12_seed_data_rbac.sql completed successfully';
    RAISE NOTICE '================================================';
END $$;

-- ================================================
-- END OF FILE
-- ================================================

-- Next Steps:
-- Run v13_seed_data_methodologies.sql to create methodologies and workflows
