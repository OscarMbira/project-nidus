-- ============================================================================
-- Project Mandates RLS Policies
-- Version: v162
-- Description: Row Level Security policies for project_mandates and related tables
-- Date: 2026-01-28
-- ============================================================================

-- Prerequisites:
-- - v160_project_mandate_tables.sql must be run first (tables must exist)
-- - users table must exist (v02_system_core_tables.sql)
-- - user_roles and roles tables must exist

-- Purpose:
-- Implements RLS policies for project_mandates and all child tables to control access
-- based on user roles and organization membership

-- ============================================================================
-- SECTION 1: HELPER FUNCTION - Get User Internal ID
-- ============================================================================

-- Helper function to get internal user ID from auth user ID (for use in policies)
CREATE OR REPLACE FUNCTION get_user_internal_id(p_auth_user_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT id FROM users WHERE auth_user_id = p_auth_user_id AND is_deleted = FALSE LIMIT 1;
$$;

COMMENT ON FUNCTION get_user_internal_id(UUID) IS 'Helper function to get internal user ID from auth user ID for RLS policies';

-- ============================================================================
-- SECTION 2: GRANT PERMISSIONS TO AUTHENTICATED ROLE
-- ============================================================================
-- IMPORTANT: Grant permissions BEFORE enabling RLS and creating policies
-- This is required for Supabase RLS to work correctly

GRANT SELECT, INSERT, UPDATE ON project_mandates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON mandate_deliverables TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON mandate_dependencies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON mandate_customers_users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON mandate_reviewers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON mandate_approvals TO authenticated;
GRANT SELECT ON mandate_document_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON mandate_associated_documents TO authenticated;

-- ============================================================================
-- SECTION 3: ENABLE RLS ON ALL MANDATE TABLES
-- ============================================================================

ALTER TABLE project_mandates ENABLE ROW LEVEL SECURITY;
ALTER TABLE mandate_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE mandate_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE mandate_customers_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE mandate_reviewers ENABLE ROW LEVEL SECURITY;
ALTER TABLE mandate_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE mandate_document_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE mandate_associated_documents ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 4: PROJECT_MANDATES RLS POLICIES
-- ============================================================================

-- Policy 1: Authenticated users can view all non-deleted mandates
DROP POLICY IF EXISTS policy_project_mandates_auth_select ON project_mandates;
CREATE POLICY policy_project_mandates_auth_select
    ON project_mandates FOR SELECT
    TO authenticated
    USING (
        is_deleted = FALSE
    );

-- Policy 2: Users can create mandates (they become the creator)
DROP POLICY IF EXISTS policy_project_mandates_auth_insert ON project_mandates;
CREATE POLICY policy_project_mandates_auth_insert
    ON project_mandates FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
    );

-- Policy 3: Users can update mandates they created (if still draft/rejected)
DROP POLICY IF EXISTS policy_project_mandates_creator_update ON project_mandates;
CREATE POLICY policy_project_mandates_creator_update
    ON project_mandates FOR UPDATE
    TO authenticated
    USING (
        created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND is_deleted = FALSE
        AND document_status IN ('draft', 'rejected') -- Can only edit draft or rejected
    )
    WITH CHECK (
        created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND is_deleted = FALSE
    );

-- Policy 4: PMO Admin can manage all mandates
DROP POLICY IF EXISTS policy_project_mandates_pmo_admin_all ON project_mandates;
CREATE POLICY policy_project_mandates_pmo_admin_all
    ON project_mandates FOR ALL
    USING (
        EXISTS (
            SELECT 1
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            JOIN users u ON ur.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name = 'pmo_admin'
              AND ur.is_active = TRUE
              AND ur.is_deleted = FALSE
              AND r.is_active = TRUE
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            JOIN users u ON ur.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name = 'pmo_admin'
              AND ur.is_active = TRUE
              AND ur.is_deleted = FALSE
              AND r.is_active = TRUE
        )
    );

