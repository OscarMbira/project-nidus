-- =====================================================================================
-- Phase 7: Integrations & API Development
-- Version: v45
-- Feature: Jira Integration
-- Description: Bidirectional sync with Jira for issues, tasks, and project data
-- Author: Development Team
-- Date: 2025-11-18
-- =====================================================================================

-- =====================================================================================
-- Table: jira_connections
-- Description: Jira connection configurations
-- =====================================================================================
CREATE TABLE IF NOT EXISTS jira_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id),
    user_id UUID NOT NULL REFERENCES users(id),
    connection_name VARCHAR(255) NOT NULL,
    jira_url TEXT NOT NULL,
    jira_project_key VARCHAR(50) NOT NULL,
    jira_project_id VARCHAR(50),
    jira_email VARCHAR(255),
    api_token TEXT, -- Will be encrypted in application
    sync_direction VARCHAR(20) DEFAULT 'bidirectional', -- import, export, bidirectional
    sync_frequency VARCHAR(20) DEFAULT 'manual', -- manual, hourly, daily, real_time
    auto_sync BOOLEAN DEFAULT false,
    last_sync_at TIMESTAMP,
    next_sync_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,

    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),

    CONSTRAINT jira_connection_unique UNIQUE (project_id, jira_project_key)
);

-- =====================================================================================
-- Table: jira_sync_logs
-- Description: Jira synchronization history and status
-- =====================================================================================
CREATE TABLE IF NOT EXISTS jira_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jira_connection_id UUID NOT NULL REFERENCES jira_connections(id) ON DELETE CASCADE,
    sync_direction VARCHAR(20) NOT NULL, -- import, export, bidirectional
    sync_type VARCHAR(20) DEFAULT 'manual', -- manual, scheduled, webhook
    sync_status VARCHAR(20) DEFAULT 'in_progress', -- in_progress, success, failed, partial
    items_synced INTEGER DEFAULT 0,
    items_failed INTEGER DEFAULT 0,
    items_skipped INTEGER DEFAULT 0,
    sync_details JSONB, -- Detailed sync information
    error_log TEXT,

    -- Sync statistics
    sync_started_at TIMESTAMP DEFAULT NOW(),
    sync_completed_at TIMESTAMP,
    sync_duration_ms INTEGER,

    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- =====================================================================================
-- Table: jira_field_mappings
-- Description: Jira field mapping configurations
-- =====================================================================================
CREATE TABLE IF NOT EXISTS jira_field_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jira_connection_id UUID NOT NULL REFERENCES jira_connections(id) ON DELETE CASCADE,
    jira_field VARCHAR(100) NOT NULL,
    jira_field_type VARCHAR(50), -- string, number, date, array, object
    nidus_field VARCHAR(100) NOT NULL,
    nidus_table VARCHAR(100), -- tasks, issues, etc.
    mapping_direction VARCHAR(20) DEFAULT 'bidirectional', -- import, export, bidirectional
    transformation_rule JSONB, -- JSON rules for data transformation
    is_active BOOLEAN DEFAULT true,

    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),

    CONSTRAINT unique_jira_field_mapping UNIQUE (jira_connection_id, jira_field, nidus_field)
);

-- =====================================================================================
-- Table: jira_item_mappings
-- Description: Map Jira issues to Nidus tasks/issues
-- =====================================================================================
CREATE TABLE IF NOT EXISTS jira_item_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jira_connection_id UUID NOT NULL REFERENCES jira_connections(id) ON DELETE CASCADE,
    jira_issue_id VARCHAR(50) NOT NULL,
    jira_issue_key VARCHAR(50) NOT NULL,
    jira_issue_type VARCHAR(50),
    nidus_item_type VARCHAR(20), -- task, issue, user_story
    nidus_item_id UUID,
    last_synced_at TIMESTAMP,
    last_modified_at TIMESTAMP,
    sync_status VARCHAR(20), -- synced, conflict, error
    conflict_details JSONB, -- Information about sync conflicts
    nidus_checksum VARCHAR(64), -- MD5 hash for change detection
    jira_checksum VARCHAR(64), -- MD5 hash for change detection

    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),

    CONSTRAINT unique_jira_item UNIQUE (jira_connection_id, jira_issue_id)
);

