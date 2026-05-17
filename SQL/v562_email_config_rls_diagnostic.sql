-- ============================================================================
-- v562: Diagnostic — email_configurations RLS debug
--
-- Run this in Supabase SQL Editor WHILE LOGGED IN AS THE AFFECTED USER
-- (use the "Run as" option, or paste the auth.uid() manually).
-- Read the NOTICE output — it shows exactly why access is denied.
-- ============================================================================

DO $$
DECLARE
  v_auth_uid      uuid;
  v_user_id       uuid;
  v_auth_id_set   boolean;
  v_role_count    int;
  v_role_names    text;
  v_fn_result     boolean;
  v_policy_count  int;
  v_grant_ok      boolean;
BEGIN
  -- ── Current auth.uid() ──────────────────────────────────────────────────
  v_auth_uid := auth.uid();
  RAISE NOTICE '── Auth UID (auth.uid()): %', COALESCE(v_auth_uid::text, 'NULL — not authenticated');

  IF v_auth_uid IS NULL THEN
    RAISE NOTICE 'STOP: auth.uid() is NULL. You must run this while authenticated.';
    RETURN;
  END IF;

  -- ── public.users record ─────────────────────────────────────────────────
  SELECT id, (auth_user_id IS NOT NULL)
  INTO   v_user_id, v_auth_id_set
  FROM   public.users
  WHERE  auth_user_id = v_auth_uid
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'PROBLEM: No public.users row with auth_user_id = %. The RLS helper will always return FALSE.', v_auth_uid;
    RAISE NOTICE 'Fix: ensure the user registration flow sets users.auth_user_id = auth.uid().';
  ELSE
    RAISE NOTICE '✓ public.users.id = %  (auth_user_id set: %)', v_user_id, v_auth_id_set;
  END IF;

  -- ── Roles assigned to this user ─────────────────────────────────────────
  SELECT count(*),
         string_agg(r.role_name, ', ' ORDER BY r.role_name)
  INTO   v_role_count, v_role_names
  FROM   public.user_roles ur
  JOIN   public.roles r ON r.id = ur.role_id
  WHERE  ur.user_id = v_user_id
    AND  COALESCE(ur.is_active, TRUE)   = TRUE
    AND  COALESCE(ur.is_deleted, FALSE) = FALSE
    AND  COALESCE(r.is_active,  TRUE)   = TRUE
    AND  COALESCE(r.is_deleted, FALSE)  = FALSE;

  RAISE NOTICE 'Active roles for this user (%): %', v_role_count, COALESCE(v_role_names, '(none)');

  IF v_role_count = 0 THEN
    RAISE NOTICE 'PROBLEM: User has no active roles → can_manage_email_configurations() will return FALSE.';
  END IF;

  -- ── can_manage_email_configurations() result ─────────────────────────────
  v_fn_result := public.can_manage_email_configurations(v_auth_uid);
  IF v_fn_result THEN
    RAISE NOTICE '✓ can_manage_email_configurations() = TRUE — RLS should allow access.';
  ELSE
    RAISE NOTICE 'PROBLEM: can_manage_email_configurations() = FALSE — RLS will deny access.';
    RAISE NOTICE 'Roles allowed: pmo_admin, org_admin, system_admin, super_admin, system_administrator, superuser, account_owner';
    RAISE NOTICE 'User roles found: %', COALESCE(v_role_names, '(none)');
  END IF;

  -- ── Active policies on email_configurations ──────────────────────────────
  SELECT count(*) INTO v_policy_count
  FROM   pg_policies
  WHERE  schemaname = 'public'
    AND  tablename  = 'email_configurations';

  RAISE NOTICE 'Policies on email_configurations: %', v_policy_count;

  IF v_policy_count = 0 THEN
    RAISE NOTICE 'PROBLEM: No policies exist — all access denied. Run v561 first.';
  END IF;

END $$;

-- ── Show all current policies on the table ───────────────────────────────────
SELECT policyname, cmd, roles, qual, with_check
FROM   pg_policies
WHERE  schemaname = 'public'
  AND  tablename  = 'email_configurations'
ORDER  BY policyname;

-- ── Show table-level grants ──────────────────────────────────────────────────
SELECT grantee, privilege_type, is_grantable
FROM   information_schema.role_table_grants
WHERE  table_schema = 'public'
  AND  table_name   = 'email_configurations'
ORDER  BY grantee, privilege_type;
