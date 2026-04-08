-- ============================================================================
-- Fix Menu System RLS Policies
-- Version: v129
-- Description: Fixes RLS policies for all menu-related tables and users table
-- Author: Claude Code
-- Date: 2025-12-16
-- ============================================================================

-- Purpose:
-- The dynamic menu system is disabled due to RLS issues on multiple tables:
-- 1. users table - Can't query to get user record from auth_user_id
-- 2. user_roles table - Can't query to get user's roles
-- 3. roles table - Can't query role details (partially fixed in v128)
-- 4. menu_items table - Can't query available menu items
-- 5. role_menu_items table - Can't query role-menu mappings

-- Issues Fixed:
-- - "Using fallback menu (users table RLS disabled)"
-- - Menu system can't load user's roles
-- - Menu system can't load role-based menus
-- - org_admin users see fallback menu instead of full menu

-- ============================================================================
-- PART 1: FIX USERS TABLE RLS
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS policy_users_select_own ON users;
DROP POLICY IF EXISTS policy_users_select_all ON users;
DROP POLICY IF EXISTS policy_users_insert ON users;
DROP POLICY IF EXISTS policy_users_update_own ON users;

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can read their own record
CREATE POLICY policy_users_select_own
    ON users
    FOR SELECT
    TO authenticated
    USING (auth_user_id = auth.uid() OR is_deleted = FALSE);

-- Policy 2: Users can read other users' basic info (needed for team views, etc.)
CREATE POLICY policy_users_select_all
    ON users
    FOR SELECT
    TO authenticated
    USING (is_deleted = FALSE);

-- Policy 3: Users can update their own record
CREATE POLICY policy_users_update_own
    ON users
    FOR UPDATE
    TO authenticated
    USING (auth_user_id = auth.uid())
    WITH CHECK (auth_user_id = auth.uid());

-- Policy 4: System can insert new users during registration
CREATE POLICY policy_users_insert
    ON users
    FOR INSERT
    TO authenticated
    WITH CHECK (auth_user_id = auth.uid());

-- Grant permissions
GRANT SELECT ON users TO authenticated;
GRANT INSERT ON users TO authenticated;
GRANT UPDATE ON users TO authenticated;
GRANT ALL ON users TO service_role;

-- ============================================================================
-- PART 2: FIX USER_ROLES TABLE RLS
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS policy_user_roles_select_own ON user_roles;
DROP POLICY IF EXISTS policy_user_roles_select_all ON user_roles;
DROP POLICY IF EXISTS policy_user_roles_insert ON user_roles;
DROP POLICY IF EXISTS policy_user_roles_update ON user_roles;

-- Ensure RLS is enabled
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can read their own roles
CREATE POLICY policy_user_roles_select_own
    ON user_roles
    FOR SELECT
    TO authenticated
    USING (
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
        OR is_deleted = FALSE
    );

-- Policy 2: Users can read other users' roles (needed for team management)
CREATE POLICY policy_user_roles_select_all
    ON user_roles
    FOR SELECT
    TO authenticated
    USING (is_deleted = FALSE);

-- Policy 3: System can insert roles during registration
CREATE POLICY policy_user_roles_insert
    ON user_roles
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy 4: Admins can update roles
CREATE POLICY policy_user_roles_update
    ON user_roles
    FOR UPDATE
    TO authenticated
    USING (is_deleted = FALSE);

-- Grant permissions
GRANT SELECT ON user_roles TO authenticated;
GRANT INSERT ON user_roles TO authenticated;
GRANT UPDATE ON user_roles TO authenticated;
GRANT ALL ON user_roles TO service_role;

-- ============================================================================
-- PART 3: FIX MENU_ITEMS TABLE RLS
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS policy_menu_items_select_authenticated ON menu_items;
DROP POLICY IF EXISTS policy_menu_items_select_public ON menu_items;

-- Ensure RLS is enabled
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- Policy 1: Authenticated users can read active menu items
CREATE POLICY policy_menu_items_select_authenticated
    ON menu_items
    FOR SELECT
    TO authenticated
    USING (is_active = TRUE AND is_deleted = FALSE);

-- Policy 2: Anonymous users can read menu items (for public pages)
CREATE POLICY policy_menu_items_select_public
    ON menu_items
    FOR SELECT
    TO anon
    USING (is_active = TRUE AND is_deleted = FALSE);

-- Grant permissions
GRANT SELECT ON menu_items TO authenticated;
GRANT SELECT ON menu_items TO anon;
GRANT ALL ON menu_items TO service_role;

-- ============================================================================
-- PART 4: FIX ROLE_MENU_ITEMS TABLE RLS
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS policy_role_menu_items_select_authenticated ON role_menu_items;

-- Ensure RLS is enabled
ALTER TABLE role_menu_items ENABLE ROW LEVEL SECURITY;

-- Policy 1: Authenticated users can read role-menu mappings
CREATE POLICY policy_role_menu_items_select_authenticated
    ON role_menu_items
    FOR SELECT
    TO authenticated
    USING (is_active = TRUE AND is_deleted = FALSE);

-- Grant permissions
GRANT SELECT ON role_menu_items TO authenticated;
GRANT ALL ON role_menu_items TO service_role;

-- ============================================================================
-- PART 5: VERIFY ORG_ADMIN MENU ACCESS
-- ============================================================================

