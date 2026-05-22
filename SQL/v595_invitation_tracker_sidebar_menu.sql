-- =============================================================================
-- v595_invitation_tracker_sidebar_menu.sql
-- Platform sidebar: Invitation Tracker (PMO) + Invitation Status (PM)
-- Prerequisites: v130 (pmo_admin_section), v399 (pm_team_members_section)
-- =============================================================================

DO $$
DECLARE
  v_pmo_parent_id UUID;
  v_pm_parent_id  UUID;
  v_pm_role_id    UUID;
  v_menu_id       UUID;
BEGIN
  SELECT id INTO v_pmo_parent_id
  FROM menu_items
  WHERE menu_code = 'pmo_admin_section'
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  IF v_pmo_parent_id IS NOT NULL THEN
    INSERT INTO menu_items (
      menu_code, menu_label, menu_description,
      parent_menu_id, menu_level, sort_order,
      route_path, menu_icon, is_visible, is_active
    )
    VALUES (
      'pmo_admin_invitation_tracker',
      'Invitation Tracker',
      'View all sent invitations: pending, accepted, declined, expired, and cancelled',
      v_pmo_parent_id,
      2,
      25,
      '/platform/admin/invitation-tracker',
      'mail-check',
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
      is_visible       = true,
      is_active        = true,
      is_deleted       = false,
      updated_at       = NOW();

    INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT r.id, m.id, true, true, true, false
    FROM roles r
    CROSS JOIN menu_items m
    WHERE r.role_name = 'pmo_admin'
      AND m.menu_code = 'pmo_admin_invitation_tracker'
      AND COALESCE(m.is_deleted, FALSE) = FALSE
    ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
      can_view   = true,
      can_use    = true,
      is_active  = true,
      is_deleted = false,
      updated_at = NOW();
  ELSE
    RAISE NOTICE 'v595: pmo_admin_section missing — PMO tracker menu skipped';
  END IF;

  SELECT id INTO v_pm_parent_id
  FROM menu_items
  WHERE menu_code = 'pm_team_members_section'
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  SELECT id INTO v_pm_role_id
  FROM roles
  WHERE role_name IN ('project_manager', 'Project Manager')
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  IF v_pm_parent_id IS NOT NULL AND v_pm_role_id IS NOT NULL THEN
    INSERT INTO menu_items (
      menu_code, menu_label, menu_description,
      parent_menu_id, menu_level, sort_order,
      route_path, menu_icon, is_visible, is_active
    )
    VALUES (
      'pm_invitation_tracker',
      'Invitation Status',
      'Track all project invitations you have sent',
      v_pm_parent_id,
      2,
      35,
      '/app/invitation-tracker',
      'mail-check',
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
      is_visible       = true,
      is_active        = true,
      is_deleted       = false,
      updated_at       = NOW();

    SELECT id INTO v_menu_id FROM menu_items WHERE menu_code = 'pm_invitation_tracker' LIMIT 1;

    INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    VALUES (v_pm_role_id, v_menu_id, true, true, true, false)
    ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
      can_view   = true,
      can_use    = true,
      is_active  = true,
      is_deleted = false,
      updated_at = NOW();
  ELSE
    RAISE NOTICE 'v595: pm_team_members_section or project_manager role missing — PM tracker menu skipped';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE 'v595_invitation_tracker_sidebar_menu.sql applied';
END $$;
