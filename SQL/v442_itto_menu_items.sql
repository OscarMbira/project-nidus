-- ============================================================================
-- v442: ITTO — permissions + menu_items + role_menu_items (v352)
-- Prerequisites: permissions, roles, role_permissions, menu_items, role_menu_items
-- ============================================================================

INSERT INTO permissions (permission_code, permission_name, permission_description, permission_category, created_at)
VALUES
  ('itto.view', 'View ITTO', 'View ITTO templates and project ITTO records', 'governance', NOW()),
  ('itto.create', 'Create ITTO', 'Create ITTO templates (PMO) or project ITTO instances', 'governance', NOW()),
  ('itto.edit', 'Edit ITTO', 'Edit ITTO templates or project ITTO instances', 'governance', NOW()),
  ('itto.delete', 'Delete ITTO', 'Delete or archive ITTO templates or project ITTOs', 'governance', NOW()),
  ('itto.copy', 'Copy ITTO template', 'Copy an organisation ITTO template into a project', 'governance', NOW())
ON CONFLICT (permission_code) DO UPDATE SET
  permission_name = EXCLUDED.permission_name,
  permission_description = EXCLUDED.permission_description,
  updated_at = NOW();

-- Full set: system_admin, pmo_admin
INSERT INTO role_permissions (role_id, permission_id, is_active, is_deleted)
SELECT r.id, p.id, TRUE, FALSE
FROM roles r
CROSS JOIN permissions p
WHERE p.permission_code IN ('itto.view', 'itto.create', 'itto.edit', 'itto.delete', 'itto.copy')
  AND r.role_name IN ('system_admin', 'pmo_admin')
ON CONFLICT (role_id, permission_id) DO UPDATE SET is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

-- PM / programme / portfolio — view + create + edit + delete + copy (project scope enforced in RLS)
INSERT INTO role_permissions (role_id, permission_id, is_active, is_deleted)
SELECT r.id, p.id, TRUE, FALSE
FROM roles r
CROSS JOIN permissions p
WHERE p.permission_code IN ('itto.view', 'itto.create', 'itto.edit', 'itto.delete', 'itto.copy')
  AND r.role_name IN ('project_manager', 'programme_manager', 'portfolio_manager')
ON CONFLICT (role_id, permission_id) DO UPDATE SET is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

-- Team lead / team managers — view + copy + create (project ITTOs)
INSERT INTO role_permissions (role_id, permission_id, is_active, is_deleted)
SELECT r.id, p.id, TRUE, FALSE
FROM roles r
CROSS JOIN permissions p
WHERE p.permission_code IN ('itto.view', 'itto.copy', 'itto.create')
  AND r.role_name IN ('team_lead', 'team_manager', 'pm_team_manager')
ON CONFLICT (role_id, permission_id) DO UPDATE SET is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

-- Assurance / QA / members / stakeholder — view only
INSERT INTO role_permissions (role_id, permission_id, is_active, is_deleted)
SELECT r.id, p.id, TRUE, FALSE
FROM roles r
CROSS JOIN permissions p
WHERE p.permission_code = 'itto.view'
  AND r.role_name IN (
    'pm_project_assurance', 'project_assurance',
    'pm_quality_assurance', 'quality_assurance',
    'pm_team_member', 'team_member', 'stakeholder', 'viewer'
  )
ON CONFLICT (role_id, permission_id) DO UPDATE SET is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

-- Optional aliases if present in roles table
INSERT INTO role_permissions (role_id, permission_id, is_active, is_deleted)
SELECT r.id, p.id, TRUE, FALSE
FROM roles r
CROSS JOIN permissions p
WHERE p.permission_code IN ('itto.view', 'itto.copy', 'itto.create')
  AND r.role_name IN ('Team Manager', 'Team Lead')
ON CONFLICT (role_id, permission_id) DO UPDATE SET is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

INSERT INTO role_permissions (role_id, permission_id, is_active, is_deleted)
SELECT r.id, p.id, TRUE, FALSE
FROM roles r
CROSS JOIN permissions p
WHERE p.permission_code = 'itto.view'
  AND r.role_name IN ('Team Member', 'Project Assurance', 'Quality Assurance', 'Stakeholder')
ON CONFLICT (role_id, permission_id) DO UPDATE SET is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

-- Menu: parent + platform routes (admin / dynamic menu consumers)
DO $$
DECLARE
  v_parent UUID;
BEGIN
  INSERT INTO menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  )
  VALUES (
    'itto_management',
    'ITTO Management',
    'Inputs, Tools & Techniques, and Outputs templates and project records',
    NULL,
    1,
    61,
    NULL,
    'git-branch',
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

  SELECT id INTO v_parent FROM menu_items WHERE menu_code = 'itto_management' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;

  INSERT INTO menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  )
  VALUES
    ('itto_templates_platform', 'ITTO Templates', 'Browse organisation ITTO templates', v_parent, 2, 1, '/platform/itto/templates', 'layers', TRUE, TRUE),
    ('itto_project_platform', 'Project ITTOs', 'Project-specific ITTO instances', v_parent, 2, 2, '/platform/itto/project', 'file-stack', TRUE, TRUE),
    ('itto_drafts_platform', 'ITTO Drafts', 'Draft templates and project ITTOs on hold', v_parent, 2, 3, '/platform/itto/drafts', 'pause-circle', TRUE, TRUE)
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

-- Assign menu to roles that have itto.view
INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
SELECT r.id, m.id, TRUE, TRUE, TRUE, FALSE
FROM roles r
INNER JOIN role_permissions rp ON rp.role_id = r.id AND COALESCE(rp.is_deleted, FALSE) = FALSE AND rp.is_active = TRUE
INNER JOIN permissions p ON p.id = rp.permission_id AND p.permission_code = 'itto.view'
CROSS JOIN menu_items m
WHERE m.menu_code IN ('itto_management', 'itto_templates_platform', 'itto_project_platform')
  AND COALESCE(m.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

-- Drafts menu: itto.create
INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
SELECT r.id, m.id, TRUE, TRUE, TRUE, FALSE
FROM roles r
INNER JOIN role_permissions rp ON rp.role_id = r.id AND COALESCE(rp.is_deleted, FALSE) = FALSE AND rp.is_active = TRUE
INNER JOIN permissions p ON p.id = rp.permission_id AND p.permission_code = 'itto.create'
CROSS JOIN menu_items m
WHERE m.menu_code = 'itto_drafts_platform'
  AND COALESCE(m.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();
