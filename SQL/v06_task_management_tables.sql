-- ================================================
-- File: v06_task_management_tables.sql
-- Description: Task management tables for universal task handling
-- Version: 1.0
-- Date: 2025-01-XX
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - v01 through v05 must be run first (all core tables must exist)
-- - projects table must exist

-- Purpose:
-- Creates task management tables:
-- 1. tasks - Universal task records
-- 2. task_assignments - Task-to-user assignments (many-to-many)
-- 3. task_dependencies - Task dependency relationships
-- 4. task_statuses - Task status workflow definitions

-- Note: This script is idempotent and can be run multiple times safely

-- ================================================
-- TABLE 1: task_statuses
-- Description: Task status workflow definitions
-- Category: task
-- ================================================

CREATE TABLE IF NOT EXISTS task_statuses (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Status Information
    status_code VARCHAR(50) UNIQUE NOT NULL,
    status_name VARCHAR(100) NOT NULL,
    status_description TEXT,

    -- Status Properties
    status_color VARCHAR(7),  -- Hex color code (#FF0000)
    status_icon VARCHAR(50),
    status_order INTEGER NOT NULL,

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
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_statuses_code_unique ON task_statuses(status_code) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_task_statuses_order ON task_statuses(status_order);
CREATE INDEX IF NOT EXISTS idx_task_statuses_is_active ON task_statuses(is_active) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_task_statuses_before_insert ON task_statuses;
CREATE TRIGGER trg_task_statuses_before_insert
    BEFORE INSERT ON task_statuses
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_task_statuses_before_update ON task_statuses;
CREATE TRIGGER trg_task_statuses_before_update
    BEFORE UPDATE ON task_statuses
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE task_statuses IS 'Task status workflow definitions for task lifecycle management';
COMMENT ON COLUMN task_statuses.is_initial_status IS 'Default status for new tasks';
COMMENT ON COLUMN task_statuses.is_final_status IS 'Indicates task completion';
COMMENT ON COLUMN task_statuses.is_active_status IS 'Indicates task is actively being worked on';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('task_statuses', 'Task status workflow definitions for task lifecycle management', false, true, 'task')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 2: tasks
-- Description: Universal task records for all methodologies
-- Category: task
-- ================================================

CREATE TABLE IF NOT EXISTS tasks (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Task Identification
    task_code VARCHAR(50),
    task_name VARCHAR(200) NOT NULL,
    task_description TEXT,

    -- Relationships
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,  -- For subtasks

    -- Task Properties
    task_type VARCHAR(50) DEFAULT 'task',  -- 'task', 'milestone', 'summary', 'subtask'
    priority VARCHAR(50) DEFAULT 'medium',  -- 'low', 'medium', 'high', 'critical'
    status_id UUID REFERENCES task_statuses(id),

    -- Assignment
    assigned_to_user_id UUID REFERENCES users(id),
    assigned_by_user_id UUID REFERENCES users(id),

    -- Timeline
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    due_date DATE,

    -- Effort & Duration
    estimated_hours DECIMAL(10, 2),
    actual_hours DECIMAL(10, 2),
    estimated_duration_days INTEGER,
    actual_duration_days INTEGER,

    -- Progress
    percentage_complete DECIMAL(5, 2) DEFAULT 0,
    completion_date TIMESTAMP,

    -- Additional Properties
    tags TEXT[],  -- Array of tags
    labels JSONB,  -- Custom labels
    custom_fields JSONB,  -- Additional custom fields

    -- Status
    is_milestone BOOLEAN DEFAULT FALSE,
    is_blocked BOOLEAN DEFAULT FALSE,
    blocked_reason TEXT,
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),

    -- Constraints
    CONSTRAINT chk_tasks_dates CHECK (
        (planned_end_date IS NULL OR planned_start_date IS NULL OR planned_end_date >= planned_start_date) AND
        (due_date IS NULL OR planned_start_date IS NULL OR due_date >= planned_start_date)
    ),
    CONSTRAINT chk_tasks_progress CHECK (percentage_complete >= 0 AND percentage_complete <= 100),
    CONSTRAINT chk_tasks_hours CHECK (estimated_hours >= 0 AND actual_hours >= 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_tasks_status_id ON tasks(status_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to_user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_is_blocked ON tasks(is_blocked) WHERE is_deleted = FALSE;
-- Full-text search on task name
CREATE INDEX IF NOT EXISTS idx_tasks_name_search ON tasks USING gin(to_tsvector('english', task_name));

-- Triggers
DROP TRIGGER IF EXISTS trg_tasks_before_insert ON tasks;
CREATE TRIGGER trg_tasks_before_insert
    BEFORE INSERT ON tasks
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_tasks_before_update ON tasks;
CREATE TRIGGER trg_tasks_before_update
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE tasks IS 'Universal task records for all methodologies';
COMMENT ON COLUMN tasks.task_code IS 'Optional unique task code/identifier';
COMMENT ON COLUMN tasks.parent_task_id IS 'Reference to parent task for subtask hierarchy';
COMMENT ON COLUMN tasks.task_type IS 'Type: task, milestone, summary, subtask';
COMMENT ON COLUMN tasks.percentage_complete IS 'Task completion percentage (0-100)';
COMMENT ON COLUMN tasks.tags IS 'Array of tags for categorization';
COMMENT ON COLUMN tasks.custom_fields IS 'JSONB for additional custom task fields';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('tasks', 'Universal task records for all methodologies', false, true, 'task')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 3: task_assignments
-- Description: Task-to-user assignments (many-to-many)
-- Category: task
-- ================================================

CREATE TABLE IF NOT EXISTS task_assignments (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Assignment Properties
    assignment_type VARCHAR(50) DEFAULT 'assignee',  -- 'assignee', 'reviewer', 'watcher', 'collaborator'
    assigned_at TIMESTAMP DEFAULT NOW(),
    assigned_by_user_id UUID REFERENCES users(id),

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
    -- Note: Unique constraint with WHERE clause is created as a partial unique index below
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON task_assignments(task_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_task_assignments_user_id ON task_assignments(user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_task_assignments_type ON task_assignments(assignment_type) WHERE is_deleted = FALSE;
-- Partial unique index for task-user-assignment_type combination (only for non-deleted records)
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_assignments_unique ON task_assignments(task_id, user_id, assignment_type) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_task_assignments_before_insert ON task_assignments;
CREATE TRIGGER trg_task_assignments_before_insert
    BEFORE INSERT ON task_assignments
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_task_assignments_before_update ON task_assignments;
CREATE TRIGGER trg_task_assignments_before_update
    BEFORE UPDATE ON task_assignments
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE task_assignments IS 'Task-to-user assignments (many-to-many relationship)';
COMMENT ON COLUMN task_assignments.assignment_type IS 'Type: assignee, reviewer, watcher, collaborator';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('task_assignments', 'Task-to-user assignments (many-to-many relationship)', false, true, 'task')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 4: task_dependencies
-- Description: Task dependency relationships
-- Category: task
-- ================================================

CREATE TABLE IF NOT EXISTS task_dependencies (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    predecessor_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    successor_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,

    -- Dependency Properties
    dependency_type VARCHAR(50) DEFAULT 'finish_to_start',  -- 'finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish'
    lag_days INTEGER DEFAULT 0,  -- Lag or lead time in days
    is_critical BOOLEAN DEFAULT FALSE,

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

    -- Constraints
    CONSTRAINT chk_task_dependencies_no_self_reference CHECK (predecessor_task_id != successor_task_id)
    -- Note: Unique constraint with WHERE clause is created as a partial unique index below
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_task_dependencies_predecessor ON task_dependencies(predecessor_task_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_task_dependencies_successor ON task_dependencies(successor_task_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_task_dependencies_type ON task_dependencies(dependency_type) WHERE is_deleted = FALSE;
-- Partial unique index for dependency uniqueness (only for non-deleted records)
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_dependencies_unique ON task_dependencies(predecessor_task_id, successor_task_id, dependency_type) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_task_dependencies_before_insert ON task_dependencies;
CREATE TRIGGER trg_task_dependencies_before_insert
    BEFORE INSERT ON task_dependencies
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_task_dependencies_before_update ON task_dependencies;
CREATE TRIGGER trg_task_dependencies_before_update
    BEFORE UPDATE ON task_dependencies
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE task_dependencies IS 'Task dependency relationships for scheduling and planning';
COMMENT ON COLUMN task_dependencies.dependency_type IS 'FS (Finish-to-Start), SS (Start-to-Start), FF (Finish-to-Finish), SF (Start-to-Finish)';
COMMENT ON COLUMN task_dependencies.lag_days IS 'Lag (positive) or lead (negative) time in days';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('task_dependencies', 'Task dependency relationships for scheduling and planning', false, true, 'task')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- SEED DATA: Task Statuses
-- ================================================

INSERT INTO task_statuses (status_code, status_name, status_description, status_color, status_icon, status_order, is_initial_status, is_final_status, is_active_status, is_active)
VALUES
    ('todo', 'To Do', 'Task is created but not yet started', '#6B7280', 'circle', 1, true, false, false, true),
    ('in_progress', 'In Progress', 'Task is currently being worked on', '#3B82F6', 'play-circle', 2, false, false, true, true),
    ('in_review', 'In Review', 'Task is completed and awaiting review', '#F59E0B', 'eye', 3, false, false, false, true),
    ('blocked', 'Blocked', 'Task is blocked and cannot proceed', '#EF4444', 'ban', 4, false, false, false, true),
    ('completed', 'Completed', 'Task has been completed successfully', '#10B981', 'check-circle', 5, false, true, false, true),
    ('cancelled', 'Cancelled', 'Task has been cancelled', '#DC2626', 'x-circle', 6, false, true, false, true)
ON CONFLICT (status_code) DO UPDATE SET
    status_name = EXCLUDED.status_name,
    status_description = EXCLUDED.status_description,
    status_color = EXCLUDED.status_color,
    status_order = EXCLUDED.status_order,
    updated_at = NOW();

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
DECLARE
    v_tables_count INTEGER;
    v_statuses_count INTEGER;
BEGIN
    -- Count task-related tables
    SELECT COUNT(*)
    INTO v_tables_count
    FROM database_tables
    WHERE table_category = 'task'
      AND is_deleted = FALSE;

    -- Count task statuses
    SELECT COUNT(*)
    INTO v_statuses_count
    FROM task_statuses
    WHERE is_deleted = FALSE;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Task Management Tables Created';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Task Tables Created: %', v_tables_count;
    RAISE NOTICE 'Task Statuses Created: %', v_statuses_count;
    RAISE NOTICE '================================================';
    RAISE NOTICE 'v06_task_management_tables.sql completed successfully';
    RAISE NOTICE '================================================';
END $$;

-- ================================================
-- END OF FILE
-- ================================================

-- Next Steps:
-- Run seed data scripts if needed
-- Create task management views in v08_views.sql

