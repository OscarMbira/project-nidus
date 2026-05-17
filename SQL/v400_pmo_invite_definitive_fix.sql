-- ============================================================================
-- v400: Definitive PMO Invitation Fix — consolidated, idempotent
--
-- Root-cause of "Database setup required" error chain:
--   1. v398_pmo_admin_rls_helper_row_security.sql OVERWROTE is_user_pmo_admin
--      with a version that only checks role_name = 'pmo_admin' exactly, breaking
--      org_admin / system_admin / super_admin support.
--   2. insert_project_invitation_as_pmo_admin RPC was never deployed (404 from
--      PostgREST → JS falls to legacy INSERT → RLS blocks → "permission denied").
--
-- This file:
--   A. Restores is_user_pmo_admin with all 4 role variants + normalization.
--   B. Re-creates all PMO RLS policies to use the fixed helper.
--   C. Creates insert_project_invitation_as_pmo_admin using current_setting()
--      auth (immune to EXECUTE-grant issues in SECURITY DEFINER context).
--   D. Outputs a verification checklist at the end.
--
-- Prerequisites: project_invitations table (v85+), user_roles, roles, users.
-- Apply: paste into Supabase SQL Editor and run. Wait 30 s, then test.
-- If still 404 after 30 s → Supabase Dashboard → project → Pause → Resume.
-- ============================================================================

-- ============================================================================
-- A. Restore is_user_pmo_admin with all 4 role variants
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
    INNER JOIN roles   r ON r.id  = ur.role_id
    INNER JOIN users   u ON u.id  = ur.user_id
    WHERE u.auth_user_id = p_auth_uuid
      AND ur.is_active                     = TRUE
      AND COALESCE(ur.is_deleted,  FALSE)  = FALSE
      AND COALESCE(r.is_deleted,   FALSE)  = FALSE
      AND COALESCE(r.is_active,    TRUE)   = TRUE
      AND lower(
            regexp_replace(
              regexp_replace(
                trim(COALESCE(r.role_name, '')),
                '[[:space:]]+', '_', 'g'
              ),
              '-', '_', 'g'
            )
          ) IN ('pmo_admin', 'org_admin', 'system_admin', 'super_admin')
  );
$$;

