-- =====================================================
-- Integrations Module
-- Version: 29
-- Date: 2025-01-XX
-- Description: Database tables for third-party integrations (MS Project, Jira, GitHub, etc.)
-- =====================================================

-- =====================================================
-- 1. Integrations Table
-- =====================================================
CREATE TABLE IF NOT EXISTS integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Integration Information
    integration_name VARCHAR(255) NOT NULL,
    integration_type VARCHAR(50) NOT NULL, -- ms_project, jira, github, gitlab, slack, teams, etc.
    integration_description TEXT,
    
    -- Connection Configuration (Encrypted JSONB)
    connection_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Example for Jira: {"url": "https://company.atlassian.net", "username": "user@example.com", "api_token": "encrypted"}
    -- Example for GitHub: {"base_url": "https://api.github.com", "token": "encrypted", "owner": "company", "repo": "project"}
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_connected BOOLEAN DEFAULT false,
    last_connection_test_at TIMESTAMP WITH TIME ZONE,
    last_connection_test_status VARCHAR(50), -- success, failed, timeout
    last_connection_test_error TEXT,
    
    -- Sync Configuration
    sync_enabled BOOLEAN DEFAULT false,
    sync_direction VARCHAR(50) DEFAULT 'bidirectional', -- unidirectional_in, unidirectional_out, bidirectional
    sync_frequency_minutes INTEGER DEFAULT 60,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    next_sync_at TIMESTAMP WITH TIME ZONE,
    sync_count INTEGER DEFAULT 0,
    sync_error_count INTEGER DEFAULT 0,
    last_sync_error TEXT,
    
    -- Mapping Configuration (JSONB)
    field_mappings JSONB DEFAULT '{}'::jsonb, -- Field mappings between systems
    -- Example: {"project_name": "summary", "status": "status.name", "priority": "priority.name"}
    
    -- Filter Configuration (JSONB)
    sync_filters JSONB DEFAULT '{}'::jsonb, -- Filters for what to sync
    -- Example: {"projects": ["PROJ-1", "PROJ-2"], "statuses": ["In Progress", "Done"]}
    
    -- Webhook Configuration (for incoming updates)
    webhook_url TEXT,
    webhook_secret VARCHAR(255),
    webhook_enabled BOOLEAN DEFAULT false,
    webhook_verified BOOLEAN DEFAULT false,
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT integrations_type_check CHECK (integration_type IN (
        'ms_project', 'jira', 'github', 'gitlab', 'slack', 'teams', 
        'azure_devops', 'trello', 'asana', 'google_calendar', 'outlook_calendar', 'custom'
    )),
    CONSTRAINT integrations_sync_direction_check CHECK (sync_direction IN (
        'unidirectional_in', 'unidirectional_out', 'bidirectional'
    ))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_integrations_type ON integrations(integration_type) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_integrations_active ON integrations(is_active, is_connected) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_integrations_sync ON integrations(sync_enabled, next_sync_at) WHERE is_deleted = false AND sync_enabled = true;

