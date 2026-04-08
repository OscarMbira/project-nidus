-- ============================================================================
-- PMO Admin RLS Policies
-- Description: Adds RLS policies to allow pmo_admin to access projects and users
-- ============================================================================

-- ============================================================================
-- TABLE: projects
-- Add pmo_admin access policy
-- ============================================================================

-- Drop policy if it exists (to allow re-running the script)
DROP POLICY IF EXISTS policy_projects_pmo_admin_all ON projects;

-- PMO Admin: Full access to all projects in accounts they own
CREATE POLICY policy_projects_pmo_admin_all
    ON projects FOR ALL
    USING (
        EXISTS (
            SELECT 1 
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            JOIN users u ON ur.user_id = u.id
            JOIN accounts a ON a.owner_user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name = 'pmo_admin'
              AND ur.is_active = TRUE
              AND ur.is_deleted = FALSE
              AND projects.account_id = a.id
              AND a.is_deleted = FALSE
        )
    );

COMMENT ON POLICY policy_projects_pmo_admin_all ON projects IS 
    'Allows PMO Admin to access all projects in their organization';

-- ============================================================================
-- TABLE: users
-- NOTE: Users table policies are NOT added here to prevent infinite recursion
-- ============================================================================

-- IMPORTANT: We cannot add pmo_admin-specific policies to the users table
-- because they would query the users table within the RLS check, causing
-- infinite recursion: "infinite recursion detected in policy for relation 'users'"
--
-- Instead, we rely on the v129 policies:
-- - policy_users_select_all: Allows reading all non-deleted users
--   This is sufficient for pmo_admin needs - they can filter in application code
--
-- If you need pmo_admin-specific user access, use v134_fix_users_rls_infinite_recursion.sql
-- which provides a safe approach without recursion.

-- Drop any existing problematic policies (from previous runs)
DROP POLICY IF EXISTS policy_users_pmo_admin_read ON users;
DROP POLICY IF EXISTS policy_users_pmo_admin_update ON users;

-- ============================================================================
-- TABLE: user_roles
-- NOTE: User roles table policies are NOT added here to prevent infinite recursion
-- ============================================================================

-- IMPORTANT: We cannot add pmo_admin-specific policies to the user_roles table
-- because they would query the user_roles table within the RLS check, causing
-- infinite recursion: "infinite recursion detected in policy for relation 'user_roles'"
--
-- Instead, we rely on the v129 policies:
-- - policy_user_roles_select_all: Allows reading all non-deleted user_roles
--   This is sufficient for pmo_admin needs - they can filter in application code
--
-- If you need pmo_admin-specific user_roles access, use v135_fix_user_roles_rls_infinite_recursion.sql
-- which provides a safe approach without recursion.

-- Drop any existing problematic policies (from previous runs)
DROP POLICY IF EXISTS policy_user_roles_pmo_admin_all ON user_roles;

-- ============================================================================
-- TABLE: roles
-- NOTE: Roles table policies are NOT added here to prevent infinite recursion
-- ============================================================================

-- IMPORTANT: We cannot add pmo_admin-specific policies to the roles table
-- because they would query user_roles which queries roles, causing infinite
-- recursion: "infinite recursion detected in policy for relation 'roles'"
--
-- Instead, we rely on the v128 policies:
-- - policy_roles_select_authenticated: Allows reading all active roles
--   This is sufficient for pmo_admin needs - they can filter in application code
--
-- If you need pmo_admin-specific roles access, use v136_fix_roles_rls_infinite_recursion.sql
-- which provides a safe approach without recursion.

-- Drop any existing problematic policies (from previous runs)
DROP POLICY IF EXISTS policy_roles_pmo_admin_read ON roles;

-- ============================================================================
-- TABLE: project_roles (if exists)
-- Add pmo_admin read access
-- ============================================================================

-- Check if project_roles table exists and add policy
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'project_roles'
    ) THEN
        -- Drop policy if it exists (to allow re-running the script)
        EXECUTE 'DROP POLICY IF EXISTS policy_project_roles_pmo_admin_read ON project_roles';
        
        -- PMO Admin: Read project roles
        EXECUTE '
        CREATE POLICY policy_project_roles_pmo_admin_read
            ON project_roles FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 
                    FROM user_roles ur
                    JOIN roles r ON ur.role_id = r.id
                    JOIN users u ON ur.user_id = u.id
                    WHERE u.auth_user_id = auth.uid()
                      AND r.role_name = ''pmo_admin''
                      AND ur.is_active = TRUE
                      AND ur.is_deleted = FALSE
                )
            )';
        
        RAISE NOTICE 'Added RLS policy for project_roles table';
    ELSE
        RAISE NOTICE 'project_roles table does not exist, skipping policy';
    END IF;
END $$;

-- ============================================================================
-- TABLE: project_invitations
-- Add pmo_admin access policy
-- ============================================================================

-- Check if project_invitations table exists and add policy
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'project_invitations'
    ) THEN
        -- Drop policy if it exists (to allow re-running the script)
        EXECUTE 'DROP POLICY IF EXISTS policy_project_invitations_pmo_admin_all ON project_invitations';
        
        -- PMO Admin: Full access to project invitations
        EXECUTE '
        CREATE POLICY policy_project_invitations_pmo_admin_all
            ON project_invitations FOR ALL
            USING (
                EXISTS (
                    SELECT 1 
                    FROM user_roles ur
                    JOIN roles r ON ur.role_id = r.id
                    JOIN users u ON ur.user_id = u.id
                    WHERE u.auth_user_id = auth.uid()
                      AND r.role_name = ''pmo_admin''
                      AND ur.is_active = TRUE
                      AND ur.is_deleted = FALSE
                )
            )';
        
        RAISE NOTICE 'Added RLS policy for project_invitations table';
    ELSE
        RAISE NOTICE 'project_invitations table does not exist, skipping policy';
    END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE 'PMO Admin RLS policies added successfully';
END $$;

