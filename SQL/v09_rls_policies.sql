-- ================================================
-- File: v09_rls_policies.sql
-- Description: Row Level Security (RLS) policies for all tables
-- Version: 1.0
-- Date: 2025-11-15
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - v01 through v08 must be run first (all tables and views must exist)

-- Purpose:
-- Enables Row Level Security on all 28 core tables and creates policies for:
-- - Admin full access (all operations)
-- - User access based on relationships and permissions
-- - Public access where appropriate

-- IMPORTANT: Supabase requires RLS on all tables for security

-- ================================================
-- SECTION 1: SYSTEM CORE TABLES (8 tables)
-- ================================================

-- ------------------------------------------------
-- TABLE: database_tables
-- Access: Admins can manage, authenticated users can read
-- ------------------------------------------------

ALTER TABLE database_tables ENABLE ROW LEVEL SECURITY;

-- Admins: Full access
CREATE POLICY policy_database_tables_admin_all
    ON database_tables FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
              AND r.role_name = 'System Admin'
              AND ur.is_deleted = FALSE
              AND r.is_deleted = FALSE
        )
    );

-- Authenticated users: Read only
CREATE POLICY policy_database_tables_auth_read
    ON database_tables FOR SELECT
    USING (auth.role() = 'authenticated');

-- ------------------------------------------------
-- TABLE: audit_trails
-- Access: Admins full access, users can read their own audit records
-- ------------------------------------------------

ALTER TABLE audit_trails ENABLE ROW LEVEL SECURITY;

-- Admins: Full access
CREATE POLICY policy_audit_trails_admin_all
    ON audit_trails FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
              AND r.role_name = 'System Admin'
        )
    );

-- Users: Read own audit records
CREATE POLICY policy_audit_trails_user_read
    ON audit_trails FOR SELECT
    USING (user_id = auth.uid());

-- ------------------------------------------------
-- TABLE: session_logs
-- Access: Users can see own sessions, admins see all
-- ------------------------------------------------

ALTER TABLE session_logs ENABLE ROW LEVEL SECURITY;

-- Users: Read own sessions
CREATE POLICY policy_session_logs_own_read
    ON session_logs FOR SELECT
    USING (user_id = auth.uid());

-- Admins: Full access
CREATE POLICY policy_session_logs_admin_all
    ON session_logs FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
              AND r.role_name = 'System Admin'
        )
    );

-- ------------------------------------------------
-- TABLE: system_settings
-- Access: Admins full access, users read public settings
-- ------------------------------------------------

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Admins: Full access
CREATE POLICY policy_system_settings_admin_all
    ON system_settings FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
              AND r.role_name = 'System Admin'
        )
    );

-- Users: Read public settings
CREATE POLICY policy_system_settings_public_read
    ON system_settings FOR SELECT
    USING (is_public = TRUE AND auth.role() = 'authenticated');

-- ------------------------------------------------
-- TABLE: email_templates
-- Access: Admins manage, system can read
-- ------------------------------------------------

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Admins: Full access
CREATE POLICY policy_email_templates_admin_all
    ON email_templates FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
              AND r.role_name = 'System Admin'
        )
    );

-- Authenticated: Read only (for notification system)
CREATE POLICY policy_email_templates_auth_read
    ON email_templates FOR SELECT
    USING (auth.role() = 'authenticated');

-- ------------------------------------------------
-- TABLE: notifications
-- Access: Users see their own notifications
-- ------------------------------------------------

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users: Full access to own notifications
CREATE POLICY policy_notifications_own_all
    ON notifications FOR ALL
    USING (user_id = auth.uid());

-- Admins: Full access
CREATE POLICY policy_notifications_admin_all
    ON notifications FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
              AND r.role_name = 'System Admin'
        )
    );

-- ------------------------------------------------
-- TABLE: activity_logs
-- Access: Users see logs for their projects, admins see all
-- ------------------------------------------------

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Users: See activity in their projects
CREATE POLICY policy_activity_logs_project_read
    ON activity_logs FOR SELECT
    USING (
        project_id IN (
            SELECT project_id FROM user_projects
            WHERE user_id = auth.uid()
              AND is_deleted = FALSE
        )
        OR user_id = auth.uid()
    );

-- Admins: Full access
CREATE POLICY policy_activity_logs_admin_all
    ON activity_logs FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
              AND r.role_name = 'System Admin'
        )
    );

