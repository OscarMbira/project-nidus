-- ============================================================================
-- v383: Simulator sidebar — Scope & Schedule planning (practice project routes)
-- route_path uses __PRACTICE__ token; Sidebar / MobileNavigation resolve from URL.
-- Date: 2026-03-31
-- ============================================================================

INSERT INTO menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
  route_path, menu_icon, menu_color, is_visible, is_active
) VALUES (
  'sim_planning_scope_schedule',
  'Practice scope & schedule',
  'Simulator PM planning — scope and schedule (practice project)',
  NULL, 1, 46,
  NULL,
  'compass',
  '#0D9488',
  true, true
)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'sim_pp_scope_mgmt_plan', 'Scope Management Plan', 'Practice scope management plan', id, 2, 1,
  '/simulator/practice-projects/__PRACTICE__/scope/management-plan', 'file-text', true, true
FROM menu_items WHERE menu_code = 'sim_planning_scope_schedule'
ON CONFLICT (menu_code) DO UPDATE SET route_path = EXCLUDED.route_path, sort_order = EXCLUDED.sort_order, updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'sim_pp_scope_statement', 'Scope Statement', 'Practice scope statement', id, 2, 2,
  '/simulator/practice-projects/__PRACTICE__/scope/statement', 'file-check', true, true
FROM menu_items WHERE menu_code = 'sim_planning_scope_schedule'
ON CONFLICT (menu_code) DO UPDATE SET route_path = EXCLUDED.route_path, sort_order = EXCLUDED.sort_order, updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'sim_pp_requirements', 'Requirements Register', 'Practice requirements', id, 2, 3,
  '/simulator/practice-projects/__PRACTICE__/scope/requirements', 'list-checks', true, true
FROM menu_items WHERE menu_code = 'sim_planning_scope_schedule'
ON CONFLICT (menu_code) DO UPDATE SET route_path = EXCLUDED.route_path, sort_order = EXCLUDED.sort_order, updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'sim_pp_traceability', 'Traceability Matrix', 'Practice traceability', id, 2, 4,
  '/simulator/practice-projects/__PRACTICE__/scope/traceability', 'git-merge', true, true
FROM menu_items WHERE menu_code = 'sim_planning_scope_schedule'
ON CONFLICT (menu_code) DO UPDATE SET route_path = EXCLUDED.route_path, sort_order = EXCLUDED.sort_order, updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'sim_pp_wbs', 'WBS Builder', 'Practice WBS', id, 2, 5,
  '/simulator/practice-projects/__PRACTICE__/scope/wbs', 'network', true, true
FROM menu_items WHERE menu_code = 'sim_planning_scope_schedule'
ON CONFLICT (menu_code) DO UPDATE SET route_path = EXCLUDED.route_path, sort_order = EXCLUDED.sort_order, updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'sim_pp_schedule_mgmt_plan', 'Schedule Management Plan', 'Practice schedule plan', id, 2, 6,
  '/simulator/practice-projects/__PRACTICE__/schedule/management-plan', 'calendar-clock', true, true
FROM menu_items WHERE menu_code = 'sim_planning_scope_schedule'
ON CONFLICT (menu_code) DO UPDATE SET route_path = EXCLUDED.route_path, sort_order = EXCLUDED.sort_order, updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'sim_pp_activity_list', 'Activity List', 'Practice activities', id, 2, 7,
  '/simulator/practice-projects/__PRACTICE__/schedule/activities', 'list', true, true
FROM menu_items WHERE menu_code = 'sim_planning_scope_schedule'
ON CONFLICT (menu_code) DO UPDATE SET route_path = EXCLUDED.route_path, sort_order = EXCLUDED.sort_order, updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'sim_pp_activity_seq', 'Activity Sequencing', 'Practice dependencies', id, 2, 8,
  '/simulator/practice-projects/__PRACTICE__/schedule/dependencies', 'git-branch', true, true
FROM menu_items WHERE menu_code = 'sim_planning_scope_schedule'
ON CONFLICT (menu_code) DO UPDATE SET route_path = EXCLUDED.route_path, sort_order = EXCLUDED.sort_order, updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'sim_pp_gantt', 'Gantt Chart', 'Practice Gantt', id, 2, 9,
  '/simulator/practice-projects/__PRACTICE__/schedule/gantt', 'bar-chart-horizontal', true, true
FROM menu_items WHERE menu_code = 'sim_planning_scope_schedule'
ON CONFLICT (menu_code) DO UPDATE SET route_path = EXCLUDED.route_path, sort_order = EXCLUDED.sort_order, updated_at = NOW();

INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
SELECT r.id, m.id, TRUE, TRUE, TRUE, FALSE
FROM roles r
CROSS JOIN menu_items m
WHERE m.menu_code IN (
  'sim_planning_scope_schedule',
  'sim_pp_scope_mgmt_plan', 'sim_pp_scope_statement', 'sim_pp_requirements', 'sim_pp_traceability', 'sim_pp_wbs',
  'sim_pp_schedule_mgmt_plan', 'sim_pp_activity_list', 'sim_pp_activity_seq', 'sim_pp_gantt'
)
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();
