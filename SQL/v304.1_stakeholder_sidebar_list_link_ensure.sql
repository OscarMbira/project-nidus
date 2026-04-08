-- =============================================================================
-- v304.1: Ensure Stakeholders sidebar shows parent + submenu (incl. list/register link)
-- Purpose: Guarantee "Stakeholder Register" (list) and other sub-links are visible
--          for all roles that should see Platform Stakeholders.
-- =============================================================================

-- 1) Ensure parent exists and points to platform
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, menu_color, is_visible, is_active)
VALUES ('stakeholders', 'Stakeholders', 'Stakeholder management and engagement', NULL, 1, 14, '/platform/stakeholders', 'users-2', '#10B981', true, true)
ON CONFLICT (menu_code) DO UPDATE SET
  route_path = '/platform/stakeholders',
  menu_icon = 'users-2',
  is_visible = true,
  is_active = true,
  updated_at = NOW();

-- 2) Insert/update 5 child menu items (register = list page first)
DO $$
DECLARE
  v_parent_id UUID;
BEGIN
  SELECT id INTO v_parent_id FROM menu_items WHERE menu_code = 'stakeholders' LIMIT 1;
  IF v_parent_id IS NULL THEN
    RAISE EXCEPTION 'Stakeholders parent not found. Run v36_phase5_menu_items.sql first.';
  END IF;

  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES
    ('platform_stakeholders_register',     'Stakeholder Register',  'List and manage stakeholders',                                   v_parent_id, 2, 1, '/platform/stakeholders/register',      'users-2',   true, true),
    ('platform_stakeholders_analysis',     'Stakeholder Analysis',  'Power/interest matrix and attitude analysis',            v_parent_id, 2, 2, '/platform/stakeholders/analysis',      'target',    true, true),
    ('platform_stakeholders_engagement',   'Engagement Planning',  'Prioritise and plan stakeholder engagement',              v_parent_id, 2, 3, '/platform/stakeholders/engagement',    'mail',      true, true),
    ('platform_stakeholders_communications','Communication Plans',  'Plan and log stakeholder communications',                v_parent_id, 2, 4, '/platform/stakeholders/communications', 'file-text', true, true),
    ('platform_stakeholders_monitoring',   'Monitoring',           'Monitor engagement and attitude',                         v_parent_id, 2, 5, '/platform/stakeholders/monitoring',      'chart-bar', true, true)
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

  RAISE NOTICE 'Stakeholders sub-menu items (incl. Stakeholder Register list link) ensured.';
END $$;

-- 3) Grant parent + all 5 children to every role (so list link shows for all)
DO $$
DECLARE
  v_role_id UUID;
  v_menu_id UUID;
  v_menu_codes TEXT[] := ARRAY['stakeholders', 'platform_stakeholders_register', 'platform_stakeholders_analysis', 'platform_stakeholders_engagement', 'platform_stakeholders_communications', 'platform_stakeholders_monitoring'];
BEGIN
  FOR v_role_id IN SELECT id FROM roles
  LOOP
    FOR v_menu_id IN SELECT id FROM menu_items WHERE menu_code = ANY(v_menu_codes)
    LOOP
      INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
      VALUES (v_role_id, v_menu_id, true, true, true, false)
      ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
        can_view = true,
        can_use = true,
        is_active = true,
        is_deleted = false,
        updated_at = NOW();
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Stakeholders menu (parent + register/analysis/engagement/comms/monitoring) granted to all active roles.';
END $$;
