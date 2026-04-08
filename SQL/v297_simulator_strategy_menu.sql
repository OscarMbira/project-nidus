-- =====================================================
-- v297: Simulator Strategy menu items (public.menu_items)
-- =====================================================
-- Adds Strategy section for Simulator with same 5 sub-items
-- as Platform: Strategic Objectives, Alignment, Contribution,
-- Portfolio, Reports. Sidebar shows these when path is /simulator/*.
-- =====================================================

-- Simulator Strategy parent
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, menu_color, is_visible, is_active)
VALUES (
  'sim_strategy',
  'Strategy',
  'Strategic alignment (Simulator)',
  NULL,
  1,
  12,
  '/simulator/strategy',
  'compass',
  '#8B5CF6',
  true,
  true
)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  route_path = EXCLUDED.route_path,
  sort_order = EXCLUDED.sort_order,
  is_visible = true,
  is_active = true,
  updated_at = NOW();

-- Simulator Strategy sub-items (children of sim_strategy)
DO $$
DECLARE
  v_parent_id UUID;
BEGIN
  SELECT id INTO v_parent_id FROM menu_items WHERE menu_code = 'sim_strategy' LIMIT 1;
  IF v_parent_id IS NULL THEN
    RAISE EXCEPTION 'sim_strategy parent not found';
  END IF;

  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES
    ('sim_strategy_objectives',   'Strategic Objectives',   'Define and manage strategic objectives (Simulator)',   v_parent_id, 2, 1, '/simulator/strategy/objectives',   'target',         true, true),
    ('sim_strategy_alignment',    'Strategic Alignment',    'View alignment scores and mappings (Simulator)',        v_parent_id, 2, 2, '/simulator/strategy/alignment',    'compass',         true, true),
    ('sim_strategy_contribution', 'Strategic Contribution', 'Track strategic contributions (Simulator)',            v_parent_id, 2, 3, '/simulator/strategy/contribution', 'trending-up',     true, true),
    ('sim_strategy_portfolio',    'Strategic Portfolio',    'View strategic portfolio alignment (Simulator)',       v_parent_id, 2, 4, '/simulator/strategy/portfolio',    'folder-kanban',   true, true),
    ('sim_strategy_reports',      'Strategic Reports',      'Generate strategic alignment reports (Simulator)',      v_parent_id, 2, 5, '/simulator/strategy/reports',      'file-text',       true, true)
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    menu_description = EXCLUDED.menu_description,
    parent_menu_id = EXCLUDED.parent_menu_id,
    route_path = EXCLUDED.route_path,
    sort_order = EXCLUDED.sort_order,
    is_visible = true,
    is_active = true,
    updated_at = NOW();

  RAISE NOTICE 'Simulator Strategy sub-menu items created';
END $$;

-- Grant access to roles that have platform strategy access (project_manager, portfolio_manager, etc.)
DO $$
DECLARE
  v_role_id UUID;
  v_menu_id UUID;
BEGIN
  FOR v_role_id IN
    SELECT DISTINCT r.id FROM roles r
    INNER JOIN role_menu_items rmi ON rmi.role_id = r.id
    INNER JOIN menu_items m ON m.id = rmi.menu_item_id AND m.menu_code = 'strategy'
    WHERE rmi.can_view = true
  LOOP
    FOR v_menu_id IN
      SELECT id FROM menu_items
      WHERE menu_code IN (
        'sim_strategy',
        'sim_strategy_objectives',
        'sim_strategy_alignment',
        'sim_strategy_contribution',
        'sim_strategy_portfolio',
        'sim_strategy_reports'
      )
      AND is_visible = true
    LOOP
      INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active)
      VALUES (v_role_id, v_menu_id, true, true, true)
      ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
        can_view = EXCLUDED.can_view,
        can_use = EXCLUDED.can_use,
        is_active = EXCLUDED.is_active,
        updated_at = NOW();
    END LOOP;
  END LOOP;
  RAISE NOTICE 'Simulator Strategy role-menu access granted';
END $$;
