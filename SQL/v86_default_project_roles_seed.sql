-- ============================================================================
-- Default Project Roles & PM Permissions Seed Data
-- Version: v86
-- Description: Seeds default project role templates and PM Platform permissions
-- Author: Development Team
-- Date: 2025-11-27
-- ============================================================================

-- Prerequisites:
-- - v03_user_access_tables.sql (users, roles, permissions, role_permissions)
-- - v84_accounts_and_extensions.sql (accounts)
-- - v85_project_invitations_seats.sql (invitations, seats)

-- Purpose:
-- 1. Insert PM Platform specific permissions
-- 2. Insert default project role templates
-- 3. Map permissions to roles
-- 4. These are TEMPLATES that can be cloned per project

-- ============================================================================
-- PART 1: PM Platform Permissions
-- Description: Granular permissions for PM Platform features
-- ============================================================================

-- Project Management Permissions
INSERT INTO permissions (permission_code, permission_name, permission_description, permission_category, permission_module, permission_type, is_system_permission, is_active)
VALUES
    ('project.view', 'View Project', 'View project details and dashboard', 'project', 'core', 'read', true, true),
    ('project.edit', 'Edit Project', 'Edit project information and settings', 'project', 'core', 'update', true, true),
    ('project.delete', 'Delete Project', 'Delete or archive projects', 'project', 'core', 'delete', true, true),
    ('project.manage_settings', 'Manage Project Settings', 'Configure project settings and preferences', 'project', 'core', 'execute', true, true)
ON CONFLICT (permission_code) DO UPDATE SET
    permission_description = EXCLUDED.permission_description,
    updated_at = NOW();

-- User & Team Management Permissions
INSERT INTO permissions (permission_code, permission_name, permission_description, permission_category, permission_module, permission_type, is_system_permission, is_active)
VALUES
    ('user.view', 'View Users', 'View project team members and their details', 'user', 'core', 'read', true, true),
    ('user.invite', 'Invite Users', 'Send invitations to new team members', 'user', 'core', 'create', true, true),
    ('user.remove', 'Remove Users', 'Remove users from the project', 'user', 'core', 'delete', true, true),
    ('user.change_role', 'Change User Roles', 'Modify user role assignments', 'user', 'core', 'update', true, true)
ON CONFLICT (permission_code) DO UPDATE SET
    permission_description = EXCLUDED.permission_description,
    updated_at = NOW();

-- Role Management Permissions
INSERT INTO permissions (permission_code, permission_name, permission_description, permission_category, permission_module, permission_type, is_system_permission, is_active)
VALUES
    ('role.view', 'View Roles', 'View project roles and permissions', 'role', 'core', 'read', true, true),
    ('role.create', 'Create Roles', 'Create custom project roles', 'role', 'core', 'create', true, true),
    ('role.edit', 'Edit Roles', 'Modify role permissions', 'role', 'core', 'update', true, true),
    ('role.delete', 'Delete Roles', 'Delete custom roles', 'role', 'core', 'delete', true, true)
ON CONFLICT (permission_code) DO UPDATE SET
    permission_description = EXCLUDED.permission_description,
    updated_at = NOW();

-- Task Management Permissions
INSERT INTO permissions (permission_code, permission_name, permission_description, permission_category, permission_module, permission_type, is_system_permission, is_active)
VALUES
    ('task.view', 'View Tasks', 'View project tasks and assignments', 'task', 'core', 'read', true, true),
    ('task.create', 'Create Tasks', 'Create new tasks', 'task', 'core', 'create', true, true),
    ('task.edit', 'Edit Tasks', 'Modify task details', 'task', 'core', 'update', true, true),
    ('task.delete', 'Delete Tasks', 'Delete tasks', 'task', 'core', 'delete', true, true),
    ('task.assign', 'Assign Tasks', 'Assign tasks to team members', 'task', 'core', 'execute', true, true),
    ('task.comment', 'Comment on Tasks', 'Add comments to tasks', 'task', 'core', 'create', true, true)
ON CONFLICT (permission_code) DO UPDATE SET
    permission_description = EXCLUDED.permission_description,
    updated_at = NOW();

