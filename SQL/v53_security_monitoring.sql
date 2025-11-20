-- =====================================================================================
-- Phase 8: Security Hardening & Compliance Module
-- Version: v53
-- Feature: Security Monitoring Dashboard
-- Description: Security events, alerts, threat intelligence, and incident tracking
-- Author: Development Team
-- Date: 2025-11-18
-- =====================================================================================

-- Prerequisites:
-- - v01 through v52 must be run first
-- - users table must exist

-- =====================================================================================
-- Table: security_events
-- Description: Security-specific events
-- =====================================================================================
CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL, -- failed_login, suspicious_activity, unauthorized_access, etc.
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'low',
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    event_details JSONB,
    risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
    is_resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP,
    resolution_notes TEXT,

    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

CREATE INDEX idx_security_events_event_type ON security_events(event_type) WHERE is_deleted = false;
CREATE INDEX idx_security_events_severity ON security_events(severity) WHERE is_deleted = false;
CREATE INDEX idx_security_events_user_id ON security_events(user_id) WHERE is_deleted = false;
CREATE INDEX idx_security_events_ip_address ON security_events(ip_address) WHERE is_deleted = false;
CREATE INDEX idx_security_events_is_resolved ON security_events(is_resolved) WHERE is_resolved = false AND is_deleted = false;
CREATE INDEX idx_security_events_created_at ON security_events(created_at DESC);
CREATE INDEX idx_security_events_risk_score ON security_events(risk_score DESC) WHERE is_deleted = false;

COMMENT ON TABLE security_events IS 'Security-specific events for monitoring and alerting';
COMMENT ON COLUMN security_events.risk_score IS 'Risk score from 0-100 based on event characteristics';

-- =====================================================================================
-- Table: security_alerts
-- Description: Security alerts
-- =====================================================================================
CREATE TABLE IF NOT EXISTS security_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    title VARCHAR(255) NOT NULL,
    description TEXT,
    affected_users UUID[], -- Array of user IDs
    affected_resources JSONB, -- Affected resources (projects, data, etc.)
    status VARCHAR(50) NOT NULL CHECK (status IN ('new', 'investigating', 'resolved', 'false_positive')) DEFAULT 'new',
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    detection_time TIMESTAMP DEFAULT NOW(),
    acknowledgment_time TIMESTAMP,
    resolution_time TIMESTAMP,

    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

CREATE INDEX idx_security_alerts_status ON security_alerts(status) WHERE is_deleted = false;
CREATE INDEX idx_security_alerts_severity ON security_alerts(severity) WHERE is_deleted = false;
CREATE INDEX idx_security_alerts_assigned_to ON security_alerts(assigned_to) WHERE assigned_to IS NOT NULL AND is_deleted = false;
CREATE INDEX idx_security_alerts_detection_time ON security_alerts(detection_time DESC);

COMMENT ON TABLE security_alerts IS 'Security alerts for investigation and response';

-- =====================================================================================
-- Table: threat_intelligence
-- Description: Threat intelligence data
-- =====================================================================================
CREATE TABLE IF NOT EXISTS threat_intelligence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    threat_type VARCHAR(100) NOT NULL,
    ip_address INET,
    threat_level VARCHAR(20) NOT NULL CHECK (threat_level IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    description TEXT,
    source VARCHAR(255), -- Source of threat intelligence
    is_blocked BOOLEAN DEFAULT false,

    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

CREATE INDEX idx_threat_intelligence_ip_address ON threat_intelligence(ip_address) WHERE is_deleted = false;
CREATE INDEX idx_threat_intelligence_threat_level ON threat_intelligence(threat_level) WHERE is_deleted = false;
CREATE INDEX idx_threat_intelligence_is_blocked ON threat_intelligence(is_blocked) WHERE is_blocked = true AND is_deleted = false;
CREATE INDEX idx_threat_intelligence_created_at ON threat_intelligence(created_at DESC);

COMMENT ON TABLE threat_intelligence IS 'Threat intelligence data for IP blocking and monitoring';

-- =====================================================================================
-- Table: security_incidents
-- Description: Security incident tracking
-- =====================================================================================
CREATE TABLE IF NOT EXISTS security_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_number VARCHAR(50) UNIQUE NOT NULL,
    incident_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL CHECK (status IN ('detected', 'investigating', 'contained', 'remediated', 'closed')) DEFAULT 'detected',
    detected_at TIMESTAMP DEFAULT NOW(),
    reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    impact_assessment TEXT,
    remediation_steps TEXT,
    lessons_learned TEXT,

    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

CREATE INDEX idx_security_incidents_incident_number ON security_incidents(incident_number) WHERE is_deleted = false;
CREATE INDEX idx_security_incidents_status ON security_incidents(status) WHERE is_deleted = false;
CREATE INDEX idx_security_incidents_severity ON security_incidents(severity) WHERE is_deleted = false;
CREATE INDEX idx_security_incidents_assigned_to ON security_incidents(assigned_to) WHERE assigned_to IS NOT NULL AND is_deleted = false;
CREATE INDEX idx_security_incidents_detected_at ON security_incidents(detected_at DESC);

COMMENT ON TABLE security_incidents IS 'Security incident tracking for incident response';

-- =====================================================================================
-- Row Level Security Policies
-- =====================================================================================

-- security_events
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_security_events_admin_all
    ON security_events FOR ALL
    USING (EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.role_name = 'System Admin'
        AND ur.is_deleted = false
        AND r.is_deleted = false
    ));

CREATE POLICY policy_security_events_user_own
    ON security_events FOR SELECT
    USING (user_id = auth.uid());

-- security_alerts
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_security_alerts_admin_all
    ON security_alerts FOR ALL
    USING (EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.role_name = 'System Admin'
        AND ur.is_deleted = false
        AND r.is_deleted = false
    ));

-- security_alerts - assigned user can read
CREATE POLICY policy_security_alerts_assigned_read
    ON security_alerts FOR SELECT
    USING (assigned_to = auth.uid());

-- threat_intelligence
ALTER TABLE threat_intelligence ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_threat_intelligence_admin_all
    ON threat_intelligence FOR ALL
    USING (EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.role_name = 'System Admin'
        AND ur.is_deleted = false
        AND r.is_deleted = false
    ));

-- security_incidents
ALTER TABLE security_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_security_incidents_admin_all
    ON security_incidents FOR ALL
    USING (EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.role_name = 'System Admin'
        AND ur.is_deleted = false
        AND r.is_deleted = false
    ));

CREATE POLICY policy_security_incidents_assigned_read
    ON security_incidents FOR SELECT
    USING (assigned_to = auth.uid() OR reported_by = auth.uid());

-- =====================================================================================
-- Register tables in database_tables
-- =====================================================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES 
    ('security_events', 'Security-specific events for monitoring and alerting', true, true, 'system'),
    ('security_alerts', 'Security alerts for investigation and response', true, true, 'system'),
    ('threat_intelligence', 'Threat intelligence data for IP blocking and monitoring', true, true, 'system'),
    ('security_incidents', 'Security incident tracking for incident response', true, true, 'system')
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
    RAISE NOTICE 'Security Monitoring Tables Created';
    RAISE NOTICE '================================================';
    RAISE NOTICE '1. security_events - Security events';
    RAISE NOTICE '2. security_alerts - Security alerts';
    RAISE NOTICE '3. threat_intelligence - Threat intelligence';
    RAISE NOTICE '4. security_incidents - Incident tracking';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'v53_security_monitoring.sql completed successfully';
    RAISE NOTICE '================================================';
END $$;

