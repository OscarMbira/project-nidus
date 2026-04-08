-- =====================================================================================
-- v97: Fix roles Table RLS Infinite Recursion
-- Fixes infinite recursion in roles policies that prevent role lookup during account creation
-- =====================================================================================

-- The roles table contains system role definitions (Account Owner, etc.)
-- It should be readable by all authenticated users
-- IMPORTANT: Do NOT check user_roles when reading roles - this causes recursion!

-- Drop all existing policies on roles to start fresh
DROP POLICY IF EXISTS policy_roles_read ON roles;
DROP POLICY IF EXISTS policy_roles_select ON roles;
DROP POLICY IF EXISTS policy_roles_admin_all ON roles;
DROP POLICY IF EXISTS policy_roles_authenticated_read ON roles;
DROP POLICY IF EXISTS policy_roles_public_read ON roles;
DROP POLICY IF EXISTS policy_roles_insert ON roles;
DROP POLICY IF EXISTS policy_roles_update ON roles;
DROP POLICY IF EXISTS policy_roles_delete ON roles;

-- Ensure RLS is enabled
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Grant base permissions
GRANT SELECT ON roles TO authenticated;
GRANT SELECT ON roles TO anon; -- Allow public to see available roles (for registration)

-- Policy 1: ALL authenticated users can READ roles
-- This is reference data, no recursion needed
CREATE POLICY policy_roles_authenticated_read
  ON roles
  FOR SELECT
  TO authenticated
  USING (true); -- Simple: all authenticated users can read all roles

-- Policy 2: Allow anonymous users to read active roles (for registration page)
CREATE POLICY policy_roles_anon_read
  ON roles
  FOR SELECT
  TO anon
  USING (is_active = true AND is_deleted = false);

-- Note: Only database admins/service role should INSERT/UPDATE/DELETE roles
-- No policies for INSERT/UPDATE/DELETE means only service_role can modify

-- Verify the fix
SELECT 'RLS enabled on roles: ' ||
  CASE WHEN relrowsecurity THEN 'YES ✓' ELSE 'NO ✗' END AS status
FROM pg_class WHERE relname = 'roles';

SELECT 'Number of policies on roles: ' || COUNT(*)::TEXT AS policy_count
FROM pg_policies WHERE schemaname = 'public' AND tablename = 'roles';

-- Show all policies
SELECT
  policyname AS "Policy Name",
  cmd AS "Command",
  roles AS "Roles"
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'roles'
ORDER BY policyname;

-- Test query to ensure no recursion
DO $$
DECLARE
  role_count INT;
BEGIN
  SELECT COUNT(*) INTO role_count FROM roles WHERE is_active = true;
  RAISE NOTICE 'roles RLS policies updated successfully. Found % active roles. No recursion should occur.', role_count;
END $$;