-- Risk Management Permissions
INSERT INTO permissions (permission_code, permission_name, permission_description, permission_category, permission_module, permission_type, is_system_permission, is_active)
VALUES
    ('risk.view', 'View Risks', 'View project risks and issues', 'risk', 'core', 'read', true, true),
    ('risk.create', 'Create Risks', 'Log new risks or issues', 'risk', 'core', 'create', true, true),
    ('risk.edit', 'Edit Risks', 'Modify risk details and assessments', 'risk', 'core', 'update', true, true),
    ('risk.delete', 'Delete Risks', 'Delete risks or issues', 'risk', 'core', 'delete', true, true)
ON CONFLICT (permission_code) DO UPDATE SET
    permission_description = EXCLUDED.permission_description,
    updated_at = NOW();

-- Document Management Permissions
INSERT INTO permissions (permission_code, permission_name, permission_description, permission_category, permission_module, permission_type, is_system_permission, is_active)
VALUES
    ('document.view', 'View Documents', 'View and download project documents', 'document', 'core', 'read', true, true),
    ('document.upload', 'Upload Documents', 'Upload new documents', 'document', 'core', 'create', true, true),
    ('document.edit', 'Edit Documents', 'Modify document metadata', 'document', 'core', 'update', true, true),
    ('document.delete', 'Delete Documents', 'Delete documents', 'document', 'core', 'delete', true, true)
ON CONFLICT (permission_code) DO UPDATE SET
    permission_description = EXCLUDED.permission_description,
    updated_at = NOW();

-- Financial Permissions
INSERT INTO permissions (permission_code, permission_name, permission_description, permission_category, permission_module, permission_type, is_system_permission, is_active)
VALUES
    ('financial.view_budget', 'View Budget', 'View project budget and costs', 'financial', 'core', 'read', true, true),
    ('financial.edit_budget', 'Edit Budget', 'Modify project budget', 'financial', 'core', 'update', true, true),
    ('financial.approve_expenses', 'Approve Expenses', 'Approve project expenses', 'financial', 'core', 'execute', true, true)
ON CONFLICT (permission_code) DO UPDATE SET
    permission_description = EXCLUDED.permission_description,
    updated_at = NOW();

-- Reporting Permissions
INSERT INTO permissions (permission_code, permission_name, permission_description, permission_category, permission_module, permission_type, is_system_permission, is_active)
VALUES
    ('report.view', 'View Reports', 'View project reports and analytics', 'report', 'core', 'read', true, true),
    ('report.export', 'Export Reports', 'Export reports and data', 'report', 'core', 'execute', true, true),
    ('report.schedule', 'Schedule Reports', 'Configure automated reports', 'report', 'core', 'execute', true, true)
ON CONFLICT (permission_code) DO UPDATE SET
    permission_description = EXCLUDED.permission_description,
    updated_at = NOW();

-- Billing & Subscription Permissions
INSERT INTO permissions (permission_code, permission_name, permission_description, permission_category, permission_module, permission_type, is_system_permission, is_active)
VALUES
    ('billing.view', 'View Billing', 'View subscription and billing information', 'billing', 'core', 'read', true, true),
    ('billing.manage', 'Manage Billing', 'Manage subscription and payments', 'billing', 'core', 'update', true, true),
    ('billing.purchase_seats', 'Purchase Seats', 'Purchase additional user seats', 'billing', 'core', 'execute', true, true)
ON CONFLICT (permission_code) DO UPDATE SET
    permission_description = EXCLUDED.permission_description,
    updated_at = NOW();

-- Settings Permissions
INSERT INTO permissions (permission_code, permission_name, permission_description, permission_category, permission_module, permission_type, is_system_permission, is_active)
VALUES
    ('settings.view', 'View Settings', 'View project settings', 'settings', 'core', 'read', true, true),
    ('settings.edit', 'Edit Settings', 'Modify project settings', 'settings', 'core', 'update', true, true)
ON CONFLICT (permission_code) DO UPDATE SET
    permission_description = EXCLUDED.permission_description,
    updated_at = NOW();

-- ============================================================================
-- PART 2: Default Project Role Templates
-- Description: Standard project roles (can be cloned per project)
-- Note: These use the existing 'roles' table
-- ============================================================================

