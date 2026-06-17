-- =============================================================================
-- v664: DB as single source of truth for sidebar menu_items
-- Source: projectplan/v664_DB_Single_Source_of_Truth_Menu_Plan.md
-- Prerequisites: v601, v302, v385, v577, v595, v604, v628b, v629, v631, v647, v663
-- Idempotent ON CONFLICT (menu_code). UI grouping remains in useMenu.js matchCategory().
-- =============================================================================

DO $$
DECLARE
  v_teams UUID;
  v_stakeholders UUID;
  v_stakeholders_legacy UUID;
  v_pm_knowledge UUID;
  v_pm_role UUID;
  v_tm_role UUID;
BEGIN
  SELECT id INTO v_teams FROM public.menu_items WHERE menu_code = 'platform_teams' LIMIT 1;
  SELECT id INTO v_stakeholders FROM public.menu_items WHERE menu_code = 'platform_stakeholders' LIMIT 1;
  SELECT id INTO v_stakeholders_legacy FROM public.menu_items WHERE menu_code = 'stakeholders' LIMIT 1;
  SELECT id INTO v_pm_knowledge FROM public.menu_items
  WHERE menu_code IN ('pm_section_knowledge_resources', 'pm_section_knowledge')
  ORDER BY CASE menu_code WHEN 'pm_section_knowledge_resources' THEN 0 ELSE 1 END
  LIMIT 1;

  -- ── Teams section leaves (PMO categorised sidebar — pmo-cat-teams) ───────────
  IF v_teams IS NOT NULL THEN
    INSERT INTO public.menu_items (
      menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
      route_path, menu_icon, is_visible, is_active
    ) VALUES
      ('platform_teams_manager_assignments', 'Manager Assignments', 'Assign project, programme, and portfolio managers', v_teams, 2, 10, '/platform/pmo-admin/manager-assignments', 'user-check', TRUE, TRUE),
      ('platform_teams_assignment_settings', 'Assignment Settings', 'Configure concurrent assignment limits', v_teams, 2, 20, '/platform/pmo-admin/manager-assignment-settings', 'settings', TRUE, TRUE),
      ('platform_teams_assign_roles', 'Assign Roles to Projects', 'Assign roles to projects', v_teams, 2, 30, '/platform/admin/assign-roles-to-projects', 'shield', TRUE, TRUE),
      ('platform_teams_add_users', 'Add users to project', 'Add users to a project', v_teams, 2, 35, '/platform/project-members', 'user-plus', TRUE, TRUE),
      ('platform_teams_send_invites', 'Send Role Invitations', 'Send role invitations (single or bulk)', v_teams, 2, 40, '/platform/admin/send-role-invites', 'mail', TRUE, TRUE),
      ('platform_teams_invitation_tracker', 'Invitation Tracker', 'Track sent invitations', v_teams, 2, 50, '/platform/admin/invitation-tracker', 'mail-check', TRUE, TRUE),
      ('platform_teams_appointment_tracker', 'Appointment Tracker', 'Track role appointments', v_teams, 2, 60, '/platform/pmo-admin/appointments', 'clipboard-check', TRUE, TRUE),
      ('platform_teams_all', 'All Teams', 'Browse all teams', v_teams, 2, 110, '/platform/teams', 'users', TRUE, TRUE),
      ('platform_teams_my', 'My Teams', 'Teams you belong to', v_teams, 2, 120, '/platform/teams/my', 'users', TRUE, TRUE),
      ('platform_teams_directory', 'Team Directory', 'Team member directory', v_teams, 2, 130, '/platform/teams/directory', 'address-book', TRUE, TRUE),
      ('platform_teams_workload', 'Workload View', 'Team workload and capacity', v_teams, 2, 140, '/platform/teams/workload', 'chart-mixed', TRUE, TRUE),
      ('platform_teams_my_team', 'My Team', 'Your project team', v_teams, 2, 150, '/platform/teams/my-team', 'users', TRUE, TRUE)
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
  END IF;

  -- ── Stakeholders section leaves (pmo-cat-stakeholders) ─────────────────────
  IF v_stakeholders IS NOT NULL THEN
    INSERT INTO public.menu_items (
      menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
      route_path, menu_icon, is_visible, is_active
    ) VALUES
      ('platform_stakeholders_register', 'Stakeholder Register', 'Identify and maintain stakeholder information', v_stakeholders, 2, 10, '/platform/stakeholders/register', 'users-2', TRUE, TRUE),
      ('platform_stakeholders_analysis', 'Stakeholder Analysis', 'Power/interest matrix and attitude analysis', v_stakeholders, 2, 20, '/platform/stakeholders/analysis', 'target', TRUE, TRUE),
      ('platform_stakeholders_assessment_matrix', 'Stakeholder Assessment Matrix', 'Engagement assessment matrix', v_stakeholders, 2, 25, '/platform/stakeholders/assessment-matrix', 'table-2', TRUE, TRUE),
      ('platform_stakeholders_engagement', 'Engagement Planning', 'Plan stakeholder engagement', v_stakeholders, 2, 30, '/platform/stakeholders/engagement', 'mail', TRUE, TRUE),
      ('platform_stakeholders_communications', 'Communication Plans', 'Stakeholder communication plans', v_stakeholders, 2, 40, '/platform/stakeholders/communications', 'file-text', TRUE, TRUE),
      ('platform_stakeholders_monitoring', 'Monitoring', 'Monitor engagement and attitude', v_stakeholders, 2, 50, '/platform/stakeholders/monitoring', 'chart-bar', TRUE, TRUE)
    ON CONFLICT (menu_code) DO UPDATE SET
      menu_label = EXCLUDED.menu_label,
      menu_description = EXCLUDED.menu_description,
      parent_menu_id = v_stakeholders,
      route_path = EXCLUDED.route_path,
      sort_order = EXCLUDED.sort_order,
      menu_icon = EXCLUDED.menu_icon,
      is_visible = TRUE,
      is_active = TRUE,
      is_deleted = FALSE,
      updated_at = NOW();
  END IF;

  -- Reparent legacy stakeholders children under platform_stakeholders when present
  IF v_stakeholders IS NOT NULL AND v_stakeholders_legacy IS NOT NULL THEN
    UPDATE public.menu_items SET
      parent_menu_id = v_stakeholders,
      menu_level = 2,
      updated_at = NOW()
    WHERE parent_menu_id = v_stakeholders_legacy
      AND menu_code LIKE 'platform_stakeholders_%'
      AND COALESCE(is_deleted, FALSE) = FALSE;
  END IF;

  -- ── PM: consolidated Send Role Invitation + industry templates ─────────────
  IF v_pm_knowledge IS NOT NULL THEN
    INSERT INTO public.menu_items (
      menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
      route_path, menu_icon, is_visible, is_active
    ) VALUES
      ('pm_industry_templates_browse', 'Industry Templates', 'Browse PMO industry plan blueprints', v_pm_knowledge, 2, 50, '/platform/industry-templates', 'layers', TRUE, TRUE),
      ('pm_industry_plan', 'My Industry Plan', 'Project industry plan copy', v_pm_knowledge, 2, 60, '/platform/projects/__PROJECT__/industry-plan', 'map', TRUE, TRUE)
    ON CONFLICT (menu_code) DO UPDATE SET
      parent_menu_id = EXCLUDED.parent_menu_id,
      route_path = EXCLUDED.route_path,
      sort_order = EXCLUDED.sort_order,
      is_visible = TRUE,
      is_active = TRUE,
      is_deleted = FALSE,
      updated_at = NOW();
  END IF;

  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES (
    'pm_send_role_invitation',
    'Send Role Invitation',
    'Invite one user (choose role) or upload a bulk invite file',
    NULL, 1, 76,
    '/app/project-members?action=send-invite',
    'mail', TRUE, TRUE
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    route_path = EXCLUDED.route_path,
    is_visible = TRUE,
    is_active = TRUE,
    is_deleted = FALSE,
    updated_at = NOW();

  -- Nest send-role under PM Teams section when present
  UPDATE public.menu_items child SET
    parent_menu_id = parent.id,
    menu_level = 2,
    sort_order = 45,
    updated_at = NOW()
  FROM public.menu_items parent
  WHERE parent.menu_code = 'pm_platform_teams_section'
    AND child.menu_code = 'pm_send_role_invitation'
    AND COALESCE(child.is_deleted, FALSE) = FALSE;

  -- ── Role grants: Teams + Stakeholders platform sections ────────────────────
  INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
  SELECT r.id, mi.id, TRUE, TRUE, TRUE, FALSE
  FROM public.roles r
  CROSS JOIN public.menu_items mi
  WHERE mi.menu_code IN (
    'platform_teams',
    'platform_teams_manager_assignments', 'platform_teams_assignment_settings',
    'platform_teams_assign_roles', 'platform_teams_add_users', 'platform_teams_send_invites',
    'platform_teams_invitation_tracker', 'platform_teams_appointment_tracker',
    'platform_teams_all', 'platform_teams_my', 'platform_teams_directory',
    'platform_teams_workload', 'platform_teams_my_team',
    'platform_stakeholders',
    'platform_stakeholders_register', 'platform_stakeholders_analysis',
    'platform_stakeholders_assessment_matrix', 'platform_stakeholders_engagement',
    'platform_stakeholders_communications', 'platform_stakeholders_monitoring'
  )
    AND COALESCE(mi.is_active, TRUE) = TRUE
    AND r.role_name IN (
      'system_admin', 'System Admin', 'super_admin',
      'pmo_admin', 'PMO Admin',
      'project_manager', 'Project Manager',
      'team_manager', 'Team Manager', 'team_lead', 'Team Lead',
      'team_member', 'Team Member', 'pm_team_member'
    )
  ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
    can_view = TRUE,
    can_use = TRUE,
    is_active = TRUE,
    is_deleted = FALSE,
    updated_at = NOW();

  -- PM role: teams section + industry + send invite
  SELECT id INTO v_pm_role FROM public.roles
  WHERE role_name IN ('project_manager', 'Project Manager')
    AND COALESCE(is_active, TRUE) = TRUE
  LIMIT 1;

  IF v_pm_role IS NOT NULL THEN
    INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_pm_role, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code IN (
      'pm_platform_teams_section', 'pm_teams_manage_members', 'pm_teams_send_role_invitations',
      'pm_invitation_tracker', 'pm_teams_my_appointments', 'pm_teams_my_team',
      'pm_send_role_invitation', 'pm_industry_templates_browse', 'pm_industry_plan',
      'pm_process_templates_section', 'pm_pt_hub', 'pm_pt_pre', 'pm_pt_init',
      'pm_pt_plan', 'pm_pt_exec', 'pm_pt_mon', 'pm_pt_close'
    )
    ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
      can_view = TRUE,
      can_use = TRUE,
      is_active = TRUE,
      is_deleted = FALSE,
      updated_at = NOW();
  END IF;

  -- Team member role: full tm_section_* tree + process templates (v628b + v629)
  SELECT id INTO v_tm_role FROM public.roles
  WHERE role_name IN ('team_member', 'Team Member', 'pm_team_member')
    AND COALESCE(is_active, TRUE) = TRUE
  LIMIT 1;

  IF v_tm_role IS NOT NULL THEN
    INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_tm_role, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code LIKE 'tm_%'
      AND COALESCE(mi.is_active, TRUE) = TRUE
    ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
      can_view = TRUE,
      can_use = EXCLUDED.can_use,
      is_active = TRUE,
      is_deleted = FALSE,
      updated_at = NOW();
  END IF;

  -- PMO admin: process templates section (v629)
  INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
  SELECT r.id, mi.id, TRUE, TRUE, TRUE, FALSE
  FROM public.roles r
  CROSS JOIN public.menu_items mi
  WHERE r.role_name IN ('pmo_admin', 'PMO Admin')
    AND mi.menu_code IN (
      'pmo_process_templates_section',
      'pmo_pt_hub', 'pmo_pt_pre', 'pmo_pt_init', 'pmo_pt_plan',
      'pmo_pt_exec', 'pmo_pt_mon', 'pmo_pt_close'
    )
  ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
    can_view = TRUE,
    can_use = TRUE,
    is_active = TRUE,
    is_deleted = FALSE,
    updated_at = NOW();

  RAISE NOTICE 'v664_db_menu_source_of_truth.sql applied';
END $$;
