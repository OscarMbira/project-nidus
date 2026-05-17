-- v552: SECURITY DEFINER RPC to insert project_invitations (bypasses RLS)
-- One-shot alternative: SQL/v553_bundle_pmo_invitation_rpc_complete.sql (includes v551 + v552 + schema reload).
-- If v553 stopped before creating this RPC: SQL/v554_pmo_invitation_rpc_only_recovery.sql (needs v551 / is_user_pmo_admin).
--
-- Caller must be either:
--   (A) suite PMO admin — public.is_user_pmo_admin(auth.uid()), or
--   (B) active member of p_project_id — same idea as policy_invitations_insert (v85).
--
-- App calls this RPC first so inserts never rely on PostgREST surfacing SQLSTATE 42501 on errors.
--
-- Prerequisites: run v551_align_is_user_pmo_admin_suite_roles.sql FIRST (defines public.is_user_pmo_admin),
--   then this file. Without v551, CREATE FUNCTION here may fail or policies stay misaligned.
-- project_invitations table: v85.

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
  'Inserts project_invitation when caller is suite PMO admin OR active member of the project. SECURITY DEFINER; bypasses RLS.';

DO $$ BEGIN RAISE NOTICE 'v552_insert_project_invitation_pmo_rpc.sql applied'; END $$;
