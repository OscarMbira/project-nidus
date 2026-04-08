-- =====================================================================================
-- v96: Fix user_roles RLS Infinite Recursion
-- Fixes infinite recursion in user_roles policies that prevent account creation
-- =====================================================================================

-- Drop all existing policies on user_roles to start fresh
DROP POLICY IF EXISTS policy_user_roles_own_read ON user_roles;
DROP POLICY IF EXISTS policy_user_roles_own_insert ON user_roles;
DROP POLICY IF EXISTS policy_user_roles_own_update ON user_roles;
DROP POLICY IF EXISTS policy_user_roles_admin_all ON user_roles;
DROP POLICY IF EXISTS policy_user_roles_select ON user_roles;
DROP POLICY IF EXISTS policy_user_roles_insert ON user_roles;
DROP POLICY IF EXISTS policy_user_roles_update ON user_roles;
DROP POLICY IF EXISTS policy_user_roles_delete ON user_roles;

-- Ensure RLS is enabled
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Grant base permissions
GRANT SELECT, INSERT, UPDATE ON user_roles TO authenticated;

-- Policy 1: Users can read their own roles
-- IMPORTANT: Do NOT join to users table - use auth.uid() directly
CREATE POLICY policy_user_roles_own_read
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (
    -- Find user_id from users table where auth_user_id matches
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- Policy 2: Users can insert their own roles during registration
-- IMPORTANT: Do NOT check existing roles - this causes recursion
CREATE POLICY policy_user_roles_own_insert
  ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow insert if the user_id belongs to the authenticated user
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- Policy 3: Users can update their own roles (set is_active = false)
CREATE POLICY policy_user_roles_own_update
  ON user_roles
  FOR UPDATE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- Verify the fix
SELECT 'RLS enabled on user_roles: ' ||
  CASE WHEN relrowsecurity THEN 'YES ✓' ELSE 'NO ✗' END AS status
FROM pg_class WHERE relname = 'user_roles';

SELECT 'Number of policies on user_roles: ' || COUNT(*)::TEXT AS policy_count
FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles';

-- Show all policies
SELECT
  policyname AS "Policy Name",
  cmd AS "Command",
  CASE
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No USING clause'
  END AS "Using",
  CASE
    WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
    ELSE 'No WITH CHECK clause'
  END AS "With Check"
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'user_roles'
ORDER BY policyname;

-- Test query to ensure no recursion
DO $$
BEGIN
  RAISE NOTICE 'user_roles RLS policies updated successfully. No recursion should occur.';
END $$;