-- Role Template 1: Project Board (Executive Oversight)
INSERT INTO roles (
    role_name, role_display_name, role_description, role_level,
    is_system_role, is_default_role,
    can_manage_users, can_manage_projects, can_manage_system,
    is_active
)
VALUES (
    'pm_project_board',
    'Project Board',
    'Executive oversight and strategic governance. Highest authority in project decisions.',
    10,
    true,
    false,
    true,
    true,
    false,
    true
)
ON CONFLICT (role_name) DO UPDATE SET
    role_description = EXCLUDED.role_description,
    updated_at = NOW();

-- Role Template 2: Programme Manager
INSERT INTO roles (
    role_name, role_display_name, role_description, role_level,
    is_system_role, is_default_role,
    can_manage_users, can_manage_projects, can_manage_system,
    is_active
)
VALUES (
    'pm_programme_manager',
    'Programme Manager',
    'Coordinates multiple related projects and ensures strategic alignment.',
    9,
    true,
    false,
    true,
    true,
    false,
    true
)
ON CONFLICT (role_name) DO UPDATE SET
    role_description = EXCLUDED.role_description,
    updated_at = NOW();

-- Role Template 3: Project Manager
INSERT INTO roles (
    role_name, role_display_name, role_description, role_level,
    is_system_role, is_default_role,
    can_manage_users, can_manage_projects, can_manage_system,
    is_active
)
VALUES (
    'pm_project_manager',
    'Project Manager',
    'Day-to-day project management, planning, and execution oversight.',
    8,
    true,
    true, -- Default role for new PM account owners
    true,
    true,
    false,
    true
)
ON CONFLICT (role_name) DO UPDATE SET
    role_description = EXCLUDED.role_description,
    updated_at = NOW();

-- Role Template 4: Team Manager/Lead
INSERT INTO roles (
    role_name, role_display_name, role_description, role_level,
    is_system_role, is_default_role,
    can_manage_users, can_manage_projects, can_manage_system,
    is_active
)
VALUES (
    'pm_team_manager',
    'Team Manager',
    'Supervises team members and coordinates team activities.',
    7,
    true,
    false,
    true,
    false,
    false,
    true
)
ON CONFLICT (role_name) DO UPDATE SET
    role_description = EXCLUDED.role_description,
    updated_at = NOW();

-- Role Template 5: Project Assurance
INSERT INTO roles (
    role_name, role_display_name, role_description, role_level,
    is_system_role, is_default_role,
    can_manage_users, can_manage_projects, can_manage_system,
    is_active
)
VALUES (
    'pm_project_assurance',
    'Project Assurance',
    'Provides independent oversight of project quality and compliance.',
    6,
    true,
    false,
    false,
    false,
    false,
    true
)
ON CONFLICT (role_name) DO UPDATE SET
    role_description = EXCLUDED.role_description,
    updated_at = NOW();

-- Role Template 6: Business Analyst
INSERT INTO roles (
    role_name, role_display_name, role_description, role_level,
    is_system_role, is_default_role,
    can_manage_users, can_manage_projects, can_manage_system,
    is_active
)
VALUES (
    'pm_business_analyst',
    'Business Analyst',
    'Analyzes requirements and documents business needs.',
    5,
    true,
    false,
    false,
    false,
    false,
    true
)
ON CONFLICT (role_name) DO UPDATE SET
    role_description = EXCLUDED.role_description,
    updated_at = NOW();

-- Role Template 7: Team Member
INSERT INTO roles (
    role_name, role_display_name, role_description, role_level,
    is_system_role, is_default_role,
    can_manage_users, can_manage_projects, can_manage_system,
    is_active
)
VALUES (
    'pm_team_member',
    'Team Member',
    'Contributes to project deliverables and executes assigned tasks.',
    3,
    true,
    false,
    false,
    false,
    false,
    true
)
ON CONFLICT (role_name) DO UPDATE SET
    role_description = EXCLUDED.role_description,
    updated_at = NOW();

-- ============================================================================
-- PART 3: Role-Permission Mappings
-- Description: Assign permissions to default roles
-- ============================================================================

