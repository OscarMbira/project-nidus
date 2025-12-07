-- ============================================================================
-- PM Simulator Enterprise Features
-- Version: v77
-- Description: White-label configuration, LMS integration, API management, SSO, custom branding
-- ============================================================================

-- White-Label Configuration
CREATE TABLE IF NOT EXISTS sim.white_label_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID, -- References corporate_licenses or custom organization table
    organization_name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    favicon_url TEXT,
    primary_color VARCHAR(7), -- Hex color code
    secondary_color VARCHAR(7),
    accent_color VARCHAR(7),
    font_family VARCHAR(100),
    custom_css TEXT,
    custom_domain VARCHAR(255),
    email_from_name VARCHAR(255),
    email_from_address VARCHAR(255),
    support_email VARCHAR(255),
    support_url TEXT,
    terms_url TEXT,
    privacy_url TEXT,
    footer_text TEXT,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LMS Integration Configurations
CREATE TABLE IF NOT EXISTS sim.lms_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID,
    lms_type VARCHAR(50) NOT NULL CHECK (lms_type IN ('scorm', 'xapi', 'lti', 'custom')),
    lms_name VARCHAR(255),
    api_endpoint TEXT,
    api_key TEXT, -- Encrypted
    api_secret TEXT, -- Encrypted
    consumer_key VARCHAR(255), -- For LTI
    shared_secret TEXT, -- Encrypted, for LTI
    scorm_version VARCHAR(20), -- '1.2' or '2004'
    xapi_endpoint TEXT,
    xapi_username VARCHAR(255),
    xapi_password TEXT, -- Encrypted
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_status VARCHAR(20) DEFAULT 'idle' CHECK (sync_status IN ('idle', 'syncing', 'error', 'success')),
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API Keys for Third-Party Access
CREATE TABLE IF NOT EXISTS sim.api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID,
    user_id UUID REFERENCES auth.users(id),
    key_name VARCHAR(255) NOT NULL,
    api_key VARCHAR(255) UNIQUE NOT NULL, -- Hashed
    api_secret VARCHAR(255), -- Hashed
    scopes JSONB DEFAULT '[]', -- Array of permission scopes
    rate_limit_per_minute INTEGER DEFAULT 60,
    rate_limit_per_hour INTEGER DEFAULT 1000,
    rate_limit_per_day INTEGER DEFAULT 10000,
    allowed_ips CIDR[], -- IP whitelist
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    usage_count BIGINT DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API Usage Logs
CREATE TABLE IF NOT EXISTS sim.api_usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    api_key_id UUID REFERENCES sim.api_keys(id),
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    request_body JSONB,
    response_status INTEGER,
    response_time_ms INTEGER,
    ip_address INET,
    user_agent TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SSO Configurations
CREATE TABLE IF NOT EXISTS sim.sso_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID,
    sso_type VARCHAR(50) NOT NULL CHECK (sso_type IN ('saml', 'oauth', 'oidc', 'ldap')),
    provider_name VARCHAR(255) NOT NULL,
    entity_id VARCHAR(255), -- For SAML
    sso_url TEXT, -- SAML SSO URL or OAuth authorize URL
    slo_url TEXT, -- SAML Single Logout URL
    certificate TEXT, -- Encrypted SAML certificate
    client_id VARCHAR(255), -- Encrypted OAuth client ID
    client_secret TEXT, -- Encrypted OAuth client secret
    redirect_uris TEXT[],
    scopes TEXT[],
    attribute_mappings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics Export Jobs
