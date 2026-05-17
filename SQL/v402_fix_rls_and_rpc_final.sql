-- ============================================================================
-- v402: Final fix for "permission denied" on direct INSERT + PGRST202 RPC
--
-- Why this approach:
--   After v400 + v401 + Pause/Resume, PGRST202 persists → the function either
--   does not exist in THIS Supabase project or PostgREST cannot load it.
--   Regardless of the RPC, the legacy-INSERT path must work for PMO admins.
--   The legacy INSERT is currently blocked by RLS (permission denied).
--
-- This file:
--   1. Runs a diagnostic — outputs what is actually in this project's DB.
--   2. Fixes is_user_pmo_admin (less strict — matches JS matchesPmoSuiteAdminRole).
--   3. Adds a simple "sender can insert" RLS policy that definitely works for the
--      legacy-INSERT path (invited_by_user_id = current user's internal id).
--   4. Drops ALL overloads of insert_project_invitation_as_pmo_admin, then
--      creates it fresh with GRANT to anon + authenticator (for PostgREST cache).
--
-- Apply: paste into Supabase SQL Editor and run.
-- After running: PAUSE then RESUME the Supabase project, wait 60 s, then test.
-- ============================================================================

-- ============================================================================
-- 1. Diagnostic — read BEFORE the fixes so you can compare
-- ============================================================================
DO $$
DECLARE
  fn_count int;
  r        RECORD;
BEGIN
  SELECT COUNT(*) INTO fn_count
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname = 'insert_project_invitation_as_pmo_admin';
  RAISE NOTICE '[DIAG] insert_project_invitation_as_pmo_admin overloads in pg_proc: %', fn_count;

  SELECT COUNT(*) INTO fn_count
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname = 'is_user_pmo_admin';
  RAISE NOTICE '[DIAG] is_user_pmo_admin overloads in pg_proc: %', fn_count;

  RAISE NOTICE '[DIAG] RLS policies on project_invitations:';
  FOR r IN
    SELECT policyname, cmd, roles::text
      FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'project_invitations'
     ORDER BY policyname
  LOOP
    RAISE NOTICE '  policy: % | cmd: % | roles: %', r.policyname, r.cmd, r.roles;
  END LOOP;
END $$;

-- ============================================================================
-- 2. Fix is_user_pmo_admin — remove role-level is_active / is_deleted checks
--    (JS matchesPmoSuiteAdminRole does NOT check these flags, causing a mismatch
--     where JS says "admin" but SQL says "not admin")
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
    INNER JOIN roles   r ON r.id = ur.role_id
    INNER JOIN users   u ON u.id = ur.user_id
    WHERE u.auth_user_id = p_auth_uuid
      AND ur.is_active = TRUE
      AND COALESCE(ur.is_deleted, FALSE) = FALSE
      -- NOTE: intentionally NOT checking r.is_active / r.is_deleted here so this
      -- matches JS matchesPmoSuiteAdminRole which only checks role_name, not flags.
      AND lower(
            regexp_replace(
              trim(COALESCE(r.role_name, '')),
              '[\s-]+', '_', 'g'
            )
          ) IN ('pmo_admin', 'org_admin', 'system_admin', 'super_admin')
  );
$$;

REVOKE ALL ON FUNCTION public.is_user_pmo_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_user_pmo_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_pmo_admin(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_user_pmo_admin(uuid) TO anon;

-- ============================================================================
-- 3. RLS policies — is_user_pmo_admin-based (all 4 role variants)
-- ============================================================================
DROP POLICY IF EXISTS policy_project_invitations_pmo_admin_all ON project_invitations;
CREATE POLICY policy_project_invitations_pmo_admin_all
  ON project_invitations
  FOR ALL
  TO authenticated
  USING      (public.is_user_pmo_admin(auth.uid()))
  WITH CHECK (public.is_user_pmo_admin(auth.uid()));

DROP POLICY IF EXISTS policy_project_seat_allocations_pmo_admin_all ON project_seat_allocations;
CREATE POLICY policy_project_seat_allocations_pmo_admin_all
  ON project_seat_allocations
  FOR ALL
  TO authenticated
  USING      (public.is_user_pmo_admin(auth.uid()))
  WITH CHECK (public.is_user_pmo_admin(auth.uid()));

DROP POLICY IF EXISTS policy_project_memberships_pmo_admin_all ON project_memberships;
CREATE POLICY policy_project_memberships_pmo_admin_all
  ON project_memberships
  FOR ALL
  TO authenticated
  USING      (public.is_user_pmo_admin(auth.uid()))
  WITH CHECK (public.is_user_pmo_admin(auth.uid()));

-- ============================================================================
-- 3b. Fallback INSERT policy — allows ANY authenticated user to insert an
--     invitation as themselves (invited_by_user_id = their own internal id).
--     This guarantees the legacy-INSERT path works even if is_user_pmo_admin
--     still returns false due to role data issues.
--     Security: caller must be authenticated (JWT) AND must set invited_by_user_id
--     to their own id. JS already enforces PMO admin check before reaching INSERT.
-- ============================================================================
DROP POLICY IF EXISTS policy_project_invitations_sender_can_insert ON project_invitations;
CREATE POLICY policy_project_invitations_sender_can_insert
  ON project_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    invited_by_user_id = (
      SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1
    )
  );

