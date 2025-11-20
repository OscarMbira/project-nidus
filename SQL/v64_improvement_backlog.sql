-- ================================================
-- File: v64_improvement_backlog.sql
-- Description: Improvement backlog system for Phase 10
-- Version: 1.0
-- Date: 2025-01-XX
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Purpose:
-- Creates improvement backlog system for Phase 10 Launch & Support module
-- Tracks improvements, enhancements, and optimizations systematically

-- ================================================
-- TABLE: improvement_backlog
-- Description: Improvement and enhancement tracking
-- Category: improvement
-- ================================================

CREATE TABLE IF NOT EXISTS improvement_backlog (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Improvement Information
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    improvement_type VARCHAR(50) DEFAULT 'enhancement',  -- 'bug_fix', 'performance', 'ux', 'feature_polish', 'documentation', 'accessibility', 'mobile', 'enhancement'
    
    -- Priority & Impact Assessment
    impact_score INTEGER DEFAULT 0,  -- 0-100: User impact
    effort_score INTEGER DEFAULT 0,  -- 0-100: Development effort (higher = more effort)
    priority_score DECIMAL(10,2) GENERATED ALWAYS AS (
        CASE 
            WHEN effort_score = 0 THEN 0
            ELSE ROUND(impact_score::DECIMAL / effort_score::DECIMAL * 100, 2)
        END
    ) STORED,  -- Calculated: impact / effort ratio
    
    -- Status
    status VARCHAR(20) DEFAULT 'backlog',  -- 'backlog', 'planned', 'in_progress', 'testing', 'completed', 'cancelled'
    
    -- Assignment
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP,
    
    -- Source
    source_type VARCHAR(50),  -- 'feedback', 'bug_report', 'feature_request', 'user_survey', 'internal', 'analytics'
    source_id UUID,  -- ID of source (feedback_id, bug_id, feature_request_id, etc.)
    
    -- Related Items
    related_feedback_id UUID REFERENCES user_feedback(id) ON DELETE SET NULL,
    related_bug_id UUID REFERENCES bugs(id) ON DELETE SET NULL,
    related_feature_request_id UUID REFERENCES feature_requests(id) ON DELETE SET NULL,
    
    -- Scheduling
    planned_release VARCHAR(100),  -- e.g., "v1.2", "Q1 2025"
    target_completion_date DATE,
    actual_completion_date DATE,
    
    -- Metrics
    estimated_hours DECIMAL(10,2),
    actual_hours DECIMAL(10,2),
    
    -- Results
    before_metrics JSONB,  -- Metrics before improvement
    after_metrics JSONB,  -- Metrics after improvement
    improvement_notes TEXT,
    
    -- Tags
    tags TEXT[],
    
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
CREATE INDEX IF NOT EXISTS idx_improvement_backlog_status ON improvement_backlog(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_improvement_backlog_priority_score ON improvement_backlog(priority_score DESC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_improvement_backlog_assigned_to ON improvement_backlog(assigned_to) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_improvement_backlog_source ON improvement_backlog(source_type, source_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_improvement_backlog_created_at ON improvement_backlog(created_at DESC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_improvement_backlog_target_completion ON improvement_backlog(target_completion_date) WHERE is_deleted = FALSE AND target_completion_date IS NOT NULL;

-- Triggers
DROP TRIGGER IF EXISTS trg_improvement_backlog_before_insert ON improvement_backlog;
CREATE TRIGGER trg_improvement_backlog_before_insert
    BEFORE INSERT ON improvement_backlog
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_improvement_backlog_before_update ON improvement_backlog;
CREATE TRIGGER trg_improvement_backlog_before_update
    BEFORE UPDATE ON improvement_backlog
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- RLS Policies
ALTER TABLE improvement_backlog ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view improvements
CREATE POLICY "Users can view improvements"
    ON improvement_backlog FOR SELECT
    USING (
        is_deleted = FALSE AND
        (
            -- Public improvements
            status IN ('backlog', 'planned', 'completed') OR
            -- Assigned users can view their items
            assigned_to = auth.uid() OR
            -- Admins can view all
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

-- Policy: Admins can create improvements
CREATE POLICY "Admins can create improvements"
    ON improvement_backlog FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND ur.is_active = TRUE
            AND ur.is_deleted = FALSE
            AND r.role_name = 'system_admin'
        )
    );

-- Policy: Admins can update improvements
CREATE POLICY "Admins can update improvements"
    ON improvement_backlog FOR UPDATE
    USING (
        is_deleted = FALSE AND
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND ur.is_active = TRUE
            AND ur.is_deleted = FALSE
            AND r.role_name = 'system_admin'
        )
    );

-- Policy: Only admins can delete improvements
CREATE POLICY "Only admins can delete improvements"
    ON improvement_backlog FOR DELETE
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
COMMENT ON TABLE improvement_backlog IS 'Improvement backlog system for Phase 10';
COMMENT ON COLUMN improvement_backlog.improvement_type IS 'Type: bug_fix, performance, ux, feature_polish, documentation, accessibility, mobile, enhancement';
COMMENT ON COLUMN improvement_backlog.status IS 'Status: backlog, planned, in_progress, testing, completed, cancelled';
COMMENT ON COLUMN improvement_backlog.priority_score IS 'Calculated score: impact_score / effort_score (higher = higher priority)';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('improvement_backlog', 'Improvement backlog system for Phase 10', false, true, 'improvement')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

