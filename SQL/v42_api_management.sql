-- =====================================================================================
-- Phase 7: Integrations & API Development
-- Version: v42
-- Feature: API Management System
-- Description: RESTful API infrastructure with authentication, rate limiting, and logging
-- Author: Development Team
-- Date: 2025-11-18
-- =====================================================================================

-- =====================================================================================
-- Table: api_scopes
-- Description: Available API scopes for permission management
-- =====================================================================================
CREATE TABLE IF NOT EXISTS api_scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope_name VARCHAR(100) NOT NULL UNIQUE,
    scope_description TEXT,
    resource VARCHAR(100), -- projects, tasks, users, etc.
    actions TEXT[], -- read, write, delete
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
-- Table: api_keys
-- Description: API key management for external integrations
-- =====================================================================================
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_name VARCHAR(255) NOT NULL,
    api_key VARCHAR(255) NOT NULL UNIQUE, -- Will be encrypted in application
    api_secret VARCHAR(255), -- Will be encrypted in application
    project_id UUID REFERENCES projects(id), -- Optional, for project-scoped keys
    user_id UUID NOT NULL REFERENCES users(id),
    scope UUID[] DEFAULT '{}', -- Array of scope IDs
    rate_limit INTEGER DEFAULT 1000, -- Requests per minute
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP,
    last_used_at TIMESTAMP,

    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),

    CONSTRAINT api_key_name_unique UNIQUE (user_id, key_name)
);

-- =====================================================================================
-- Table: api_logs
-- Description: Comprehensive API request logging
-- =====================================================================================
CREATE TABLE IF NOT EXISTS api_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID REFERENCES api_keys(id),
    endpoint VARCHAR(500) NOT NULL,
    method VARCHAR(10) NOT NULL, -- GET, POST, PUT, DELETE, PATCH
    request_body JSONB,
    response_code INTEGER,
    response_body JSONB,
    response_time_ms INTEGER,
    ip_address INET,
    user_agent TEXT,
    error_message TEXT,

    -- Standard audit fields (created_at only for logs)
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- =====================================================================================
-- Table: api_rate_limits
-- Description: Rate limiting tracking per API key and endpoint
-- =====================================================================================
CREATE TABLE IF NOT EXISTS api_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID NOT NULL REFERENCES api_keys(id),
    endpoint VARCHAR(500),
    request_count INTEGER DEFAULT 0,
    window_start TIMESTAMP NOT NULL,
    window_end TIMESTAMP NOT NULL,

    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),

    CONSTRAINT unique_rate_limit_window UNIQUE (api_key_id, endpoint, window_start)
);

-- =====================================================================================
-- Indexes for Performance
-- =====================================================================================
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_project_id ON api_keys(project_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_api_key ON api_keys(api_key) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_api_logs_api_key_id ON api_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint ON api_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_logs_response_code ON api_logs(response_code);

CREATE INDEX IF NOT EXISTS idx_api_rate_limits_api_key_id ON api_rate_limits(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_window ON api_rate_limits(window_start, window_end);

CREATE INDEX IF NOT EXISTS idx_api_scopes_scope_name ON api_scopes(scope_name) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_api_scopes_resource ON api_scopes(resource) WHERE is_deleted = false;

-- =====================================================================================
-- Row Level Security (RLS) Policies
-- =====================================================================================

-- Enable RLS on all tables
ALTER TABLE api_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

-- API Scopes policies (Admin only)
CREATE POLICY api_scopes_admin_all ON api_scopes
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

-- API Keys policies (Users can manage their own API keys)
CREATE POLICY api_keys_own_select ON api_keys
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() AND is_deleted = false);

CREATE POLICY api_keys_own_insert ON api_keys
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY api_keys_own_update ON api_keys
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid() AND is_deleted = false);

CREATE POLICY api_keys_admin_all ON api_keys
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

-- API Logs policies (Users can view their own logs, admins can view all)
CREATE POLICY api_logs_own_select ON api_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM api_keys ak
            WHERE ak.id = api_logs.api_key_id
            AND ak.user_id = auth.uid()
        )
    );

