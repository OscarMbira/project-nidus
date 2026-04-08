-- ============================================================================
-- IMMEDIATE FIX: Project Mandates RLS Policies
-- Version: v162_fix
-- Description: Fixes 403 errors by properly setting up RLS with grants
-- ============================================================================

-- Step 1: Drop existing policies (if any)
DROP POLICY IF EXISTS policy_project_mandates_auth_select ON project_mandates;
DROP POLICY IF EXISTS policy_project_mandates_auth_insert ON project_mandates;
DROP POLICY IF EXISTS policy_project_mandates_creator_update ON project_mandates;
DROP POLICY IF EXISTS policy_project_mandates_pmo_admin_all ON project_mandates;
DROP POLICY IF EXISTS policy_project_mandates_system_admin_all ON project_mandates;

-- Step 2: Temporarily disable RLS to grant permissions
ALTER TABLE project_mandates DISABLE ROW LEVEL SECURITY;

-- Step 3: Grant permissions to authenticated role (CRITICAL)
GRANT SELECT, INSERT, UPDATE ON project_mandates TO authenticated;

-- Step 4: Re-enable RLS
ALTER TABLE project_mandates ENABLE ROW LEVEL SECURITY;

-- Step 5: Create simple SELECT policy first (all authenticated users can view)
CREATE POLICY policy_project_mandates_auth_select
    ON project_mandates FOR SELECT
    TO authenticated
    USING (is_deleted = FALSE);

-- Step 6: Create INSERT policy
CREATE POLICY policy_project_mandates_auth_insert
    ON project_mandates FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
    );

-- Step 7: Create UPDATE policy (creators can update draft/rejected)
CREATE POLICY policy_project_mandates_creator_update
    ON project_mandates FOR UPDATE
    TO authenticated
    USING (
        created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND is_deleted = FALSE
        AND document_status IN ('draft', 'rejected')
    )
    WITH CHECK (
        created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND is_deleted = FALSE
    );

-- Step 8: Create PMO Admin policy (full access)
CREATE POLICY policy_project_mandates_pmo_admin_all
    ON project_mandates FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            JOIN users u ON ur.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name = 'pmo_admin'
              AND ur.is_active = TRUE
              AND ur.is_deleted = FALSE
              AND r.is_active = TRUE
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            JOIN users u ON ur.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name = 'pmo_admin'
              AND ur.is_active = TRUE
              AND ur.is_deleted = FALSE
              AND r.is_active = TRUE
        )
    );

-- Step 9: Create System Admin policy (full access)
CREATE POLICY policy_project_mandates_system_admin_all
    ON project_mandates FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            JOIN users u ON ur.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name = 'System Admin'
              AND ur.is_active = TRUE
              AND ur.is_deleted = FALSE
              AND r.is_active = TRUE
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            JOIN users u ON ur.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name = 'System Admin'
              AND ur.is_active = TRUE
              AND ur.is_deleted = FALSE
              AND r.is_active = TRUE
        )
    );

-- Step 10: Verify the fix
DO $$
DECLARE
    v_rls_enabled BOOLEAN;
    v_policy_count INTEGER;
    v_has_permission BOOLEAN;
BEGIN
    -- Check if RLS is enabled
    SELECT relrowsecurity INTO v_rls_enabled
    FROM pg_class
    WHERE relname = 'project_mandates';

    -- Count policies
    SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies
    WHERE tablename = 'project_mandates';

    -- Check if authenticated role has SELECT permission
    SELECT has_table_privilege('authenticated', 'public.project_mandates', 'SELECT') INTO v_has_permission;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Project Mandates RLS Fix Applied';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'RLS Enabled: %', CASE WHEN v_rls_enabled THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE 'Policies Created: %', v_policy_count;
    RAISE NOTICE 'Authenticated Can Select: %', CASE WHEN v_has_permission THEN 'YES ✓' ELSE 'NO ✗' END;
    RAISE NOTICE '================================================';
    
    IF v_rls_enabled AND v_policy_count >= 1 AND v_has_permission THEN
        RAISE NOTICE '✅ RLS setup is correct. The 403 error should be resolved.';
    ELSE
        RAISE WARNING '⚠️  RLS setup may be incomplete. Check the values above.';
    END IF;
    
    RAISE NOTICE '================================================';
END $$;
