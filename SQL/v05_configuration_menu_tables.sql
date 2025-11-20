-- ================================================
-- File: v05_configuration_menu_tables.sql
-- Description: Configuration and menu tables for Project Nidus (5 tables)
-- Version: 1.0
-- Date: 2025-11-15
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - v01_extensions_and_functions.sql must be run first
-- - v02_system_core_tables.sql must be run first
-- - v03_user_access_tables.sql must be run first
-- - v04_project_core_tables.sql must be run first

-- Purpose:
-- Creates 5 configuration and menu tables:
-- 1. methodologies - Available project management methodologies
-- 2. workflows - Workflow definitions
-- 3. menu_items - Navigation menu structure
-- 4. role_menu_items - Role-based menu access
-- 5. user_menu_preferences - User menu customization

-- ================================================
-- TABLE 1: methodologies
-- Description: Available project management methodologies
-- Category: config
-- ================================================

CREATE TABLE methodologies (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Methodology Information
    methodology_code VARCHAR(50) UNIQUE NOT NULL,
    methodology_name VARCHAR(100) NOT NULL,
    methodology_description TEXT,

    -- Methodology Details
    methodology_category VARCHAR(100),  -- 'traditional', 'agile', 'hybrid'
    methodology_icon VARCHAR(50),
    methodology_color VARCHAR(7),  -- Hex color code

    -- Documentation
    documentation_url TEXT,
    help_text TEXT,

    -- Features
    supports_sprints BOOLEAN DEFAULT FALSE,
    supports_kanban BOOLEAN DEFAULT FALSE,
    supports_gantt BOOLEAN DEFAULT FALSE,
    supports_stages BOOLEAN DEFAULT FALSE,

    -- Settings
    default_config JSONB,  -- Default configuration for this methodology

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,

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
CREATE UNIQUE INDEX idx_methodologies_code_unique ON methodologies(methodology_code) WHERE is_deleted = FALSE;
CREATE INDEX idx_methodologies_category ON methodologies(methodology_category) WHERE is_deleted = FALSE;
CREATE INDEX idx_methodologies_is_active ON methodologies(is_active) WHERE is_deleted = FALSE;
CREATE INDEX idx_methodologies_is_default ON methodologies(is_default) WHERE is_default = TRUE AND is_deleted = FALSE;

-- Triggers
CREATE TRIGGER trg_methodologies_before_insert
    BEFORE INSERT ON methodologies
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

CREATE TRIGGER trg_methodologies_before_update
    BEFORE UPDATE ON methodologies
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE methodologies IS 'Available project management methodologies (Structured PM, Scrum, Kanban, Agile, Hybrid)';
COMMENT ON COLUMN methodologies.methodology_category IS 'Category: traditional, agile, or hybrid';
COMMENT ON COLUMN methodologies.default_config IS 'Default JSONB configuration when methodology is selected';
COMMENT ON COLUMN methodologies.supports_sprints IS 'Whether methodology supports sprint/iteration planning';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('methodologies', 'Available project management methodologies (Structured PM, Scrum, Kanban, Agile, Hybrid)', false, true, 'config')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- Add foreign key constraints now that methodologies table exists
ALTER TABLE project_methodologies
    ADD CONSTRAINT fk_project_methodologies_methodologies
    FOREIGN KEY (methodology_id) REFERENCES methodologies(id);

ALTER TABLE project_methodologies
    ADD CONSTRAINT fk_project_methodologies_previous
    FOREIGN KEY (previous_methodology_id) REFERENCES methodologies(id);

ALTER TABLE user_preferences
    ADD CONSTRAINT fk_user_preferences_methodologies
    FOREIGN KEY (preferred_methodology_id) REFERENCES methodologies(id);

-- ================================================
-- TABLE 2: workflows
-- Description: Workflow definitions for projects and entities
-- Category: config
-- ================================================

CREATE TABLE workflows (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Workflow Information
    workflow_code VARCHAR(50) UNIQUE NOT NULL,
    workflow_name VARCHAR(100) NOT NULL,
    workflow_description TEXT,

    -- Workflow Type
    workflow_type VARCHAR(50),  -- 'project', 'task', 'approval', 'change_request', etc.
    methodology_id UUID REFERENCES methodologies(id),  -- Optional: specific to methodology

    -- Workflow Definition
    workflow_steps JSONB NOT NULL,  -- Array of workflow steps with transitions

    -- Settings
    require_approval BOOLEAN DEFAULT FALSE,
    auto_progress BOOLEAN DEFAULT FALSE,
    send_notifications BOOLEAN DEFAULT TRUE,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,

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
CREATE UNIQUE INDEX idx_workflows_code_unique ON workflows(workflow_code) WHERE is_deleted = FALSE;
CREATE INDEX idx_workflows_type ON workflows(workflow_type) WHERE is_deleted = FALSE;
CREATE INDEX idx_workflows_methodology_id ON workflows(methodology_id);
CREATE INDEX idx_workflows_is_active ON workflows(is_active) WHERE is_deleted = FALSE;

-- Triggers
CREATE TRIGGER trg_workflows_before_insert
    BEFORE INSERT ON workflows
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

CREATE TRIGGER trg_workflows_before_update
    BEFORE UPDATE ON workflows
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE workflows IS 'Workflow definitions for projects and entities';
COMMENT ON COLUMN workflows.workflow_steps IS 'JSONB array defining workflow steps, transitions, and rules';
COMMENT ON COLUMN workflows.methodology_id IS 'Optional: workflow specific to a methodology (NULL for universal workflows)';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('workflows', 'Workflow definitions for projects and entities', false, true, 'config')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- Add foreign key constraint now that workflows table exists
ALTER TABLE project_configurations
    ADD CONSTRAINT fk_project_configurations_workflows
    FOREIGN KEY (workflow_id) REFERENCES workflows(id);

-- ================================================
-- TABLE 3: menu_items
-- Description: Navigation menu structure
-- Category: config
-- ================================================

CREATE TABLE menu_items (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Menu Information
    menu_code VARCHAR(50) UNIQUE NOT NULL,
    menu_label VARCHAR(100) NOT NULL,
    menu_description TEXT,

    -- Menu Hierarchy
    parent_menu_id UUID REFERENCES menu_items(id),
    menu_level INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,

    -- Navigation
    route_path VARCHAR(500),  -- React Router path
    external_url TEXT,

    -- Appearance
    menu_icon VARCHAR(50),
    menu_color VARCHAR(7),
    badge_text VARCHAR(20),
    badge_color VARCHAR(7),

    -- Methodology Association
    methodology_id UUID REFERENCES methodologies(id),  -- NULL = visible to all, or specific methodology

    -- Visibility
    is_visible BOOLEAN DEFAULT TRUE,
    is_system_menu BOOLEAN DEFAULT FALSE,

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
CREATE UNIQUE INDEX idx_menu_items_code_unique ON menu_items(menu_code) WHERE is_deleted = FALSE;
CREATE INDEX idx_menu_items_parent_id ON menu_items(parent_menu_id);
CREATE INDEX idx_menu_items_sort_order ON menu_items(sort_order);
CREATE INDEX idx_menu_items_methodology_id ON menu_items(methodology_id);
CREATE INDEX idx_menu_items_is_visible ON menu_items(is_visible) WHERE is_deleted = FALSE;

-- Triggers
CREATE TRIGGER trg_menu_items_before_insert
    BEFORE INSERT ON menu_items
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

CREATE TRIGGER trg_menu_items_before_update
    BEFORE UPDATE ON menu_items
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE menu_items IS 'Navigation menu structure with hierarchy support';
COMMENT ON COLUMN menu_items.methodology_id IS 'NULL for universal menus, or specific methodology UUID for methodology-specific menus';
COMMENT ON COLUMN menu_items.menu_level IS 'Menu hierarchy level: 1=top level, 2=submenu, 3=sub-submenu, etc.';
COMMENT ON COLUMN menu_items.route_path IS 'React Router path (e.g., /projects, /projects/:id)';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('menu_items', 'Navigation menu structure with hierarchy support', false, true, 'config')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 4: role_menu_items
-- Description: Role-based menu access control
-- Category: config
-- ================================================

CREATE TABLE role_menu_items (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,

    -- Access Control
    can_view BOOLEAN DEFAULT TRUE,
    can_use BOOLEAN DEFAULT TRUE,

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
    CONSTRAINT uq_role_menu_items_role_menu UNIQUE(role_id, menu_item_id)
);

-- Indexes
CREATE INDEX idx_role_menu_items_role_id ON role_menu_items(role_id);
CREATE INDEX idx_role_menu_items_menu_item_id ON role_menu_items(menu_item_id);
CREATE INDEX idx_role_menu_items_is_active ON role_menu_items(is_active) WHERE is_deleted = FALSE;

-- Triggers
CREATE TRIGGER trg_role_menu_items_before_insert
    BEFORE INSERT ON role_menu_items
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

CREATE TRIGGER trg_role_menu_items_before_update
    BEFORE UPDATE ON role_menu_items
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE role_menu_items IS 'Role-based menu access control (many-to-many)';
COMMENT ON COLUMN role_menu_items.can_view IS 'Whether role can see this menu item';
COMMENT ON COLUMN role_menu_items.can_use IS 'Whether role can click/use this menu item (vs. disabled)';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('role_menu_items', 'Role-based menu access control (many-to-many)', false, true, 'config')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 5: user_menu_preferences
-- Description: User-specific menu customization
-- Category: config
-- ================================================

CREATE TABLE user_menu_preferences (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,

    -- Preferences
    is_favorited BOOLEAN DEFAULT FALSE,
    is_hidden BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    custom_label VARCHAR(100),
    custom_icon VARCHAR(50),
    custom_sort_order INTEGER,

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),

    -- Unique constraint
    CONSTRAINT uq_user_menu_preferences_user_menu UNIQUE(user_id, menu_item_id)
);

-- Indexes
CREATE INDEX idx_user_menu_preferences_user_id ON user_menu_preferences(user_id);
CREATE INDEX idx_user_menu_preferences_menu_item_id ON user_menu_preferences(menu_item_id);
CREATE INDEX idx_user_menu_preferences_is_favorited ON user_menu_preferences(is_favorited) WHERE is_favorited = TRUE;
CREATE INDEX idx_user_menu_preferences_is_pinned ON user_menu_preferences(is_pinned) WHERE is_pinned = TRUE;

-- Triggers
CREATE TRIGGER trg_user_menu_preferences_before_insert
    BEFORE INSERT ON user_menu_preferences
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

CREATE TRIGGER trg_user_menu_preferences_before_update
    BEFORE UPDATE ON user_menu_preferences
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE user_menu_preferences IS 'User-specific menu customization preferences';
COMMENT ON COLUMN user_menu_preferences.is_favorited IS 'User favorited this menu item';
COMMENT ON COLUMN user_menu_preferences.is_pinned IS 'User pinned this menu item for quick access';
COMMENT ON COLUMN user_menu_preferences.custom_label IS 'User custom label for this menu item';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('user_menu_preferences', 'User-specific menu customization preferences', false, true, 'config')
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
    v_total_count INTEGER;
BEGIN
    -- Count configuration tables
    SELECT COUNT(*)
    INTO v_table_count
    FROM database_tables
    WHERE table_category = 'config'
      AND is_deleted = FALSE;

    -- Verify all 5 tables are registered
    IF v_table_count < 5 THEN
        RAISE EXCEPTION 'Expected 5 configuration tables, found %', v_table_count;
    END IF;

    -- Count all core tables
    SELECT COUNT(*)
    INTO v_total_count
    FROM database_tables
    WHERE is_deleted = FALSE
      AND table_category IN ('system', 'user', 'project', 'config');

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Configuration & Menu Tables Created: %', v_table_count;
    RAISE NOTICE '================================================';
    RAISE NOTICE '1. methodologies - PM methodologies';
    RAISE NOTICE '2. workflows - Workflow definitions';
    RAISE NOTICE '3. menu_items - Navigation menu';
    RAISE NOTICE '4. role_menu_items - Role-based menu access';
    RAISE NOTICE '5. user_menu_preferences - User menu customization';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'TOTAL CORE TABLES CREATED: %', v_total_count;
    RAISE NOTICE '- System Core: 8 tables';
    RAISE NOTICE '- User & Access: 7 tables';
    RAISE NOTICE '- Project Core: 8 tables';
    RAISE NOTICE '- Configuration: 5 tables';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'v05_configuration_menu_tables.sql completed successfully';
    RAISE NOTICE '================================================';
END $$;

-- ================================================
-- END OF FILE
-- ================================================

-- Next Steps:
-- Run v06_indexes.sql for additional indexes (if needed)
-- Run v08_views.sql to create convenience views
-- Run v09_rls_policies.sql to create Row Level Security policies