CREATE POLICY api_logs_admin_all ON api_logs
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

-- API Rate Limits policies (System managed)
CREATE POLICY api_rate_limits_system ON api_rate_limits
    FOR ALL
    TO authenticated
    USING (true);

-- =====================================================================================
-- Seed Data: API Scopes
-- =====================================================================================
INSERT INTO api_scopes (scope_name, scope_description, resource, actions, is_active)
VALUES
    ('projects:read', 'Read access to projects', 'projects', ARRAY['read'], true),
    ('projects:write', 'Write access to projects', 'projects', ARRAY['read', 'write'], true),
    ('projects:delete', 'Delete access to projects', 'projects', ARRAY['read', 'write', 'delete'], true),
    ('tasks:read', 'Read access to tasks', 'tasks', ARRAY['read'], true),
    ('tasks:write', 'Write access to tasks', 'tasks', ARRAY['read', 'write'], true),
    ('tasks:delete', 'Delete access to tasks', 'tasks', ARRAY['read', 'write', 'delete'], true),
    ('users:read', 'Read access to users', 'users', ARRAY['read'], true),
    ('users:write', 'Write access to users', 'users', ARRAY['read', 'write'], true),
    ('users:delete', 'Delete access to users', 'users', ARRAY['read', 'write', 'delete'], true),
    ('resources:read', 'Read access to resources', 'resources', ARRAY['read'], true),
    ('resources:write', 'Write access to resources', 'resources', ARRAY['read', 'write'], true),
    ('resources:delete', 'Delete access to resources', 'resources', ARRAY['read', 'write', 'delete'], true),
    ('issues:read', 'Read access to issues', 'issues', ARRAY['read'], true),
    ('issues:write', 'Write access to issues', 'issues', ARRAY['read', 'write'], true),
    ('issues:delete', 'Delete access to issues', 'issues', ARRAY['read', 'write', 'delete'], true),
    ('risks:read', 'Read access to risks', 'risks', ARRAY['read'], true),
    ('risks:write', 'Write access to risks', 'risks', ARRAY['read', 'write'], true),
    ('risks:delete', 'Delete access to risks', 'risks', ARRAY['read', 'write', 'delete'], true),
    ('portfolios:read', 'Read access to portfolios', 'portfolios', ARRAY['read'], true),
    ('portfolios:write', 'Write access to portfolios', 'portfolios', ARRAY['read', 'write'], true),
    ('programmes:read', 'Read access to programmes', 'programmes', ARRAY['read'], true),
    ('programmes:write', 'Write access to programmes', 'programmes', ARRAY['read', 'write'], true)
ON CONFLICT (scope_name) DO NOTHING;

-- =====================================================================================
-- Register tables in database_tables registry
-- =====================================================================================
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('api_scopes', 'Available API scopes for permission management', false, true),
    ('api_keys', 'API key management for external integrations', false, true),
    ('api_logs', 'Comprehensive API request logging', false, true),
    ('api_rate_limits', 'Rate limiting tracking per API key and endpoint', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    updated_at = NOW();

-- =====================================================================================
-- Comments for Documentation
-- =====================================================================================
COMMENT ON TABLE api_scopes IS 'Available API scopes for granular permission management';
COMMENT ON TABLE api_keys IS 'API keys for external integrations with rate limiting and scoping';
COMMENT ON TABLE api_logs IS 'Comprehensive logging of all API requests and responses';
COMMENT ON TABLE api_rate_limits IS 'Rate limiting tracking to prevent API abuse';

COMMENT ON COLUMN api_keys.api_key IS 'Public API key (will be encrypted in application layer)';
COMMENT ON COLUMN api_keys.api_secret IS 'Secret key for signature verification (encrypted)';
COMMENT ON COLUMN api_keys.scope IS 'Array of API scope IDs this key has access to';
COMMENT ON COLUMN api_keys.rate_limit IS 'Maximum requests per minute allowed for this key';

-- =====================================================================================
-- End of v42_api_management.sql
-- =====================================================================================
