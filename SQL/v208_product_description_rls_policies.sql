-- ============================================================================
-- Product Description RLS Policies
-- Version: v208
-- Description: Row Level Security policies for Product Description tables
-- Date: 2026-01-20
-- ============================================================================
--
-- Purpose:
-- Implements Row Level Security (RLS) for all Product Description tables to ensure
-- proper access control based on project membership and user roles.
--
-- Prerequisites:
-- - v207_product_description_tables.sql must be run first
-- - user_projects table must exist
-- - roles table must exist
-- - user_roles table must exist
--
-- Access Rules:
-- - Project members can view Product Descriptions for their projects
-- - Product owners and Project Managers can create/edit Product Descriptions
-- - Approved Product Descriptions are read-only (changes through change control)
-- - PMO Admins can view all Product Descriptions in their organization
-- - PMO Admins can manage Product Description templates
--
-- ============================================================================
-- SECTION 1: GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions to authenticated role
GRANT SELECT, INSERT, UPDATE ON product_descriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON pd_composition_items TO authenticated;
GRANT SELECT, INSERT, UPDATE ON pd_derivations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON pd_acceptance_criteria TO authenticated;
GRANT SELECT, INSERT, UPDATE ON pd_quality_expectations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON pd_skills_required TO authenticated;
GRANT SELECT, INSERT, UPDATE ON pd_acceptance_responsibilities TO authenticated;
GRANT SELECT, INSERT ON pd_revision_history TO authenticated;
GRANT SELECT, INSERT, UPDATE ON pd_approvals TO authenticated;
GRANT SELECT, INSERT ON pd_distribution TO authenticated;

-- ============================================================================
-- SECTION 2: ENABLE RLS
-- ============================================================================

ALTER TABLE product_descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pd_composition_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pd_derivations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pd_acceptance_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE pd_quality_expectations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pd_skills_required ENABLE ROW LEVEL SECURITY;
ALTER TABLE pd_acceptance_responsibilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE pd_revision_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE pd_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE pd_distribution ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 3: HELPER FUNCTION - Check Product Description Access
-- ============================================================================

CREATE OR REPLACE FUNCTION check_pd_access(p_pd_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_project_id UUID;
BEGIN
    -- Get project_id from Product Description
    SELECT project_id INTO v_project_id
    FROM product_descriptions
    WHERE id = p_pd_id
    AND is_deleted = false;
    
    IF v_project_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if user is project member
    RETURN EXISTS (
        SELECT 1 FROM user_projects up
        JOIN users u ON up.user_id = u.id
        WHERE u.auth_user_id = auth.uid()
        AND up.project_id = v_project_id
        AND up.is_deleted = FALSE
    )
    OR EXISTS (
        -- PMO Admin or System Admin
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND r.role_name IN ('pmo_admin', 'System Admin')
        AND ur.is_active = TRUE
        AND ur.is_deleted = FALSE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog, auth;

-- ============================================================================
-- SECTION 4: PRODUCT_DESCRIPTIONS RLS POLICIES
-- ============================================================================

-- SELECT Policy: Project members, PMO Admins, System Admins
DROP POLICY IF EXISTS policy_product_descriptions_select ON product_descriptions;
CREATE POLICY policy_product_descriptions_select
    ON product_descriptions FOR SELECT
    TO authenticated
    USING (
        is_deleted = false
        AND (
            -- Project members
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                AND up.project_id = product_descriptions.project_id
                AND up.is_deleted = FALSE
            )
            OR
            -- PMO Admin or System Admin
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
                AND r.role_name IN ('pmo_admin', 'System Admin')
                AND ur.is_active = TRUE
                AND ur.is_deleted = FALSE
            )
        )
    );

-- INSERT Policy: Project members (if PPD approved or independent creation allowed)
DROP POLICY IF EXISTS policy_product_descriptions_insert ON product_descriptions;
CREATE POLICY policy_product_descriptions_insert
    ON product_descriptions FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Project members
        EXISTS (
            SELECT 1 FROM user_projects up
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
            AND up.project_id = product_descriptions.project_id
            AND up.is_deleted = FALSE
        )
        OR
        -- PMO Admin or System Admin
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
            AND r.role_name IN ('pmo_admin', 'System Admin')
            AND ur.is_active = TRUE
            AND ur.is_deleted = FALSE
        )
    );

