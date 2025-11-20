-- ================================================
-- File: v63_support_tickets.sql
-- Description: Support ticket system for Phase 10
-- Version: 1.0
-- Date: 2025-01-XX
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Purpose:
-- Creates support ticket system for Phase 10 Launch & Support module
-- Allows users to create support tickets and support team to manage them

-- ================================================
-- TABLE: support_tickets
-- Description: Support ticket submissions
-- Category: support
-- ================================================

CREATE TABLE IF NOT EXISTS support_tickets (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Ticket Information
    ticket_number VARCHAR(20) UNIQUE NOT NULL,  -- Auto-generated: TKT-YYYYMMDD-XXXXX
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    
    -- Classification
    ticket_type VARCHAR(50) DEFAULT 'general',  -- 'general', 'technical', 'billing', 'feature', 'bug', 'account'
    category VARCHAR(50),  -- Sub-category based on type
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',  -- 'low', 'medium', 'high', 'critical'
    severity VARCHAR(20) DEFAULT 'medium',  -- 'low', 'medium', 'high', 'critical'
    status VARCHAR(20) NOT NULL DEFAULT 'new',  -- 'new', 'open', 'assigned', 'in_progress', 'waiting_customer', 'resolved', 'closed'
    
    -- User Information
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    
    -- Assignment
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP,
    
    -- Resolution
    resolution TEXT,
    resolved_at TIMESTAMP,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    closed_at TIMESTAMP,
    closed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- SLA Tracking
    first_response_at TIMESTAMP,
    first_response_by UUID REFERENCES users(id) ON DELETE SET NULL,
    first_response_time INTEGER,  -- Minutes
    resolution_time INTEGER,  -- Minutes
    response_time_sla_minutes INTEGER,  -- Target response time based on priority
    resolution_time_sla_minutes INTEGER,  -- Target resolution time based on priority
    
    -- Context
    page_url VARCHAR(500),
    browser_info TEXT,
    device_info TEXT,
    screenshot_url TEXT,
    related_ticket_id UUID REFERENCES support_tickets(id) ON DELETE SET NULL,
    
    -- Related Items
    related_bug_id UUID REFERENCES bugs(id) ON DELETE SET NULL,
    related_feedback_id UUID REFERENCES user_feedback(id) ON DELETE SET NULL,
    related_feature_request_id UUID REFERENCES feature_requests(id) ON DELETE SET NULL,
    
    -- Internal Notes
    internal_notes TEXT,  -- Admin-only notes
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- ================================================
-- TABLE: support_ticket_comments
-- Description: Comments and updates on support tickets
-- Category: support
-- ================================================

CREATE TABLE IF NOT EXISTS support_ticket_comments (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Comment Information
    comment_text TEXT NOT NULL,
    comment_type VARCHAR(20) DEFAULT 'comment',  -- 'comment', 'status_change', 'assignment', 'resolution', 'internal_note', 'system'
    
    -- Parent Comment (for replies/threading)
    parent_comment_id UUID REFERENCES support_ticket_comments(id) ON DELETE CASCADE,
    
    -- Status
    is_internal BOOLEAN DEFAULT FALSE,  -- Internal notes not visible to users
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Attachments (if applicable)
    attachment_urls TEXT[],
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- ================================================
-- TABLE: support_ticket_attachments
-- Description: File attachments for support tickets
-- Category: support
-- ================================================

CREATE TABLE IF NOT EXISTS support_ticket_attachments (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES support_ticket_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Attachment Information
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT,  -- Bytes
    file_type VARCHAR(100),  -- MIME type
    storage_path TEXT,  -- Storage bucket path
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON support_tickets(assigned_to) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_support_tickets_type ON support_tickets(ticket_type) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_support_tickets_status_priority ON support_tickets(status, priority) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_support_tickets_ticket_number ON support_tickets(ticket_number);

CREATE INDEX IF NOT EXISTS idx_support_ticket_comments_ticket_id ON support_ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_comments_user_id ON support_ticket_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_comments_created_at ON support_ticket_comments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_ticket_attachments_ticket_id ON support_ticket_attachments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_attachments_comment_id ON support_ticket_attachments(comment_id);

-- Function to generate ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
    v_date VARCHAR(8);
    v_sequence INTEGER;
    v_ticket_number VARCHAR(20);
BEGIN
    -- Format: TKT-YYYYMMDD-XXXXX
    v_date := TO_CHAR(NOW(), 'YYYYMMDD');
    
    -- Get sequence number for today
    SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 14) AS INTEGER)), 0) + 1
    INTO v_sequence
    FROM support_tickets
    WHERE ticket_number LIKE 'TKT-' || v_date || '-%';
    
    v_ticket_number := 'TKT-' || v_date || '-' || LPAD(v_sequence::TEXT, 5, '0');
    
    -- Set the ticket number on NEW record
    NEW.ticket_number := v_ticket_number;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to set SLA times based on priority
