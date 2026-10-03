-- ============================================================================
-- v963y: Sidebar menu items — Project Calendar (Phase 4)
-- Platform: sibling of the existing pm_schedule_group items (v568_pm_menu_items_seed.sql),
-- under Project Planning > Schedule & Activities.
-- Simulator: sibling of the existing sim_pp_schedule_* items
-- (v383_sim_scope_schedule_sidebar_menus.sql), under the practice project's
-- "Practice scope & schedule" section (sim_planning_scope_schedule, __PRACTICE__ token route).
-- ============================================================================

-- ── Platform ─────────────────────────────────────────────────────────────────

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
  'pm_project_calendar', 'Project Calendar', 'Working days configuration for this project',
  id, 3, 5, '/platform/projects/:id/schedule/calendar', 'calendar-days', TRUE, TRUE
FROM menu_items WHERE menu_code = 'pm_schedule_group'
ON CONFLICT (menu_code) DO UPDATE SET
  parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path,
  sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT
  'pm_project_calendar_exceptions', 'Calendar Exceptions', 'Holidays and other calendar exceptions for this project',
  id, 3, 6, '/platform/projects/:id/schedule/calendar/exceptions', 'calendar-x', TRUE, TRUE
FROM menu_items WHERE menu_code = 'pm_schedule_group'
ON CONFLICT (menu_code) DO UPDATE SET
  parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path,
  sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

-- Grant to project_manager (full), matching v569_pm_role_menu_items_assign.sql's target for
-- every other pm_schedule_group sibling item.
DO $$
DECLARE
  v_pm_role_id UUID;
BEGIN
  SELECT id INTO v_pm_role_id FROM roles WHERE role_name = 'project_manager' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
  IF v_pm_role_id IS NOT NULL THEN
    INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_pm_role_id, m.id, TRUE, TRUE, TRUE, FALSE
    FROM menu_items m
    WHERE m.menu_code IN ('pm_project_calendar', 'pm_project_calendar_exceptions')
      AND COALESCE(m.is_deleted, FALSE) = FALSE
    ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
      can_view = TRUE, can_use = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();
  ELSE
    RAISE NOTICE 'v963y: project_manager role not found';
  END IF;
END $$;

-- Oversight roles get view+use too, matching the broader read-access role set already used by
-- project_calendars_select / project_calendar_exceptions_select RLS policies (v963x).
INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
SELECT r.id, m.id, TRUE, TRUE, TRUE, FALSE
FROM roles r
CROSS JOIN menu_items m
WHERE r.role_name IN ('pmo_admin', 'system_admin', 'account_owner')
  AND COALESCE(r.is_deleted, FALSE) = FALSE
  AND m.menu_code IN ('pm_project_calendar', 'pm_project_calendar_exceptions')
  AND COALESCE(m.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

-- ── Simulator ────────────────────────────────────────────────────────────────

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'sim_pp_project_calendar', 'Project Calendar', 'Practice project working-days configuration', id, 2, 10,
  '/simulator/practice-projects/__PRACTICE__/schedule/calendar', 'calendar-days', true, true
FROM menu_items WHERE menu_code = 'sim_planning_scope_schedule'
ON CONFLICT (menu_code) DO UPDATE SET route_path = EXCLUDED.route_path, sort_order = EXCLUDED.sort_order, updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'sim_pp_project_calendar_exceptions', 'Calendar Exceptions', 'Practice project calendar exceptions', id, 2, 11,
  '/simulator/practice-projects/__PRACTICE__/schedule/calendar/exceptions', 'calendar-x', true, true
FROM menu_items WHERE menu_code = 'sim_planning_scope_schedule'
ON CONFLICT (menu_code) DO UPDATE SET route_path = EXCLUDED.route_path, sort_order = EXCLUDED.sort_order, updated_at = NOW();

-- Grant to every role, matching v383_sim_scope_schedule_sidebar_menus.sql's own (unfiltered)
-- grant style for every other sim_planning_scope_schedule sibling item.
INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
SELECT r.id, m.id, TRUE, TRUE, TRUE, FALSE
FROM roles r
CROSS JOIN menu_items m
WHERE m.menu_code IN ('sim_pp_project_calendar', 'sim_pp_project_calendar_exceptions')
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v963y_project_calendar_menu_items.sql applied'; END $$;
