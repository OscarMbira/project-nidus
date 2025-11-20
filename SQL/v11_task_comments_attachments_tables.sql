-- ================================================
-- File: v11_task_comments_attachments_tables.sql
-- Description: Task comments and attachments tables
-- Version: 1.0
-- Date: 2025-01-XX
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - v01 through v10 must be run first (all core tables must exist)
-- - tasks table must exist
-- - users table must exist

-- Purpose:
-- Creates tables for task collaboration:
-- 1. task_comments - Comments on tasks
-- 2. task_attachments - File attachments on tasks

-- Note: This script is idempotent and can be run multiple times safely

-- ================================================
-- TABLE 1: task_comments
-- Description: Comments on tasks for collaboration
-- Category: tasks
-- ================================================

CREATE TABLE IF NOT EXISTS task_comments (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,

    -- Comment Information
    comment_text TEXT NOT NULL,
    comment_type VARCHAR(50) DEFAULT 'comment',  -- 'comment', 'system', 'update'
    
    -- User
    user_id UUID NOT NULL REFERENCES users(id),
    
    -- Parent Comment (for replies/threading)
    parent_comment_id UUID REFERENCES task_comments(id) ON DELETE CASCADE,
    
    -- Status
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT chk_task_comments_type CHECK (comment_type IN ('comment', 'system', 'update'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON task_comments(user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_task_comments_parent_comment_id ON task_comments(parent_comment_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_task_comments_created_at ON task_comments(created_at DESC) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_task_comments_before_insert ON task_comments;
CREATE TRIGGER trg_task_comments_before_insert
    BEFORE INSERT ON task_comments
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_task_comments_before_update ON task_comments;
CREATE TRIGGER trg_task_comments_before_update
    BEFORE UPDATE ON task_comments
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE task_comments IS 'Comments on tasks for collaboration and communication';
COMMENT ON COLUMN task_comments.comment_type IS 'Type: comment (user comment), system (system-generated), update (status update)';
COMMENT ON COLUMN task_comments.parent_comment_id IS 'For threaded comments/replies';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('task_comments', 'Comments on tasks for collaboration and communication', false, true, 'tasks')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 2: task_attachments
-- Description: File attachments on tasks
-- Category: tasks
-- ================================================

CREATE TABLE IF NOT EXISTS task_attachments (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationship
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,

    -- File Information
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,  -- Path in Supabase Storage
    file_url TEXT,  -- Public URL if file is public
    file_size INTEGER,  -- Size in bytes
    file_type VARCHAR(100),  -- MIME type (e.g., 'image/png', 'application/pdf')
    file_extension VARCHAR(10),  -- File extension (e.g., 'pdf', 'png')
    
    -- User
    user_id UUID NOT NULL REFERENCES users(id),
    
    -- Metadata
    description TEXT,  -- Optional description of the attachment
    is_public BOOLEAN DEFAULT FALSE,  -- Whether file is publicly accessible
    
    -- Status
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON task_attachments(task_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_task_attachments_user_id ON task_attachments(user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_task_attachments_file_type ON task_attachments(file_type) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_task_attachments_before_insert ON task_attachments;
CREATE TRIGGER trg_task_attachments_before_insert
    BEFORE INSERT ON task_attachments
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_task_attachments_before_update ON task_attachments;
CREATE TRIGGER trg_task_attachments_before_update
    BEFORE UPDATE ON task_attachments
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE task_attachments IS 'File attachments on tasks';
COMMENT ON COLUMN task_attachments.file_path IS 'Path in Supabase Storage (e.g., tasks/{task_id}/{filename})';
COMMENT ON COLUMN task_attachments.file_url IS 'Public URL if file is publicly accessible';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('task_attachments', 'File attachments on tasks', false, true, 'tasks')
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
    -- Count Task Comments/Attachments tables
    SELECT COUNT(*)
    INTO v_tables_count
    FROM database_tables
    WHERE table_category = 'tasks'
      AND table_name IN ('task_comments', 'task_attachments')
      AND is_deleted = FALSE;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Task Comments & Attachments Tables Created';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Tables Created: %', v_tables_count;
    RAISE NOTICE '================================================';
    RAISE NOTICE 'v11_task_comments_attachments_tables.sql completed successfully';
    RAISE NOTICE '================================================';
END $$;

-- ================================================
-- END OF FILE
-- ================================================

