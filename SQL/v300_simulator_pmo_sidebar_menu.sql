-- =====================================================
-- v300: Simulator PMO sidebar menu items (public.menu_items)
-- =====================================================
-- Adds PMO section for Simulator so the main sidebar shows "PMO"
-- when user is in simulator context (/simulator/*). Clicking PMO
-- goes to Simulator PMO Dashboard; children link to each section.
-- Mirrors Platform PMO structure for simulator (Governance,
-- Initiation, Oversight, Procurement, Reporting).
-- =====================================================

-- Simulator PMO parent (single click goes to dashboard)
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, menu_color, is_visible, is_active)
VALUES (
  'sim_pmo',
  'PMO',
  'Simulator PMO Dashboard and practice governance',
  NULL,
  1,
  20,
  '/simulator/pmo/dashboard',
  'shield',
  '#6366F1',
  true,
  true
)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  route_path = EXCLUDED.route_path,
  sort_order = EXCLUDED.sort_order,
  menu_icon = EXCLUDED.menu_icon,
  is_visible = true,
  is_active = true,
  updated_at = NOW();

-- Simulator PMO sub-items (children of sim_pmo)
DO $$
DECLARE
  v_parent_id UUID;
BEGIN
  SELECT id INTO v_parent_id FROM menu_items WHERE menu_code = 'sim_pmo' LIMIT 1;
  IF v_parent_id IS NULL THEN
    RAISE EXCEPTION 'sim_pmo parent not found';
  END IF;

  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES
    ('sim_pmo_dashboard',           'PMO Dashboard',              'Simulator PMO overview',                           v_parent_id, 2, 0, '/simulator/pmo/dashboard',                  'layout-dashboard', true, true),
    ('sim_pmo_governance',          'PMO Governance',             'Practice mandates and strategies',                  v_parent_id, 2, 1, '/simulator/pmo/governance/mandate',           'shield',           true, true),
    ('sim_pmo_initiation',          'Initiation & Business',      'Business cases, briefs, benefits review plans',    v_parent_id, 2, 2, '/simulator/pmo/initiation/business-case',     'briefcase',        true, true),
    ('sim_pmo_oversight',           'Practice Oversight',         'Risk, issue, quality registers and lessons',       v_parent_id, 2, 3, '/simulator/pmo/oversight/risk-register',      'eye',              true, true),
    ('sim_pmo_procurement',         'Procurement',                'Practice RFP register and drafts',                  v_parent_id, 2, 4, '/simulator/pmo/procurement/rfp',              'shopping-cart',    true, true),
    ('sim_pmo_reporting',           'Reporting & Assurance',      'Highlight, exception, end stage and end project', v_parent_id, 2, 5, '/simulator/pmo/reporting/highlight-reports',  'chart-bar',        true, true)
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

  RAISE NOTICE 'Simulator PMO sub-menu items created';
END $$;

-- Grant access: (1) roles that have platform PMO menu access, (2) roles by name (pmo_admin, etc.)
DO $$
DECLARE
  v_role_id UUID;
  v_menu_id UUID;
BEGIN
  -- Roles that already have any PMO-related platform menu item
  FOR v_role_id IN
    SELECT DISTINCT r.id FROM roles r
    INNER JOIN role_menu_items rmi ON rmi.role_id = r.id
    INNER JOIN menu_items m ON m.id = rmi.menu_item_id
    WHERE rmi.can_view = true
      AND (m.menu_code = 'pmo_admin_section' OR m.menu_code = 'pmo_oversight' OR m.menu_code = 'pmo_dashboard')
  LOOP
    FOR v_menu_id IN
      SELECT id FROM menu_items
      WHERE menu_code IN (
        'sim_pmo',
        'sim_pmo_dashboard',
        'sim_pmo_governance',
        'sim_pmo_initiation',
        'sim_pmo_oversight',
        'sim_pmo_procurement',
        'sim_pmo_reporting'
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

  -- Also grant to roles by name so simulator PMO is visible even if platform PMO menu codes differ
  FOR v_menu_id IN
    SELECT id FROM menu_items
    WHERE menu_code IN (
      'sim_pmo',
      'sim_pmo_dashboard',
      'sim_pmo_governance',
      'sim_pmo_initiation',
      'sim_pmo_oversight',
      'sim_pmo_procurement',
      'sim_pmo_reporting'
    )
    AND is_visible = true
  LOOP
    INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active)
    SELECT r.id, v_menu_id, true, true, true
    FROM roles r
    WHERE r.role_name IN ('pmo_admin', 'PMO Admin', 'system_admin', 'System Admin')
    ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
      can_view = EXCLUDED.can_view,
      can_use = EXCLUDED.can_use,
      is_active = EXCLUDED.is_active,
      updated_at = NOW();
  END LOOP;

  RAISE NOTICE 'Simulator PMO role-menu access granted';
END $$;
