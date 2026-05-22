-- =============================================================================
-- v597_invite_rpc_pm_permissions_and_names.sql
-- Restore PM project_memberships invite auth (v579) + invitee names (v586) + timeout (v582)
-- Run when invites time out or PM gets Forbidden after v586 was applied alone.
-- Prerequisites: v556/v557 (RLS), v580 (roles), project_permission_matches (v579)
-- =============================================================================

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
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.insert_project_invitation_as_pmo_admin(
  p_project_id uuid,
  p_invited_email text,
  p_role_id uuid,
  p_invitation_message text DEFAULT NULL,
  p_invitation_expires_at timestamptz DEFAULT NULL,
  p_invited_first_name text DEFAULT NULL,
  p_invited_last_name text DEFAULT NULL
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
  PERFORM set_config('statement_timeout', '15000', true);

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
    OR EXISTS (
      SELECT 1
      FROM public.project_memberships pm
      INNER JOIN public.users u ON u.id = pm.user_id
      INNER JOIN public.project_roles pr ON pr.id = pm.project_role_id
      WHERE u.auth_user_id = v_auth
        AND pm.project_id = p_project_id
        AND pm.is_active = TRUE
        AND COALESCE(pm.invitation_status, 'accepted') IN ('accepted', 'pending')
        AND pr.is_active = TRUE
        AND (
          public.project_permission_matches(pr.permissions, 'user.invite')
          OR pr.role_name IN (
            'project_manager', 'programme_manager',
            'project_board_member', 'project_sponsor'
          )
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.projects p
      INNER JOIN public.users u ON u.id = p.project_manager_user_id
      WHERE p.id = p_project_id
        AND u.auth_user_id = v_auth
        AND COALESCE(p.is_deleted, FALSE) = FALSE
    )
  ) THEN
    RAISE EXCEPTION 'Forbidden: PMO suite admin or project invite access required'
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
    invitation_expires_at,
    invited_first_name,
    invited_last_name,
    entity_type
  )
  VALUES (
    p_project_id,
    trim(p_invited_email),
    v_existing_invitee,
    p_role_id,
    v_inviter_id,
    NULLIF(trim(p_invitation_message), ''),
    p_invitation_expires_at,
    NULLIF(trim(p_invited_first_name), ''),
    NULLIF(trim(p_invited_last_name), ''),
    'project'
  )
  RETURNING * INTO v_row;

  RETURN json_build_object(
    'id', v_row.id,
    'invitation_token', v_row.invitation_token,
    'invitation_expires_at', v_row.invitation_expires_at,
    'invitation_status', v_row.invitation_status,
    'project_id', v_row.project_id,
    'invited_email', v_row.invited_email,
    'invited_first_name', v_row.invited_first_name,
    'invited_last_name', v_row.invited_last_name,
    'role_id', v_row.role_id,
    'created_at', v_row.created_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.insert_project_invitation_as_pmo_admin(uuid, text, uuid, text, timestamptz, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_project_invitation_as_pmo_admin(uuid, text, uuid, text, timestamptz, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_project_invitation_as_pmo_admin(uuid, text, uuid, text, timestamptz, text, text) TO service_role;

COMMENT ON FUNCTION public.insert_project_invitation_as_pmo_admin(uuid, text, uuid, text, timestamptz, text, text) IS
  'Inserts project invitation: PMO admin, legacy user_roles, project_memberships PM roles, or project manager on project (v597).';

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE 'v597_invite_rpc_pm_permissions_and_names.sql applied';
END $$;
