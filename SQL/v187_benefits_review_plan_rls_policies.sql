-- ============================================================================
-- Benefits Review Plan - RLS Policies
-- Version: v187
-- Description: Row Level Security policies for Benefits Review Plan tables
-- Date: 2026-01-20
-- ============================================================================
--
-- Purpose:
-- Implements Row Level Security policies for all Benefits Review Plan tables
-- to ensure users can only access review plans for projects they have access to.
--
-- Prerequisites:
-- - v186_benefits_review_plan_tables.sql must be run first
-- - RLS must be enabled on the tables
--
-- ============================================================================
-- SECTION 1: ENABLE RLS ON NEW TABLES
-- ============================================================================

ALTER TABLE benefits_review_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE benefits_review_plan_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE benefits_review_plan_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE benefits_review_plan_distribution ENABLE ROW LEVEL SECURITY;
ALTER TABLE benefits_review_plan_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE benefits_review_plan_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE dis_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE benefits_review_schedule ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 2: RLS POLICIES FOR benefits_review_plans
-- ============================================================================

-- Policy: Users can view review plans for projects they're members of
DROP POLICY IF EXISTS benefits_review_plans_select_policy ON benefits_review_plans;
CREATE POLICY benefits_review_plans_select_policy
    ON benefits_review_plans FOR SELECT
    TO authenticated
    USING (
        is_deleted = false AND
        (
            -- Check if user has access through project membership
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.is_deleted = false
                  AND up.project_id = benefits_review_plans.project_id
            )
            OR
            -- PMO Admins can view all
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN users u ON ur.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name IN ('pmo_admin', 'System Admin')
                  AND ur.is_active = true
                  AND ur.is_deleted = false
            )
        )
    );

-- Policy: Users can insert review plans for projects they have edit access to
DROP POLICY IF EXISTS benefits_review_plans_insert_policy ON benefits_review_plans;
CREATE POLICY benefits_review_plans_insert_policy
    ON benefits_review_plans FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND (
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.is_deleted = false
                  AND up.access_level IN ('owner', 'admin', 'member')
                  AND up.project_id = benefits_review_plans.project_id
            )
            OR
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN users u ON ur.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name IN ('pmo_admin', 'System Admin')
                  AND ur.is_active = true
                  AND ur.is_deleted = false
            )
        )
    );

-- Policy: Users can update review plans they created or have edit access
DROP POLICY IF EXISTS benefits_review_plans_update_policy ON benefits_review_plans;
CREATE POLICY benefits_review_plans_update_policy
    ON benefits_review_plans FOR UPDATE
    TO authenticated
    USING (
        is_deleted = false AND
        (
            created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
            OR
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.is_deleted = false
                  AND up.access_level IN ('owner', 'admin', 'member')
                  AND up.project_id = benefits_review_plans.project_id
            )
            OR
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN users u ON ur.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name IN ('pmo_admin', 'System Admin')
                  AND ur.is_active = true
                  AND ur.is_deleted = false
            )
        )
    );

-- Policy: Users can delete (soft delete) review plans they created or have admin access
DROP POLICY IF EXISTS benefits_review_plans_delete_policy ON benefits_review_plans;
CREATE POLICY benefits_review_plans_delete_policy
    ON benefits_review_plans FOR DELETE
    TO authenticated
    USING (
        (
            created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
            OR
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.is_deleted = false
                  AND up.access_level IN ('owner', 'admin')
                  AND up.project_id = benefits_review_plans.project_id
            )
            OR
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN users u ON ur.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name IN ('pmo_admin', 'System Admin')
                  AND ur.is_active = true
                  AND ur.is_deleted = false
            )
        )
    );

-- ============================================================================
-- SECTION 3: RLS POLICIES FOR benefits_review_plan_revisions
-- ============================================================================

-- Policy: Users can view revisions for review plans they can access
DROP POLICY IF EXISTS benefits_review_plan_revisions_select_policy ON benefits_review_plan_revisions;
CREATE POLICY benefits_review_plan_revisions_select_policy
    ON benefits_review_plan_revisions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM benefits_review_plans brp
            WHERE brp.id = benefits_review_plan_revisions.review_plan_id
              AND brp.is_deleted = false
              AND (
                  EXISTS (
                      SELECT 1 FROM user_projects up
                      JOIN users u ON up.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND up.is_deleted = false
                        AND up.project_id = brp.project_id
                  )
                  OR
                  EXISTS (
                      SELECT 1 FROM user_roles ur
                      JOIN roles r ON ur.role_id = r.id
                      JOIN users u ON ur.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND r.role_name IN ('pmo_admin', 'System Admin')
                        AND ur.is_active = true
                        AND ur.is_deleted = false
                  )
              )
        )
    );

