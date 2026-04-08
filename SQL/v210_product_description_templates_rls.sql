-- ============================================================================
-- Product Description Templates RLS Policies
-- Version: v210
-- Description: Row Level Security policies for Product Description templates
-- Date: 2026-01-20
-- ============================================================================
--
-- Purpose:
-- Implements Row Level Security for Product Description organization templates.
-- PMO Admins can manage templates for their organization.
-- Project members can view and use templates from their organization.
--
-- Prerequisites:
-- - v209_product_description_templates.sql must be run first
-- - RLS must be enabled on all template tables
--
-- ============================================================================
-- SECTION 1: ENABLE RLS (only if tables exist)
-- ============================================================================

-- Enable RLS on template tables if they exist
DO $$
BEGIN
    -- pd_organization_templates
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pd_organization_templates') THEN
        ALTER TABLE pd_organization_templates ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- pd_template_acceptance_criteria
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pd_template_acceptance_criteria') THEN
        ALTER TABLE pd_template_acceptance_criteria ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- pd_template_quality_expectations
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pd_template_quality_expectations') THEN
        ALTER TABLE pd_template_quality_expectations ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- pd_template_skills
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pd_template_skills') THEN
        ALTER TABLE pd_template_skills ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- pd_template_derivations
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pd_template_derivations') THEN
        ALTER TABLE pd_template_derivations ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- pd_template_composition_items
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pd_template_composition_items') THEN
        ALTER TABLE pd_template_composition_items ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- pd_template_acceptance_responsibilities
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pd_template_acceptance_responsibilities') THEN
        ALTER TABLE pd_template_acceptance_responsibilities ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- ============================================================================
-- SECTION 2: HELPER FUNCTION
-- ============================================================================

-- Function: Check if user has access to template (organization member or PMO Admin)
-- Only create if pd_organization_templates table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pd_organization_templates') THEN
        EXECUTE '
        CREATE OR REPLACE FUNCTION check_pd_template_access(p_template_id UUID)
        RETURNS BOOLEAN AS $func$
        DECLARE
            v_account_id UUID;
            v_user_id UUID;
            v_user_account_id UUID;
            v_is_pmo_admin BOOLEAN;
        BEGIN
            -- Get current user
            v_user_id := auth.uid();
            IF v_user_id IS NULL THEN
                RETURN false;
            END IF;
            
            -- Get user record
            SELECT account_id INTO v_user_account_id
            FROM users
            WHERE auth_user_id = v_user_id
              AND is_deleted = false;
            
            IF v_user_account_id IS NULL THEN
                RETURN false;
            END IF;
            
            -- Get template''s organization
            SELECT account_id INTO v_account_id
            FROM pd_organization_templates
            WHERE id = p_template_id
              AND is_deleted = false;
            
            IF v_account_id IS NULL THEN
                RETURN false;
            END IF;
            
            -- Check if user is in same organization
            IF v_user_account_id = v_account_id THEN
                -- Check if user is PMO Admin
                SELECT EXISTS (
                    SELECT 1 FROM user_roles ur
                    JOIN roles r ON ur.role_id = r.id
                    WHERE ur.user_id = (SELECT id FROM users WHERE auth_user_id = v_user_id AND is_deleted = false)
                      AND r.role_code = ''pmo_admin''
                      AND ur.is_active = true
                ) INTO v_is_pmo_admin;
                
                -- PMO Admins can do everything, regular users can view active templates
                RETURN true;
            END IF;
            
            -- Check if template is public
            SELECT EXISTS (
                SELECT 1 FROM pd_organization_templates
                WHERE id = p_template_id
                  AND is_public = true
                  AND is_active = true
                  AND is_deleted = false
            ) INTO v_is_pmo_admin;
            
            RETURN v_is_pmo_admin;
        END;
        $func$ LANGUAGE plpgsql SECURITY DEFINER;
        ';
    END IF;
END $$;

-- ============================================================================
-- SECTION 3: RLS POLICIES - pd_organization_templates (only if table exists)
-- ============================================================================

