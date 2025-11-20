-- =====================================================================================
-- Phase 8: Security Hardening & Compliance Module
-- Version: v51
-- Feature: Single Sign-On (SSO) Integration
-- Description: SSO provider configurations, sessions, login logs, and identity mappings
-- Author: Development Team
-- Date: 2025-11-18
-- =====================================================================================

-- Prerequisites:
-- - v01 through v50 must be run first
-- - users and roles tables must exist

-- =====================================================================================
-- Table: sso_providers
-- Description: SSO provider configurations
-- =====================================================================================
CREATE TABLE IF NOT EXISTS sso_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name VARCHAR(255) NOT NULL UNIQUE,
    provider_type VARCHAR(50) NOT NULL CHECK (provider_type IN ('saml', 'oauth', 'oidc')),
    entity_id VARCHAR(255), -- For SAML
    sso_url TEXT NOT NULL, -- SAML SSO URL or OAuth authorize URL
    slo_url TEXT, -- SAML Single Logout URL
    certificate TEXT, -- Encrypted SAML certificate
    client_id VARCHAR(255), -- Encrypted OAuth client ID
    client_secret TEXT, -- Encrypted OAuth client secret
    scopes TEXT[], -- OAuth scopes
    attribute_mappings JSONB, -- Field mappings for user attributes
    is_active BOOLEAN DEFAULT true,
    auto_provision_users BOOLEAN DEFAULT false,
    default_role_id UUID REFERENCES roles(id),

    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

CREATE INDEX idx_sso_providers_provider_type ON sso_providers(provider_type) WHERE is_deleted = false;
CREATE INDEX idx_sso_providers_is_active ON sso_providers(is_active) WHERE is_active = true AND is_deleted = false;

COMMENT ON TABLE sso_providers IS 'SSO provider configurations for SAML, OAuth, and OIDC';
COMMENT ON COLUMN sso_providers.provider_type IS 'SSO protocol type: saml, oauth, oidc';
COMMENT ON COLUMN sso_providers.auto_provision_users IS 'Automatically create users on first SSO login';

-- =====================================================================================
-- Table: sso_sessions
-- Description: SSO session tracking
-- =====================================================================================
CREATE TABLE IF NOT EXISTS sso_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES sso_providers(id) ON DELETE CASCADE,
    session_index VARCHAR(255), -- SAML session index
    name_id VARCHAR(255), -- SAML NameID
    access_token TEXT, -- Encrypted OAuth access token
    refresh_token TEXT, -- Encrypted OAuth refresh token
    token_expires_at TIMESTAMP,
    ip_address INET,
    user_agent TEXT,

    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sso_sessions_user_id ON sso_sessions(user_id);
CREATE INDEX idx_sso_sessions_provider_id ON sso_sessions(provider_id);
CREATE INDEX idx_sso_sessions_session_index ON sso_sessions(session_index) WHERE session_index IS NOT NULL;

COMMENT ON TABLE sso_sessions IS 'SSO session tracking for SAML and OAuth';

-- =====================================================================================
-- Table: sso_login_logs
-- Description: SSO login attempts
-- =====================================================================================
CREATE TABLE IF NOT EXISTS sso_login_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    provider_id UUID NOT NULL REFERENCES sso_providers(id) ON DELETE CASCADE,
    login_status VARCHAR(20) NOT NULL CHECK (login_status IN ('success', 'failed')),
    error_message TEXT,
    ip_address INET,
    user_agent TEXT,

    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sso_login_logs_user_id ON sso_login_logs(user_id);
CREATE INDEX idx_sso_login_logs_provider_id ON sso_login_logs(provider_id);
CREATE INDEX idx_sso_login_logs_status ON sso_login_logs(login_status);
CREATE INDEX idx_sso_login_logs_created_at ON sso_login_logs(created_at DESC);

COMMENT ON TABLE sso_login_logs IS 'SSO login attempt logs for security monitoring';

-- =====================================================================================
-- Table: user_identity_mappings
-- Description: Map external identities to users
-- =====================================================================================
CREATE TABLE IF NOT EXISTS user_identity_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES sso_providers(id) ON DELETE CASCADE,
    external_user_id VARCHAR(255) NOT NULL, -- External user identifier
    external_email VARCHAR(255),
    external_name VARCHAR(255),
    external_attributes JSONB,

    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),

    CONSTRAINT uq_user_identity_mappings_provider_external UNIQUE(provider_id, external_user_id)
);

CREATE INDEX idx_user_identity_mappings_user_id ON user_identity_mappings(user_id) WHERE is_deleted = false;
CREATE INDEX idx_user_identity_mappings_provider_id ON user_identity_mappings(provider_id) WHERE is_deleted = false;
CREATE INDEX idx_user_identity_mappings_external_user_id ON user_identity_mappings(provider_id, external_user_id);

COMMENT ON TABLE user_identity_mappings IS 'Map external SSO identities to internal users';

-- =====================================================================================
-- Row Level Security Policies
-- =====================================================================================

-- sso_providers
ALTER TABLE sso_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_sso_providers_admin_all
    ON sso_providers FOR ALL
    USING (EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.role_name = 'System Admin'
        AND ur.is_deleted = false
        AND r.is_deleted = false
    ));

CREATE POLICY policy_sso_providers_auth_read
    ON sso_providers FOR SELECT
    USING (is_active = true AND auth.role() = 'authenticated');

-- sso_sessions
ALTER TABLE sso_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_sso_sessions_own_all
    ON sso_sessions FOR ALL
    USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.role_name = 'System Admin'
        AND ur.is_deleted = false
        AND r.is_deleted = false
    ));

-- sso_login_logs
ALTER TABLE sso_login_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_sso_login_logs_own_read
    ON sso_login_logs FOR SELECT
    USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.role_name = 'System Admin'
        AND ur.is_deleted = false
        AND r.is_deleted = false
    ));

-- user_identity_mappings
ALTER TABLE user_identity_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_user_identity_mappings_own_all
    ON user_identity_mappings FOR ALL
    USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.role_name = 'System Admin'
        AND ur.is_deleted = false
        AND r.is_deleted = false
    ));

-- =====================================================================================
-- Register tables in database_tables
-- =====================================================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES 
    ('sso_providers', 'SSO provider configurations for SAML, OAuth, and OIDC', true, true, 'system'),
    ('sso_sessions', 'SSO session tracking for SAML and OAuth', true, true, 'system'),
    ('sso_login_logs', 'SSO login attempt logs for security monitoring', true, true, 'system'),
    ('user_identity_mappings', 'Map external SSO identities to internal users', true, true, 'system')
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
    RAISE NOTICE 'SSO Integration Tables Created';
    RAISE NOTICE '================================================';
    RAISE NOTICE '1. sso_providers - Provider configurations';
    RAISE NOTICE '2. sso_sessions - Session tracking';
    RAISE NOTICE '3. sso_login_logs - Login logs';
    RAISE NOTICE '4. user_identity_mappings - Identity mappings';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'v51_sso_integration.sql completed successfully';
    RAISE NOTICE '================================================';
END $$;

