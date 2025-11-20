-- =====================================================================================
-- Phase 8: Security Hardening & Compliance Module
-- Version: v54
-- Feature: GDPR Compliance Features
-- Description: Consent management, data processing records, export/deletion requests, privacy preferences, and data breach tracking
-- Author: Development Team
-- Date: 2025-11-18
-- =====================================================================================

-- Prerequisites:
-- - v01 through v53 must be run first
-- - users table must exist

-- =====================================================================================
-- Table: consent_logs
-- Description: User consent tracking
-- =====================================================================================
CREATE TABLE IF NOT EXISTS consent_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consent_type VARCHAR(100) NOT NULL, -- data_processing, marketing, analytics, cookies
    consent_given BOOLEAN NOT NULL,
    consent_text TEXT NOT NULL, -- What user consented to
    consent_version VARCHAR(50), -- Version of consent text
    consent_method VARCHAR(50) CHECK (consent_method IN ('explicit', 'implicit')) DEFAULT 'explicit',
    ip_address INET,

    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_consent_logs_user_id ON consent_logs(user_id);
CREATE INDEX idx_consent_logs_consent_type ON consent_logs(consent_type);
CREATE INDEX idx_consent_logs_created_at ON consent_logs(created_at DESC);

COMMENT ON TABLE consent_logs IS 'User consent tracking for GDPR compliance';
COMMENT ON COLUMN consent_logs.consent_type IS 'Type of consent: data_processing, marketing, analytics, cookies';

-- =====================================================================================
-- Table: data_processing_records
-- Description: Record of processing activities (Article 30 GDPR)
-- =====================================================================================
CREATE TABLE IF NOT EXISTS data_processing_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    processing_purpose TEXT NOT NULL,
    data_categories TEXT[] NOT NULL, -- personal_data, financial_data, etc.
    data_subjects TEXT[] NOT NULL, -- customers, employees, etc.
    recipients TEXT[], -- Who data is shared with
    retention_period VARCHAR(255),
    security_measures TEXT,
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

CREATE INDEX idx_data_processing_records_is_active ON data_processing_records(is_active) WHERE is_active = true AND is_deleted = false;

COMMENT ON TABLE data_processing_records IS 'Record of processing activities for GDPR Article 30 compliance';

-- =====================================================================================
-- Table: data_export_requests
-- Description: Right to data portability (Article 20 GDPR)
-- =====================================================================================
CREATE TABLE IF NOT EXISTS data_export_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('data_export', 'data_deletion')) DEFAULT 'data_export',
    request_status VARCHAR(50) NOT NULL CHECK (request_status IN ('pending', 'processing', 'completed', 'rejected')) DEFAULT 'pending',
    requested_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    processed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    export_file_path TEXT, -- Path to exported data file
    export_format VARCHAR(50) CHECK (export_format IN ('json', 'csv', 'pdf')) DEFAULT 'json',
    rejection_reason TEXT,

    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

CREATE INDEX idx_data_export_requests_user_id ON data_export_requests(user_id) WHERE is_deleted = false;
CREATE INDEX idx_data_export_requests_status ON data_export_requests(request_status) WHERE request_status IN ('pending', 'processing');
CREATE INDEX idx_data_export_requests_requested_at ON data_export_requests(requested_at DESC);

COMMENT ON TABLE data_export_requests IS 'Data export and deletion requests for GDPR compliance';

-- =====================================================================================
-- Table: data_deletion_requests
-- Description: Right to be forgotten (Article 17 GDPR)
-- =====================================================================================
CREATE TABLE IF NOT EXISTS data_deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_status VARCHAR(50) NOT NULL CHECK (request_status IN ('pending', 'processing', 'completed', 'rejected')) DEFAULT 'pending',
    requested_at TIMESTAMP DEFAULT NOW(),
    scheduled_deletion_date TIMESTAMP,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    deletion_scope JSONB, -- What data was deleted
    retention_exceptions TEXT, -- Legal reasons for keeping some data

    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false
);

CREATE INDEX idx_data_deletion_requests_user_id ON data_deletion_requests(user_id) WHERE is_deleted = false;
CREATE INDEX idx_data_deletion_requests_status ON data_deletion_requests(request_status) WHERE request_status IN ('pending', 'processing');
CREATE INDEX idx_data_deletion_requests_requested_at ON data_deletion_requests(requested_at DESC);

COMMENT ON TABLE data_deletion_requests IS 'Data deletion requests for GDPR right to be forgotten';

-- =====================================================================================
-- Table: privacy_preferences
-- Description: User privacy settings
-- =====================================================================================
CREATE TABLE IF NOT EXISTS privacy_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    allow_marketing_emails BOOLEAN DEFAULT false,
    allow_analytics_tracking BOOLEAN DEFAULT false,
    allow_third_party_sharing BOOLEAN DEFAULT false,
    data_retention_preference VARCHAR(50), -- minimum, standard, extended
    communication_preferences JSONB,

    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