-- ------------------------------------------------
-- TABLE: error_logs
-- Access: Admins only
-- ------------------------------------------------

ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Admins: Full access
CREATE POLICY policy_error_logs_admin_all
    ON error_logs FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
              AND r.role_name = 'System Admin'
        )
    );

-- ================================================
-- SECTION 2: USER & ACCESS MANAGEMENT TABLES (7 tables)
-- ================================================

-- ------------------------------------------------
-- TABLE: users
-- Access: Users see own data, admins see all
-- ------------------------------------------------

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users: Full access to own record
CREATE POLICY policy_users_own_all
    ON users FOR ALL
    USING (id = auth.uid());

-- Users: Read other users in same projects
CREATE POLICY policy_users_project_read
    ON users FOR SELECT
    USING (
        id IN (
            SELECT DISTINCT tm.user_id
            FROM team_members tm
            WHERE tm.team_id IN (
                SELECT team_id FROM team_members
                WHERE user_id = auth.uid()
                  AND is_deleted = FALSE
            )
            AND tm.is_deleted = FALSE
        )
    );

-- Admins: Full access
CREATE POLICY policy_users_admin_all
    ON users FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
              AND r.role_name = 'System Admin'
        )
    );

-- ------------------------------------------------
-- TABLE: roles
-- Access: All authenticated users can read, admins can manage
-- ------------------------------------------------

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Authenticated: Read all roles
CREATE POLICY policy_roles_auth_read
    ON roles FOR SELECT
    USING (auth.role() = 'authenticated');

-- Admins: Full access
CREATE POLICY policy_roles_admin_all
    ON roles FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
              AND r.role_name = 'System Admin'
        )
    );

-- ------------------------------------------------
-- TABLE: permissions
-- Access: All authenticated users can read, admins can manage
-- ------------------------------------------------

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

-- Authenticated: Read all permissions
CREATE POLICY policy_permissions_auth_read
    ON permissions FOR SELECT
    USING (auth.role() = 'authenticated');

-- Admins: Full access
CREATE POLICY policy_permissions_admin_all
    ON permissions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
              AND r.role_name = 'System Admin'
        )
    );

-- ------------------------------------------------
-- TABLE: user_roles
-- Access: Users see own roles, admins manage all
-- ------------------------------------------------

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Users: Read own roles
CREATE POLICY policy_user_roles_own_read
    ON user_roles FOR SELECT
    USING (user_id = auth.uid());

-- Admins: Full access
CREATE POLICY policy_user_roles_admin_all
    ON user_roles FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
              AND r.role_name = 'System Admin'
        )
    );

-- ------------------------------------------------
-- TABLE: role_permissions
-- Access: All authenticated users can read, admins manage
-- ------------------------------------------------

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Authenticated: Read all role permissions
CREATE POLICY policy_role_permissions_auth_read
    ON role_permissions FOR SELECT
    USING (auth.role() = 'authenticated');

-- Admins: Full access
CREATE POLICY policy_role_permissions_admin_all
    ON role_permissions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
              AND r.role_name = 'System Admin'
        )
    );

-- ------------------------------------------------
-- TABLE: user_preferences
-- Access: Users manage own preferences
-- ------------------------------------------------

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Users: Full access to own preferences
CREATE POLICY policy_user_preferences_own_all
    ON user_preferences FOR ALL
    USING (user_id = auth.uid());

-- Admins: Full access
CREATE POLICY policy_user_preferences_admin_all
    ON user_preferences FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
              AND r.role_name = 'System Admin'
        )
    );

-- ------------------------------------------------
-- TABLE: user_projects
-- Access: Users see own assignments, project managers manage
-- ------------------------------------------------

ALTER TABLE user_projects ENABLE ROW LEVEL SECURITY;

-- Users: Read own project assignments
CREATE POLICY policy_user_projects_own_read
    ON user_projects FOR SELECT
    USING (user_id = auth.uid());

-- Project Managers: Manage assignments in their projects
CREATE POLICY policy_user_projects_pm_manage
    ON user_projects FOR ALL
    USING (
        project_id IN (
            SELECT project_id FROM user_projects
            WHERE user_id = auth.uid()
              AND access_level IN ('owner', 'admin')
              AND is_deleted = FALSE
        )
    );

-- Admins: Full access
CREATE POLICY policy_user_projects_admin_all
    ON user_projects FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
              AND r.role_name = 'System Admin'
        )
    );

-- ================================================
-- SECTION 3: PROJECT CORE TABLES (8 tables)
-- ================================================

