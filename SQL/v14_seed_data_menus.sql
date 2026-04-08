-- ================================================
-- File: v14_seed_data_menus.sql
-- Description: Menu structure and role-based access seed data
-- Version: 1.0
-- Date: 2025-11-15
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - v01 through v09 must be run first (all tables must exist)
-- - v12_seed_data_rbac.sql must be run first (roles must exist)

-- Purpose:
-- Creates complete navigation menu structure:
-- 1. Menu Items (hierarchical structure)
-- 2. Role-Menu Access (role-based visibility)

-- Note: This script is idempotent and can be run multiple times safely

-- ================================================
-- SECTION 1: TOP-LEVEL MENU ITEMS
-- ================================================

DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Seed Data: Menu Structure';
    RAISE NOTICE '================================================';
END $$;

-- Dashboard
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, menu_color, is_visible, is_active)
VALUES ('dashboard', 'Dashboard', 'Main dashboard and overview', NULL, 1, 1, '/', 'layout-dashboard', '#3B82F6', true, true)
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

-- Projects
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, menu_color, is_visible, is_active)
VALUES ('projects', 'Projects', 'Project management', NULL, 1, 2, '/projects', 'folder-kanban', '#10B981', true, true)
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

-- Tasks
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, menu_color, is_visible, is_active)
VALUES ('tasks', 'Tasks', 'Task management', NULL, 1, 3, '/tasks', 'list-checks', '#F59E0B', true, true)
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

-- Teams
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, menu_color, is_visible, is_active)
VALUES ('teams', 'Teams', 'Team management', NULL, 1, 4, '/teams', 'users', '#8B5CF6', true, true)
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

-- Reports
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, menu_color, is_visible, is_active)
VALUES ('reports', 'Reports', 'Reports and analytics', NULL, 1, 5, '/reports', 'chart-bar', '#EC4899', true, true)
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

-- Administration
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, menu_color, is_visible, is_active)
VALUES ('administration', 'Administration', 'System administration', NULL, 1, 6, '/admin', 'settings', '#6B7280', true, true)
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'Top-level menus created';
END $$;

-- ================================================
-- SECTION 2: PROJECTS SUBMENU
-- ================================================

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'projects_all', 'All Projects', 'View all projects', id, 2, 1, '/projects', 'folder-open', true, true
FROM menu_items WHERE menu_code = 'projects'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'projects_my', 'My Projects', 'View my assigned projects', id, 2, 2, '/projects/my', 'folder-user', true, true
FROM menu_items WHERE menu_code = 'projects'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'projects_new', 'New Project', 'Create a new project', id, 2, 3, '/projects/new', 'folder-plus', true, true
FROM menu_items WHERE menu_code = 'projects'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'projects_archived', 'Archived Projects', 'View archived projects', id, 2, 4, '/projects/archived', 'archive', true, true
FROM menu_items WHERE menu_code = 'projects'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'projects_templates', 'Project Templates', 'Manage project templates', id, 2, 5, '/projects/templates', 'clipboard-list', true, true
FROM menu_items WHERE menu_code = 'projects'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'Projects submenu created';
END $$;

-- ================================================
-- SECTION 3: TASKS SUBMENU
-- ================================================

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'tasks_all', 'All Tasks', 'View all tasks', id, 2, 1, '/tasks', 'list', true, true
FROM menu_items WHERE menu_code = 'tasks'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'tasks_my', 'My Tasks', 'View my assigned tasks', id, 2, 2, '/tasks/my', 'user-check', true, true
FROM menu_items WHERE menu_code = 'tasks'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'tasks_board', 'Task Board', 'Kanban board view of tasks', id, 2, 3, '/tasks/board', 'trello', true, true
FROM menu_items WHERE menu_code = 'tasks'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'tasks_calendar', 'Task Calendar', 'Calendar view of tasks', id, 2, 4, '/tasks/calendar', 'calendar', true, true
FROM menu_items WHERE menu_code = 'tasks'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'tasks_gantt', 'Gantt Chart', 'Gantt chart view of tasks', id, 2, 5, '/tasks/gantt', 'chart-gantt', true, true
FROM menu_items WHERE menu_code = 'tasks'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'Tasks submenu created';
END $$;

