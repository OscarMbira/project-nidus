-- =====================================================
-- v302: Platform Stakeholders sidebar submenu (public.menu_items)
-- =====================================================
-- Adds 5 child menu items under the existing "Stakeholders" parent
-- so the sidebar shows: Stakeholder Register, Analysis, Engagement,
-- Communication Plans, Monitoring. Fixes submenu not expanding.
-- =====================================================

-- Ensure parent route is platform (idempotent)
UPDATE menu_items
SET route_path = '/platform/stakeholders',
    menu_icon = 'users-2',
    is_visible = true,
    is_active = true,
    updated_at = NOW()
WHERE menu_code = 'stakeholders'
  AND (route_path IS NULL OR route_path <> '/platform/stakeholders');

-- Insert/update 5 child menu items under Stakeholders parent
DO $$
DECLARE
  v_parent_id UUID;
BEGIN
  SELECT id INTO v_parent_id FROM menu_items WHERE menu_code = 'stakeholders' LIMIT 1;
  IF v_parent_id IS NULL THEN
    RAISE EXCEPTION 'Stakeholders parent (menu_code = stakeholders) not found in menu_items. Run v36_phase5_menu_items.sql first.';
  END IF;

  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES
    ('platform_stakeholders_register',     'Stakeholder Register',  'Identify and maintain stakeholder information',           v_parent_id, 2, 1, '/platform/stakeholders/register',      'users-2',   true, true),
    ('platform_stakeholders_analysis',     'Stakeholder Analysis',  'Power/interest matrix and attitude analysis',            v_parent_id, 2, 2, '/platform/stakeholders/analysis',      'target',    true, true),
    ('platform_stakeholders_engagement',   'Engagement Planning',    'Prioritise and plan stakeholder engagement',            v_parent_id, 2, 3, '/platform/stakeholders/engagement',    'mail',      true, true),
    ('platform_stakeholders_communications','Communication Plans',  'Plan and log stakeholder communications',              v_parent_id, 2, 4, '/platform/stakeholders/communications', 'file-text', true, true),
    ('platform_stakeholders_monitoring',   'Monitoring',            'Monitor engagement and attitude',                       v_parent_id, 2, 5, '/platform/stakeholders/monitoring',      'chart-bar', true, true)
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

  RAISE NOTICE 'Platform Stakeholders sub-menu items created/updated';
END $$;

-- Grant access to the 5 new menu items for every role that has the parent "stakeholders"
DO $$
DECLARE
  v_role_id UUID;
  v_menu_id UUID;
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
    WHERE m.menu_code IN (
      'platform_stakeholders_register',
      'platform_stakeholders_analysis',
      'platform_stakeholders_engagement',
      'platform_stakeholders_communications',
      'platform_stakeholders_monitoring'
    )
    AND NOT EXISTS (
      SELECT 1 FROM role_menu_items rmi2
      WHERE rmi2.role_id = v_role_id AND rmi2.menu_item_id = m.id AND (rmi2.is_deleted = false OR rmi2.is_deleted IS NULL)
    );
  END LOOP;

  RAISE NOTICE 'Role access granted for Platform Stakeholders sub-menu';
END $$;
