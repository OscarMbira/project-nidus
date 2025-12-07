-- =====================================================================================
-- Fix MFA Devices 500 Error
-- Creates table if missing and sets up proper RLS policies
-- =====================================================================================

-- Step 1: Check if table exists and create if needed
CREATE TABLE IF NOT EXISTS mfa_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    device_name VARCHAR(255) NOT NULL,
    device_type VARCHAR(50) NOT NULL CHECK (device_type IN ('totp', 'sms', 'email', 'webauthn', 'backup_codes')),
    device_secret TEXT,
    phone_number VARCHAR(20),
    email_address VARCHAR(255),
    webauthn_credential JSONB,
    is_primary BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    last_used_at TIMESTAMP,
    verification_code VARCHAR(10),
    verification_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID
);

-- Step 2: Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_mfa_devices_user_id ON mfa_devices(user_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_mfa_devices_device_type ON mfa_devices(device_type) WHERE is_deleted = false;

-- Step 3: Enable RLS
ALTER TABLE mfa_devices ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies
DROP POLICY IF EXISTS policy_mfa_devices_own_read ON mfa_devices;
DROP POLICY IF EXISTS policy_mfa_devices_own_write ON mfa_devices;

-- Step 5: Grant permissions
GRANT SELECT ON mfa_devices TO authenticated;
GRANT INSERT, UPDATE, DELETE ON mfa_devices TO authenticated;

-- Step 6: Create policies - users can only access their own MFA devices
CREATE POLICY policy_mfa_devices_own_read
    ON mfa_devices
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY policy_mfa_devices_own_write
    ON mfa_devices
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Verification
SELECT 'MFA Devices table setup complete' AS status;
SELECT 'Table exists: ' || CASE WHEN EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'mfa_devices'
) THEN 'YES' ELSE 'NO' END AS table_check;

SELECT 'RLS enabled: ' || CASE WHEN relrowsecurity THEN 'YES' ELSE 'NO' END AS rls_status
FROM pg_class WHERE relname = 'mfa_devices';

SELECT 'Policies count: ' || COUNT(*)::TEXT AS policies
FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mfa_devices';
