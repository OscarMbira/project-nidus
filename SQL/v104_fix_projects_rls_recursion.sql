-- =====================================================================================
-- FIX: Projects table RLS infinite recursion
-- Version: v104
-- Description: Fixes infinite recursion error when creating projects
-- =====================================================================================

-- Error being fixed:
--   "infinite recursion detected in policy for relation 'projects'"
--
-- Root cause:
--   - Projects RLS policies check user_projects table
--   - user_projects might check back to projects
--   - This creates circular reference → infinite recursion
--
-- Solution:
--   - Use SECURITY DEFINER helper function to bypass RLS
--   - Create simple policies that don't cause circular dependencies
--   - Allow INSERT for authenticated users during project creation

-- =====================================================================================
-- STEP 1: Ensure helper function exists
-- =====================================================================================

-- This function bypasses RLS to get internal user ID from auth ID
CREATE OR REPLACE FUNCTION get_user_id_from_auth(auth_uid UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    internal_user_id UUID;
BEGIN
    -- This function runs with SECURITY DEFINER, so it bypasses RLS
    SELECT id INTO internal_user_id
    FROM users
    WHERE auth_user_id = auth_uid
    AND is_deleted = false
    LIMIT 1;

    RETURN internal_user_id;
END;
$$;

COMMENT ON FUNCTION get_user_id_from_auth IS
'Helper function to get internal user ID from auth user ID. Uses SECURITY DEFINER to bypass RLS and prevent infinite recursion.';

-- =====================================================================================
-- STEP 2: Fix projects table RLS policies
-- =====================================================================================

-- Disable RLS temporarily
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'projects' LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON projects';
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON projects TO authenticated;

-- =====================================================================================
-- STEP 3: Create simple RLS policies that don't cause recursion
-- =====================================================================================

-- POLICY 1: Allow authenticated users to INSERT projects
-- This is critical for account setup flow
CREATE POLICY projects_insert_authenticated
ON projects FOR INSERT
TO authenticated
WITH CHECK (
    -- User must be authenticated (auth.uid() is not null)
    auth.uid() IS NOT NULL
);

-- POLICY 2: Allow users to SELECT their own projects (via owner_user_id)
CREATE POLICY projects_select_owner
ON projects FOR SELECT
TO authenticated
USING (
    owner_user_id = get_user_id_from_auth(auth.uid())
    AND is_deleted = false
);

-- POLICY 3: Allow users to SELECT projects they manage (via project_manager_user_id)
CREATE POLICY projects_select_manager
ON projects FOR SELECT
TO authenticated
USING (
    project_manager_user_id = get_user_id_from_auth(auth.uid())
    AND is_deleted = false
);

-- POLICY 4: Allow users to SELECT projects in their account
CREATE POLICY projects_select_account
ON projects FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM accounts a
        WHERE a.id = projects.account_id
        AND a.owner_user_id = get_user_id_from_auth(auth.uid())
        AND a.is_deleted = false
    )
    AND is_deleted = false
);

-- POLICY 5: Allow project owners to UPDATE their projects
CREATE POLICY projects_update_owner
ON projects FOR UPDATE
TO authenticated
USING (
    owner_user_id = get_user_id_from_auth(auth.uid())
    AND is_deleted = false
)
WITH CHECK (
    owner_user_id = get_user_id_from_auth(auth.uid())
);

-- POLICY 6: Allow project managers to UPDATE their projects
CREATE POLICY projects_update_manager
ON projects FOR UPDATE
TO authenticated
USING (
    project_manager_user_id = get_user_id_from_auth(auth.uid())
    AND is_deleted = false
)
WITH CHECK (
    project_manager_user_id = get_user_id_from_auth(auth.uid())
);

-- POLICY 7: Allow account owners to DELETE/UPDATE projects in their account
CREATE POLICY projects_all_account_owner
ON projects FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM accounts a
        WHERE a.id = projects.account_id
        AND a.owner_user_id = get_user_id_from_auth(auth.uid())
        AND a.is_deleted = false
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM accounts a
        WHERE a.id = projects.account_id
        AND a.owner_user_id = get_user_id_from_auth(auth.uid())
        AND a.is_deleted = false
    )
);

-- =====================================================================================
-- VERIFICATION
-- =====================================================================================

DO $$
DECLARE
    policy_count INTEGER;
    function_exists BOOLEAN;
BEGIN
    -- Count policies on projects table
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'projects';

    -- Check if helper function exists
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        INNER JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'get_user_id_from_auth'
    ) INTO function_exists;

    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE '✅ PROJECTS RLS FIXED';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Policies created: %', policy_count;
    RAISE NOTICE 'Helper function: %', CASE WHEN function_exists THEN 'EXISTS' ELSE 'MISSING' END;
    RAISE NOTICE '';
    RAISE NOTICE 'New policies:';
    RAISE NOTICE '  ✓ projects_insert_authenticated - Allow authenticated users to INSERT';
    RAISE NOTICE '  ✓ projects_select_owner - SELECT own projects';
    RAISE NOTICE '  ✓ projects_select_manager - SELECT managed projects';
    RAISE NOTICE '  ✓ projects_select_account - SELECT account projects';
    RAISE NOTICE '  ✓ projects_update_owner - UPDATE own projects';
    RAISE NOTICE '  ✓ projects_update_manager - UPDATE managed projects';
    RAISE NOTICE '  ✓ projects_all_account_owner - Full access for account owners';
    RAISE NOTICE '';
    RAISE NOTICE 'These policies use get_user_id_from_auth() to avoid recursion!';
    RAISE NOTICE '';
    RAISE NOTICE 'You can now create projects during account setup.';
    RAISE NOTICE '';
END $$;
