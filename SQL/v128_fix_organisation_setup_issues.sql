-- ============================================================================
-- MASTER FIX: Organisation Setup Issues
-- Version: v128
-- Description: Comprehensive fix for all organisation setup issues
-- Author: Claude Code
-- Date: 2025-12-16
-- ============================================================================

-- Purpose:
-- This script fixes all issues preventing users from creating organisations:
-- 1. Countries table RLS permissions (403 Forbidden)
-- 2. Missing pmo_admin role (406 Not Acceptable)
-- 3. Roles table RLS permissions

-- Issues Fixed:
-- - "permission denied for table countries"
-- - "Role 'pmo_admin' not found"
-- - 406 (Not Acceptable) errors on roles table queries

-- ============================================================================
-- PART 1: FIX COUNTRIES TABLE
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS policy_countries_select_authenticated ON countries;
DROP POLICY IF EXISTS policy_countries_select_public ON countries;
DROP POLICY IF EXISTS policy_countries_admin_all ON countries;

-- Ensure RLS is enabled
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;

-- Create new RLS policies for countries
CREATE POLICY policy_countries_select_authenticated
    ON countries
    FOR SELECT
    TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY policy_countries_select_public
    ON countries
    FOR SELECT
    TO anon
    USING (is_deleted = FALSE);

CREATE POLICY policy_countries_admin_all
    ON countries
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM user_roles ur
            INNER JOIN roles r ON ur.role_id = r.id
            INNER JOIN users u ON ur.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
            AND r.role_name IN ('system_admin', 'System Admin', 'Superuser')
            AND ur.is_deleted = FALSE
            AND r.is_deleted = FALSE
            AND u.is_deleted = FALSE
        )
    );

-- Grant permissions on countries
GRANT SELECT ON countries TO authenticated;
GRANT SELECT ON countries TO anon;
GRANT ALL ON countries TO service_role;

-- Ensure countries are active
UPDATE countries
SET is_active = TRUE, updated_at = NOW()
WHERE code IN (
    'US', 'GB', 'CA', 'AU', 'NZ', 'IE',
    'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'CH', 'AT', 'SE', 'NO', 'DK', 'FI',
    'PL', 'PT', 'GR', 'IN', 'CN', 'JP', 'SG', 'HK', 'TH', 'MY', 'ID', 'PH',
    'VN', 'KR', 'TW', 'AE', 'SA', 'IL', 'QA', 'KW', 'ZA', 'NG', 'KE', 'EG',
    'GH', 'ZW', 'TZ', 'UG', 'BW', 'MU', 'BR', 'MX', 'AR', 'CL', 'CO', 'PE', 'VE'
)
AND is_deleted = FALSE;

-- ============================================================================
-- PART 2: FIX ROLES TABLE
-- ============================================================================

-- Drop existing RLS policies on roles if they exist
DROP POLICY IF EXISTS policy_roles_select_authenticated ON roles;
DROP POLICY IF EXISTS policy_roles_select_public ON roles;

-- Enable RLS on roles table
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Create permissive RLS policies for roles table
-- Everyone can read active roles
CREATE POLICY policy_roles_select_authenticated
    ON roles
    FOR SELECT
    TO authenticated
    USING (is_active = TRUE AND is_deleted = FALSE);

-- Allow anonymous users to read roles (needed during registration)
CREATE POLICY policy_roles_select_public
    ON roles
    FOR SELECT
    TO anon
    USING (is_active = TRUE AND is_deleted = FALSE);

-- Grant permissions on roles
GRANT SELECT ON roles TO authenticated;
GRANT SELECT ON roles TO anon;
GRANT ALL ON roles TO service_role;

-- ============================================================================
-- PART 3: ENSURE CRITICAL ROLES EXIST
-- ============================================================================

-- Insert pmo_admin role if it doesn't exist
INSERT INTO roles (
    role_name,
    role_display_name,
    role_description,
    role_level,
    is_system_role,
    is_active,
    is_default_role
)
VALUES (
    'pmo_admin',
    'PMO Admin',
    'Organization-level administrator with full permissions within their organisation',
    80,
    false,
    true,
    false
)
ON CONFLICT (role_name) DO UPDATE SET
    role_display_name = EXCLUDED.role_display_name,
    role_description = EXCLUDED.role_description,
    is_active = true,
    updated_at = NOW();