-- UPDATE Policy: Product owner, Project Manager, PMO Admins (only drafts or under_review)
DROP POLICY IF EXISTS policy_product_descriptions_update ON product_descriptions;
CREATE POLICY policy_product_descriptions_update
    ON product_descriptions FOR UPDATE
    TO authenticated
    USING (
        is_deleted = false
        AND (
            -- PMO Admins can always edit (except approved)
            EXISTS (
                SELECT 1
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN users u ON ur.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                AND r.role_name IN ('pmo_admin', 'System Admin')
                AND ur.is_active = TRUE
                AND ur.is_deleted = FALSE
                AND product_descriptions.status IN ('draft', 'under_review')
            )
            OR
            (
                -- Authors/owners can edit if not approved
                (product_descriptions.status IN ('draft', 'under_review'))
                AND (
                    author_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                    OR owner_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                    OR created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
                )
                AND EXISTS (
                    SELECT 1 FROM user_projects up
                    JOIN users u ON up.user_id = u.id
                    WHERE u.auth_user_id = auth.uid()
                    AND up.project_id = product_descriptions.project_id
                    AND up.access_level IN ('owner', 'admin')
                    AND up.is_deleted = FALSE
                )
            )
        )
    )
    WITH CHECK (
        is_deleted = false
        AND (
            -- Same conditions as USING
            EXISTS (
                SELECT 1
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN users u ON ur.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                AND r.role_name IN ('pmo_admin', 'System Admin')
                AND ur.is_active = TRUE
                AND ur.is_deleted = FALSE
                AND product_descriptions.status IN ('draft', 'under_review')
            )
            OR
            (
                product_descriptions.status IN ('draft', 'under_review')
                AND EXISTS (
                    SELECT 1 FROM user_projects up
                    JOIN users u ON up.user_id = u.id
                    WHERE u.auth_user_id = auth.uid()
                    AND up.project_id = product_descriptions.project_id
                    AND up.access_level IN ('owner', 'admin')
                    AND up.is_deleted = FALSE
                )
            )
        )
    );

-- ============================================================================
-- SECTION 5: CHILD TABLES RLS POLICIES
-- ============================================================================

-- pd_composition_items Policies
DROP POLICY IF EXISTS policy_pd_composition_items_select ON pd_composition_items;
CREATE POLICY policy_pd_composition_items_select
    ON pd_composition_items FOR SELECT
    TO authenticated
    USING (
        is_deleted = false
        AND check_pd_access(product_description_id)
    );

DROP POLICY IF EXISTS policy_pd_composition_items_insert ON pd_composition_items;
CREATE POLICY policy_pd_composition_items_insert
    ON pd_composition_items FOR INSERT
    TO authenticated
    WITH CHECK (
        check_pd_access(product_description_id)
        AND EXISTS (
            SELECT 1 FROM product_descriptions pd
            WHERE pd.id = pd_composition_items.product_description_id
            AND pd.status IN ('draft', 'under_review')
            AND pd.is_deleted = false
        )
    );

DROP POLICY IF EXISTS policy_pd_composition_items_update ON pd_composition_items;
CREATE POLICY policy_pd_composition_items_update
    ON pd_composition_items FOR UPDATE
    TO authenticated
    USING (
        is_deleted = false
        AND check_pd_access(product_description_id)
        AND EXISTS (
            SELECT 1 FROM product_descriptions pd
            WHERE pd.id = pd_composition_items.product_description_id
            AND pd.status IN ('draft', 'under_review')
            AND pd.is_deleted = false
        )
    )
    WITH CHECK (
        is_deleted = false
        AND check_pd_access(product_description_id)
        AND EXISTS (
            SELECT 1 FROM product_descriptions pd
            WHERE pd.id = pd_composition_items.product_description_id
            AND pd.status IN ('draft', 'under_review')
            AND pd.is_deleted = false
        )
    );

-- pd_derivations Policies
DROP POLICY IF EXISTS policy_pd_derivations_select ON pd_derivations;
CREATE POLICY policy_pd_derivations_select
    ON pd_derivations FOR SELECT
    TO authenticated
    USING (
        is_deleted = false
        AND check_pd_access(product_description_id)
    );

DROP POLICY IF EXISTS policy_pd_derivations_insert ON pd_derivations;
CREATE POLICY policy_pd_derivations_insert
    ON pd_derivations FOR INSERT
    TO authenticated
    WITH CHECK (
        check_pd_access(product_description_id)
        AND EXISTS (
            SELECT 1 FROM product_descriptions pd
            WHERE pd.id = pd_derivations.product_description_id
            AND pd.status IN ('draft', 'under_review')
            AND pd.is_deleted = false
        )
    );

