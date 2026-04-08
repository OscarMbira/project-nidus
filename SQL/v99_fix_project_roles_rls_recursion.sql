-- =====================================================================================
-- v99: Fix project_roles Table RLS Recursion
-- Ensures project_roles table has non-recursive RLS policies
-- =====================================================================================

-- The project_roles table contains role definitions for projects
-- It should be readable by authenticated users
-- IMPORTANT: Do NOT check user roles when reading project_roles!

-- Drop all existing policies on project_roles
DROP POLICY IF EXISTS policy_project_roles_read ON project_roles;
DROP POLICY IF EXISTS policy_project_roles_select ON project_roles;
DROP POLICY IF EXISTS policy_project_roles_insert ON project_roles;
DROP POLICY IF EXISTS policy_project_roles_update ON project_roles;
DROP POLICY IF EXISTS policy_project_roles_delete ON project_roles;
DROP POLICY IF EXISTS policy_project_roles_template_read ON project_roles;

-- Ensure RLS is enabled
ALTER TABLE project_roles ENABLE ROW LEVEL SECURITY;

-- Grant base permissions
GRANT SELECT ON project_roles TO authenticated;

-- Policy 1: ALL authenticated users can READ project roles
-- Templates are reference data, custom roles are project-specific
CREATE POLICY policy_project_roles_authenticated_read
  ON project_roles
  FOR SELECT
  TO authenticated
  USING (
    is_template = true -- All users can see templates
    OR
    project_id IN ( -- Or roles for projects they're members of
      SELECT project_id FROM project_memberships pm
      JOIN users u ON pm.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- Policy 2: Users can create custom roles for their projects
CREATE POLICY policy_project_roles_authenticated_insert
  ON project_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_template = false
    AND
    project_id IN (
      SELECT p.id FROM projects p
      JOIN users u ON p.owner_user_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- Note: Only project owners should update/delete custom roles
-- Templates should only be modified by admins

-- Verify the fix
SELECT 'RLS enabled on project_roles: ' ||
  CASE WHEN relrowsecurity THEN 'YES ✓' ELSE 'NO ✗' END AS status
FROM pg_class WHERE relname = 'project_roles';

SELECT 'Number of policies on project_roles: ' || COUNT(*)::TEXT AS policy_count
FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_roles';

-- Show all policies
SELECT
  policyname AS "Policy Name",
  cmd AS "Command"
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'project_roles'
ORDER BY policyname;

-- Test message
DO $$
BEGIN
  RAISE NOTICE 'project_roles RLS policies updated successfully. No recursion should occur.';
END $$;