-- Policy: Users can insert revisions for review plans they can edit
DROP POLICY IF EXISTS benefits_review_plan_revisions_insert_policy ON benefits_review_plan_revisions;
CREATE POLICY benefits_review_plan_revisions_insert_policy
    ON benefits_review_plan_revisions FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND
        EXISTS (
            SELECT 1 FROM benefits_review_plans brp
            WHERE brp.id = benefits_review_plan_revisions.review_plan_id
              AND brp.is_deleted = false
              AND (
                  EXISTS (
                      SELECT 1 FROM user_projects up
                      JOIN users u ON up.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND up.is_deleted = false
                        AND up.access_level IN ('owner', 'admin', 'member')
                        AND up.project_id = brp.project_id
                  )
                  OR
                  EXISTS (
                      SELECT 1 FROM user_roles ur
                      JOIN roles r ON ur.role_id = r.id
                      JOIN users u ON ur.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND r.role_name IN ('pmo_admin', 'System Admin')
                        AND ur.is_active = true
                        AND ur.is_deleted = false
                  )
              )
        )
    );

-- ============================================================================
-- SECTION 4: RLS POLICIES FOR benefits_review_plan_approvals
-- ============================================================================

-- Policy: Users can view approvals for review plans they can access, or their own approvals
DROP POLICY IF EXISTS benefits_review_plan_approvals_select_policy ON benefits_review_plan_approvals;
CREATE POLICY benefits_review_plan_approvals_select_policy
    ON benefits_review_plan_approvals FOR SELECT
    TO authenticated
    USING (
        -- User is the approver
        approver_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        OR
        -- User can access the review plan
        EXISTS (
            SELECT 1 FROM benefits_review_plans brp
            WHERE brp.id = benefits_review_plan_approvals.review_plan_id
              AND brp.is_deleted = false
              AND (
                  EXISTS (
                      SELECT 1 FROM user_projects up
                      JOIN users u ON up.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND up.is_deleted = false
                        AND up.project_id = brp.project_id
                  )
                  OR
                  EXISTS (
                      SELECT 1 FROM user_roles ur
                      JOIN roles r ON ur.role_id = r.id
                      JOIN users u ON ur.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND r.role_name IN ('pmo_admin', 'System Admin')
                        AND ur.is_active = true
                        AND ur.is_deleted = false
                  )
              )
        )
    );

-- Policy: Users can insert approvals if they can edit the review plan
DROP POLICY IF EXISTS benefits_review_plan_approvals_insert_policy ON benefits_review_plan_approvals;
CREATE POLICY benefits_review_plan_approvals_insert_policy
    ON benefits_review_plan_approvals FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND
        EXISTS (
            SELECT 1 FROM benefits_review_plans brp
            WHERE brp.id = benefits_review_plan_approvals.review_plan_id
              AND brp.is_deleted = false
              AND (
                  EXISTS (
                      SELECT 1 FROM user_projects up
                      JOIN users u ON up.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND up.is_deleted = false
                        AND up.access_level IN ('owner', 'admin', 'member')
                        AND up.project_id = brp.project_id
                  )
                  OR
                  EXISTS (
                      SELECT 1 FROM user_roles ur
                      JOIN roles r ON ur.role_id = r.id
                      JOIN users u ON ur.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND r.role_name IN ('pmo_admin', 'System Admin')
                        AND ur.is_active = true
                        AND ur.is_deleted = false
                  )
              )
        )
    );

