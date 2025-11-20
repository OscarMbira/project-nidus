-- =====================================================================================
-- Phase 8: Security Hardening & Compliance Module
-- Version: v52
-- Feature: Advanced Audit Logging
-- Description: Comprehensive audit event log, audit settings, data access logs, and retention policies
-- Author: Development Team
-- Date: 2025-11-18
-- =====================================================================================

-- Prerequisites:
-- - v01 through v51 must be run first
-- - users table must exist

-- =====================================================================================
-- Table: audit_events
-- Description: Comprehensive audit event log
-- =====================================================================================
CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL, -- login, logout, create, update, delete, view, export, etc.
    event_category VARCHAR(50) NOT NULL, -- authentication, authorization, data_access, configuration
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'critical')) DEFAULT 'info',
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    impersonated_by UUID REFERENCES users(id) ON DELETE SET NULL, -- If user was impersonated
    resource_type VARCHAR(100), -- project, task, user, etc.
    resource_id UUID,
    action VARCHAR(100),
    before_state JSONB, -- State before change
    after_state JSONB, -- State after change
    changes JSONB, -- Specific fields changed
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    request_id VARCHAR(255),
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    metadata JSONB,

    -- Standard audit fields (created_at, created_by only - audit events are immutable)
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_audit_events_user_id ON audit_events(user_id);
CREATE INDEX idx_audit_events_event_type ON audit_events(event_type);
CREATE INDEX idx_audit_events_event_category ON audit_events(event_category);
CREATE INDEX idx_audit_events_severity ON audit_events(severity);
CREATE INDEX idx_audit_events_resource ON audit_events(resource_type, resource_id);
CREATE INDEX idx_audit_events_created_at ON audit_events(created_at DESC);
CREATE INDEX idx_audit_events_success ON audit_events(success) WHERE success = false;

COMMENT ON TABLE audit_events IS 'Comprehensive audit event log for all system operations';
COMMENT ON COLUMN audit_events.event_category IS 'Event category: authentication, authorization, data_access, configuration';
COMMENT ON COLUMN audit_events.severity IS 'Event severity: info, warning, critical';
COMMENT ON COLUMN audit_events.impersonated_by IS 'User ID if current user is impersonated';

-- =====================================================================================
-- Table: audit_settings
-- Description: Audit configuration
-- =====================================================================================
CREATE TABLE IF NOT EXISTS audit_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL UNIQUE,
    log_level VARCHAR(20) NOT NULL CHECK (log_level IN ('none', 'basic', 'detailed')) DEFAULT 'basic',
    retention_days INTEGER DEFAULT 365,
    alert_on_event BOOLEAN DEFAULT false,
    alert_recipients TEXT[], -- Array of email addresses
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

CREATE INDEX idx_audit_settings_event_type ON audit_settings(event_type) WHERE is_deleted = false;
CREATE INDEX idx_audit_settings_is_active ON audit_settings(is_active) WHERE is_active = true;

COMMENT ON TABLE audit_settings IS 'Audit configuration for event types';
COMMENT ON COLUMN audit_settings.log_level IS 'Logging level: none, basic, detailed';

-- =====================================================================================
-- Table: data_access_logs
-- Description: Track data access (GDPR requirement)
-- =====================================================================================
CREATE TABLE IF NOT EXISTS data_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data_subject_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Whose data was accessed
    access_type VARCHAR(50) NOT NULL CHECK (access_type IN ('view', 'export', 'delete')),
    data_category VARCHAR(100), -- personal_info, financial, health, etc.
    purpose TEXT, -- Why data was accessed
    ip_address INET,

    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_data_access_logs_user_id ON data_access_logs(user_id);
CREATE INDEX idx_data_access_logs_data_subject_id ON data_access_logs(data_subject_id);
CREATE INDEX idx_data_access_logs_access_type ON data_access_logs(access_type);
CREATE INDEX idx_data_access_logs_created_at ON data_access_logs(created_at DESC);

COMMENT ON TABLE data_access_logs IS 'Track data access for GDPR compliance';
COMMENT ON COLUMN data_access_logs.data_subject_id IS 'User whose personal data was accessed';

-- =====================================================================================
-- Table: audit_trail_retention
-- Description: Audit retention policies
-- =====================================================================================
CREATE TABLE IF NOT EXISTS audit_trail_retention (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_category VARCHAR(50) NOT NULL,
    retention_period_days INTEGER NOT NULL DEFAULT 365,
    archive_location TEXT, -- Where archived logs are stored
    is_active BOOLEAN DEFAULT true,

    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),

    CONSTRAINT uq_audit_trail_retention_category UNIQUE(event_category)
);

CREATE INDEX idx_audit_trail_retention_category ON audit_trail_retention(event_category) WHERE is_deleted = false;

COMMENT ON TABLE audit_trail_retention IS 'Audit log retention policies by category';

-- =====================================================================================
-- Row Level Security Policies
-- =====================================================================================

-- audit_events
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_audit_events_admin_all
    ON audit_events FOR ALL
    USING (EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.role_name = 'System Admin'
        AND ur.is_deleted = false
        AND r.is_deleted = false
    ));

CREATE POLICY policy_audit_events_user_own
    ON audit_events FOR SELECT
    USING (user_id = auth.uid());

-- audit_settings
ALTER TABLE audit_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_audit_settings_admin_all
    ON audit_settings FOR ALL
    USING (EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.role_name = 'System Admin'
        AND ur.is_deleted = false
        AND r.is_deleted = false
    ));

CREATE POLICY policy_audit_settings_auth_read
    ON audit_settings FOR SELECT
    USING (auth.role() = 'authenticated');

-- data_access_logs
ALTER TABLE data_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_data_access_logs_admin_all
    ON data_access_logs FOR ALL
    USING (EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.role_name = 'System Admin'
        AND ur.is_deleted = false
        AND r.is_deleted = false
    ));

CREATE POLICY policy_data_access_logs_own_read
    ON data_access_logs FOR SELECT
    USING (data_subject_id = auth.uid() OR user_id = auth.uid());

-- audit_trail_retention
ALTER TABLE audit_trail_retention ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_audit_trail_retention_admin_all
    ON audit_trail_retention FOR ALL
    USING (EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.role_name = 'System Admin'
        AND ur.is_deleted = false
        AND r.is_deleted = false
    ));

CREATE POLICY policy_audit_trail_retention_auth_read
    ON audit_trail_retention FOR SELECT
    USING (auth.role() = 'authenticated');

-- =====================================================================================
-- Register tables in database_tables
-- =====================================================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES 
    ('audit_events', 'Comprehensive audit event log for all system operations', true, true, 'system'),
    ('audit_settings', 'Audit configuration for event types', true, true, 'system'),
    ('data_access_logs', 'Track data access for GDPR compliance', true, true, 'system'),
    ('audit_trail_retention', 'Audit log retention policies by category', true, true, 'system')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- =====================================================================================
-- Verification
-- =====================================================================================

DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Advanced Audit Logging Tables Created';
    RAISE NOTICE '================================================';
    RAISE NOTICE '1. audit_events - Comprehensive event log';
    RAISE NOTICE '2. audit_settings - Audit configuration';
    RAISE NOTICE '3. data_access_logs - Data access tracking';
    RAISE NOTICE '4. audit_trail_retention - Retention policies';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'v52_advanced_audit_logging.sql completed successfully';
    RAISE NOTICE '================================================';
END $$;