CREATE TABLE IF NOT EXISTS sim.analytics_export_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID,
    user_id UUID REFERENCES auth.users(id),
    export_type VARCHAR(50) NOT NULL CHECK (export_type IN ('csv', 'excel', 'json', 'pdf', 'api')),
    export_format JSONB DEFAULT '{}', -- Export configuration
    filters JSONB DEFAULT '{}', -- Data filters
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    file_url TEXT,
    file_size_bytes BIGINT,
    record_count INTEGER,
    error_message TEXT,
    expires_at TIMESTAMP WITH TIME ZONE, -- When export file should be deleted
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_white_label_org ON sim.white_label_configs(organization_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_lms_integrations_org ON sim.lms_integrations(organization_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_api_keys_org ON sim.api_keys(organization_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON sim.api_keys(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON sim.api_keys(api_key) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_key ON sim.api_usage_logs(api_key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_endpoint ON sim.api_usage_logs(endpoint, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sso_configs_org ON sim.sso_configurations(organization_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_analytics_exports_org ON sim.analytics_export_jobs(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_analytics_exports_user ON sim.analytics_export_jobs(user_id, created_at DESC);

-- Function to generate API key
CREATE OR REPLACE FUNCTION sim.generate_api_key()
RETURNS TEXT AS $$
BEGIN
  RETURN 'sk_' || encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to generate API secret
CREATE OR REPLACE FUNCTION sim.generate_api_secret()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(64), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to check API rate limit
CREATE OR REPLACE FUNCTION sim.check_api_rate_limit(
    api_key_param VARCHAR(255),
    endpoint_param VARCHAR(255)
)
RETURNS BOOLEAN AS $$
DECLARE
    key_record RECORD;
    usage_count_minute INTEGER;
    usage_count_hour INTEGER;
    usage_count_day INTEGER;
BEGIN
    -- Get API key details
    SELECT * INTO key_record
    FROM sim.api_keys
    WHERE api_key = api_key_param
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > NOW());

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    -- Check per-minute limit
    SELECT COUNT(*) INTO usage_count_minute
    FROM sim.api_usage_logs
    WHERE api_key_id = key_record.id
      AND endpoint = endpoint_param
      AND created_at > NOW() - INTERVAL '1 minute';

    IF usage_count_minute >= key_record.rate_limit_per_minute THEN
        RETURN false;
    END IF;

    -- Check per-hour limit
    SELECT COUNT(*) INTO usage_count_hour
    FROM sim.api_usage_logs
    WHERE api_key_id = key_record.id
      AND created_at > NOW() - INTERVAL '1 hour';

    IF usage_count_hour >= key_record.rate_limit_per_hour THEN
        RETURN false;
    END IF;

    -- Check per-day limit
    SELECT COUNT(*) INTO usage_count_day
    FROM sim.api_usage_logs
    WHERE api_key_id = key_record.id
      AND created_at > NOW() - INTERVAL '1 day';

    IF usage_count_day >= key_record.rate_limit_per_day THEN
        RETURN false;
    END IF;

    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to log API usage
CREATE OR REPLACE FUNCTION sim.log_api_usage(
    api_key_param VARCHAR(255),
    endpoint_param VARCHAR(255),
    method_param VARCHAR(10),
    response_status_param INTEGER,
    response_time_ms_param INTEGER,
    ip_address_param INET,
    user_agent_param TEXT,
    error_message_param TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    key_record RECORD;
    log_id UUID;
BEGIN
    -- Get API key
    SELECT * INTO key_record
    FROM sim.api_keys
    WHERE api_key = api_key_param
      AND is_active = true;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- Create usage log
    INSERT INTO sim.api_usage_logs (
        api_key_id,
        endpoint,
        method,
        response_status,
        response_time_ms,
        ip_address,
        user_agent,
        error_message
    )
    VALUES (
        key_record.id,
        endpoint_param,
        method_param,
        response_status_param,
        response_time_ms_param,
        ip_address_param,
        user_agent_param,
        error_message_param
    )
    RETURNING id INTO log_id;

    -- Update API key usage stats
    UPDATE sim.api_keys
    SET 
        usage_count = usage_count + 1,
        last_used_at = NOW()
    WHERE id = key_record.id;

    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get white-label config for organization
CREATE OR REPLACE FUNCTION sim.get_white_label_config(organization_id_param UUID)
RETURNS sim.white_label_configs AS $$
DECLARE
    config_record sim.white_label_configs;
BEGIN
    SELECT * INTO config_record
    FROM sim.white_label_configs
    WHERE organization_id = organization_id_param
      AND is_active = true
    ORDER BY created_at DESC
    LIMIT 1;

    RETURN config_record;
END;
$$ LANGUAGE plpgsql STABLE;

-- View for API usage statistics
CREATE OR REPLACE VIEW sim.api_usage_stats AS
SELECT
    ak.id AS api_key_id,
    ak.key_name,
    ak.organization_id,
    COUNT(aul.id) AS total_requests,
    COUNT(aul.id) FILTER (WHERE aul.created_at > NOW() - INTERVAL '24 hours') AS requests_24h,
    COUNT(aul.id) FILTER (WHERE aul.created_at > NOW() - INTERVAL '1 hour') AS requests_1h,
    AVG(aul.response_time_ms) AS avg_response_time_ms,
    COUNT(aul.id) FILTER (WHERE aul.response_status >= 400) AS error_count,
    COUNT(DISTINCT aul.endpoint) AS unique_endpoints,
    MAX(aul.created_at) AS last_request_at
FROM sim.api_keys ak
LEFT JOIN sim.api_usage_logs aul ON aul.api_key_id = ak.id
WHERE ak.is_active = true
GROUP BY ak.id, ak.key_name, ak.organization_id;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Enterprise features created successfully';
  RAISE NOTICE 'White-label configuration table created';
  RAISE NOTICE 'LMS integration table created';
  RAISE NOTICE 'API key management tables created';
  RAISE NOTICE 'SSO configuration table created';
  RAISE NOTICE 'Analytics export jobs table created';
  RAISE NOTICE 'Use sim.generate_api_key() to generate API keys';
  RAISE NOTICE 'Use sim.check_api_rate_limit() to check rate limits';
  RAISE NOTICE 'Use sim.log_api_usage() to log API calls';
END $$;