-- Policy: Users can update approvals they are assigned to or if they can edit the plan
DROP POLICY IF EXISTS benefits_review_plan_approvals_update_policy ON benefits_review_plan_approvals;
CREATE POLICY benefits_review_plan_approvals_update_policy
    ON benefits_review_plan_approvals FOR UPDATE
    TO authenticated
    USING (
        -- User is the approver
        approver_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        OR
        -- User can edit the review plan
        EXISTS (
            SELECT 1 FROM benefits_review_plans brp
            WHERE brp.id = benefits_review_plan_approvals.review_plan_id
              AND brp.is_deleted = false
              AND (
                  EXISTS (
                      SELECT 1 FROM user_projects up
                      JOIN users u ON up.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND up.is_deleted = false
                        AND up.access_level IN ('owner', 'admin', 'member')
                        AND up.project_id = brp.project_id
                  )
                  OR
                  EXISTS (
                      SELECT 1 FROM user_roles ur
                      JOIN roles r ON ur.role_id = r.id
                      JOIN users u ON ur.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND r.role_name IN ('pmo_admin', 'System Admin')
                        AND ur.is_active = true
                        AND ur.is_deleted = false
                  )
              )
        )
    );

-- ============================================================================
-- SECTION 5: RLS POLICIES FOR benefits_review_plan_distribution
-- ============================================================================

-- Policy: Users can view distribution for review plans they can access, or where they are recipients
DROP POLICY IF EXISTS benefits_review_plan_distribution_select_policy ON benefits_review_plan_distribution;
CREATE POLICY benefits_review_plan_distribution_select_policy
    ON benefits_review_plan_distribution FOR SELECT
    TO authenticated
    USING (
        -- User is a recipient
        recipient_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        OR
        -- User can access the review plan
        EXISTS (
            SELECT 1 FROM benefits_review_plans brp
            WHERE brp.id = benefits_review_plan_distribution.review_plan_id
              AND brp.is_deleted = false
              AND (
                  EXISTS (
                      SELECT 1 FROM user_projects up
                      JOIN users u ON up.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND up.is_deleted = false
                        AND up.project_id = brp.project_id
                  )
                  OR
                  EXISTS (
                      SELECT 1 FROM user_roles ur
                      JOIN roles r ON ur.role_id = r.id
                      JOIN users u ON ur.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND r.role_name IN ('pmo_admin', 'System Admin')
                        AND ur.is_active = true
                        AND ur.is_deleted = false
                  )
              )
        )
    );

-- Policy: Users can insert distribution records if they can edit the review plan
DROP POLICY IF EXISTS benefits_review_plan_distribution_insert_policy ON benefits_review_plan_distribution;
CREATE POLICY benefits_review_plan_distribution_insert_policy
    ON benefits_review_plan_distribution FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND
        EXISTS (
            SELECT 1 FROM benefits_review_plans brp
            WHERE brp.id = benefits_review_plan_distribution.review_plan_id
              AND brp.is_deleted = false
              AND (
                  EXISTS (
                      SELECT 1 FROM user_projects up
                      JOIN users u ON up.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND up.is_deleted = false
                        AND up.access_level IN ('owner', 'admin', 'member')
                        AND up.project_id = brp.project_id
                  )
                  OR
                  EXISTS (
                      SELECT 1 FROM user_roles ur
                      JOIN roles r ON ur.role_id = r.id
                      JOIN users u ON ur.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND r.role_name IN ('pmo_admin', 'System Admin')
                        AND ur.is_active = true
                        AND ur.is_deleted = false
                  )
              )
        )
    );

-- Policy: Users can update distribution if they are recipients or can edit the plan
DROP POLICY IF EXISTS benefits_review_plan_distribution_update_policy ON benefits_review_plan_distribution;
CREATE POLICY benefits_review_plan_distribution_update_policy
    ON benefits_review_plan_distribution FOR UPDATE
    TO authenticated
    USING (
        -- User is the recipient (for acknowledgement)
        recipient_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        OR
        -- User can edit the review plan
        EXISTS (
            SELECT 1 FROM benefits_review_plans brp
            WHERE brp.id = benefits_review_plan_distribution.review_plan_id
              AND brp.is_deleted = false
              AND (
                  EXISTS (
                      SELECT 1 FROM user_projects up
                      JOIN users u ON up.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND up.is_deleted = false
                        AND up.access_level IN ('owner', 'admin', 'member')
                        AND up.project_id = brp.project_id
                  )
                  OR
                  EXISTS (
                      SELECT 1 FROM user_roles ur
                      JOIN roles r ON ur.role_id = r.id
                      JOIN users u ON ur.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND r.role_name IN ('pmo_admin', 'System Admin')
                        AND ur.is_active = true
                        AND ur.is_deleted = false
                  )
              )
        )
    );