-- ------------------------------------------------
-- TABLE: project_statuses
-- Access: All authenticated users can read, admins manage
-- ------------------------------------------------

ALTER TABLE project_statuses ENABLE ROW LEVEL SECURITY;

-- Authenticated: Read all
CREATE POLICY policy_project_statuses_auth_read
    ON project_statuses FOR SELECT
    USING (auth.role() = 'authenticated');

-- Admins: Full access
CREATE POLICY policy_project_statuses_admin_all
    ON project_statuses FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
              AND r.role_name = 'System Admin'
        )
    );

-- ------------------------------------------------
-- TABLE: project_types
-- Access: All authenticated users can read, admins manage
-- ------------------------------------------------

ALTER TABLE project_types ENABLE ROW LEVEL SECURITY;

-- Authenticated: Read all
CREATE POLICY policy_project_types_auth_read
    ON project_types FOR SELECT
    USING (auth.role() = 'authenticated');

-- Admins: Full access
CREATE POLICY policy_project_types_admin_all
    ON project_types FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
              AND r.role_name = 'System Admin'
        )
    );

-- ------------------------------------------------
-- TABLE: projects
-- Access: Based on user_projects assignments
-- ------------------------------------------------

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Public projects: Anyone can read
CREATE POLICY policy_projects_public_read
    ON projects FOR SELECT
    USING (is_public = TRUE AND is_deleted = FALSE);

-- Project members: Read assigned projects
CREATE POLICY policy_projects_member_read
    ON projects FOR SELECT
    USING (
        id IN (
            SELECT project_id FROM user_projects
            WHERE user_id = auth.uid()
              AND is_deleted = FALSE
        )
    );

-- Project owners/admins: Full access to their projects
CREATE POLICY policy_projects_owner_all
    ON projects FOR ALL
    USING (
        id IN (
            SELECT project_id FROM user_projects
            WHERE user_id = auth.uid()
              AND access_level IN ('owner', 'admin')
              AND is_deleted = FALSE
        )
    );

-- Authenticated: Insert new projects
CREATE POLICY policy_projects_auth_insert
    ON projects FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Admins: Full access
CREATE POLICY policy_projects_admin_all
    ON projects FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
              AND r.role_name = 'System Admin'
        )
    );

-- ------------------------------------------------
-- TABLE: project_methodologies
-- Access: Same as projects table
-- ------------------------------------------------

ALTER TABLE project_methodologies ENABLE ROW LEVEL SECURITY;

-- Project members: Read
CREATE POLICY policy_project_methodologies_member_read
    ON project_methodologies FOR SELECT
    USING (
        project_id IN (
            SELECT project_id FROM user_projects
            WHERE user_id = auth.uid()
              AND is_deleted = FALSE
        )
    );

-- Project owners/admins: Full access
CREATE POLICY policy_project_methodologies_owner_all
    ON project_methodologies FOR ALL
    USING (
        project_id IN (
            SELECT project_id FROM user_projects
            WHERE user_id = auth.uid()
              AND access_level IN ('owner', 'admin')
              AND is_deleted = FALSE
        )
    );

-- Admins: Full access
CREATE POLICY policy_project_methodologies_admin_all
    ON project_methodologies FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
              AND r.role_name = 'System Admin'
        )
    );

-- ------------------------------------------------
-- TABLE: project_configurations
-- Access: Same as projects table
-- ------------------------------------------------

ALTER TABLE project_configurations ENABLE ROW LEVEL SECURITY;

-- Project members: Read
CREATE POLICY policy_project_configurations_member_read
    ON project_configurations FOR SELECT
    USING (
        project_id IN (
            SELECT project_id FROM user_projects
            WHERE user_id = auth.uid()
              AND is_deleted = FALSE
        )
    );

-- Project owners/admins: Full access
CREATE POLICY policy_project_configurations_owner_all
    ON project_configurations FOR ALL
    USING (
        project_id IN (
            SELECT project_id FROM user_projects
            WHERE user_id = auth.uid()
              AND access_level IN ('owner', 'admin')
              AND is_deleted = FALSE
        )
    );

-- Admins: Full access
CREATE POLICY policy_project_configurations_admin_all
    ON project_configurations FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
              AND r.role_name = 'System Admin'
        )
    );

-- ------------------------------------------------
-- TABLE: project_phases
-- Access: Same as projects table
-- ------------------------------------------------

ALTER TABLE project_phases ENABLE ROW LEVEL SECURITY;

