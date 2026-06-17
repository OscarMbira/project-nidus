-- v736: Accept organisation invitation by token (PMO Administrator, etc.)
-- Run after v735_organisation_invitation_decline.sql

CREATE OR REPLACE FUNCTION public.accept_organisation_invitation(
  p_token              VARCHAR,
  p_accepting_user_id  UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation   organisation_invitations%ROWTYPE;
  v_org_name     TEXT;
BEGIN
  SELECT * INTO v_invitation
  FROM organisation_invitations
  WHERE invitation_token = p_token
    AND is_deleted = FALSE;

  IF v_invitation.id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Idempotent re-acceptance by the same user.
  IF v_invitation.invitation_status = 'accepted'
     AND v_invitation.accepted_by_user_id = p_accepting_user_id THEN
    RETURN TRUE;
  END IF;

  IF v_invitation.invitation_status <> 'pending'
     OR (
       v_invitation.invitation_expires_at IS NOT NULL
       AND v_invitation.invitation_expires_at <= NOW()
     ) THEN
    RETURN FALSE;
  END IF;

  -- Organisation-scoped system role (project_id NULL).
  INSERT INTO user_roles (
    user_id,
    role_id,
    project_id,
    assigned_by,
    is_active,
    is_deleted
  )
  VALUES (
    p_accepting_user_id,
    v_invitation.role_id,
    NULL,
    v_invitation.invited_by_user_id,
    TRUE,
    FALSE
  )
  ON CONFLICT (user_id, role_id, project_id) DO UPDATE
  SET is_active  = TRUE,
      is_deleted = FALSE,
      updated_at = NOW();

  SELECT COALESCE(
    NULLIF(TRIM(a.account_display_name), ''),
    NULLIF(TRIM(a.account_name), ''),
    NULLIF(TRIM(a.company_name), ''),
    ''
  )
  INTO v_org_name
  FROM accounts a
  WHERE a.id = v_invitation.organisation_id
    AND COALESCE(a.is_deleted, FALSE) = FALSE;

  IF v_org_name IS NOT NULL AND v_org_name <> '' THEN
    UPDATE users
    SET organization = v_org_name,
        updated_at = NOW()
    WHERE id = p_accepting_user_id
      AND (organization IS NULL OR TRIM(organization) = '');
  END IF;

  UPDATE organisation_invitations
  SET invitation_status     = 'accepted',
      accepted_at           = NOW(),
      accepted_by_user_id   = p_accepting_user_id,
      invited_user_id       = p_accepting_user_id,
      updated_at            = NOW()
  WHERE id = v_invitation.id;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.accept_organisation_invitation(VARCHAR, UUID) IS
  'Accepts a pending organisation invitation (e.g. pmo_admin). SECURITY DEFINER; idempotent for same user.';

GRANT EXECUTE ON FUNCTION public.accept_organisation_invitation(VARCHAR, UUID) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE 'v736_accept_organisation_invitation.sql applied';
END $$;