-- ============================================================================
-- SECTION 6: RLS POLICIES FOR benefits_review_plan_benefits
-- ============================================================================

-- Policy: Users can view benefit coverage for review plans they can access
DROP POLICY IF EXISTS benefits_review_plan_benefits_select_policy ON benefits_review_plan_benefits;
CREATE POLICY benefits_review_plan_benefits_select_policy
    ON benefits_review_plan_benefits FOR SELECT
    TO authenticated
    USING (
        is_deleted = false AND
        EXISTS (
            SELECT 1 FROM benefits_review_plans brp
            WHERE brp.id = benefits_review_plan_benefits.review_plan_id
              AND brp.is_deleted = false
              AND (
                  EXISTS (
                      SELECT 1 FROM user_projects up
                      JOIN users u ON up.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND up.is_deleted = false
                        AND up.project_id = brp.project_id
                  )
                  OR
                  EXISTS (
                      SELECT 1 FROM user_roles ur
                      JOIN roles r ON ur.role_id = r.id
                      JOIN users u ON ur.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND r.role_name IN ('pmo_admin', 'System Admin')
                        AND ur.is_active = true
                        AND ur.is_deleted = false
                  )
              )
        )
    );

-- Policy: Users can insert benefit coverage if they can edit the review plan
DROP POLICY IF EXISTS benefits_review_plan_benefits_insert_policy ON benefits_review_plan_benefits;
CREATE POLICY benefits_review_plan_benefits_insert_policy
    ON benefits_review_plan_benefits FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND
        EXISTS (
            SELECT 1 FROM benefits_review_plans brp
            WHERE brp.id = benefits_review_plan_benefits.review_plan_id
              AND brp.is_deleted = false
              AND (
                  EXISTS (
                      SELECT 1 FROM user_projects up
                      JOIN users u ON up.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND up.is_deleted = false
                        AND up.access_level IN ('owner', 'admin', 'member')
                        AND up.project_id = brp.project_id
                  )
                  OR
                  EXISTS (
                      SELECT 1 FROM user_roles ur
                      JOIN roles r ON ur.role_id = r.id
                      JOIN users u ON ur.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND r.role_name IN ('pmo_admin', 'System Admin')
                        AND ur.is_active = true
                        AND ur.is_deleted = false
                  )
              )
        )
    );

-- Policy: Users can update benefit coverage if they can edit the review plan
DROP POLICY IF EXISTS benefits_review_plan_benefits_update_policy ON benefits_review_plan_benefits;
CREATE POLICY benefits_review_plan_benefits_update_policy
    ON benefits_review_plan_benefits FOR UPDATE
    TO authenticated
    USING (
        is_deleted = false AND
        EXISTS (
            SELECT 1 FROM benefits_review_plans brp
            WHERE brp.id = benefits_review_plan_benefits.review_plan_id
              AND brp.is_deleted = false
              AND (
                  EXISTS (
                      SELECT 1 FROM user_projects up
                      JOIN users u ON up.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND up.is_deleted = false
                        AND up.access_level IN ('owner', 'admin', 'member')
                        AND up.project_id = brp.project_id
                  )
                  OR
                  EXISTS (
                      SELECT 1 FROM user_roles ur
                      JOIN roles r ON ur.role_id = r.id
                      JOIN users u ON ur.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND r.role_name IN ('pmo_admin', 'System Admin')
                        AND ur.is_active = true
                        AND ur.is_deleted = false
                  )
              )
        )
    );

-- Policy: Users can delete benefit coverage if they can edit the review plan
DROP POLICY IF EXISTS benefits_review_plan_benefits_delete_policy ON benefits_review_plan_benefits;
CREATE POLICY benefits_review_plan_benefits_delete_policy
    ON benefits_review_plan_benefits FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM benefits_review_plans brp
            WHERE brp.id = benefits_review_plan_benefits.review_plan_id
              AND brp.is_deleted = false
              AND (
                  EXISTS (
                      SELECT 1 FROM user_projects up
                      JOIN users u ON up.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND up.is_deleted = false
                        AND up.access_level IN ('owner', 'admin')
                        AND up.project_id = brp.project_id
                  )
                  OR
                  EXISTS (
                      SELECT 1 FROM user_roles ur
                      JOIN roles r ON ur.role_id = r.id
                      JOIN users u ON ur.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND r.role_name IN ('pmo_admin', 'System Admin')
                        AND ur.is_active = true
                        AND ur.is_deleted = false
                  )
              )
        )
    );

