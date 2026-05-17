-- ============================================================================
-- PMO Admin: SECURITY DEFINER helper for RLS (fixes 403 when nested RLS hides joins)
-- Version: v397
-- Description:
--   v395/v396 PMO policies used EXISTS (SELECT ... FROM user_roles JOIN roles JOIN users).
--   Those joins run under the invoker; RLS on roles/user_roles can hide rows so EXISTS is
--   false and PostgREST returns 403. This function runs as definer and evaluates PMO
--   status without being blocked by nested RLS on those tables.
-- Prerequisites: v395, v396 (or equivalent policies to replace)
-- Apply in Supabase SQL Editor after v395 and v396.
-- ============================================================================

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
  'Returns true when the given auth.users id has an active suite admin role (pmo_admin, org_admin, system_admin, super_admin; name normalized). Matches app pmoSuiteRoleAccess. Apply v551 on DBs created before this definition.';

-- ---------------------------------------------------------------------------
-- project_invitations
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS policy_project_invitations_pmo_admin_all ON project_invitations;

CREATE POLICY policy_project_invitations_pmo_admin_all
  ON project_invitations
  FOR ALL
  TO authenticated
  USING (public.is_user_pmo_admin(auth.uid()))
  WITH CHECK (public.is_user_pmo_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- project_seat_allocations
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS policy_project_seat_allocations_pmo_admin_all ON project_seat_allocations;

CREATE POLICY policy_project_seat_allocations_pmo_admin_all
  ON project_seat_allocations
  FOR ALL
  TO authenticated
  USING (public.is_user_pmo_admin(auth.uid()))
  WITH CHECK (public.is_user_pmo_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- project_memberships (align v396 with helper)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS policy_project_memberships_pmo_admin_all ON project_memberships;

CREATE POLICY policy_project_memberships_pmo_admin_all
  ON project_memberships
  FOR ALL
  TO authenticated
  USING (public.is_user_pmo_admin(auth.uid()))
  WITH CHECK (public.is_user_pmo_admin(auth.uid()));

DO $$
BEGIN
  RAISE NOTICE 'v397_pmo_admin_rls_helper.sql: is_user_pmo_admin + PMO policies applied';
END $$;
