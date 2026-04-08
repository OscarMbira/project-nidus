-- ============================================================================
-- v401: Org Knowledge (EEF & OPA) — menu_items + role_menu_items
-- Prerequisites: v400_eef_opa_tables.sql, v14/v05 menu tables, roles
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
    'org_knowledge',
    'Org Knowledge',
    'Enterprise environment factors and organisational process assets',
    NULL,
    1,
    55,
    '/platform/org-knowledge',
    'book-open',
    '#0EA5E9',
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

  SELECT id INTO v_parent_id FROM menu_items WHERE menu_code = 'org_knowledge' AND is_deleted = FALSE LIMIT 1;

  INSERT INTO menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, menu_color, is_visible, is_active
  )
  VALUES
    ('org_knowledge_eef', 'Environment Factors', 'Browse enterprise environment factors', v_parent_id, 2, 1, '/platform/eef', 'globe', '#0EA5E9', TRUE, TRUE),
    ('org_knowledge_eef_new', 'Add EEF', 'Create a new enterprise environment factor', v_parent_id, 2, 2, '/platform/eef/new', 'plus', '#0EA5E9', TRUE, TRUE),
    ('org_knowledge_eef_drafts', 'EEF Drafts', 'On-hold and draft EEF records', v_parent_id, 2, 3, '/platform/eef/on-hold', 'pause-circle', '#0EA5E9', TRUE, TRUE),
    ('org_knowledge_eef_bulk', 'EEF Bulk upload', 'Import EEF records from CSV', v_parent_id, 2, 4, '/platform/eef/bulk-upload', 'upload', '#0EA5E9', TRUE, TRUE),
    ('org_knowledge_opa', 'Process Assets', 'Browse organisational process assets', v_parent_id, 2, 5, '/platform/opa', 'library', '#0EA5E9', TRUE, TRUE),
    ('org_knowledge_opa_new', 'Add OPA', 'Create a new organisational process asset', v_parent_id, 2, 6, '/platform/opa/new', 'plus', '#0EA5E9', TRUE, TRUE),
    ('org_knowledge_opa_drafts', 'OPA Drafts', 'On-hold and draft OPA records', v_parent_id, 2, 7, '/platform/opa/on-hold', 'pause-circle', '#0EA5E9', TRUE, TRUE),
    ('org_knowledge_opa_bulk', 'OPA Bulk upload', 'Import OPA records from CSV', v_parent_id, 2, 8, '/platform/opa/bulk-upload', 'upload', '#0EA5E9', TRUE, TRUE)
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

  RAISE NOTICE 'Menu org_knowledge items seeded';
END $$;

-- All roles except viewer: full menu set
INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
SELECT r.id, m.id, TRUE, TRUE, TRUE, FALSE
FROM roles r
CROSS JOIN menu_items m
WHERE r.role_name IN (
  'system_admin', 'pmo_admin', 'project_manager', 'team_lead', 'team_member', 'stakeholder'
)
  AND m.menu_code IN (
    'org_knowledge',
    'org_knowledge_eef',
    'org_knowledge_eef_new',
    'org_knowledge_eef_drafts',
    'org_knowledge_eef_bulk',
    'org_knowledge_opa',
    'org_knowledge_opa_new',
    'org_knowledge_opa_drafts',
    'org_knowledge_opa_bulk'
  )
  AND m.is_deleted = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE,
  can_use = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

-- Viewer: read-only (hub + list pages only)
INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
SELECT r.id, m.id, TRUE, TRUE, TRUE, FALSE
FROM roles r
CROSS JOIN menu_items m
WHERE r.role_name = 'viewer'
  AND m.menu_code IN ('org_knowledge', 'org_knowledge_eef', 'org_knowledge_opa')
  AND m.is_deleted = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE,
  can_use = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();