-- Ensure org_admin role has menu access assigned
-- This should already exist from v14_seed_data_menus.sql, but let's verify
INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active)
SELECT
    r.id AS role_id,
    m.id AS menu_item_id,
    true AS can_view,
    true AS can_use,
    true AS is_active
FROM roles r
CROSS JOIN menu_items m
WHERE r.role_name = 'org_admin'
  AND m.is_deleted = FALSE
  AND m.is_active = TRUE
  AND m.menu_code NOT IN ('admin_settings', 'admin_audit', 'admin_integrations')
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
    can_view = true,
    can_use = true,
    is_active = true,
    updated_at = NOW();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    v_users_policies INTEGER;
    v_user_roles_policies INTEGER;
    v_menu_items_policies INTEGER;
    v_role_menu_items_policies INTEGER;
    v_org_admin_menu_count INTEGER;
    v_roles_policies INTEGER;
BEGIN
    -- Count policies
    SELECT COUNT(*) INTO v_users_policies
    FROM pg_policies WHERE tablename = 'users';

    SELECT COUNT(*) INTO v_user_roles_policies
    FROM pg_policies WHERE tablename = 'user_roles';

    SELECT COUNT(*) INTO v_roles_policies
    FROM pg_policies WHERE tablename = 'roles';

    SELECT COUNT(*) INTO v_menu_items_policies
    FROM pg_policies WHERE tablename = 'menu_items';

    SELECT COUNT(*) INTO v_role_menu_items_policies
    FROM pg_policies WHERE tablename = 'role_menu_items';

    -- Count org_admin menu assignments
    SELECT COUNT(*)
    INTO v_org_admin_menu_count
    FROM role_menu_items rmi
    INNER JOIN roles r ON rmi.role_id = r.id
    WHERE r.role_name = 'org_admin'
    AND rmi.is_active = TRUE
    AND rmi.is_deleted = FALSE;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Menu System RLS Fix Complete';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'RLS POLICIES:';
    RAISE NOTICE '  users table: % policies', v_users_policies;
    RAISE NOTICE '  user_roles table: % policies', v_user_roles_policies;
    RAISE NOTICE '  roles table: % policies', v_roles_policies;
    RAISE NOTICE '  menu_items table: % policies', v_menu_items_policies;
    RAISE NOTICE '  role_menu_items table: % policies', v_role_menu_items_policies;
    RAISE NOTICE '';
    RAISE NOTICE 'ORG_ADMIN MENU ACCESS:';
    RAISE NOTICE '  Menu items assigned: %', v_org_admin_menu_count;
    RAISE NOTICE '================================================';

    -- Raise warnings if issues remain
    IF v_users_policies < 3 THEN
        RAISE WARNING 'users table has insufficient RLS policies!';
    END IF;

    IF v_user_roles_policies < 3 THEN
        RAISE WARNING 'user_roles table has insufficient RLS policies!';
    END IF;

    IF v_menu_items_policies < 2 THEN
        RAISE WARNING 'menu_items table has insufficient RLS policies!';
    END IF;

    IF v_role_menu_items_policies < 1 THEN
        RAISE WARNING 'role_menu_items table has insufficient RLS policies!';
    END IF;

    IF v_org_admin_menu_count = 0 THEN
        RAISE WARNING 'org_admin role has NO menu items assigned!';
    ELSIF v_org_admin_menu_count < 10 THEN
        RAISE WARNING 'org_admin role has very few menu items (% items)', v_org_admin_menu_count;
    END IF;
END $$;

-- ============================================================================
-- TEST QUERIES (Uncomment to test)
-- ============================================================================

-- Test 1: Can authenticated user read their own user record?
-- SELECT id, email, first_name, last_name FROM users WHERE auth_user_id = auth.uid();

-- Test 2: Can authenticated user read their roles?
-- SELECT ur.*, r.role_name, r.role_display_name
-- FROM user_roles ur
-- INNER JOIN roles r ON ur.role_id = r.id
-- INNER JOIN users u ON ur.user_id = u.id
-- WHERE u.auth_user_id = auth.uid();

-- Test 3: Can authenticated user read menu items?
-- SELECT menu_code, menu_label, route_path FROM menu_items WHERE is_active = TRUE LIMIT 10;

-- Test 4: Can authenticated user read their accessible menus?
-- SELECT m.menu_code, m.menu_label, m.route_path, rmi.can_view, rmi.can_use
-- FROM role_menu_items rmi
-- INNER JOIN menu_items m ON rmi.menu_item_id = m.id
-- INNER JOIN user_roles ur ON rmi.role_id = ur.role_id
-- INNER JOIN users u ON ur.user_id = u.id
-- WHERE u.auth_user_id = auth.uid()
-- AND rmi.can_view = TRUE
-- AND rmi.is_active = TRUE
-- LIMIT 10;

-- Test 5: Check org_admin menu assignments
-- SELECT m.menu_code, m.menu_label, rmi.can_view, rmi.can_use
-- FROM role_menu_items rmi
-- INNER JOIN roles r ON rmi.role_id = r.id
-- INNER JOIN menu_items m ON rmi.menu_item_id = m.id
-- WHERE r.role_name = 'org_admin'
-- AND rmi.is_active = TRUE
-- ORDER BY m.sort_order
-- LIMIT 20;
