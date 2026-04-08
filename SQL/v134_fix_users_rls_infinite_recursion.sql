-- ============================================================================
-- Fix Users Table RLS Infinite Recursion
-- Version: v134
-- Description: Fixes infinite recursion in users table RLS policies
-- ============================================================================

-- Problem:
-- The v131 policy policy_users_org_admin_read queries the users table within
-- its own RLS check, causing infinite recursion:
--   "infinite recursion detected in policy for relation 'users'"
--
-- Solution:
-- 1. Drop the problematic v131 policies that cause recursion
-- 2. Keep the working v129 policies (policy_users_select_own, policy_users_select_all)
-- 3. The v129 policy_users_select_all already allows reading all non-deleted users,
--    which is sufficient for org_admin needs (they can filter in application code)

-- ============================================================================
-- STEP 1: Drop problematic v131 policies that cause recursion
-- ============================================================================

DROP POLICY IF EXISTS policy_users_org_admin_read ON users;
DROP POLICY IF EXISTS policy_users_org_admin_update ON users;

-- ============================================================================
-- STEP 2: Verify v129 policies exist (they should be working)
-- ============================================================================

-- These policies from v129_fix_menu_system_rls.sql should remain:
-- - policy_users_select_own: Users can read their own record
-- - policy_users_select_all: Users can read other users' basic info (is_deleted = FALSE)
-- - policy_users_update_own: Users can update their own record
-- - policy_users_insert: Users can insert their own record

-- If they don't exist, recreate them:
DO $$
BEGIN
  -- Check if policy_users_select_own exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'policy_users_select_own'
  ) THEN
    CREATE POLICY policy_users_select_own
      ON users
      FOR SELECT
      TO authenticated
      USING (auth_user_id = auth.uid() OR is_deleted = FALSE);
    
    RAISE NOTICE 'Created policy_users_select_own';
  END IF;

  -- Check if policy_users_select_all exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'policy_users_select_all'
  ) THEN
    CREATE POLICY policy_users_select_all
      ON users
      FOR SELECT
      TO authenticated
      USING (is_deleted = FALSE);
    
    RAISE NOTICE 'Created policy_users_select_all';
  END IF;

  -- Check if policy_users_update_own exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'policy_users_update_own'
  ) THEN
    CREATE POLICY policy_users_update_own
      ON users
      FOR UPDATE
      TO authenticated
      USING (auth_user_id = auth.uid())
      WITH CHECK (auth_user_id = auth.uid());
    
    RAISE NOTICE 'Created policy_users_update_own';
  END IF;

  -- Check if policy_users_insert exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'policy_users_insert'
  ) THEN
    CREATE POLICY policy_users_insert
      ON users
      FOR INSERT
      TO authenticated
      WITH CHECK (auth_user_id = auth.uid());
    
    RAISE NOTICE 'Created policy_users_insert';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Ensure RLS is enabled and grants are in place
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON users TO authenticated;
GRANT INSERT ON users TO authenticated;
GRANT UPDATE ON users TO authenticated;
GRANT ALL ON users TO service_role;

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
    AND tablename = 'users';
  
  -- Check if RLS is enabled
  SELECT relrowsecurity INTO v_rls_enabled
  FROM pg_class
  WHERE relname = 'users';
  
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Users Table RLS Fix Complete';
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
      AND tablename = 'users'
    ORDER BY policyname
  LOOP
    RAISE NOTICE '  - %', v_policy_name;
  END LOOP;
  
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'NOTE: The v131 org_admin policies were removed to prevent';
  RAISE NOTICE 'infinite recursion. The v129 policy_users_select_all allows';
  RAISE NOTICE 'reading all non-deleted users, which is sufficient for';
  RAISE NOTICE 'org_admin needs. Filtering can be done in application code.';
  RAISE NOTICE '================================================';
END $$;

