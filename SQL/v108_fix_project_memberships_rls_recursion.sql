-- =====================================================================================
-- Fix RLS Recursion in project_memberships policies
-- Version: v108
-- Description: Fixes infinite recursion error (42P17) in project_memberships RLS policies
--              by removing self-referential queries
-- =====================================================================================

-- The issue: Policies 3 and 4 query project_memberships to check if user is a manager,
-- which causes infinite recursion when trying to insert/update memberships.

-- =====================================================================================
-- STEP 1: Drop the problematic policies
-- =====================================================================================

-- Drop all existing policies that might conflict (to allow re-running this script)
DROP POLICY IF EXISTS policy_project_memberships_project_manager_insert ON project_memberships;
DROP POLICY IF EXISTS policy_project_memberships_project_manager_update ON project_memberships;
DROP POLICY IF EXISTS policy_project_memberships_insert ON project_memberships;
DROP POLICY IF EXISTS policy_project_memberships_update ON project_memberships;

-- =====================================================================================
-- STEP 2: Create helper function to check project manager status (SECURITY DEFINER)
-- =====================================================================================

-- This function bypasses RLS to check if a user is a project manager
-- It's safe because it only reads data, doesn't modify anything

CREATE OR REPLACE FUNCTION is_project_manager(p_auth_user_id UUID, p_project_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_is_manager BOOLEAN := FALSE;
BEGIN
    -- Check if user is a project manager via project_memberships
    -- This function uses SECURITY DEFINER to bypass RLS and avoid recursion
    SELECT EXISTS (
        SELECT 1 FROM project_memberships pm
        INNER JOIN users u ON u.id = pm.user_id
        WHERE pm.project_id = p_project_id
        AND u.auth_user_id = p_auth_user_id
        AND pm.is_active = TRUE
        AND EXISTS (
            SELECT 1 FROM project_roles pr
            WHERE pr.id = pm.project_role_id
            AND pr.role_name IN ('project_manager', 'programme_manager', 'project_sponsor', 'project_board_member')
            AND pr.is_active = TRUE
        )
    ) INTO v_is_manager;

    RETURN v_is_manager;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_project_manager(UUID, UUID) IS 'Checks if user is a project manager. Uses SECURITY DEFINER to bypass RLS and avoid recursion.';

-- =====================================================================================
-- STEP 3: Create new INSERT policy without recursion
-- =====================================================================================

CREATE POLICY policy_project_memberships_insert
    ON project_memberships FOR INSERT
    WITH CHECK (
        -- Account owners can add members to projects in their account
        EXISTS (
            SELECT 1 FROM projects p
            INNER JOIN accounts a ON a.id = p.account_id
            INNER JOIN users u ON u.id = a.owner_user_id
            WHERE p.id = project_memberships.project_id
            AND u.auth_user_id = auth.uid()
            AND a.is_deleted = FALSE
            AND p.is_deleted = FALSE
        )
        OR
        -- Project owners can add members (via owner_user_id)
        EXISTS (
            SELECT 1 FROM projects p
            INNER JOIN users u ON u.id = p.owner_user_id
            WHERE p.id = project_memberships.project_id
            AND u.auth_user_id = auth.uid()
            AND p.is_deleted = FALSE
        )
        OR
        -- Project creators can add the first membership (via created_by)
        -- This allows initial membership creation during project setup
        EXISTS (
            SELECT 1 FROM projects p
            INNER JOIN users u ON u.id = p.created_by
            WHERE p.id = project_memberships.project_id
            AND u.auth_user_id = auth.uid()
            AND p.is_deleted = FALSE
        )
        OR
        -- Project managers (via project_manager_user_id) can add members
        EXISTS (
            SELECT 1 FROM projects p
            INNER JOIN users u ON u.id = p.project_manager_user_id
            WHERE p.id = project_memberships.project_id
            AND u.auth_user_id = auth.uid()
            AND p.is_deleted = FALSE
        )
        OR
        -- Project managers can add members (using helper function to avoid recursion)
        is_project_manager(auth.uid(), project_memberships.project_id) = TRUE
        OR
        -- Users can create their own membership when accepting an invitation
        -- (This allows the initial membership creation during project setup)
        -- Check both by internal user_id and auth_user_id
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = project_memberships.user_id
            AND u.auth_user_id = auth.uid()
        )
    );

-- =====================================================================================
-- STEP 4: Create new UPDATE policy without recursion
-- =====================================================================================

