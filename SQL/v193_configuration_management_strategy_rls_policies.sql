-- ============================================================================
-- Configuration Management Strategy - RLS Policies
-- Version: v193
-- Description: Row Level Security policies for Configuration Management Strategy tables
-- Date: 2026-01-20
-- ============================================================================
--
-- Purpose:
-- Implements Row Level Security policies for all Configuration Management Strategy tables
-- to ensure users can only access Configuration MS documents for projects they have access to.
--
-- Prerequisites:
-- - v192_configuration_management_strategy_tables.sql must be run first
-- - RLS must be enabled on the tables
--
-- ============================================================================
-- SECTION 1: GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON configuration_management_strategies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cfg_item_types TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cfg_identification_methods TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cfg_version_control_procedures TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cfg_status_definitions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cfg_baseline_procedures TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cfg_audit_procedures TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cfg_tools_technologies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cfg_records_requirements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cfg_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cfg_scheduled_activities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cfg_roles_responsibilities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cfg_revision_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cfg_approvals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cfg_distribution TO authenticated;

-- ============================================================================
-- SECTION 2: ENABLE RLS ON NEW TABLES
-- ============================================================================

ALTER TABLE configuration_management_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE cfg_item_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE cfg_identification_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE cfg_version_control_procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE cfg_status_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cfg_baseline_procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE cfg_audit_procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE cfg_tools_technologies ENABLE ROW LEVEL SECURITY;
ALTER TABLE cfg_records_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE cfg_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE cfg_scheduled_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE cfg_roles_responsibilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE cfg_revision_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE cfg_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE cfg_distribution ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 3: HELPER FUNCTION
-- ============================================================================

-- Helper function to check Configuration MS access
CREATE OR REPLACE FUNCTION check_cfg_ms_access(p_cfg_ms_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_has_access BOOLEAN := FALSE;
    v_project_id UUID;
BEGIN
    -- Get project_id from Configuration MS
    SELECT project_id INTO v_project_id
    FROM configuration_management_strategies
    WHERE id = p_cfg_ms_id AND is_deleted = FALSE;
    
    IF v_project_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if user has access through project membership
    SELECT EXISTS (
        SELECT 1 FROM project_memberships pm
        JOIN users u ON u.id = pm.user_id
        WHERE u.auth_user_id = auth.uid()
          AND pm.project_id = v_project_id
          AND pm.is_active = TRUE
    ) INTO v_has_access;
    
    -- Also check if user is PMO Admin
    IF NOT v_has_access THEN
        SELECT EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            JOIN users u ON u.id = ur.user_id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name IN ('PMO Admin', 'System Admin')
              AND ur.is_active = TRUE
        ) INTO v_has_access;
    END IF;
    
    RETURN v_has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_cfg_ms_access(UUID) IS 'Checks if user has access to a Configuration Management Strategy document';

-- ============================================================================
-- SECTION 4: RLS POLICIES FOR configuration_management_strategies
-- ============================================================================

-- Policy: Users can view Configuration MS for projects they're members of
DROP POLICY IF EXISTS cfg_ms_select_policy ON configuration_management_strategies;
CREATE POLICY cfg_ms_select_policy
    ON configuration_management_strategies FOR SELECT
    TO authenticated
    USING (
        is_deleted = FALSE AND
        (
            -- Check if user has access through project membership
            EXISTS (
                SELECT 1 FROM project_memberships pm
                JOIN users u ON u.id = pm.user_id
                WHERE u.auth_user_id = auth.uid()
                  AND pm.project_id = configuration_management_strategies.project_id
                  AND pm.is_active = TRUE
            )
            OR
            -- PMO Admins can view all
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN users u ON u.id = ur.user_id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name IN ('PMO Admin', 'System Admin')
                  AND ur.is_active = TRUE
            )
        )
    );

-- Policy: Users can insert Configuration MS for projects they have edit access to
DROP POLICY IF EXISTS cfg_ms_insert_policy ON configuration_management_strategies;
CREATE POLICY cfg_ms_insert_policy
    ON configuration_management_strategies FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND (
            EXISTS (
                SELECT 1 FROM project_memberships pm
                JOIN users u ON u.id = pm.user_id
                JOIN project_roles pr ON pr.id = pm.project_role_id
                WHERE u.auth_user_id = auth.uid()
                  AND pm.project_id = configuration_management_strategies.project_id
                  AND pm.is_active = TRUE
                  AND pr.role_name IN ('Project Manager', 'Programme Manager')
                  AND pr.is_active = TRUE
            )
            OR
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN users u ON u.id = ur.user_id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name IN ('PMO Admin', 'System Admin')
                  AND ur.is_active = TRUE
            )
        )
    );

