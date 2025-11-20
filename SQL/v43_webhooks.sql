-- =====================================================================================
-- Phase 7: Integrations & API Development
-- Version: v43
-- Feature: Webhook System
-- Description: Event-driven webhook system with retry logic and delivery tracking
-- Author: Development Team
-- Date: 2025-11-18
-- =====================================================================================

-- =====================================================================================
-- Table: webhook_events
-- Description: Available webhook event types
-- =====================================================================================
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name VARCHAR(100) NOT NULL UNIQUE,
    event_description TEXT,
    event_category VARCHAR(50), -- project, task, issue, risk, user, etc.
    payload_schema JSONB, -- JSON schema for validation
    is_active BOOLEAN DEFAULT true,

    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- =====================================================================================
-- Table: webhooks
-- Description: Webhook endpoint configurations
-- =====================================================================================
CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    user_id UUID NOT NULL REFERENCES users(id),
    webhook_name VARCHAR(255) NOT NULL,
    webhook_url TEXT NOT NULL,
    secret_key VARCHAR(255), -- For signature verification (will be encrypted)
    events TEXT[] DEFAULT '{}', -- Array of event names to subscribe to
    is_active BOOLEAN DEFAULT true,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    timeout_seconds INTEGER DEFAULT 30,
    headers JSONB, -- Custom headers to send

    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),

    CONSTRAINT webhook_name_unique UNIQUE (user_id, webhook_name)
);

-- =====================================================================================
-- Table: webhook_logs
-- Description: Webhook delivery logs and status
-- =====================================================================================
CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    response_code INTEGER,
    response_body TEXT,
    delivery_status VARCHAR(20) DEFAULT 'pending', -- pending, success, failed, retrying
    attempt_count INTEGER DEFAULT 0,
    next_retry_at TIMESTAMP,
    delivered_at TIMESTAMP,
    error_message TEXT,
    request_duration_ms INTEGER,

    -- Standard audit fields (created_at only for logs)
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- =====================================================================================
-- Indexes for Performance
-- =====================================================================================
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_name ON webhook_events(event_name) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_webhook_events_category ON webhook_events(event_category) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_webhooks_project_id ON webhooks(project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON webhooks(user_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_webhooks_is_active ON webhooks(is_active) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_webhooks_events ON webhooks USING gin(events);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id ON webhook_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON webhook_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_delivery_status ON webhook_logs(delivery_status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_next_retry ON webhook_logs(next_retry_at) WHERE delivery_status = 'retrying';

-- =====================================================================================
-- Row Level Security (RLS) Policies
-- =====================================================================================

-- Enable RLS on all tables
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Webhook Events policies (Admin only)
CREATE POLICY webhook_events_select ON webhook_events
    FOR SELECT
    TO authenticated
    USING (is_deleted = false);

CREATE POLICY webhook_events_admin_all ON webhook_events
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_name IN ('System Administrator', 'Superuser')
            AND ur.is_active = true
            AND r.is_active = true
        )
    );

-- Webhooks policies (Users can manage their own webhooks)
CREATE POLICY webhooks_own_select ON webhooks
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() AND is_deleted = false);

CREATE POLICY webhooks_own_insert ON webhooks
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY webhooks_own_update ON webhooks
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid() AND is_deleted = false);

CREATE POLICY webhooks_own_delete ON webhooks
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY webhooks_admin_all ON webhooks
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_name IN ('System Administrator', 'Superuser')
            AND ur.is_active = true
            AND r.is_active = true
        )
    );

-- Webhook Logs policies (Users can view their own webhook logs)
CREATE POLICY webhook_logs_own_select ON webhook_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM webhooks w
            WHERE w.id = webhook_logs.webhook_id
            AND w.user_id = auth.uid()
        )
    );

CREATE POLICY webhook_logs_admin_all ON webhook_logs
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_name IN ('System Administrator', 'Superuser')
            AND ur.is_active = true
            AND r.is_active = true
        )
    );

