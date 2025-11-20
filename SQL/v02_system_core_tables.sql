-- ================================================
-- File: v02_system_core_tables.sql
-- Description: System core tables for Project Nidus (8 tables)
-- Version: 1.0
-- Date: 2025-11-15
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - v01_extensions_and_functions.sql must be run first
-- - Extension uuid-ossp must be enabled
-- - Trigger functions must exist

-- Purpose:
-- Creates 8 system core tables that provide system-level functionality:
-- 1. database_tables - Central registry of all database tables
-- 2. audit_trails - System-wide audit log
-- 3. session_logs - User session tracking
-- 4. system_settings - System configuration
-- 5. email_templates - Email notification templates
-- 6. notifications - User notification queue
-- 7. activity_logs - Activity feed
-- 8. error_logs - Error tracking

-- ================================================
-- TABLE 1: database_tables
-- Description: Central registry of all database tables in the system
-- Category: system
-- ================================================

CREATE TABLE database_tables (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Table Information
    table_name VARCHAR(100) UNIQUE NOT NULL,
    table_description TEXT NOT NULL,
    schema_name VARCHAR(100) DEFAULT 'public',

    -- Classification
    is_system_table BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    table_category VARCHAR(50),  -- 'system', 'user', 'project', 'structured', 'scrum', 'kanban', etc.

    -- Metadata
    row_count_estimate BIGINT,
    last_analyzed_at TIMESTAMP,

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID,  -- NULL initially (no users table yet)
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID
);

-- Indexes
CREATE UNIQUE INDEX idx_database_tables_name_unique ON database_tables(table_name) WHERE is_deleted = FALSE;
CREATE INDEX idx_database_tables_category ON database_tables(table_category) WHERE is_deleted = FALSE;
CREATE INDEX idx_database_tables_is_system ON database_tables(is_system_table) WHERE is_deleted = FALSE;
CREATE INDEX idx_database_tables_is_active ON database_tables(is_active) WHERE is_deleted = FALSE;

-- Triggers
CREATE TRIGGER trg_database_tables_before_insert
    BEFORE INSERT ON database_tables
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

CREATE TRIGGER trg_database_tables_before_update
    BEFORE UPDATE ON database_tables
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE database_tables IS 'Central registry of all database tables in the system for documentation and metadata management';
COMMENT ON COLUMN database_tables.table_name IS 'Physical table name in database (must be unique)';
COMMENT ON COLUMN database_tables.table_description IS 'Human-readable description of table purpose';
COMMENT ON COLUMN database_tables.is_system_table IS 'TRUE if this is a system/infrastructure table, FALSE for application tables';
COMMENT ON COLUMN database_tables.table_category IS 'Category: system, user, project, structured, scrum, kanban, cross-cutting, resource, financial';
COMMENT ON COLUMN database_tables.row_count_estimate IS 'Estimated row count (updated periodically)';

-- Self-register database_tables table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('database_tables', 'Central registry of all database tables in the system', true, true, 'system')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 2: audit_trails
-- Description: System-wide audit log for all table changes
-- Category: system
-- ================================================