-- Policy 5: System Admin has full access
DROP POLICY IF EXISTS policy_project_mandates_system_admin_all ON project_mandates;
CREATE POLICY policy_project_mandates_system_admin_all
    ON project_mandates FOR ALL
    USING (
        EXISTS (
            SELECT 1
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            JOIN users u ON ur.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name = 'System Admin'
              AND ur.is_active = TRUE
              AND ur.is_deleted = FALSE
              AND r.is_active = TRUE
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            JOIN users u ON ur.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name = 'System Admin'
              AND ur.is_active = TRUE
              AND ur.is_deleted = FALSE
              AND r.is_active = TRUE
        )
    );

-- ============================================================================
-- SECTION 5: MANDATE CHILD TABLES RLS POLICIES
-- ============================================================================

-- mandate_deliverables
DROP POLICY IF EXISTS policy_mandate_deliverables_auth_select ON mandate_deliverables;
CREATE POLICY policy_mandate_deliverables_auth_select
    ON mandate_deliverables FOR SELECT
    USING (
        auth.role() = 'authenticated'
        AND mandate_id IN (
            SELECT id FROM project_mandates
            WHERE is_deleted = FALSE AND is_active = TRUE
        )
    );

DROP POLICY IF EXISTS policy_mandate_deliverables_auth_all ON mandate_deliverables;
CREATE POLICY policy_mandate_deliverables_auth_all
    ON mandate_deliverables FOR ALL
    USING (
        auth.role() = 'authenticated'
        AND mandate_id IN (
            SELECT id FROM project_mandates
            WHERE (created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                   OR EXISTS (
                       SELECT 1 FROM user_roles ur
                       JOIN roles r ON ur.role_id = r.id
                       JOIN users u ON ur.user_id = u.id
                       WHERE u.auth_user_id = auth.uid()
                         AND r.role_name IN ('pmo_admin', 'System Admin')
                         AND ur.is_active = TRUE
                   ))
            AND is_deleted = FALSE
        )
    );

-- mandate_dependencies
DROP POLICY IF EXISTS policy_mandate_dependencies_auth_select ON mandate_dependencies;
CREATE POLICY policy_mandate_dependencies_auth_select
    ON mandate_dependencies FOR SELECT
    USING (
        auth.role() = 'authenticated'
        AND mandate_id IN (
            SELECT id FROM project_mandates
            WHERE is_deleted = FALSE AND is_active = TRUE
        )
    );

DROP POLICY IF EXISTS policy_mandate_dependencies_auth_all ON mandate_dependencies;
CREATE POLICY policy_mandate_dependencies_auth_all
    ON mandate_dependencies FOR ALL
    USING (
        auth.role() = 'authenticated'
        AND mandate_id IN (
            SELECT id FROM project_mandates
            WHERE (created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                   OR EXISTS (
                       SELECT 1 FROM user_roles ur
                       JOIN roles r ON ur.role_id = r.id
                       JOIN users u ON ur.user_id = u.id
                       WHERE u.auth_user_id = auth.uid()
                         AND r.role_name IN ('pmo_admin', 'System Admin')
                         AND ur.is_active = TRUE
                   ))
            AND is_deleted = FALSE
        )
    );

-- mandate_customers_users
DROP POLICY IF EXISTS policy_mandate_customers_users_auth_select ON mandate_customers_users;
CREATE POLICY policy_mandate_customers_users_auth_select
    ON mandate_customers_users FOR SELECT
    USING (
        auth.role() = 'authenticated'
        AND mandate_id IN (
            SELECT id FROM project_mandates
            WHERE is_deleted = FALSE AND is_active = TRUE
        )
    );

DROP POLICY IF EXISTS policy_mandate_customers_users_auth_all ON mandate_customers_users;
CREATE POLICY policy_mandate_customers_users_auth_all
    ON mandate_customers_users FOR ALL
    USING (
        auth.role() = 'authenticated'
        AND mandate_id IN (
            SELECT id FROM project_mandates
            WHERE (created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                   OR EXISTS (
                       SELECT 1 FROM user_roles ur
                       JOIN roles r ON ur.role_id = r.id
                       JOIN users u ON ur.user_id = u.id
                       WHERE u.auth_user_id = auth.uid()
                         AND r.role_name IN ('pmo_admin', 'System Admin')
                         AND ur.is_active = TRUE
                   ))
            AND is_deleted = FALSE
        )
    );

