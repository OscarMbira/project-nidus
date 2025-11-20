-- =====================================================================================
-- Phase 8: Security Hardening & Compliance Module
-- Version: v50
-- Feature: Multi-Factor Authentication (MFA)
-- Description: MFA device registrations, backup codes, verification logs, and policies
-- Author: Development Team
-- Date: 2025-11-18
-- =====================================================================================

-- Prerequisites:
-- - v01 through v49 must be run first
-- - users table must exist

-- =====================================================================================
-- Table: mfa_devices
-- Description: User MFA device registrations
-- =====================================================================================
CREATE TABLE IF NOT EXISTS mfa_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_name VARCHAR(255) NOT NULL,
    device_type VARCHAR(50) NOT NULL CHECK (device_type IN ('totp', 'sms', 'email', 'webauthn', 'backup_codes')),
    device_secret TEXT, -- Encrypted TOTP secret
    phone_number VARCHAR(20), -- Encrypted phone number for SMS
    email_address VARCHAR(255), -- Encrypted email for email MFA
    webauthn_credential JSONB, -- Encrypted WebAuthn credential
    is_primary BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    last_used_at TIMESTAMP,
    verification_code VARCHAR(10), -- Encrypted verification code
    verification_expires_at TIMESTAMP,

    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

CREATE INDEX idx_mfa_devices_user_id ON mfa_devices(user_id) WHERE is_deleted = false;
CREATE INDEX idx_mfa_devices_device_type ON mfa_devices(device_type) WHERE is_deleted = false;
CREATE INDEX idx_mfa_devices_is_primary ON mfa_devices(user_id, is_primary) WHERE is_primary = true AND is_deleted = false;

COMMENT ON TABLE mfa_devices IS 'User MFA device registrations for multi-factor authentication';
COMMENT ON COLUMN mfa_devices.device_type IS 'MFA method type: totp, sms, email, webauthn, backup_codes';
COMMENT ON COLUMN mfa_devices.device_secret IS 'Encrypted TOTP secret for authenticator apps';
COMMENT ON COLUMN mfa_devices.is_primary IS 'Whether this is the primary MFA method for the user';

-- =====================================================================================
-- Table: mfa_backup_codes
-- Description: Backup codes for account recovery
-- =====================================================================================
CREATE TABLE IF NOT EXISTS mfa_backup_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL, -- Encrypted backup code
    is_used BOOLEAN DEFAULT false,
    used_at TIMESTAMP,

    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

CREATE INDEX idx_mfa_backup_codes_user_id ON mfa_backup_codes(user_id) WHERE is_deleted = false;
CREATE INDEX idx_mfa_backup_codes_is_used ON mfa_backup_codes(user_id, is_used) WHERE is_used = false;

COMMENT ON TABLE mfa_backup_codes IS 'Backup codes for MFA account recovery';

-- =====================================================================================
-- Table: mfa_verification_logs
-- Description: MFA verification attempts
-- =====================================================================================
CREATE TABLE IF NOT EXISTS mfa_verification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mfa_device_id UUID REFERENCES mfa_devices(id) ON DELETE SET NULL,
    verification_method VARCHAR(50) NOT NULL,
    verification_status VARCHAR(20) NOT NULL CHECK (verification_status IN ('success', 'failed', 'expired')),
    ip_address INET,
    user_agent TEXT,
    failure_reason TEXT,

    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_mfa_verification_logs_user_id ON mfa_verification_logs(user_id);
CREATE INDEX idx_mfa_verification_logs_status ON mfa_verification_logs(verification_status);
CREATE INDEX idx_mfa_verification_logs_created_at ON mfa_verification_logs(created_at DESC);

COMMENT ON TABLE mfa_verification_logs IS 'MFA verification attempt logs for security monitoring';

-- =====================================================================================
-- Table: mfa_policies
-- Description: MFA enforcement policies
-- =====================================================================================
CREATE TABLE IF NOT EXISTS mfa_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_name VARCHAR(255) NOT NULL UNIQUE,
    enforce_for_roles UUID[], -- Array of role IDs
    enforce_for_users UUID[], -- Array of user IDs
    required_methods TEXT[], -- Required MFA methods
    grace_period_days INTEGER DEFAULT 30,
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

CREATE INDEX idx_mfa_policies_is_active ON mfa_policies(is_active) WHERE is_active = true AND is_deleted = false;

COMMENT ON TABLE mfa_policies IS 'MFA enforcement policies for roles and users';

-- =====================================================================================
-- Row Level Security Policies
-- =====================================================================================

-- mfa_devices
ALTER TABLE mfa_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_mfa_devices_own_all
    ON mfa_devices FOR ALL
    USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.role_name = 'System Admin'
        AND ur.is_deleted = false
        AND r.is_deleted = false
    ));

-- mfa_backup_codes
ALTER TABLE mfa_backup_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_mfa_backup_codes_own_all
    ON mfa_backup_codes FOR ALL
    USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.role_name = 'System Admin'
        AND ur.is_deleted = false
        AND r.is_deleted = false
    ));

-- mfa_verification_logs
ALTER TABLE mfa_verification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_mfa_verification_logs_own_read
    ON mfa_verification_logs FOR SELECT
    USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.role_name = 'System Admin'
        AND ur.is_deleted = false
        AND r.is_deleted = false
    ));

-- mfa_policies
ALTER TABLE mfa_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_mfa_policies_admin_all
    ON mfa_policies FOR ALL
    USING (EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.role_name = 'System Admin'
        AND ur.is_deleted = false
        AND r.is_deleted = false
    ));

CREATE POLICY policy_mfa_policies_auth_read
    ON mfa_policies FOR SELECT
    USING (auth.role() = 'authenticated');

-- =====================================================================================
-- Register tables in database_tables
-- =====================================================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES 
    ('mfa_devices', 'User MFA device registrations for multi-factor authentication', true, true, 'system'),
    ('mfa_backup_codes', 'Backup codes for MFA account recovery', true, true, 'system'),
    ('mfa_verification_logs', 'MFA verification attempt logs for security monitoring', true, true, 'system'),
    ('mfa_policies', 'MFA enforcement policies for roles and users', true, true, 'system')
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
    RAISE NOTICE 'MFA Implementation Tables Created';
    RAISE NOTICE '================================================';
    RAISE NOTICE '1. mfa_devices - Device registrations';
    RAISE NOTICE '2. mfa_backup_codes - Backup codes';
    RAISE NOTICE '3. mfa_verification_logs - Verification logs';
    RAISE NOTICE '4. mfa_policies - Enforcement policies';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'v50_mfa_implementation.sql completed successfully';
    RAISE NOTICE '================================================';
END $$;

