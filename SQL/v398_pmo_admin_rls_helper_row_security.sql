-- ============================================================================
-- PMO Admin: harden is_user_pmo_admin (RLS bypass inside SECURITY DEFINER)
-- Version: v398
-- Description:
--   On Supabase/Postgres, SECURITY DEFINER does not always bypass RLS unless the
--   function owner is a superuser/table owner. Nested RLS on user_roles/roles/users
--   can still hide rows, so is_user_pmo_admin() returns false and policies deny (403).
--   SET row_security = off forces the function body to evaluate without row security.
-- Prerequisites: v397 (or v395/v396 policies referencing is_user_pmo_admin)
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
      AND r.role_name = 'pmo_admin'
      AND ur.is_active = TRUE
      AND COALESCE(ur.is_deleted, FALSE) = FALSE
  );
$$;

REVOKE ALL ON FUNCTION public.is_user_pmo_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_user_pmo_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_pmo_admin(uuid) TO service_role;

COMMENT ON FUNCTION public.is_user_pmo_admin(uuid) IS
  'PMO check for RLS; uses row_security=off so nested RLS cannot hide role rows.';

DO $$
BEGIN
  RAISE NOTICE 'v398_pmo_admin_rls_helper_row_security.sql applied';
END $$;