-- =====================================================================================
-- Table: jira_webhooks
-- Description: Jira webhook configurations for real-time sync
-- =====================================================================================
CREATE TABLE IF NOT EXISTS jira_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jira_connection_id UUID NOT NULL REFERENCES jira_connections(id) ON DELETE CASCADE,
    webhook_id VARCHAR(100), -- Jira webhook ID
    webhook_url TEXT,
    webhook_secret VARCHAR(255), -- Will be encrypted
    events TEXT[], -- issue_created, issue_updated, etc.
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
-- Indexes for Performance
-- =====================================================================================
CREATE INDEX IF NOT EXISTS idx_jira_connections_project_id ON jira_connections(project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_jira_connections_user_id ON jira_connections(user_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_jira_connections_is_active ON jira_connections(is_active) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_jira_connections_next_sync ON jira_connections(next_sync_at) WHERE auto_sync = true AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_jira_sync_logs_connection_id ON jira_sync_logs(jira_connection_id);
CREATE INDEX IF NOT EXISTS idx_jira_sync_logs_created_at ON jira_sync_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jira_sync_logs_status ON jira_sync_logs(sync_status);

CREATE INDEX IF NOT EXISTS idx_jira_field_mappings_connection_id ON jira_field_mappings(jira_connection_id) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_jira_item_mappings_connection_id ON jira_item_mappings(jira_connection_id);
CREATE INDEX IF NOT EXISTS idx_jira_item_mappings_jira_issue_key ON jira_item_mappings(jira_issue_key);
CREATE INDEX IF NOT EXISTS idx_jira_item_mappings_nidus_item ON jira_item_mappings(nidus_item_type, nidus_item_id);
CREATE INDEX IF NOT EXISTS idx_jira_item_mappings_sync_status ON jira_item_mappings(sync_status);

CREATE INDEX IF NOT EXISTS idx_jira_webhooks_connection_id ON jira_webhooks(jira_connection_id) WHERE is_deleted = false;

-- =====================================================================================
-- Row Level Security (RLS) Policies
-- =====================================================================================

-- Enable RLS on all tables
ALTER TABLE jira_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE jira_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE jira_field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE jira_item_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE jira_webhooks ENABLE ROW LEVEL SECURITY;

-- Jira Connections policies
CREATE POLICY jira_connections_project_member ON jira_connections
    FOR SELECT
    TO authenticated
    USING (
        is_deleted = false AND (
            user_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM user_projects up
                WHERE up.project_id = jira_connections.project_id
                AND up.user_id = auth.uid()
                AND up.is_active = true
            )
        )
    );

CREATE POLICY jira_connections_own_insert ON jira_connections
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY jira_connections_own_update ON jira_connections
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid() AND is_deleted = false);

-- Jira Sync Logs policies
CREATE POLICY jira_sync_logs_select ON jira_sync_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM jira_connections jc
            WHERE jc.id = jira_sync_logs.jira_connection_id
            AND (jc.user_id = auth.uid() OR
                 EXISTS (
                     SELECT 1 FROM user_projects up
                     WHERE up.project_id = jc.project_id
                     AND up.user_id = auth.uid()
                 ))
        )
    );

-- Jira Field Mappings policies
CREATE POLICY jira_field_mappings_select ON jira_field_mappings
    FOR SELECT
    TO authenticated
    USING (
        is_deleted = false AND
        EXISTS (
            SELECT 1 FROM jira_connections jc
            WHERE jc.id = jira_field_mappings.jira_connection_id
            AND jc.user_id = auth.uid()
        )
    );

CREATE POLICY jira_field_mappings_own_modify ON jira_field_mappings
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM jira_connections jc
            WHERE jc.id = jira_field_mappings.jira_connection_id
            AND jc.user_id = auth.uid()
        )
    );

-- Jira Item Mappings policies
CREATE POLICY jira_item_mappings_select ON jira_item_mappings
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM jira_connections jc
            WHERE jc.id = jira_item_mappings.jira_connection_id
            AND (jc.user_id = auth.uid() OR
                 EXISTS (
                     SELECT 1 FROM user_projects up
                     WHERE up.project_id = jc.project_id
                     AND up.user_id = auth.uid()
                 ))
        )
    );

-- Jira Webhooks policies
CREATE POLICY jira_webhooks_select ON jira_webhooks
    FOR SELECT
    TO authenticated
    USING (
        is_deleted = false AND
        EXISTS (
            SELECT 1 FROM jira_connections jc
            WHERE jc.id = jira_webhooks.jira_connection_id
            AND jc.user_id = auth.uid()
        )
    );

-- =====================================================================================
-- Seed Data: Default Jira Field Mappings
-- Note: These are template mappings. Actual mappings are created per connection.
-- =====================================================================================

-- =====================================================================================
-- Register tables in database_tables registry
-- =====================================================================================
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('jira_connections', 'Jira connection configurations for project sync', false, true),
    ('jira_sync_logs', 'Jira synchronization history and status tracking', false, true),
    ('jira_field_mappings', 'Field mapping configurations between Jira and Nidus', false, true),
    ('jira_item_mappings', 'Mapping between Jira issues and Nidus items', false, true),
    ('jira_webhooks', 'Jira webhook configurations for real-time synchronization', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    updated_at = NOW();

-- =====================================================================================
-- Comments for Documentation
-- =====================================================================================
COMMENT ON TABLE jira_connections IS 'Jira connection configurations for bidirectional synchronization';
COMMENT ON TABLE jira_sync_logs IS 'Track Jira sync operations with detailed statistics and error logs';
COMMENT ON TABLE jira_field_mappings IS 'Define field mappings between Jira and Nidus for data transformation';
COMMENT ON TABLE jira_item_mappings IS 'Map Jira issues to Nidus tasks/issues for sync tracking';
COMMENT ON TABLE jira_webhooks IS 'Jira webhook configurations for real-time event notifications';

COMMENT ON COLUMN jira_connections.api_token IS 'Jira API token (encrypted in application layer)';
COMMENT ON COLUMN jira_connections.sync_direction IS 'Sync direction: import (Jira to Nidus), export (Nidus to Jira), bidirectional';
COMMENT ON COLUMN jira_item_mappings.conflict_details IS 'JSON details about sync conflicts when both sides are modified';
COMMENT ON COLUMN jira_item_mappings.nidus_checksum IS 'MD5 hash of Nidus item for change detection';
COMMENT ON COLUMN jira_item_mappings.jira_checksum IS 'MD5 hash of Jira issue for change detection';

-- =====================================================================================
-- End of v45_jira_integration.sql
-- =====================================================================================
