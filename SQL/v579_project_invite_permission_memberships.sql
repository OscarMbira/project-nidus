-- ============================================================================
-- v579: Align invite permission checks with project_memberships + project_roles
-- ============================================================================
-- Fixes false "You may not have invite permission" when users are assigned via
-- project_memberships (project_manager, programme_manager, etc.) instead of legacy
-- user_roles + role_permissions.
--
-- Also extends insert_project_invitation_as_pmo_admin so those members can invite.
-- Prerequisites: v87, v91, v556 (or v553 invitation RPC)
-- PostgreSQL 15+ (Supabase)
-- ============================================================================

-- Permission codes treated as equivalent for member invites
CREATE OR REPLACE FUNCTION public.project_permission_matches(
  p_role_permissions jsonb,
  p_permission_code varchar
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_role_permissions IS NULL OR jsonb_typeof(p_role_permissions) <> 'array' THEN FALSE
    WHEN p_permission_code IN ('user.invite', 'project.manage_users') THEN
      p_role_permissions @> '["user.invite"]'::jsonb
      OR p_role_permissions @> '["project.manage_users"]'::jsonb
    ELSE
      p_role_permissions @> jsonb_build_array(p_permission_code)
  END;
$$;

COMMENT ON FUNCTION public.project_permission_matches(jsonb, varchar) IS
  'True when project_roles.permissions JSONB array includes the code (user.invite ↔ project.manage_users).';

-- ---------------------------------------------------------------------------
-- has_project_permission: legacy user_roles OR project_memberships
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION has_project_permission(
    p_auth_user_id UUID,
    p_project_id UUID,
    p_permission_code VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
    v_has_permission BOOLEAN;
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id
    FROM users
    WHERE auth_user_id = p_auth_user_id;

    IF v_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM user_roles ur
        INNER JOIN role_permissions rp ON rp.role_id = ur.role_id
        INNER JOIN permissions p ON p.id = rp.permission_id
        WHERE ur.user_id = v_user_id
        AND ur.project_id = p_project_id
        AND ur.is_active = TRUE
        AND ur.is_deleted = FALSE
        AND rp.is_active = TRUE
        AND rp.is_deleted = FALSE
        AND p.permission_code = p_permission_code
        AND p.is_active = TRUE
        AND p.is_deleted = FALSE
    ) INTO v_has_permission;

    IF v_has_permission THEN
        RETURN TRUE;
    END IF;

  IF to_regclass('public.project_memberships') IS NOT NULL
     AND to_regclass('public.project_roles') IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1
      FROM project_memberships pm
      INNER JOIN project_roles pr ON pr.id = pm.project_role_id
      WHERE pm.user_id = v_user_id
        AND pm.project_id = p_project_id
        AND pm.is_active = TRUE
        AND COALESCE(pm.invitation_status, 'accepted') IN ('accepted', 'pending')
        AND pr.is_active = TRUE
        AND public.project_permission_matches(pr.permissions, p_permission_code)
    );
  END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION has_project_permission(UUID, UUID, VARCHAR) IS
  'Legacy role_permissions + project_memberships/project_roles.permissions (v579).';

-- ---------------------------------------------------------------------------
-- get_user_project_permissions: union legacy + membership permissions
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_project_permissions(
    p_auth_user_id UUID,
    p_project_id UUID
)
RETURNS TABLE (
    permission_code VARCHAR,
    permission_name VARCHAR,
    permission_category VARCHAR
) AS $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id
    FROM users
    WHERE auth_user_id = p_auth_user_id;

    RETURN QUERY
    SELECT DISTINCT
        p.permission_code::varchar,
        p.permission_name::varchar,
        p.permission_category::varchar
    FROM user_roles ur
    INNER JOIN role_permissions rp ON rp.role_id = ur.role_id
    INNER JOIN permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = v_user_id
    AND ur.project_id = p_project_id
    AND ur.is_active = TRUE
    AND ur.is_deleted = FALSE
    AND rp.is_active = TRUE
    AND rp.is_deleted = FALSE
    AND p.is_active = TRUE
    AND p.is_deleted = FALSE

    UNION

    SELECT DISTINCT
        elem::varchar AS permission_code,
        initcap(replace(elem, '.', ' '))::varchar AS permission_name,
        split_part(elem, '.', 1)::varchar AS permission_category
    FROM project_memberships pm
    INNER JOIN project_roles pr ON pr.id = pm.project_role_id
    CROSS JOIN LATERAL jsonb_array_elements_text(pr.permissions) AS elem
    WHERE pm.user_id = v_user_id
      AND pm.project_id = p_project_id
      AND pm.is_active = TRUE
      AND COALESCE(pm.invitation_status, 'accepted') IN ('accepted', 'pending')
      AND pr.is_active = TRUE
      AND jsonb_typeof(pr.permissions) = 'array'

    UNION

    SELECT
        'user.invite'::varchar,
        'Invite Users'::varchar,
        'user'::varchar
    FROM project_memberships pm
    INNER JOIN project_roles pr ON pr.id = pm.project_role_id
    WHERE pm.user_id = v_user_id
      AND pm.project_id = p_project_id
      AND pm.is_active = TRUE
      AND COALESCE(pm.invitation_status, 'accepted') IN ('accepted', 'pending')
      AND pr.is_active = TRUE
      AND public.project_permission_matches(pr.permissions, 'user.invite')

    ORDER BY permission_category, permission_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION get_user_project_permissions(UUID, UUID) IS
  'Legacy permissions union project_roles.permissions JSONB (v579).';

-- ---------------------------------------------------------------------------
-- insert_project_invitation_as_pmo_admin: allow project_memberships PM roles
-- Drop all overloads first (42P13 if an older version had parameter DEFAULTs).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  dropped int := 0;
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
    dropped := dropped + 1;
  END LOOP;
  RAISE NOTICE 'v579: dropped % insert_project_invitation_as_pmo_admin overload(s)', dropped;
END $$;

CREATE OR REPLACE FUNCTION public.insert_project_invitation_as_pmo_admin(
  p_project_id          uuid,
  p_invited_email       text,
  p_role_id             uuid,
  p_invitation_message  text,
  p_invitation_expires_at timestamptz
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_auth             uuid := auth.uid();
  v_inviter_id       uuid;
  v_existing_invitee uuid;
  v_row              public.project_invitations%ROWTYPE;
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
  'Inserts invitation for PMO admin, legacy user_roles, project_memberships with invite rights, or assigned project manager (v579).';

NOTIFY pgrst, 'reload schema';

DO $$ BEGIN RAISE NOTICE 'v579_project_invite_permission_memberships.sql applied'; END $$;