CREATE OR REPLACE FUNCTION set_ticket_sla()
RETURNS TRIGGER AS $$
BEGIN
    -- Set SLA targets based on priority
    CASE NEW.priority
        WHEN 'critical' THEN
            NEW.response_time_sla_minutes := 60;  -- 1 hour
            NEW.resolution_time_sla_minutes := 1440;  -- 24 hours
        WHEN 'high' THEN
            NEW.response_time_sla_minutes := 240;  -- 4 hours
            NEW.resolution_time_sla_minutes := 10080;  -- 7 days
        WHEN 'medium' THEN
            NEW.response_time_sla_minutes := 1440;  -- 24 hours
            NEW.resolution_time_sla_minutes := 43200;  -- 30 days
        WHEN 'low' THEN
            NEW.response_time_sla_minutes := 2880;  -- 48 hours
            NEW.resolution_time_sla_minutes := 129600;  -- 90 days
    END CASE;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS trg_support_tickets_before_insert ON support_tickets;
CREATE TRIGGER trg_support_tickets_before_insert
    BEFORE INSERT ON support_tickets
    FOR EACH ROW
    WHEN (NEW.ticket_number IS NULL)
    EXECUTE FUNCTION generate_ticket_number();

DROP TRIGGER IF EXISTS trg_support_tickets_set_sla_insert ON support_tickets;
CREATE TRIGGER trg_support_tickets_set_sla_insert
    BEFORE INSERT ON support_tickets
    FOR EACH ROW
    WHEN (NEW.priority IS NOT NULL AND NEW.response_time_sla_minutes IS NULL)
    EXECUTE FUNCTION set_ticket_sla();

DROP TRIGGER IF EXISTS trg_support_tickets_set_sla_update ON support_tickets;
CREATE TRIGGER trg_support_tickets_set_sla_update
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW
    WHEN (NEW.priority IS NOT NULL AND (NEW.response_time_sla_minutes IS NULL OR OLD.priority IS DISTINCT FROM NEW.priority))
    EXECUTE FUNCTION set_ticket_sla();

DROP TRIGGER IF EXISTS trg_support_tickets_before_insert_audit ON support_tickets;
CREATE TRIGGER trg_support_tickets_before_insert_audit
    BEFORE INSERT ON support_tickets
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_support_tickets_before_update_audit ON support_tickets;
CREATE TRIGGER trg_support_tickets_before_update_audit
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

DROP TRIGGER IF EXISTS trg_support_ticket_comments_before_insert ON support_ticket_comments;
CREATE TRIGGER trg_support_ticket_comments_before_insert
    BEFORE INSERT ON support_ticket_comments
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

DROP TRIGGER IF EXISTS trg_support_ticket_comments_before_update ON support_ticket_comments;
CREATE TRIGGER trg_support_ticket_comments_before_update
    BEFORE UPDATE ON support_ticket_comments
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- RLS Policies
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_attachments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own tickets, admins can view all
CREATE POLICY "Users can view their tickets"
    ON support_tickets FOR SELECT
    USING (
        is_deleted = FALSE AND
        (
            user_id = auth.uid() OR
            assigned_to = auth.uid() OR
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid()
                AND ur.is_active = TRUE
                AND ur.is_deleted = FALSE
                AND r.role_name IN ('system_admin', 'project_manager')
            )
        )
    );

