-- v631: PM Invitation Tracker — Teams section + platform route
-- Mirrors PMO Teams > Invitation Tracker placement for project_manager role
-- Prerequisites: v399 (pm_team_members_section), v595 (pm_invitation_tracker)

DO $$
DECLARE
  v_pm_role_id UUID;
  v_teams_parent UUID;
BEGIN
  SELECT id INTO v_pm_role_id
  FROM public.roles
  WHERE role_name IN ('project_manager', 'Project Manager')
    AND COALESCE(is_active, TRUE) = TRUE
  LIMIT 1;

  -- Top-level Teams section (PM Platform sidebar)
  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description,
    parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES (
    'pm_platform_teams_section',
    'Teams',
    'Project team members, invitations, and appointments',
    NULL, 1, 75,
    NULL, 'users', TRUE, TRUE
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    menu_description = EXCLUDED.menu_description,
    sort_order = EXCLUDED.sort_order,
    menu_icon = EXCLUDED.menu_icon,
    is_visible = TRUE,
    is_active = TRUE,
    is_deleted = FALSE,
    updated_at = NOW();

  SELECT id INTO v_teams_parent
  FROM public.menu_items
  WHERE menu_code = 'pm_platform_teams_section'
  LIMIT 1;

  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description,
    parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES
    ('pm_teams_manage_members', 'Project Members', 'Manage project team members', v_teams_parent, 2, 10, '/app/project-members', 'users', TRUE, TRUE),
    ('pm_teams_send_role_invitations', 'Send Role Invitations', 'Invite users to project roles', v_teams_parent, 2, 40, '/app/project-members?action=send-invite', 'mail', TRUE, TRUE),
    ('pm_invitation_tracker', 'Invitation Tracker', 'Track project invitations you have sent', v_teams_parent, 2, 50, '/platform/invitation-tracker', 'mail-check', TRUE, TRUE),
    ('pm_teams_my_appointments', 'My Appointments', 'View your project role appointments', v_teams_parent, 2, 60, '/platform/my-appointments', 'clipboard-check', TRUE, TRUE),
    ('pm_teams_my_team', 'My Team', 'Your project team directory', v_teams_parent, 2, 110, '/platform/teams/my-team', 'users', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    menu_description = EXCLUDED.menu_description,
    parent_menu_id = EXCLUDED.parent_menu_id,
    route_path = EXCLUDED.route_path,
    sort_order = EXCLUDED.sort_order,
    menu_icon = EXCLUDED.menu_icon,
    is_visible = TRUE,
    is_active = TRUE,
    is_deleted = FALSE,
    updated_at = NOW();

  -- Hide legacy Team & Members header (children consolidated under Teams)
  UPDATE public.menu_items
  SET is_visible = FALSE, is_active = FALSE, updated_at = NOW()
  WHERE menu_code = 'pm_team_members_section';

  IF v_pm_role_id IS NOT NULL AND v_teams_parent IS NOT NULL THEN
    INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_pm_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code IN (
      'pm_platform_teams_section',
      'pm_teams_manage_members',
      'pm_teams_send_role_invitations',
      'pm_invitation_tracker',
      'pm_teams_my_appointments',
      'pm_teams_my_team'
    )
    ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
      can_view = TRUE,
      can_use = TRUE,
      is_active = TRUE,
      is_deleted = FALSE,
      updated_at = NOW();
  END IF;
END $$;