CREATE INDEX idx_privacy_preferences_user_id ON privacy_preferences(user_id) WHERE is_deleted = false;

COMMENT ON TABLE privacy_preferences IS 'User privacy preferences and settings';

-- =====================================================================================
-- Table: data_breach_records
-- Description: Data breach incident tracking (Article 33 GDPR)
-- =====================================================================================
CREATE TABLE IF NOT EXISTS data_breach_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    breach_number VARCHAR(50) UNIQUE NOT NULL,
    breach_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    affected_users_count INTEGER DEFAULT 0,
    affected_users UUID[], -- Array of user IDs
    data_types_affected TEXT[], -- Types of data breached
    breach_detected_at TIMESTAMP DEFAULT NOW(),
    breach_reported_at TIMESTAMP, -- When breach was reported internally
    authority_notified_at TIMESTAMP, -- When notified supervisory authority
    users_notified_at TIMESTAMP, -- When affected users were notified
    mitigation_steps TEXT,
    status VARCHAR(50) CHECK (status IN ('detected', 'investigating', 'contained', 'remediated', 'closed')) DEFAULT 'detected',

    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

CREATE INDEX idx_data_breach_records_breach_number ON data_breach_records(breach_number) WHERE is_deleted = false;
CREATE INDEX idx_data_breach_records_status ON data_breach_records(status) WHERE is_deleted = false;
CREATE INDEX idx_data_breach_records_severity ON data_breach_records(severity) WHERE is_deleted = false;
CREATE INDEX idx_data_breach_records_detected_at ON data_breach_records(breach_detected_at DESC);

COMMENT ON TABLE data_breach_records IS 'Data breach incident tracking for GDPR Article 33 compliance';

-- =====================================================================================
-- Row Level Security Policies
-- =====================================================================================

-- consent_logs
ALTER TABLE consent_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_consent_logs_own_all
    ON consent_logs FOR ALL
    USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.role_name = 'System Admin'
        AND ur.is_deleted = false
        AND r.is_deleted = false
    ));

-- data_processing_records
ALTER TABLE data_processing_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_data_processing_records_admin_all
    ON data_processing_records FOR ALL
    USING (EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.role_name = 'System Admin'
        AND ur.is_deleted = false
        AND r.is_deleted = false
    ));

CREATE POLICY policy_data_processing_records_auth_read
    ON data_processing_records FOR SELECT
    USING (is_active = true AND auth.role() = 'authenticated');

-- data_export_requests
ALTER TABLE data_export_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_data_export_requests_own_all
    ON data_export_requests FOR ALL
    USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.role_name = 'System Admin'
        AND ur.is_deleted = false
        AND r.is_deleted = false
    ));

-- data_deletion_requests
ALTER TABLE data_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_data_deletion_requests_own_all
    ON data_deletion_requests FOR ALL
    USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.role_name = 'System Admin'
        AND ur.is_deleted = false
        AND r.is_deleted = false
    ));

-- privacy_preferences
ALTER TABLE privacy_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_privacy_preferences_own_all
    ON privacy_preferences FOR ALL
    USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.role_name = 'System Admin'
        AND ur.is_deleted = false
        AND r.is_deleted = false
    ));

-- data_breach_records
ALTER TABLE data_breach_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_data_breach_records_admin_all
    ON data_breach_records FOR ALL
    USING (EXISTS (
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
    ('consent_logs', 'User consent tracking for GDPR compliance', true, true, 'system'),
    ('data_processing_records', 'Record of processing activities for GDPR Article 30 compliance', true, true, 'system'),
    ('data_export_requests', 'Data export and deletion requests for GDPR compliance', true, true, 'system'),
    ('data_deletion_requests', 'Data deletion requests for GDPR right to be forgotten', true, true, 'system'),
    ('privacy_preferences', 'User privacy preferences and settings', true, true, 'system'),
    ('data_breach_records', 'Data breach incident tracking for GDPR Article 33 compliance', true, true, 'system')
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
    RAISE NOTICE 'GDPR Compliance Tables Created';
    RAISE NOTICE '================================================';
    RAISE NOTICE '1. consent_logs - Consent tracking';
    RAISE NOTICE '2. data_processing_records - Processing records';
    RAISE NOTICE '3. data_export_requests - Export/deletion requests';
    RAISE NOTICE '4. data_deletion_requests - Deletion requests';
    RAISE NOTICE '5. privacy_preferences - Privacy settings';
    RAISE NOTICE '6. data_breach_records - Breach tracking';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'v54_gdpr_compliance.sql completed successfully';
    RAISE NOTICE '================================================';
END $$;

