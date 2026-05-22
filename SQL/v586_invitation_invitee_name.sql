-- v586: Store invitee first/last name on project invitations (Send Role Invitations + accept UI)
-- Run after v585_validate_invitation_token_project_dates_coalesce.sql

ALTER TABLE public.project_invitations
  ADD COLUMN IF NOT EXISTS invited_first_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS invited_last_name VARCHAR(100);

COMMENT ON COLUMN public.project_invitations.invited_first_name IS 'Invitee given name captured when invitation was sent';
COMMENT ON COLUMN public.project_invitations.invited_last_name IS 'Invitee surname captured when invitation was sent';

DROP FUNCTION IF EXISTS public.insert_project_invitation_as_pmo_admin(uuid, text, uuid, text, timestamptz);

CREATE OR REPLACE FUNCTION public.insert_project_invitation_as_pmo_admin(
  p_project_id uuid,
  p_invited_email text,
  p_role_id uuid,
  p_invitation_message text,
  p_invitation_expires_at timestamptz,
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
    invitation_expires_at,
    invited_first_name,
    invited_last_name
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
    NULLIF(trim(p_invited_last_name), '')
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

DROP FUNCTION IF EXISTS public.validate_invitation_token(VARCHAR);

CREATE OR REPLACE FUNCTION public.validate_invitation_token(p_token VARCHAR)
RETURNS TABLE (
    invitation_id UUID,
    project_id UUID,
    project_name VARCHAR,
    invited_email VARCHAR,
    invited_first_name TEXT,
    invited_last_name TEXT,
    role_name VARCHAR,
    role_display_name VARCHAR,
    invited_by_name VARCHAR,
    organisation_name TEXT,
    planned_start_date DATE,
    planned_end_date DATE,
    is_valid BOOLEAN,
    expires_at TIMESTAMP,
    invitation_message TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pi.id AS invitation_id,
        pi.project_id,
        p.project_name,
        pi.invited_email,
        NULLIF(TRIM(pi.invited_first_name), '')::TEXT AS invited_first_name,
        NULLIF(TRIM(pi.invited_last_name), '')::TEXT AS invited_last_name,
        r.role_name,
        r.role_display_name,
        u.full_name AS invited_by_name,
        COALESCE(
            NULLIF(TRIM(a.account_display_name), ''),
            NULLIF(TRIM(a.account_name), ''),
            NULLIF(TRIM(a.company_name), ''),
            ''
        )::TEXT AS organisation_name,
        COALESCE(p.planned_start_date, pp.planned_start_date)::DATE AS planned_start_date,
        COALESCE(p.planned_end_date, pp.planned_end_date)::DATE AS planned_end_date,
        (
            pi.invitation_status = 'pending'
            AND (pi.invitation_expires_at IS NULL OR pi.invitation_expires_at > NOW())
        ) AS is_valid,
        pi.invitation_expires_at AS expires_at,
        pi.invitation_message
    FROM public.project_invitations pi
    INNER JOIN public.projects p ON p.id = pi.project_id
    LEFT JOIN public.project_plans pp ON pp.project_id = p.id
    INNER JOIN public.roles r ON r.id = pi.role_id
    INNER JOIN public.users u ON u.id = pi.invited_by_user_id
    LEFT JOIN public.accounts a ON a.id = p.account_id AND COALESCE(a.is_deleted, false) = false
    WHERE pi.invitation_token = p_token
      AND pi.is_deleted = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.validate_invitation_token(VARCHAR) IS
  'Validates invitation token; returns invitee name, org, inviter, and project planned dates.';

GRANT EXECUTE ON FUNCTION public.validate_invitation_token(VARCHAR) TO anon, authenticated, service_role;
