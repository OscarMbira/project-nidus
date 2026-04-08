-- ============================================================================
-- v381: Sidebar menus — Scope & Schedule planning (project-scoped routes)
-- route_path uses __PROJECT__ token; Sidebar resolves from current URL.
-- Date: 2026-03-31
-- ============================================================================

-- Parent: Planning (Scope & Schedule)
INSERT INTO menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
  route_path, menu_icon, menu_color, is_visible, is_active
) VALUES (
  'planning_scope_schedule',
  'Scope & Schedule',
  'PM planning process group — scope and schedule artefacts',
  NULL, 1, 45,
  NULL,
  'compass',
  '#0D9488',
  true, true
)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- Scope children
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'pp_scope_mgmt_plan', 'Scope Management Plan', 'How scope is managed and controlled', id, 2, 1,
  '/platform/projects/__PROJECT__/scope/management-plan', 'file-text', true, true
FROM menu_items WHERE menu_code = 'planning_scope_schedule'
ON CONFLICT (menu_code) DO UPDATE SET route_path = EXCLUDED.route_path, sort_order = EXCLUDED.sort_order, updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'pp_scope_statement', 'Scope Statement', 'In/out of scope and deliverables', id, 2, 2,
  '/platform/projects/__PROJECT__/scope/statement', 'file-check', true, true
FROM menu_items WHERE menu_code = 'planning_scope_schedule'
ON CONFLICT (menu_code) DO UPDATE SET route_path = EXCLUDED.route_path, sort_order = EXCLUDED.sort_order, updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'pp_requirements', 'Requirements Register', 'Collect and track requirements', id, 2, 3,
  '/platform/projects/__PROJECT__/scope/requirements', 'list-checks', true, true
FROM menu_items WHERE menu_code = 'planning_scope_schedule'
ON CONFLICT (menu_code) DO UPDATE SET route_path = EXCLUDED.route_path, sort_order = EXCLUDED.sort_order, updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'pp_traceability', 'Traceability Matrix', 'Requirements traceability', id, 2, 4,
  '/platform/projects/__PROJECT__/scope/traceability', 'git-merge', true, true
FROM menu_items WHERE menu_code = 'planning_scope_schedule'
ON CONFLICT (menu_code) DO UPDATE SET route_path = EXCLUDED.route_path, sort_order = EXCLUDED.sort_order, updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'pp_wbs', 'WBS Builder', 'Work breakdown structure', id, 2, 5,
  '/platform/projects/__PROJECT__/scope/wbs', 'network', true, true
FROM menu_items WHERE menu_code = 'planning_scope_schedule'
ON CONFLICT (menu_code) DO UPDATE SET route_path = EXCLUDED.route_path, sort_order = EXCLUDED.sort_order, updated_at = NOW();

-- Schedule children
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'pp_schedule_mgmt_plan', 'Schedule Management Plan', 'Scheduling methodology and controls', id, 2, 6,
  '/platform/projects/__PROJECT__/schedule/management-plan', 'calendar-clock', true, true
FROM menu_items WHERE menu_code = 'planning_scope_schedule'
ON CONFLICT (menu_code) DO UPDATE SET route_path = EXCLUDED.route_path, sort_order = EXCLUDED.sort_order, updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'pp_activity_list', 'Activity List', 'Activities and duration estimates', id, 2, 7,
  '/platform/projects/__PROJECT__/schedule/activities', 'list', true, true
FROM menu_items WHERE menu_code = 'planning_scope_schedule'
ON CONFLICT (menu_code) DO UPDATE SET route_path = EXCLUDED.route_path, sort_order = EXCLUDED.sort_order, updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'pp_activity_seq', 'Activity Sequencing', 'Dependencies between activities', id, 2, 8,
  '/platform/projects/__PROJECT__/schedule/dependencies', 'git-branch', true, true
FROM menu_items WHERE menu_code = 'planning_scope_schedule'
ON CONFLICT (menu_code) DO UPDATE SET route_path = EXCLUDED.route_path, sort_order = EXCLUDED.sort_order, updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'pp_gantt', 'Gantt Chart', 'Schedule timeline view', id, 2, 9,
  '/platform/projects/__PROJECT__/schedule/gantt', 'bar-chart-horizontal', true, true
FROM menu_items WHERE menu_code = 'planning_scope_schedule'
ON CONFLICT (menu_code) DO UPDATE SET route_path = EXCLUDED.route_path, sort_order = EXCLUDED.sort_order, updated_at = NOW();

-- Assign to every system role (all authenticated users with a role can see navigation)
INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
SELECT r.id, m.id, TRUE, TRUE, TRUE, FALSE
FROM roles r
CROSS JOIN menu_items m
WHERE m.menu_code IN (
  'planning_scope_schedule',
  'pp_scope_mgmt_plan', 'pp_scope_statement', 'pp_requirements', 'pp_traceability', 'pp_wbs',
  'pp_schedule_mgmt_plan', 'pp_activity_list', 'pp_activity_seq', 'pp_gantt'
)
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

-- PMO oversight (read-only registers) — attach under pmo_admin_section if present
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'pmo_oversight_scope', 'Scope Register (All Projects)', 'Cross-project scope plans overview',
  id, 2, 80, '/pmo/oversight/scope', 'file-text', true, true
FROM menu_items WHERE menu_code = 'pmo_admin_section' LIMIT 1
ON CONFLICT (menu_code) DO NOTHING;

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'pmo_oversight_schedules', 'Schedule Register (All Projects)', 'Cross-project schedule summary',
  id, 2, 81, '/pmo/oversight/schedules', 'bar-chart-horizontal', true, true
FROM menu_items WHERE menu_code = 'pmo_admin_section' LIMIT 1
ON CONFLICT (menu_code) DO NOTHING;

INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
SELECT r.id, m.id, TRUE, TRUE, TRUE, FALSE
FROM roles r
JOIN menu_items m ON m.menu_code IN ('pmo_oversight_scope', 'pmo_oversight_schedules')
WHERE r.role_name = 'pmo_admin'
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();
