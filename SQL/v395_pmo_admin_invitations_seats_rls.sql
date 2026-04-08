-- ============================================================================
-- PMO Admin: RLS for project_invitations and project_seat_allocations
-- Version: v395
-- Description:
--   v85 policies only allow invitation rows where the user is sender/recipient
--   or project membership via user_roles. Org-wide PMO admins often have no
--   user_roles row on a project, causing 403 on GET for invitations and seats.
--   Adds permissive policies for authenticated users with pmo_admin role.
-- Prerequisites: v85, v131 (optional), roles, user_roles, users
-- ============================================================================

-- ---------------------------------------------------------------------------
-- project_invitations: PMO admin full access (same pattern as v131, explicit TO authenticated)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS policy_project_invitations_pmo_admin_all ON project_invitations;

CREATE POLICY policy_project_invitations_pmo_admin_all
  ON project_invitations
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

-- ---------------------------------------------------------------------------
-- project_seat_allocations: PMO admin read + write (initialize seat row, refresh counts)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS policy_project_seat_allocations_pmo_admin_all ON project_seat_allocations;

CREATE POLICY policy_project_seat_allocations_pmo_admin_all
  ON project_seat_allocations
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
  RAISE NOTICE 'v395_pmo_admin_invitations_seats_rls.sql: PMO admin policies applied';
END $$;