-- Project members: Read
CREATE POLICY policy_project_phases_member_read
    ON project_phases FOR SELECT
    USING (
        project_id IN (
            SELECT project_id FROM user_projects
            WHERE user_id = auth.uid()
              AND is_deleted = FALSE
        )
    );

-- Project owners/admins: Full access
CREATE POLICY policy_project_phases_owner_all
    ON project_phases FOR ALL
    USING (
        project_id IN (
            SELECT project_id FROM user_projects
            WHERE user_id = auth.uid()
              AND access_level IN ('owner', 'admin')
              AND is_deleted = FALSE
        )
    );

-- Admins: Full access
CREATE POLICY policy_project_phases_admin_all
    ON project_phases FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
              AND r.role_name = 'System Admin'
        )
    );

-- ------------------------------------------------
-- TABLE: teams
-- Access: Project members can read, owners manage
-- ------------------------------------------------

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Project members: Read teams in their projects
CREATE POLICY policy_teams_member_read
    ON teams FOR SELECT
    USING (
        project_id IN (
            SELECT project_id FROM user_projects
            WHERE user_id = auth.uid()
              AND is_deleted = FALSE
        )
    );

-- Project owners/admins: Full access
CREATE POLICY policy_teams_owner_all
    ON teams FOR ALL
    USING (
        project_id IN (
            SELECT project_id FROM user_projects
            WHERE user_id = auth.uid()
              AND access_level IN ('owner', 'admin')
              AND is_deleted = FALSE
        )
    );

-- Admins: Full access
CREATE POLICY policy_teams_admin_all
    ON teams FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
              AND r.role_name = 'System Admin'
        )
    );

-- ------------------------------------------------
-- TABLE: team_members
-- Access: Team members can read, team leads manage
-- ------------------------------------------------

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Team members: Read team membership
CREATE POLICY policy_team_members_member_read
    ON team_members FOR SELECT
    USING (
        team_id IN (
            SELECT team_id FROM team_members
            WHERE user_id = auth.uid()
              AND is_deleted = FALSE
        )
        OR user_id = auth.uid()
    );

-- Team leads: Manage team members
CREATE POLICY policy_team_members_lead_all
    ON team_members FOR ALL
    USING (
        team_id IN (
            SELECT id FROM teams
            WHERE team_lead_user_id = auth.uid()
              AND is_deleted = FALSE
        )
    );

-- Project owners/admins: Full access
CREATE POLICY policy_team_members_owner_all
    ON team_members FOR ALL
    USING (
        team_id IN (
            SELECT t.id FROM teams t
            INNER JOIN user_projects up ON t.project_id = up.project_id
            WHERE up.user_id = auth.uid()
              AND up.access_level IN ('owner', 'admin')
              AND up.is_deleted = FALSE
              AND t.is_deleted = FALSE
        )
    );

-- Admins: Full access
CREATE POLICY policy_team_members_admin_all
    ON team_members FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
              AND r.role_name = 'System Admin'
        )
    );

-- ================================================
-- SECTION 4: CONFIGURATION & MENU TABLES (5 tables)
-- ================================================

-- ------------------------------------------------
-- TABLE: methodologies
-- Access: All authenticated users can read, admins manage
-- ------------------------------------------------

ALTER TABLE methodologies ENABLE ROW LEVEL SECURITY;

-- Authenticated: Read all
CREATE POLICY policy_methodologies_auth_read
    ON methodologies FOR SELECT
    USING (auth.role() = 'authenticated');

-- Admins: Full access
CREATE POLICY policy_methodologies_admin_all
    ON methodologies FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
              AND r.role_name = 'System Admin'
        )
    );

-- ------------------------------------------------
-- TABLE: workflows
-- Access: All authenticated users can read, admins manage
-- ------------------------------------------------

ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

-- Authenticated: Read all
CREATE POLICY policy_workflows_auth_read
    ON workflows FOR SELECT
    USING (auth.role() = 'authenticated');

-- Admins: Full access
CREATE POLICY policy_workflows_admin_all
    ON workflows FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
              AND r.role_name = 'System Admin'
        )
    );

