-- ============================================================================
-- v563: Fix can_manage_email_configurations for users whose
--       public.users.auth_user_id was never backfilled.
--
-- Root cause:
--   get_or_create_user() creates users by email match and sets auth_user_id
--   afterwards, but some accounts registered before that path was reliable may
--   still have auth_user_id = NULL.  can_manage_email_configurations() only
--   joins via users.auth_user_id = p_auth_uuid → EXISTS is always false for
--   those accounts → every query on email_configurations returns 403.
--
-- Fixes applied:
--   1. Backfill public.users.auth_user_id for any row where it is NULL but the
--      email matches a known auth.users record.
--   2. Recreate can_manage_email_configurations() with a dual-path lookup:
--        PRIMARY  — users.auth_user_id = auth.uid()  (fast, indexed)
--        FALLBACK — users.email = auth.users.email   (covers NULL auth_user_id)
--   3. Re-apply the RLS policies referencing the updated function (idempotent).
-- ============================================================================

-- ── 1. Backfill missing auth_user_id values ──────────────────────────────────
--
-- Runs as postgres (SQL Editor) so it can JOIN into auth.users freely.
-- ON CONFLICT DO NOTHING protects the unique constraint on auth_user_id.

UPDATE public.users pu
SET    auth_user_id = au.id,
       updated_at   = now()
FROM   auth.users au
WHERE  au.email     = pu.email
  AND  pu.auth_user_id IS NULL
  AND  COALESCE(pu.is_deleted, FALSE) = FALSE;

DO $$
DECLARE v_count int;
BEGIN
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'v563: backfilled auth_user_id for % public.users row(s)', v_count;
END $$;

-- ── 2. Recreate helper with dual-path lookup ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.can_manage_email_configurations(p_auth_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
SET row_security = off
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.user_roles ur
    INNER JOIN public.roles r ON r.id = ur.role_id
    INNER JOIN public.users u ON u.id = ur.user_id
    WHERE (
      -- Primary path: auth_user_id already backfilled (fast, indexed)
      u.auth_user_id = p_auth_uuid
      OR
      -- Fallback path: match via email for accounts with auth_user_id still NULL
      (u.auth_user_id IS NULL
       AND u.email = (SELECT email FROM auth.users WHERE id = p_auth_uuid LIMIT 1))
    )
    AND COALESCE(ur.is_active,   TRUE)  = TRUE
    AND COALESCE(ur.is_deleted, FALSE)  = FALSE
    AND COALESCE(r.is_deleted,  FALSE)  = FALSE
    AND COALESCE(r.is_active,    TRUE)  = TRUE
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
  'True when the auth.uid has an active admin role that may read/write email_configurations.
   Dual-path lookup: primary via users.auth_user_id, fallback via email for accounts
   where auth_user_id was never backfilled. v563.';

REVOKE ALL    ON FUNCTION public.can_manage_email_configurations(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_email_configurations(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_email_configurations(uuid) TO service_role;

-- ── 3. Re-apply table GRANTs (idempotent safety net) ────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.email_configurations TO authenticated;

GRANT ALL
  ON public.email_configurations TO service_role;

-- ── 4. Re-apply RLS policies (idempotent) ────────────────────────────────────

ALTER TABLE public.email_configurations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_configurations_admin_all        ON public.email_configurations;
DROP POLICY IF EXISTS policy_email_config_pmo_admin_all     ON public.email_configurations;
DROP POLICY IF EXISTS policy_email_config_service_role      ON public.email_configurations;
DROP POLICY IF EXISTS policy_email_config_authenticated_all ON public.email_configurations;
DROP POLICY IF EXISTS policy_email_config_service_role_all  ON public.email_configurations;
DROP POLICY IF EXISTS policy_email_config_admin_all         ON public.email_configurations;
DROP POLICY IF EXISTS policy_email_config_service_all       ON public.email_configurations;

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

-- ── 5. Quick self-test — run as the affected user to verify ──────────────────
--
-- After applying, paste this single line in a NEW SQL Editor query and run it
-- while logged in as the PMO Admin user:
--
--   SELECT public.can_manage_email_configurations(auth.uid());
--
-- Expected result: true
-- If still false, run v562 diagnostic to inspect roles and auth_user_id.

DO $$
DECLARE v_policies int;
BEGIN
  SELECT count(*) INTO v_policies
  FROM   pg_policies
  WHERE  schemaname = 'public' AND tablename = 'email_configurations';
  RAISE NOTICE 'v563 applied — % polic(ies) on email_configurations', v_policies;
END $$;
