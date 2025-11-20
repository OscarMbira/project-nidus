-- ================================================
-- File: v03_user_access_tables.sql
-- Description: User and access management tables for Project Nidus (7 tables)
-- Version: 1.0
-- Date: 2025-11-15
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - v01_extensions_and_functions.sql must be run first
-- - v02_system_core_tables.sql must be run first
-- - Supabase auth schema must exist

-- Purpose:
-- Creates 7 user and access management tables:
-- 1. users - User account information
-- 2. roles - System roles
-- 3. permissions - Available permissions
-- 4. user_roles - User-role assignments (many-to-many)
-- 5. role_permissions - Role-permission assignments (many-to-many)
-- 6. user_preferences - User settings
-- 7. user_projects - User-project assignments (many-to-many, will reference projects)

-- ================================================
-- TABLE 1: users
-- Description: User account information
-- Category: user
-- ================================================

CREATE TABLE users (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Supabase Auth Integration
    auth_user_id UUID UNIQUE,  -- References auth.users(id) in Supabase

    -- Personal Information
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    display_name VARCHAR(200),

    -- Contact Information
    phone_number VARCHAR(20),
    mobile_number VARCHAR(20),

    -- Professional Information
    job_title VARCHAR(200),
    department VARCHAR(100),
    organization VARCHAR(200),

    -- Profile
    avatar_url TEXT,
    bio TEXT,
    timezone VARCHAR(100) DEFAULT 'UTC',
    language_code VARCHAR(10) DEFAULT 'en',

    -- Account Status
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP,
    last_login_at TIMESTAMP,

    -- Settings
    email_notifications_enabled BOOLEAN DEFAULT TRUE,
    in_app_notifications_enabled BOOLEAN DEFAULT TRUE,

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Indexes
CREATE UNIQUE INDEX idx_users_email_unique ON users(email) WHERE is_deleted = FALSE;
CREATE UNIQUE INDEX idx_users_auth_user_id ON users(auth_user_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_users_is_active ON users(is_active) WHERE is_deleted = FALSE;
CREATE INDEX idx_users_full_name ON users(full_name) WHERE is_deleted = FALSE;
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- Triggers
CREATE TRIGGER trg_users_before_insert
    BEFORE INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

CREATE TRIGGER trg_users_before_update
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE users IS 'User account information linked to Supabase auth';
COMMENT ON COLUMN users.auth_user_id IS 'References Supabase auth.users(id) - NULL for system/service accounts';
COMMENT ON COLUMN users.is_verified IS 'Whether user email has been verified';
COMMENT ON COLUMN users.email_notifications_enabled IS 'Whether user wants to receive email notifications';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('users', 'User account information linked to Supabase authentication', false, true, 'user')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 2: roles
-- Description: System roles and role definitions
-- Category: user
-- ================================================

CREATE TABLE roles (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Role Information
    role_name VARCHAR(100) UNIQUE NOT NULL,
    role_display_name VARCHAR(200) NOT NULL,
    role_description TEXT,

    -- Role Hierarchy
    role_level INTEGER DEFAULT 1,  -- 1=lowest, higher numbers = more privileges
    parent_role_id UUID REFERENCES roles(id),

    -- Role Type
    is_system_role BOOLEAN DEFAULT FALSE,  -- System roles can't be deleted
    is_default_role BOOLEAN DEFAULT FALSE,  -- Assigned to new users automatically

    -- Permissions
    can_manage_users BOOLEAN DEFAULT FALSE,
    can_manage_projects BOOLEAN DEFAULT FALSE,
    can_manage_system BOOLEAN DEFAULT FALSE,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Indexes
CREATE UNIQUE INDEX idx_roles_name_unique ON roles(role_name) WHERE is_deleted = FALSE;
CREATE INDEX idx_roles_is_active ON roles(is_active) WHERE is_deleted = FALSE;
CREATE INDEX idx_roles_level ON roles(role_level);
CREATE INDEX idx_roles_parent_id ON roles(parent_role_id);

-- Triggers
CREATE TRIGGER trg_roles_before_insert
    BEFORE INSERT ON roles
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

CREATE TRIGGER trg_roles_before_update
    BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE roles IS 'System roles and role definitions for RBAC';
COMMENT ON COLUMN roles.is_system_role IS 'System roles cannot be deleted or modified by users';
COMMENT ON COLUMN roles.role_level IS 'Hierarchy level - higher number = more privileges';
COMMENT ON COLUMN roles.is_default_role IS 'Automatically assigned to new users';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('roles', 'System roles and role definitions for role-based access control (RBAC)', false, true, 'user')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 3: permissions
-- Description: Available permissions in the system
-- Category: user
-- ================================================

CREATE TABLE permissions (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Permission Information
    permission_code VARCHAR(100) UNIQUE NOT NULL,
    permission_name VARCHAR(200) NOT NULL,
    permission_description TEXT,

    -- Permission Category
    permission_category VARCHAR(100),  -- 'users', 'projects', 'tasks', 'reports', etc.
    permission_module VARCHAR(100),  -- 'structured', 'scrum', 'kanban', 'core', etc.

    -- Permission Type
    permission_type VARCHAR(50),  -- 'read', 'create', 'update', 'delete', 'execute'

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_system_permission BOOLEAN DEFAULT FALSE,

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Indexes
CREATE UNIQUE INDEX idx_permissions_code_unique ON permissions(permission_code) WHERE is_deleted = FALSE;
CREATE INDEX idx_permissions_category ON permissions(permission_category) WHERE is_deleted = FALSE;
CREATE INDEX idx_permissions_module ON permissions(permission_module) WHERE is_deleted = FALSE;
CREATE INDEX idx_permissions_type ON permissions(permission_type);

-- Triggers
CREATE TRIGGER trg_permissions_before_insert
    BEFORE INSERT ON permissions
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

CREATE TRIGGER trg_permissions_before_update
    BEFORE UPDATE ON permissions
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE permissions IS 'Available permissions in the system for granular access control';
COMMENT ON COLUMN permissions.permission_code IS 'Unique code for programmatic access (e.g., project.create, task.read)';
COMMENT ON COLUMN permissions.permission_module IS 'Which methodology/module this permission applies to (structured, scrum, kanban, core)';
COMMENT ON COLUMN permissions.permission_type IS 'Type of permission: read, create, update, delete, execute';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('permissions', 'Available permissions in the system for granular access control', false, true, 'user')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 4: user_roles
-- Description: User-to-role assignments (many-to-many)
-- Category: user
-- ================================================

CREATE TABLE user_roles (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,

    -- Context (optional)
    project_id UUID,  -- Will reference projects(id) when created - NULL for global role

    -- Assignment Details
    assigned_at TIMESTAMP DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id),
    expires_at TIMESTAMP,  -- Optional expiration for temporary assignments

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),

    -- Unique constraint: user can only have one assignment of a specific role in a specific project
    CONSTRAINT uq_user_roles_user_role_project UNIQUE(user_id, role_id, project_id)
);

-- Indexes
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX idx_user_roles_project_id ON user_roles(project_id);
CREATE INDEX idx_user_roles_is_active ON user_roles(is_active) WHERE is_deleted = FALSE;
CREATE INDEX idx_user_roles_expires_at ON user_roles(expires_at) WHERE expires_at IS NOT NULL;

-- Triggers
CREATE TRIGGER trg_user_roles_before_insert
    BEFORE INSERT ON user_roles
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

CREATE TRIGGER trg_user_roles_before_update
    BEFORE UPDATE ON user_roles
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE user_roles IS 'User-to-role assignments for role-based access control (RBAC)';
COMMENT ON COLUMN user_roles.project_id IS 'NULL for global role, or specific project UUID for project-specific role';
COMMENT ON COLUMN user_roles.expires_at IS 'Optional expiration date for temporary role assignments';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('user_roles', 'User-to-role assignments (many-to-many) for role-based access control', false, true, 'user')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 5: role_permissions
-- Description: Role-to-permission assignments (many-to-many)
-- Category: user
-- ================================================

CREATE TABLE role_permissions (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,

    -- Permission Details
    granted_at TIMESTAMP DEFAULT NOW(),
    granted_by UUID REFERENCES users(id),

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),

    -- Unique constraint: role can only have one assignment of a specific permission
    CONSTRAINT uq_role_permissions_role_permission UNIQUE(role_id, permission_id)
);

-- Indexes
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX idx_role_permissions_is_active ON role_permissions(is_active) WHERE is_deleted = FALSE;

-- Triggers
CREATE TRIGGER trg_role_permissions_before_insert
    BEFORE INSERT ON role_permissions
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

CREATE TRIGGER trg_role_permissions_before_update
    BEFORE UPDATE ON role_permissions
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE role_permissions IS 'Role-to-permission assignments (many-to-many) for granular access control';
COMMENT ON COLUMN role_permissions.granted_by IS 'User who granted this permission to the role';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('role_permissions', 'Role-to-permission assignments (many-to-many) for granular access control', false, true, 'user')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 6: user_preferences
-- Description: User-specific settings and preferences
-- Category: user
-- ================================================

CREATE TABLE user_preferences (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- UI Preferences
    theme VARCHAR(50) DEFAULT 'light',  -- 'light', 'dark', 'auto'
    color_scheme VARCHAR(50),
    sidebar_collapsed BOOLEAN DEFAULT FALSE,
    compact_mode BOOLEAN DEFAULT FALSE,

    -- Dashboard Preferences
    default_dashboard_layout JSONB,
    dashboard_widgets JSONB,

    -- View Preferences
    default_project_view VARCHAR(50) DEFAULT 'list',  -- 'list', 'grid', 'kanban'
    default_task_view VARCHAR(50) DEFAULT 'list',
    items_per_page INTEGER DEFAULT 25,

    -- Methodology Preferences
    preferred_methodology_id UUID,  -- Will reference methodologies(id) when created

    -- Notification Preferences
    email_notifications JSONB,  -- Detailed email notification settings
    push_notifications JSONB,
    notification_frequency VARCHAR(50) DEFAULT 'instant',  -- 'instant', 'hourly', 'daily'

    -- Locale Preferences
    language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(100) DEFAULT 'UTC',
    date_format VARCHAR(50) DEFAULT 'YYYY-MM-DD',
    time_format VARCHAR(50) DEFAULT 'HH:mm:ss',
    first_day_of_week INTEGER DEFAULT 1,  -- 0=Sunday, 1=Monday

    -- Other Preferences
    custom_settings JSONB,

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Indexes
CREATE UNIQUE INDEX idx_user_preferences_user_id ON user_preferences(user_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_user_preferences_theme ON user_preferences(theme);

-- Triggers
CREATE TRIGGER trg_user_preferences_before_insert
    BEFORE INSERT ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

CREATE TRIGGER trg_user_preferences_before_update
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE user_preferences IS 'User-specific settings and preferences for UI, notifications, and locale';
COMMENT ON COLUMN user_preferences.email_notifications IS 'JSONB object with granular email notification settings';
COMMENT ON COLUMN user_preferences.custom_settings IS 'JSONB for additional custom user preferences';
COMMENT ON COLUMN user_preferences.first_day_of_week IS '0=Sunday, 1=Monday';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('user_preferences', 'User-specific settings and preferences for UI, notifications, and locale', false, true, 'user')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 7: user_projects
-- Description: User-to-project assignments (many-to-many)
-- Category: user
-- NOTE: This table references projects(id) which will be created in v04
-- ================================================

CREATE TABLE user_projects (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL,  -- Will add FK constraint in v04 after projects table is created

    -- Assignment Details
    project_role VARCHAR(100),  -- 'Project Manager', 'Team Lead', 'Team Member', etc.
    assigned_at TIMESTAMP DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id),

    -- Access Level
    access_level VARCHAR(50) DEFAULT 'member',  -- 'owner', 'admin', 'member', 'viewer'

    -- Notifications
    receive_notifications BOOLEAN DEFAULT TRUE,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),

    -- Unique constraint
    CONSTRAINT uq_user_projects_user_project UNIQUE(user_id, project_id)
);

-- Indexes
CREATE INDEX idx_user_projects_user_id ON user_projects(user_id);
CREATE INDEX idx_user_projects_project_id ON user_projects(project_id);
CREATE INDEX idx_user_projects_is_active ON user_projects(is_active) WHERE is_deleted = FALSE;
CREATE INDEX idx_user_projects_access_level ON user_projects(access_level);

-- Triggers
CREATE TRIGGER trg_user_projects_before_insert
    BEFORE INSERT ON user_projects
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

CREATE TRIGGER trg_user_projects_before_update
    BEFORE UPDATE ON user_projects
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE user_projects IS 'User-to-project assignments (many-to-many) for project access control';
COMMENT ON COLUMN user_projects.project_role IS 'Role within this specific project (not system role)';
COMMENT ON COLUMN user_projects.access_level IS 'Access level for this project: owner, admin, member, or viewer';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('user_projects', 'User-to-project assignments (many-to-many) for project access control', false, true, 'user')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
DECLARE
    v_table_count INTEGER;
BEGIN
    -- Count user access tables
    SELECT COUNT(*)
    INTO v_table_count
    FROM database_tables
    WHERE table_category = 'user'
      AND is_deleted = FALSE;

    -- Verify all 7 tables are registered
    IF v_table_count < 7 THEN
        RAISE EXCEPTION 'Expected 7 user access tables, found %', v_table_count;
    END IF;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'User & Access Management Tables Created: %', v_table_count;
    RAISE NOTICE '================================================';
    RAISE NOTICE '1. users - User accounts';
    RAISE NOTICE '2. roles - System roles';
    RAISE NOTICE '3. permissions - Available permissions';
    RAISE NOTICE '4. user_roles - User-role assignments';
    RAISE NOTICE '5. role_permissions - Role-permission assignments';
    RAISE NOTICE '6. user_preferences - User settings';
    RAISE NOTICE '7. user_projects - User-project assignments';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'v03_user_access_tables.sql completed successfully';
    RAISE NOTICE '================================================';
END $$;

-- ================================================
-- END OF FILE
-- ================================================

-- Next Steps:
-- Run v04_project_core_tables.sql to create project tables
-- Note: Foreign key constraint for user_projects.project_id will be added in v04 or v07