-- ================================================
-- SECTION 4: TEAMS SUBMENU
-- ================================================

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'teams_all', 'All Teams', 'View all teams', id, 2, 1, '/teams', 'users', true, true
FROM menu_items WHERE menu_code = 'teams'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'teams_my', 'My Teams', 'View teams I belong to', id, 2, 2, '/teams/my', 'user-group', true, true
FROM menu_items WHERE menu_code = 'teams'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'teams_directory', 'Team Directory', 'Browse all team members', id, 2, 3, '/teams/directory', 'address-book', true, true
FROM menu_items WHERE menu_code = 'teams'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'teams_workload', 'Workload View', 'View team workload and capacity', id, 2, 4, '/teams/workload', 'chart-mixed', true, true
FROM menu_items WHERE menu_code = 'teams'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'Teams submenu created';
END $$;

-- ================================================
-- SECTION 5: REPORTS SUBMENU
-- ================================================

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'reports_dashboard', 'Reports Dashboard', 'Main reports dashboard', id, 2, 1, '/reports', 'chart-line', true, true
FROM menu_items WHERE menu_code = 'reports'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'reports_projects', 'Project Reports', 'Reports on project performance', id, 2, 2, '/reports/projects', 'folder-chart', true, true
FROM menu_items WHERE menu_code = 'reports'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'reports_resources', 'Resource Reports', 'Reports on resource utilization', id, 2, 3, '/reports/resources', 'users-gear', true, true
FROM menu_items WHERE menu_code = 'reports'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'reports_time', 'Time Reports', 'Reports on time tracking', id, 2, 4, '/reports/time', 'clock', true, true
FROM menu_items WHERE menu_code = 'reports'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'reports_budget', 'Budget Reports', 'Reports on budget and costs', id, 2, 5, '/reports/budget', 'currency-dollar', true, true
FROM menu_items WHERE menu_code = 'reports'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'reports_custom', 'Custom Reports', 'Create and manage custom reports', id, 2, 6, '/reports/custom', 'chart-pie', true, true
FROM menu_items WHERE menu_code = 'reports'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'Reports submenu created';
END $$;

-- ================================================
-- SECTION 6: ADMINISTRATION SUBMENU
-- ================================================

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'admin_users', 'Users', 'User management', id, 2, 1, '/admin/users', 'users-cog', true, true
FROM menu_items WHERE menu_code = 'administration'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'admin_roles', 'Roles & Permissions', 'Role and permission management', id, 2, 2, '/admin/roles', 'shield-check', true, true
FROM menu_items WHERE menu_code = 'administration'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'admin_methodologies', 'Methodologies', 'Methodology configuration', id, 2, 3, '/admin/methodologies', 'diagram-project', true, true
FROM menu_items WHERE menu_code = 'administration'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'admin_workflows', 'Workflows', 'Workflow configuration', id, 2, 4, '/admin/workflows', 'flow-chart', true, true
FROM menu_items WHERE menu_code = 'administration'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'admin_settings', 'System Settings', 'System configuration', id, 2, 5, '/admin/settings', 'cog', true, true
FROM menu_items WHERE menu_code = 'administration'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'admin_audit', 'Audit Logs', 'View system audit logs', id, 2, 6, '/admin/audit', 'file-text', true, true
FROM menu_items WHERE menu_code = 'administration'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'admin_activity', 'Activity Logs', 'View user activity logs', id, 2, 7, '/admin/activity', 'activity', true, true
FROM menu_items WHERE menu_code = 'administration'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'admin_integrations', 'Integrations', 'Third-party integrations', id, 2, 8, '/admin/integrations', 'plug', true, true
FROM menu_items WHERE menu_code = 'administration'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'Administration submenu created';
END $$;

-- ================================================
-- SECTION 7: ROLE-MENU ASSIGNMENTS
-- ================================================

DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Seed Data: Role-Menu Assignments';
    RAISE NOTICE '================================================';
END $$;

-- ------------------------------------------------
-- ROLE: System Admin - ALL MENUS
-- ------------------------------------------------

INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active)
SELECT
    r.id AS role_id,
    m.id AS menu_item_id,
    true AS can_view,
    true AS can_use,
    true AS is_active
FROM roles r
CROSS JOIN menu_items m
WHERE r.role_name = 'system_admin'
  AND m.is_deleted = FALSE
  AND m.is_active = TRUE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
    can_view = true,
    can_use = true,
    is_active = true,
    updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'System Admin role: ALL menus assigned';
END $$;

-- ------------------------------------------------
-- ROLE: PMO Admin - MOST MENUS (exclude system-level admin)
-- ------------------------------------------------

INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active)
SELECT
    r.id AS role_id,
    m.id AS menu_item_id,
    true AS can_view,
    true AS can_use,
    true AS is_active
FROM roles r
CROSS JOIN menu_items m
WHERE r.role_name = 'pmo_admin'
  AND m.is_deleted = FALSE
  AND m.is_active = TRUE
  AND m.menu_code NOT IN ('admin_settings', 'admin_audit', 'admin_integrations')
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
    can_view = true,
    can_use = true,
    is_active = true,
    updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'PMO Admin role: menus assigned';
END $$;

-- ------------------------------------------------
-- ROLE: Project Manager - PROJECT, TASK, TEAM, REPORT MENUS
-- ------------------------------------------------

INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active)
SELECT
    r.id AS role_id,
    m.id AS menu_item_id,
    true AS can_view,
    true AS can_use,
    true AS is_active
FROM roles r
CROSS JOIN menu_items m
WHERE r.role_name = 'project_manager'
  AND m.is_deleted = FALSE
  AND m.is_active = TRUE
  AND (
      m.menu_code LIKE 'dashboard%'
      OR m.menu_code LIKE 'projects%'
      OR m.menu_code LIKE 'tasks%'
      OR m.menu_code LIKE 'teams%'
      OR m.menu_code LIKE 'reports%'
  )
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
    can_view = true,
    can_use = true,
    is_active = true,
    updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'Project Manager role: menus assigned';
END $$;

-- ------------------------------------------------
-- ROLE: Team Lead - TASKS, TEAMS, MY PROJECTS/REPORTS
-- ------------------------------------------------

INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active)
SELECT
    r.id AS role_id,
    m.id AS menu_item_id,
    true AS can_view,
    true AS can_use,
    true AS is_active
FROM roles r
CROSS JOIN menu_items m
WHERE r.role_name = 'team_lead'
  AND m.is_deleted = FALSE
  AND m.is_active = TRUE
  AND m.menu_code IN (
      'dashboard',
      'projects', 'projects_my', 'projects_all',
      'tasks', 'tasks_all', 'tasks_my', 'tasks_board', 'tasks_calendar', 'tasks_gantt',
      'teams', 'teams_all', 'teams_my', 'teams_directory', 'teams_workload',
      'reports', 'reports_dashboard', 'reports_projects', 'reports_time'
  )
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
    can_view = true,
    can_use = true,
    is_active = true,
    updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'Team Lead role: menus assigned';
END $$;

-- ------------------------------------------------
-- ROLE: Team Member - BASIC MENUS
-- ------------------------------------------------

INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active)
SELECT
    r.id AS role_id,
    m.id AS menu_item_id,
    true AS can_view,
    true AS can_use,
    true AS is_active
FROM roles r
CROSS JOIN menu_items m
WHERE r.role_name = 'team_member'
  AND m.is_deleted = FALSE
  AND m.is_active = TRUE
  AND m.menu_code IN (
      'dashboard',
      'projects', 'projects_my',
      'tasks', 'tasks_my', 'tasks_board', 'tasks_calendar',
      'teams', 'teams_my'
  )
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
    can_view = true,
    can_use = true,
    is_active = true,
    updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'Team Member role: menus assigned';
