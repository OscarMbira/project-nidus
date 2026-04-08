-- ============================================================================
-- Fix Roles Table RLS Infinite Recursion
-- Version: v136
-- Description: Fixes infinite recursion in roles table RLS policies
-- ============================================================================

-- Problem:
-- The v131 policy policy_roles_org_admin_read queries user_roles which then
-- queries roles (to check role_name), causing infinite recursion:
--   "infinite recursion detected in policy for relation 'roles'"
--
-- Solution:
-- 1. Drop the problematic v131 policy that causes recursion
-- 2. Keep the working v128 policies (policy_roles_select_authenticated, policy_roles_select_public)
-- 3. The v128 policy_roles_select_authenticated already allows reading all active roles,
--    which is sufficient for org_admin needs (they can filter in application code)

-- ============================================================================
-- STEP 1: Drop problematic v131 policy that causes recursion
-- ============================================================================

DROP POLICY IF EXISTS policy_roles_org_admin_read ON roles;

-- ============================================================================
-- STEP 2: Verify v128 policies exist (they should be working)
-- ============================================================================

-- These policies from v128_fix_organisation_setup_issues.sql should remain:
-- - policy_roles_select_authenticated: Authenticated users can read active roles
-- - policy_roles_select_public: Anonymous users can read active roles

-- If they don't exist, recreate them:
DO $$
BEGIN
  -- Check if policy_roles_select_authenticated exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'roles' 
    AND policyname = 'policy_roles_select_authenticated'
  ) THEN
    CREATE POLICY policy_roles_select_authenticated
      ON roles
      FOR SELECT
      TO authenticated
      USING (is_active = TRUE AND is_deleted = FALSE);
    
    RAISE NOTICE 'Created policy_roles_select_authenticated';
  END IF;

  -- Check if policy_roles_select_public exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'roles' 
    AND policyname = 'policy_roles_select_public'
  ) THEN
    CREATE POLICY policy_roles_select_public
      ON roles
      FOR SELECT
      TO anon
      USING (is_active = TRUE AND is_deleted = FALSE);
    
    RAISE NOTICE 'Created policy_roles_select_public';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Ensure RLS is enabled and grants are in place
-- ============================================================================

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON roles TO authenticated;
GRANT SELECT ON roles TO anon;
GRANT ALL ON roles TO service_role;

-- ============================================================================
-- STEP 4: Verification
-- ============================================================================

DO $$
DECLARE
  v_policy_count INTEGER;
  v_rls_enabled BOOLEAN;
  v_policy_name TEXT;
BEGIN
  -- Count policies
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'roles';
  
  -- Check if RLS is enabled
  SELECT relrowsecurity INTO v_rls_enabled
  FROM pg_class
  WHERE relname = 'roles';
  
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Roles Table RLS Fix Complete';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'RLS Enabled: %', v_rls_enabled;
  RAISE NOTICE 'Policies Count: %', v_policy_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Active Policies:';
  
  -- List all policies
  FOR v_policy_name IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'roles'
    ORDER BY policyname
  LOOP
    RAISE NOTICE '  - %', v_policy_name;
  END LOOP;
  
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'NOTE: The v131 org_admin policy was removed to prevent';
  RAISE NOTICE 'infinite recursion. The v128 policy_roles_select_authenticated allows';
  RAISE NOTICE 'reading all active roles, which is sufficient for org_admin needs.';
  RAISE NOTICE 'Filtering can be done in application code.';
  RAISE NOTICE '================================================';
END $$;

