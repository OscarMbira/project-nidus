-- =====================================================================================
-- Phase 7: Integrations & API Development
-- Version: v46
-- Feature: Microsoft 365 Integration
-- Description: Integration with Microsoft Teams, Outlook, and Calendar
-- Author: Development Team
-- Date: 2025-11-18
-- =====================================================================================

-- =====================================================================================
-- Table: microsoft365_connections
-- Description: Microsoft 365 OAuth connection configurations
-- =====================================================================================
CREATE TABLE IF NOT EXISTS microsoft365_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    tenant_id VARCHAR(100),
    access_token TEXT, -- Will be encrypted in application
    refresh_token TEXT, -- Will be encrypted in application
    token_expires_at TIMESTAMP,
    connected_services TEXT[] DEFAULT '{}', -- teams, outlook, calendar, onedrive
    is_active BOOLEAN DEFAULT true,

    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),

    CONSTRAINT one_connection_per_user UNIQUE (user_id)
);

-- =====================================================================================
-- Table: teams_notifications
-- Description: Microsoft Teams notification history
-- =====================================================================================
CREATE TABLE IF NOT EXISTS teams_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    project_id UUID REFERENCES projects(id),
    channel_id VARCHAR(255),
    channel_name VARCHAR(255),
    team_id VARCHAR(255),
    message TEXT NOT NULL,
    message_type VARCHAR(50), -- text, adaptive_card
    notification_type VARCHAR(50), -- task_assigned, issue_created, etc.
    delivery_status VARCHAR(20) DEFAULT 'pending', -- pending, sent, failed
    teams_message_id VARCHAR(255), -- ID returned by Teams
    error_message TEXT,
    sent_at TIMESTAMP,

    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- =====================================================================================
-- Table: outlook_sync_logs
-- Description: Outlook email and calendar synchronization logs
-- =====================================================================================
CREATE TABLE IF NOT EXISTS outlook_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    sync_type VARCHAR(20) NOT NULL, -- email, calendar, contacts
    sync_direction VARCHAR(20), -- import, export, bidirectional
    sync_status VARCHAR(20) DEFAULT 'in_progress', -- in_progress, success, failed
    items_synced INTEGER DEFAULT 0,
    items_failed INTEGER DEFAULT 0,
    error_log TEXT,
    last_sync_at TIMESTAMP,

    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- =====================================================================================
-- Table: outlook_calendar_events
-- Description: Track synced calendar events
-- =====================================================================================
CREATE TABLE IF NOT EXISTS outlook_calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    task_id UUID REFERENCES tasks(id),
    project_id UUID REFERENCES projects(id),
    outlook_event_id VARCHAR(255),
    event_subject VARCHAR(500),
    event_start TIMESTAMP,
    event_end TIMESTAMP,
    sync_status VARCHAR(20), -- synced, conflict, error
    last_synced_at TIMESTAMP,

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
-- Indexes for Performance
-- =====================================================================================
CREATE INDEX IF NOT EXISTS idx_microsoft365_connections_user_id ON microsoft365_connections(user_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_microsoft365_connections_is_active ON microsoft365_connections(is_active) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_teams_notifications_user_id ON teams_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_teams_notifications_project_id ON teams_notifications(project_id);
CREATE INDEX IF NOT EXISTS idx_teams_notifications_status ON teams_notifications(delivery_status);
CREATE INDEX IF NOT EXISTS idx_teams_notifications_created_at ON teams_notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_outlook_sync_logs_user_id ON outlook_sync_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_outlook_sync_logs_sync_type ON outlook_sync_logs(sync_type);
CREATE INDEX IF NOT EXISTS idx_outlook_sync_logs_created_at ON outlook_sync_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_outlook_calendar_events_user_id ON outlook_calendar_events(user_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_outlook_calendar_events_task_id ON outlook_calendar_events(task_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_outlook_calendar_events_outlook_id ON outlook_calendar_events(outlook_event_id);

-- =====================================================================================
-- Row Level Security (RLS) Policies
-- =====================================================================================

-- Enable RLS on all tables
ALTER TABLE microsoft365_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlook_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlook_calendar_events ENABLE ROW LEVEL SECURITY;

-- Microsoft 365 Connections policies (users can only access their own connection)
CREATE POLICY microsoft365_connections_own ON microsoft365_connections
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Teams Notifications policies
CREATE POLICY teams_notifications_own_select ON teams_notifications
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Outlook Sync Logs policies
CREATE POLICY outlook_sync_logs_own ON outlook_sync_logs
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Outlook Calendar Events policies
CREATE POLICY outlook_calendar_events_own ON outlook_calendar_events
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid() AND is_deleted = false)
    WITH CHECK (user_id = auth.uid());

-- =====================================================================================
-- Register tables in database_tables registry
-- =====================================================================================
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('microsoft365_connections', 'Microsoft 365 OAuth connection configurations per user', false, true),
    ('teams_notifications', 'Microsoft Teams notification delivery history', false, true),
    ('outlook_sync_logs', 'Outlook email and calendar synchronization logs', false, true),
    ('outlook_calendar_events', 'Synced calendar events between Outlook and Nidus', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    updated_at = NOW();

-- =====================================================================================
-- Comments for Documentation
-- =====================================================================================
COMMENT ON TABLE microsoft365_connections IS 'Microsoft 365 OAuth connections for Teams, Outlook, and Calendar integration';
COMMENT ON TABLE teams_notifications IS 'Track Microsoft Teams notifications sent from the system';
COMMENT ON TABLE outlook_sync_logs IS 'Log Outlook synchronization operations for email and calendar';
COMMENT ON TABLE outlook_calendar_events IS 'Track calendar events synced between Outlook and Nidus';

COMMENT ON COLUMN microsoft365_connections.access_token IS 'OAuth 2.0 access token (encrypted in application layer)';
COMMENT ON COLUMN microsoft365_connections.refresh_token IS 'OAuth 2.0 refresh token (encrypted in application layer)';
COMMENT ON COLUMN microsoft365_connections.connected_services IS 'Array of connected services: teams, outlook, calendar, onedrive';

-- =====================================================================================
-- End of v46_microsoft365_integration.sql
-- =====================================================================================