-- ============================================================================
-- SECTION 7: RLS POLICIES FOR benefits_review_plan_resources
-- ============================================================================

-- Policy: Users can view resources for review plans they can access
DROP POLICY IF EXISTS benefits_review_plan_resources_select_policy ON benefits_review_plan_resources;
CREATE POLICY benefits_review_plan_resources_select_policy
    ON benefits_review_plan_resources FOR SELECT
    TO authenticated
    USING (
        is_deleted = false AND
        (
            -- User is assigned to the resource
            assigned_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
            OR
            -- User can access the review plan
            EXISTS (
                SELECT 1 FROM benefits_review_plans brp
                WHERE brp.id = benefits_review_plan_resources.review_plan_id
                  AND brp.is_deleted = false
                  AND (
                      EXISTS (
                          SELECT 1 FROM user_projects up
                          JOIN users u ON up.user_id = u.id
                          WHERE u.auth_user_id = auth.uid()
                            AND up.is_deleted = false
                            AND up.project_id = brp.project_id
                      )
                      OR
                      EXISTS (
                          SELECT 1 FROM user_roles ur
                          JOIN roles r ON ur.role_id = r.id
                          JOIN users u ON ur.user_id = u.id
                          WHERE u.auth_user_id = auth.uid()
                            AND r.role_name IN ('pmo_admin', 'System Admin')
                            AND ur.is_active = true
                            AND ur.is_deleted = false
                      )
                  )
            )
        )
    );

-- Policy: Users can insert resources if they can edit the review plan
DROP POLICY IF EXISTS benefits_review_plan_resources_insert_policy ON benefits_review_plan_resources;
CREATE POLICY benefits_review_plan_resources_insert_policy
    ON benefits_review_plan_resources FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND
        EXISTS (
            SELECT 1 FROM benefits_review_plans brp
            WHERE brp.id = benefits_review_plan_resources.review_plan_id
              AND brp.is_deleted = false
              AND (
                  EXISTS (
                      SELECT 1 FROM user_projects up
                      JOIN users u ON up.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND up.is_deleted = false
                        AND up.access_level IN ('owner', 'admin', 'member')
                        AND up.project_id = brp.project_id
                  )
                  OR
                  EXISTS (
                      SELECT 1 FROM user_roles ur
                      JOIN roles r ON ur.role_id = r.id
                      JOIN users u ON ur.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND r.role_name IN ('pmo_admin', 'System Admin')
                        AND ur.is_active = true
                        AND ur.is_deleted = false
                  )
              )
        )
    );

-- Policy: Users can update resources if they are assigned or can edit the plan
DROP POLICY IF EXISTS benefits_review_plan_resources_update_policy ON benefits_review_plan_resources;
CREATE POLICY benefits_review_plan_resources_update_policy
    ON benefits_review_plan_resources FOR UPDATE
    TO authenticated
    USING (
        is_deleted = false AND
        (
            -- User is assigned to the resource
            assigned_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
            OR
            -- User can edit the review plan
            EXISTS (
                SELECT 1 FROM benefits_review_plans brp
                WHERE brp.id = benefits_review_plan_resources.review_plan_id
                  AND brp.is_deleted = false
                  AND (
                      EXISTS (
                          SELECT 1 FROM user_projects up
                          JOIN users u ON up.user_id = u.id
                          WHERE u.auth_user_id = auth.uid()
                            AND up.is_deleted = false
                            AND up.access_level IN ('owner', 'admin', 'member')
                            AND up.project_id = brp.project_id
                      )
                      OR
                      EXISTS (
                          SELECT 1 FROM user_roles ur
                          JOIN roles r ON ur.role_id = r.id
                          JOIN users u ON ur.user_id = u.id
                          WHERE u.auth_user_id = auth.uid()
                            AND r.role_name IN ('pmo_admin', 'System Admin')
                            AND ur.is_active = true
                            AND ur.is_deleted = false
                      )
                  )
            )
        )
    );

