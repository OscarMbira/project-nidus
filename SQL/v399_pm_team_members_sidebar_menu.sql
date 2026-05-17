-- ============================================================================
-- v399: PM sidebar — Team & Members section
-- Adds a dedicated "Team & Members" section to the project_manager sidebar so
-- PMs can invite Team Managers/Leads and Project Team Members with their
-- associated project roles, and manage existing memberships.
--
-- Pages (already exist and are routed):
--   /app/project-members               → ProjectUsers.jsx (full member mgmt)
--   /app/project-members?action=invite → ProjectUsers.jsx scrolled to invite form
--   /app/project-members?tab=pending   → ProjectUsers.jsx filtered to pending
--
-- Prerequisites: v85, v86, v91, v388 (roles, menu_items, role_menu_items)
-- ============================================================================

DO $$
DECLARE
  v_pm_role_id    UUID;
  v_parent_id     UUID;  -- "team & members" top-level section (no route)
  v_manage_id     UUID;
  v_invite_tm_id  UUID;
  v_invite_pm_id  UUID;
  v_pending_id    UUID;
BEGIN
  -- ── 0. Resolve project_manager role ────────────────────────────────────────
  SELECT id INTO v_pm_role_id
  FROM roles
  WHERE role_name IN ('project_manager', 'Project Manager')
  LIMIT 1;

  IF v_pm_role_id IS NULL THEN
    RAISE NOTICE 'project_manager role not found — aborting v399';
    RETURN;
  END IF;

  -- ── 1. Top-level "Team & Members" section header (no route_path) ───────────
  INSERT INTO menu_items (
    menu_code, menu_label, menu_description,
    parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  )
  VALUES (
    'pm_team_members_section',
    'Team & Members',
    'Manage project team members and send invitations',
    NULL, 1, 50,
    NULL, 'users', true, true
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label       = EXCLUDED.menu_label,
    menu_description = EXCLUDED.menu_description,
    menu_level       = EXCLUDED.menu_level,
    sort_order       = EXCLUDED.sort_order,
    menu_icon        = EXCLUDED.menu_icon,
    is_visible       = true,
    is_active        = true,
    is_deleted       = false,
    updated_at       = NOW();

  SELECT id INTO v_parent_id
  FROM menu_items WHERE menu_code = 'pm_team_members_section' LIMIT 1;

  -- ── 2. "Manage Members" — view current team, edit roles, remove ────────────
  INSERT INTO menu_items (
    menu_code, menu_label, menu_description,
    parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  )
  VALUES (
    'pm_manage_members',
    'Manage Members',
    'View, edit and remove current project team members',
    v_parent_id, 2, 10,
    '/app/project-members', 'users', true, true
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label       = EXCLUDED.menu_label,
    menu_description = EXCLUDED.menu_description,
    parent_menu_id   = v_parent_id,
    menu_level       = EXCLUDED.menu_level,
    sort_order       = EXCLUDED.sort_order,
    route_path       = EXCLUDED.route_path,
    menu_icon        = EXCLUDED.menu_icon,
    is_visible       = true,
    is_active        = true,
    is_deleted       = false,
    updated_at       = NOW();

  SELECT id INTO v_manage_id
  FROM menu_items WHERE menu_code = 'pm_manage_members' LIMIT 1;

  -- ── 3. "Invite Team Manager / Lead" ────────────────────────────────────────
  INSERT INTO menu_items (
    menu_code, menu_label, menu_description,
    parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  )
  VALUES (
    'pm_invite_team_manager',
    'Invite Team Manager / Lead',
    'Send invitation to a Team Manager or Team Lead role',
    v_parent_id, 2, 20,
    '/app/project-members?action=invite&role=team_manager', 'user-check', true, true
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label       = EXCLUDED.menu_label,
    menu_description = EXCLUDED.menu_description,
    parent_menu_id   = v_parent_id,
    menu_level       = EXCLUDED.menu_level,
    sort_order       = EXCLUDED.sort_order,
    route_path       = EXCLUDED.route_path,
    menu_icon        = EXCLUDED.menu_icon,
    is_visible       = true,
    is_active        = true,
    is_deleted       = false,
    updated_at       = NOW();

  SELECT id INTO v_invite_tm_id
  FROM menu_items WHERE menu_code = 'pm_invite_team_manager' LIMIT 1;

  -- ── 4. "Invite Project Team Member" ────────────────────────────────────────
  INSERT INTO menu_items (
    menu_code, menu_label, menu_description,
    parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  )
  VALUES (
    'pm_invite_team_member',
    'Invite Project Team Member',
    'Send invitation to a project team member with their assigned role',
    v_parent_id, 2, 30,
    '/app/project-members?action=invite', 'user-plus', true, true
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label       = EXCLUDED.menu_label,
    menu_description = EXCLUDED.menu_description,
    parent_menu_id   = v_parent_id,
    menu_level       = EXCLUDED.menu_level,
    sort_order       = EXCLUDED.sort_order,
    route_path       = EXCLUDED.route_path,
    menu_icon        = EXCLUDED.menu_icon,
    is_visible       = true,
    is_active        = true,
    is_deleted       = false,
    updated_at       = NOW();

  SELECT id INTO v_invite_pm_id
  FROM menu_items WHERE menu_code = 'pm_invite_team_member' LIMIT 1;

  -- ── 5. "Pending Invitations" ────────────────────────────────────────────────
  INSERT INTO menu_items (
    menu_code, menu_label, menu_description,
    parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  )
  VALUES (
    'pm_pending_invitations',
    'Pending Invitations',
    'View and manage outstanding invitations sent to team members',
    v_parent_id, 2, 40,
    '/app/project-members?tab=pending', 'mail', true, true
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label       = EXCLUDED.menu_label,
    menu_description = EXCLUDED.menu_description,
    parent_menu_id   = v_parent_id,
    menu_level       = EXCLUDED.menu_level,
    sort_order       = EXCLUDED.sort_order,
    route_path       = EXCLUDED.route_path,
    menu_icon        = EXCLUDED.menu_icon,
    is_visible       = true,
    is_active        = true,
    is_deleted       = false,
    updated_at       = NOW();

  SELECT id INTO v_pending_id
  FROM menu_items WHERE menu_code = 'pm_pending_invitations' LIMIT 1;

  -- ── 6. Grant all four items to project_manager ────────────────────────────
  INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
  SELECT v_pm_role_id, unnested.id, true, true, true, false
  FROM (
    VALUES
      (v_parent_id),
      (v_manage_id),
      (v_invite_tm_id),
      (v_invite_pm_id),
      (v_pending_id)
  ) AS unnested(id)
  WHERE unnested.id IS NOT NULL
  ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
    can_view   = true,
    can_use    = true,
    is_active  = true,
    is_deleted = false,
    updated_at = NOW();

  -- ── 7. Re-activate projects_manage_members if it was deactivated by v398 ──
  -- v398 cleanup may have soft-deleted this item for PM; restore it since
  -- /app/project-members is NOT a PMO-exclusive route.
  UPDATE role_menu_items rmi
  SET
    is_active  = true,
    is_deleted = false,
    can_view   = true,
    can_use    = true,
    updated_at = NOW()
  FROM menu_items mi
  WHERE rmi.role_id      = v_pm_role_id
    AND rmi.menu_item_id = mi.id
    AND mi.menu_code     = 'projects_manage_members';

  RAISE NOTICE 'v399: PM Team & Members sidebar section created for role %', v_pm_role_id;
END $$;

-- ── Verify ────────────────────────────────────────────────────────────────────
SELECT
  mi.menu_code,
  mi.menu_label,
  mi.route_path,
  mi.sort_order,
  rmi.can_view,
  rmi.can_use,
  rmi.is_active,
  rmi.is_deleted
FROM role_menu_items rmi
JOIN menu_items      mi  ON mi.id  = rmi.menu_item_id
JOIN roles           r   ON r.id   = rmi.role_id
WHERE r.role_name = 'project_manager'
  AND rmi.is_deleted = false
  AND mi.menu_code LIKE 'pm_%'
ORDER BY mi.sort_order;
