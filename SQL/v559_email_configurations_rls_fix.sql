-- ============================================================================
-- v559: Fix 403 on email_configurations (Email Settings save / load)
--
-- Root causes:
--   1. Legacy v49 policy email_configurations_admin_all compared
--        user_roles.user_id to auth.uid() — incorrect (user_id refs public.users).
--   2. When only v407 applied, access depended on is_user_pmo_admin(); users with
--        account_owner or legacy role names (System Administrator, Superuser) could
--        reach the UI but still got 403 from RLS.
--
-- Exposes helper + policies; idempotent — run after v49 (and v407 if already applied).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.can_manage_email_configurations(p_auth_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
STABLE
AS $$
  SELECT EXISTS (
      SELECT 1
      FROM public.user_roles ur
      INNER JOIN public.roles r ON r.id = ur.role_id
      INNER JOIN public.users u ON u.id = ur.user_id
      WHERE u.auth_user_id = p_auth_uuid
        AND COALESCE(ur.is_active, TRUE) = TRUE
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
        ) IN (
          'pmo_admin',
          'org_admin',
          'system_admin',
          'super_admin',
          'system_administrator',
          'superuser',
          'account_owner'
        )
    );
$$;

COMMENT ON FUNCTION public.can_manage_email_configurations(uuid) IS
  'True when user may read/write public.email_configurations. Joins JWT (auth.uid) to users.auth_user_id — not user_roles.user_id.';

REVOKE ALL ON FUNCTION public.can_manage_email_configurations(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_email_configurations(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_email_configurations(uuid) TO service_role;

ALTER TABLE public.email_configurations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_configurations_admin_all      ON public.email_configurations;
DROP POLICY IF EXISTS policy_email_config_pmo_admin_all   ON public.email_configurations;
DROP POLICY IF EXISTS policy_email_config_service_role    ON public.email_configurations;

CREATE POLICY policy_email_config_authenticated_all
  ON public.email_configurations
  FOR ALL
  TO authenticated
  USING      (public.can_manage_email_configurations(auth.uid()))
  WITH CHECK (public.can_manage_email_configurations(auth.uid()));

CREATE POLICY policy_email_config_service_role_all
  ON public.email_configurations
  FOR ALL
  TO service_role
  USING      (TRUE)
  WITH CHECK (TRUE);

DO $$
BEGIN
  RAISE NOTICE 'v559_email_configurations_rls_fix.sql applied';
END $$;