-- Policy: Users can delete resources if they can edit the review plan
DROP POLICY IF EXISTS benefits_review_plan_resources_delete_policy ON benefits_review_plan_resources;
CREATE POLICY benefits_review_plan_resources_delete_policy
    ON benefits_review_plan_resources FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM benefits_review_plans brp
            WHERE brp.id = benefits_review_plan_resources.review_plan_id
              AND brp.is_deleted = false
              AND (
                  EXISTS (
                      SELECT 1 FROM user_projects up
                      JOIN users u ON up.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND up.is_deleted = false
                        AND up.access_level IN ('owner', 'admin')
                        AND up.project_id = brp.project_id
                  )
                  OR
                  EXISTS (
                      SELECT 1 FROM user_roles ur
                      JOIN roles r ON ur.role_id = r.id
                      JOIN users u ON ur.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND r.role_name IN ('pmo_admin', 'System Admin')
                        AND ur.is_active = true
                        AND ur.is_deleted = false
                  )
              )
        )
    );

-- ============================================================================
-- SECTION 8: RLS POLICIES FOR dis_benefits
-- ============================================================================

-- Policy: Users can view dis-benefits for projects they can access
DROP POLICY IF EXISTS dis_benefits_select_policy ON dis_benefits;
CREATE POLICY dis_benefits_select_policy
    ON dis_benefits FOR SELECT
    TO authenticated
    USING (
        is_deleted = false AND
        (
            -- User is the mitigation owner
            mitigation_owner_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
            OR
            -- User can access the project
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.is_deleted = false
                  AND up.project_id = dis_benefits.project_id
            )
            OR
            -- PMO Admins can view all
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN users u ON ur.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name IN ('pmo_admin', 'System Admin')
                  AND ur.is_active = true
                  AND ur.is_deleted = false
            )
        )
    );

-- Policy: Users can insert dis-benefits for projects they can edit
DROP POLICY IF EXISTS dis_benefits_insert_policy ON dis_benefits;
CREATE POLICY dis_benefits_insert_policy
    ON dis_benefits FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND (
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.is_deleted = false
                  AND up.access_level IN ('owner', 'admin', 'member')
                  AND up.project_id = dis_benefits.project_id
            )
            OR
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN users u ON ur.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name IN ('pmo_admin', 'System Admin')
                  AND ur.is_active = true
                  AND ur.is_deleted = false
            )
        )
    );

-- Policy: Users can update dis-benefits if they are mitigation owner or can edit the project
DROP POLICY IF EXISTS dis_benefits_update_policy ON dis_benefits;
CREATE POLICY dis_benefits_update_policy
    ON dis_benefits FOR UPDATE
    TO authenticated
    USING (
        is_deleted = false AND
        (
            -- User is the mitigation owner
            mitigation_owner_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
            OR
            -- User can edit the project
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.is_deleted = false
                  AND up.access_level IN ('owner', 'admin', 'member')
                  AND up.project_id = dis_benefits.project_id
            )
            OR
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN users u ON ur.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name IN ('pmo_admin', 'System Admin')
                  AND ur.is_active = true
                  AND ur.is_deleted = false
            )
        )
    );

-- Policy: Users can delete dis-benefits if they can edit the project
DROP POLICY IF EXISTS dis_benefits_delete_policy ON dis_benefits;
CREATE POLICY dis_benefits_delete_policy
    ON dis_benefits FOR DELETE
    TO authenticated
    USING (
        (
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.is_deleted = false
                  AND up.access_level IN ('owner', 'admin')
                  AND up.project_id = dis_benefits.project_id
            )
            OR
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN users u ON ur.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name IN ('pmo_admin', 'System Admin')
                  AND ur.is_active = true
                  AND ur.is_deleted = false
            )
        )
    );

-- ============================================================================
-- SECTION 9: RLS POLICIES FOR benefits_review_schedule
-- ============================================================================

-- Policy: Users can view reviews for review plans they can access, or where they are reviewers
DROP POLICY IF EXISTS benefits_review_schedule_select_policy ON benefits_review_schedule;
CREATE POLICY benefits_review_schedule_select_policy
    ON benefits_review_schedule FOR SELECT
    TO authenticated
    USING (
        is_deleted = false AND
        (
            -- User is the reviewer
            reviewer_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
            OR
            -- User is in attendees array (if attendees column supports this check)
            -- Note: Direct array membership check in RLS may require function
            -- For now, we'll rely on review plan access
            EXISTS (
                SELECT 1 FROM benefits_review_plans brp
                WHERE brp.id = benefits_review_schedule.review_plan_id
                  AND brp.is_deleted = false
                  AND (
                      EXISTS (
                          SELECT 1 FROM user_projects up
                          JOIN users u ON up.user_id = u.id
                          WHERE u.auth_user_id = auth.uid()
                            AND up.is_deleted = false
                            AND up.project_id = brp.project_id
                      )
                      OR
                      EXISTS (
                          SELECT 1 FROM user_roles ur
                          JOIN roles r ON ur.role_id = r.id
                          JOIN users u ON ur.user_id = u.id
                          WHERE u.auth_user_id = auth.uid()
                            AND r.role_name IN ('pmo_admin', 'System Admin')
                            AND ur.is_active = true
                            AND ur.is_deleted = false
                      )
                  )
            )
        )
    );

