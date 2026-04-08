-- ============================================================================
-- v407: Template Library — menu_items + role_menu_items
-- Prerequisites: v406_template_library_tables.sql, roles, menu_items
-- Routes align with frontend: /platform/templates/...
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
    'template_library',
    'Template Library',
    'Browse master templates and project-tailored copies',
    NULL,
    1,
    56,
    '/platform/templates',
    'file-text',
    '#7C3AED',
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

  SELECT id INTO v_parent_id FROM menu_items WHERE menu_code = 'template_library' AND is_deleted = FALSE LIMIT 1;

  INSERT INTO menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, menu_color, is_visible, is_active
  )
  VALUES
    ('template_library_browse', 'Browse Templates', 'Published master templates', v_parent_id, 2, 1, '/platform/templates', 'search', '#7C3AED', TRUE, TRUE),
    ('template_library_manage', 'Manage Templates', 'All statuses — PMO', v_parent_id, 2, 2, '/platform/templates/manage', 'settings', '#7C3AED', TRUE, TRUE),
    ('template_library_new', 'New Template', 'Create master template', v_parent_id, 2, 3, '/platform/templates/new', 'plus', '#7C3AED', TRUE, TRUE),
    ('template_library_categories', 'Categories', 'Manage categories', v_parent_id, 2, 4, '/platform/templates/categories', 'layers', '#7C3AED', TRUE, TRUE),
    ('template_library_project_copies', 'My Project Templates', 'Tailored copies', v_parent_id, 2, 5, '/platform/templates/project-copies', 'copy', '#7C3AED', TRUE, TRUE),
    ('template_library_on_hold', 'Drafts / On hold', 'In-progress copies', v_parent_id, 2, 6, '/platform/templates/on-hold', 'pause-circle', '#7C3AED', TRUE, TRUE),
    ('template_library_bulk', 'Bulk upload', 'Import templates', v_parent_id, 2, 7, '/platform/templates/bulk-upload', 'upload', '#7C3AED', TRUE, TRUE),
    ('template_library_notifications', 'Update Notifications', 'Master template changes', v_parent_id, 2, 8, '/platform/templates/notifications', 'bell', '#7C3AED', TRUE, TRUE)
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

  RAISE NOTICE 'v407: template_library menu items seeded';
END $$;

-- All roles: hub + browse + notifications + project copies list
INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
SELECT r.id, m.id, TRUE, TRUE, TRUE, FALSE
FROM roles r
CROSS JOIN menu_items m
WHERE r.role_name IN (
  'system_admin', 'pmo_admin', 'project_manager', 'team_lead', 'team_member', 'stakeholder', 'viewer'
)
  AND m.menu_code IN (
    'template_library',
    'template_library_browse',
    'template_library_project_copies',
    'template_library_notifications'
  )
  AND m.is_deleted = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_use = EXCLUDED.can_use,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

-- PMO / system admin: management items
INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
SELECT r.id, m.id, TRUE, TRUE, TRUE, FALSE
FROM roles r
CROSS JOIN menu_items m
WHERE r.role_name IN ('system_admin', 'pmo_admin')
  AND m.menu_code IN (
    'template_library_manage',
    'template_library_new',
    'template_library_categories',
    'template_library_bulk'
  )
  AND m.is_deleted = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_use = EXCLUDED.can_use,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

-- PM, TL, TM, stakeholder: on-hold queue
INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
SELECT r.id, m.id, TRUE, TRUE, TRUE, FALSE
FROM roles r
CROSS JOIN menu_items m
WHERE r.role_name IN (
  'system_admin', 'pmo_admin', 'project_manager', 'team_lead', 'team_member', 'stakeholder'
)
  AND m.menu_code = 'template_library_on_hold'
  AND m.is_deleted = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_use = EXCLUDED.can_use,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

-- Viewer: read-only (no manage / new / categories / bulk / on-hold — already excluded)
DO $$
BEGIN
  RAISE NOTICE 'v407_template_library_menu_seed.sql applied';
END $$;
