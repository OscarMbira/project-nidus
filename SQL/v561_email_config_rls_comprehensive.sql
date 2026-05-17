-- ============================================================================
-- v561: Comprehensive RLS + GRANT fix for email_configurations
--
-- Root causes:
--   1. v49 policy used ur.user_id = auth.uid() which is ALWAYS false — user_roles.user_id
--      is a FK to public.users.id, not auth.users.id. Every INSERT/SELECT was denied.
--   2. v407 relied on is_user_pmo_admin() which omitted account_owner / system_administrator
--      / superuser role variants.
--   3. v559 introduced can_manage_email_configurations() but may not have been applied.
--   4. The `authenticated` role may lack table-level GRANT if Supabase defaults were
--      overridden by an earlier REVOKE somewhere in the migration chain.
--
-- This script (idempotent — safe to run multiple times):
--   a) Ensures the authenticated role has SELECT/INSERT/UPDATE/DELETE on the table.
--   b) Recreates can_manage_email_configurations() with ALL admin role variants.
--   c) Drops every known policy name (old + new).
--   d) Creates two clean correct policies.
--   e) Verifies the result.
-- ============================================================================

-- ── 1. Table-level GRANTs (repair if Supabase defaults were stripped) ────────

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.email_configurations
  TO authenticated;

GRANT ALL
  ON public.email_configurations
  TO service_role;

-- ── 2. Recreate helper function ──────────────────────────────────────────────

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
      AND COALESCE(ur.is_active, TRUE)   = TRUE
      AND COALESCE(ur.is_deleted, FALSE) = FALSE
      AND COALESCE(r.is_deleted, FALSE)  = FALSE
      AND COALESCE(r.is_active,  TRUE)   = TRUE
      AND lower(
            regexp_replace(
              regexp_replace(trim(COALESCE(r.role_name, '')), '[[:space:]]+', '_', 'g'),
              '-', '_', 'g'
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
  'True when auth.uid has an active admin-class role on public.user_roles.
   Joins via users.auth_user_id (NOT user_roles.user_id directly). v561.';

REVOKE ALL   ON FUNCTION public.can_manage_email_configurations(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_email_configurations(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_email_configurations(uuid) TO service_role;

-- ── 3. Enable RLS ────────────────────────────────────────────────────────────

ALTER TABLE public.email_configurations ENABLE ROW LEVEL SECURITY;

-- ── 4. Drop ALL known policy names (idempotent) ──────────────────────────────

DROP POLICY IF EXISTS email_configurations_admin_all          ON public.email_configurations;
DROP POLICY IF EXISTS policy_email_config_pmo_admin_all       ON public.email_configurations;
DROP POLICY IF EXISTS policy_email_config_service_role        ON public.email_configurations;
DROP POLICY IF EXISTS policy_email_config_authenticated_all   ON public.email_configurations;
DROP POLICY IF EXISTS policy_email_config_service_role_all    ON public.email_configurations;
DROP POLICY IF EXISTS policy_email_config_admin_all           ON public.email_configurations;
DROP POLICY IF EXISTS policy_email_config_service_all         ON public.email_configurations;

-- ── 5. Create two clean correct policies ─────────────────────────────────────

CREATE POLICY policy_email_config_admin_all
  ON public.email_configurations
  FOR ALL
  TO authenticated
  USING      (public.can_manage_email_configurations(auth.uid()))
  WITH CHECK (public.can_manage_email_configurations(auth.uid()));

CREATE POLICY policy_email_config_service_all
  ON public.email_configurations
  FOR ALL
  TO service_role
  USING      (TRUE)
  WITH CHECK (TRUE);

-- ── 6. Verify ────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_policies  int;
  v_fn_exists boolean;
BEGIN
  SELECT count(*) INTO v_policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename  = 'email_configurations';

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'can_manage_email_configurations'
  ) INTO v_fn_exists;

  RAISE NOTICE 'v561 applied — email_configurations: % polic(ies), helper function exists: %',
               v_policies, v_fn_exists;
END $$;
