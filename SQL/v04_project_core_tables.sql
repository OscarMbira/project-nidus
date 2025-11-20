-- ================================================
-- File: v04_project_core_tables.sql
-- Description: Project core tables for Project Nidus (8 tables)
-- Version: 1.0
-- Date: 2025-11-15
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - v01_extensions_and_functions.sql must be run first
-- - v02_system_core_tables.sql must be run first
-- - v03_user_access_tables.sql must be run first (users table needed)

-- Purpose:
-- Creates 8 project core tables:
-- 1. project_statuses - Project status lookup
-- 2. project_types - Project type lookup
-- 3. projects - Main project records
-- 4. project_methodologies - Methodology selection per project
-- 5. project_configurations - Project-specific settings
-- 6. project_phases - Phases/Stages/Sprints/Iterations
-- 7. teams - Team definitions within projects
-- 8. team_members - Team membership

-- Note: Creating lookup tables (statuses, types) first so projects can reference them

-- ================================================
-- TABLE 1: project_statuses
-- Description: Project status lookup table
-- Category: project
-- ================================================

CREATE TABLE project_statuses (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Status Information
    status_code VARCHAR(50) UNIQUE NOT NULL,
    status_name VARCHAR(100) NOT NULL,
    status_description TEXT,

    -- Status Properties
    status_color VARCHAR(7),  -- Hex color code (#FF0000)
    status_icon VARCHAR(50),
    status_order INTEGER,

    -- Status Type
    is_initial_status BOOLEAN DEFAULT FALSE,
    is_final_status BOOLEAN DEFAULT FALSE,
    is_active_status BOOLEAN DEFAULT TRUE,

    -- System Status
    is_system_status BOOLEAN DEFAULT FALSE,

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
CREATE UNIQUE INDEX idx_project_statuses_code_unique ON project_statuses(status_code) WHERE is_deleted = FALSE;
CREATE INDEX idx_project_statuses_order ON project_statuses(status_order);
CREATE INDEX idx_project_statuses_is_active ON project_statuses(is_active) WHERE is_deleted = FALSE;

-- Triggers
CREATE TRIGGER trg_project_statuses_before_insert
    BEFORE INSERT ON project_statuses
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

CREATE TRIGGER trg_project_statuses_before_update
    BEFORE UPDATE ON project_statuses
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE project_statuses IS 'Project status lookup table for workflow management';
COMMENT ON COLUMN project_statuses.is_initial_status IS 'Default status for new projects';
COMMENT ON COLUMN project_statuses.is_final_status IS 'Indicates project completion';
COMMENT ON COLUMN project_statuses.is_active_status IS 'Indicates project is actively being worked on';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('project_statuses', 'Project status lookup table for workflow management', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 2: project_types
-- Description: Project categorization and types
-- Category: project
-- ================================================

CREATE TABLE project_types (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Type Information
    type_code VARCHAR(50) UNIQUE NOT NULL,
    type_name VARCHAR(100) NOT NULL,
    type_description TEXT,

    -- Type Properties
    type_color VARCHAR(7),  -- Hex color code
    type_icon VARCHAR(50),

    -- Type Category
    type_category VARCHAR(100),  -- 'internal', 'external', 'client', 'r&d', etc.

    -- System Type
    is_system_type BOOLEAN DEFAULT FALSE,

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
CREATE UNIQUE INDEX idx_project_types_code_unique ON project_types(type_code) WHERE is_deleted = FALSE;
CREATE INDEX idx_project_types_category ON project_types(type_category) WHERE is_deleted = FALSE;
CREATE INDEX idx_project_types_is_active ON project_types(is_active) WHERE is_deleted = FALSE;

-- Triggers
CREATE TRIGGER trg_project_types_before_insert
    BEFORE INSERT ON project_types
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

CREATE TRIGGER trg_project_types_before_update
    BEFORE UPDATE ON project_types
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE project_types IS 'Project categorization and types for classification';
COMMENT ON COLUMN project_types.type_category IS 'High-level categorization: internal, external, client, r&d, etc.';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('project_types', 'Project categorization and types for classification', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 3: projects
-- Description: Main project records
-- Category: project
-- ================================================

CREATE TABLE projects (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Project Identification
    project_code VARCHAR(50) UNIQUE NOT NULL,
    project_name VARCHAR(200) NOT NULL,
    project_description TEXT,

    -- Classification
    project_type_id UUID REFERENCES project_types(id),
    status_id UUID REFERENCES project_statuses(id),
    priority VARCHAR(50) DEFAULT 'medium',  -- 'low', 'medium', 'high', 'critical'

    -- Timeline
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,

    -- Progress
    percentage_complete DECIMAL(5, 2) DEFAULT 0,
    health_status VARCHAR(50),  -- 'green', 'amber', 'red'

    -- Financial
    budget_amount DECIMAL(15, 2),
    budget_currency VARCHAR(3) DEFAULT 'USD',
    actual_cost DECIMAL(15, 2),

    -- Owner
    owner_user_id UUID REFERENCES users(id),
    sponsor_user_id UUID REFERENCES users(id),

    -- Settings
    is_public BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMP,

    -- Custom Fields
    custom_fields JSONB,

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),

    -- Constraints
    CONSTRAINT chk_projects_dates CHECK (
        planned_end_date IS NULL OR planned_start_date IS NULL OR planned_end_date >= planned_start_date
    ),
    CONSTRAINT chk_projects_progress CHECK (percentage_complete >= 0 AND percentage_complete <= 100)
);

-- Indexes
CREATE UNIQUE INDEX idx_projects_code_unique ON projects(project_code) WHERE is_deleted = FALSE;
CREATE INDEX idx_projects_status_id ON projects(status_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_projects_type_id ON projects(project_type_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_projects_owner_id ON projects(owner_user_id);
CREATE INDEX idx_projects_sponsor_id ON projects(sponsor_user_id);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX idx_projects_health_status ON projects(health_status) WHERE is_deleted = FALSE;
CREATE INDEX idx_projects_is_archived ON projects(is_archived) WHERE is_deleted = FALSE;
-- Full-text search on project name
CREATE INDEX idx_projects_name_search ON projects USING gin(to_tsvector('english', project_name));

-- Triggers
CREATE TRIGGER trg_projects_before_insert
    BEFORE INSERT ON projects
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

CREATE TRIGGER trg_projects_before_update
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE projects IS 'Main project records for all methodologies';
COMMENT ON COLUMN projects.project_code IS 'Unique project code/identifier (e.g., PROJ-001)';
COMMENT ON COLUMN projects.health_status IS 'RAG status: green (on track), amber (at risk), red (in trouble)';
COMMENT ON COLUMN projects.custom_fields IS 'JSONB for additional custom project fields';
COMMENT ON COLUMN projects.percentage_complete IS 'Overall project completion percentage (0-100)';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('projects', 'Main project records for all methodologies', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- Add foreign key constraint to user_projects.project_id now that projects table exists
ALTER TABLE user_projects
    ADD CONSTRAINT fk_user_projects_projects
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- ================================================
-- TABLE 4: project_methodologies
-- Description: Methodology selection and configuration per project
-- Category: project
-- ================================================

CREATE TABLE project_methodologies (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    project_id UUID UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    methodology_id UUID NOT NULL,  -- Will reference methodologies(id) when created in v05

    -- Configuration
    methodology_config JSONB,  -- Methodology-specific settings

    -- Methodology Change History
    previous_methodology_id UUID,  -- Will reference methodologies(id)
    methodology_changed_at TIMESTAMP,
    methodology_changed_by UUID REFERENCES users(id),
    change_reason TEXT,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    activated_at TIMESTAMP DEFAULT NOW(),

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
CREATE UNIQUE INDEX idx_project_methodologies_project_id ON project_methodologies(project_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_project_methodologies_methodology_id ON project_methodologies(methodology_id);

-- Triggers
CREATE TRIGGER trg_project_methodologies_before_insert
    BEFORE INSERT ON project_methodologies
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

CREATE TRIGGER trg_project_methodologies_before_update
    BEFORE UPDATE ON project_methodologies
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE project_methodologies IS 'Methodology selection and configuration per project';
COMMENT ON COLUMN project_methodologies.methodology_config IS 'JSONB configuration specific to selected methodology';
COMMENT ON COLUMN project_methodologies.previous_methodology_id IS 'Tracks methodology switches for audit trail';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('project_methodologies', 'Methodology selection and configuration per project', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 5: project_configurations
-- Description: Project-specific settings and configuration
-- Category: project
-- ================================================

CREATE TABLE project_configurations (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    project_id UUID UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Workflow Settings
    workflow_id UUID,  -- Will reference workflows(id) when created in v05
    require_approval_for_tasks BOOLEAN DEFAULT FALSE,
    auto_assign_tasks BOOLEAN DEFAULT FALSE,

    -- Notification Settings
    enable_email_notifications BOOLEAN DEFAULT TRUE,
    enable_in_app_notifications BOOLEAN DEFAULT TRUE,
    notification_frequency VARCHAR(50) DEFAULT 'instant',

    -- Access Settings
    allow_public_access BOOLEAN DEFAULT FALSE,
    require_2fa BOOLEAN DEFAULT FALSE,
    allow_guest_users BOOLEAN DEFAULT FALSE,

    -- Integration Settings
    integrations JSONB,  -- Third-party integrations

    -- Custom Settings
    custom_statuses JSONB,  -- Custom status definitions
    custom_fields_config JSONB,  -- Custom fields configuration
    custom_workflows JSONB,  -- Custom workflow definitions

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
CREATE UNIQUE INDEX idx_project_configurations_project_id ON project_configurations(project_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_project_configurations_workflow_id ON project_configurations(workflow_id);

-- Triggers
CREATE TRIGGER trg_project_configurations_before_insert
    BEFORE INSERT ON project_configurations
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

CREATE TRIGGER trg_project_configurations_before_update
    BEFORE UPDATE ON project_configurations
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE project_configurations IS 'Project-specific settings and configuration';
COMMENT ON COLUMN project_configurations.custom_statuses IS 'JSONB for project-specific custom status definitions';
COMMENT ON COLUMN project_configurations.integrations IS 'JSONB for third-party integration settings';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('project_configurations', 'Project-specific settings and configuration', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 6: project_phases
-- Description: Project phases, stages, sprints, or iterations
-- Category: project
-- ================================================

CREATE TABLE project_phases (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Phase Information
    phase_name VARCHAR(200) NOT NULL,
    phase_description TEXT,
    phase_type VARCHAR(50) DEFAULT 'phase',  -- 'phase', 'stage', 'sprint', 'iteration'

    -- Sequence
    phase_number INTEGER,
    sort_order INTEGER,

    -- Timeline
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,

    -- Progress
    percentage_complete DECIMAL(5, 2) DEFAULT 0,

    -- Sprint-specific (for Scrum)
    sprint_goal TEXT,
    sprint_velocity DECIMAL(8, 2),

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_current BOOLEAN DEFAULT FALSE,

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),

    -- Constraints
    CONSTRAINT chk_project_phases_dates CHECK (
        planned_end_date IS NULL OR planned_start_date IS NULL OR planned_end_date >= planned_start_date
    ),
    CONSTRAINT chk_project_phases_progress CHECK (percentage_complete >= 0 AND percentage_complete <= 100)
);

-- Indexes
CREATE INDEX idx_project_phases_project_id ON project_phases(project_id);
CREATE INDEX idx_project_phases_is_current ON project_phases(is_current) WHERE is_current = TRUE AND is_deleted = FALSE;
CREATE INDEX idx_project_phases_sort_order ON project_phases(sort_order);
CREATE INDEX idx_project_phases_phase_type ON project_phases(phase_type);

-- Triggers
CREATE TRIGGER trg_project_phases_before_insert
    BEFORE INSERT ON project_phases
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

CREATE TRIGGER trg_project_phases_before_update
    BEFORE UPDATE ON project_phases
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE project_phases IS 'Project phases, stages, sprints, or iterations - methodology-agnostic';
COMMENT ON COLUMN project_phases.phase_type IS 'Type: phase (generic), stage (Structured PM), sprint (Scrum), iteration (Agile)';
COMMENT ON COLUMN project_phases.is_current IS 'Whether this is the currently active phase';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('project_phases', 'Project phases, stages, sprints, or iterations - methodology-agnostic', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 7: teams
-- Description: Team definitions within projects
-- Category: project
-- ================================================

CREATE TABLE teams (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Team Information
    team_name VARCHAR(200) NOT NULL,
    team_description TEXT,
    team_type VARCHAR(50),  -- 'delivery', 'support', 'cross-functional', 'specialist', etc.

    -- Team Lead
    team_lead_user_id UUID REFERENCES users(id),

    -- Settings
    max_team_size INTEGER,

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
CREATE INDEX idx_teams_project_id ON teams(project_id);
CREATE INDEX idx_teams_team_lead_id ON teams(team_lead_user_id);
CREATE INDEX idx_teams_is_active ON teams(is_active) WHERE is_deleted = FALSE;
CREATE INDEX idx_teams_team_type ON teams(team_type);

-- Triggers
CREATE TRIGGER trg_teams_before_insert
    BEFORE INSERT ON teams
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

CREATE TRIGGER trg_teams_before_update
    BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE teams IS 'Team definitions within projects';
COMMENT ON COLUMN teams.team_type IS 'Type of team: delivery, support, cross-functional, specialist, etc.';
COMMENT ON COLUMN teams.max_team_size IS 'Maximum team size (NULL for unlimited)';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('teams', 'Team definitions within projects', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 8: team_members
-- Description: Team membership assignments
-- Category: project
-- ================================================

CREATE TABLE team_members (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Member Details
    member_role VARCHAR(100),  -- 'Developer', 'Tester', 'Designer', 'Analyst', etc.
    allocation_percentage DECIMAL(5, 2) DEFAULT 100,  -- % time allocated to this team

    -- Assignment Period
    joined_at TIMESTAMP DEFAULT NOW(),
    left_at TIMESTAMP,

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
    CONSTRAINT uq_team_members_team_user UNIQUE(team_id, user_id),

    -- Check constraint
    CONSTRAINT chk_team_members_allocation CHECK (allocation_percentage >= 0 AND allocation_percentage <= 100)
);

-- Indexes
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_team_members_is_active ON team_members(is_active) WHERE is_deleted = FALSE;

-- Triggers
CREATE TRIGGER trg_team_members_before_insert
    BEFORE INSERT ON team_members
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

CREATE TRIGGER trg_team_members_before_update
    BEFORE UPDATE ON team_members
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE team_members IS 'Team membership assignments';
COMMENT ON COLUMN team_members.allocation_percentage IS 'Percentage of time allocated to this team (0-100)';
COMMENT ON COLUMN team_members.member_role IS 'Role within the team (not system role): Developer, Tester, Designer, etc.';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('team_members', 'Team membership assignments', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
DECLARE
    v_table_count INTEGER;
BEGIN
    -- Count project core tables
    SELECT COUNT(*)
    INTO v_table_count
    FROM database_tables
    WHERE table_category = 'project'
      AND is_deleted = FALSE;

    -- Verify all 8 tables are registered
    IF v_table_count < 8 THEN
        RAISE EXCEPTION 'Expected 8 project core tables, found %', v_table_count;
    END IF;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Project Core Tables Created: %', v_table_count;
    RAISE NOTICE '================================================';
    RAISE NOTICE '1. project_statuses - Status lookup';
    RAISE NOTICE '2. project_types - Type lookup';
    RAISE NOTICE '3. projects - Main project records';
    RAISE NOTICE '4. project_methodologies - Methodology selection';
    RAISE NOTICE '5. project_configurations - Project settings';
    RAISE NOTICE '6. project_phases - Phases/Stages/Sprints';
    RAISE NOTICE '7. teams - Team definitions';
    RAISE NOTICE '8. team_members - Team membership';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'v04_project_core_tables.sql completed successfully';
    RAISE NOTICE '================================================';
END $$;

-- ================================================
-- END OF FILE
-- ================================================

-- Next Steps:
-- Run v05_configuration_menu_tables.sql to create configuration tables
