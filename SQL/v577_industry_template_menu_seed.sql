-- ============================================================================
-- v577: Industry Plan Templates — Menu seed (PMO + PM Platform + Simulator PM)
-- Prerequisites: v568 (PM sidebar), v575 tables
-- ============================================================================

DO $$
DECLARE
  v_pmo_projects UUID;
  v_pm_knowledge UUID;
  v_sim_knowledge UUID;
  v_pmo_admin UUID;
  v_pmo_manager UUID;
  v_pm_role UUID;
  v_tpl_sort INT;
BEGIN
  -- PMO Projects section parent (static config id: pmo-projects — find by route or label)
  SELECT id INTO v_pmo_projects
  FROM menu_items
  WHERE menu_code IN ('pmo_projects_section', 'pmo_section_projects', 'pmo_pp_section')
     OR (menu_label ILIKE '%Projects%' AND menu_level = 1 AND parent_menu_id IS NULL)
  ORDER BY CASE menu_code WHEN 'pmo_projects_section' THEN 0 ELSE 1 END
  LIMIT 1;

  IF v_pmo_projects IS NULL THEN
    SELECT parent_menu_id INTO v_pmo_projects
    FROM menu_items WHERE menu_code = 'pmo-pp-project-templates' LIMIT 1;
  END IF;

  SELECT COALESCE(MAX(sort_order), 10) + 5 INTO v_tpl_sort
  FROM menu_items
  WHERE parent_menu_id IS NOT DISTINCT FROM v_pmo_projects
    AND COALESCE(is_deleted, FALSE) = FALSE;

  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES
    ('pmo_industry_templates', 'Industry Templates', 'PMO industry plan blueprints', v_pmo_projects, 2, v_tpl_sort, '/pmo/industry-templates', 'layers', TRUE, TRUE),
    ('pmo_industry_templates_new', 'Add Industry Template', 'Create industry plan template', v_pmo_projects, 2, v_tpl_sort + 1, '/pmo/industry-templates/new', 'plus-circle', TRUE, TRUE),
    ('pmo_industry_templates_on_hold', 'Template Drafts', 'Draft and on-hold industry templates', v_pmo_projects, 2, v_tpl_sort + 2, '/pmo/industry-templates/on-hold', 'pause-circle', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    parent_menu_id = COALESCE(EXCLUDED.parent_menu_id, menu_items.parent_menu_id),
    route_path = EXCLUDED.route_path,
    sort_order = EXCLUDED.sort_order,
    menu_icon = EXCLUDED.menu_icon,
    is_visible = TRUE,
    is_active = TRUE,
    is_deleted = FALSE,
    updated_at = NOW();

  -- §14 Knowledge & Resources (v568)
  SELECT id INTO v_pm_knowledge FROM menu_items WHERE menu_code = 'pm_section_knowledge_resources' LIMIT 1;

  IF v_pm_knowledge IS NOT NULL THEN
    INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
    VALUES
      ('pm_industry_templates_browse', 'Industry Templates', 'Browse PMO industry plan blueprints', v_pm_knowledge, 2, 50, '/platform/industry-templates', 'layers', TRUE, TRUE),
      ('pm_industry_plan', 'My Industry Plan', 'Project industry plan copy', v_pm_knowledge, 2, 60, '/platform/projects/__PROJECT__/industry-plan', 'map', TRUE, TRUE)
    ON CONFLICT (menu_code) DO UPDATE SET
      parent_menu_id = v_pm_knowledge,
      route_path = EXCLUDED.route_path,
      sort_order = EXCLUDED.sort_order,
      is_visible = TRUE,
      is_active = TRUE,
      is_deleted = FALSE,
      updated_at = NOW();
  END IF;

  -- Simulator §14 equivalent
  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('sim_pm_knowledge_section', 'Knowledge & Resources', 'Simulator knowledge section', NULL, 1, 290, NULL, 'book-open', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    is_visible = TRUE,
    is_active = TRUE,
    is_deleted = FALSE,
    updated_at = NOW();

  SELECT id INTO v_sim_knowledge FROM menu_items WHERE menu_code = 'sim_pm_knowledge_section' LIMIT 1;

  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES
    ('sim_pm_industry_templates_browse', 'Industry Templates', 'Browse industry plan templates (sim)', v_sim_knowledge, 2, 50, '/simulator/industry-templates', 'layers', TRUE, TRUE),
    ('sim_pm_industry_plan', 'My Practice Industry Plan', 'Practice project industry plan', v_sim_knowledge, 2, 60, '/simulator/practice-projects/__PRACTICE__/industry-plan', 'map', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    parent_menu_id = v_sim_knowledge,
    route_path = EXCLUDED.route_path,
    sort_order = EXCLUDED.sort_order,
    is_visible = TRUE,
    is_active = TRUE,
    is_deleted = FALSE,
    updated_at = NOW();

  SELECT id INTO v_pmo_admin FROM roles WHERE role_name = 'pmo_admin' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
  SELECT id INTO v_pmo_manager FROM roles WHERE role_name = 'pmo_manager' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
  SELECT id INTO v_pm_role FROM roles WHERE role_name = 'project_manager' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;

  IF v_pmo_admin IS NOT NULL THEN
    INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_pmo_admin, m.id, TRUE, TRUE, TRUE, FALSE
    FROM menu_items m
    WHERE m.menu_code IN ('pmo_industry_templates', 'pmo_industry_templates_new', 'pmo_industry_templates_on_hold')
    ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();
  END IF;

  IF v_pmo_manager IS NOT NULL THEN
    INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_pmo_manager, m.id, TRUE, TRUE, TRUE, FALSE
    FROM menu_items m
    WHERE m.menu_code IN ('pmo_industry_templates', 'pmo_industry_templates_new', 'pmo_industry_templates_on_hold')
    ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();
  END IF;

  IF v_pm_role IS NOT NULL THEN
    INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_pm_role, m.id, TRUE, FALSE, TRUE, FALSE
    FROM menu_items m WHERE m.menu_code = 'pm_industry_templates_browse'
    ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = FALSE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

    INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_pm_role, m.id, TRUE, TRUE, TRUE, FALSE
    FROM menu_items m WHERE m.menu_code = 'pm_industry_plan'
    ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

    INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_pm_role, m.id, TRUE, FALSE, TRUE, FALSE
    FROM menu_items m WHERE m.menu_code = 'sim_pm_industry_templates_browse'
    ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = FALSE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

    INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_pm_role, m.id, TRUE, TRUE, TRUE, FALSE
    FROM menu_items m WHERE m.menu_code = 'sim_pm_industry_plan'
    ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();
  END IF;

  RAISE NOTICE 'v577_industry_template_menu_seed.sql applied';
END $$;
