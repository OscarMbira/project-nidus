-- ================================================
-- File: v09_kanban_tables.sql
-- Description: Kanban methodology tables for boards, columns, and cards
-- Version: 1.0
-- Date: 2025-01-XX
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - v01 through v08 must be run first (all core tables must exist)
-- - projects table must exist
-- - project_methodologies table must exist

-- Purpose:
-- Creates Kanban methodology tables:
-- 1. kanban_boards - Kanban board definitions per project
-- 2. kanban_columns - Column definitions for boards
-- 3. kanban_cards - Cards on the board
-- 4. wip_limits - Work In Progress limits per column

-- Note: This script is idempotent and can be run multiple times safely

-- ================================================
-- TABLE 1: kanban_boards
-- Description: Kanban board definitions per project
-- Category: kanban
-- ================================================

CREATE TABLE IF NOT EXISTS kanban_boards (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Board Information
    board_name VARCHAR(200) NOT NULL,
    board_description TEXT,
    
    -- Board Settings
    board_type VARCHAR(50) DEFAULT 'standard',  -- 'standard', 'swimlane', 'custom'
    swimlane_type VARCHAR(50),  -- 'priority', 'team', 'epic', 'assignee', 'custom'
    card_color_scheme VARCHAR(50) DEFAULT 'priority',  -- 'priority', 'status', 'type', 'custom'
    
    -- Board Owner
    board_owner_user_id UUID REFERENCES users(id),
    
    -- Settings
    show_card_aging BOOLEAN DEFAULT TRUE,
    show_blocked_indicators BOOLEAN DEFAULT TRUE,
    allow_card_creation BOOLEAN DEFAULT TRUE,
    
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
CREATE INDEX IF NOT EXISTS idx_kanban_boards_project_id ON kanban_boards(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_kanban_boards_owner ON kanban_boards(board_owner_user_id) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_kanban_boards_before_insert ON kanban_boards;
CREATE TRIGGER trg_kanban_boards_before_insert
    BEFORE INSERT ON kanban_boards
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_kanban_boards_before_update ON kanban_boards;
CREATE TRIGGER trg_kanban_boards_before_update
    BEFORE UPDATE ON kanban_boards
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE kanban_boards IS 'Kanban board definitions for projects';
COMMENT ON COLUMN kanban_boards.board_type IS 'Board type: standard, swimlane, custom';
COMMENT ON COLUMN kanban_boards.swimlane_type IS 'Swimlane grouping: priority, team, epic, assignee, custom';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('kanban_boards', 'Kanban board definitions for projects', false, true, 'kanban')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 2: kanban_columns
-- Description: Column definitions for Kanban boards
-- Category: kanban
-- ================================================

CREATE TABLE IF NOT EXISTS kanban_columns (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    board_id UUID NOT NULL REFERENCES kanban_boards(id) ON DELETE CASCADE,

    -- Column Information
    column_name VARCHAR(200) NOT NULL,
    column_description TEXT,
    column_color VARCHAR(7),  -- Hex color code
    
    -- Column Settings
    column_order INTEGER NOT NULL,  -- Order of column on board (left to right)
    is_done_column BOOLEAN DEFAULT FALSE,  -- Marks completion column
    is_backlog_column BOOLEAN DEFAULT FALSE,  -- Marks backlog/input column
    
    -- WIP Limits
    wip_limit INTEGER,  -- Work In Progress limit (NULL = unlimited)
    wip_limit_type VARCHAR(50) DEFAULT 'hard',  -- 'hard' (block), 'soft' (warn), 'none'
    
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
CREATE INDEX IF NOT EXISTS idx_kanban_columns_board_id ON kanban_columns(board_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_kanban_columns_order ON kanban_columns(board_id, column_order) WHERE is_deleted = FALSE;

-- Partial unique index for column order per board
CREATE UNIQUE INDEX IF NOT EXISTS idx_kanban_columns_board_order_unique 
ON kanban_columns(board_id, column_order) 
WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_kanban_columns_before_insert ON kanban_columns;
CREATE TRIGGER trg_kanban_columns_before_insert
    BEFORE INSERT ON kanban_columns
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_kanban_columns_before_update ON kanban_columns;
CREATE TRIGGER trg_kanban_columns_before_update
    BEFORE UPDATE ON kanban_columns
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE kanban_columns IS 'Column definitions for Kanban boards';
COMMENT ON COLUMN kanban_columns.wip_limit IS 'Work In Progress limit - maximum cards allowed in this column';
COMMENT ON COLUMN kanban_columns.wip_limit_type IS 'WIP limit enforcement: hard (block), soft (warn), none';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('kanban_columns', 'Column definitions for Kanban boards', false, true, 'kanban')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 3: kanban_cards
-- Description: Cards on Kanban boards
-- Category: kanban
-- ================================================

CREATE TABLE IF NOT EXISTS kanban_cards (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    board_id UUID NOT NULL REFERENCES kanban_boards(id) ON DELETE CASCADE,
    column_id UUID NOT NULL REFERENCES kanban_columns(id) ON DELETE RESTRICT,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Optional link to universal tasks
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    
    -- Card Information
    card_title VARCHAR(200) NOT NULL,
    card_description TEXT,
    card_color VARCHAR(7),  -- Hex color code for card
    
    -- Card Metadata
    priority VARCHAR(50) DEFAULT 'medium',  -- 'critical', 'high', 'medium', 'low'
    card_type VARCHAR(50),  -- 'task', 'bug', 'feature', 'epic', 'story', 'custom'
    tags TEXT[],
    
    -- Assignment
    assigned_to_user_id UUID REFERENCES users(id),
    
    -- Dates
    due_date DATE,
    started_at TIMESTAMP,  -- When card entered current column
    completed_at TIMESTAMP,  -- When card moved to done column
    
    -- Card Status
    is_blocked BOOLEAN DEFAULT FALSE,
    blocked_reason TEXT,
    blocked_at TIMESTAMP,
    
    -- Card Order
    card_order INTEGER,  -- Order within column
    
    -- Swimlane (if using swimlanes)
    swimlane_value VARCHAR(200),  -- Value for swimlane grouping
    
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
CREATE INDEX IF NOT EXISTS idx_kanban_cards_board_id ON kanban_cards(board_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_kanban_cards_column_id ON kanban_cards(column_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_kanban_cards_project_id ON kanban_cards(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_kanban_cards_task_id ON kanban_cards(task_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_kanban_cards_assigned_to ON kanban_cards(assigned_to_user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_kanban_cards_column_order ON kanban_cards(column_id, card_order) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_kanban_cards_swimlane ON kanban_cards(board_id, swimlane_value) WHERE is_deleted = FALSE AND swimlane_value IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kanban_cards_blocked ON kanban_cards(is_blocked) WHERE is_deleted = FALSE AND is_blocked = TRUE;

-- Triggers
DROP TRIGGER IF EXISTS trg_kanban_cards_before_insert ON kanban_cards;
CREATE TRIGGER trg_kanban_cards_before_insert
    BEFORE INSERT ON kanban_cards
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_kanban_cards_before_update ON kanban_cards;
CREATE TRIGGER trg_kanban_cards_before_update
    BEFORE UPDATE ON kanban_cards
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE kanban_cards IS 'Cards on Kanban boards';
COMMENT ON COLUMN kanban_cards.swimlane_value IS 'Value for swimlane grouping (priority, team name, epic name, etc.)';
COMMENT ON COLUMN kanban_cards.started_at IS 'Timestamp when card entered current column';
COMMENT ON COLUMN kanban_cards.completed_at IS 'Timestamp when card moved to done column';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('kanban_cards', 'Cards on Kanban boards', false, true, 'kanban')
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
    -- Count Kanban-related tables
    SELECT COUNT(*)
    INTO v_tables_count
    FROM database_tables
    WHERE table_category = 'kanban'
      AND is_deleted = FALSE;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Kanban Tables Created';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Kanban Tables Created: %', v_tables_count;
    RAISE NOTICE '================================================';
    RAISE NOTICE 'v09_kanban_tables.sql completed successfully';
    RAISE NOTICE '================================================';
END $$;

-- ================================================
-- END OF FILE
-- ================================================