-- =====================================================
-- 2. Integration Sync Log Table
-- =====================================================
CREATE TABLE IF NOT EXISTS integration_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    
    -- Sync Details
    sync_type VARCHAR(50) NOT NULL, -- full, incremental, manual, webhook
    sync_direction VARCHAR(50) NOT NULL, -- in, out, bidirectional
    sync_status VARCHAR(50) NOT NULL DEFAULT 'running', -- running, completed, failed, cancelled
    
    -- Sync Statistics
    items_synced INTEGER DEFAULT 0,
    items_created INTEGER DEFAULT 0,
    items_updated INTEGER DEFAULT 0,
    items_deleted INTEGER DEFAULT 0,
    items_failed INTEGER DEFAULT 0,
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER, -- Duration in milliseconds
    
    -- Error Information
    error_message TEXT,
    error_details JSONB, -- Detailed error information
    
    -- Sync Summary (JSONB)
    sync_summary JSONB DEFAULT '{}'::jsonb,
    -- Example: {"projects": 5, "tasks": 120, "issues": 15}
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT integration_sync_log_type_check CHECK (sync_type IN ('full', 'incremental', 'manual', 'webhook')),
    CONSTRAINT integration_sync_log_direction_check CHECK (sync_direction IN ('in', 'out', 'bidirectional')),
    CONSTRAINT integration_sync_log_status_check CHECK (sync_status IN ('running', 'completed', 'failed', 'cancelled'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_integration_sync_log_integration ON integration_sync_log(integration_id, started_at DESC) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_integration_sync_log_status ON integration_sync_log(sync_status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_integration_sync_log_started_at ON integration_sync_log(started_at DESC) WHERE is_deleted = false;

-- =====================================================
-- 3. External Item Mappings Table
-- =====================================================
CREATE TABLE IF NOT EXISTS external_item_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    
    -- External System Information
    external_system VARCHAR(50) NOT NULL, -- jira, github, ms_project, etc.
    external_item_type VARCHAR(50) NOT NULL, -- issue, task, project, epic, story, etc.
    external_item_id VARCHAR(255) NOT NULL, -- ID in external system
    external_item_key VARCHAR(255), -- Key in external system (e.g., PROJ-123)
    external_item_url TEXT, -- URL to item in external system
    
    -- Internal System Information
    internal_item_type VARCHAR(50) NOT NULL, -- task, project, issue, user_story, etc.
    internal_item_id UUID NOT NULL, -- ID in our system
    
    -- Mapping Metadata
    mapping_status VARCHAR(50) DEFAULT 'active', -- active, deleted, conflict, error
    last_synced_at TIMESTAMP WITH TIME ZONE,
    sync_direction VARCHAR(50), -- in, out, bidirectional
    
    -- Conflict Resolution
    conflict_detected BOOLEAN DEFAULT false,
    conflict_resolution VARCHAR(50), -- external_wins, internal_wins, manual, merged
    conflict_details JSONB,
    
    -- Sync Metadata (JSONB)
    sync_metadata JSONB DEFAULT '{}'::jsonb,
    -- Example: {"last_external_update": "2025-01-01T00:00:00Z", "last_internal_update": "2025-01-01T00:00:00Z"}
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT external_item_mappings_status_check CHECK (mapping_status IN ('active', 'deleted', 'conflict', 'error')),
    CONSTRAINT external_item_mappings_direction_check CHECK (sync_direction IS NULL OR sync_direction IN ('in', 'out', 'bidirectional')),
    CONSTRAINT external_item_mappings_resolution_check CHECK (conflict_resolution IS NULL OR conflict_resolution IN ('external_wins', 'internal_wins', 'manual', 'merged')),
    CONSTRAINT external_item_mappings_unique UNIQUE (integration_id, external_system, external_item_type, external_item_id, is_deleted)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_external_item_mappings_integration ON external_item_mappings(integration_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_external_item_mappings_external ON external_item_mappings(external_system, external_item_type, external_item_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_external_item_mappings_internal ON external_item_mappings(internal_item_type, internal_item_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_external_item_mappings_status ON external_item_mappings(mapping_status) WHERE is_deleted = false AND mapping_status = 'conflict';

-- =====================================================
-- 4. Integration Webhooks Table
-- =====================================================
CREATE TABLE IF NOT EXISTS integration_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    
    -- Webhook Information
    webhook_event_type VARCHAR(100) NOT NULL, -- issue.created, issue.updated, task.completed, etc.
    webhook_payload JSONB NOT NULL, -- Incoming webhook payload
    
    -- Processing Status
    processing_status VARCHAR(50) DEFAULT 'pending', -- pending, processing, processed, failed, ignored
    processed_at TIMESTAMP WITH TIME ZONE,
    processing_error TEXT,
    
    -- Result
    items_created INTEGER DEFAULT 0,
    items_updated INTEGER DEFAULT 0,
    result_summary JSONB,
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT integration_webhooks_status_check CHECK (processing_status IN ('pending', 'processing', 'processed', 'failed', 'ignored'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_integration_webhooks_integration ON integration_webhooks(integration_id, created_at DESC) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_integration_webhooks_status ON integration_webhooks(processing_status) WHERE is_deleted = false AND processing_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_integration_webhooks_event ON integration_webhooks(webhook_event_type) WHERE is_deleted = false;

-- =====================================================
-- 5. Update Triggers
-- =====================================================

CREATE OR REPLACE FUNCTION update_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_integrations_updated_at
    BEFORE UPDATE ON integrations
    FOR EACH ROW
    EXECUTE FUNCTION update_integrations_updated_at();

CREATE TRIGGER trigger_integration_sync_log_updated_at
    BEFORE UPDATE ON integration_sync_log
    FOR EACH ROW
    EXECUTE FUNCTION update_integrations_updated_at();

CREATE TRIGGER trigger_external_item_mappings_updated_at
    BEFORE UPDATE ON external_item_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_integrations_updated_at();

CREATE TRIGGER trigger_integration_webhooks_updated_at
    BEFORE UPDATE ON integration_webhooks
    FOR EACH ROW
    EXECUTE FUNCTION update_integrations_updated_at();

-- =====================================================
-- 6. Register Tables in database_tables
-- =====================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES 
    ('integrations', 'Third-party integration configurations and connections', false, true, 'integration'),
    ('integration_sync_log', 'Integration synchronization history and logs', false, true, 'integration'),
    ('external_item_mappings', 'Mappings between external system items and internal items', false, true, 'integration'),
    ('integration_webhooks', 'Incoming webhook events from external systems', false, true, 'integration')
ON CONFLICT (table_name) 
DO UPDATE SET 
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    table_category = EXCLUDED.table_category,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- =====================================================
-- 7. Helper Functions
-- =====================================================

-- Function to calculate next sync time
CREATE OR REPLACE FUNCTION calculate_next_sync_time(
    p_integration_id UUID
)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
    v_sync_frequency INTEGER;
    v_last_sync TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT sync_frequency_minutes, last_sync_at
    INTO v_sync_frequency, v_last_sync
    FROM integrations
    WHERE id = p_integration_id AND is_deleted = false;
    
    IF v_sync_frequency IS NULL OR v_sync_frequency <= 0 THEN
        RETURN NULL;
    END IF;
    
    IF v_last_sync IS NULL THEN
        RETURN CURRENT_TIMESTAMP + (v_sync_frequency || ' minutes')::INTERVAL;
    END IF;
    
    RETURN v_last_sync + (v_sync_frequency || ' minutes')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Function to update integration sync status
CREATE OR REPLACE FUNCTION update_integration_sync_status(
    p_integration_id UUID,
    p_sync_status VARCHAR(50),
    p_items_synced INTEGER DEFAULT 0,
    p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE integrations
    SET 
        last_sync_at = CASE WHEN p_sync_status = 'completed' THEN CURRENT_TIMESTAMP ELSE last_sync_at END,
        next_sync_at = CASE WHEN p_sync_status = 'completed' THEN calculate_next_sync_time(p_integration_id) ELSE next_sync_at END,
        sync_count = CASE WHEN p_sync_status = 'completed' THEN sync_count + 1 ELSE sync_count END,
        sync_error_count = CASE WHEN p_sync_status = 'failed' THEN sync_error_count + 1 ELSE sync_error_count END,
        last_sync_error = p_error_message,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_integration_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. Comments
-- =====================================================

COMMENT ON TABLE integrations IS 'Third-party integration configurations (MS Project, Jira, GitHub, etc.)';
COMMENT ON TABLE integration_sync_log IS 'History of integration synchronization operations';
COMMENT ON TABLE external_item_mappings IS 'Mappings between external system items and internal system items';
COMMENT ON TABLE integration_webhooks IS 'Incoming webhook events from external systems for real-time updates';

COMMENT ON FUNCTION calculate_next_sync_time IS 'Calculates the next sync time for an integration based on frequency';
COMMENT ON FUNCTION update_integration_sync_status IS 'Updates integration sync status and statistics after sync operation';

