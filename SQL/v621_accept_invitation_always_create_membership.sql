-- v621: Always create project_memberships row on invitation acceptance.
--
-- Problem: accept_project_invitation only inserted a project_memberships row when
-- v_project_role_id was found via a narrow CASE mapping (pm_team_manager, pm_team_member,
-- etc.). Roles like project_manager, programme_manager, portfolio_manager all fell into
-- ELSE NULL, so project_memberships was never written. Without a membership row, RLS
-- blocks the project page → "This project could not be opened / No menu items available".
--
-- Fix:
--   1. Expand the CASE to cover all direct-name roles as well as pm_* aliases.
--   2. Fallback: if CASE still returns NULL, try a direct role_name lookup in project_roles.
--   3. Always INSERT / UPDATE project_memberships (project_role_id may be NULL if truly
--      not found — schema allows it).
--   Carries forward SECURITY DEFINER (v620) and idempotency (v619).

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
  v_legacy_role_name  VARCHAR;
  v_mapped_role_name  VARCHAR;
  v_project_role_id   UUID;
BEGIN
  SELECT * INTO v_invitation
  FROM project_invitations
  WHERE invitation_token = p_token
    AND is_deleted = FALSE;

  IF v_invitation.id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Idempotent re-acceptance by the same user.
  -- Even for already-accepted invitations, still ensure project_memberships exists
  -- (it may have been missing due to the pre-v621 bug where project_manager fell
  -- into ELSE NULL and the membership INSERT was skipped).
  IF v_invitation.invitation_status = 'accepted'
     AND v_invitation.accepted_by_user_id = p_accepting_user_id THEN

    -- Repair missing membership row if absent (no-op if already present)
    IF NOT EXISTS (
      SELECT 1 FROM project_memberships pm
      WHERE pm.project_id = v_invitation.project_id
        AND pm.user_id    = p_accepting_user_id
        AND pm.is_active  = TRUE
    ) THEN
      -- Resolve project_role_id so the repair row is fully populated
      SELECT role_name INTO v_legacy_role_name
      FROM roles WHERE id = v_invitation.role_id LIMIT 1;

      v_mapped_role_name := CASE v_legacy_role_name
        WHEN 'project_manager'      THEN 'project_manager'
        WHEN 'programme_manager'    THEN 'programme_manager'
        WHEN 'portfolio_manager'    THEN 'portfolio_manager'
        WHEN 'team_manager'         THEN 'team_manager'
        WHEN 'team_member'          THEN 'team_member'
        WHEN 'team_lead'            THEN 'team_lead'
        WHEN 'project_assurance'    THEN 'project_assurance'
        WHEN 'quality_assurance'    THEN 'quality_assurance'
        WHEN 'change_authority'     THEN 'change_authority'
        WHEN 'pm_team_manager'      THEN 'team_manager'
        WHEN 'pm_team_member'       THEN 'team_member'
        WHEN 'pm_project_assurance' THEN 'project_assurance'
        WHEN 'pm_quality_assurance' THEN 'quality_assurance'
        WHEN 'pm_change_authority'  THEN 'change_authority'
        WHEN 'pm_project_manager'   THEN 'project_manager'
        WHEN 'pm_programme_manager' THEN 'programme_manager'
        ELSE v_legacy_role_name
      END;

      SELECT pr.id INTO v_project_role_id
      FROM project_roles pr
      WHERE pr.is_template = TRUE
        AND pr.project_id  IS NULL
        AND pr.is_active   = TRUE
        AND pr.role_name   = v_mapped_role_name
      LIMIT 1;

      INSERT INTO project_memberships (
        project_id, user_id, project_role_id,
        invitation_status, accepted_at, is_active
      )
      VALUES (
        v_invitation.project_id, p_accepting_user_id, v_project_role_id,
        'accepted', NOW(), TRUE
      );
    END IF;

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

  -- Write user_roles row
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

  -- Resolve the legacy role name from the roles table
  SELECT role_name INTO v_legacy_role_name
  FROM roles
  WHERE id = v_invitation.role_id
  LIMIT 1;

  -- Map to project_roles.role_name (direct + pm_* aliases)
  v_mapped_role_name := CASE v_legacy_role_name
    -- Direct matches (no prefix change needed)
    WHEN 'project_manager'      THEN 'project_manager'
    WHEN 'programme_manager'    THEN 'programme_manager'
    WHEN 'portfolio_manager'    THEN 'portfolio_manager'
    WHEN 'team_manager'         THEN 'team_manager'
    WHEN 'team_member'          THEN 'team_member'
    WHEN 'team_lead'            THEN 'team_lead'
    WHEN 'project_assurance'    THEN 'project_assurance'
    WHEN 'quality_assurance'    THEN 'quality_assurance'
    WHEN 'change_authority'     THEN 'change_authority'
    WHEN 'project_board_member' THEN 'project_board_member'
    WHEN 'project_sponsor'      THEN 'project_sponsor'
    WHEN 'stakeholder'          THEN 'stakeholder'
    WHEN 'viewer'               THEN 'viewer'
    -- pm_* prefix aliases
    WHEN 'pm_team_manager'         THEN 'team_manager'
    WHEN 'pm_team_member'          THEN 'team_member'
    WHEN 'pm_project_assurance'    THEN 'project_assurance'
    WHEN 'pm_quality_assurance'    THEN 'quality_assurance'
    WHEN 'pm_change_authority'     THEN 'change_authority'
    WHEN 'pm_project_manager'      THEN 'project_manager'
    WHEN 'pm_programme_manager'    THEN 'programme_manager'
    WHEN 'pm_team_lead'            THEN 'team_lead'
    ELSE NULL
  END;

  -- Look up project_role_id from template project_roles
  IF v_mapped_role_name IS NOT NULL THEN
    SELECT pr.id INTO v_project_role_id
    FROM project_roles pr
    WHERE pr.is_template = TRUE
      AND pr.project_id  IS NULL
      AND pr.is_active   = TRUE
      AND pr.role_name   = v_mapped_role_name
    LIMIT 1;
  END IF;

  -- Fallback: try direct match on the raw role name if mapping found nothing
  IF v_project_role_id IS NULL AND v_legacy_role_name IS NOT NULL THEN
    SELECT pr.id INTO v_project_role_id
    FROM project_roles pr
    WHERE pr.is_template = TRUE
      AND pr.project_id  IS NULL
      AND pr.is_active   = TRUE
      AND pr.role_name   = v_legacy_role_name
    LIMIT 1;
  END IF;

  -- Always write project_memberships (project_role_id may be NULL if unmapped)
  IF EXISTS (
    SELECT 1 FROM project_memberships pm
    WHERE pm.project_id = v_invitation.project_id
      AND pm.user_id    = p_accepting_user_id
      AND pm.is_active  = TRUE
  ) THEN
    UPDATE project_memberships
    SET project_role_id   = COALESCE(v_project_role_id, project_role_id),
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

  -- Mark invitation accepted
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
  'Accepts a project invitation. SECURITY DEFINER bypasses RLS (v620). '
  'Always writes project_memberships so RLS project access works for all roles (v621). '
  'Idempotent: same user re-accepting returns TRUE immediately (v619).';
