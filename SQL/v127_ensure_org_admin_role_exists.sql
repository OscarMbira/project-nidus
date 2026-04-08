-- ============================================================================
-- Ensure pmo_admin Role Exists
-- Version: v127 (Updated for PMO Admin renaming)
-- Description: Creates pmo_admin role if it doesn't exist for organisation setup
-- Author: Claude Code
-- Date: 2025-12-16 (Updated: 2025-12-19)
-- ============================================================================

-- Purpose:
-- When users create organisations, the system assigns the 'pmo_admin' role
-- to the organisation creator. This script ensures the role exists.

-- Issue:
-- - Error: "Role 'pmo_admin' not found"
-- - OrganisationSetup page fails when trying to assign pmo_admin role
-- - User gets warning: "Failed to assign PMO Admin role"

-- ============================================================================
-- CHECK IF ROLES TABLE EXISTS
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'roles') THEN
        RAISE EXCEPTION 'roles table does not exist. Please run RBAC setup scripts first.';
    END IF;
END $$;

-- ============================================================================
-- CREATE PMO_ADMIN ROLE IF NOT EXISTS
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
    'Project Management Office administrator with full permissions within their organisation',
    80,
    false,  -- Not a system role, but an organisation role
    true,
    false
)
ON CONFLICT (role_name) DO UPDATE SET
    role_display_name = EXCLUDED.role_display_name,
    role_description = EXCLUDED.role_description,
    role_level = EXCLUDED.role_level,
    is_active = true,  -- Ensure it's active
    updated_at = NOW();

-- ============================================================================
-- ALSO ENSURE OTHER CRITICAL ROLES EXIST
-- ============================================================================

-- Ensure system_admin exists (in case it's missing)
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

-- Ensure account_owner exists (from v91)
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
-- GRANT PERMISSIONS FOR ROLES TABLE
-- ============================================================================

-- Ensure authenticated users can read roles
GRANT SELECT ON roles TO authenticated;
GRANT SELECT ON roles TO anon;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    v_pmo_admin_exists BOOLEAN;
    v_system_admin_exists BOOLEAN;
    v_account_owner_exists BOOLEAN;
    v_total_roles INTEGER;
BEGIN
    -- Check if pmo_admin exists
    SELECT EXISTS (
        SELECT 1 FROM roles
        WHERE role_name = 'pmo_admin'
        AND is_active = TRUE
        AND is_deleted = FALSE
    ) INTO v_pmo_admin_exists;

    -- Check if system_admin exists
    SELECT EXISTS (
        SELECT 1 FROM roles
        WHERE role_name = 'system_admin'
        AND is_active = TRUE
        AND is_deleted = FALSE
    ) INTO v_system_admin_exists;

    -- Check if account_owner exists
    SELECT EXISTS (
        SELECT 1 FROM roles
        WHERE role_name = 'account_owner'
        AND is_active = TRUE
        AND is_deleted = FALSE
    ) INTO v_account_owner_exists;

    -- Count total active roles
    SELECT COUNT(*)
    INTO v_total_roles
    FROM roles
    WHERE is_active = TRUE AND is_deleted = FALSE;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Roles Verification Complete';
    RAISE NOTICE 'pmo_admin exists: %', v_pmo_admin_exists;
    RAISE NOTICE 'system_admin exists: %', v_system_admin_exists;
    RAISE NOTICE 'account_owner exists: %', v_account_owner_exists;
    RAISE NOTICE 'Total active roles: %', v_total_roles;
    RAISE NOTICE '================================================';

    -- Raise error if pmo_admin doesn't exist after this script
    IF NOT v_pmo_admin_exists THEN
        RAISE EXCEPTION 'CRITICAL: pmo_admin role was not created successfully!';
    END IF;
END $$;

-- ============================================================================
-- TESTING QUERIES
-- ============================================================================

-- Test query 1: Check pmo_admin role details
-- SELECT id, role_name, role_display_name, role_level, is_system_role, is_active
-- FROM roles
-- WHERE role_name = 'pmo_admin';

-- Test query 2: List all active roles
-- SELECT role_name, role_display_name, role_level, is_system_role
-- FROM roles
-- WHERE is_active = TRUE AND is_deleted = FALSE
-- ORDER BY role_level DESC;

-- Test query 3: Check table permissions
-- SELECT grantee, privilege_type
-- FROM information_schema.role_table_grants
-- WHERE table_name = 'roles';
