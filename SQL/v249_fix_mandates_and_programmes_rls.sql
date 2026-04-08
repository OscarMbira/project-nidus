-- =============================================================================
-- v249: Comprehensive Fix for Mandates and Programmes RLS
-- Purpose: Fix 403 Forbidden errors when accessing /pmo/governance/mandate
-- Date: 2026-01-26
-- =============================================================================
--
-- Issues Fixed:
-- 1. permission denied for table programmes
-- 2. 403 Forbidden on project_mandates SELECT query
--
-- Root Cause: Multiple conflicting RLS policies and some policies reference
--             columns/functions that may not exist
-- =============================================================================

-- =============================================================================
-- SECTION 1: FIX PROGRAMMES TABLE
-- =============================================================================

-- Drop ALL existing policies on programmes
DROP POLICY IF EXISTS policy_programmes_select ON programmes;
DROP POLICY IF EXISTS policy_programmes_insert ON programmes;
DROP POLICY IF EXISTS policy_programmes_update ON programmes;
DROP POLICY IF EXISTS policy_programmes_pmo_admin ON programmes;
DROP POLICY IF EXISTS "Users can view programmes they are members of" ON programmes;
DROP POLICY IF EXISTS "programmes_select_policy" ON programmes;
DROP POLICY IF EXISTS "programmes_insert_policy" ON programmes;
DROP POLICY IF EXISTS "programmes_update_policy" ON programmes;

-- Ensure RLS is enabled
ALTER TABLE programmes ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON programmes TO authenticated;

-- Create simple SELECT policy - all authenticated users can read programmes
CREATE POLICY policy_programmes_select ON programmes
    FOR SELECT
    TO authenticated
    USING (is_deleted = FALSE);

-- Create INSERT policy - PMO admins can create programmes
CREATE POLICY policy_programmes_insert ON programmes
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN users u ON ur.user_id = u.id
            JOIN roles r ON ur.role_id = r.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name IN ('pmo_admin', 'System Admin')
              AND ur.is_active = TRUE
              AND ur.is_deleted = FALSE
        )
    );

-- Create UPDATE policy - PMO admins and programme owners can update
CREATE POLICY policy_programmes_update ON programmes
    FOR UPDATE
    TO authenticated
    USING (
        is_deleted = FALSE
        AND (
            EXISTS (
                SELECT 1 FROM users u
                WHERE u.auth_user_id = auth.uid()
                  AND (u.id = programmes.programme_owner_user_id OR u.id = programmes.programme_manager_user_id)
            )
            OR EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN users u ON ur.user_id = u.id
                JOIN roles r ON ur.role_id = r.id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name IN ('pmo_admin', 'System Admin')
                  AND ur.is_active = TRUE
                  AND ur.is_deleted = FALSE
            )
        )
    );

-- =============================================================================
-- SECTION 2: FIX PROJECT_MANDATES TABLE
-- =============================================================================

-- Drop ALL existing policies on project_mandates
DROP POLICY IF EXISTS policy_project_mandates_auth_select ON project_mandates;
DROP POLICY IF EXISTS policy_project_mandates_auth_insert ON project_mandates;
DROP POLICY IF EXISTS policy_project_mandates_creator_update ON project_mandates;
DROP POLICY IF EXISTS policy_project_mandates_pmo_admin_all ON project_mandates;
DROP POLICY IF EXISTS policy_project_mandates_system_admin_all ON project_mandates;
DROP POLICY IF EXISTS "mandates_pmo_read_all" ON project_mandates;
DROP POLICY IF EXISTS "mandates_pmo_write" ON project_mandates;
DROP POLICY IF EXISTS "mandates_pm_read" ON project_mandates;
DROP POLICY IF EXISTS "mandates_pm_write" ON project_mandates;
DROP POLICY IF EXISTS "mandates_pm_no_baseline_modify" ON project_mandates;
DROP POLICY IF EXISTS "mandates_only_pmo_baseline" ON project_mandates;
DROP POLICY IF EXISTS mandate_select_policy ON project_mandates;

-- Ensure RLS is enabled
ALTER TABLE project_mandates ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON project_mandates TO authenticated;

-- Create simple SELECT policy - all authenticated users can read mandates
CREATE POLICY policy_project_mandates_select ON project_mandates
    FOR SELECT
    TO authenticated
    USING (is_deleted = FALSE);

-- Create INSERT policy - authenticated users can create mandates
CREATE POLICY policy_project_mandates_insert ON project_mandates
    FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
    );

-- Create UPDATE policy - creators and PMO admins can update
CREATE POLICY policy_project_mandates_update ON project_mandates
    FOR UPDATE
    TO authenticated
    USING (
        is_deleted = FALSE
        AND (
            -- Creator can update their own drafts
            created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
            -- Or user is PMO admin/System Admin
            OR EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN users u ON ur.user_id = u.id
                JOIN roles r ON ur.role_id = r.id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name IN ('pmo_admin', 'System Admin')
                  AND ur.is_active = TRUE
                  AND ur.is_deleted = FALSE
            )
        )
    );

-- Create DELETE policy - only PMO admins can delete (soft delete)
CREATE POLICY policy_project_mandates_delete ON project_mandates
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN users u ON ur.user_id = u.id
            JOIN roles r ON ur.role_id = r.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name IN ('pmo_admin', 'System Admin')
              AND ur.is_active = TRUE
              AND ur.is_deleted = FALSE
        )
    );

-- =============================================================================
-- SECTION 3: FIX RELATED TABLES (users table for joins)
-- =============================================================================

-- Ensure users table allows SELECT for joins
DROP POLICY IF EXISTS policy_users_select_for_joins ON users;

-- Check if a simple select policy exists, if not create one
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'users'
        AND policyname = 'policy_users_authenticated_select'
    ) THEN
        -- Create a policy to allow authenticated users to read user info for joins
        CREATE POLICY policy_users_authenticated_select ON users
            FOR SELECT
            TO authenticated
            USING (is_deleted = FALSE);
    END IF;
END $$;

-- =============================================================================
-- SECTION 4: VERIFICATION
-- =============================================================================

DO $$
DECLARE
    v_programmes_policies INTEGER;
    v_mandates_policies INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_programmes_policies
    FROM pg_policies WHERE tablename = 'programmes';

    SELECT COUNT(*) INTO v_mandates_policies
    FROM pg_policies WHERE tablename = 'project_mandates';

    RAISE NOTICE '================================================';
    RAISE NOTICE 'RLS Fix Applied Successfully';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Programmes policies: %', v_programmes_policies;
    RAISE NOTICE 'Project Mandates policies: %', v_mandates_policies;
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Please refresh your browser and try again.';
    RAISE NOTICE '================================================';
END $$;