END $$;

-- ------------------------------------------------
-- ROLE: Stakeholder - READ-ONLY MENUS
-- ------------------------------------------------

INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active)
SELECT
    r.id AS role_id,
    m.id AS menu_item_id,
    true AS can_view,
    true AS can_use,
    true AS is_active
FROM roles r
CROSS JOIN menu_items m
WHERE r.role_name = 'stakeholder'
  AND m.is_deleted = FALSE
  AND m.is_active = TRUE
  AND m.menu_code IN (
      'dashboard',
      'projects', 'projects_all', 'projects_my',
      'tasks', 'tasks_all',
      'reports', 'reports_dashboard', 'reports_projects'
  )
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
    can_view = true,
    can_use = true,
    is_active = true,
    updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'Stakeholder role: menus assigned';
END $$;

-- ------------------------------------------------
-- ROLE: Viewer - MINIMAL READ-ONLY MENUS
-- ------------------------------------------------

INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active)
SELECT
    r.id AS role_id,
    m.id AS menu_item_id,
    true AS can_view,
    true AS can_use,
    true AS is_active
FROM roles r
CROSS JOIN menu_items m
WHERE r.role_name = 'viewer'
  AND m.is_deleted = FALSE
  AND m.is_active = TRUE
  AND m.menu_code IN (
      'dashboard',
      'projects', 'projects_my',
      'reports', 'reports_dashboard'
  )
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
    can_view = true,
    can_use = true,
    is_active = true,
    updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'Viewer role: menus assigned';
END $$;

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
DECLARE
    v_menu_items_count INTEGER;
    v_top_level_count INTEGER;
    v_submenu_count INTEGER;
    v_role_menu_count INTEGER;
    v_menu RECORD;
BEGIN
    -- Count all menu items
    SELECT COUNT(*)
    INTO v_menu_items_count
    FROM menu_items
    WHERE is_deleted = FALSE;

    -- Count top-level menus
    SELECT COUNT(*)
    INTO v_top_level_count
    FROM menu_items
    WHERE is_deleted = FALSE
      AND parent_menu_id IS NULL;

    -- Count submenu items
    SELECT COUNT(*)
    INTO v_submenu_count
    FROM menu_items
    WHERE is_deleted = FALSE
      AND parent_menu_id IS NOT NULL;

    -- Count role-menu assignments
    SELECT COUNT(*)
    INTO v_role_menu_count
    FROM role_menu_items
    WHERE is_deleted = FALSE
      AND is_active = TRUE;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Menu Structure Seed Data Created';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Total Menu Items:        %', v_menu_items_count;
    RAISE NOTICE 'Top-Level Menus:         %', v_top_level_count;
    RAISE NOTICE 'Submenu Items:           %', v_submenu_count;
    RAISE NOTICE 'Role-Menu Assignments:   %', v_role_menu_count;
    RAISE NOTICE '================================================';

    -- Display menu hierarchy
    RAISE NOTICE '';
    RAISE NOTICE 'MENU HIERARCHY:';
    RAISE NOTICE '----------------------------------------';

    FOR v_menu IN
        SELECT
            parent.menu_label AS top_menu,
            COUNT(child.id) AS submenu_count
        FROM menu_items parent
        LEFT JOIN menu_items child ON parent.id = child.parent_menu_id AND child.is_deleted = FALSE
        WHERE parent.is_deleted = FALSE
          AND parent.parent_menu_id IS NULL
        GROUP BY parent.id, parent.menu_label, parent.sort_order
        ORDER BY parent.sort_order
    LOOP
        RAISE NOTICE '% - % submenu items', v_menu.top_menu, v_menu.submenu_count;
    END LOOP;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'v14_seed_data_menus.sql completed successfully';
    RAISE NOTICE '================================================';
END $$;

-- ================================================
-- END OF FILE
-- ================================================

-- Next Steps:
-- Run v15_seed_data_lookups.sql to create lookup table data
