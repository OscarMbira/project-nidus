-- ============================================================================
-- v511: Leadership template roles — invitation FK targets + membership mapping
-- Ensures project_invitations can reference public.roles rows whose names align
-- with project_roles templates (sponsor, programme manager, PM, board…).
-- Updates accept_project_invitation so memberships sync for those roles.
-- Prerequisites: v91 project_roles templates, v388 accept_project_invitation
-- ============================================================================

-- -----------------------------------------------------------------------------
-- 1) Mirror missing invitation targets into roles (same role_name as templates)
-- -----------------------------------------------------------------------------
INSERT INTO roles (
  role_name,
  role_display_name,
  role_description,
  role_level,
  is_system_role,
  is_default_role,
  can_manage_users,
  can_manage_projects,
  can_manage_system,
  is_active,
  is_deleted
)
SELECT
  pr.role_name,
  pr.role_display_name,
  COALESCE(pr.role_description, pr.role_display_name),
  COALESCE(pr.role_level, 1),
  FALSE,
  FALSE,
  FALSE,
  TRUE,
  FALSE,
  TRUE,
  FALSE
FROM project_roles pr
WHERE pr.is_template IS TRUE
  AND pr.project_id IS NULL
  AND pr.is_active IS TRUE
  AND pr.role_name IN (
    'project_board_member',
    'project_sponsor',
    'programme_manager',
    'project_manager'
  )
  AND NOT EXISTS (
    SELECT 1 FROM roles r
    WHERE r.role_name = pr.role_name
      AND (r.is_deleted IS FALSE OR r.is_deleted IS NULL)
  );

-- -----------------------------------------------------------------------------
-- 2) Accept invitation — map legacy aliases OR matching template role_name
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION accept_project_invitation(
  p_token VARCHAR,
  p_accepting_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_invitation project_invitations%ROWTYPE;
  v_is_valid BOOLEAN;
  v_legacy_role_name VARCHAR;
  v_mapped_template_name VARCHAR;
  v_project_role_id UUID;
BEGIN
  SELECT * INTO v_invitation
  FROM project_invitations
  WHERE invitation_token = p_token
    AND is_deleted = FALSE;

  IF v_invitation.id IS NULL THEN
    RETURN FALSE;
  END IF;

  v_is_valid := (
    v_invitation.invitation_status = 'pending'
    AND (v_invitation.invitation_expires_at IS NULL OR v_invitation.invitation_expires_at > NOW())
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
  SET is_active = TRUE,
      is_deleted = FALSE,
      updated_at = NOW();

  SELECT role_name INTO v_legacy_role_name
  FROM roles
  WHERE id = v_invitation.role_id
  LIMIT 1;

  v_mapped_template_name := CASE v_legacy_role_name
    WHEN 'pm_team_manager' THEN 'team_manager'
    WHEN 'pm_team_member' THEN 'team_member'
    WHEN 'pm_project_assurance' THEN 'project_assurance'
    WHEN 'pm_quality_assurance' THEN 'quality_assurance'
    WHEN 'pm_change_authority' THEN 'change_authority'
    ELSE v_legacy_role_name
  END;

  SELECT pr.id INTO v_project_role_id
  FROM project_roles pr
  WHERE pr.is_template = TRUE
    AND pr.project_id IS NULL
    AND pr.is_active = TRUE
    AND pr.role_name = v_mapped_template_name
  LIMIT 1;

  IF v_project_role_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM project_memberships pm
      WHERE pm.project_id = v_invitation.project_id
        AND pm.user_id = p_accepting_user_id
        AND pm.is_active = TRUE
    ) THEN
      UPDATE project_memberships
      SET project_role_id = v_project_role_id,
          invitation_status = 'accepted',
          accepted_at = COALESCE(accepted_at, NOW()),
          updated_at = NOW()
      WHERE project_id = v_invitation.project_id
        AND user_id = p_accepting_user_id
        AND is_active = TRUE;
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
  SET invitation_status = 'accepted',
      accepted_at = NOW(),
      accepted_by_user_id = p_accepting_user_id,
      updated_at = NOW()
  WHERE id = v_invitation.id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION accept_project_invitation(VARCHAR, UUID) IS
  'Accepts invitation; syncs user_roles and project_memberships for template roles (incl. sponsor / programme manager / PM).';
