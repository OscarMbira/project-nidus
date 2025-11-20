-- ================================================
-- File: v08_views.sql
-- Description: Convenience views for Project Nidus
-- Version: 1.0
-- Date: 2025-11-15
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - v01 through v05 must be run first (all tables must exist)

-- Purpose:
-- Creates convenience views that:
-- 1. Filter out deleted records automatically
-- 2. Provide pre-joined data for common queries
-- 3. Simplify complex queries with aggregations

-- ================================================
-- SECTION 1: ACTIVE RECORD VIEWS
-- Purpose: Filter out soft-deleted records
-- ================================================

-- ------------------------------------------------
-- VIEW: v_active_users
-- Purpose: Users that are not deleted
-- ------------------------------------------------

CREATE OR REPLACE VIEW v_active_users AS
SELECT *
FROM users
WHERE is_deleted = FALSE;

COMMENT ON VIEW v_active_users IS 'Active (non-deleted) users';

-- ------------------------------------------------
-- VIEW: v_active_projects
-- Purpose: Projects that are not deleted
-- ------------------------------------------------

CREATE OR REPLACE VIEW v_active_projects AS
SELECT *
FROM projects
WHERE is_deleted = FALSE;

COMMENT ON VIEW v_active_projects IS 'Active (non-deleted) projects';

-- ------------------------------------------------
-- VIEW: v_active_roles
-- Purpose: Roles that are not deleted and are active
-- ------------------------------------------------

CREATE OR REPLACE VIEW v_active_roles AS
SELECT *
FROM roles
WHERE is_deleted = FALSE
  AND is_active = TRUE;

COMMENT ON VIEW v_active_roles IS 'Active (non-deleted and enabled) roles';

-- ------------------------------------------------
-- VIEW: v_active_permissions
-- Purpose: Permissions that are not deleted and are active
-- ------------------------------------------------

CREATE OR REPLACE VIEW v_active_permissions AS
SELECT *
FROM permissions
WHERE is_deleted = FALSE
  AND is_active = TRUE;

COMMENT ON VIEW v_active_permissions IS 'Active (non-deleted and enabled) permissions';

-- ================================================
-- SECTION 2: ENRICHED/JOINED VIEWS
-- Purpose: Pre-join commonly accessed data
-- ================================================

-- ------------------------------------------------
-- VIEW: v_projects_with_details
-- Purpose: Projects with related information (status, type, owner, methodology)
-- ------------------------------------------------

CREATE OR REPLACE VIEW v_projects_with_details AS
SELECT
    p.id,
    p.project_code,
    p.project_name,
    p.project_description,
    p.priority,
    p.percentage_complete,
    p.health_status,
    p.budget_amount,
    p.budget_currency,
    p.actual_cost,
    p.planned_start_date,
    p.planned_end_date,
    p.actual_start_date,
    p.actual_end_date,
    p.is_public,
    p.is_archived,

    -- Status
    ps.status_name,
    ps.status_color,

    -- Type
    pt.type_name,
    pt.type_color,

    -- Owner
    owner.id AS owner_id,
    owner.full_name AS owner_name,
    owner.email AS owner_email,

    -- Sponsor
    sponsor.id AS sponsor_id,
    sponsor.full_name AS sponsor_name,

    -- Methodology
    pm.methodology_id,
    m.methodology_name,
    m.methodology_code,

    -- Audit fields
    p.created_at,
    p.created_by,
    p.updated_at,
    p.updated_by
FROM
    projects p
    LEFT JOIN project_statuses ps ON p.status_id = ps.id
    LEFT JOIN project_types pt ON p.project_type_id = pt.id
    LEFT JOIN users owner ON p.owner_user_id = owner.id
    LEFT JOIN users sponsor ON p.sponsor_user_id = sponsor.id
    LEFT JOIN project_methodologies pm ON p.id = pm.project_id
    LEFT JOIN methodologies m ON pm.methodology_id = m.id
WHERE
    p.is_deleted = FALSE;

COMMENT ON VIEW v_projects_with_details IS 'Projects with status, type, owner, sponsor, and methodology information';

-- ------------------------------------------------
-- VIEW: v_user_permissions
-- Purpose: User permissions expanded from roles
-- ------------------------------------------------

CREATE OR REPLACE VIEW v_user_permissions AS
SELECT DISTINCT
    u.id AS user_id,
    u.email AS user_email,
    u.full_name AS user_name,
    p.id AS permission_id,
    p.permission_code,
    p.permission_name,
    p.permission_category,
    p.permission_module,
    p.permission_type,
    r.id AS role_id,
    r.role_name,
    ur.project_id  -- NULL for global permissions, project UUID for project-specific
