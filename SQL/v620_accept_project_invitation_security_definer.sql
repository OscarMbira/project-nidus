-- v620: Add SECURITY DEFINER to accept_project_invitation.
--
-- Problem: The only RLS policy on project_invitations allows PMO admins only.
-- Non-admin invitees (Project Managers, Team Members, etc.) are blocked by RLS
-- when the function tries to SELECT the invitation row, causing v_invitation.id
-- to be NULL → function returns FALSE → UI shows "Failed to accept invitation".
--
-- Fix: SECURITY DEFINER lets the function run as its owner (postgres / service
-- role), bypassing RLS. The function already validates the token, status, and
-- expiry before doing any writes, so RLS is not needed as an extra guard here.
--
-- Also carries forward the v619 idempotency fix (same-user re-acceptance).

CREATE OR REPLACE FUNCTION public.accept_project_invitation(
  p_token              VARCHAR,
  p_accepting_user_id  UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation        project_invitations%ROWTYPE;
  v_is_valid          BOOLEAN;
  v_is_reaccept       BOOLEAN;
  v_legacy_role_name  VARCHAR;
  v_project_role_id   UUID;
BEGIN
  SELECT * INTO v_invitation
  FROM project_invitations
  WHERE invitation_token = p_token
    AND is_deleted = FALSE;

  IF v_invitation.id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Idempotent re-acceptance: same user clicking accept a second time (v619)
  v_is_reaccept := (
    v_invitation.invitation_status   = 'accepted'
    AND v_invitation.accepted_by_user_id = p_accepting_user_id
  );

  IF v_is_reaccept THEN
    RETURN TRUE;
  END IF;

  v_is_valid := (
    v_invitation.invitation_status = 'pending'
    AND (v_invitation.invitation_expires_at IS NULL
         OR v_invitation.invitation_expires_at > NOW())
  );

  IF NOT v_is_valid THEN
    RETURN FALSE;
  END IF;

  PERFORM 1 FROM check_seat_availability(v_invitation.project_id)
  WHERE has_available_seats = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No available seats in project';
  END IF;

  INSERT INTO user_roles (
    user_id,
    role_id,
    project_id,
    assigned_by,
    is_active
  )
  VALUES (
    p_accepting_user_id,
    v_invitation.role_id,
    v_invitation.project_id,
    v_invitation.invited_by_user_id,
    TRUE
  )
  ON CONFLICT (user_id, role_id, project_id) DO UPDATE
  SET is_active  = TRUE,
      is_deleted = FALSE,
      updated_at = NOW();

  SELECT role_name INTO v_legacy_role_name
  FROM roles
  WHERE id = v_invitation.role_id
  LIMIT 1;

  SELECT pr.id INTO v_project_role_id
  FROM project_roles pr
  WHERE pr.is_template = TRUE
    AND pr.project_id  IS NULL
    AND pr.is_active   = TRUE
    AND pr.role_name = CASE v_legacy_role_name
      WHEN 'pm_team_manager'       THEN 'team_manager'
      WHEN 'pm_team_member'        THEN 'team_member'
      WHEN 'pm_project_assurance'  THEN 'project_assurance'
      WHEN 'pm_quality_assurance'  THEN 'quality_assurance'
      WHEN 'pm_change_authority'   THEN 'change_authority'
      ELSE NULL
    END
  LIMIT 1;

  IF v_project_role_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM project_memberships pm
      WHERE pm.project_id = v_invitation.project_id
        AND pm.user_id    = p_accepting_user_id
        AND pm.is_active  = TRUE
    ) THEN
      UPDATE project_memberships
      SET project_role_id   = v_project_role_id,
          invitation_status = 'accepted',
          accepted_at       = COALESCE(accepted_at, NOW()),
          updated_at        = NOW()
      WHERE project_id = v_invitation.project_id
        AND user_id    = p_accepting_user_id
        AND is_active  = TRUE;
    ELSE
      INSERT INTO project_memberships (
        project_id,
        user_id,
        project_role_id,
        invitation_status,
        accepted_at,
        is_active
      )
      VALUES (
        v_invitation.project_id,
        p_accepting_user_id,
        v_project_role_id,
        'accepted',
        NOW(),
        TRUE
      );
    END IF;
  END IF;

  UPDATE project_invitations
  SET invitation_status   = 'accepted',
      accepted_at         = NOW(),
      accepted_by_user_id = p_accepting_user_id,
      updated_at          = NOW()
  WHERE id = v_invitation.id;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.accept_project_invitation(VARCHAR, UUID) IS
  'Accepts a project invitation. SECURITY DEFINER bypasses RLS so non-admin '
  'invitees can accept their own invitations. Validates token, status, expiry, '
  'and seat availability before writing. Idempotent: same user re-accepting an '
  'already-accepted invitation returns TRUE without re-running inserts (v619/v620).';
