-- ============================================================================
-- v410: Communications hub — menu_items + role_menu_items
-- Prerequisites: v408, v409, roles, menu_items
-- Routes: /comms/...
-- ============================================================================

DO $$
DECLARE
  v_parent_id UUID;
BEGIN
  INSERT INTO menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, menu_color, is_visible, is_active
  )
  VALUES (
    'comms',
    'Communications',
    'Chat, calls, meetings, and AI-assisted reviews',
    NULL,
    1,
    57,
    '/platform/comms',
    'message-square',
    '#0891B2',
    TRUE,
    TRUE
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    menu_description = EXCLUDED.menu_description,
    sort_order = EXCLUDED.sort_order,
    route_path = EXCLUDED.route_path,
    menu_icon = EXCLUDED.menu_icon,
    menu_color = EXCLUDED.menu_color,
    is_visible = TRUE,
    is_active = TRUE,
    is_deleted = FALSE,
    updated_at = NOW();

  SELECT id INTO v_parent_id FROM menu_items WHERE menu_code = 'comms' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;

  INSERT INTO menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, menu_color, is_visible, is_active
  )
  VALUES
    ('comms_messages', 'Messages', 'Channels and threads', v_parent_id, 2, 1, '/platform/comms/messages', 'message-square', '#0891B2', TRUE, TRUE),
    ('comms_direct', 'Direct Messages', '1:1 conversations', v_parent_id, 2, 2, '/platform/comms/direct', 'mail', '#0891B2', TRUE, TRUE),
    ('comms_meetings', 'Meetings', 'Upcoming and past meetings', v_parent_id, 2, 3, '/platform/comms/meetings', 'video', '#0891B2', TRUE, TRUE),
    ('comms_meetings_new', 'Schedule Meeting', 'Create a meeting', v_parent_id, 2, 4, '/platform/comms/meetings/new', 'calendar-clock', '#0891B2', TRUE, TRUE),
    ('comms_meeting_summaries', 'Meeting Summaries', 'AI summaries', v_parent_id, 2, 5, '/platform/comms/meetings/summaries', 'file-text', '#0891B2', TRUE, TRUE),
    ('comms_pending_review', 'Pending AI Reviews', 'Approve AI-extracted issues and risks', v_parent_id, 2, 6, '/platform/comms/pending-review', 'bot', '#0891B2', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    menu_description = EXCLUDED.menu_description,
    parent_menu_id = EXCLUDED.parent_menu_id,
    menu_level = EXCLUDED.menu_level,
    sort_order = EXCLUDED.sort_order,
    route_path = EXCLUDED.route_path,
    menu_icon = EXCLUDED.menu_icon,
    menu_color = EXCLUDED.menu_color,
    is_visible = TRUE,
    is_active = TRUE,
    is_deleted = FALSE,
    updated_at = NOW();

  RAISE NOTICE 'v410: communications menu items seeded';
END $$;

-- All roles: hub + read-most items (viewer excluded from schedule new via app + optional menu flag)
INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
SELECT r.id, m.id, TRUE, TRUE, TRUE, FALSE
FROM roles r
CROSS JOIN menu_items m
WHERE r.role_name IN (
  'system_admin', 'pmo_admin', 'project_manager', 'team_lead', 'team_member', 'stakeholder', 'viewer'
)
  AND m.menu_code IN (
    'comms', 'comms_messages', 'comms_direct', 'comms_meetings', 'comms_meeting_summaries'
  )
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE,
  can_use = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
SELECT r.id, m.id, TRUE, TRUE, TRUE, FALSE
FROM roles r
CROSS JOIN menu_items m
WHERE r.role_name IN (
  'system_admin', 'pmo_admin', 'project_manager', 'team_lead', 'team_member', 'stakeholder'
)
  AND m.menu_code = 'comms_meetings_new'
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE,
  can_use = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
SELECT r.id, m.id, TRUE, TRUE, TRUE, FALSE
FROM roles r
CROSS JOIN menu_items m
WHERE r.role_name IN (
  'system_admin', 'pmo_admin', 'project_manager', 'team_lead'
)
  AND m.menu_code = 'comms_pending_review'
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE,
  can_use = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

-- team_member & stakeholder: read pending AI menu (notification badge) — view only in app
INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
SELECT r.id, m.id, TRUE, FALSE, TRUE, FALSE
FROM roles r
CROSS JOIN menu_items m
WHERE r.role_name IN ('team_member', 'stakeholder')
  AND m.menu_code = 'comms_pending_review'
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE,
  can_use = FALSE,
  is_active = TRUE,
  updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v410_communications_menu_seed.sql applied';
END $$;
