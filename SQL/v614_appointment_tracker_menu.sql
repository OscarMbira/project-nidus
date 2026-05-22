-- =============================================================================
-- v614_appointment_tracker_menu.sql
-- Sidebar menu: Appointment Tracker (PMO), My Appointments, Team Appointments (PM)
-- Prerequisites: v130, v399, v601
-- =============================================================================

DO $$
DECLARE
  v_pmo_parent_id UUID;
  v_pm_people_id UUID;
  v_pm_team_id UUID;
BEGIN
  SELECT id INTO v_pmo_parent_id
  FROM menu_items
  WHERE menu_code IN ('pmo_admin_section', 'pmo_people_resources')
    AND COALESCE(is_deleted, FALSE) = FALSE
  ORDER BY CASE WHEN menu_code = 'pmo_people_resources' THEN 0 ELSE 1 END
  LIMIT 1;

  IF v_pmo_parent_id IS NOT NULL THEN
    INSERT INTO menu_items (
      menu_code, menu_label, menu_description,
      parent_menu_id, menu_level, sort_order,
      route_path, menu_icon, is_visible, is_active
    )
    VALUES (
      'pmo_admin_appointment_tracker',
      'Appointment Tracker',
      'Manager appointment ledger: pending, active, declined, and ended',
      v_pmo_parent_id,
      2,
      26,
      '/platform/pmo-admin/appointments',
      'clipboard-check',
      true,
      true
    )
    ON CONFLICT (menu_code) DO UPDATE SET
      menu_label = EXCLUDED.menu_label,
      menu_description = EXCLUDED.menu_description,
      route_path = EXCLUDED.route_path,
      menu_icon = EXCLUDED.menu_icon,
      is_visible = true,
      is_active = true,
      is_deleted = false,
      updated_at = NOW();

    INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT r.id, m.id, true, true, true, false
    FROM roles r
    CROSS JOIN menu_items m
    WHERE r.role_name = 'pmo_admin'
      AND m.menu_code = 'pmo_admin_appointment_tracker'
      AND COALESCE(m.is_deleted, FALSE) = FALSE
    ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
      can_view = true, can_use = true, is_active = true, is_deleted = false, updated_at = NOW();
  END IF;

  SELECT id INTO v_pm_people_id
  FROM menu_items
  WHERE menu_code IN ('pm_people_assignments', 'pm_team_members_section')
    AND COALESCE(is_deleted, FALSE) = FALSE
  ORDER BY CASE WHEN menu_code = 'pm_people_assignments' THEN 0 ELSE 1 END
  LIMIT 1;

  IF v_pm_people_id IS NOT NULL THEN
    INSERT INTO menu_items (
      menu_code, menu_label, menu_description,
      parent_menu_id, menu_level, sort_order,
      route_path, menu_icon, is_visible, is_active
    )
    VALUES
      (
        'pm_my_appointments',
        'My Appointments',
        'Your manager appointment records and acceptance status',
        v_pm_people_id,
        2,
        45,
        '/platform/my-appointments',
        'user-cog',
        true,
        true
      ),
      (
        'pm_team_appointments_dashboard',
        'Team Appointments',
        'Team member assignment records for projects you manage',
        v_pm_people_id,
        2,
        46,
        '/platform/app/team-appointments',
        'users',
        true,
        true
      )
    ON CONFLICT (menu_code) DO UPDATE SET
      menu_label = EXCLUDED.menu_label,
      route_path = EXCLUDED.route_path,
      is_visible = true,
      is_active = true,
      is_deleted = false,
      updated_at = NOW();

    INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT r.id, m.id, true, true, true, false
    FROM roles r
    CROSS JOIN menu_items m
    WHERE r.role_name IN ('project_manager', 'programme_manager', 'portfolio_manager')
      AND m.menu_code IN ('pm_my_appointments', 'pm_team_appointments_dashboard')
      AND COALESCE(m.is_deleted, FALSE) = FALSE
    ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
      can_view = true, can_use = true, is_active = true, is_deleted = false, updated_at = NOW();
  END IF;

  SELECT id INTO v_pm_team_id
  FROM menu_items
  WHERE menu_code = 'pm_team_members_section' AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  IF v_pm_team_id IS NOT NULL THEN
    INSERT INTO menu_items (
      menu_code, menu_label, menu_description,
      parent_menu_id, menu_level, sort_order,
      route_path, menu_icon, is_visible, is_active
    )
    VALUES (
      'pm_my_team_appointments',
      'My Assignment',
      'Your team assignment records pending acceptance',
      v_pm_team_id,
      2,
      35,
      '/platform/my-team-appointments',
      'clipboard-list',
      true,
      true
    )
    ON CONFLICT (menu_code) DO UPDATE SET
      menu_label = EXCLUDED.menu_label,
      route_path = EXCLUDED.route_path,
      is_visible = true,
      is_active = true,
      is_deleted = false,
      updated_at = NOW();

    INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT r.id, m.id, true, true, true, false
    FROM roles r
    CROSS JOIN menu_items m
    WHERE r.role_name IN ('team_member', 'team_manager', 'project_manager')
      AND m.menu_code = 'pm_my_team_appointments'
      AND COALESCE(m.is_deleted, FALSE) = FALSE
    ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
      can_view = true, can_use = true, is_active = true, is_deleted = false, updated_at = NOW();
  END IF;
END $$;

DO $$ BEGIN RAISE NOTICE 'v614_appointment_tracker_menu.sql applied'; END $$;
