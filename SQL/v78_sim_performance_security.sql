-- ============================================================================
-- PM Simulator Performance & Security Infrastructure
-- Version: v78
-- Description: Performance monitoring, security audit logs, GDPR compliance, analytics tracking
-- ============================================================================

-- Performance Metrics
CREATE TABLE IF NOT EXISTS sim.performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN ('page_load', 'api_call', 'simulation', 'database_query', 'custom')),
    metric_name VARCHAR(255) NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20) DEFAULT 'ms',
    context JSONB DEFAULT '{}',
    user_id UUID REFERENCES auth.users(id),
    session_id VARCHAR(255),
    page_url TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Security Audit Log
CREATE TABLE IF NOT EXISTS sim.security_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('login', 'logout', 'failed_login', 'password_change', 'permission_denied', 'data_access', 'data_modification', 'suspicious_activity', 'api_access', 'file_upload', 'export', 'deletion')),
    user_id UUID REFERENCES auth.users(id),
    ip_address INET,
    user_agent TEXT,
    details JSONB DEFAULT '{}',
    severity VARCHAR(20) DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- GDPR Compliance Tracking
CREATE TABLE IF NOT EXISTS sim.gdpr_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('data_export', 'data_deletion', 'consent_update', 'access_request')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    file_url TEXT, -- For data export
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Consent Tracking
CREATE TABLE IF NOT EXISTS sim.user_consents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    consent_type VARCHAR(50) NOT NULL CHECK (consent_type IN ('marketing', 'analytics', 'cookies', 'data_processing', 'third_party_sharing')),
    consented BOOLEAN NOT NULL,
    consent_version VARCHAR(20),
    ip_address INET,
    user_agent TEXT,
    consented_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    withdrawn_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, consent_type)
);

-- Analytics Events
CREATE TABLE IF NOT EXISTS sim.analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_name VARCHAR(100) NOT NULL,
    event_data JSONB DEFAULT '{}',
    user_id UUID REFERENCES auth.users(id),
    session_id VARCHAR(255),
    page_url TEXT,
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Error Logs
CREATE TABLE IF NOT EXISTS sim.error_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    error_type VARCHAR(50) NOT NULL CHECK (error_type IN ('javascript', 'api', 'database', 'validation', 'security', 'other')),
    error_message TEXT NOT NULL,
    error_stack TEXT,
    user_id UUID REFERENCES auth.users(id),
    page_url TEXT,
    user_agent TEXT,
    context JSONB DEFAULT '{}',
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type ON sim.performance_metrics(metric_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_user ON sim.performance_metrics(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_user ON sim.security_audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_type ON sim.security_audit_log(event_type, severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_unresolved ON sim.security_audit_log(resolved, severity) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_user ON sim.gdpr_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_consents_user ON sim.user_consents(user_id, consent_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON sim.analytics_events(event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON sim.analytics_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON sim.analytics_events(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_type ON sim.error_logs(error_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_unresolved ON sim.error_logs(resolved) WHERE resolved = false;

-- Function to log performance metric
CREATE OR REPLACE FUNCTION sim.log_performance_metric(
    metric_type_param VARCHAR(50),
    metric_name_param VARCHAR(255),
    value_param DECIMAL,
    unit_param VARCHAR(20) DEFAULT 'ms',
    context_param JSONB DEFAULT '{}'::jsonb,
    user_id_param UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    metric_id UUID;
BEGIN
    INSERT INTO sim.performance_metrics (
        metric_type,
        metric_name,
        value,
        unit,
        context,
        user_id,
        page_url,
        user_agent
    )
    VALUES (
        metric_type_param,
        metric_name_param,
        value_param,
        unit_param,
        context_param,
        user_id_param,
        current_setting('app.current_url', true),
        current_setting('app.user_agent', true)
    )
    RETURNING id INTO metric_id;

    RETURN metric_id;
END;
$$ LANGUAGE plpgsql;

-- Function to log security event
CREATE OR REPLACE FUNCTION sim.log_security_event(
    event_type_param VARCHAR(50),
    user_id_param UUID DEFAULT NULL,
    ip_address_param INET DEFAULT NULL,
    details_param JSONB DEFAULT '{}'::jsonb,
    severity_param VARCHAR(20) DEFAULT 'low'
)
RETURNS UUID AS $$
DECLARE
    event_id UUID;
BEGIN
    INSERT INTO sim.security_audit_log (
        event_type,
        user_id,
        ip_address,
        user_agent,
        details,
        severity
    )
    VALUES (
        event_type_param,
        user_id_param,
        ip_address_param,
        current_setting('app.user_agent', true),
        details_param,
        severity_param
    )
    RETURNING id INTO event_id;

    RETURN event_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get performance summary
CREATE OR REPLACE FUNCTION sim.get_performance_summary(
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '24 hours',
    end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
    metric_type VARCHAR(50),
    metric_name VARCHAR(255),
    avg_value DECIMAL,
    min_value DECIMAL,
    max_value DECIMAL,
    count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pm.metric_type,
        pm.metric_name,
        AVG(pm.value)::DECIMAL AS avg_value,
        MIN(pm.value)::DECIMAL AS min_value,
        MAX(pm.value)::DECIMAL AS max_value,
        COUNT(*)::BIGINT AS count
    FROM sim.performance_metrics pm
    WHERE pm.created_at BETWEEN start_date AND end_date
    GROUP BY pm.metric_type, pm.metric_name
    ORDER BY avg_value DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get security events summary
CREATE OR REPLACE FUNCTION sim.get_security_events_summary(
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '24 hours',
    end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
    event_type VARCHAR(50),
    severity VARCHAR(20),
    count BIGINT,
    unresolved_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sal.event_type,
        sal.severity,
        COUNT(*)::BIGINT AS count,
        COUNT(*) FILTER (WHERE sal.resolved = false)::BIGINT AS unresolved_count
    FROM sim.security_audit_log sal
    WHERE sal.created_at BETWEEN start_date AND end_date
    GROUP BY sal.event_type, sal.severity
    ORDER BY unresolved_count DESC, count DESC;
END;
$$ LANGUAGE plpgsql;

-- View for performance dashboard
CREATE OR REPLACE VIEW sim.performance_dashboard AS
SELECT
    DATE_TRUNC('hour', created_at) AS hour,
    metric_type,
    COUNT(*) AS metric_count,
    AVG(value) AS avg_value,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) AS p95_value,
    MAX(value) AS max_value
FROM sim.performance_metrics
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', created_at), metric_type
ORDER BY hour DESC, metric_type;

-- View for security dashboard
CREATE OR REPLACE VIEW sim.security_dashboard AS
SELECT
    DATE_TRUNC('hour', created_at) AS hour,
    event_type,
    severity,
    COUNT(*) AS event_count,
    COUNT(*) FILTER (WHERE resolved = false) AS unresolved_count
FROM sim.security_audit_log
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', created_at), event_type, severity
ORDER BY hour DESC, unresolved_count DESC;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Performance & Security infrastructure created successfully';
  RAISE NOTICE 'Use sim.log_performance_metric() to log performance data';
  RAISE NOTICE 'Use sim.log_security_event() to log security events';
  RAISE NOTICE 'View sim.performance_dashboard for performance metrics';
  RAISE NOTICE 'View sim.security_dashboard for security events';
END $$;

