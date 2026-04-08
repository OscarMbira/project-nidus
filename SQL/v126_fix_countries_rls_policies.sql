-- ============================================================================
-- Fix Countries Table RLS Policies
-- Version: v126
-- Description: Fixes RLS policies for countries table to allow public access
-- Author: Claude Code
-- Date: 2025-12-16
-- ============================================================================

-- Purpose:
-- The countries table is experiencing "permission denied" errors even though
-- RLS policies were created. This script fixes the RLS policies to ensure
-- authenticated and anonymous users can read active countries.

-- Issue:
-- - Users getting "403 Forbidden" when trying to read from countries table
-- - Error: "permission denied for table countries"
-- - OrganisationSetup page cannot load country dropdown

-- ============================================================================
-- DROP EXISTING POLICIES (if any)
-- ============================================================================

DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS policy_countries_select_authenticated ON countries;
    DROP POLICY IF EXISTS policy_countries_select_public ON countries;
    DROP POLICY IF EXISTS policy_countries_admin_all ON countries;

    RAISE NOTICE 'Existing policies dropped (if any existed)';
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'Countries table does not exist yet';
    WHEN OTHERS THEN
        RAISE NOTICE 'Error dropping policies: %', SQLERRM;
END $$;

-- ============================================================================
-- ENSURE RLS IS ENABLED
-- ============================================================================

-- Enable RLS on countries table
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CREATE NEW RLS POLICIES
-- ============================================================================

-- Policy 1: Allow authenticated users to read active countries
CREATE POLICY policy_countries_select_authenticated
    ON countries
    FOR SELECT
    TO authenticated
    USING (is_deleted = FALSE);

-- Policy 2: Allow anonymous users to read active countries (for registration)
CREATE POLICY policy_countries_select_public
    ON countries
    FOR SELECT
    TO anon
    USING (is_deleted = FALSE);

-- Policy 3: Allow admins to manage countries
-- Note: This uses a simpler admin check that's less likely to cause recursion
CREATE POLICY policy_countries_admin_all
    ON countries
    FOR ALL
    TO authenticated
    USING (
        -- Check if user has admin role
        EXISTS (
            SELECT 1
            FROM user_roles ur
            INNER JOIN roles r ON ur.role_id = r.id
            INNER JOIN users u ON ur.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
            AND r.role_name IN ('System Admin', 'Superuser')
            AND ur.is_deleted = FALSE
            AND r.is_deleted = FALSE
            AND u.is_deleted = FALSE
        )
    )
    WITH CHECK (
        -- Same check for insert/update
        EXISTS (
            SELECT 1
            FROM user_roles ur
            INNER JOIN roles r ON ur.role_id = r.id
            INNER JOIN users u ON ur.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
            AND r.role_name IN ('System Admin', 'Superuser')
            AND ur.is_deleted = FALSE
            AND r.is_deleted = FALSE
            AND u.is_deleted = FALSE
        )
    );

-- ============================================================================
-- ENSURE COUNTRIES ARE ACTIVE
-- ============================================================================

-- Make sure we have active countries (re-activate common ones)
UPDATE countries
SET is_active = TRUE, updated_at = NOW()
WHERE code IN (
    -- Major English-speaking countries
    'US', 'GB', 'CA', 'AU', 'NZ', 'IE',

    -- Major European countries
    'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'CH', 'AT', 'SE', 'NO', 'DK', 'FI',
    'PL', 'PT', 'GR',

    -- Major Asian countries
    'IN', 'CN', 'JP', 'SG', 'HK', 'TH', 'MY', 'ID', 'PH', 'VN', 'KR', 'TW',

    -- Middle East
    'AE', 'SA', 'IL', 'QA', 'KW',

    -- Africa
    'ZA', 'NG', 'KE', 'EG', 'GH', 'ZW', 'TZ', 'UG', 'BW', 'MU',

    -- Latin America
    'BR', 'MX', 'AR', 'CL', 'CO', 'PE', 'VE'
)
AND is_deleted = FALSE;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant SELECT permission to authenticated users
GRANT SELECT ON countries TO authenticated;

-- Grant SELECT permission to anonymous users (for registration)
GRANT SELECT ON countries TO anon;

-- Grant ALL permissions to service role (for admin operations)
GRANT ALL ON countries TO service_role;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    v_active_count INTEGER;
    v_total_count INTEGER;
    v_policy_count INTEGER;
BEGIN
    -- Count active countries
    SELECT COUNT(*)
    INTO v_active_count
    FROM countries
    WHERE is_active = TRUE AND is_deleted = FALSE;

    -- Count total countries
    SELECT COUNT(*)
    INTO v_total_count
    FROM countries
    WHERE is_deleted = FALSE;

    -- Count policies
    SELECT COUNT(*)
    INTO v_policy_count
    FROM pg_policies
    WHERE tablename = 'countries';

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Countries RLS Fix Complete';
    RAISE NOTICE 'Active Countries: %', v_active_count;
    RAISE NOTICE 'Total Countries: %', v_total_count;
    RAISE NOTICE 'RLS Policies: %', v_policy_count;
    RAISE NOTICE '================================================';

    -- Verify we have active countries
    IF v_active_count = 0 THEN
        RAISE WARNING 'No active countries found! Countries dropdown will be empty.';
    END IF;

    -- Verify we have policies
    IF v_policy_count = 0 THEN
        RAISE WARNING 'No RLS policies found on countries table!';
    END IF;
END $$;

-- ============================================================================
-- TESTING QUERIES
-- ============================================================================

-- Test query 1: Check active countries
-- SELECT code, name, is_active, is_deleted
-- FROM countries
-- WHERE is_active = TRUE AND is_deleted = FALSE
-- ORDER BY name
-- LIMIT 10;

-- Test query 2: Check all policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'countries';

-- Test query 3: Check table permissions
-- SELECT grantee, privilege_type
-- FROM information_schema.role_table_grants
-- WHERE table_name = 'countries';