-- Policy: Users can update Configuration MS they created or have edit access (only drafts/under_review)
DROP POLICY IF EXISTS cfg_ms_update_policy ON configuration_management_strategies;
CREATE POLICY cfg_ms_update_policy
    ON configuration_management_strategies FOR UPDATE
    TO authenticated
    USING (
        is_deleted = FALSE AND
        status IN ('draft', 'under_review')
        AND (
            created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
            OR
            EXISTS (
                SELECT 1 FROM project_memberships pm
                JOIN users u ON u.id = pm.user_id
                JOIN project_roles pr ON pr.id = pm.project_role_id
                WHERE u.auth_user_id = auth.uid()
                  AND pm.project_id = configuration_management_strategies.project_id
                  AND pm.is_active = TRUE
                  AND pr.role_name IN ('Project Manager', 'Programme Manager')
                  AND pr.is_active = TRUE
            )
            OR
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN users u ON u.id = ur.user_id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name IN ('PMO Admin', 'System Admin')
                  AND ur.is_active = TRUE
            )
        )
    );

-- Policy: Users can delete (soft delete) Configuration MS they created or have admin access (only drafts)
DROP POLICY IF EXISTS cfg_ms_delete_policy ON configuration_management_strategies;
CREATE POLICY cfg_ms_delete_policy
    ON configuration_management_strategies FOR DELETE
    TO authenticated
    USING (
        status = 'draft'
        AND (
            created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
            OR
            EXISTS (
                SELECT 1 FROM project_memberships pm
                JOIN users u ON u.id = pm.user_id
                JOIN project_roles pr ON pr.id = pm.project_role_id
                WHERE u.auth_user_id = auth.uid()
                  AND pm.project_id = configuration_management_strategies.project_id
                  AND pm.is_active = TRUE
                  AND pr.role_name = 'Project Manager'
                  AND pr.is_active = TRUE
            )
            OR
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN users u ON u.id = ur.user_id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name IN ('PMO Admin', 'System Admin')
                  AND ur.is_active = TRUE
            )
        )
    );

-- ============================================================================
-- SECTION 5: RLS POLICIES FOR CHILD TABLES
-- ============================================================================

-- Helper function to create child table policies
CREATE OR REPLACE FUNCTION create_cfg_ms_child_table_policies(p_table_name TEXT, p_fk_column TEXT DEFAULT 'cfg_ms_id')
RETURNS VOID AS $$
BEGIN
    -- SELECT Policy
    EXECUTE format('
        DROP POLICY IF EXISTS %I_select_policy ON %I;
        CREATE POLICY %I_select_policy
            ON %I FOR SELECT
            TO authenticated
            USING (
                check_cfg_ms_access(%I) = TRUE
            );
    ', p_table_name, p_table_name, p_table_name, p_table_name, p_fk_column);
    
    -- INSERT Policy
    EXECUTE format('
        DROP POLICY IF EXISTS %I_insert_policy ON %I;
        CREATE POLICY %I_insert_policy
            ON %I FOR INSERT
            TO authenticated
            WITH CHECK (
                check_cfg_ms_access(%I) = TRUE
            );
    ', p_table_name, p_table_name, p_table_name, p_table_name, p_fk_column);
    
    -- UPDATE Policy
    EXECUTE format('
        DROP POLICY IF EXISTS %I_update_policy ON %I;
        CREATE POLICY %I_update_policy
            ON %I FOR UPDATE
            TO authenticated
            USING (
                check_cfg_ms_access(%I) = TRUE
            )
            WITH CHECK (
                check_cfg_ms_access(%I) = TRUE
            );
    ', p_table_name, p_table_name, p_table_name, p_table_name, p_fk_column, p_fk_column);
    
    -- DELETE Policy
    EXECUTE format('
        DROP POLICY IF EXISTS %I_delete_policy ON %I;
        CREATE POLICY %I_delete_policy
            ON %I FOR DELETE
            TO authenticated
            USING (
                check_cfg_ms_access(%I) = TRUE
            );
    ', p_table_name, p_table_name, p_table_name, p_table_name, p_fk_column);
END;
$$ LANGUAGE plpgsql;

-- Create policies for all child tables
SELECT create_cfg_ms_child_table_policies('cfg_item_types');
SELECT create_cfg_ms_child_table_policies('cfg_identification_methods');
SELECT create_cfg_ms_child_table_policies('cfg_version_control_procedures');
SELECT create_cfg_ms_child_table_policies('cfg_status_definitions');
SELECT create_cfg_ms_child_table_policies('cfg_baseline_procedures');
SELECT create_cfg_ms_child_table_policies('cfg_audit_procedures');
SELECT create_cfg_ms_child_table_policies('cfg_tools_technologies');
SELECT create_cfg_ms_child_table_policies('cfg_records_requirements');
SELECT create_cfg_ms_child_table_policies('cfg_reports');
SELECT create_cfg_ms_child_table_policies('cfg_scheduled_activities');
SELECT create_cfg_ms_child_table_policies('cfg_roles_responsibilities');
SELECT create_cfg_ms_child_table_policies('cfg_revision_history');
SELECT create_cfg_ms_child_table_policies('cfg_approvals');
SELECT create_cfg_ms_child_table_policies('cfg_distribution');

-- Drop the helper function (no longer needed)
DROP FUNCTION IF EXISTS create_cfg_ms_child_table_policies(TEXT, TEXT);

-- ============================================================================
-- END OF v193_configuration_management_strategy_rls_policies.sql
-- ============================================================================