-- Function to assign permission to role by codes
CREATE OR REPLACE FUNCTION assign_permission_to_role(
    p_role_name VARCHAR,
    p_permission_code VARCHAR
)
RETURNS VOID AS $$
DECLARE
    v_role_id UUID;
    v_permission_id UUID;
BEGIN
    -- Get role ID
    SELECT id INTO v_role_id FROM roles WHERE role_name = p_role_name;

    -- Get permission ID
    SELECT id INTO v_permission_id FROM permissions WHERE permission_code = p_permission_code;

    -- Insert mapping if both exist
    IF v_role_id IS NOT NULL AND v_permission_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id, is_active)
        VALUES (v_role_id, v_permission_id, true)
        ON CONFLICT (role_id, permission_id) DO UPDATE
        SET is_active = true, updated_at = NOW();
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Assign permissions to Project Board (Full access)
DO $$
DECLARE
    perm_codes TEXT[] := ARRAY[
        'project.view', 'project.edit', 'project.delete', 'project.manage_settings',
        'user.view', 'user.invite', 'user.remove', 'user.change_role',
        'role.view', 'role.create', 'role.edit', 'role.delete',
        'task.view', 'task.create', 'task.edit', 'task.delete', 'task.assign', 'task.comment',
        'risk.view', 'risk.create', 'risk.edit', 'risk.delete',
        'document.view', 'document.upload', 'document.edit', 'document.delete',
        'financial.view_budget', 'financial.edit_budget', 'financial.approve_expenses',
        'report.view', 'report.export', 'report.schedule',
        'billing.view', 'billing.manage', 'billing.purchase_seats',
        'settings.view', 'settings.edit'
    ];
    perm TEXT;
BEGIN
    FOREACH perm IN ARRAY perm_codes
    LOOP
        PERFORM assign_permission_to_role('pm_project_board', perm);
    END LOOP;
END $$;

-- Assign permissions to Programme Manager
DO $$
DECLARE
    perm_codes TEXT[] := ARRAY[
        'project.view', 'project.edit', 'project.manage_settings',
        'user.view', 'user.invite', 'user.remove', 'user.change_role',
        'role.view', 'role.create', 'role.edit',
        'task.view', 'task.create', 'task.edit', 'task.delete', 'task.assign', 'task.comment',
        'risk.view', 'risk.create', 'risk.edit', 'risk.delete',
        'document.view', 'document.upload', 'document.edit', 'document.delete',
        'financial.view_budget', 'financial.edit_budget',
        'report.view', 'report.export', 'report.schedule',
        'billing.view',
        'settings.view', 'settings.edit'
    ];
    perm TEXT;
BEGIN
    FOREACH perm IN ARRAY perm_codes
    LOOP
        PERFORM assign_permission_to_role('pm_programme_manager', perm);
    END LOOP;
END $$;

-- Assign permissions to Project Manager
DO $$
DECLARE
    perm_codes TEXT[] := ARRAY[
        'project.view', 'project.edit', 'project.manage_settings',
        'user.view', 'user.invite', 'user.remove', 'user.change_role',
        'role.view',
        'task.view', 'task.create', 'task.edit', 'task.delete', 'task.assign', 'task.comment',
        'risk.view', 'risk.create', 'risk.edit', 'risk.delete',
        'document.view', 'document.upload', 'document.edit', 'document.delete',
        'financial.view_budget', 'financial.edit_budget',
        'report.view', 'report.export',
        'billing.view',
        'settings.view'
    ];
    perm TEXT;
BEGIN
    FOREACH perm IN ARRAY perm_codes
    LOOP
        PERFORM assign_permission_to_role('pm_project_manager', perm);
    END LOOP;
END $$;

-- Assign permissions to Team Manager
DO $$
DECLARE
    perm_codes TEXT[] := ARRAY[
        'project.view',
        'user.view',
        'task.view', 'task.create', 'task.edit', 'task.assign', 'task.comment',
        'risk.view', 'risk.create', 'risk.edit',
        'document.view', 'document.upload', 'document.edit',
        'financial.view_budget',
        'report.view',
        'settings.view'
    ];
    perm TEXT;
