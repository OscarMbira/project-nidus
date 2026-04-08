-- ============================================================================
-- v388: Project member management — invitation role seeds, accept_invitation
--        sync to project_memberships, Projects menu item
-- Prerequisites: v85, v86, v91, roles, project_roles, project_memberships, menu_items
-- Date: 2026-04-05
-- PostgreSQL 15+ (Supabase)
-- ============================================================================

-- -----------------------------------------------------------------------------
-- 1) Legacy PM roles for invitations (roles.id) — map to project_roles templates
-- -----------------------------------------------------------------------------
INSERT INTO roles (
  role_name, role_display_name, role_description,
  role_level, is_system_role, is_default_role,
  can_manage_users, can_manage_projects, can_manage_system,
  is_active, is_deleted
) VALUES
  (
    'pm_quality_assurance',
    'Quality Assurance (PM)',
    'Quality validation for project team invitations',
    6, TRUE, FALSE,
    FALSE, FALSE, FALSE,
    TRUE, FALSE
  ),
  (
    'pm_change_authority',
    'Change Authority (PM)',
    'Change control role for project team invitations',
    5, TRUE, FALSE,
    FALSE, FALSE, FALSE,
    TRUE, FALSE
  )
ON CONFLICT (role_name) DO UPDATE SET
  role_display_name = EXCLUDED.role_display_name,
  role_description = EXCLUDED.role_description,
  updated_at = NOW();

-- -----------------------------------------------------------------------------
-- 2) Accept invitation: also upsert project_memberships (project_roles)
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

  SELECT pr.id INTO v_project_role_id
  FROM project_roles pr
  WHERE pr.is_template = TRUE
    AND pr.project_id IS NULL
    AND pr.is_active = TRUE
    AND pr.role_name = CASE v_legacy_role_name
      WHEN 'pm_team_manager' THEN 'team_manager'
      WHEN 'pm_team_member' THEN 'team_member'
      WHEN 'pm_project_assurance' THEN 'project_assurance'
      WHEN 'pm_quality_assurance' THEN 'quality_assurance'
      WHEN 'pm_change_authority' THEN 'change_authority'
      ELSE NULL
    END
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
  'Accepts invitation; creates user_roles row and project_memberships (project_roles)';

-- -----------------------------------------------------------------------------
-- 3) Sidebar: Manage Members under Projects
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_projects_id UUID;
  v_menu_id UUID;
BEGIN
  SELECT id INTO v_projects_id FROM menu_items WHERE menu_code = 'projects' LIMIT 1;
  IF v_projects_id IS NULL THEN
    RAISE NOTICE 'menu projects parent not found — skip project members menu';
    RETURN;
  END IF;

  INSERT INTO menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  )
  VALUES (
    'projects_manage_members',
    'Manage Members',
    'Invite and manage project team members',
    v_projects_id,
    2,
    6,
    '/app/project-members',
    'users',
    true,
    true
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label       = EXCLUDED.menu_label,
    menu_description = EXCLUDED.menu_description,
    parent_menu_id   = EXCLUDED.parent_menu_id,
    menu_level       = EXCLUDED.menu_level,
    sort_order       = EXCLUDED.sort_order,
    route_path       = EXCLUDED.route_path,
    menu_icon        = EXCLUDED.menu_icon,
    is_visible       = EXCLUDED.is_visible,
    is_active        = EXCLUDED.is_active,
    updated_at       = NOW();

  SELECT id INTO v_menu_id FROM menu_items WHERE menu_code = 'projects_manage_members' LIMIT 1;

  INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
  SELECT r.id, v_menu_id, true, true, true, false
  FROM roles r
  WHERE r.role_name IN ('project_manager', 'pmo_admin')
  AND NOT EXISTS (
    SELECT 1 FROM role_menu_items rmi
    WHERE rmi.role_id = r.id AND rmi.menu_item_id = v_menu_id
  );

  RAISE NOTICE 'projects_manage_members menu registered for project_manager and pmo_admin';
END $$;