-- mandate_reviewers
DROP POLICY IF EXISTS policy_mandate_reviewers_auth_select ON mandate_reviewers;
CREATE POLICY policy_mandate_reviewers_auth_select
    ON mandate_reviewers FOR SELECT
    USING (
        auth.role() = 'authenticated'
        AND mandate_id IN (
            SELECT id FROM project_mandates
            WHERE is_deleted = FALSE AND is_active = TRUE
        )
    );

DROP POLICY IF EXISTS policy_mandate_reviewers_pmo_admin_all ON mandate_reviewers;
CREATE POLICY policy_mandate_reviewers_pmo_admin_all
    ON mandate_reviewers FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            JOIN users u ON ur.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name IN ('pmo_admin', 'System Admin')
              AND ur.is_active = TRUE
              AND ur.is_deleted = FALSE
        )
    );

-- mandate_approvals
DROP POLICY IF EXISTS policy_mandate_approvals_auth_select ON mandate_approvals;
CREATE POLICY policy_mandate_approvals_auth_select
    ON mandate_approvals FOR SELECT
    USING (
        auth.role() = 'authenticated'
        AND mandate_id IN (
            SELECT id FROM project_mandates
            WHERE is_deleted = FALSE AND is_active = TRUE
        )
    );

DROP POLICY IF EXISTS policy_mandate_approvals_pmo_admin_all ON mandate_approvals;
CREATE POLICY policy_mandate_approvals_pmo_admin_all
    ON mandate_approvals FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            JOIN users u ON ur.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name IN ('pmo_admin', 'System Admin')
              AND ur.is_active = TRUE
              AND ur.is_deleted = FALSE
        )
    );

-- mandate_document_history
DROP POLICY IF EXISTS policy_mandate_document_history_auth_select ON mandate_document_history;
CREATE POLICY policy_mandate_document_history_auth_select
    ON mandate_document_history FOR SELECT
    USING (
        auth.role() = 'authenticated'
        AND mandate_id IN (
            SELECT id FROM project_mandates
            WHERE is_deleted = FALSE AND is_active = TRUE
        )
    );

-- mandate_associated_documents
DROP POLICY IF EXISTS policy_mandate_associated_documents_auth_select ON mandate_associated_documents;
CREATE POLICY policy_mandate_associated_documents_auth_select
    ON mandate_associated_documents FOR SELECT
    USING (
        auth.role() = 'authenticated'
        AND mandate_id IN (
            SELECT id FROM project_mandates
            WHERE is_deleted = FALSE AND is_active = TRUE
        )
    );

DROP POLICY IF EXISTS policy_mandate_associated_documents_auth_all ON mandate_associated_documents;
CREATE POLICY policy_mandate_associated_documents_auth_all
    ON mandate_associated_documents FOR ALL
    USING (
        auth.role() = 'authenticated'
        AND mandate_id IN (
            SELECT id FROM project_mandates
            WHERE (created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                   OR EXISTS (
                       SELECT 1 FROM user_roles ur
                       JOIN roles r ON ur.role_id = r.id
                       JOIN users u ON ur.user_id = u.id
                       WHERE u.auth_user_id = auth.uid()
                         AND r.role_name IN ('pmo_admin', 'System Admin')
                         AND ur.is_active = TRUE
                   ))
            AND is_deleted = FALSE
        )
    );

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    v_policies_count INTEGER;
BEGIN
    -- Count RLS policies created
    SELECT COUNT(*) INTO v_policies_count
    FROM pg_policies
    WHERE tablename LIKE 'mandate%' OR tablename = 'project_mandates';
    
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Project Mandates RLS Policies Created';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'RLS Policies Created: %', v_policies_count;
    RAISE NOTICE 'Expected: 20+ policies across 8 tables';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'v162_project_mandates_rls_policies.sql completed successfully';
    RAISE NOTICE '================================================';
END $$;

-- ============================================================================
-- END OF FILE
-- ============================================================================
