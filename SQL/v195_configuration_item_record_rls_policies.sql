-- ============================================================================
-- Configuration Item Record - RLS Policies
-- Version: v195
-- Description: Row Level Security policies for Configuration Item Record tables
-- Date: 2026-01-20
-- ============================================================================
--
-- Purpose:
-- Implements Row Level Security policies for all Configuration Item Record tables
-- to ensure users can only access configuration items for projects they have access to.
--
-- Prerequisites:
-- - v194_configuration_item_record_tables.sql must be run first
-- - RLS must be enabled on the tables
--
-- ============================================================================
-- SECTION 1: GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON configuration_items TO authenticated;
GRANT SELECT, INSERT, UPDATE ON configuration_item_versions TO authenticated;
GRANT SELECT, INSERT ON configuration_item_status_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON configuration_baselines TO authenticated;
GRANT SELECT, INSERT, DELETE ON configuration_baseline_items TO authenticated;
GRANT SELECT, INSERT, DELETE ON configuration_item_relationships TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON configuration_item_audits TO authenticated;
GRANT SELECT, INSERT, UPDATE ON configuration_item_audit_items TO authenticated;

-- ============================================================================
-- SECTION 2: ENABLE RLS ON NEW TABLES
-- ============================================================================

ALTER TABLE configuration_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuration_item_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuration_item_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuration_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuration_baseline_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuration_item_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuration_item_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuration_item_audit_items ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 3: HELPER FUNCTIONS
-- ============================================================================