-- SELECT: Organization members can view active templates, PMO Admins can view all
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pd_organization_templates') THEN
        DROP POLICY IF EXISTS pd_templates_select ON pd_organization_templates;
        CREATE POLICY pd_templates_select ON pd_organization_templates
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM users u
                    WHERE u.auth_user_id = auth.uid()
                      AND u.is_deleted = false
                      AND (
                          -- Same organization
                          u.account_id = pd_organization_templates.account_id
                          OR
                          -- Public template
                          (pd_organization_templates.is_public = true AND pd_organization_templates.is_active = true)
                      )
                )
            );

        -- INSERT: Only PMO Admins in the organization
        DROP POLICY IF EXISTS pd_templates_insert ON pd_organization_templates;
        CREATE POLICY pd_templates_insert ON pd_organization_templates
            FOR INSERT
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM users u
                    JOIN user_roles ur ON ur.user_id = u.id
                    JOIN roles r ON ur.role_id = r.id
                    WHERE u.auth_user_id = auth.uid()
                      AND u.is_deleted = false
                      AND u.account_id = pd_organization_templates.account_id
                      AND r.role_code = 'pmo_admin'
                      AND ur.is_active = true
                )
            );

        -- UPDATE: Only PMO Admins in the organization
        DROP POLICY IF EXISTS pd_templates_update ON pd_organization_templates;
        CREATE POLICY pd_templates_update ON pd_organization_templates
            FOR UPDATE
            USING (
                EXISTS (
                    SELECT 1 FROM users u
                    JOIN user_roles ur ON ur.user_id = u.id
                    JOIN roles r ON ur.role_id = r.id
                    WHERE u.auth_user_id = auth.uid()
                      AND u.is_deleted = false
                      AND u.account_id = pd_organization_templates.account_id
                      AND r.role_code = 'pmo_admin'
                      AND ur.is_active = true
                )
            );

        -- DELETE: Only PMO Admins (soft delete)
        DROP POLICY IF EXISTS pd_templates_delete ON pd_organization_templates;
        CREATE POLICY pd_templates_delete ON pd_organization_templates
            FOR DELETE
            USING (
                EXISTS (
                    SELECT 1 FROM users u
                    JOIN user_roles ur ON ur.user_id = u.id
                    JOIN roles r ON ur.role_id = r.id
                    WHERE u.auth_user_id = auth.uid()
                      AND u.is_deleted = false
                      AND u.account_id = pd_organization_templates.account_id
                      AND r.role_code = 'pmo_admin'
                      AND ur.is_active = true
                )
            );
    END IF;
END $$;

-- ============================================================================
-- SECTION 4: RLS POLICIES - Child Tables (using template access)
-- ============================================================================

-- pd_template_acceptance_criteria
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pd_template_acceptance_criteria') THEN
        DROP POLICY IF EXISTS pd_template_criteria_select ON pd_template_acceptance_criteria;
        CREATE POLICY pd_template_criteria_select ON pd_template_acceptance_criteria
            FOR SELECT
            USING (check_pd_template_access(template_id));

        DROP POLICY IF EXISTS pd_template_criteria_insert ON pd_template_acceptance_criteria;
        CREATE POLICY pd_template_criteria_insert ON pd_template_acceptance_criteria
            FOR INSERT
            WITH CHECK (check_pd_template_access(template_id));

        DROP POLICY IF EXISTS pd_template_criteria_update ON pd_template_acceptance_criteria;
        CREATE POLICY pd_template_criteria_update ON pd_template_acceptance_criteria
            FOR UPDATE
            USING (check_pd_template_access(template_id));

        DROP POLICY IF EXISTS pd_template_criteria_delete ON pd_template_acceptance_criteria;
        CREATE POLICY pd_template_criteria_delete ON pd_template_acceptance_criteria
            FOR DELETE
            USING (check_pd_template_access(template_id));
    END IF;
END $$;

-- pd_template_quality_expectations
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pd_template_quality_expectations') THEN
        DROP POLICY IF EXISTS pd_template_quality_select ON pd_template_quality_expectations;
        CREATE POLICY pd_template_quality_select ON pd_template_quality_expectations
            FOR SELECT
            USING (check_pd_template_access(template_id));

        DROP POLICY IF EXISTS pd_template_quality_insert ON pd_template_quality_expectations;
        CREATE POLICY pd_template_quality_insert ON pd_template_quality_expectations
            FOR INSERT
            WITH CHECK (check_pd_template_access(template_id));

        DROP POLICY IF EXISTS pd_template_quality_update ON pd_template_quality_expectations;
        CREATE POLICY pd_template_quality_update ON pd_template_quality_expectations
            FOR UPDATE
            USING (check_pd_template_access(template_id));

        DROP POLICY IF EXISTS pd_template_quality_delete ON pd_template_quality_expectations;
        CREATE POLICY pd_template_quality_delete ON pd_template_quality_expectations
            FOR DELETE
            USING (check_pd_template_access(template_id));
    END IF;
END $$;