CREATE POLICY policy_project_memberships_update
    ON project_memberships FOR UPDATE
    USING (
        -- Account owners can update memberships in projects in their account
        EXISTS (
            SELECT 1 FROM projects p
            INNER JOIN accounts a ON a.id = p.account_id
            INNER JOIN users u ON u.id = a.owner_user_id
            WHERE p.id = project_memberships.project_id
            AND u.auth_user_id = auth.uid()
            AND a.is_deleted = FALSE
            AND p.is_deleted = FALSE
        )
        OR
        -- Project owners can update memberships
        EXISTS (
            SELECT 1 FROM projects p
            INNER JOIN users u ON u.id = p.owner_user_id
            WHERE p.id = project_memberships.project_id
            AND u.auth_user_id = auth.uid()
            AND p.is_deleted = FALSE
        )
        OR
        -- Project creators can update memberships (via created_by)
        EXISTS (
            SELECT 1 FROM projects p
            INNER JOIN users u ON u.id = p.created_by
            WHERE p.id = project_memberships.project_id
            AND u.auth_user_id = auth.uid()
            AND p.is_deleted = FALSE
        )
        OR
        -- Project managers (via project_manager_user_id) can update memberships
        EXISTS (
            SELECT 1 FROM projects p
            INNER JOIN users u ON u.id = p.project_manager_user_id
            WHERE p.id = project_memberships.project_id
            AND u.auth_user_id = auth.uid()
            AND p.is_deleted = FALSE
        )
        OR
        -- Project managers can update memberships (using helper function to avoid recursion)
        is_project_manager(auth.uid(), project_memberships.project_id) = TRUE
        OR
        -- Users can update their own membership status
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = project_memberships.user_id
            AND u.auth_user_id = auth.uid()
        )
    )
    WITH CHECK (
        -- Same checks for WITH CHECK clause
        EXISTS (
            SELECT 1 FROM projects p
            INNER JOIN accounts a ON a.id = p.account_id
            INNER JOIN users u ON u.id = a.owner_user_id
            WHERE p.id = project_memberships.project_id
            AND u.auth_user_id = auth.uid()
            AND a.is_deleted = FALSE
            AND p.is_deleted = FALSE
        )
        OR
        EXISTS (
            SELECT 1 FROM projects p
            INNER JOIN users u ON u.id = p.owner_user_id
            WHERE p.id = project_memberships.project_id
            AND u.auth_user_id = auth.uid()
            AND p.is_deleted = FALSE
        )
        OR
        EXISTS (
            SELECT 1 FROM projects p
            INNER JOIN users u ON u.id = p.created_by
            WHERE p.id = project_memberships.project_id
            AND u.auth_user_id = auth.uid()
            AND p.is_deleted = FALSE
        )
        OR
        EXISTS (
            SELECT 1 FROM projects p
            INNER JOIN users u ON u.id = p.project_manager_user_id
            WHERE p.id = project_memberships.project_id
            AND u.auth_user_id = auth.uid()
            AND p.is_deleted = FALSE
        )
        OR
        is_project_manager(auth.uid(), project_memberships.project_id) = TRUE
        OR
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = project_memberships.user_id
            AND u.auth_user_id = auth.uid()
        )
    );

-- =====================================================================================
-- VERIFICATION
-- =====================================================================================

DO $$
DECLARE
    v_policies_count INTEGER;
    v_function_exists BOOLEAN;
BEGIN
    -- Count policies on project_memberships
    SELECT COUNT(*) INTO v_policies_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'project_memberships';

    -- Check if helper function exists
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'is_project_manager'
    ) INTO v_function_exists;

    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE '✅ RLS RECURSION FIX APPLIED';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Policies on project_memberships: %', v_policies_count;
    RAISE NOTICE 'Helper function exists: %', v_function_exists;
    RAISE NOTICE '';
    RAISE NOTICE 'Changes made:';
    RAISE NOTICE '  - Removed recursive policies';
    RAISE NOTICE '  - Created is_project_manager() helper function (SECURITY DEFINER)';
    RAISE NOTICE '  - Created new INSERT policy (no recursion)';
    RAISE NOTICE '  - Created new UPDATE policy (no recursion)';
    RAISE NOTICE '';
    RAISE NOTICE 'The new policies allow:';
    RAISE NOTICE '  - Account owners to manage memberships';
    RAISE NOTICE '  - Project owners to manage memberships';
    RAISE NOTICE '  - Project managers to manage memberships (via helper function)';
    RAISE NOTICE '  - Users to create/update their own memberships';
    RAISE NOTICE '';

    IF v_policies_count >= 4 AND v_function_exists THEN
        RAISE NOTICE '🎉 RLS recursion fix applied successfully!';
    ELSE
        RAISE WARNING 'Some components may be missing. Please check manually.';
    END IF;

    RAISE NOTICE '';
END $$;

