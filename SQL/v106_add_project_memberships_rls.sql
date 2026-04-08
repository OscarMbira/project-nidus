-- =====================================================================================
-- Add RLS Policies for project_memberships table
-- Version: v106
-- Description: Adds Row Level Security policies for project_memberships table
--              to allow authenticated users to read and manage memberships
-- =====================================================================================

-- Enable RLS on project_memberships if not already enabled
ALTER TABLE project_memberships ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running this script)
DROP POLICY IF EXISTS policy_project_memberships_auth_read ON project_memberships;
DROP POLICY IF EXISTS policy_project_memberships_user_read ON project_memberships;
DROP POLICY IF EXISTS policy_project_memberships_project_manager_insert ON project_memberships;
DROP POLICY IF EXISTS policy_project_memberships_project_manager_update ON project_memberships;
DROP POLICY IF EXISTS policy_project_memberships_self_update ON project_memberships;

-- =====================================================================================
-- POLICY 1: Authenticated users can read all active memberships
-- =====================================================================================

CREATE POLICY policy_project_memberships_auth_read
    ON project_memberships FOR SELECT
    USING (
        auth.role() = 'authenticated'
        AND is_active = TRUE
    );

-- =====================================================================================
-- POLICY 2: Users can read their own memberships (including inactive)
-- =====================================================================================

CREATE POLICY policy_project_memberships_user_read
    ON project_memberships FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = project_memberships.user_id
            AND u.auth_user_id = auth.uid()
        )
    );

-- =====================================================================================
-- POLICY 3: Project managers can insert memberships for their projects
-- =====================================================================================

CREATE POLICY policy_project_memberships_project_manager_insert
    ON project_memberships FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM project_memberships pm
            INNER JOIN users u ON u.id = pm.user_id
            WHERE pm.project_id = project_memberships.project_id
            AND u.auth_user_id = auth.uid()
            AND pm.is_active = TRUE
            AND EXISTS (
                SELECT 1 FROM project_roles pr
                WHERE pr.id = pm.project_role_id
                AND pr.role_name IN ('project_manager', 'programme_manager', 'project_sponsor', 'project_board_member')
                AND pr.is_active = TRUE
            )
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
    );

-- =====================================================================================
-- POLICY 4: Project managers can update memberships in their projects
-- =====================================================================================

CREATE POLICY policy_project_memberships_project_manager_update
    ON project_memberships FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM project_memberships pm
            INNER JOIN users u ON u.id = pm.user_id
            WHERE pm.project_id = project_memberships.project_id
            AND u.auth_user_id = auth.uid()
            AND pm.is_active = TRUE
            AND EXISTS (
                SELECT 1 FROM project_roles pr
                WHERE pr.id = pm.project_role_id
                AND pr.role_name IN ('project_manager', 'programme_manager', 'project_sponsor', 'project_board_member')
                AND pr.is_active = TRUE
            )
        )
        OR
        -- Account owners can update memberships in projects in their account
        EXISTS (
            SELECT 1 FROM projects p
            INNER JOIN accounts a ON a.id = p.account_id
            INNER JOIN users u ON u.id = a.owner_user_id
            WHERE p.id = project_memberships.project_id
            AND u.auth_user_id = auth.uid()
            AND a.is_deleted = FALSE
            AND p.is_deleted = FALSE
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM project_memberships pm
            INNER JOIN users u ON u.id = pm.user_id
            WHERE pm.project_id = project_memberships.project_id
            AND u.auth_user_id = auth.uid()
            AND pm.is_active = TRUE
            AND EXISTS (
                SELECT 1 FROM project_roles pr
                WHERE pr.id = pm.project_role_id
                AND pr.role_name IN ('project_manager', 'programme_manager', 'project_sponsor', 'project_board_member')
                AND pr.is_active = TRUE
            )
        )
        OR
        -- Account owners can update memberships in projects in their account
        EXISTS (
            SELECT 1 FROM projects p
            INNER JOIN accounts a ON a.id = p.account_id
            INNER JOIN users u ON u.id = a.owner_user_id
            WHERE p.id = project_memberships.project_id
            AND u.auth_user_id = auth.uid()
            AND a.is_deleted = FALSE
            AND p.is_deleted = FALSE
        )
    );

-- =====================================================================================
-- POLICY 5: Users can update their own membership status (e.g., accept invitation)
-- =====================================================================================

CREATE POLICY policy_project_memberships_self_update
    ON project_memberships FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = project_memberships.user_id
            AND u.auth_user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = project_memberships.user_id
            AND u.auth_user_id = auth.uid()
        )
    );

-- =====================================================================================
-- VERIFICATION
-- =====================================================================================

DO $$
DECLARE
  v_policies_count INTEGER;
BEGIN
  -- Count policies on project_memberships
  SELECT COUNT(*) INTO v_policies_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'project_memberships';

  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ RLS POLICIES CREATED';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Policies on project_memberships: %', v_policies_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Policies created:';
  RAISE NOTICE '  - policy_project_memberships_auth_read (SELECT)';
  RAISE NOTICE '  - policy_project_memberships_user_read (SELECT)';
  RAISE NOTICE '  - policy_project_memberships_project_manager_insert (INSERT)';
  RAISE NOTICE '  - policy_project_memberships_project_manager_update (UPDATE)';
  RAISE NOTICE '  - policy_project_memberships_self_update (UPDATE)';
  RAISE NOTICE '';

  IF v_policies_count >= 5 THEN
    RAISE NOTICE '🎉 All RLS policies have been created successfully!';
  ELSE
    RAISE WARNING 'Expected 5 policies, but found %. Please check manually.', v_policies_count;
  END IF;

  RAISE NOTICE '';
END $$;

