-- ============================================================================
-- v577b: Industry Plan Templates — menu visibility fix (PMO + PM)
-- Run after v568 + v577 if industry items still missing from sidebars.
-- ============================================================================

DO $$
DECLARE
  v_pmo_parent UUID;
  v_pm_knowledge UUID;
  v_sim_knowledge UUID;
  v_tpl_sort INT;
  r RECORD;
BEGIN
  -- Prefer PMO "Projects" hub parent; fall back to template library parent, then top-level.
  SELECT id INTO v_pmo_parent
  FROM menu_items
  WHERE menu_code IN ('pmo_projects_section', 'pmo_section_projects', 'pmo_pp_section')
  ORDER BY CASE menu_code WHEN 'pmo_projects_section' THEN 0 ELSE 1 END
  LIMIT 1;

  IF v_pmo_parent IS NULL THEN
    SELECT parent_menu_id INTO v_pmo_parent
    FROM menu_items
    WHERE menu_code IN ('pmo-pp-project-templates', 'pm_template_library')
      AND parent_menu_id IS NOT NULL
    LIMIT 1;
  END IF;

  SELECT COALESCE(MAX(sort_order), 10) + 5 INTO v_tpl_sort
  FROM menu_items
  WHERE parent_menu_id IS NOT DISTINCT FROM v_pmo_parent
    AND COALESCE(is_deleted, FALSE) = FALSE;

  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active, is_deleted)
  VALUES
    ('pmo_industry_templates', 'Industry Templates', 'PMO industry plan blueprints', v_pmo_parent, CASE WHEN v_pmo_parent IS NULL THEN 1 ELSE 2 END, v_tpl_sort, '/pmo/industry-templates', 'layers', TRUE, TRUE, FALSE),
    ('pmo_industry_templates_new', 'Add Industry Template', 'Create industry plan template', v_pmo_parent, CASE WHEN v_pmo_parent IS NULL THEN 1 ELSE 2 END, v_tpl_sort + 1, '/pmo/industry-templates/new', 'plus-circle', TRUE, TRUE, FALSE),
    ('pmo_industry_templates_on_hold', 'Template Drafts', 'Draft industry templates', v_pmo_parent, CASE WHEN v_pmo_parent IS NULL THEN 1 ELSE 2 END, v_tpl_sort + 2, '/pmo/industry-templates/on-hold', 'pause-circle', TRUE, TRUE, FALSE)
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    parent_menu_id = COALESCE(EXCLUDED.parent_menu_id, menu_items.parent_menu_id),
    menu_level = EXCLUDED.menu_level,
    route_path = EXCLUDED.route_path,
    sort_order = EXCLUDED.sort_order,
    menu_icon = EXCLUDED.menu_icon,
    is_visible = TRUE,
    is_active = TRUE,
    is_deleted = FALSE,
    updated_at = NOW();

  SELECT id INTO v_pm_knowledge FROM menu_items WHERE menu_code = 'pm_section_knowledge_resources' LIMIT 1;

  IF v_pm_knowledge IS NOT NULL THEN
    INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active, is_deleted)
    VALUES
      ('pm_industry_templates_browse', 'Industry Templates', 'Browse PMO industry plan blueprints', v_pm_knowledge, 2, 50, '/platform/industry-templates', 'layers', TRUE, TRUE, FALSE),
      ('pm_industry_plan', 'My Industry Plan', 'Project industry plan copy', v_pm_knowledge, 2, 60, '/platform/projects/__PROJECT__/industry-plan', 'map', TRUE, TRUE, FALSE)
    ON CONFLICT (menu_code) DO UPDATE SET
      parent_menu_id = v_pm_knowledge,
      route_path = EXCLUDED.route_path,
      sort_order = EXCLUDED.sort_order,
      is_visible = TRUE,
      is_active = TRUE,
      is_deleted = FALSE,
      updated_at = NOW();
  ELSE
    RAISE NOTICE 'v577b: pm_section_knowledge_resources missing — run v568 first';
  END IF;

  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active, is_deleted)
  VALUES ('sim_pm_knowledge_section', 'Knowledge & Resources', 'Simulator knowledge section', NULL, 1, 290, NULL, 'book-open', TRUE, TRUE, FALSE)
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    is_visible = TRUE,
    is_active = TRUE,
    is_deleted = FALSE,
    updated_at = NOW();

  SELECT id INTO v_sim_knowledge FROM menu_items WHERE menu_code = 'sim_pm_knowledge_section' LIMIT 1;

  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active, is_deleted)
  VALUES
    ('sim_pm_industry_templates_browse', 'Industry Templates', 'Browse industry plan templates (sim)', v_sim_knowledge, 2, 50, '/simulator/industry-templates', 'layers', TRUE, TRUE, FALSE),
    ('sim_pm_industry_plan', 'My Practice Industry Plan', 'Practice project industry plan', v_sim_knowledge, 2, 60, '/simulator/practice-projects/__PRACTICE__/industry-plan', 'map', TRUE, TRUE, FALSE)
  ON CONFLICT (menu_code) DO UPDATE SET
    parent_menu_id = v_sim_knowledge,
    route_path = EXCLUDED.route_path,
    sort_order = EXCLUDED.sort_order,
    is_visible = TRUE,
    is_active = TRUE,
    is_deleted = FALSE,
    updated_at = NOW();

  -- PMO roles (support both snake_case and display names)
  FOR r IN
    SELECT id FROM roles
    WHERE COALESCE(is_deleted, FALSE) = FALSE
      AND (
        lower(trim(role_name)) IN ('pmo_admin', 'pmo_manager', 'platform_admin', 'system_admin', 'super_admin')
        OR role_name IN ('PMO Admin', 'PMO Manager', 'Platform Admin', 'System Admin', 'Super Admin')
      )
  LOOP
    INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT r.id, m.id, TRUE, TRUE, TRUE, FALSE
    FROM menu_items m
    WHERE m.menu_code IN ('pmo_industry_templates', 'pmo_industry_templates_new', 'pmo_industry_templates_on_hold')
    ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
      can_view = TRUE, can_use = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();
  END LOOP;

  -- Project Manager (+ display name variant)
  FOR r IN
    SELECT id FROM roles
    WHERE COALESCE(is_deleted, FALSE) = FALSE
      AND (lower(trim(role_name)) IN ('project_manager', 'project manager') OR role_name IN ('Project Manager'))
  LOOP
    INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT r.id, m.id, TRUE, FALSE, TRUE, FALSE
    FROM menu_items m WHERE m.menu_code = 'pm_industry_templates_browse'
    ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
      can_view = TRUE, can_use = FALSE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

    INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT r.id, m.id, TRUE, TRUE, TRUE, FALSE
    FROM menu_items m WHERE m.menu_code = 'pm_industry_plan'
    ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
      can_view = TRUE, can_use = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

    INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT r.id, m.id, TRUE, FALSE, TRUE, FALSE
    FROM menu_items m WHERE m.menu_code = 'sim_pm_industry_templates_browse'
    ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
      can_view = TRUE, can_use = FALSE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

    INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT r.id, m.id, TRUE, TRUE, TRUE, FALSE
    FROM menu_items m WHERE m.menu_code = 'sim_pm_industry_plan'
    ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
      can_view = TRUE, can_use = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

    -- Ensure Knowledge & Resources section header is visible when children are assigned
    IF v_pm_knowledge IS NOT NULL THEN
      INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
      VALUES (r.id, v_pm_knowledge, TRUE, TRUE, TRUE, FALSE)
      ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
        can_view = TRUE, can_use = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();
    END IF;
  END LOOP;

  RAISE NOTICE 'v577b_industry_template_menu_visibility_fix applied';
END $$;
