-- ============================================================================
-- v403: Fix two bugs introduced in v402
--
-- Bug 1 (critical): regex '\s' is NOT a whitespace class in PostgreSQL POSIX
--   regex. '[\s-]+' only matches backslash, 's', and '-' — NOT spaces.
--   Role names like "PMO Admin" fail to normalise → is_user_pmo_admin returns
--   false → every RLS policy blocks the INSERT → "permission denied".
--   Fix: use '[[:space:]]' (POSIX character class) as in v400.
--
-- Bug 2: policy_project_invitations_sender_can_insert used an inline subquery
--   on `users`. The `users` table has its own RLS that blocks the subquery in
--   the invoker context ("nested RLS" problem). Fix: replace with a tiny
--   SECURITY DEFINER helper (row_security=off) so it bypasses nested RLS.
--
-- Run in Supabase SQL Editor → Pause → Resume → test.
-- ============================================================================

-- ============================================================================
-- 1. Fix is_user_pmo_admin — correct POSIX regex [[:space:]] for spaces
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
      AND lower(
            regexp_replace(
              regexp_replace(
                trim(COALESCE(r.role_name, '')),
                '[[:space:]]+', '_', 'g'   -- POSIX, matches real spaces
              ),
              '-', '_', 'g'                -- second pass for hyphens
            )
          ) IN ('pmo_admin', 'org_admin', 'system_admin', 'super_admin')
  );
$$;

REVOKE ALL ON FUNCTION public.is_user_pmo_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_user_pmo_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_pmo_admin(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_user_pmo_admin(uuid) TO anon;

COMMENT ON FUNCTION public.is_user_pmo_admin(uuid) IS
  'v403: Checks pmo_admin|org_admin|system_admin|super_admin via POSIX regex (no role-level flag checks, matching JS matchesPmoSuiteAdminRole). SECURITY DEFINER + row_security=off.';

-- ============================================================================
-- 2. SECURITY DEFINER helper for the sender policy
--    Checks invited_by_user_id belongs to the current JWT user.
--    Runs with row_security=off so users table RLS does not block the lookup.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_invited_by_auth_user(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = p_user_id
      AND auth_user_id = COALESCE(
        NULLIF(current_setting('request.jwt.claim.sub', true), ''),
        (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
      )::uuid
  );
$$;

REVOKE ALL ON FUNCTION public.is_invited_by_auth_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_invited_by_auth_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_invited_by_auth_user(uuid) TO service_role;

COMMENT ON FUNCTION public.is_invited_by_auth_user(uuid) IS
  'v403: Returns true when the given users.id belongs to the current JWT caller. Used in RLS to allow invitations where invited_by_user_id = current user. Bypasses users table RLS via row_security=off.';

-- ============================================================================
-- 3. Re-create RLS policies using the fixed helpers
-- ============================================================================

-- PMO admin full access (all 4 role variants via fixed is_user_pmo_admin)
DROP POLICY IF EXISTS policy_project_invitations_pmo_admin_all ON project_invitations;
CREATE POLICY policy_project_invitations_pmo_admin_all
  ON project_invitations
  FOR ALL
  TO authenticated
  USING      (public.is_user_pmo_admin(auth.uid()))
  WITH CHECK (public.is_user_pmo_admin(auth.uid()));

-- Fallback INSERT: any authenticated user may insert where they are the inviter.
-- Uses SECURITY DEFINER helper to bypass nested RLS on users table.
DROP POLICY IF EXISTS policy_project_invitations_sender_can_insert ON project_invitations;
CREATE POLICY policy_project_invitations_sender_can_insert
  ON project_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_invited_by_auth_user(invited_by_user_id));

-- project_seat_allocations and project_memberships
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
-- 4. Recreate insert_project_invitation_as_pmo_admin with fixed regex
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
  -- Auth via JWT GUC, then auth.uid() fallback
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

  -- PMO admin check with correct POSIX regex for PostgreSQL
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    INNER JOIN roles r ON r.id = ur.role_id
    INNER JOIN users u ON u.id = ur.user_id
    WHERE u.auth_user_id = v_caller_uid
      AND ur.is_active = TRUE
      AND COALESCE(ur.is_deleted, FALSE) = FALSE
      AND lower(
            regexp_replace(
              regexp_replace(
                trim(COALESCE(r.role_name, '')),
                '[[:space:]]+', '_', 'g'
              ),
              '-', '_', 'g'
            )
          ) IN ('pmo_admin', 'org_admin', 'system_admin', 'super_admin')
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

REVOKE ALL ON FUNCTION public.insert_project_invitation_as_pmo_admin(uuid, text, uuid, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_project_invitation_as_pmo_admin(uuid, text, uuid, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_project_invitation_as_pmo_admin(uuid, text, uuid, text, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.insert_project_invitation_as_pmo_admin(uuid, text, uuid, text, timestamptz) TO anon;

COMMENT ON FUNCTION public.insert_project_invitation_as_pmo_admin(uuid, text, uuid, text, timestamptz) IS
  'v403: SECURITY DEFINER RPC. Auth via GUC+fallback. Fixed POSIX regex for role name normalisation. Re-queries row for AFTER-trigger tokens.';

-- ============================================================================
-- 5. Verify
-- ============================================================================
DO $$
DECLARE
  cnt int;
BEGIN
  SELECT COUNT(*) INTO cnt FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'insert_project_invitation_as_pmo_admin';
  RAISE NOTICE '[VERIFY] insert_project_invitation_as_pmo_admin overloads: % (want 1)', cnt;

  SELECT COUNT(*) INTO cnt FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'is_invited_by_auth_user';
  RAISE NOTICE '[VERIFY] is_invited_by_auth_user exists: % (want 1)', cnt;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='project_invitations' AND policyname='policy_project_invitations_sender_can_insert') THEN
    RAISE NOTICE '[VERIFY] sender_can_insert policy: OK';
  ELSE
    RAISE WARNING '[VERIFY] sender_can_insert policy: MISSING';
  END IF;

  RAISE NOTICE 'Done. Pause → Resume Supabase, wait 60 s, test Send Invite.';
END $$;

NOTIFY pgrst, 'reload schema';
