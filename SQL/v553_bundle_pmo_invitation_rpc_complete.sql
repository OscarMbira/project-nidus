-- ============================================================================
-- v553 ONE-FILE BUNDLE: PMO invitations (fixes RPC 404 + REST 403)
-- ============================================================================
-- Use when the app shows:
--   · POST …/rpc/insert_project_invitation_as_pmo_admin → 404
--   · POST …/project_invitations → 403 permission denied
--
-- Run this entire script once in Supabase → SQL Editor (no need to run v551/v552 separately).
-- Same SQL is available as supabase/migrations/20260510120000_pmo_invitation_rpc_v553.sql for `supabase db push`.
-- Diagnostics if REST still 404: SQL/v555_diag_invitation_rpc.sql
-- Then hard-refresh the web app.
--
-- ORDERING: The RPC is created immediately after is_user_pmo_admin so a failure on
-- later RLS policies does not leave you with no RPC (404). If you ever stopped mid-
-- bundle with policies applied but no RPC, run SQL/v554_pmo_invitation_rpc_only_recovery.sql.
--
-- Optional: NOTIFY asks PostgREST to reload schema so the RPC appears immediately.
-- ============================================================================

-- ----- Section A: is_user_pmo_admin -----

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
  'Suite PMO/org/system/super admin per normalized role_name (matches app pmoSuiteRoleAccess).';

-- ----- Section B: invitation insert RPC (before policies — avoids 404 if a policy fails) -----

CREATE OR REPLACE FUNCTION public.insert_project_invitation_as_pmo_admin(
  p_project_id uuid,
  p_invited_email text,
  p_role_id uuid,
  p_invitation_message text,
  p_invitation_expires_at timestamptz
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_auth uuid := auth.uid();
  v_inviter_id uuid;
  v_existing_invitee uuid;
  v_row public.project_invitations%ROWTYPE;
BEGIN
  IF v_auth IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  IF NOT (
    public.is_user_pmo_admin(v_auth)
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      INNER JOIN public.users u ON u.id = ur.user_id
      WHERE u.auth_user_id = v_auth
        AND ur.project_id = p_project_id
        AND ur.is_active = TRUE
        AND COALESCE(ur.is_deleted, FALSE) = FALSE
    )
  ) THEN
    RAISE EXCEPTION 'Forbidden: PMO suite admin or active project membership required'
      USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_inviter_id FROM public.users WHERE auth_user_id = v_auth LIMIT 1;
  IF v_inviter_id IS NULL THEN
    RAISE EXCEPTION 'Inviter user profile not found' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_existing_invitee
  FROM public.users
  WHERE lower(trim(email)) = lower(trim(p_invited_email))
  LIMIT 1;

  INSERT INTO public.project_invitations (
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
    trim(p_invited_email),
    v_existing_invitee,
    p_role_id,
    v_inviter_id,
    NULLIF(trim(p_invitation_message), ''),
    p_invitation_expires_at
  )
  RETURNING * INTO v_row;

  RETURN json_build_object(
    'id', v_row.id,
    'invitation_token', v_row.invitation_token,
    'invitation_expires_at', v_row.invitation_expires_at,
    'invitation_status', v_row.invitation_status,
    'project_id', v_row.project_id,
    'invited_email', v_row.invited_email,
    'role_id', v_row.role_id,
    'created_at', v_row.created_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.insert_project_invitation_as_pmo_admin(uuid, text, uuid, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_project_invitation_as_pmo_admin(uuid, text, uuid, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_project_invitation_as_pmo_admin(uuid, text, uuid, text, timestamptz) TO service_role;

COMMENT ON FUNCTION public.insert_project_invitation_as_pmo_admin(uuid, text, uuid, text, timestamptz) IS
  'Inserts project_invitation when caller is suite PMO admin OR active project member. Bypasses RLS.';

-- ----- Section C: RLS policies (optional tables guarded) -----

DROP POLICY IF EXISTS policy_project_invitations_pmo_admin_all ON project_invitations;
CREATE POLICY policy_project_invitations_pmo_admin_all
  ON project_invitations
  FOR ALL
  TO authenticated
  USING (public.is_user_pmo_admin(auth.uid()))
  WITH CHECK (public.is_user_pmo_admin(auth.uid()));

DO $$
BEGIN
  IF to_regclass('public.project_seat_allocations') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS policy_project_seat_allocations_pmo_admin_all ON project_seat_allocations';
    EXECUTE $p$
      CREATE POLICY policy_project_seat_allocations_pmo_admin_all
        ON project_seat_allocations
        FOR ALL
        TO authenticated
        USING (public.is_user_pmo_admin(auth.uid()))
        WITH CHECK (public.is_user_pmo_admin(auth.uid()))
    $p$;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.project_memberships') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS policy_project_memberships_pmo_admin_all ON project_memberships';
    EXECUTE $p$
      CREATE POLICY policy_project_memberships_pmo_admin_all
        ON project_memberships
        FOR ALL
        TO authenticated
        USING (public.is_user_pmo_admin(auth.uid()))
        WITH CHECK (public.is_user_pmo_admin(auth.uid()))
    $p$;
  END IF;
END $$;

-- Ask PostgREST to refresh schema cache (RPC 404 until reload on some projects)
NOTIFY pgrst, 'reload schema';

DO $$ BEGIN RAISE NOTICE 'v553_bundle_pmo_invitation_rpc_complete.sql applied — reload the web app'; END $$;