BEGIN
    FOREACH perm IN ARRAY perm_codes
    LOOP
        PERFORM assign_permission_to_role('pm_team_manager', perm);
    END LOOP;
END $$;

-- Assign permissions to Project Assurance
DO $$
DECLARE
    perm_codes TEXT[] := ARRAY[
        'project.view',
        'user.view',
        'role.view',
        'task.view', 'task.comment',
        'risk.view', 'risk.create', 'risk.edit',
        'document.view', 'document.upload',
        'financial.view_budget',
        'report.view', 'report.export',
        'settings.view'
    ];
    perm TEXT;
BEGIN
    FOREACH perm IN ARRAY perm_codes
    LOOP
        PERFORM assign_permission_to_role('pm_project_assurance', perm);
    END LOOP;
END $$;

-- Assign permissions to Business Analyst
DO $$
DECLARE
    perm_codes TEXT[] := ARRAY[
        'project.view',
        'user.view',
        'task.view', 'task.create', 'task.edit', 'task.comment',
        'risk.view', 'risk.create',
        'document.view', 'document.upload', 'document.edit',
        'report.view',
        'settings.view'
    ];
    perm TEXT;
BEGIN
    FOREACH perm IN ARRAY perm_codes
    LOOP
        PERFORM assign_permission_to_role('pm_business_analyst', perm);
    END LOOP;
END $$;

-- Assign permissions to Team Member
DO $$
DECLARE
    perm_codes TEXT[] := ARRAY[
        'project.view',
        'user.view',
        'task.view', 'task.edit', 'task.comment',
        'risk.view',
        'document.view', 'document.upload',
        'report.view',
        'settings.view'
    ];
    perm TEXT;
BEGIN
    FOREACH perm IN ARRAY perm_codes
    LOOP
        PERFORM assign_permission_to_role('pm_team_member', perm);
    END LOOP;
END $$;

-- Cleanup helper function
DROP FUNCTION IF EXISTS assign_permission_to_role(VARCHAR, VARCHAR);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    perm_count INTEGER;
    role_count INTEGER;
    mapping_count INTEGER;
BEGIN
    -- Count PM permissions
    SELECT COUNT(*) INTO perm_count
    FROM permissions
    WHERE permission_category IN ('project', 'user', 'role', 'task', 'risk', 'document', 'financial', 'report', 'billing', 'settings')
    AND permission_module = 'core';

    -- Count PM role templates
    SELECT COUNT(*) INTO role_count
    FROM roles
    WHERE role_name LIKE 'pm_%';

    -- Count role-permission mappings for PM roles
    SELECT COUNT(*) INTO mapping_count
    FROM role_permissions rp
    JOIN roles r ON r.id = rp.role_id
    WHERE r.role_name LIKE 'pm_%';

    IF perm_count >= 35 AND role_count >= 7 AND mapping_count >= 50 THEN
        RAISE NOTICE '========================================';
        RAISE NOTICE '✓ v86 Seed Data Migration Successful';
        RAISE NOTICE '========================================';
        RAISE NOTICE 'PM Permissions Created: %', perm_count;
        RAISE NOTICE 'PM Role Templates Created: %', role_count;
        RAISE NOTICE 'Role-Permission Mappings: %', mapping_count;
        RAISE NOTICE '';
        RAISE NOTICE 'Default PM Roles:';
        RAISE NOTICE '  - Project Board (Level 10)';
        RAISE NOTICE '  - Programme Manager (Level 9)';
        RAISE NOTICE '  - Project Manager (Level 8)';
        RAISE NOTICE '  - Team Manager (Level 7)';
        RAISE NOTICE '  - Project Assurance (Level 6)';
        RAISE NOTICE '  - Business Analyst (Level 5)';
        RAISE NOTICE '  - Team Member (Level 3)';
        RAISE NOTICE '========================================';
    ELSE
        RAISE WARNING 'Seed data verification incomplete:';
        RAISE WARNING '  Permissions: % (expected >= 35)', perm_count;
        RAISE WARNING '  Roles: % (expected >= 7)', role_count;
        RAISE WARNING '  Mappings: % (expected >= 50)', mapping_count;
    END IF;
END $$;
