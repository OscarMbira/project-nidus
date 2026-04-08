-- ============================================================================
-- Fix RLS Permission Errors for Programmes, Project Memberships, and related tables
-- Version: v179
-- Description: Fixes 403 permission denied errors for programmes, project_memberships,
--              and related RLS policy issues
-- Date: 2026-01-19
-- ============================================================================
--
-- Issues Fixed:
-- 1. programmes table: RLS enabled but no policies (all commented out)
-- 2. project_memberships: Recursive policy queries itself
-- 3. user_projects: Policy uses wrong comparison (user_id vs auth.uid())
--
-- ============================================================================
-- SECTION 1: GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON programmes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON project_memberships TO authenticated;

-- ============================================================================
-- SECTION 2: FIX PROGRAMMES TABLE RLS POLICIES
-- ============================================================================

-- Drop any existing policies (in case they were added elsewhere)
DROP POLICY IF EXISTS policy_programmes_select ON programmes;
DROP POLICY IF EXISTS policy_programmes_insert ON programmes;
DROP POLICY IF EXISTS policy_programmes_update ON programmes;
DROP POLICY IF EXISTS policy_programmes_pmo_admin ON programmes;

-- Policy: Authenticated users can view all non-deleted programmes
CREATE POLICY policy_programmes_select ON programmes
    FOR SELECT
    TO authenticated
    USING (
        is_deleted = FALSE
        AND (
            -- User is programme member
            EXISTS (
                SELECT 1 FROM programme_members pm
                JOIN users u ON pm.user_id = u.id
                WHERE pm.programme_id = programmes.id
                  AND u.auth_user_id = auth.uid()
                  AND pm.is_deleted = FALSE
            )
            -- OR user is programme owner/manager
            OR EXISTS (
                SELECT 1 FROM users u
                WHERE (u.id = programmes.programme_owner_user_id OR u.id = programmes.programme_manager_user_id)
                  AND u.auth_user_id = auth.uid()
            )
            -- OR user is PMO admin
            OR EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN users u ON ur.user_id = u.id
                JOIN roles r ON ur.role_id = r.id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name IN ('pmo_admin', 'System Admin')
                  AND ur.is_active = TRUE
                  AND ur.is_deleted = FALSE
            )
        )
    );

-- Policy: Programme owners/managers can create programmes
CREATE POLICY policy_programmes_insert ON programmes
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.auth_user_id = auth.uid()
              AND (u.id = programmes.programme_owner_user_id OR u.id = programmes.programme_manager_user_id)
        )
        OR EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN users u ON ur.user_id = u.id
            JOIN roles r ON ur.role_id = r.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name IN ('pmo_admin', 'System Admin')
              AND ur.is_active = TRUE
              AND ur.is_deleted = FALSE
        )
    );

-- Policy: Programme owners/managers can update programmes
CREATE POLICY policy_programmes_update ON programmes
    FOR UPDATE
    TO authenticated
    USING (
        is_deleted = FALSE
        AND (
            EXISTS (
                SELECT 1 FROM users u
                WHERE u.auth_user_id = auth.uid()
                  AND (u.id = programmes.programme_owner_user_id OR u.id = programmes.programme_manager_user_id)
            )
            OR EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN users u ON ur.user_id = u.id
                JOIN roles r ON ur.role_id = r.id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name IN ('pmo_admin', 'System Admin')
                  AND ur.is_active = TRUE
                  AND ur.is_deleted = FALSE
            )
        )
    );

-- Policy: PMO Admin has full access
CREATE POLICY policy_programmes_pmo_admin ON programmes
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN users u ON ur.user_id = u.id
            JOIN roles r ON ur.role_id = r.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name IN ('pmo_admin', 'System Admin')
              AND ur.is_active = TRUE
              AND ur.is_deleted = FALSE
        )
    );

-- ============================================================================
-- SECTION 3: FIX PROJECT_MEMBERSHIPS RECURSIVE POLICY ISSUE
-- ============================================================================

-- Drop the problematic recursive policies
DROP POLICY IF EXISTS policy_project_memberships_project_manager_insert ON project_memberships;
DROP POLICY IF EXISTS policy_project_memberships_project_manager_update ON project_memberships;

