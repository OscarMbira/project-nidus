-- =====================================================================================
-- Phase 8: Security Hardening & Compliance Module
-- Version: v55
-- Feature: Field-Level Data Encryption
-- Description: Encryption key management, encrypted fields tracking, and encryption audit logs
-- Author: Development Team
-- Date: 2025-11-18
-- =====================================================================================

-- Prerequisites:
-- - v01 through v54 must be run first
-- - users table must exist

-- =====================================================================================
-- Table: encryption_keys
-- Description: Encryption key management
-- =====================================================================================
CREATE TABLE IF NOT EXISTS encryption_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_name VARCHAR(255) NOT NULL UNIQUE,
    key_type VARCHAR(50) NOT NULL CHECK (key_type IN ('master', 'data')) DEFAULT 'data',
    key_version INTEGER NOT NULL DEFAULT 1,
    key_value TEXT, -- Encrypted key stored in secure vault (not in database)
    key_algorithm VARCHAR(50) NOT NULL CHECK (key_algorithm IN ('AES-256', 'RSA-2048', 'AES-256-GCM')) DEFAULT 'AES-256-GCM',
    is_active BOOLEAN DEFAULT true,
    rotation_schedule VARCHAR(100), -- e.g., '90 days', 'quarterly'
    last_rotated_at TIMESTAMP,
    expires_at TIMESTAMP,

    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

CREATE INDEX idx_encryption_keys_key_name ON encryption_keys(key_name) WHERE is_deleted = false;
CREATE INDEX idx_encryption_keys_key_type ON encryption_keys(key_type) WHERE is_deleted = false;
CREATE INDEX idx_encryption_keys_is_active ON encryption_keys(is_active) WHERE is_active = true AND is_deleted = false;
CREATE INDEX idx_encryption_keys_expires_at ON encryption_keys(expires_at) WHERE expires_at IS NOT NULL;

COMMENT ON TABLE encryption_keys IS 'Encryption key management for field-level encryption';
COMMENT ON COLUMN encryption_keys.key_value IS 'Encrypted key value - actual key stored in secure vault, not in database';
COMMENT ON COLUMN encryption_keys.key_type IS 'Key type: master (for encrypting other keys) or data (for encrypting data)';

-- =====================================================================================
-- Table: encrypted_fields
-- Description: Track which fields are encrypted
-- =====================================================================================
CREATE TABLE IF NOT EXISTS encrypted_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    encryption_key_id UUID NOT NULL REFERENCES encryption_keys(id) ON DELETE RESTRICT,
    encryption_algorithm VARCHAR(50) NOT NULL CHECK (encryption_algorithm IN ('AES-256', 'AES-256-GCM')) DEFAULT 'AES-256-GCM',
    is_active BOOLEAN DEFAULT true,

    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),

    CONSTRAINT uq_encrypted_fields_table_field UNIQUE(table_name, field_name)
);

CREATE INDEX idx_encrypted_fields_table_name ON encrypted_fields(table_name) WHERE is_deleted = false;
CREATE INDEX idx_encrypted_fields_encryption_key_id ON encrypted_fields(encryption_key_id) WHERE is_deleted = false;
CREATE INDEX idx_encrypted_fields_is_active ON encrypted_fields(is_active) WHERE is_active = true AND is_deleted = false;

COMMENT ON TABLE encrypted_fields IS 'Track which database fields are encrypted';
COMMENT ON COLUMN encrypted_fields.encryption_key_id IS 'Encryption key used for this field';

-- =====================================================================================
-- Table: encryption_audit_logs
-- Description: Encryption/decryption audit
-- =====================================================================================
CREATE TABLE IF NOT EXISTS encryption_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    operation VARCHAR(50) NOT NULL CHECK (operation IN ('encrypt', 'decrypt', 'key_rotation')),
    table_name VARCHAR(100) NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    record_id UUID,
    success BOOLEAN DEFAULT true,
    error_message TEXT,

    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_encryption_audit_logs_user_id ON encryption_audit_logs(user_id);
CREATE INDEX idx_encryption_audit_logs_operation ON encryption_audit_logs(operation);
CREATE INDEX idx_encryption_audit_logs_table_field ON encryption_audit_logs(table_name, field_name);
CREATE INDEX idx_encryption_audit_logs_created_at ON encryption_audit_logs(created_at DESC);
CREATE INDEX idx_encryption_audit_logs_success ON encryption_audit_logs(success) WHERE success = false;

COMMENT ON TABLE encryption_audit_logs IS 'Audit log for encryption and decryption operations';

-- =====================================================================================
-- Row Level Security Policies
-- =====================================================================================

-- encryption_keys
ALTER TABLE encryption_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_encryption_keys_admin_all
    ON encryption_keys FOR ALL
    USING (EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.role_name = 'System Admin'
        AND ur.is_deleted = false
        AND r.is_deleted = false
    ));

-- encrypted_fields
ALTER TABLE encrypted_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_encrypted_fields_admin_all
    ON encrypted_fields FOR ALL
    USING (EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.role_name = 'System Admin'
        AND ur.is_deleted = false
        AND r.is_deleted = false
    ));

CREATE POLICY policy_encrypted_fields_auth_read
    ON encrypted_fields FOR SELECT
    USING (is_active = true AND auth.role() = 'authenticated');

-- encryption_audit_logs
ALTER TABLE encryption_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_encryption_audit_logs_admin_all
    ON encryption_audit_logs FOR ALL
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
    ('encryption_keys', 'Encryption key management for field-level encryption', true, true, 'system'),
    ('encrypted_fields', 'Track which database fields are encrypted', true, true, 'system'),
    ('encryption_audit_logs', 'Audit log for encryption and decryption operations', true, true, 'system')
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
    RAISE NOTICE 'Data Encryption Tables Created';
    RAISE NOTICE '================================================';
    RAISE NOTICE '1. encryption_keys - Key management';
    RAISE NOTICE '2. encrypted_fields - Encrypted fields tracking';
    RAISE NOTICE '3. encryption_audit_logs - Encryption audit logs';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'v55_data_encryption.sql completed successfully';
    RAISE NOTICE '================================================';
END $$;