-- Helper function to check Configuration Item access
CREATE OR REPLACE FUNCTION check_ci_access(p_configuration_item_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_has_access BOOLEAN := FALSE;
    v_project_id UUID;
BEGIN
    -- Get project_id from Configuration Item
    SELECT project_id INTO v_project_id
    FROM configuration_items
    WHERE id = p_configuration_item_id AND is_deleted = FALSE;
    
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

COMMENT ON FUNCTION check_ci_access(UUID) IS 'Checks if user has access to a Configuration Item';

-- Helper function to check Baseline access
CREATE OR REPLACE FUNCTION check_baseline_access(p_baseline_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_has_access BOOLEAN := FALSE;
    v_project_id UUID;
BEGIN
    -- Get project_id from Baseline
    SELECT project_id INTO v_project_id
    FROM configuration_baselines
    WHERE id = p_baseline_id AND is_deleted = FALSE;
    
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

COMMENT ON FUNCTION check_baseline_access(UUID) IS 'Checks if user has access to a Baseline';

-- ============================================================================
-- SECTION 4: RLS POLICIES FOR configuration_items
-- ============================================================================

-- Policy: Users can view Configuration Items for projects they're members of
DROP POLICY IF EXISTS ci_select_policy ON configuration_items;
CREATE POLICY ci_select_policy
    ON configuration_items FOR SELECT
    TO authenticated
    USING (
        is_deleted = FALSE AND
        (
            EXISTS (
                SELECT 1 FROM project_memberships pm
                JOIN users u ON u.id = pm.user_id
                WHERE u.auth_user_id = auth.uid()
                  AND pm.project_id = configuration_items.project_id
                  AND pm.is_active = TRUE
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

-- Policy: Users can insert Configuration Items for projects they have edit access to
DROP POLICY IF EXISTS ci_insert_policy ON configuration_items;
CREATE POLICY ci_insert_policy
    ON configuration_items FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND (
            EXISTS (
                SELECT 1 FROM project_memberships pm
                JOIN users u ON u.id = pm.user_id
                WHERE u.auth_user_id = auth.uid()
                  AND pm.project_id = configuration_items.project_id
                  AND pm.is_active = TRUE
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

-- Policy: Users can update Configuration Items they created or have edit access
DROP POLICY IF EXISTS ci_update_policy ON configuration_items;
CREATE POLICY ci_update_policy
    ON configuration_items FOR UPDATE
    TO authenticated
    USING (
        is_deleted = FALSE
        AND (
            created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
            OR
            EXISTS (
                SELECT 1 FROM project_memberships pm
                JOIN users u ON u.id = pm.user_id
                JOIN project_roles pr ON pr.id = pm.project_role_id
                WHERE u.auth_user_id = auth.uid()
                  AND pm.project_id = configuration_items.project_id
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

-- Policy: Users can delete (soft delete) Configuration Items only if not in baseline
DROP POLICY IF EXISTS ci_delete_policy ON configuration_items;
CREATE POLICY ci_delete_policy
    ON configuration_items FOR DELETE
    TO authenticated
    USING (
        is_in_baseline = FALSE
        AND (
            created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
            OR
            EXISTS (
                SELECT 1 FROM project_memberships pm
                JOIN users u ON u.id = pm.user_id
                JOIN project_roles pr ON pr.id = pm.project_role_id
                WHERE u.auth_user_id = auth.uid()
                  AND pm.project_id = configuration_items.project_id
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
-- SECTION 5: RLS POLICIES FOR configuration_item_versions
-- ============================================================================

-- Policy: Users can view versions for Configuration Items they have access to
DROP POLICY IF EXISTS ci_version_select_policy ON configuration_item_versions;
CREATE POLICY ci_version_select_policy
    ON configuration_item_versions FOR SELECT
    TO authenticated
    USING (
        check_ci_access(configuration_item_id) = TRUE
    );

-- Policy: Users can insert versions for Configuration Items they have access to
DROP POLICY IF EXISTS ci_version_insert_policy ON configuration_item_versions;
CREATE POLICY ci_version_insert_policy
    ON configuration_item_versions FOR INSERT
    TO authenticated
    WITH CHECK (
        check_ci_access(configuration_item_id) = TRUE
    );

-- Policy: Users can update versions (limited - versions should be mostly immutable)
DROP POLICY IF EXISTS ci_version_update_policy ON configuration_item_versions;
CREATE POLICY ci_version_update_policy
    ON configuration_item_versions FOR UPDATE
    TO authenticated
    USING (
        check_ci_access(configuration_item_id) = TRUE
    )
    WITH CHECK (
        check_ci_access(configuration_item_id) = TRUE
    );

-- ============================================================================
-- SECTION 6: RLS POLICIES FOR configuration_item_status_history
-- ============================================================================

-- Policy: Users can view status history for Configuration Items they have access to
DROP POLICY IF EXISTS ci_status_history_select_policy ON configuration_item_status_history;
CREATE POLICY ci_status_history_select_policy
    ON configuration_item_status_history FOR SELECT
    TO authenticated
    USING (
        check_ci_access(configuration_item_id) = TRUE
    );

-- Policy: Users can insert status history entries
DROP POLICY IF EXISTS ci_status_history_insert_policy ON configuration_item_status_history;
CREATE POLICY ci_status_history_insert_policy
    ON configuration_item_status_history FOR INSERT
    TO authenticated
    WITH CHECK (
        check_ci_access(configuration_item_id) = TRUE
    );

-- ============================================================================
-- SECTION 7: RLS POLICIES FOR configuration_baselines
-- ============================================================================

-- Policy: Users can view baselines for projects they're members of
DROP POLICY IF EXISTS baseline_select_policy ON configuration_baselines;
CREATE POLICY baseline_select_policy
    ON configuration_baselines FOR SELECT
    TO authenticated
    USING (
        is_deleted = FALSE AND
        (
            EXISTS (
                SELECT 1 FROM project_memberships pm
                JOIN users u ON u.id = pm.user_id
                WHERE u.auth_user_id = auth.uid()
                  AND pm.project_id = configuration_baselines.project_id
                  AND pm.is_active = TRUE
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

-- Policy: Users can insert baselines for projects they have edit access to
DROP POLICY IF EXISTS baseline_insert_policy ON configuration_baselines;
CREATE POLICY baseline_insert_policy
    ON configuration_baselines FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND (
            EXISTS (
                SELECT 1 FROM project_memberships pm
                JOIN users u ON u.id = pm.user_id
                JOIN project_roles pr ON pr.id = pm.project_role_id
                WHERE u.auth_user_id = auth.uid()
                  AND pm.project_id = configuration_baselines.project_id
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

-- Policy: Users can update baselines they created or have edit access (only drafts)
DROP POLICY IF EXISTS baseline_update_policy ON configuration_baselines;
CREATE POLICY baseline_update_policy
    ON configuration_baselines FOR UPDATE
    TO authenticated
    USING (
        is_deleted = FALSE
        AND baseline_status = 'draft'
        AND (
            created_by_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
            OR
            EXISTS (
                SELECT 1 FROM project_memberships pm
                JOIN users u ON u.id = pm.user_id
                JOIN project_roles pr ON pr.id = pm.project_role_id
                WHERE u.auth_user_id = auth.uid()
                  AND pm.project_id = configuration_baselines.project_id
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

-- Policy: Users can delete (soft delete) only draft baselines
DROP POLICY IF EXISTS baseline_delete_policy ON configuration_baselines;
CREATE POLICY baseline_delete_policy
    ON configuration_baselines FOR DELETE
    TO authenticated
    USING (
        baseline_status = 'draft'
        AND (
            created_by_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
            OR
            EXISTS (
                SELECT 1 FROM project_memberships pm
                JOIN users u ON u.id = pm.user_id
                JOIN project_roles pr ON pr.id = pm.project_role_id
                WHERE u.auth_user_id = auth.uid()
                  AND pm.project_id = configuration_baselines.project_id
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
-- SECTION 8: RLS POLICIES FOR CHILD TABLES
-- ============================================================================

-- Helper function to create child table policies
CREATE OR REPLACE FUNCTION create_ci_child_table_policies(p_table_name TEXT, p_fk_column TEXT DEFAULT 'configuration_item_id')
RETURNS VOID AS $$
BEGIN
    -- SELECT Policy
    EXECUTE format('
        DROP POLICY IF EXISTS %I_select_policy ON %I;
        CREATE POLICY %I_select_policy
            ON %I FOR SELECT
            TO authenticated
            USING (
                check_ci_access(%I) = TRUE
            );
    ', p_table_name, p_table_name, p_table_name, p_table_name, p_fk_column);
    
    -- INSERT Policy
    EXECUTE format('
        DROP POLICY IF EXISTS %I_insert_policy ON %I;
        CREATE POLICY %I_insert_policy
            ON %I FOR INSERT
            TO authenticated
            WITH CHECK (
                check_ci_access(%I) = TRUE
            );
    ', p_table_name, p_table_name, p_table_name, p_table_name, p_fk_column);
    
    -- UPDATE Policy (if applicable)
    EXECUTE format('
        DROP POLICY IF EXISTS %I_update_policy ON %I;
        CREATE POLICY %I_update_policy
            ON %I FOR UPDATE
            TO authenticated
            USING (
                check_ci_access(%I) = TRUE
            )
            WITH CHECK (
                check_ci_access(%I) = TRUE
            );
    ', p_table_name, p_table_name, p_table_name, p_table_name, p_fk_column, p_fk_column);
    
    -- DELETE Policy
    EXECUTE format('
        DROP POLICY IF EXISTS %I_delete_policy ON %I;
        CREATE POLICY %I_delete_policy
            ON %I FOR DELETE
            TO authenticated
            USING (
                check_ci_access(%I) = TRUE
            );
    ', p_table_name, p_table_name, p_table_name, p_table_name, p_fk_column);
END;
$$ LANGUAGE plpgsql;

-- Helper function for baseline child table policies
CREATE OR REPLACE FUNCTION create_baseline_child_table_policies(p_table_name TEXT, p_fk_column TEXT DEFAULT 'baseline_id')
RETURNS VOID AS $$
BEGIN
    -- SELECT Policy
    EXECUTE format('
        DROP POLICY IF EXISTS %I_select_policy ON %I;
        CREATE POLICY %I_select_policy
            ON %I FOR SELECT
            TO authenticated
            USING (
                check_baseline_access(%I) = TRUE
            );
    ', p_table_name, p_table_name, p_table_name, p_table_name, p_fk_column);
    
    -- INSERT Policy
    EXECUTE format('
        DROP POLICY IF EXISTS %I_insert_policy ON %I;
        CREATE POLICY %I_insert_policy
            ON %I FOR INSERT
            TO authenticated
            WITH CHECK (
                check_baseline_access(%I) = TRUE
            );
    ', p_table_name, p_table_name, p_table_name, p_table_name, p_fk_column);
    
    -- DELETE Policy
    EXECUTE format('
        DROP POLICY IF EXISTS %I_delete_policy ON %I;
        CREATE POLICY %I_delete_policy
            ON %I FOR DELETE
            TO authenticated
            USING (
                check_baseline_access(%I) = TRUE
            );
    ', p_table_name, p_table_name, p_table_name, p_table_name, p_fk_column);
END;
$$ LANGUAGE plpgsql;

-- Create policies for baseline_items using baseline access
SELECT create_baseline_child_table_policies('configuration_baseline_items');

-- Create policies for relationships using CI access
SELECT create_ci_child_table_policies('configuration_item_relationships', 'parent_item_id');

-- Audit policies (use project-based access)
DROP POLICY IF EXISTS ci_audit_select_policy ON configuration_item_audits;
CREATE POLICY ci_audit_select_policy
    ON configuration_item_audits FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM project_memberships pm
            JOIN users u ON u.id = pm.user_id
            WHERE u.auth_user_id = auth.uid()
              AND pm.project_id = configuration_item_audits.project_id
              AND pm.is_active = TRUE
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
    );

DROP POLICY IF EXISTS ci_audit_insert_policy ON configuration_item_audits;
CREATE POLICY ci_audit_insert_policy
    ON configuration_item_audits FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND (
            EXISTS (
                SELECT 1 FROM project_memberships pm
                JOIN users u ON u.id = pm.user_id
                WHERE u.auth_user_id = auth.uid()
                  AND pm.project_id = configuration_item_audits.project_id
                  AND pm.is_active = TRUE
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

DROP POLICY IF EXISTS ci_audit_update_policy ON configuration_item_audits;
CREATE POLICY ci_audit_update_policy
    ON configuration_item_audits FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM project_memberships pm
            JOIN users u ON u.id = pm.user_id
            WHERE u.auth_user_id = auth.uid()
              AND pm.project_id = configuration_item_audits.project_id
              AND pm.is_active = TRUE
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
    );

-- Audit items policies (use audit access)
DROP POLICY IF EXISTS ci_audit_item_select_policy ON configuration_item_audit_items;
CREATE POLICY ci_audit_item_select_policy
    ON configuration_item_audit_items FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM configuration_item_audits a
            JOIN project_memberships pm ON pm.project_id = a.project_id
            JOIN users u ON u.id = pm.user_id
            WHERE a.id = configuration_item_audit_items.audit_id
              AND u.auth_user_id = auth.uid()
              AND pm.is_active = TRUE
        )
        OR
        EXISTS (
            SELECT 1 FROM configuration_item_audits a
            JOIN user_roles ur ON ur.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
            JOIN roles r ON r.id = ur.role_id
            WHERE a.id = configuration_item_audit_items.audit_id
              AND r.role_name IN ('PMO Admin', 'System Admin')
              AND ur.is_active = TRUE
        )
    );

DROP POLICY IF EXISTS ci_audit_item_insert_policy ON configuration_item_audit_items;
CREATE POLICY ci_audit_item_insert_policy
    ON configuration_item_audit_items FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM configuration_item_audits a
            JOIN project_memberships pm ON pm.project_id = a.project_id
            JOIN users u ON u.id = pm.user_id
            WHERE a.id = configuration_item_audit_items.audit_id
              AND u.auth_user_id = auth.uid()
              AND pm.is_active = TRUE
        )
    );

DROP POLICY IF EXISTS ci_audit_item_update_policy ON configuration_item_audit_items;
CREATE POLICY ci_audit_item_update_policy
    ON configuration_item_audit_items FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM configuration_item_audits a
            JOIN project_memberships pm ON pm.project_id = a.project_id
            JOIN users u ON u.id = pm.user_id
            WHERE a.id = configuration_item_audit_items.audit_id
              AND u.auth_user_id = auth.uid()
              AND pm.is_active = TRUE
        )
    );

-- Drop helper functions
DROP FUNCTION IF EXISTS create_ci_child_table_policies(TEXT, TEXT);
DROP FUNCTION IF EXISTS create_baseline_child_table_policies(TEXT, TEXT);

-- ============================================================================
-- END OF v195_configuration_item_record_rls_policies.sql
-- ============================================================================