-- ------------------------------------------------
-- TABLE: menu_items
-- Access: Users see menus for their roles, admins manage
-- ------------------------------------------------

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- Users: Read visible menu items
CREATE POLICY policy_menu_items_user_read
    ON menu_items FOR SELECT
    USING (
        is_visible = TRUE
        AND (
            -- User has role that can access this menu
            EXISTS (
                SELECT 1 FROM role_menu_items rmi
                INNER JOIN user_roles ur ON rmi.role_id = ur.role_id
                WHERE rmi.menu_item_id = menu_items.id
                  AND ur.user_id = auth.uid()
                  AND rmi.can_view = TRUE
                  AND rmi.is_deleted = FALSE
                  AND ur.is_deleted = FALSE
            )
            -- OR menu is not role-restricted (no role_menu_items entries)
            OR NOT EXISTS (
                SELECT 1 FROM role_menu_items
                WHERE menu_item_id = menu_items.id
            )
        )
    );

-- Admins: Full access
CREATE POLICY policy_menu_items_admin_all
    ON menu_items FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
              AND r.role_name = 'System Admin'
        )
    );

-- ------------------------------------------------
-- TABLE: role_menu_items
-- Access: Authenticated read, admins manage
-- ------------------------------------------------

ALTER TABLE role_menu_items ENABLE ROW LEVEL SECURITY;

-- Authenticated: Read all
CREATE POLICY policy_role_menu_items_auth_read
    ON role_menu_items FOR SELECT
    USING (auth.role() = 'authenticated');

-- Admins: Full access
CREATE POLICY policy_role_menu_items_admin_all
    ON role_menu_items FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
              AND r.role_name = 'System Admin'
        )
    );

-- ------------------------------------------------
-- TABLE: user_menu_preferences
-- Access: Users manage own preferences
-- ------------------------------------------------

ALTER TABLE user_menu_preferences ENABLE ROW LEVEL SECURITY;

-- Users: Full access to own preferences
CREATE POLICY policy_user_menu_preferences_own_all
    ON user_menu_preferences FOR ALL
    USING (user_id = auth.uid());

-- Admins: Full access
CREATE POLICY policy_user_menu_preferences_admin_all
    ON user_menu_preferences FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
              AND r.role_name = 'System Admin'
        )
    );

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
DECLARE
    v_table_count INTEGER;
    v_enabled_count INTEGER;
    v_policy_count INTEGER;
BEGIN
    -- Count total tables
    SELECT COUNT(*)
    INTO v_table_count
    FROM database_tables
    WHERE is_deleted = FALSE
      AND table_category IN ('system', 'user', 'project', 'config');

    -- Count tables with RLS enabled
    SELECT COUNT(*)
    INTO v_enabled_count
    FROM pg_tables t
    WHERE t.schemaname = 'public'
      AND t.tablename IN (
          SELECT table_name FROM database_tables
          WHERE is_deleted = FALSE
            AND table_category IN ('system', 'user', 'project', 'config')
      )
      AND EXISTS (
          SELECT 1 FROM pg_class c
          WHERE c.relname = t.tablename
            AND c.relrowsecurity = TRUE
      );

    -- Count policies created
    SELECT COUNT(*)
    INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'public';

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Row Level Security (RLS) Summary';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Total Core Tables: %', v_table_count;
    RAISE NOTICE 'Tables with RLS Enabled: %', v_enabled_count;
    RAISE NOTICE 'Total Policies Created: %', v_policy_count;
    RAISE NOTICE '================================================';

    IF v_enabled_count < v_table_count THEN
        RAISE WARNING 'Not all tables have RLS enabled! Expected %, got %', v_table_count, v_enabled_count;
    ELSE
        RAISE NOTICE 'All tables have RLS enabled: OK';
    END IF;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'RLS Policy Categories:';
    RAISE NOTICE '  - Admin full access policies';
    RAISE NOTICE '  - User own data access policies';
    RAISE NOTICE '  - Project-based access policies';
    RAISE NOTICE '  - Role-based access policies';
    RAISE NOTICE '  - Public access policies';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'v09_rls_policies.sql completed successfully';
    RAISE NOTICE '================================================';
END $$;

-- ================================================
-- END OF FILE
-- ================================================

-- IMPORTANT NOTES:
-- 1. All 28 core tables now have RLS enabled
-- 2. Policies enforce security at the database level
-- 3. Admins (System Admin role) have full access to all tables
-- 4. Users have restricted access based on relationships
-- 5. Test policies thoroughly before deploying to production
-- 6. Use service_role key in backend for operations that bypass RLS

-- Next Steps:
-- 1. Test RLS policies with different user roles
-- 2. Verify access control works as expected
-- 3. Consider creating seed data (v10_seed_data.sql)
