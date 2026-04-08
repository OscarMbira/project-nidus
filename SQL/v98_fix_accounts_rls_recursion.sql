-- =====================================================================================
-- v98: Fix accounts Table RLS Recursion
-- Ensures accounts table has non-recursive RLS policies
-- =====================================================================================

-- Drop all existing policies on accounts to start fresh
DROP POLICY IF EXISTS policy_accounts_own_read ON accounts;
DROP POLICY IF EXISTS policy_accounts_own_insert ON accounts;
DROP POLICY IF EXISTS policy_accounts_own_update ON accounts;
DROP POLICY IF EXISTS policy_accounts_own_delete ON accounts;
DROP POLICY IF EXISTS policy_accounts_select ON accounts;
DROP POLICY IF EXISTS policy_accounts_insert ON accounts;
DROP POLICY IF EXISTS policy_accounts_update ON accounts;
DROP POLICY IF EXISTS policy_accounts_delete ON accounts;
DROP POLICY IF EXISTS policy_accounts_member_read ON accounts;

-- Ensure RLS is enabled
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Grant base permissions
GRANT SELECT, INSERT, UPDATE ON accounts TO authenticated;

-- Policy 1: Users can read accounts they own
-- IMPORTANT: Use simple subquery, don't check user_roles
CREATE POLICY policy_accounts_owner_read
  ON accounts
  FOR SELECT
  TO authenticated
  USING (
    owner_user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- Policy 2: Users can insert accounts for themselves
CREATE POLICY policy_accounts_owner_insert
  ON accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- Policy 3: Users can update their own accounts
CREATE POLICY policy_accounts_owner_update
  ON accounts
  FOR UPDATE
  TO authenticated
  USING (
    owner_user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    owner_user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- Verify the fix
SELECT 'RLS enabled on accounts: ' ||
  CASE WHEN relrowsecurity THEN 'YES ✓' ELSE 'NO ✗' END AS status
FROM pg_class WHERE relname = 'accounts';

SELECT 'Number of policies on accounts: ' || COUNT(*)::TEXT AS policy_count
FROM pg_policies WHERE schemaname = 'public' AND tablename = 'accounts';

-- Show all policies
SELECT
  policyname AS "Policy Name",
  cmd AS "Command"
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'accounts'
ORDER BY policyname;

-- Test message
DO $$
BEGIN
  RAISE NOTICE 'accounts RLS policies updated successfully. No recursion should occur.';
END $$;