REVOKE ALL ON FUNCTION public.is_user_pmo_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_user_pmo_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_pmo_admin(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_user_pmo_admin(uuid) TO anon;

COMMENT ON FUNCTION public.is_user_pmo_admin(uuid) IS
  'v400: Returns true when auth_uuid has pmo_admin, org_admin, system_admin, or super_admin role (normalised). SECURITY DEFINER + row_security=off so nested RLS cannot hide role rows.';

-- ============================================================================
-- B. Re-create PMO RLS policies using the fixed helper
-- ============================================================================

-- project_invitations
DROP POLICY IF EXISTS policy_project_invitations_pmo_admin_all ON project_invitations;
CREATE POLICY policy_project_invitations_pmo_admin_all
  ON project_invitations
  FOR ALL
  TO authenticated
  USING      (public.is_user_pmo_admin(auth.uid()))
  WITH CHECK (public.is_user_pmo_admin(auth.uid()));

-- project_seat_allocations
DROP POLICY IF EXISTS policy_project_seat_allocations_pmo_admin_all ON project_seat_allocations;
CREATE POLICY policy_project_seat_allocations_pmo_admin_all
  ON project_seat_allocations
  FOR ALL
  TO authenticated
  USING      (public.is_user_pmo_admin(auth.uid()))
  WITH CHECK (public.is_user_pmo_admin(auth.uid()));

-- project_memberships
DROP POLICY IF EXISTS policy_project_memberships_pmo_admin_all ON project_memberships;
CREATE POLICY policy_project_memberships_pmo_admin_all
  ON project_memberships
  FOR ALL
  TO authenticated
  USING      (public.is_user_pmo_admin(auth.uid()))
  WITH CHECK (public.is_user_pmo_admin(auth.uid()));

-- ============================================================================
-- C. Create insert_project_invitation_as_pmo_admin RPC
--    Uses current_setting() for auth UID (avoids EXECUTE-grant issues with
--    auth.uid() in SECURITY DEFINER + SET search_path = public context).
--    Falls back to auth.uid() if the GUC is not set.
--    Re-queries the inserted row after INSERT so AFTER-trigger tokens are captured.
-- ============================================================================
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
  -- -------------------------------------------------------------------------
  -- 1. Resolve calling user's UUID from JWT GUC (primary) then auth.uid() (fallback).
  --    current_setting with missing_ok=true returns NULL instead of raising when absent.
  -- -------------------------------------------------------------------------
  BEGIN
    v_caller_uid := COALESCE(
      NULLIF(current_setting('request.jwt.claim.sub', true), ''),
      (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    )::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_caller_uid := NULL;
  END;

  -- Fallback: auth.uid() (works when postgres role has EXECUTE, which it does as superuser)
  IF v_caller_uid IS NULL THEN
    BEGIN
      v_caller_uid := auth.uid();
    EXCEPTION WHEN OTHERS THEN
      v_caller_uid := NULL;
    END;
  END IF;

  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated — no valid JWT sub claim in session'
      USING ERRCODE = '28000';
  END IF;

  -- -------------------------------------------------------------------------
  -- 2. Inline PMO admin check (all 4 role variants, normalised).
  --    row_security=off means user_roles/roles/users joins are unrestricted.
  -- -------------------------------------------------------------------------
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    INNER JOIN roles   r ON r.id  = ur.role_id
    INNER JOIN users   u ON u.id  = ur.user_id
    WHERE u.auth_user_id = v_caller_uid
      AND ur.is_active                     = TRUE
      AND COALESCE(ur.is_deleted,  FALSE)  = FALSE
      AND COALESCE(r.is_deleted,   FALSE)  = FALSE
      AND COALESCE(r.is_active,    TRUE)   = TRUE
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

  -- -------------------------------------------------------------------------
  -- 3. Resolve the inviter's internal users.id
  -- -------------------------------------------------------------------------
  SELECT id INTO v_inviter_id
    FROM users
   WHERE auth_user_id = v_caller_uid
   LIMIT 1;

  IF v_inviter_id IS NULL THEN
    RAISE EXCEPTION 'Inviter profile not found for auth uid %', v_caller_uid
      USING ERRCODE = 'P0002';
  END IF;

  -- -------------------------------------------------------------------------
  -- 4. Normalise email; look up existing platform user (may be NULL)
  -- -------------------------------------------------------------------------
  v_email := lower(trim(p_invited_email));

  SELECT id INTO v_invited_user_id
    FROM users
   WHERE lower(email) = v_email
   LIMIT 1;

  -- -------------------------------------------------------------------------
  -- 5. Default expiry to 14 days when caller did not supply one
  -- -------------------------------------------------------------------------
  v_expiry := COALESCE(p_invitation_expires_at, now() + INTERVAL '14 days');

  -- -------------------------------------------------------------------------
  -- 6. Insert (capture id only — RETURNING misses AFTER-trigger values like token)
  -- -------------------------------------------------------------------------
  INSERT INTO project_invitations (
    project_id,
    invited_email,
    invited_user_id,
    role_id,
    invited_by_user_id,
    invitation_message,
    invitation_expires_at
  )
  VALUES (
    p_project_id,
    v_email,
    v_invited_user_id,
    p_role_id,
    v_inviter_id,
    p_invitation_message,
    v_expiry
  )
  RETURNING id INTO v_inserted_id;

  IF v_inserted_id IS NULL THEN
    RAISE EXCEPTION 'Invitation insert returned no id — check project_invitations constraints'
      USING ERRCODE = 'P0001';
  END IF;

  -- -------------------------------------------------------------------------
  -- 7. Re-query committed row so AFTER-trigger values (e.g. invitation_token) are included
  -- -------------------------------------------------------------------------
  SELECT
    id,
    invitation_token,
    invitation_expires_at,
    invitation_status,
    project_id,
    invited_email,
    role_id,
    created_at
  INTO v_row
  FROM project_invitations
  WHERE id = v_inserted_id;

  -- -------------------------------------------------------------------------
  -- 8. Return JSON for JS parseInvitationRpcPayload()
  -- -------------------------------------------------------------------------
  RETURN json_build_object(
    'id',                     v_row.id,
    'invitation_token',       v_row.invitation_token,
    'invitation_expires_at',  v_row.invitation_expires_at,
    'invitation_status',      v_row.invitation_status,
    'project_id',             v_row.project_id,
    'invited_email',          v_row.invited_email,
    'role_id',                v_row.role_id,
    'created_at',             v_row.created_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.insert_project_invitation_as_pmo_admin(uuid, text, uuid, text, timestamptz)
  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.insert_project_invitation_as_pmo_admin(uuid, text, uuid, text, timestamptz)
  TO authenticated;

GRANT EXECUTE ON FUNCTION public.insert_project_invitation_as_pmo_admin(uuid, text, uuid, text, timestamptz)
  TO service_role;

COMMENT ON FUNCTION public.insert_project_invitation_as_pmo_admin(uuid, text, uuid, text, timestamptz) IS
  'v400: SECURITY DEFINER RPC. Auth via current_setting() GUC with auth.uid() fallback. Inline 4-role admin check. Re-queries inserted row to capture AFTER-trigger tokens. Returns JSON with id, invitation_token, and related fields.';

-- ============================================================================
-- D. Verification — confirms what was just deployed
-- ============================================================================
DO $$
DECLARE
  fn_count int;
  policy_count int;
BEGIN
  -- Check insert_project_invitation_as_pmo_admin
  SELECT COUNT(*) INTO fn_count
    FROM pg_proc p
    INNER JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname = 'insert_project_invitation_as_pmo_admin';

  IF fn_count = 0 THEN
    RAISE WARNING 'VERIFY FAIL: insert_project_invitation_as_pmo_admin NOT found in pg_proc';
  ELSIF fn_count > 1 THEN
    RAISE WARNING 'VERIFY WARN: % overloads of insert_project_invitation_as_pmo_admin found — PostgREST may return 404 due to ambiguity. Drop older signatures.', fn_count;
  ELSE
    RAISE NOTICE 'VERIFY OK: insert_project_invitation_as_pmo_admin deployed (1 overload)';
  END IF;

  -- Check is_user_pmo_admin
  SELECT COUNT(*) INTO fn_count
    FROM pg_proc p
    INNER JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname = 'is_user_pmo_admin';

  IF fn_count = 0 THEN
    RAISE WARNING 'VERIFY FAIL: is_user_pmo_admin NOT found';
  ELSE
    RAISE NOTICE 'VERIFY OK: is_user_pmo_admin deployed (% overload(s))', fn_count;
  END IF;

  -- Check PMO RLS policies
  SELECT COUNT(*) INTO policy_count
    FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename  = 'project_invitations'
     AND policyname = 'policy_project_invitations_pmo_admin_all';

  IF policy_count = 0 THEN
    RAISE WARNING 'VERIFY FAIL: policy_project_invitations_pmo_admin_all not found on project_invitations';
  ELSE
    RAISE NOTICE 'VERIFY OK: policy_project_invitations_pmo_admin_all active on project_invitations';
  END IF;

  RAISE NOTICE 'v400_pmo_invite_definitive_fix.sql complete. Wait 30 s then test. If still 404: Supabase Dashboard → Pause → Resume.';
END $$;

-- Trigger PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
