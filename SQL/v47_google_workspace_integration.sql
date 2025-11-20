-- =====================================================================================
-- Phase 7: Integrations & API Development
-- Version: v47
-- Feature: Google Workspace Integration
-- Description: Integration with Gmail, Google Calendar, and Google Drive
-- Author: Development Team
-- Date: 2025-11-18
-- =====================================================================================

-- =====================================================================================
-- Table: google_connections
-- Description: Google Workspace OAuth connection configurations
-- =====================================================================================
CREATE TABLE IF NOT EXISTS google_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    google_user_id VARCHAR(100),
    email VARCHAR(255),
    access_token TEXT, -- Will be encrypted in application
    refresh_token TEXT, -- Will be encrypted in application
    token_expires_at TIMESTAMP,
    connected_services TEXT[] DEFAULT '{}', -- gmail, calendar, drive
    is_active BOOLEAN DEFAULT true,

    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),

    CONSTRAINT one_google_connection_per_user UNIQUE (user_id)
);

-- =====================================================================================
-- Table: google_calendar_sync_logs
-- Description: Google Calendar synchronization logs
-- =====================================================================================
CREATE TABLE IF NOT EXISTS google_calendar_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    sync_direction VARCHAR(20), -- import, export, bidirectional
    sync_status VARCHAR(20) DEFAULT 'in_progress', -- in_progress, success, failed
    events_synced INTEGER DEFAULT 0,
    events_failed INTEGER DEFAULT 0,
    error_log TEXT,
    last_sync_at TIMESTAMP,

    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- =====================================================================================
-- Table: google_calendar_events
-- Description: Track synced Google Calendar events
-- =====================================================================================
CREATE TABLE IF NOT EXISTS google_calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    task_id UUID REFERENCES tasks(id),
    project_id UUID REFERENCES projects(id),
    google_event_id VARCHAR(255),
    calendar_id VARCHAR(255),
    event_summary VARCHAR(500),
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
-- Table: google_drive_files
-- Description: Track Google Drive files linked to projects/tasks
-- =====================================================================================
CREATE TABLE IF NOT EXISTS google_drive_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    project_id UUID REFERENCES projects(id),
    task_id UUID REFERENCES tasks(id),
    drive_file_id VARCHAR(255) NOT NULL,
    file_name VARCHAR(500),
    file_url TEXT,
    mime_type VARCHAR(100),
    file_size BIGINT,
    thumbnail_url TEXT,
    shared_with_team BOOLEAN DEFAULT false,

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
-- Table: gmail_notifications
-- Description: Gmail notification send history
-- =====================================================================================
CREATE TABLE IF NOT EXISTS gmail_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    project_id UUID REFERENCES projects(id),
    to_email VARCHAR(255) NOT NULL,
    subject VARCHAR(500),
    message_body TEXT,
    message_id VARCHAR(255), -- Gmail message ID
    thread_id VARCHAR(255), -- Gmail thread ID
    delivery_status VARCHAR(20) DEFAULT 'pending', -- pending, sent, failed
    error_message TEXT,
    sent_at TIMESTAMP,

    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- =====================================================================================
-- Indexes for Performance
-- =====================================================================================
CREATE INDEX IF NOT EXISTS idx_google_connections_user_id ON google_connections(user_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_google_connections_is_active ON google_connections(is_active) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_google_calendar_sync_logs_user_id ON google_calendar_sync_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_google_calendar_sync_logs_created_at ON google_calendar_sync_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_google_calendar_events_user_id ON google_calendar_events(user_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_google_calendar_events_task_id ON google_calendar_events(task_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_google_calendar_events_google_id ON google_calendar_events(google_event_id);

CREATE INDEX IF NOT EXISTS idx_google_drive_files_user_id ON google_drive_files(user_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_google_drive_files_project_id ON google_drive_files(project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_google_drive_files_task_id ON google_drive_files(task_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_google_drive_files_drive_id ON google_drive_files(drive_file_id);

CREATE INDEX IF NOT EXISTS idx_gmail_notifications_user_id ON gmail_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_gmail_notifications_project_id ON gmail_notifications(project_id);
CREATE INDEX IF NOT EXISTS idx_gmail_notifications_status ON gmail_notifications(delivery_status);
CREATE INDEX IF NOT EXISTS idx_gmail_notifications_created_at ON gmail_notifications(created_at DESC);

-- =====================================================================================
-- Row Level Security (RLS) Policies
-- =====================================================================================

-- Enable RLS on all tables
ALTER TABLE google_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_calendar_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_drive_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmail_notifications ENABLE ROW LEVEL SECURITY;

-- Google Connections policies (users can only access their own connection)
CREATE POLICY google_connections_own ON google_connections
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Google Calendar Sync Logs policies
CREATE POLICY google_calendar_sync_logs_own ON google_calendar_sync_logs
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Google Calendar Events policies
CREATE POLICY google_calendar_events_own ON google_calendar_events
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid() AND is_deleted = false)
    WITH CHECK (user_id = auth.uid());

-- Google Drive Files policies
CREATE POLICY google_drive_files_own_select ON google_drive_files
    FOR SELECT
    TO authenticated
    USING (
        is_deleted = false AND (
            user_id = auth.uid() OR
            shared_with_team = true
        )
    );

CREATE POLICY google_drive_files_own_modify ON google_drive_files
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid() AND is_deleted = false)
    WITH CHECK (user_id = auth.uid());

-- Gmail Notifications policies
CREATE POLICY gmail_notifications_own_select ON gmail_notifications
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- =====================================================================================
-- Register tables in database_tables registry
-- =====================================================================================
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('google_connections', 'Google Workspace OAuth connection configurations per user', false, true),
    ('google_calendar_sync_logs', 'Google Calendar synchronization logs', false, true),
    ('google_calendar_events', 'Synced calendar events between Google Calendar and Nidus', false, true),
    ('google_drive_files', 'Google Drive files linked to projects and tasks', false, true),
    ('gmail_notifications', 'Gmail notification send history', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    updated_at = NOW();

-- =====================================================================================
-- Comments for Documentation
-- =====================================================================================
COMMENT ON TABLE google_connections IS 'Google Workspace OAuth connections for Gmail, Calendar, and Drive integration';
COMMENT ON TABLE google_calendar_sync_logs IS 'Log Google Calendar synchronization operations';
COMMENT ON TABLE google_calendar_events IS 'Track calendar events synced between Google Calendar and Nidus';
COMMENT ON TABLE google_drive_files IS 'Track Google Drive files linked to projects and tasks';
COMMENT ON TABLE gmail_notifications IS 'Track Gmail notifications sent from the system';

COMMENT ON COLUMN google_connections.access_token IS 'OAuth 2.0 access token (encrypted in application layer)';
COMMENT ON COLUMN google_connections.refresh_token IS 'OAuth 2.0 refresh token (encrypted in application layer)';
COMMENT ON COLUMN google_connections.connected_services IS 'Array of connected services: gmail, calendar, drive';

-- =====================================================================================
-- End of v47_google_workspace_integration.sql
-- =====================================================================================