FROM
    users u
    INNER JOIN user_roles ur ON u.id = ur.user_id
    INNER JOIN roles r ON ur.role_id = r.id
    INNER JOIN role_permissions rp ON r.id = rp.role_id
    INNER JOIN permissions p ON rp.permission_id = p.id
WHERE
    u.is_deleted = FALSE
    AND u.is_active = TRUE
    AND r.is_deleted = FALSE
    AND r.is_active = TRUE
    AND p.is_deleted = FALSE
    AND p.is_active = TRUE
    AND ur.is_deleted = FALSE
    AND ur.is_active = TRUE
    AND rp.is_deleted = FALSE
    AND rp.is_active = TRUE;

COMMENT ON VIEW v_user_permissions IS 'User permissions expanded from role assignments';

-- ------------------------------------------------
-- VIEW: v_team_members_with_details
-- Purpose: Team members with user and team information
-- ------------------------------------------------

CREATE OR REPLACE VIEW v_team_members_with_details AS
SELECT
    tm.id,
    tm.team_id,
    t.team_name,
    t.project_id,
    p.project_name,
    tm.user_id,
    u.full_name AS member_name,
    u.email AS member_email,
    tm.member_role,
    tm.allocation_percentage,
    tm.joined_at,
    tm.left_at,
    tm.is_active,
    tm.created_at
FROM
    team_members tm
    INNER JOIN teams t ON tm.team_id = t.id
    INNER JOIN projects p ON t.project_id = p.id
    INNER JOIN users u ON tm.user_id = u.id
WHERE
    tm.is_deleted = FALSE
    AND t.is_deleted = FALSE
    AND p.is_deleted = FALSE
    AND u.is_deleted = FALSE;

COMMENT ON VIEW v_team_members_with_details IS 'Team members with user and team information';

-- ================================================
-- SECTION 3: SUMMARY/AGGREGATE VIEWS
-- Purpose: Pre-calculated summaries and aggregations
-- ================================================

-- ------------------------------------------------
-- VIEW: v_tables_by_category
-- Purpose: Count of tables by category
-- ------------------------------------------------

CREATE OR REPLACE VIEW v_tables_by_category AS
SELECT
    table_category,
    COUNT(*) AS table_count,
    SUM(CASE WHEN is_system_table THEN 1 ELSE 0 END) AS system_tables,
    SUM(CASE WHEN NOT is_system_table THEN 1 ELSE 0 END) AS application_tables,
    SUM(row_count_estimate) AS total_estimated_rows
FROM
    database_tables
WHERE
    is_deleted = FALSE
    AND is_active = TRUE
GROUP BY
    table_category
ORDER BY
    table_count DESC;

COMMENT ON VIEW v_tables_by_category IS 'Table count and statistics by category';

-- ------------------------------------------------
-- VIEW: v_project_team_summary
-- Purpose: Count of teams and members per project
-- ------------------------------------------------

CREATE OR REPLACE VIEW v_project_team_summary AS
SELECT
    p.id AS project_id,
    p.project_code,
    p.project_name,
    COUNT(DISTINCT t.id) AS team_count,
    COUNT(DISTINCT tm.user_id) AS total_team_members,
    COUNT(DISTINCT CASE WHEN tm.is_active = TRUE THEN tm.user_id END) AS active_team_members
FROM
    projects p
    LEFT JOIN teams t ON p.id = t.project_id AND t.is_deleted = FALSE
    LEFT JOIN team_members tm ON t.id = tm.team_id AND tm.is_deleted = FALSE
WHERE
    p.is_deleted = FALSE
GROUP BY
    p.id, p.project_code, p.project_name;

COMMENT ON VIEW v_project_team_summary IS 'Team and member counts per project';

-- ------------------------------------------------
-- VIEW: v_user_project_access
-- Purpose: Projects accessible by each user with access level
-- ------------------------------------------------

CREATE OR REPLACE VIEW v_user_project_access AS
SELECT
    u.id AS user_id,
    u.full_name AS user_name,
    u.email AS user_email,
    p.id AS project_id,
    p.project_code,
    p.project_name,
    up.access_level,
    up.project_role,
    up.receive_notifications,
    up.is_active AS assignment_is_active,
    p.is_archived AS project_is_archived,
    ps.status_name AS project_status
FROM
    users u
    INNER JOIN user_projects up ON u.id = up.user_id
    INNER JOIN projects p ON up.project_id = p.id
    LEFT JOIN project_statuses ps ON p.status_id = ps.id
WHERE
    u.is_deleted = FALSE
    AND up.is_deleted = FALSE
    AND p.is_deleted = FALSE