-- Insert system_admin if it doesn't exist
INSERT INTO roles (
    role_name,
    role_display_name,
    role_description,
    role_level,
    is_system_role,
    is_active,
    is_default_role
)
VALUES (
    'system_admin',
    'System Admin',
    'Full system access with all permissions',
    100,
    true,
    true,
    false
)
ON CONFLICT (role_name) DO UPDATE SET
    is_active = true,
    updated_at = NOW();

-- Insert account_owner if it doesn't exist
INSERT INTO roles (
    role_name,
    role_display_name,
    role_description,
    role_level,
    is_system_role,
    is_active,
    is_default_role
)
VALUES (
    'account_owner',
    'Account Owner',
    'Account and organization owner with full control',
    90,
    true,
    true,
    false
)
ON CONFLICT (role_name) DO UPDATE SET
    is_active = true,
    updated_at = NOW();

-- ============================================================================
-- PART 4: FIX USER_ROLES TABLE RLS
-- ============================================================================

-- Grant permissions on user_roles
GRANT SELECT ON user_roles TO authenticated;
GRANT INSERT ON user_roles TO authenticated;
GRANT UPDATE ON user_roles TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    v_countries_count INTEGER;
    v_countries_policies INTEGER;
    v_pmo_admin_exists BOOLEAN;
    v_roles_count INTEGER;
    v_roles_policies INTEGER;
BEGIN
    -- Check countries
    SELECT COUNT(*) INTO v_countries_count
    FROM countries
    WHERE is_active = TRUE AND is_deleted = FALSE;

    SELECT COUNT(*) INTO v_countries_policies
    FROM pg_policies
    WHERE tablename = 'countries';

    -- Check pmo_admin role
    SELECT EXISTS (
        SELECT 1 FROM roles
        WHERE role_name = 'pmo_admin'
        AND is_active = TRUE
        AND is_deleted = FALSE
    ) INTO v_pmo_admin_exists;

    -- Check roles
    SELECT COUNT(*) INTO v_roles_count
    FROM roles
    WHERE is_active = TRUE AND is_deleted = FALSE;

    SELECT COUNT(*) INTO v_roles_policies
    FROM pg_policies
    WHERE tablename = 'roles';

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Organisation Setup Fix Complete';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'COUNTRIES:';
    RAISE NOTICE '  Active Countries: %', v_countries_count;
    RAISE NOTICE '  RLS Policies: %', v_countries_policies;
    RAISE NOTICE '';
    RAISE NOTICE 'ROLES:';
    RAISE NOTICE '  pmo_admin exists: %', v_pmo_admin_exists;
    RAISE NOTICE '  Total active roles: %', v_roles_count;
    RAISE NOTICE '  RLS Policies: %', v_roles_policies;
    RAISE NOTICE '================================================';

    -- Raise warnings if issues remain
    IF v_countries_count = 0 THEN
        RAISE WARNING 'No active countries found!';
    END IF;

    IF NOT v_pmo_admin_exists THEN
        RAISE WARNING 'pmo_admin role not found!';
    END IF;

    IF v_countries_policies < 2 THEN
        RAISE WARNING 'Countries table missing RLS policies!';
    END IF;

    IF v_roles_policies < 2 THEN
        RAISE WARNING 'Roles table missing RLS policies!';
    END IF;
END $$;

-- ============================================================================
-- TEST QUERIES (Uncomment to test)
-- ============================================================================

-- Test 1: Can we read countries?
-- SELECT code, name FROM countries WHERE is_active = TRUE LIMIT 5;

-- Test 2: Can we read the pmo_admin role?
-- SELECT id, role_name, role_display_name FROM roles WHERE role_name = 'pmo_admin';

-- Test 3: List all policies
-- SELECT schemaname, tablename, policyname, roles
-- FROM pg_policies
-- WHERE tablename IN ('countries', 'roles')
-- ORDER BY tablename, policyname;
