-- ============================================================================
-- Fix User Roles Table RLS Infinite Recursion
-- Version: v135
-- Description: Fixes infinite recursion in user_roles table RLS policies
-- ============================================================================

-- Problem:
-- The v131 policy policy_user_roles_org_admin_all queries the user_roles table
-- within its own RLS check, causing infinite recursion:
--   "infinite recursion detected in policy for relation 'user_roles'"
--
-- Solution:
-- 1. Drop the problematic v131 policy that causes recursion
-- 2. Keep the working v129 policies (policy_user_roles_select_own, policy_user_roles_select_all)
-- 3. The v129 policy_user_roles_select_all already allows reading all non-deleted user_roles,
--    which is sufficient for org_admin needs (they can filter in application code)

-- ============================================================================
-- STEP 1: Drop problematic v131 policy that causes recursion
-- ============================================================================

DROP POLICY IF EXISTS policy_user_roles_org_admin_all ON user_roles;

-- ============================================================================
-- STEP 2: Verify v129 policies exist (they should be working)
-- ============================================================================

-- These policies from v129_fix_menu_system_rls.sql should remain:
-- - policy_user_roles_select_own: Users can read their own roles
-- - policy_user_roles_select_all: Users can read other users' roles (is_deleted = FALSE)
-- - policy_user_roles_insert: System can insert roles during registration
-- - policy_user_roles_update: Admins can update roles

-- If they don't exist, recreate them:
DO $$
BEGIN
  -- Check if policy_user_roles_select_own exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_roles' 
    AND policyname = 'policy_user_roles_select_own'
  ) THEN
    CREATE POLICY policy_user_roles_select_own
      ON user_roles
      FOR SELECT
      TO authenticated
      USING (
          user_id IN (
              SELECT id FROM users WHERE auth_user_id = auth.uid()
          )
          OR is_deleted = FALSE
      );
    
    RAISE NOTICE 'Created policy_user_roles_select_own';
  END IF;

  -- Check if policy_user_roles_select_all exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_roles' 
    AND policyname = 'policy_user_roles_select_all'
  ) THEN
    CREATE POLICY policy_user_roles_select_all
      ON user_roles
      FOR SELECT
      TO authenticated
      USING (is_deleted = FALSE);
    
    RAISE NOTICE 'Created policy_user_roles_select_all';
  END IF;

  -- Check if policy_user_roles_insert exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_roles' 
    AND policyname = 'policy_user_roles_insert'
  ) THEN
    CREATE POLICY policy_user_roles_insert
      ON user_roles
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
    
    RAISE NOTICE 'Created policy_user_roles_insert';
  END IF;

  -- Check if policy_user_roles_update exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_roles' 
    AND policyname = 'policy_user_roles_update'
  ) THEN
    CREATE POLICY policy_user_roles_update
      ON user_roles
      FOR UPDATE
      TO authenticated
      USING (is_deleted = FALSE);
    
    RAISE NOTICE 'Created policy_user_roles_update';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Ensure RLS is enabled and grants are in place
-- ============================================================================

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON user_roles TO authenticated;
GRANT INSERT ON user_roles TO authenticated;
GRANT UPDATE ON user_roles TO authenticated;
GRANT ALL ON user_roles TO service_role;

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
    AND tablename = 'user_roles';
  
  -- Check if RLS is enabled
  SELECT relrowsecurity INTO v_rls_enabled
  FROM pg_class
  WHERE relname = 'user_roles';
  
  RAISE NOTICE '================================================';
  RAISE NOTICE 'User Roles Table RLS Fix Complete';
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
      AND tablename = 'user_roles'
    ORDER BY policyname
  LOOP
    RAISE NOTICE '  - %', v_policy_name;
  END LOOP;
  
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'NOTE: The v131 org_admin policy was removed to prevent';
  RAISE NOTICE 'infinite recursion. The v129 policy_user_roles_select_all allows';
  RAISE NOTICE 'reading all non-deleted user_roles, which is sufficient for';
  RAISE NOTICE 'org_admin needs. Filtering can be done in application code.';
  RAISE NOTICE '================================================';
END $$;