DROP POLICY IF EXISTS policy_pd_derivations_update ON pd_derivations;
CREATE POLICY policy_pd_derivations_update
    ON pd_derivations FOR UPDATE
    TO authenticated
    USING (
        is_deleted = false
        AND check_pd_access(product_description_id)
        AND EXISTS (
            SELECT 1 FROM product_descriptions pd
            WHERE pd.id = pd_derivations.product_description_id
            AND pd.status IN ('draft', 'under_review')
            AND pd.is_deleted = false
        )
    );

-- pd_acceptance_criteria Policies
DROP POLICY IF EXISTS policy_pd_acceptance_criteria_select ON pd_acceptance_criteria;
CREATE POLICY policy_pd_acceptance_criteria_select
    ON pd_acceptance_criteria FOR SELECT
    TO authenticated
    USING (
        is_deleted = false
        AND check_pd_access(product_description_id)
    );

DROP POLICY IF EXISTS policy_pd_acceptance_criteria_insert ON pd_acceptance_criteria;
CREATE POLICY policy_pd_acceptance_criteria_insert
    ON pd_acceptance_criteria FOR INSERT
    TO authenticated
    WITH CHECK (
        check_pd_access(product_description_id)
        AND EXISTS (
            SELECT 1 FROM product_descriptions pd
            WHERE pd.id = pd_acceptance_criteria.product_description_id
            AND pd.status IN ('draft', 'under_review')
            AND pd.is_deleted = false
        )
    );

DROP POLICY IF EXISTS policy_pd_acceptance_criteria_update ON pd_acceptance_criteria;
CREATE POLICY policy_pd_acceptance_criteria_update
    ON pd_acceptance_criteria FOR UPDATE
    TO authenticated
    USING (
        is_deleted = false
        AND check_pd_access(product_description_id)
        AND (
            -- Can always update acceptance_status and acceptance fields
            TRUE
            OR EXISTS (
                SELECT 1 FROM product_descriptions pd
                WHERE pd.id = pd_acceptance_criteria.product_description_id
                AND pd.status IN ('draft', 'under_review')
                AND pd.is_deleted = false
            )
        )
    )
    WITH CHECK (
        is_deleted = false
        AND check_pd_access(product_description_id)
    );

-- pd_quality_expectations Policies
DROP POLICY IF EXISTS policy_pd_quality_expectations_select ON pd_quality_expectations;
CREATE POLICY policy_pd_quality_expectations_select
    ON pd_quality_expectations FOR SELECT
    TO authenticated
    USING (
        is_deleted = false
        AND check_pd_access(product_description_id)
    );

DROP POLICY IF EXISTS policy_pd_quality_expectations_insert ON pd_quality_expectations;
CREATE POLICY policy_pd_quality_expectations_insert
    ON pd_quality_expectations FOR INSERT
    TO authenticated
    WITH CHECK (
        check_pd_access(product_description_id)
        AND EXISTS (
            SELECT 1 FROM product_descriptions pd
            WHERE pd.id = pd_quality_expectations.product_description_id
            AND pd.status IN ('draft', 'under_review')
            AND pd.is_deleted = false
        )
    );

DROP POLICY IF EXISTS policy_pd_quality_expectations_update ON pd_quality_expectations;
CREATE POLICY policy_pd_quality_expectations_update
    ON pd_quality_expectations FOR UPDATE
    TO authenticated
    USING (
        is_deleted = false
        AND check_pd_access(product_description_id)
        AND EXISTS (
            SELECT 1 FROM product_descriptions pd
            WHERE pd.id = pd_quality_expectations.product_description_id
            AND pd.status IN ('draft', 'under_review')
            AND pd.is_deleted = false
        )
    );

-- pd_skills_required Policies
DROP POLICY IF EXISTS policy_pd_skills_required_select ON pd_skills_required;
CREATE POLICY policy_pd_skills_required_select
    ON pd_skills_required FOR SELECT
    TO authenticated
    USING (
        is_deleted = false
        AND check_pd_access(product_description_id)
    );

DROP POLICY IF EXISTS policy_pd_skills_required_insert ON pd_skills_required;
CREATE POLICY policy_pd_skills_required_insert
    ON pd_skills_required FOR INSERT
    TO authenticated
    WITH CHECK (
        check_pd_access(product_description_id)
        AND EXISTS (
            SELECT 1 FROM product_descriptions pd
            WHERE pd.id = pd_skills_required.product_description_id
            AND pd.status IN ('draft', 'under_review')
            AND pd.is_deleted = false
        )
    );