ORDER BY
    u.full_name, p.project_name;

COMMENT ON VIEW v_user_project_access IS 'Projects accessible by each user with access level and role';

-- ------------------------------------------------
-- VIEW: v_unread_notifications
-- Purpose: Unread notifications per user
-- ------------------------------------------------

CREATE OR REPLACE VIEW v_unread_notifications AS
SELECT
    n.id,
    n.user_id,
    u.full_name AS user_name,
    n.notification_type,
    n.notification_category,
    n.title,
    n.message,
    n.priority,
    n.action_url,
    n.action_label,
    n.created_at
FROM
    notifications n
    INNER JOIN users u ON n.user_id = u.id
WHERE
    n.is_deleted = FALSE
    AND n.is_read = FALSE
    AND (n.expires_at IS NULL OR n.expires_at > NOW())
ORDER BY
    n.priority DESC,
    n.created_at DESC;

COMMENT ON VIEW v_unread_notifications IS 'Unread notifications per user';

-- ------------------------------------------------
-- VIEW: v_active_sessions
-- Purpose: Currently active user sessions
-- ------------------------------------------------

CREATE OR REPLACE VIEW v_active_sessions AS
SELECT
    sl.id AS session_id,
    sl.user_id,
    u.full_name AS user_name,
    u.email AS user_email,
    sl.started_at,
    sl.last_activity_at,
    sl.ip_address,
    sl.device_type,
    sl.browser,
    sl.operating_system,
    EXTRACT(EPOCH FROM (NOW() - sl.last_activity_at)) / 60 AS minutes_since_activity
FROM
    session_logs sl
    LEFT JOIN users u ON sl.user_id = u.id
WHERE
    sl.is_active = TRUE
    AND sl.ended_at IS NULL
ORDER BY
    sl.last_activity_at DESC;

COMMENT ON VIEW v_active_sessions IS 'Currently active user sessions';

-- ------------------------------------------------
-- VIEW: v_menu_hierarchy
-- Purpose: Menu items with parent information for rendering hierarchical menus
-- ------------------------------------------------

CREATE OR REPLACE VIEW v_menu_hierarchy AS
SELECT
    mi.id,
    mi.menu_code,
    mi.menu_label,
    mi.menu_description,
    mi.menu_level,
    mi.sort_order,
    mi.route_path,
    mi.menu_icon,
    mi.menu_color,
    mi.badge_text,
    mi.badge_color,
    mi.is_visible,
    mi.parent_menu_id,
    parent.menu_label AS parent_menu_label,
    parent.menu_code AS parent_menu_code,
    mi.methodology_id,
    m.methodology_name,
    m.methodology_code
FROM
    menu_items mi
    LEFT JOIN menu_items parent ON mi.parent_menu_id = parent.id
    LEFT JOIN methodologies m ON mi.methodology_id = m.id
WHERE
    mi.is_deleted = FALSE
    AND mi.is_active = TRUE
ORDER BY
    mi.menu_level, mi.sort_order;

COMMENT ON VIEW v_menu_hierarchy IS 'Menu items with parent information for hierarchical menu rendering';

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
DECLARE
    v_view_count INTEGER;
BEGIN
    -- Count views created
    SELECT COUNT(*)
    INTO v_view_count
    FROM pg_views
    WHERE schemaname = 'public'
      AND viewname LIKE 'v\_%';

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Convenience Views Created: %', v_view_count;
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Active Record Views:';
    RAISE NOTICE '  - v_active_users';
    RAISE NOTICE '  - v_active_projects';
    RAISE NOTICE '  - v_active_roles';
    RAISE NOTICE '  - v_active_permissions';
    RAISE NOTICE '';
    RAISE NOTICE 'Enriched/Joined Views:';
    RAISE NOTICE '  - v_projects_with_details';
    RAISE NOTICE '  - v_user_permissions';
    RAISE NOTICE '  - v_team_members_with_details';
    RAISE NOTICE '';
    RAISE NOTICE 'Summary/Aggregate Views:';
    RAISE NOTICE '  - v_tables_by_category';
    RAISE NOTICE '  - v_project_team_summary';
    RAISE NOTICE '  - v_user_project_access';
    RAISE NOTICE '  - v_unread_notifications';
    RAISE NOTICE '  - v_active_sessions';
    RAISE NOTICE '  - v_menu_hierarchy';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'v08_views.sql completed successfully';
    RAISE NOTICE '================================================';
END $$;

-- ================================================
-- END OF FILE
-- ================================================

-- Next Steps:
-- Run v09_rls_policies.sql to create Row Level Security policies