-- Policy: Users can create tickets
CREATE POLICY "Users can create tickets"
    ON support_tickets FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND
        user_id = auth.uid()
    );

-- Policy: Users can update their tickets, admins can update all
CREATE POLICY "Users can update their tickets"
    ON support_tickets FOR UPDATE
    USING (
        is_deleted = FALSE AND
        (
            user_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid()
                AND ur.is_active = TRUE
                AND ur.is_deleted = FALSE
                AND r.role_name IN ('system_admin', 'project_manager')
            )
        )
    );

-- Policy: Only admins can delete tickets
CREATE POLICY "Only admins can delete tickets"
    ON support_tickets FOR DELETE
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

-- Policy: Users can view comments on their tickets
CREATE POLICY "Users can view ticket comments"
    ON support_ticket_comments FOR SELECT
    USING (
        NOT is_deleted AND
        (
            -- Public comments
            (NOT is_internal AND EXISTS (
                SELECT 1 FROM support_tickets
                WHERE id = ticket_id
                AND (user_id = auth.uid() OR assigned_to = auth.uid())
            )) OR
            -- Internal comments for admins
            (is_internal AND EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid()
                AND ur.is_active = TRUE
                AND ur.is_deleted = FALSE
                AND r.role_name IN ('system_admin', 'project_manager')
            )) OR
            -- Own comments
            user_id = auth.uid()
        )
    );

-- Policy: Users can comment on their tickets
CREATE POLICY "Users can comment on tickets"
    ON support_ticket_comments FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND
        (
            user_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM support_tickets
                WHERE id = ticket_id
                AND (user_id = auth.uid() OR assigned_to = auth.uid())
            ) OR
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid()
                AND ur.is_active = TRUE
                AND ur.is_deleted = FALSE
                AND r.role_name IN ('system_admin', 'project_manager')
            )
        )
    );

-- Policy: Users can view attachments on their tickets
CREATE POLICY "Users can view ticket attachments"
    ON support_ticket_attachments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM support_tickets
            WHERE id = ticket_id
            AND (user_id = auth.uid() OR assigned_to = auth.uid())
            AND NOT is_deleted
        ) OR
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND ur.is_active = TRUE
            AND ur.is_deleted = FALSE
            AND r.role_name IN ('system_admin', 'project_manager')
        )
    );

-- Policy: Users can attach files to their tickets
CREATE POLICY "Users can attach files to tickets"
    ON support_ticket_attachments FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND
        (
            user_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM support_tickets
                WHERE id = ticket_id
                AND (user_id = auth.uid() OR assigned_to = auth.uid())
            ) OR
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid()
                AND ur.is_active = TRUE
                AND ur.is_deleted = FALSE
                AND r.role_name IN ('system_admin', 'project_manager')
            )
        )
    );

-- Comments
COMMENT ON TABLE support_tickets IS 'Support ticket system for Phase 10';
COMMENT ON TABLE support_ticket_comments IS 'Comments and updates on support tickets';
COMMENT ON TABLE support_ticket_attachments IS 'File attachments for support tickets';
COMMENT ON COLUMN support_tickets.status IS 'Status: new, open, assigned, in_progress, waiting_customer, resolved, closed';
COMMENT ON COLUMN support_tickets.priority IS 'Priority: low, medium, high, critical';
COMMENT ON COLUMN support_tickets.ticket_type IS 'Type: general, technical, billing, feature, bug, account';

-- Register tables
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES 
    ('support_tickets', 'Support ticket system for Phase 10', false, true, 'support'),
    ('support_ticket_comments', 'Comments and updates on support tickets', false, true, 'support'),
    ('support_ticket_attachments', 'File attachments for support tickets', false, true, 'support')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

