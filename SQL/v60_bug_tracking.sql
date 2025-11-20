-- ================================================
-- File: v60_bug_tracking.sql
-- Description: Bug tracking system for Phase 9
-- Version: 1.0
-- Date: 2025-01-XX
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Purpose:
-- Creates bug tracking system for Phase 9 Quality & Testing module
-- Allows users and admins to report, track, and manage bugs

-- ================================================
-- TABLE: bugs
-- Description: Bug reports and tracking
-- Category: quality
-- ================================================

CREATE TABLE IF NOT EXISTS bugs (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Bug Information
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    
    -- Bug Details
    steps_to_reproduce TEXT,
    expected_behavior TEXT,
    actual_behavior TEXT,
    
    -- Classification
    severity VARCHAR(20) NOT NULL DEFAULT 'medium',  -- 'critical', 'high', 'medium', 'low'
    priority VARCHAR(10) NOT NULL DEFAULT 'p2',  -- 'p0', 'p1', 'p2', 'p3'
    status VARCHAR(20) NOT NULL DEFAULT 'new',  -- 'new', 'assigned', 'in_progress', 'fixed', 'verified', 'closed', 'rejected'
    
    -- Assignment
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Context
    page_url VARCHAR(500),
    browser_info TEXT,
    device_info TEXT,
    screenshot_url TEXT,
    
    -- Resolution
    resolution_notes TEXT,
    resolved_at TIMESTAMP,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Related Items
    related_issue_id UUID REFERENCES issues(id) ON DELETE SET NULL,
    related_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    
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
CREATE INDEX IF NOT EXISTS idx_bugs_reporter_id ON bugs(reporter_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_bugs_assignee_id ON bugs(assignee_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_bugs_status ON bugs(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_bugs_severity ON bugs(severity) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_bugs_priority ON bugs(priority) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_bugs_related_project_id ON bugs(related_project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_bugs_created_at ON bugs(created_at DESC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_bugs_status_priority ON bugs(status, priority) WHERE is_deleted = FALSE;

-- Triggers
DROP TRIGGER IF EXISTS trg_bugs_before_insert ON bugs;
CREATE TRIGGER trg_bugs_before_insert
    BEFORE INSERT ON bugs
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_bugs_before_update ON bugs;
CREATE TRIGGER trg_bugs_before_update
    BEFORE UPDATE ON bugs
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- RLS Policies
ALTER TABLE bugs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all bugs (for transparency)
CREATE POLICY "Users can view bugs"
    ON bugs FOR SELECT
    USING (
        is_deleted = FALSE AND
        (
            -- Users can view bugs they reported
            reporter_id = auth.uid() OR
            -- Users can view bugs assigned to them
            assignee_id = auth.uid() OR
            -- Admins can view all bugs
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid()
                AND ur.is_active = TRUE
                AND ur.is_deleted = FALSE
                AND r.role_name = 'system_admin'
            )
        )
    );

-- Policy: Users can create bugs
CREATE POLICY "Users can create bugs"
    ON bugs FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND
        reporter_id = auth.uid()
    );

-- Policy: Users can update bugs they reported or are assigned to, admins can update all
CREATE POLICY "Users can update their bugs"
    ON bugs FOR UPDATE
    USING (
        is_deleted = FALSE AND
        (
            reporter_id = auth.uid() OR
            assignee_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid()
                AND ur.is_active = TRUE
                AND ur.is_deleted = FALSE
                AND r.role_name = 'system_admin'
            )
        )
    );

-- Policy: Only admins can delete bugs
CREATE POLICY "Only admins can delete bugs"
    ON bugs FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND ur.is_active = TRUE
            AND ur.is_deleted = FALSE
            AND r.role_name = 'system_admin'
        )
    );

-- Comments
COMMENT ON TABLE bugs IS 'Bug tracking system for Phase 9';
COMMENT ON COLUMN bugs.severity IS 'Bug severity: critical, high, medium, low';
COMMENT ON COLUMN bugs.priority IS 'Bug priority: p0 (critical, 24h), p1 (high, 7d), p2 (medium, 30d), p3 (low, 90d)';
COMMENT ON COLUMN bugs.status IS 'Bug status: new, assigned, in_progress, fixed, verified, closed, rejected';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('bugs', 'Bug tracking system for Phase 9', false, true, 'quality')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