-- =====================================================================================
-- Seed Data: Webhook Events
-- =====================================================================================
INSERT INTO webhook_events (event_name, event_description, event_category, is_active)
VALUES
    -- Project Events
    ('project.created', 'Triggered when a new project is created', 'project', true),
    ('project.updated', 'Triggered when a project is updated', 'project', true),
    ('project.deleted', 'Triggered when a project is deleted', 'project', true),
    ('project.status_changed', 'Triggered when project status changes', 'project', true),

    -- Task Events
    ('task.created', 'Triggered when a new task is created', 'task', true),
    ('task.updated', 'Triggered when a task is updated', 'task', true),
    ('task.deleted', 'Triggered when a task is deleted', 'task', true),
    ('task.assigned', 'Triggered when a task is assigned to someone', 'task', true),
    ('task.completed', 'Triggered when a task is completed', 'task', true),
    ('task.status_changed', 'Triggered when task status changes', 'task', true),

    -- Issue Events
    ('issue.created', 'Triggered when a new issue is created', 'issue', true),
    ('issue.updated', 'Triggered when an issue is updated', 'issue', true),
    ('issue.resolved', 'Triggered when an issue is resolved', 'issue', true),
    ('issue.escalated', 'Triggered when an issue is escalated', 'issue', true),
    ('issue.assigned', 'Triggered when an issue is assigned', 'issue', true),

    -- Risk Events
    ('risk.created', 'Triggered when a new risk is identified', 'risk', true),
    ('risk.updated', 'Triggered when a risk is updated', 'risk', true),
    ('risk.status_changed', 'Triggered when risk status changes', 'risk', true),
    ('risk.mitigated', 'Triggered when a risk is mitigated', 'risk', true),

    -- User Events
    ('user.created', 'Triggered when a new user is created', 'user', true),
    ('user.updated', 'Triggered when a user profile is updated', 'user', true),
    ('user.role_changed', 'Triggered when user role changes', 'user', true),

    -- Resource Events
    ('resource.allocated', 'Triggered when a resource is allocated', 'resource', true),
    ('resource.deallocated', 'Triggered when a resource is deallocated', 'resource', true),

    -- Milestone Events
    ('milestone.reached', 'Triggered when a milestone is reached', 'milestone', true),
    ('milestone.missed', 'Triggered when a milestone is missed', 'milestone', true),

    -- Sprint Events (Scrum)
    ('sprint.started', 'Triggered when a sprint starts', 'sprint', true),
    ('sprint.completed', 'Triggered when a sprint is completed', 'sprint', true),

    -- Comment Events
    ('comment.created', 'Triggered when a comment is added', 'comment', true)
ON CONFLICT (event_name) DO NOTHING;

-- =====================================================================================
-- Function: Trigger webhook delivery (to be called by application)
-- =====================================================================================
CREATE OR REPLACE FUNCTION trigger_webhook_delivery(
    p_event_type VARCHAR,
    p_payload JSONB,
    p_project_id UUID DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    v_webhook RECORD;
BEGIN
    -- Find all active webhooks subscribed to this event
    FOR v_webhook IN
        SELECT id, webhook_url, secret_key, max_retries
        FROM webhooks
        WHERE is_active = true
        AND is_deleted = false
        AND (project_id = p_project_id OR project_id IS NULL)
        AND p_event_type = ANY(events)
    LOOP
        -- Create webhook log entry
        INSERT INTO webhook_logs (
            webhook_id,
            event_type,
            payload,
            delivery_status,
            attempt_count,
            next_retry_at
        ) VALUES (
            v_webhook.id,
            p_event_type,
            p_payload,
            'pending',
            0,
            NOW()
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================================
-- Register tables in database_tables registry
-- =====================================================================================
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('webhook_events', 'Available webhook event types for subscriptions', false, true),
    ('webhooks', 'Webhook endpoint configurations for event notifications', false, true),
    ('webhook_logs', 'Webhook delivery logs and status tracking', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    updated_at = NOW();

-- =====================================================================================
-- Comments for Documentation
-- =====================================================================================
COMMENT ON TABLE webhook_events IS 'Available webhook event types that can be subscribed to';
COMMENT ON TABLE webhooks IS 'Webhook configurations for receiving real-time event notifications';
COMMENT ON TABLE webhook_logs IS 'Delivery logs for webhook events with retry tracking';

COMMENT ON COLUMN webhooks.secret_key IS 'Secret key for HMAC signature verification (encrypted in app)';
COMMENT ON COLUMN webhooks.events IS 'Array of event names this webhook is subscribed to';
COMMENT ON COLUMN webhooks.max_retries IS 'Maximum number of retry attempts for failed deliveries';

COMMENT ON FUNCTION trigger_webhook_delivery IS 'Trigger webhook delivery for a specific event (called by application)';

-- =====================================================================================
-- End of v43_webhooks.sql
-- =====================================================================================
