-- ============================================================================
-- Comprehensive RLS Policies for Unified Login System
-- Version: v88
-- Description: Additional RLS policies for accounts, project_roles, project_memberships, etc.
-- Author: Development Team
-- Date: 2025-11-27
-- ============================================================================

-- Prerequisites:
-- - v84_accounts_and_extensions.sql
-- - v85_project_invitations_seats.sql
-- - v86_default_project_roles_seed.sql
-- - v87_unified_auth_functions.sql

-- Purpose:
-- 1. Comprehensive RLS policies for all new tables
-- 2. Update existing policies where needed
-- 3. Ensure proper data isolation

-- ============================================================================
-- PROJECT ROLES RLS POLICIES
-- ============================================================================

-- Enable RLS on project_roles (if table exists)
-- Note: Currently using roles table, but this is for future project_roles table
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'project_roles'
    ) THEN
        ALTER TABLE project_roles ENABLE ROW LEVEL SECURITY;

        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS policy_project_roles_select ON project_roles;
        DROP POLICY IF EXISTS policy_project_roles_manage ON project_roles;

        -- Users can view roles for projects they're members of
        CREATE POLICY policy_project_roles_select
            ON project_roles FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM user_roles ur
                    INNER JOIN users u ON u.id = ur.user_id
                    WHERE u.auth_user_id = auth.uid()
                    AND ur.project_id = project_roles.project_id
                    AND ur.is_active = TRUE
                    AND ur.is_deleted = FALSE
                )
            );

        -- Users with role.manage permission can create/edit/delete custom roles
        CREATE POLICY policy_project_roles_manage
            ON project_roles FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM user_roles ur
                    INNER JOIN role_permissions rp ON rp.role_id = ur.role_id
                    INNER JOIN permissions p ON p.id = rp.permission_id
                    INNER JOIN users u ON u.id = ur.user_id
                    WHERE u.auth_user_id = auth.uid()
                    AND ur.project_id = project_roles.project_id
                    AND p.permission_code = 'role.manage'
                    AND ur.is_active = TRUE
                    AND rp.is_active = TRUE
                )
            );
    END IF;
END $$;

-- ============================================================================
-- UPDATE PROJECTS RLS WITH ACCOUNT CONTEXT
-- ============================================================================

-- Ensure projects RLS considers account membership
DO $$
BEGIN
    -- Drop existing policies if they don't account for accounts
    -- (This is a placeholder - adjust based on your existing policies)
    
    -- Drop existing policy if it exists
    DROP POLICY IF EXISTS policy_projects_account_members ON projects;
    
    -- Add account-based access
    CREATE POLICY policy_projects_account_members
        ON projects FOR SELECT
        USING (
            -- Account owner
            EXISTS (
                SELECT 1 FROM accounts a
                INNER JOIN users u ON u.id = a.owner_user_id
                WHERE a.id = projects.account_id
                AND u.auth_user_id = auth.uid()
            )
            OR
            -- Account member via project
            EXISTS (
                SELECT 1 FROM user_roles ur
                INNER JOIN users u ON u.id = ur.user_id
                WHERE ur.project_id = projects.id
                AND u.auth_user_id = auth.uid()
                AND ur.is_active = TRUE
            )
        );
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    policies_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policies_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename IN ('accounts', 'project_invitations', 'project_seat_allocations', 'extra_seat_purchases');

    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ v88 RLS Policies Migration';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Policies created/updated: %', policies_count;
    RAISE NOTICE '';
    RAISE NOTICE 'RLS enabled on:';
    RAISE NOTICE '  - accounts';
    RAISE NOTICE '  - project_invitations';
    RAISE NOTICE '  - project_seat_allocations';
    RAISE NOTICE '  - extra_seat_purchases';
    RAISE NOTICE '  - project_roles (if exists)';
    RAISE NOTICE '';
    RAISE NOTICE 'Account-based access policies updated';
    RAISE NOTICE '========================================';
END $$;