CREATE TABLE audit_trails (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- What Changed
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    operation VARCHAR(20) NOT NULL,  -- 'INSERT', 'UPDATE', 'DELETE'

    -- Who Changed It
    user_id UUID,  -- Will reference users(id) after users table is created
    user_email VARCHAR(255),

    -- When Changed
    changed_at TIMESTAMP DEFAULT NOW(),

    -- What Was Changed
    old_values JSONB,  -- Previous values (for UPDATE/DELETE)
    new_values JSONB,  -- New values (for INSERT/UPDATE)
    changed_fields TEXT[],  -- Array of field names that changed

    -- Context
    ip_address INET,
    user_agent TEXT,
    session_id UUID,

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_audit_trails_table_name ON audit_trails(table_name);
CREATE INDEX idx_audit_trails_record_id ON audit_trails(record_id);
CREATE INDEX idx_audit_trails_user_id ON audit_trails(user_id);
CREATE INDEX idx_audit_trails_changed_at ON audit_trails(changed_at DESC);
CREATE INDEX idx_audit_trails_operation ON audit_trails(operation);
CREATE INDEX idx_audit_trails_table_record ON audit_trails(table_name, record_id);

-- Triggers (only INSERT trigger - audit records are never updated)
CREATE TRIGGER trg_audit_trails_before_insert
    BEFORE INSERT ON audit_trails
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

-- Comments
COMMENT ON TABLE audit_trails IS 'System-wide audit log tracking all data changes for compliance and debugging';
COMMENT ON COLUMN audit_trails.operation IS 'Type of operation: INSERT, UPDATE, or DELETE';
COMMENT ON COLUMN audit_trails.old_values IS 'JSONB snapshot of record values before change (for UPDATE/DELETE)';
COMMENT ON COLUMN audit_trails.new_values IS 'JSONB snapshot of record values after change (for INSERT/UPDATE)';
COMMENT ON COLUMN audit_trails.changed_fields IS 'Array of field names that changed (for UPDATE operations)';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('audit_trails', 'System-wide audit log tracking all data changes for compliance and debugging', true, true, 'system')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 3: session_logs
-- Description: User session tracking and management
-- Category: system
-- ================================================

CREATE TABLE session_logs (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- User Information
    user_id UUID,  -- Will reference users(id) after users table is created
    user_email VARCHAR(255),

    -- Session Details
    session_token UUID UNIQUE NOT NULL,
    refresh_token UUID,

    -- Session Lifecycle
    started_at TIMESTAMP DEFAULT NOW(),
    last_activity_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP,

    -- Session Context
    ip_address INET,
    user_agent TEXT,
    device_type VARCHAR(50),  -- 'desktop', 'mobile', 'tablet'
    browser VARCHAR(100),
    operating_system VARCHAR(100),
    location_country VARCHAR(100),
    location_city VARCHAR(100),

    -- Session Status
    is_active BOOLEAN DEFAULT TRUE,
    logout_reason VARCHAR(100),  -- 'user_logout', 'timeout', 'forced', 'expired'

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_session_logs_user_id ON session_logs(user_id);
CREATE UNIQUE INDEX idx_session_logs_session_token ON session_logs(session_token);
CREATE INDEX idx_session_logs_started_at ON session_logs(started_at DESC);
CREATE INDEX idx_session_logs_is_active ON session_logs(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_session_logs_last_activity ON session_logs(last_activity_at DESC);

-- Triggers
CREATE TRIGGER trg_session_logs_before_insert
    BEFORE INSERT ON session_logs
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

-- Comments
COMMENT ON TABLE session_logs IS 'User session tracking and management for security and analytics';
COMMENT ON COLUMN session_logs.session_token IS 'Unique session identifier';
COMMENT ON COLUMN session_logs.last_activity_at IS 'Last user activity timestamp for timeout detection';
COMMENT ON COLUMN session_logs.logout_reason IS 'Reason session ended: user_logout, timeout, forced, expired';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('session_logs', 'User session tracking and management for security and analytics', true, true, 'system')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 4: system_settings
-- Description: System-wide configuration settings
-- Category: system
-- ================================================

CREATE TABLE system_settings (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Setting Identification
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_name VARCHAR(200) NOT NULL,
    setting_description TEXT,

    -- Setting Value
    setting_value TEXT,
    setting_value_type VARCHAR(50) DEFAULT 'string',  -- 'string', 'number', 'boolean', 'json'
    default_value TEXT,

    -- Setting Metadata
    setting_category VARCHAR(100),  -- 'security', 'email', 'notifications', 'ui', etc.
    is_public BOOLEAN DEFAULT FALSE,  -- Can non-admins see this?
    is_editable BOOLEAN DEFAULT TRUE,  -- Can this be changed via UI?

    -- Validation
    validation_regex VARCHAR(500),
    allowed_values TEXT[],  -- Array of allowed values (for enums)

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID,  -- Will reference users(id)
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID
);

-- Indexes
CREATE UNIQUE INDEX idx_system_settings_key_unique ON system_settings(setting_key) WHERE is_deleted = FALSE;
CREATE INDEX idx_system_settings_category ON system_settings(setting_category) WHERE is_deleted = FALSE;
CREATE INDEX idx_system_settings_is_public ON system_settings(is_public) WHERE is_deleted = FALSE;

-- Triggers
CREATE TRIGGER trg_system_settings_before_insert
    BEFORE INSERT ON system_settings
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

CREATE TRIGGER trg_system_settings_before_update
    BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE system_settings IS 'System-wide configuration settings';
COMMENT ON COLUMN system_settings.setting_key IS 'Unique key for programmatic access (e.g., session_timeout_minutes)';
COMMENT ON COLUMN system_settings.is_public IS 'Whether non-admin users can view this setting';
COMMENT ON COLUMN system_settings.is_editable IS 'Whether this setting can be changed via UI (FALSE for system-critical settings)';
COMMENT ON COLUMN system_settings.allowed_values IS 'Array of allowed values for enum-type settings';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('system_settings', 'System-wide configuration settings', true, true, 'system')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 5: email_templates
-- Description: Email notification templates
-- Category: system
-- ================================================

CREATE TABLE email_templates (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Template Identification
    template_code VARCHAR(100) UNIQUE NOT NULL,
    template_name VARCHAR(200) NOT NULL,
    template_description TEXT,

    -- Template Content
    subject_template TEXT NOT NULL,
    body_template_html TEXT NOT NULL,
    body_template_text TEXT,

    -- Template Variables
    available_variables TEXT[],  -- ['{{user_name}}', '{{project_name}}', etc.]

    -- Template Metadata
    template_category VARCHAR(100),  -- 'user', 'project', 'system', 'notification', etc.
    language_code VARCHAR(10) DEFAULT 'en',

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID,  -- Will reference users(id)
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID
);

-- Indexes
CREATE UNIQUE INDEX idx_email_templates_code_unique ON email_templates(template_code) WHERE is_deleted = FALSE;
CREATE INDEX idx_email_templates_category ON email_templates(template_category) WHERE is_deleted = FALSE;
CREATE INDEX idx_email_templates_language ON email_templates(language_code) WHERE is_deleted = FALSE;

-- Triggers
CREATE TRIGGER trg_email_templates_before_insert
    BEFORE INSERT ON email_templates
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

CREATE TRIGGER trg_email_templates_before_update
    BEFORE UPDATE ON email_templates
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE email_templates IS 'Email notification templates with variable substitution support';
COMMENT ON COLUMN email_templates.template_code IS 'Unique code for programmatic access (e.g., user_welcome, project_created)';
COMMENT ON COLUMN email_templates.available_variables IS 'Array of variable placeholders available in this template';
COMMENT ON COLUMN email_templates.body_template_html IS 'HTML version of email body (required)';
COMMENT ON COLUMN email_templates.body_template_text IS 'Plain text version of email body (optional)';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('email_templates', 'Email notification templates with variable substitution support', true, true, 'system')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 6: notifications
-- Description: User notification queue and history
-- Category: system
-- ================================================

CREATE TABLE notifications (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Recipient
    user_id UUID,  -- Will reference users(id)

    -- Notification Content
    notification_type VARCHAR(100) NOT NULL,  -- 'info', 'success', 'warning', 'error'
    notification_category VARCHAR(100),  -- 'project', 'task', 'system', 'user', etc.
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,

    -- Related Entities
    related_entity_type VARCHAR(100),  -- 'project', 'task', 'user', etc.
    related_entity_id UUID,

    -- Delivery
    delivery_method VARCHAR(50) DEFAULT 'in_app',  -- 'in_app', 'email', 'both'
    email_template_id UUID,  -- Will reference email_templates(id)

    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP,

    -- Actions
    action_url VARCHAR(500),
    action_label VARCHAR(100),

    -- Metadata
    priority INTEGER DEFAULT 1,  -- 1=low, 2=medium, 3=high, 4=urgent
    expires_at TIMESTAMP,

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID,  -- Will reference users(id)
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID
);

-- Indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read) WHERE is_read = FALSE AND is_deleted = FALSE;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_priority ON notifications(priority DESC);
CREATE INDEX idx_notifications_type ON notifications(notification_type);
CREATE INDEX idx_notifications_category ON notifications(notification_category);

-- Triggers
CREATE TRIGGER trg_notifications_before_insert
    BEFORE INSERT ON notifications
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

-- Comments
COMMENT ON TABLE notifications IS 'User notification queue and history for in-app and email notifications';
COMMENT ON COLUMN notifications.is_read IS 'Whether user has read the notification';
COMMENT ON COLUMN notifications.delivery_method IS 'How to deliver: in_app, email, or both';
COMMENT ON COLUMN notifications.priority IS 'Priority level: 1=low, 2=medium, 3=high, 4=urgent';
COMMENT ON COLUMN notifications.action_url IS 'Optional URL for action button (e.g., /projects/123)';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('notifications', 'User notification queue and history for in-app and email notifications', true, true, 'system')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 7: activity_logs
-- Description: User activity feed and timeline
-- Category: system
-- ================================================

CREATE TABLE activity_logs (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Actor
    user_id UUID,  -- Will reference users(id)
    user_name VARCHAR(200),

    -- Activity
    activity_type VARCHAR(100) NOT NULL,  -- 'created', 'updated', 'deleted', 'commented', etc.
    activity_category VARCHAR(100),  -- 'project', 'task', 'document', 'user', etc.
    activity_description TEXT NOT NULL,

    -- Target Entity
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    entity_name VARCHAR(200),

    -- Parent Entity (optional, for hierarchical activities)
    parent_entity_type VARCHAR(100),
    parent_entity_id UUID,
    parent_entity_name VARCHAR(200),

    -- Project Context (if applicable)
    project_id UUID,  -- Will reference projects(id)

    -- Metadata
    metadata JSONB,
    ip_address INET,

    -- Timestamp
    occurred_at TIMESTAMP DEFAULT NOW(),

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_project_id ON activity_logs(project_id);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_occurred_at ON activity_logs(occurred_at DESC);
CREATE INDEX idx_activity_logs_activity_type ON activity_logs(activity_type);
CREATE INDEX idx_activity_logs_activity_category ON activity_logs(activity_category);

-- Triggers
CREATE TRIGGER trg_activity_logs_before_insert
    BEFORE INSERT ON activity_logs
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

-- Comments
COMMENT ON TABLE activity_logs IS 'User activity feed and timeline for tracking user actions across the system';
COMMENT ON COLUMN activity_logs.entity_type IS 'Type of entity affected (project, task, document, etc.)';
COMMENT ON COLUMN activity_logs.parent_entity_type IS 'Optional parent entity for hierarchical activities (e.g., task parent is project)';
COMMENT ON COLUMN activity_logs.metadata IS 'JSONB for additional activity-specific data';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('activity_logs', 'User activity feed and timeline for tracking user actions across the system', true, true, 'system')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- TABLE 8: error_logs
-- Description: Application error tracking and debugging
-- Category: system
-- ================================================

CREATE TABLE error_logs (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Error Information
    error_code VARCHAR(100),
    error_message TEXT NOT NULL,
    error_type VARCHAR(100),  -- 'validation', 'database', 'api', 'auth', 'network', etc.
    error_severity VARCHAR(50) DEFAULT 'error',  -- 'warning', 'error', 'critical'

    -- Error Context
    stack_trace TEXT,
    request_url TEXT,
    request_method VARCHAR(10),  -- 'GET', 'POST', 'PUT', 'DELETE', etc.
    request_body JSONB,

    -- User Context
    user_id UUID,  -- Will reference users(id)
    user_email VARCHAR(255),
    session_id UUID,

    -- Technical Context
    ip_address INET,
    user_agent TEXT,
    browser VARCHAR(100),
    operating_system VARCHAR(100),

    -- Resolution
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP,
    resolved_by UUID,  -- Will reference users(id)
    resolution_notes TEXT,

    -- Timestamp
    occurred_at TIMESTAMP DEFAULT NOW(),

    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_error_logs_error_type ON error_logs(error_type);
CREATE INDEX idx_error_logs_error_severity ON error_logs(error_severity);
CREATE INDEX idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX idx_error_logs_occurred_at ON error_logs(occurred_at DESC);
CREATE INDEX idx_error_logs_is_resolved ON error_logs(is_resolved) WHERE is_resolved = FALSE;
CREATE INDEX idx_error_logs_error_code ON error_logs(error_code);

-- Triggers
CREATE TRIGGER trg_error_logs_before_insert
    BEFORE INSERT ON error_logs
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

-- Comments
COMMENT ON TABLE error_logs IS 'Application error tracking and debugging for monitoring and troubleshooting';
COMMENT ON COLUMN error_logs.error_severity IS 'Severity level: warning, error, or critical';
COMMENT ON COLUMN error_logs.stack_trace IS 'Full error stack trace for debugging';
COMMENT ON COLUMN error_logs.is_resolved IS 'Whether the error has been investigated and resolved';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('error_logs', 'Application error tracking and debugging for monitoring and troubleshooting', true, true, 'system')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
DECLARE
    v_table_count INTEGER;
BEGIN
    -- Count system core tables
    SELECT COUNT(*)
    INTO v_table_count
    FROM database_tables
    WHERE table_category = 'system'
      AND is_deleted = FALSE;

    -- Verify all 8 tables are registered
    IF v_table_count < 8 THEN
        RAISE EXCEPTION 'Expected 8 system tables, found %', v_table_count;
    END IF;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'System Core Tables Created: %', v_table_count;
    RAISE NOTICE '================================================';
    RAISE NOTICE '1. database_tables - Table registry';
    RAISE NOTICE '2. audit_trails - Audit log';
    RAISE NOTICE '3. session_logs - Session tracking';
    RAISE NOTICE '4. system_settings - System configuration';
    RAISE NOTICE '5. email_templates - Email templates';
    RAISE NOTICE '6. notifications - User notifications';
    RAISE NOTICE '7. activity_logs - Activity feed';
    RAISE NOTICE '8. error_logs - Error tracking';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'v02_system_core_tables.sql completed successfully';
    RAISE NOTICE '================================================';
END $$;

-- ================================================
-- END OF FILE
-- ================================================

-- Next Steps:
-- Run v03_user_access_tables.sql to create user and access management tables