-- Policy: Users can insert reviews if they can edit the review plan
DROP POLICY IF EXISTS benefits_review_schedule_insert_policy ON benefits_review_schedule;
CREATE POLICY benefits_review_schedule_insert_policy
    ON benefits_review_schedule FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND
        EXISTS (
            SELECT 1 FROM benefits_review_plans brp
            WHERE brp.id = benefits_review_schedule.review_plan_id
              AND brp.is_deleted = false
              AND (
                  EXISTS (
                      SELECT 1 FROM user_projects up
                      JOIN users u ON up.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND up.is_deleted = false
                        AND up.access_level IN ('owner', 'admin', 'member')
                        AND up.project_id = brp.project_id
                  )
                  OR
                  EXISTS (
                      SELECT 1 FROM user_roles ur
                      JOIN roles r ON ur.role_id = r.id
                      JOIN users u ON ur.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND r.role_name IN ('pmo_admin', 'System Admin')
                        AND ur.is_active = true
                        AND ur.is_deleted = false
                  )
              )
        )
    );

-- Policy: Users can update reviews if they are reviewers or can edit the plan
DROP POLICY IF EXISTS benefits_review_schedule_update_policy ON benefits_review_schedule;
CREATE POLICY benefits_review_schedule_update_policy
    ON benefits_review_schedule FOR UPDATE
    TO authenticated
    USING (
        is_deleted = false AND
        (
            -- User is the reviewer
            reviewer_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
            OR
            -- User can edit the review plan
            EXISTS (
                SELECT 1 FROM benefits_review_plans brp
                WHERE brp.id = benefits_review_schedule.review_plan_id
                  AND brp.is_deleted = false
                  AND (
                      EXISTS (
                          SELECT 1 FROM user_projects up
                          JOIN users u ON up.user_id = u.id
                          WHERE u.auth_user_id = auth.uid()
                            AND up.is_deleted = false
                            AND up.access_level IN ('owner', 'admin', 'member')
                            AND up.project_id = brp.project_id
                      )
                      OR
                      EXISTS (
                          SELECT 1 FROM user_roles ur
                          JOIN roles r ON ur.role_id = r.id
                          JOIN users u ON ur.user_id = u.id
                          WHERE u.auth_user_id = auth.uid()
                            AND r.role_name IN ('pmo_admin', 'System Admin')
                            AND ur.is_active = true
                            AND ur.is_deleted = false
                      )
                  )
            )
        )
    );

-- Policy: Users can delete reviews if they can edit the review plan
DROP POLICY IF EXISTS benefits_review_schedule_delete_policy ON benefits_review_schedule;
CREATE POLICY benefits_review_schedule_delete_policy
    ON benefits_review_schedule FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM benefits_review_plans brp
            WHERE brp.id = benefits_review_schedule.review_plan_id
              AND brp.is_deleted = false
              AND (
                  EXISTS (
                      SELECT 1 FROM user_projects up
                      JOIN users u ON up.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND up.is_deleted = false
                        AND up.access_level IN ('owner', 'admin')
                        AND up.project_id = brp.project_id
                  )
                  OR
                  EXISTS (
                      SELECT 1 FROM user_roles ur
                      JOIN roles r ON ur.role_id = r.id
                      JOIN users u ON ur.user_id = u.id
                      WHERE u.auth_user_id = auth.uid()
                        AND r.role_name IN ('pmo_admin', 'System Admin')
                        AND ur.is_active = true
                        AND ur.is_deleted = false
                  )
              )
        )
    );

-- ============================================================================
-- End of v187_benefits_review_plan_rls_policies.sql
-- ============================================================================