-- Fixed Policy 3: Project managers can insert memberships (NO RECURSION)
-- Use user_projects table but check access_level to avoid recursion
CREATE POLICY policy_project_memberships_project_manager_insert ON project_memberships
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Check via user_projects with access_level (no recursion on same table check)
        EXISTS (
            SELECT 1 FROM user_projects up
            JOIN users u ON u.id = up.user_id
            WHERE up.project_id = project_memberships.project_id
              AND u.auth_user_id = auth.uid()
              AND up.access_level IN ('owner', 'admin')
              AND up.is_deleted = FALSE
        )
        OR
        -- Account owners can add members to projects in their account
        EXISTS (
            SELECT 1 FROM projects p
            INNER JOIN accounts a ON a.id = p.account_id
            INNER JOIN users u ON u.id = a.owner_user_id
            WHERE p.id = project_memberships.project_id
              AND u.auth_user_id = auth.uid()
              AND a.is_deleted = FALSE
              AND p.is_deleted = FALSE
        )
        OR
        -- PMO Admin can insert
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN users u ON ur.user_id = u.id
            JOIN roles r ON ur.role_id = r.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name IN ('pmo_admin', 'System Admin')
              AND ur.is_active = TRUE
              AND ur.is_deleted = FALSE
        )
    );

-- Fixed Policy 4: Project managers can update memberships (NO RECURSION)
-- Use user_projects table but check access_level to avoid recursion
CREATE POLICY policy_project_memberships_project_manager_update ON project_memberships
    FOR UPDATE
    TO authenticated
    USING (
        -- Check via user_projects with access_level (no recursion on same table check)
        EXISTS (
            SELECT 1 FROM user_projects up
            JOIN users u ON u.id = up.user_id
            WHERE up.project_id = project_memberships.project_id
              AND u.auth_user_id = auth.uid()
              AND up.access_level IN ('owner', 'admin')
              AND up.is_deleted = FALSE
        )
        OR
        -- Account owners can update memberships
        EXISTS (
            SELECT 1 FROM projects p
            INNER JOIN accounts a ON a.id = p.account_id
            INNER JOIN users u ON u.id = a.owner_user_id
            WHERE p.id = project_memberships.project_id
              AND u.auth_user_id = auth.uid()
              AND a.is_deleted = FALSE
              AND p.is_deleted = FALSE
        )
        OR
        -- PMO Admin can update
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN users u ON ur.user_id = u.id
            JOIN roles r ON ur.role_id = r.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name IN ('pmo_admin', 'System Admin')
              AND ur.is_active = TRUE
              AND ur.is_deleted = FALSE
        )
    )
    WITH CHECK (
        -- Same checks for WITH CHECK clause
        EXISTS (
            SELECT 1 FROM user_projects up
            JOIN users u ON u.id = up.user_id
            WHERE up.project_id = project_memberships.project_id
              AND u.auth_user_id = auth.uid()
              AND up.access_level IN ('owner', 'admin')
              AND up.is_deleted = FALSE
        )
        OR
        EXISTS (
            SELECT 1 FROM projects p
            INNER JOIN accounts a ON a.id = p.account_id
            INNER JOIN users u ON u.id = a.owner_user_id
            WHERE p.id = project_memberships.project_id
              AND u.auth_user_id = auth.uid()
              AND a.is_deleted = FALSE
              AND p.is_deleted = FALSE
        )
        OR
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN users u ON ur.user_id = u.id
            JOIN roles r ON ur.role_id = r.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name IN ('pmo_admin', 'System Admin')
              AND ur.is_active = TRUE
              AND ur.is_deleted = FALSE
        )
    );

-- ============================================================================
-- SECTION 4: VERIFY USER_PROJECTS POLICIES ARE CORRECT
-- ============================================================================

-- Check if user_projects policy needs fixing (drop and recreate if needed)
-- The policy should use: user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
DO $$
BEGIN
    -- Check if the old incorrect policy exists
    IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'user_projects'
          AND policyname = 'policy_user_projects_own_read'
          AND definition LIKE '%user_id = auth.uid()%'
    ) THEN
        -- Drop and recreate with correct check
        DROP POLICY IF EXISTS policy_user_projects_own_read ON user_projects;
        
        CREATE POLICY policy_user_projects_own_read
            ON user_projects FOR SELECT
            TO authenticated
            USING (
                user_id IN (
                    SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE
                )
            );
        
        RAISE NOTICE 'Fixed policy_user_projects_own_read';
    ELSE
        RAISE NOTICE 'policy_user_projects_own_read is already correct or does not exist';
    END IF;
END $$;

-- ============================================================================
-- COMPLETION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'v179_fix_rls_permission_errors.sql completed successfully';
    RAISE NOTICE 'Fixed RLS policies for: programmes, project_memberships, and verified user_projects';
END $$;
