-- ============================================================================
-- v573: PM OPA tailoring menu items (Platform + Simulator)
-- Prerequisites: v572_project_opa_tailoring_tables.sql, v401_eef_opa_menu_seed.sql
-- ============================================================================

DO $$
DECLARE
  v_parent_id UUID;
BEGIN
  SELECT id INTO v_parent_id FROM menu_items WHERE menu_code = 'org_knowledge' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;

  IF v_parent_id IS NULL THEN
    RAISE NOTICE 'v573: org_knowledge parent missing — skip menu seed';
    RETURN;
  END IF;

  INSERT INTO menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, menu_color, is_visible, is_active
  )
  VALUES
    (
      'pm_opa_templates_browse',
      'Browse OPA Templates',
      'View PMO OPA templates to copy into your project',
      v_parent_id,
      2,
      9,
      '/platform/opa?type=template',
      'layout-template',
      '#0EA5E9',
      TRUE,
      TRUE
    ),
    (
      'pm_project_opa_templates',
      'My Project Templates',
      'Tailored OPA templates for the current project',
      v_parent_id,
      2,
      10,
      '/platform/projects/:id/opa-templates',
      'files',
      '#0EA5E9',
      TRUE,
      TRUE
    ),
    (
      'sim_pm_opa_templates_browse',
      'Browse OPA Templates',
      'Practice: browse PMO OPA templates',
      v_parent_id,
      2,
      11,
      '/simulator/opa?type=template',
      'layout-template',
      '#0EA5E9',
      TRUE,
      TRUE
    ),
    (
      'sim_pm_project_opa_templates',
      'My Project Templates',
      'Practice: tailored OPA templates for this practice project',
      v_parent_id,
      2,
      12,
      '/simulator/practice-projects/:id/opa-templates',
      'files',
      '#0EA5E9',
      TRUE,
      TRUE
    )
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

  RAISE NOTICE 'v573: PM OPA tailoring menu items seeded';
END $$;

-- Browse: view-only for project_manager
INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
SELECT r.id, m.id, TRUE, FALSE, TRUE, FALSE
FROM roles r
CROSS JOIN menu_items m
WHERE r.role_name = 'project_manager'
  AND m.menu_code IN ('pm_opa_templates_browse', 'sim_pm_opa_templates_browse')
  AND COALESCE(m.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE,
  can_use = FALSE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

-- My project templates: full access for project_manager
INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
SELECT r.id, m.id, TRUE, TRUE, TRUE, FALSE
FROM roles r
CROSS JOIN menu_items m
WHERE r.role_name = 'project_manager'
  AND m.menu_code IN ('pm_project_opa_templates', 'sim_pm_project_opa_templates')
  AND COALESCE(m.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE,
  can_use = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

-- PMO / system_admin: full on all four
INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
SELECT r.id, m.id, TRUE, TRUE, TRUE, FALSE
FROM roles r
CROSS JOIN menu_items m
WHERE r.role_name IN ('pmo_admin', 'system_admin')
  AND m.menu_code IN (
    'pm_opa_templates_browse',
    'pm_project_opa_templates',
    'sim_pm_opa_templates_browse',
    'sim_pm_project_opa_templates'
  )
  AND COALESCE(m.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE,
  can_use = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v573_project_opa_tailoring_menu_seed.sql applied';
END $$;
