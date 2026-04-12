-- ============================================================================
-- v446: Project Delays — permissions + menu_items + role_menu_items (v353)
-- Prerequisites: permissions, roles, role_permissions, menu_items, role_menu_items, v444
-- ============================================================================

INSERT INTO permissions (permission_code, permission_name, permission_description, permission_category, created_at)
VALUES
  ('delay.view', 'View delays', 'View project delay register entries', 'governance', NOW()),
  ('delay.create', 'Create delays', 'Log new project delays', 'governance', NOW()),
  ('delay.edit', 'Edit delays', 'Edit project delay entries', 'governance', NOW()),
  ('delay.delete', 'Delete delays', 'Delete or archive project delays', 'governance', NOW()),
  ('delay.copy', 'Copy delay template', 'Copy a PMO delay template into a project delay', 'governance', NOW()),
  ('delay_template.view', 'View delay templates', 'View organisation delay templates', 'governance', NOW()),
  ('delay_template.create', 'Create delay templates', 'Create PMO delay templates', 'governance', NOW()),
  ('delay_template.edit', 'Edit delay templates', 'Edit PMO delay templates', 'governance', NOW()),
  ('delay_template.delete', 'Delete delay templates', 'Archive or delete PMO delay templates', 'governance', NOW())
ON CONFLICT (permission_code) DO UPDATE SET
  permission_name = EXCLUDED.permission_name,
  permission_description = EXCLUDED.permission_description,
  updated_at = NOW();

-- system_admin, pmo_admin — all delay + template permissions
INSERT INTO role_permissions (role_id, permission_id, is_active, is_deleted)
SELECT r.id, p.id, TRUE, FALSE
FROM roles r
CROSS JOIN permissions p
WHERE p.permission_code IN (
  'delay.view', 'delay.create', 'delay.edit', 'delay.delete', 'delay.copy',
  'delay_template.view', 'delay_template.create', 'delay_template.edit', 'delay_template.delete'
)
  AND r.role_name IN ('system_admin', 'pmo_admin')
ON CONFLICT (role_id, permission_id) DO UPDATE SET is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

-- PM / programme / portfolio — delays (full) + template view only (templates CRUD via PMO)
INSERT INTO role_permissions (role_id, permission_id, is_active, is_deleted)
SELECT r.id, p.id, TRUE, FALSE
FROM roles r
CROSS JOIN permissions p
WHERE p.permission_code IN ('delay.view', 'delay.create', 'delay.edit', 'delay.delete', 'delay.copy', 'delay_template.view')
  AND r.role_name IN ('project_manager', 'programme_manager', 'portfolio_manager')
ON CONFLICT (role_id, permission_id) DO UPDATE SET is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

-- Team managers / leads — view, copy, create (edit via RLS for project writes)
INSERT INTO role_permissions (role_id, permission_id, is_active, is_deleted)
SELECT r.id, p.id, TRUE, FALSE
FROM roles r
CROSS JOIN permissions p
WHERE p.permission_code IN ('delay.view', 'delay.copy', 'delay.create', 'delay_template.view')
  AND r.role_name IN ('team_lead', 'team_manager', 'pm_team_manager')
ON CONFLICT (role_id, permission_id) DO UPDATE SET is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

-- Assurance / QA / members / stakeholder — view
INSERT INTO role_permissions (role_id, permission_id, is_active, is_deleted)
SELECT r.id, p.id, TRUE, FALSE
FROM roles r
CROSS JOIN permissions p
WHERE p.permission_code = 'delay.view'
  AND r.role_name IN (
    'pm_project_assurance', 'project_assurance',
    'pm_quality_assurance', 'quality_assurance',
    'pm_team_member', 'team_member', 'stakeholder', 'viewer'
  )
ON CONFLICT (role_id, permission_id) DO UPDATE SET is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

INSERT INTO role_permissions (role_id, permission_id, is_active, is_deleted)
SELECT r.id, p.id, TRUE, FALSE
FROM roles r
CROSS JOIN permissions p
WHERE p.permission_code IN ('delay.view', 'delay.copy', 'delay.create', 'delay_template.view')
  AND r.role_name IN ('Team Manager', 'Team Lead')
ON CONFLICT (role_id, permission_id) DO UPDATE SET is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

INSERT INTO role_permissions (role_id, permission_id, is_active, is_deleted)
SELECT r.id, p.id, TRUE, FALSE
FROM roles r
CROSS JOIN permissions p
WHERE p.permission_code = 'delay.view'
  AND r.role_name IN ('Team Member', 'Project Assurance', 'Quality Assurance', 'Stakeholder')
ON CONFLICT (role_id, permission_id) DO UPDATE SET is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

-- Menu: parent + items
DO $$
DECLARE
  v_parent UUID;
BEGIN
  INSERT INTO menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  )
  VALUES (
    'delay_management',
    'Delays',
    'Project delay register and organisation delay templates',
    NULL,
    1,
    62,
    NULL,
    'clock-alert',
    TRUE,
    TRUE
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

  SELECT id INTO v_parent FROM menu_items WHERE menu_code = 'delay_management' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;

  INSERT INTO menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  )
  VALUES
    ('delay_register_platform', 'Delay Register', 'Project delay register', v_parent, 2, 1, '/platform/delays', 'list', TRUE, TRUE),
    ('delay_drafts_platform', 'Delay Drafts', 'Delays on hold', v_parent, 2, 2, '/platform/delays/drafts', 'pause-circle', TRUE, TRUE),
    ('delay_templates_pmo', 'Delay Templates', 'PMO delay templates', v_parent, 2, 3, '/pmo/delays/templates', 'library', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    parent_menu_id = EXCLUDED.parent_menu_id,
    route_path = EXCLUDED.route_path,
    menu_icon = EXCLUDED.menu_icon,
    is_visible = TRUE,
    is_active = TRUE,
    is_deleted = FALSE,
    updated_at = NOW();
END $$;

-- Assign menus: delay.view → parent + register + templates (view templates)
INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
SELECT r.id, m.id, TRUE, TRUE, TRUE, FALSE
FROM roles r
INNER JOIN role_permissions rp ON rp.role_id = r.id AND COALESCE(rp.is_deleted, FALSE) = FALSE AND rp.is_active = TRUE
INNER JOIN permissions p ON p.id = rp.permission_id AND p.permission_code = 'delay.view'
CROSS JOIN menu_items m
WHERE m.menu_code IN ('delay_management', 'delay_register_platform', 'delay_templates_pmo')
  AND COALESCE(m.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

-- Drafts: delay.create
INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
SELECT r.id, m.id, TRUE, TRUE, TRUE, FALSE
FROM roles r
INNER JOIN role_permissions rp ON rp.role_id = r.id AND COALESCE(rp.is_deleted, FALSE) = FALSE AND rp.is_active = TRUE
INNER JOIN permissions p ON p.id = rp.permission_id AND p.permission_code = 'delay.create'
CROSS JOIN menu_items m
WHERE m.menu_code = 'delay_drafts_platform'
  AND COALESCE(m.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();
