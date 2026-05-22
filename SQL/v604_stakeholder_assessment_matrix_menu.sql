-- =============================================================================
-- v604: Stakeholder Assessment Matrix sidebar menu (Platform)
-- Plan: projectplan/v603_Stakeholder_Assessment_Matrix_CRUD_Plan.md
-- =============================================================================

DO $$
DECLARE
  v_parent_id UUID;
BEGIN
  SELECT id INTO v_parent_id FROM menu_items WHERE menu_code = 'stakeholders' LIMIT 1;
  IF v_parent_id IS NULL THEN
    RAISE EXCEPTION 'Stakeholders parent (menu_code = stakeholders) not found.';
  END IF;

  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES
    ('platform_stakeholders_assessment_matrix', 'Stakeholder Assessment Matrix',
     'Engagement assessment matrix (current vs desired levels)', v_parent_id, 2, 3,
     '/platform/stakeholders/assessment-matrix', 'table-2', true, true)
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    menu_description = EXCLUDED.menu_description,
    parent_menu_id = EXCLUDED.parent_menu_id,
    route_path = EXCLUDED.route_path,
    sort_order = EXCLUDED.sort_order,
    menu_icon = EXCLUDED.menu_icon,
    is_visible = true,
    is_active = true,
    updated_at = NOW();

  UPDATE menu_items SET sort_order = 4, updated_at = NOW()
  WHERE menu_code = 'platform_stakeholders_engagement' AND parent_menu_id = v_parent_id;

  UPDATE menu_items SET sort_order = 5, updated_at = NOW()
  WHERE menu_code = 'platform_stakeholders_communications' AND parent_menu_id = v_parent_id;

  UPDATE menu_items SET sort_order = 6, updated_at = NOW()
  WHERE menu_code = 'platform_stakeholders_monitoring' AND parent_menu_id = v_parent_id;

  RAISE NOTICE 'Stakeholder Assessment Matrix menu item created/updated';
END $$;

DO $$
DECLARE
  v_role_id UUID;
BEGIN
  FOR v_role_id IN
    SELECT DISTINCT rmi.role_id
    FROM role_menu_items rmi
    INNER JOIN menu_items m ON m.id = rmi.menu_item_id AND m.menu_code = 'stakeholders'
    WHERE rmi.can_view = true AND rmi.is_active = true AND (rmi.is_deleted = false OR rmi.is_deleted IS NULL)
  LOOP
    INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, m.id, true, true, true, false
    FROM menu_items m
    WHERE m.menu_code = 'platform_stakeholders_assessment_matrix'
    AND NOT EXISTS (
      SELECT 1 FROM role_menu_items rmi2
      WHERE rmi2.role_id = v_role_id AND rmi2.menu_item_id = m.id AND (rmi2.is_deleted = false OR rmi2.is_deleted IS NULL)
    );
  END LOOP;
END $$;
