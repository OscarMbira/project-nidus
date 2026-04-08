-- ============================================================================
-- PMO Admin + Auth RLS hardening for project_memberships
-- Version: v396
-- Description:
--   Fixes persistent 403 on /project_memberships for PMO Admin users by ensuring
--   a direct PMO policy exists on project_memberships. Also restores a safe
--   authenticated SELECT policy for active memberships when missing.
-- Prerequisites: project_memberships, users, user_roles, roles
-- ============================================================================

ALTER TABLE project_memberships ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON project_memberships TO authenticated;

-- Keep baseline read policy present across mixed environments.
DROP POLICY IF EXISTS policy_project_memberships_auth_read ON project_memberships;
CREATE POLICY policy_project_memberships_auth_read
  ON project_memberships
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND is_active = TRUE
  );

-- PMO admin full access to memberships (read + modify) regardless of per-project assignment row.
DROP POLICY IF EXISTS policy_project_memberships_pmo_admin_all ON project_memberships;
CREATE POLICY policy_project_memberships_pmo_admin_all
  ON project_memberships
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      JOIN users u ON u.id = ur.user_id
      WHERE u.auth_user_id = auth.uid()
        AND r.role_name = 'pmo_admin'
        AND ur.is_active = TRUE
        AND COALESCE(ur.is_deleted, FALSE) = FALSE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      JOIN users u ON u.id = ur.user_id
      WHERE u.auth_user_id = auth.uid()
        AND r.role_name = 'pmo_admin'
        AND ur.is_active = TRUE
        AND COALESCE(ur.is_deleted, FALSE) = FALSE
    )
  );

DO $$
BEGIN
  RAISE NOTICE 'v396_pmo_admin_project_memberships_rls.sql applied: memberships RLS hardened';
END $$;