-- pd_template_skills
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pd_template_skills') THEN
        DROP POLICY IF EXISTS pd_template_skills_select ON pd_template_skills;
        CREATE POLICY pd_template_skills_select ON pd_template_skills
            FOR SELECT
            USING (check_pd_template_access(template_id));

        DROP POLICY IF EXISTS pd_template_skills_insert ON pd_template_skills;
        CREATE POLICY pd_template_skills_insert ON pd_template_skills
            FOR INSERT
            WITH CHECK (check_pd_template_access(template_id));

        DROP POLICY IF EXISTS pd_template_skills_update ON pd_template_skills;
        CREATE POLICY pd_template_skills_update ON pd_template_skills
            FOR UPDATE
            USING (check_pd_template_access(template_id));

        DROP POLICY IF EXISTS pd_template_skills_delete ON pd_template_skills;
        CREATE POLICY pd_template_skills_delete ON pd_template_skills
            FOR DELETE
            USING (check_pd_template_access(template_id));
    END IF;
END $$;

-- pd_template_derivations
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pd_template_derivations') THEN
        DROP POLICY IF EXISTS pd_template_derivations_select ON pd_template_derivations;
        CREATE POLICY pd_template_derivations_select ON pd_template_derivations
            FOR SELECT
            USING (check_pd_template_access(template_id));

        DROP POLICY IF EXISTS pd_template_derivations_insert ON pd_template_derivations;
        CREATE POLICY pd_template_derivations_insert ON pd_template_derivations
            FOR INSERT
            WITH CHECK (check_pd_template_access(template_id));

        DROP POLICY IF EXISTS pd_template_derivations_update ON pd_template_derivations;
        CREATE POLICY pd_template_derivations_update ON pd_template_derivations
            FOR UPDATE
            USING (check_pd_template_access(template_id));

        DROP POLICY IF EXISTS pd_template_derivations_delete ON pd_template_derivations;
        CREATE POLICY pd_template_derivations_delete ON pd_template_derivations
            FOR DELETE
            USING (check_pd_template_access(template_id));
    END IF;
END $$;

-- pd_template_composition_items
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pd_template_composition_items') THEN
        DROP POLICY IF EXISTS pd_template_composition_select ON pd_template_composition_items;
        CREATE POLICY pd_template_composition_select ON pd_template_composition_items
            FOR SELECT
            USING (check_pd_template_access(template_id));

        DROP POLICY IF EXISTS pd_template_composition_insert ON pd_template_composition_items;
        CREATE POLICY pd_template_composition_insert ON pd_template_composition_items
            FOR INSERT
            WITH CHECK (check_pd_template_access(template_id));

        DROP POLICY IF EXISTS pd_template_composition_update ON pd_template_composition_items;
        CREATE POLICY pd_template_composition_update ON pd_template_composition_items
            FOR UPDATE
            USING (check_pd_template_access(template_id));

        DROP POLICY IF EXISTS pd_template_composition_delete ON pd_template_composition_items;
        CREATE POLICY pd_template_composition_delete ON pd_template_composition_items
            FOR DELETE
            USING (check_pd_template_access(template_id));
    END IF;
END $$;

-- pd_template_acceptance_responsibilities
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pd_template_acceptance_responsibilities') THEN
        DROP POLICY IF EXISTS pd_template_responsibilities_select ON pd_template_acceptance_responsibilities;
        CREATE POLICY pd_template_responsibilities_select ON pd_template_acceptance_responsibilities
            FOR SELECT
            USING (check_pd_template_access(template_id));

        DROP POLICY IF EXISTS pd_template_responsibilities_insert ON pd_template_acceptance_responsibilities;
        CREATE POLICY pd_template_responsibilities_insert ON pd_template_acceptance_responsibilities
            FOR INSERT
            WITH CHECK (check_pd_template_access(template_id));

        DROP POLICY IF EXISTS pd_template_responsibilities_update ON pd_template_acceptance_responsibilities;
        CREATE POLICY pd_template_responsibilities_update ON pd_template_acceptance_responsibilities
            FOR UPDATE
            USING (check_pd_template_access(template_id));

        DROP POLICY IF EXISTS pd_template_responsibilities_delete ON pd_template_acceptance_responsibilities;
        CREATE POLICY pd_template_responsibilities_delete ON pd_template_acceptance_responsibilities
            FOR DELETE
            USING (check_pd_template_access(template_id));
    END IF;
END $$;

-- ============================================================================
-- COMPLETION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Product Description templates RLS policies created';
END $$;
