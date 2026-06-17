-- v735: Organisation invitation decline + validate_invitation_token union
-- Enables /i/{token}?action=decline for PMO Administrator (organisation_invitations) emails.

-- ---------------------------------------------------------------------------
-- decline_organisation_invitation
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.decline_organisation_invitation(p_token VARCHAR)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation organisation_invitations%ROWTYPE;
BEGIN
  SELECT * INTO v_invitation
  FROM organisation_invitations
  WHERE invitation_token = p_token
    AND is_deleted = FALSE;

  IF v_invitation.id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF v_invitation.invitation_status <> 'pending' THEN
    RETURN FALSE;
  END IF;

  IF v_invitation.invitation_expires_at IS NOT NULL
     AND v_invitation.invitation_expires_at <= NOW() THEN
    RETURN FALSE;
  END IF;

  UPDATE organisation_invitations
  SET invitation_status = 'declined',
      declined_at = NOW(),
      updated_at = NOW()
  WHERE id = v_invitation.id;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.decline_organisation_invitation(VARCHAR) IS
  'Declines a pending, non-expired organisation invitation using the invitation token (no auth required).';

GRANT EXECUTE ON FUNCTION public.decline_organisation_invitation(VARCHAR) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- validate_invitation_token — include organisation_invitations (PMO admin, etc.)
-- ---------------------------------------------------------------------------
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
    inviter_display_name TEXT,
    organisation_name TEXT,
    planned_start_date DATE,
    planned_end_date DATE,
    is_valid BOOLEAN,
    expires_at TIMESTAMP,
    invitation_message TEXT
) AS $$
BEGIN
  -- Organisation-scoped invitations (organisation_invitations)
  RETURN QUERY
  SELECT
    oi.id AS invitation_id,
    NULL::UUID AS project_id,
    COALESCE(
      NULLIF(TRIM(a.account_display_name), ''),
      NULLIF(TRIM(a.account_name), ''),
      NULLIF(TRIM(a.company_name), ''),
      'Organisation'
    )::VARCHAR AS project_name,
    oi.invited_email,
    NULLIF(TRIM(oi.invitation_metadata->>'first_name'), '')::TEXT AS invited_first_name,
    NULLIF(TRIM(oi.invitation_metadata->>'last_name'), '')::TEXT AS invited_last_name,
    r.role_name,
    r.role_display_name,
    u.full_name AS invited_by_name,
    COALESCE(
      NULLIF(TRIM(CONCAT_WS(' ', NULLIF(TRIM(u.first_name), ''), NULLIF(TRIM(u.last_name), ''))), ''),
      CASE
        WHEN NULLIF(TRIM(u.full_name), '') IS NOT NULL
         AND LOWER(TRIM(u.full_name)) <> LOWER(SPLIT_PART(COALESCE(NULLIF(TRIM(u.email), ''), '@'), '@', 1))
        THEN NULLIF(TRIM(u.full_name), '')::TEXT
      END,
      NULLIF(TRIM(u.full_name), ''),
      NULLIF(TRIM(u.email), '')
    )::TEXT AS inviter_display_name,
    COALESCE(
      NULLIF(TRIM(a.account_display_name), ''),
      NULLIF(TRIM(a.account_name), ''),
      NULLIF(TRIM(a.company_name), ''),
      ''
    )::TEXT AS organisation_name,
    NULL::DATE AS planned_start_date,
    NULL::DATE AS planned_end_date,
    (
      oi.invitation_status = 'pending'
      AND (oi.invitation_expires_at IS NULL OR oi.invitation_expires_at > NOW())
    ) AS is_valid,
    oi.invitation_expires_at AS expires_at,
    oi.invitation_message
  FROM public.organisation_invitations oi
  INNER JOIN public.roles r ON r.id = oi.role_id
  INNER JOIN public.users u ON u.id = oi.invited_by_user_id
  LEFT JOIN public.accounts a ON a.id = oi.organisation_id AND COALESCE(a.is_deleted, false) = false
  WHERE oi.invitation_token = p_token
    AND oi.is_deleted = FALSE;

  IF FOUND THEN
    RETURN;
  END IF;

  -- Project-scoped invitations (project_invitations)
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
      NULLIF(TRIM(CONCAT_WS(' ', NULLIF(TRIM(u.first_name), ''), NULLIF(TRIM(u.last_name), ''))), ''),
      CASE
        WHEN NULLIF(TRIM(u.full_name), '') IS NOT NULL
         AND LOWER(TRIM(u.full_name)) <> LOWER(SPLIT_PART(COALESCE(NULLIF(TRIM(u.email), ''), '@'), '@', 1))
        THEN NULLIF(TRIM(u.full_name), '')::TEXT
      END,
      NULLIF(TRIM(u.full_name), ''),
      NULLIF(TRIM(u.email), '')
    )::TEXT AS inviter_display_name,
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
  'Validates project or organisation invitation token for accept/decline pages.';

GRANT EXECUTE ON FUNCTION public.validate_invitation_token(VARCHAR) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE 'v735_organisation_invitation_decline.sql applied';
END $$;
