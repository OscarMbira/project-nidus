-- v551: Align public.is_user_pmo_admin() with app matchesPmoSuiteAdminRole (src/services/pmoSuiteRoleAccess.js)
-- One-shot alternative: SQL/v553_bundle_pmo_invitation_rpc_complete.sql (includes v551 + v552).
--
-- Symptom: PMO "Send Role Invitations" passes UI gate but INSERT project_invitations returns
--   403 / permission denied — RLS policy uses is_user_pmo_admin(auth.uid()) while the app also
--   treats org_admin, system_admin, super_admin (and spaced/hyphen variants) as suite admins.
--
-- Prerequisites: v397 (or v395 policies expecting PMO helper). Idempotent: replaces function only.

CREATE OR REPLACE FUNCTION public.is_user_pmo_admin(p_auth_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    INNER JOIN roles r ON r.id = ur.role_id
    INNER JOIN users u ON u.id = ur.user_id
    WHERE u.auth_user_id = p_auth_uuid
      AND ur.is_active = TRUE
      AND COALESCE(ur.is_deleted, FALSE) = FALSE
      AND COALESCE(r.is_deleted, FALSE) = FALSE
      AND COALESCE(r.is_active, TRUE) = TRUE
      AND lower(
        regexp_replace(
          regexp_replace(trim(COALESCE(r.role_name, '')), '[[:space:]]+', '_', 'g'),
          '-',
          '_',
          'g'
        )
      ) IN ('pmo_admin', 'org_admin', 'system_admin', 'super_admin')
  );
$$;

REVOKE ALL ON FUNCTION public.is_user_pmo_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_user_pmo_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_pmo_admin(uuid) TO service_role;

COMMENT ON FUNCTION public.is_user_pmo_admin(uuid) IS
  'True when auth user has an active suite PMO/org/system/super admin assignment (normalized role_name). Matches pmoSuiteRoleAccess.matchesPmoSuiteAdminRole.';

-- Ensure policies use this helper (covers DBs still on v395 inline EXISTS with role_name = ''pmo_admin'' only).
DROP POLICY IF EXISTS policy_project_invitations_pmo_admin_all ON project_invitations;
CREATE POLICY policy_project_invitations_pmo_admin_all
  ON project_invitations
  FOR ALL
  TO authenticated
  USING (public.is_user_pmo_admin(auth.uid()))
  WITH CHECK (public.is_user_pmo_admin(auth.uid()));

DROP POLICY IF EXISTS policy_project_seat_allocations_pmo_admin_all ON project_seat_allocations;
CREATE POLICY policy_project_seat_allocations_pmo_admin_all
  ON project_seat_allocations
  FOR ALL
  TO authenticated
  USING (public.is_user_pmo_admin(auth.uid()))
  WITH CHECK (public.is_user_pmo_admin(auth.uid()));

DROP POLICY IF EXISTS policy_project_memberships_pmo_admin_all ON project_memberships;
CREATE POLICY policy_project_memberships_pmo_admin_all
  ON project_memberships
  FOR ALL
  TO authenticated
  USING (public.is_user_pmo_admin(auth.uid()))
  WITH CHECK (public.is_user_pmo_admin(auth.uid()));

DO $$ BEGIN RAISE NOTICE 'v551_align_is_user_pmo_admin_suite_roles.sql applied'; END $$;
