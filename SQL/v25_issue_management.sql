-- ================================================
-- File: v25_issue_management.sql
-- Description: Issue Management tables (universal across all methodologies)
-- Version: 1.0
-- Date: 2025-01-XX
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - v01 through v24 must be run first (all core tables must exist)
-- - projects table must exist
-- - users table must exist

-- Purpose:
-- Creates tables for universal Issue Management:
-- 1. issues - Issue tracking
-- 2. issue_comments - Comments on issues
-- 3. issue_attachments - File attachments on issues
-- 4. issue_history - Issue change history

-- Note: This script is idempotent and can be run multiple times safely

-- ================================================
-- TABLE 1: issues
-- Description: Issue tracking (universal across methodologies)
-- Category: issues
-- ================================================

CREATE TABLE IF NOT EXISTS issues (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    work_package_id UUID REFERENCES work_packages(id) ON DELETE SET NULL,  -- Optional: link to work package
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,  -- Optional: link to task
    user_story_id UUID REFERENCES user_stories(id) ON DELETE SET NULL,  -- Optional: link to user story
    kanban_card_id UUID REFERENCES kanban_cards(id) ON DELETE SET NULL,  -- Optional: link to kanban card

    -- Issue Information
    issue_title VARCHAR(200) NOT NULL,
    issue_description TEXT NOT NULL,
    issue_code VARCHAR(50),  -- Unique code (e.g., ISSUE-001)
    
    -- Categorization
    issue_type VARCHAR(50) DEFAULT 'bug',  -- 'bug', 'enhancement', 'task', 'question', 'blocker', 'risk', 'other'
    issue_category VARCHAR(50),  -- 'technical', 'process', 'resource', 'quality', 'schedule', 'other'
    
    -- Priority & Severity
    priority VARCHAR(50) DEFAULT 'medium',  -- 'low', 'medium', 'high', 'critical'
    severity VARCHAR(50) DEFAULT 'medium',  -- 'low', 'medium', 'high', 'critical'
    
    -- Status Workflow
    status VARCHAR(50) DEFAULT 'new',  -- 'new', 'assigned', 'in_progress', 'resolved', 'closed', 'reopened', 'cancelled'
    
    -- Assignment
    reported_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP,
    
    -- Resolution
    resolved_at TIMESTAMP,
    resolved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    resolution_type VARCHAR(50),  -- 'fixed', 'wont_fix', 'duplicate', 'invalid', 'works_as_designed'
    resolution_notes TEXT,
    
    -- Closure
    closed_at TIMESTAMP,
    closed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Dates
    due_date DATE,
    estimated_resolution_date DATE,
    
    -- Impact
    impact_description TEXT,
    affected_areas TEXT[],  -- Array of affected areas/components
    
    -- Escalation
    is_escalated BOOLEAN DEFAULT FALSE,
    escalated_at TIMESTAMP,
    escalated_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    escalation_reason TEXT,
    
    -- Related Issues
    related_issue_ids UUID[],  -- Array of related issue IDs
    
    -- Tags
    tags TEXT[],  -- Array of tags for filtering/searching

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
CREATE INDEX IF NOT EXISTS idx_issues_project_id ON issues(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_issues_work_package_id ON issues(work_package_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_issues_task_id ON issues(task_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_issues_user_story_id ON issues(user_story_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_issues_kanban_card_id ON issues(kanban_card_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_issues_priority ON issues(priority) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_issues_assigned_to ON issues(assigned_to_user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_issues_reported_by ON issues(reported_by_user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_issues_type ON issues(issue_type) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_issues_code ON issues(issue_code) WHERE is_deleted = FALSE AND issue_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_issues_escalated ON issues(is_escalated) WHERE is_deleted = FALSE AND is_escalated = TRUE;

-- Unique constraint for issue code per project
CREATE UNIQUE INDEX IF NOT EXISTS idx_issues_code_unique 
ON issues(project_id, issue_code) 
WHERE is_deleted = FALSE AND issue_code IS NOT NULL;

-- Triggers
DROP TRIGGER IF EXISTS trg_issues_before_insert ON issues;
CREATE TRIGGER trg_issues_before_insert
    BEFORE INSERT ON issues
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_issues_before_update ON issues;
CREATE TRIGGER trg_issues_before_update
    BEFORE UPDATE ON issues
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE issues IS 'Issue tracking (universal across all methodologies)';
COMMENT ON COLUMN issues.status IS 'Status: new, assigned, in_progress, resolved, closed, reopened, cancelled';
COMMENT ON COLUMN issues.issue_type IS 'Type: bug, enhancement, task, question, blocker, risk, other';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('issues', 'Issue tracking (universal across all methodologies)', false, true, 'issues')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 2: issue_comments
-- Description: Comments on issues
-- Category: issues
-- ================================================

CREATE TABLE IF NOT EXISTS issue_comments (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Comment Information
    comment_text TEXT NOT NULL,
    comment_type VARCHAR(50) DEFAULT 'comment',  -- 'comment', 'status_change', 'assignment', 'resolution', 'system'
    
    -- Parent Comment (for replies/threading)
    parent_comment_id UUID REFERENCES issue_comments(id) ON DELETE CASCADE,
    
    -- Status
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Internal Note
    is_internal_note BOOLEAN DEFAULT FALSE,  -- Internal notes not visible to all users

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_issue_comments_issue_id ON issue_comments(issue_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_issue_comments_user_id ON issue_comments(user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_issue_comments_parent_id ON issue_comments(parent_comment_id) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_issue_comments_before_insert ON issue_comments;
CREATE TRIGGER trg_issue_comments_before_insert
    BEFORE INSERT ON issue_comments
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_issue_comments_before_update ON issue_comments;
CREATE TRIGGER trg_issue_comments_before_update
    BEFORE UPDATE ON issue_comments
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE issue_comments IS 'Comments on issues';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('issue_comments', 'Comments on issues', false, true, 'issues')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 3: issue_attachments
-- Description: File attachments on issues
-- Category: issues
-- ================================================

CREATE TABLE IF NOT EXISTS issue_attachments (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    uploaded_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Attachment Information
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,  -- Storage path/URL
    file_type VARCHAR(100),  -- MIME type
    file_size BIGINT,  -- Size in bytes
    file_description TEXT,
    
    -- Storage
    storage_bucket VARCHAR(100) DEFAULT 'issue-attachments',  -- Supabase storage bucket
    storage_path TEXT,  -- Path within storage bucket

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
CREATE INDEX IF NOT EXISTS idx_issue_attachments_issue_id ON issue_attachments(issue_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_issue_attachments_uploaded_by ON issue_attachments(uploaded_by_user_id) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_issue_attachments_before_insert ON issue_attachments;
CREATE TRIGGER trg_issue_attachments_before_insert
    BEFORE INSERT ON issue_attachments
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_issue_attachments_before_update ON issue_attachments;
CREATE TRIGGER trg_issue_attachments_before_update
    BEFORE UPDATE ON issue_attachments
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE issue_attachments IS 'File attachments on issues';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('issue_attachments', 'File attachments on issues', false, true, 'issues')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 4: issue_history
-- Description: Issue change history (audit trail)
-- Category: issues
-- ================================================

CREATE TABLE IF NOT EXISTS issue_history (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    changed_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Change Information
    change_type VARCHAR(50) NOT NULL,  -- 'created', 'updated', 'status_changed', 'assigned', 'resolved', 'closed', 'reopened'
    field_name VARCHAR(100),  -- Field that changed (if applicable)
    old_value TEXT,  -- Previous value
    new_value TEXT,  -- New value
    change_description TEXT,  -- Human-readable description of change
    
    -- Change Date
    changed_at TIMESTAMP DEFAULT NOW(),

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_issue_history_issue_id ON issue_history(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_history_changed_by ON issue_history(changed_by_user_id);
CREATE INDEX IF NOT EXISTS idx_issue_history_changed_at ON issue_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_issue_history_change_type ON issue_history(change_type);

-- Comments
COMMENT ON TABLE issue_history IS 'Issue change history (audit trail)';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('issue_history', 'Issue change history (audit trail)', false, true, 'issues')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- FUNCTION: Track issue history on changes
-- ================================================

CREATE OR REPLACE FUNCTION track_issue_history()
RETURNS TRIGGER AS $$
DECLARE
    v_change_type VARCHAR(50);
    v_description TEXT;
BEGIN
    -- Determine change type
    IF TG_OP = 'INSERT' THEN
        v_change_type := 'created';
        v_description := 'Issue created';
    ELSIF TG_OP = 'UPDATE' THEN
        -- Check what changed
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            v_change_type := 'status_changed';
            v_description := 'Status changed from ' || COALESCE(OLD.status, 'N/A') || ' to ' || COALESCE(NEW.status, 'N/A');
        ELSIF OLD.assigned_to_user_id IS DISTINCT FROM NEW.assigned_to_user_id THEN
            v_change_type := 'assigned';
            v_description := 'Issue assigned';
        ELSIF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
            v_change_type := 'resolved';
            v_description := 'Issue resolved';
        ELSIF NEW.status = 'closed' AND OLD.status != 'closed' THEN
            v_change_type := 'closed';
            v_description := 'Issue closed';
        ELSIF NEW.status = 'reopened' AND OLD.status != 'reopened' THEN
            v_change_type := 'reopened';
            v_description := 'Issue reopened';
        ELSE
            v_change_type := 'updated';
            v_description := 'Issue updated';
        END IF;
    END IF;

    -- Insert history record
    INSERT INTO issue_history (
        issue_id,
        changed_by_user_id,
        change_type,
        field_name,
        old_value,
        new_value,
        change_description,
        changed_at,
        created_by
    ) VALUES (
        NEW.id,
        COALESCE(NEW.updated_by, NEW.created_by),
        v_change_type,
        NULL,
        NULL,
        NULL,
        v_description,
        NOW(),
        COALESCE(NEW.updated_by, NEW.created_by)
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for issue history
DROP TRIGGER IF EXISTS trg_issues_history ON issues;
CREATE TRIGGER trg_issues_history
    AFTER INSERT OR UPDATE ON issues
    FOR EACH ROW
    EXECUTE FUNCTION track_issue_history();

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
DECLARE
    v_tables_count INTEGER;
BEGIN
    -- Count Issue Management tables
    SELECT COUNT(*)
    INTO v_tables_count
    FROM database_tables
    WHERE table_category = 'issues'
      AND table_name IN (
          'issues',
          'issue_comments',
          'issue_attachments',
          'issue_history'
      )
      AND is_deleted = FALSE;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Issue Management Tables Created';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Issue Tables Created: %', v_tables_count;
    RAISE NOTICE '================================================';
    RAISE NOTICE 'v25_issue_management.sql completed successfully';
    RAISE NOTICE '================================================';
END $$;

-- ================================================
-- END OF FILE
-- ================================================

