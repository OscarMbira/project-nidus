-- ================================================
-- File: v08_scrum_tables.sql
-- Description: Scrum methodology tables for Product Backlog, User Stories, Epics, and Sprints
-- Version: 1.0
-- Date: 2025-01-XX
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - v01 through v07 must be run first (all core tables must exist)
-- - projects table must exist
-- - project_methodologies table must exist

-- Purpose:
-- Creates Scrum methodology tables:
-- 1. product_backlogs - Product Backlog per project
-- 2. epics - Epic definitions
-- 3. user_stories - User stories in the backlog
-- 4. sprints - Sprint definitions
-- 5. sprint_backlogs - Stories assigned to sprints

-- Note: This script is idempotent and can be run multiple times safely

-- ================================================
-- TABLE 1: product_backlogs
-- Description: Product Backlog per project (Scrum)
-- Category: scrum
-- ================================================

CREATE TABLE IF NOT EXISTS product_backlogs (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    project_id UUID UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Backlog Information
    backlog_name VARCHAR(200) NOT NULL DEFAULT 'Product Backlog',
    backlog_description TEXT,
    
    -- Product Owner
    product_owner_user_id UUID REFERENCES users(id),
    
    -- Settings
    default_story_points_scale VARCHAR(20) DEFAULT 'fibonacci',  -- 'fibonacci', 't-shirt', 'linear', 'custom'
    custom_story_points_scale JSONB,  -- Custom scale definition if needed
    
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
CREATE INDEX IF NOT EXISTS idx_product_backlogs_project_id ON product_backlogs(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_product_backlogs_product_owner ON product_backlogs(product_owner_user_id) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_product_backlogs_before_insert ON product_backlogs;
CREATE TRIGGER trg_product_backlogs_before_insert
    BEFORE INSERT ON product_backlogs
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_product_backlogs_before_update ON product_backlogs;
CREATE TRIGGER trg_product_backlogs_before_update
    BEFORE UPDATE ON product_backlogs
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE product_backlogs IS 'Product Backlog for Scrum projects';
COMMENT ON COLUMN product_backlogs.default_story_points_scale IS 'Story points estimation scale: fibonacci, t-shirt, linear, custom';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('product_backlogs', 'Product Backlog for Scrum projects', false, true, 'scrum')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 2: epics
-- Description: Epic definitions for grouping user stories
-- Category: scrum
-- ================================================

CREATE TABLE IF NOT EXISTS epics (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    product_backlog_id UUID REFERENCES product_backlogs(id) ON DELETE CASCADE,

    -- Epic Information
    epic_name VARCHAR(200) NOT NULL,
    epic_description TEXT,
    epic_goal TEXT,
    
    -- Status
    status VARCHAR(50) DEFAULT 'backlog',  -- 'backlog', 'in_progress', 'done', 'cancelled'
    
    -- Priority
    priority INTEGER DEFAULT 0,  -- Higher number = higher priority
    
    -- Dates
    target_completion_date DATE,
    completed_at TIMESTAMP,
    
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
CREATE INDEX IF NOT EXISTS idx_epics_project_id ON epics(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_epics_product_backlog_id ON epics(product_backlog_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_epics_status ON epics(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_epics_priority ON epics(priority DESC) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_epics_before_insert ON epics;
CREATE TRIGGER trg_epics_before_insert
    BEFORE INSERT ON epics
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_epics_before_update ON epics;
CREATE TRIGGER trg_epics_before_update
    BEFORE UPDATE ON epics
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE epics IS 'Epic definitions for grouping user stories in Scrum';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('epics', 'Epic definitions for grouping user stories in Scrum', false, true, 'scrum')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 3: user_stories
-- Description: User stories in the Product Backlog
-- Category: scrum
-- ================================================

CREATE TABLE IF NOT EXISTS user_stories (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    product_backlog_id UUID NOT NULL REFERENCES product_backlogs(id) ON DELETE CASCADE,
    epic_id UUID REFERENCES epics(id) ON DELETE SET NULL,

    -- Story Information
    story_title VARCHAR(200) NOT NULL,
    story_description TEXT,
    story_as_a TEXT,  -- "As a [user type]"
    story_i_want TEXT,  -- "I want [functionality]"
    story_so_that TEXT,  -- "So that [benefit]"
    
    -- Estimation
    story_points INTEGER,  -- Story point estimate
    effort_hours DECIMAL(10, 2),  -- Alternative effort estimate in hours
    
    -- Priority & Order
    priority INTEGER DEFAULT 0,  -- Higher number = higher priority
    backlog_order INTEGER,  -- Order in backlog (for drag-and-drop)
    
    -- Status
    status VARCHAR(50) DEFAULT 'backlog',  -- 'backlog', 'sprint_backlog', 'in_progress', 'done', 'cancelled'
    
    -- Assignment
    assigned_to_user_id UUID REFERENCES users(id),
    assigned_sprint_id UUID,  -- Will reference sprints(id) when created
    
    -- Acceptance Criteria
    acceptance_criteria TEXT[],  -- Array of acceptance criteria
    
    -- Definition of Done
    definition_of_done TEXT[],
    
    -- Dependencies
    depends_on_stories UUID[],  -- Array of story IDs this story depends on
    
    -- Tags & Labels
    tags TEXT[],
    
    -- Dates
    target_completion_date DATE,
    completed_at TIMESTAMP,
    
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
CREATE INDEX IF NOT EXISTS idx_user_stories_project_id ON user_stories(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_user_stories_product_backlog_id ON user_stories(product_backlog_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_user_stories_epic_id ON user_stories(epic_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_user_stories_status ON user_stories(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_user_stories_priority ON user_stories(priority DESC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_user_stories_backlog_order ON user_stories(backlog_order) WHERE is_deleted = FALSE AND status = 'backlog';
CREATE INDEX IF NOT EXISTS idx_user_stories_assigned_to ON user_stories(assigned_to_user_id) WHERE is_deleted = FALSE;

-- Partial unique index for backlog order
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_stories_backlog_order_unique 
ON user_stories(product_backlog_id, backlog_order) 
WHERE is_deleted = FALSE AND status = 'backlog' AND backlog_order IS NOT NULL;

-- Triggers
DROP TRIGGER IF EXISTS trg_user_stories_before_insert ON user_stories;
CREATE TRIGGER trg_user_stories_before_insert
    BEFORE INSERT ON user_stories
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_user_stories_before_update ON user_stories;
CREATE TRIGGER trg_user_stories_before_update
    BEFORE UPDATE ON user_stories
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE user_stories IS 'User stories in the Product Backlog for Scrum projects';
COMMENT ON COLUMN user_stories.story_points IS 'Story point estimate (typically Fibonacci: 1, 2, 3, 5, 8, 13, 21, etc.)';
COMMENT ON COLUMN user_stories.backlog_order IS 'Order in backlog for prioritization (lower number = higher priority)';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('user_stories', 'User stories in the Product Backlog for Scrum projects', false, true, 'scrum')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 4: sprints
-- Description: Sprint definitions for Scrum projects
-- Category: scrum
-- ================================================

CREATE TABLE IF NOT EXISTS sprints (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    product_backlog_id UUID NOT NULL REFERENCES product_backlogs(id) ON DELETE CASCADE,

    -- Sprint Information
    sprint_name VARCHAR(200) NOT NULL,
    sprint_number INTEGER NOT NULL,  -- Sprint number in sequence (1, 2, 3, ...)
    sprint_goal TEXT,
    
    -- Duration
    sprint_start_date DATE NOT NULL,
    sprint_end_date DATE NOT NULL,
    sprint_duration_days INTEGER,  -- Calculated: end_date - start_date
    
    -- Status
    status VARCHAR(50) DEFAULT 'planned',  -- 'planned', 'active', 'completed', 'cancelled'
    
    -- Capacity
    team_capacity_hours DECIMAL(10, 2),  -- Total team capacity in hours
    team_capacity_story_points INTEGER,  -- Total team capacity in story points
    
    -- Metrics
    committed_story_points INTEGER DEFAULT 0,  -- Story points committed at sprint planning
    completed_story_points INTEGER DEFAULT 0,  -- Story points completed at sprint end
    velocity DECIMAL(10, 2),  -- Calculated velocity (completed_story_points)
    
    -- Team
    scrum_master_user_id UUID REFERENCES users(id),
    
    -- Dates
    planning_date DATE,
    review_date DATE,
    retrospective_date DATE,
    completed_at TIMESTAMP,
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT chk_sprints_dates CHECK (sprint_end_date >= sprint_start_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sprints_project_id ON sprints(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sprints_product_backlog_id ON sprints(product_backlog_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sprints_status ON sprints(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sprints_dates ON sprints(sprint_start_date, sprint_end_date) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sprints_number ON sprints(project_id, sprint_number) WHERE is_deleted = FALSE;

-- Partial unique index for sprint number per project
CREATE UNIQUE INDEX IF NOT EXISTS idx_sprints_project_number_unique 
ON sprints(project_id, sprint_number) 
WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_sprints_before_insert ON sprints;
CREATE TRIGGER trg_sprints_before_insert
    BEFORE INSERT ON sprints
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_sprints_before_update ON sprints;
CREATE TRIGGER trg_sprints_before_update
    BEFORE UPDATE ON sprints
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE sprints IS 'Sprint definitions for Scrum projects';
COMMENT ON COLUMN sprints.sprint_number IS 'Sequential sprint number within the project (1, 2, 3, ...)';
COMMENT ON COLUMN sprints.velocity IS 'Team velocity calculated from completed story points';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('sprints', 'Sprint definitions for Scrum projects', false, true, 'scrum')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 5: sprint_backlogs
-- Description: Stories assigned to sprints (Sprint Backlog)
-- Category: scrum
-- ================================================

CREATE TABLE IF NOT EXISTS sprint_backlogs (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    sprint_id UUID NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
    user_story_id UUID NOT NULL REFERENCES user_stories(id) ON DELETE CASCADE,

    -- Assignment Information
    assigned_at TIMESTAMP DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id),
    
    -- Status in Sprint
    sprint_status VARCHAR(50) DEFAULT 'todo',  -- 'todo', 'in_progress', 'in_review', 'done'
    
    -- Order in Sprint
    sprint_order INTEGER,  -- Order within sprint backlog
    
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
CREATE INDEX IF NOT EXISTS idx_sprint_backlogs_sprint_id ON sprint_backlogs(sprint_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sprint_backlogs_user_story_id ON sprint_backlogs(user_story_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sprint_backlogs_sprint_status ON sprint_backlogs(sprint_status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sprint_backlogs_sprint_order ON sprint_backlogs(sprint_id, sprint_order) WHERE is_deleted = FALSE;

-- Partial unique index to prevent duplicate story assignments to same sprint
CREATE UNIQUE INDEX IF NOT EXISTS idx_sprint_backlogs_sprint_story_unique 
ON sprint_backlogs(sprint_id, user_story_id) 
WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_sprint_backlogs_before_insert ON sprint_backlogs;
CREATE TRIGGER trg_sprint_backlogs_before_insert
    BEFORE INSERT ON sprint_backlogs
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_sprint_backlogs_before_update ON sprint_backlogs;
CREATE TRIGGER trg_sprint_backlogs_before_update
    BEFORE UPDATE ON sprint_backlogs
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE sprint_backlogs IS 'Sprint Backlog - Stories assigned to sprints';
COMMENT ON COLUMN sprint_backlogs.sprint_status IS 'Status of story within the sprint: todo, in_progress, in_review, done';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('sprint_backlogs', 'Sprint Backlog - Stories assigned to sprints', false, true, 'scrum')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
DECLARE
    v_tables_count INTEGER;
BEGIN
    -- Count Scrum-related tables
    SELECT COUNT(*)
    INTO v_tables_count
    FROM database_tables
    WHERE table_category = 'scrum'
      AND is_deleted = FALSE;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Scrum Tables Created';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Scrum Tables Created: %', v_tables_count;
    RAISE NOTICE '================================================';
    RAISE NOTICE 'v08_scrum_tables.sql completed successfully';
    RAISE NOTICE '================================================';
END $$;

-- ================================================
-- END OF FILE
-- ================================================