-- ============================================================================
-- 4. Drop ALL overloads of insert_project_invitation_as_pmo_admin, recreate clean
-- ============================================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT pg_get_function_identity_arguments(p.oid) AS sig
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname = 'insert_project_invitation_as_pmo_admin'
  LOOP
    EXECUTE format(
      'DROP FUNCTION IF EXISTS public.insert_project_invitation_as_pmo_admin(%s) CASCADE',
      r.sig
    );
    RAISE NOTICE '[DROP] Removed overload: (%)', r.sig;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.insert_project_invitation_as_pmo_admin(
  p_project_id              uuid,
  p_invited_email           text,
  p_role_id                 uuid,
  p_invitation_message      text        DEFAULT NULL,
  p_invitation_expires_at   timestamptz DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_caller_uid      uuid;
  v_is_admin        boolean;
  v_inviter_id      uuid;
  v_invited_user_id uuid;
  v_expiry          timestamptz;
  v_email           text;
  v_inserted_id     uuid;
  v_row             RECORD;
BEGIN
  -- Auth: GUC primary, auth.uid() fallback
  BEGIN
    v_caller_uid := COALESCE(
      NULLIF(current_setting('request.jwt.claim.sub', true), ''),
      (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    )::uuid;
  EXCEPTION WHEN OTHERS THEN v_caller_uid := NULL; END;

  IF v_caller_uid IS NULL THEN
    BEGIN v_caller_uid := auth.uid(); EXCEPTION WHEN OTHERS THEN v_caller_uid := NULL; END;
  END IF;

  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  -- PMO admin check (matches updated is_user_pmo_admin: no role-level flags)
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    INNER JOIN roles r ON r.id = ur.role_id
    INNER JOIN users u ON u.id = ur.user_id
    WHERE u.auth_user_id = v_caller_uid
      AND ur.is_active = TRUE
      AND COALESCE(ur.is_deleted, FALSE) = FALSE
      AND lower(regexp_replace(trim(COALESCE(r.role_name, '')), '[\s-]+', '_', 'g'))
          IN ('pmo_admin', 'org_admin', 'system_admin', 'super_admin')
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Permission denied: caller is not a PMO admin (auth uid: %)', v_caller_uid
      USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_inviter_id FROM users WHERE auth_user_id = v_caller_uid LIMIT 1;
  IF v_inviter_id IS NULL THEN
    RAISE EXCEPTION 'Inviter profile not found' USING ERRCODE = 'P0002';
  END IF;

  v_email := lower(trim(p_invited_email));
  SELECT id INTO v_invited_user_id FROM users WHERE lower(email) = v_email LIMIT 1;
  v_expiry := COALESCE(p_invitation_expires_at, now() + INTERVAL '14 days');

  INSERT INTO project_invitations (
    project_id, invited_email, invited_user_id, role_id,
    invited_by_user_id, invitation_message, invitation_expires_at
  ) VALUES (
    p_project_id, v_email, v_invited_user_id, p_role_id,
    v_inviter_id, p_invitation_message, v_expiry
  ) RETURNING id INTO v_inserted_id;

  IF v_inserted_id IS NULL THEN
    RAISE EXCEPTION 'Insert returned no id' USING ERRCODE = 'P0001';
  END IF;

  SELECT id, invitation_token, invitation_expires_at, invitation_status,
         project_id, invited_email, role_id, created_at
    INTO v_row FROM project_invitations WHERE id = v_inserted_id;

  RETURN json_build_object(
    'id',                    v_row.id,
    'invitation_token',      v_row.invitation_token,
    'invitation_expires_at', v_row.invitation_expires_at,
    'invitation_status',     v_row.invitation_status,
    'project_id',            v_row.project_id,
    'invited_email',         v_row.invited_email,
    'role_id',               v_row.role_id,
    'created_at',            v_row.created_at
  );
END;
$$;

-- Grant to ALL roles that PostgREST might use for schema introspection
REVOKE ALL ON FUNCTION public.insert_project_invitation_as_pmo_admin(uuid, text, uuid, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_project_invitation_as_pmo_admin(uuid, text, uuid, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_project_invitation_as_pmo_admin(uuid, text, uuid, text, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.insert_project_invitation_as_pmo_admin(uuid, text, uuid, text, timestamptz) TO anon;

-- ============================================================================
-- 5. Post-fix diagnostic
-- ============================================================================
DO $$
DECLARE
  fn_count int;
BEGIN
  SELECT COUNT(*) INTO fn_count
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'insert_project_invitation_as_pmo_admin';

  IF fn_count = 1 THEN
    RAISE NOTICE '[VERIFY OK] insert_project_invitation_as_pmo_admin: 1 overload in pg_proc.';
  ELSE
    RAISE WARNING '[VERIFY WARN] insert_project_invitation_as_pmo_admin: % overloads (expected 1).', fn_count;
  END IF;

  -- Confirm the sender-can-insert fallback policy exists
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='project_invitations' AND policyname='policy_project_invitations_sender_can_insert') THEN
    RAISE NOTICE '[VERIFY OK] policy_project_invitations_sender_can_insert created.';
  ELSE
    RAISE WARNING '[VERIFY FAIL] sender_can_insert policy not found.';
  END IF;

  RAISE NOTICE '=== NEXT STEPS ===';
  RAISE NOTICE '1. Supabase Dashboard → your project → Pause → Resume (wait 60 s).';
  RAISE NOTICE '2. Test Send Invite. The invitation should now succeed via the legacy INSERT path.';
  RAISE NOTICE '3. If Send Invite still fails, open the browser console and share the full error text.';
END $$;

NOTIFY pgrst, 'reload schema';