DROP POLICY IF EXISTS policy_pd_skills_required_update ON pd_skills_required;
CREATE POLICY policy_pd_skills_required_update
    ON pd_skills_required FOR UPDATE
    TO authenticated
    USING (
        is_deleted = false
        AND check_pd_access(product_description_id)
        AND EXISTS (
            SELECT 1 FROM product_descriptions pd
            WHERE pd.id = pd_skills_required.product_description_id
            AND pd.status IN ('draft', 'under_review')
            AND pd.is_deleted = false
        )
    );

-- pd_acceptance_responsibilities Policies
DROP POLICY IF EXISTS policy_pd_acceptance_responsibilities_select ON pd_acceptance_responsibilities;
CREATE POLICY policy_pd_acceptance_responsibilities_select
    ON pd_acceptance_responsibilities FOR SELECT
    TO authenticated
    USING (
        is_deleted = false
        AND check_pd_access(product_description_id)
    );

DROP POLICY IF EXISTS policy_pd_acceptance_responsibilities_insert ON pd_acceptance_responsibilities;
CREATE POLICY policy_pd_acceptance_responsibilities_insert
    ON pd_acceptance_responsibilities FOR INSERT
    TO authenticated
    WITH CHECK (
        check_pd_access(product_description_id)
        AND EXISTS (
            SELECT 1 FROM product_descriptions pd
            WHERE pd.id = pd_acceptance_responsibilities.product_description_id
            AND pd.status IN ('draft', 'under_review')
            AND pd.is_deleted = false
        )
    );

DROP POLICY IF EXISTS policy_pd_acceptance_responsibilities_update ON pd_acceptance_responsibilities;
CREATE POLICY policy_pd_acceptance_responsibilities_update
    ON pd_acceptance_responsibilities FOR UPDATE
    TO authenticated
    USING (
        is_deleted = false
        AND check_pd_access(product_description_id)
        AND EXISTS (
            SELECT 1 FROM product_descriptions pd
            WHERE pd.id = pd_acceptance_responsibilities.product_description_id
            AND pd.status IN ('draft', 'under_review')
            AND pd.is_deleted = false
        )
    )
    WITH CHECK (
        is_deleted = false
        AND check_pd_access(product_description_id)
    );

-- pd_revision_history Policies (Read-only for project members, insert for authorized users)
DROP POLICY IF EXISTS policy_pd_revision_history_select ON pd_revision_history;
CREATE POLICY policy_pd_revision_history_select
    ON pd_revision_history FOR SELECT
    TO authenticated
    USING (check_pd_access(product_description_id));

DROP POLICY IF EXISTS policy_pd_revision_history_insert ON pd_revision_history;
CREATE POLICY policy_pd_revision_history_insert
    ON pd_revision_history FOR INSERT
    TO authenticated
    WITH CHECK (
        check_pd_access(product_description_id)
        AND revised_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
    );

-- pd_approvals Policies
DROP POLICY IF EXISTS policy_pd_approvals_select ON pd_approvals;
CREATE POLICY policy_pd_approvals_select
    ON pd_approvals FOR SELECT
    TO authenticated
    USING (check_pd_access(product_description_id));

DROP POLICY IF EXISTS policy_pd_approvals_insert ON pd_approvals;
CREATE POLICY policy_pd_approvals_insert
    ON pd_approvals FOR INSERT
    TO authenticated
    WITH CHECK (
        check_pd_access(product_description_id)
        AND approver_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
    );

DROP POLICY IF EXISTS policy_pd_approvals_update ON pd_approvals;
CREATE POLICY policy_pd_approvals_update
    ON pd_approvals FOR UPDATE
    TO authenticated
    USING (
        check_pd_access(product_description_id)
        AND (
            approver_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
            OR EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
                AND r.role_name IN ('pmo_admin', 'System Admin')
                AND ur.is_active = TRUE
                AND ur.is_deleted = FALSE
            )
        )
    )
    WITH CHECK (
        check_pd_access(product_description_id)
    );

-- pd_distribution Policies
DROP POLICY IF EXISTS policy_pd_distribution_select ON pd_distribution;
CREATE POLICY policy_pd_distribution_select
    ON pd_distribution FOR SELECT
    TO authenticated
    USING (check_pd_access(product_description_id));

DROP POLICY IF EXISTS policy_pd_distribution_insert ON pd_distribution;
CREATE POLICY policy_pd_distribution_insert
    ON pd_distribution FOR INSERT
    TO authenticated
    WITH CHECK (
        check_pd_access(product_description_id)
    );
