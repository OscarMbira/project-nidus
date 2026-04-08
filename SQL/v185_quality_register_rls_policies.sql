-- ============================================================================
-- Quality Register Activity Enhancement - RLS Policies
-- Version: v185
-- Description: Row Level Security policies for quality activity tables
-- Date: 2026-01-16
-- ============================================================================
--
-- Purpose:
-- Implements Row Level Security policies for the new quality activity tables
-- to ensure users can only access quality activities for projects they have
-- access to.
--
-- Prerequisites:
-- - v184_quality_register_enhancements.sql must be run first
-- - RLS must be enabled on the tables
--
-- ============================================================================
-- SECTION 1: ENABLE RLS ON NEW TABLES
-- ============================================================================

ALTER TABLE quality_activity_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_activity_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_inspection_participants ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 2: RLS POLICIES FOR quality_activity_records
-- ============================================================================

-- Policy: Users can view records for activities in projects they're members of
DROP POLICY IF EXISTS quality_activity_records_select_policy ON quality_activity_records;
CREATE POLICY quality_activity_records_select_policy
    ON quality_activity_records FOR SELECT
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
                  AND (
                    (activity_type = 'review' AND EXISTS (
                        SELECT 1 FROM quality_reviews qr
                        WHERE qr.id = quality_activity_records.activity_id
                          AND qr.project_id = up.project_id
                          AND qr.is_deleted = false
                    ))
                    OR
                    (activity_type = 'inspection' AND EXISTS (
                        SELECT 1 FROM quality_inspections qi
                        WHERE qi.id = quality_activity_records.activity_id
                          AND qi.project_id = up.project_id
                          AND qi.is_deleted = false
                    ))
                  )
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

-- Policy: Users can insert records for activities they have edit access to
DROP POLICY IF EXISTS quality_activity_records_insert_policy ON quality_activity_records;
CREATE POLICY quality_activity_records_insert_policy
    ON quality_activity_records FOR INSERT
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
                  AND (
                    (activity_type = 'review' AND EXISTS (
                        SELECT 1 FROM quality_reviews qr
                        WHERE qr.id = quality_activity_records.activity_id
                          AND qr.project_id = up.project_id
                          AND qr.is_deleted = false
                    ))
                    OR
                    (activity_type = 'inspection' AND EXISTS (
                        SELECT 1 FROM quality_inspections qi
                        WHERE qi.id = quality_activity_records.activity_id
                          AND qi.project_id = up.project_id
                          AND qi.is_deleted = false
                    ))
                  )
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

-- Policy: Users can update records they created or have edit access
CREATE POLICY quality_activity_records_update_policy ON quality_activity_records
    FOR UPDATE
    USING (
        is_deleted = false AND
        (
            created_by = auth.uid()
            OR
            EXISTS (
                SELECT 1 FROM project_memberships pm
                JOIN projects p ON pm.project_id = p.id
                JOIN users u ON u.id = pm.user_id
                JOIN project_roles pr ON pr.id = pm.project_role_id
                WHERE u.auth_user_id = auth.uid()
                  AND pm.is_active = TRUE
                  AND pr.role_name IN ('Project Manager', 'Team Member')
                  AND pr.is_active = TRUE
                  AND (
                    (activity_type = 'review' AND EXISTS (
                        SELECT 1 FROM quality_reviews qr
                        WHERE qr.id = quality_activity_records.activity_id
                          AND qr.project_id = p.id
                    ))
                    OR
                    (activity_type = 'inspection' AND EXISTS (
                        SELECT 1 FROM quality_inspections qi
                        WHERE qi.id = quality_activity_records.activity_id
                          AND qi.project_id = p.id
                    ))
                  )
            )
            OR
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN users u ON u.id = ur.user_id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name = 'PMO Admin'
                  AND ur.is_active = true
            )
        )
    );

-- Policy: Users can delete (soft delete) records they created or have edit access
CREATE POLICY quality_activity_records_delete_policy ON quality_activity_records
    FOR DELETE
    USING (
        (
            created_by = auth.uid()
            OR
            EXISTS (
                SELECT 1 FROM project_memberships pm
                JOIN projects p ON pm.project_id = p.id
                JOIN users u ON u.id = pm.user_id
                JOIN project_roles pr ON pr.id = pm.project_role_id
                WHERE u.auth_user_id = auth.uid()
                  AND pm.is_active = TRUE
                  AND pr.role_name = 'Project Manager'
                  AND pr.is_active = TRUE
                  AND (
                    (activity_type = 'review' AND EXISTS (
                        SELECT 1 FROM quality_reviews qr
                        WHERE qr.id = quality_activity_records.activity_id
                          AND qr.project_id = p.id
                    ))
                    OR
                    (activity_type = 'inspection' AND EXISTS (
                        SELECT 1 FROM quality_inspections qi
                        WHERE qi.id = quality_activity_records.activity_id
                          AND qi.project_id = p.id
                    ))
                  )
            )
            OR
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN users u ON u.id = ur.user_id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name = 'PMO Admin'
                  AND ur.is_active = true
            )
        )
    );

-- ============================================================================
-- SECTION 3: RLS POLICIES FOR quality_activity_actions
-- ============================================================================

-- Policy: Users can view actions for activities in projects they're members of
CREATE POLICY quality_activity_actions_select_policy ON quality_activity_actions
    FOR SELECT
    USING (
        is_deleted = false AND
        (
            -- User is assigned to the action
            assigned_to_id = auth.uid()
            OR
            -- User has access through project membership
            EXISTS (
                SELECT 1 FROM project_memberships pm
                JOIN projects p ON pm.project_id = p.id
                JOIN users u ON u.id = pm.user_id
                WHERE u.auth_user_id = auth.uid()
                  AND pm.is_active = TRUE
                  AND (
                    (activity_type = 'review' AND EXISTS (
                        SELECT 1 FROM quality_reviews qr
                        WHERE qr.id = quality_activity_actions.activity_id
                          AND qr.project_id = p.id
                    ))
                    OR
                    (activity_type = 'inspection' AND EXISTS (
                        SELECT 1 FROM quality_inspections qi
                        WHERE qi.id = quality_activity_actions.activity_id
                          AND qi.project_id = p.id
                    ))
                  )
            )
            OR
            -- PMO Admins can view all
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN users u ON u.id = ur.user_id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name = 'PMO Admin'
                  AND ur.is_active = true
            )
        )
    );

-- Policy: Users can insert actions for activities they have edit access to
CREATE POLICY quality_activity_actions_insert_policy ON quality_activity_actions
    FOR INSERT
    WITH CHECK (
        created_by = auth.uid() AND
        (
            EXISTS (
                SELECT 1 FROM project_memberships pm
                JOIN projects p ON pm.project_id = p.id
                JOIN users u ON u.id = pm.user_id
                JOIN project_roles pr ON pr.id = pm.project_role_id
                WHERE u.auth_user_id = auth.uid()
                  AND pm.is_active = TRUE
                  AND pr.role_name IN ('Project Manager', 'Team Member')
                  AND pr.is_active = TRUE
                  AND (
                    (activity_type = 'review' AND EXISTS (
                        SELECT 1 FROM quality_reviews qr
                        WHERE qr.id = quality_activity_actions.activity_id
                          AND qr.project_id = p.id
                    ))
                    OR
                    (activity_type = 'inspection' AND EXISTS (
                        SELECT 1 FROM quality_inspections qi
                        WHERE qi.id = quality_activity_actions.activity_id
                          AND qi.project_id = p.id
                    ))
                  )
            )
            OR
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN users u ON u.id = ur.user_id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name = 'PMO Admin'
                  AND ur.is_active = true
            )
        )
    );

-- Policy: Users can update actions they created, are assigned to, or have edit access
CREATE POLICY quality_activity_actions_update_policy ON quality_activity_actions
    FOR UPDATE
    USING (
        is_deleted = false AND
        (
            created_by = auth.uid()
            OR
            assigned_to_id = auth.uid()
            OR
            EXISTS (
                SELECT 1 FROM project_memberships pm
                JOIN projects p ON pm.project_id = p.id
                JOIN users u ON u.id = pm.user_id
                JOIN project_roles pr ON pr.id = pm.project_role_id
                WHERE u.auth_user_id = auth.uid()
                  AND pm.is_active = TRUE
                  AND pr.role_name IN ('Project Manager', 'Team Member')
                  AND pr.is_active = TRUE
                  AND (
                    (activity_type = 'review' AND EXISTS (
                        SELECT 1 FROM quality_reviews qr
                        WHERE qr.id = quality_activity_actions.activity_id
                          AND qr.project_id = p.id
                    ))
                    OR
                    (activity_type = 'inspection' AND EXISTS (
                        SELECT 1 FROM quality_inspections qi
                        WHERE qi.id = quality_activity_actions.activity_id
                          AND qi.project_id = p.id
                    ))
                  )
            )
            OR
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN users u ON u.id = ur.user_id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name = 'PMO Admin'
                  AND ur.is_active = true
            )
        )
    );

-- Policy: Users can delete (soft delete) actions they created or have edit access
CREATE POLICY quality_activity_actions_delete_policy ON quality_activity_actions
    FOR DELETE
    USING (
        (
            created_by = auth.uid()
            OR
            EXISTS (
                SELECT 1 FROM project_memberships pm
                JOIN projects p ON pm.project_id = p.id
                JOIN users u ON u.id = pm.user_id
                JOIN project_roles pr ON pr.id = pm.project_role_id
                WHERE u.auth_user_id = auth.uid()
                  AND pm.is_active = TRUE
                  AND pr.role_name = 'Project Manager'
                  AND pr.is_active = TRUE
                  AND (
                    (activity_type = 'review' AND EXISTS (
                        SELECT 1 FROM quality_reviews qr
                        WHERE qr.id = quality_activity_actions.activity_id
                          AND qr.project_id = p.id
                    ))
                    OR
                    (activity_type = 'inspection' AND EXISTS (
                        SELECT 1 FROM quality_inspections qi
                        WHERE qi.id = quality_activity_actions.activity_id
                          AND qi.project_id = p.id
                    ))
                  )
            )
            OR
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN users u ON u.id = ur.user_id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name = 'PMO Admin'
                  AND ur.is_active = true
            )
        )
    );

-- ============================================================================
-- SECTION 4: RLS POLICIES FOR quality_inspection_participants
-- ============================================================================

-- Policy: Users can view participants for inspections in projects they're members of
CREATE POLICY quality_inspection_participants_select_policy ON quality_inspection_participants
    FOR SELECT
    USING (
        is_deleted = false AND
        (
            -- User is a participant
            user_id = auth.uid()
            OR
            -- User has access through project membership
            EXISTS (
                SELECT 1 FROM project_memberships pm
                JOIN projects p ON pm.project_id = p.id
                JOIN quality_inspections qi ON qi.project_id = p.id
                JOIN users u ON u.id = pm.user_id
                WHERE u.auth_user_id = auth.uid()
                  AND pm.is_active = TRUE
                  AND qi.id = quality_inspection_participants.inspection_id
            )
            OR
            -- PMO Admins can view all
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN users u ON u.id = ur.user_id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name = 'PMO Admin'
                  AND ur.is_active = true
            )
        )
    );

-- Policy: Users can insert participants for inspections they have edit access to
CREATE POLICY quality_inspection_participants_insert_policy ON quality_inspection_participants
    FOR INSERT
    WITH CHECK (
        created_by = auth.uid() AND
        (
            EXISTS (
                SELECT 1 FROM project_memberships pm
                JOIN projects p ON pm.project_id = p.id
                JOIN quality_inspections qi ON qi.project_id = p.id
                JOIN users u ON u.id = pm.user_id
                JOIN project_roles pr ON pr.id = pm.project_role_id
                WHERE u.auth_user_id = auth.uid()
                  AND pm.is_active = TRUE
                  AND pr.role_name IN ('Project Manager', 'Team Member')
                  AND pr.is_active = TRUE
                  AND qi.id = quality_inspection_participants.inspection_id
            )
            OR
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN users u ON u.id = ur.user_id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name = 'PMO Admin'
                  AND ur.is_active = true
            )
        )
    );

-- Policy: Users can update participants for inspections they have edit access to
CREATE POLICY quality_inspection_participants_update_policy ON quality_inspection_participants
    FOR UPDATE
    USING (
        is_deleted = false AND
        (
            -- User is updating their own participation
            user_id = auth.uid()
            OR
            EXISTS (
                SELECT 1 FROM project_memberships pm
                JOIN projects p ON pm.project_id = p.id
                JOIN quality_inspections qi ON qi.project_id = p.id
                JOIN users u ON u.id = pm.user_id
                JOIN project_roles pr ON pr.id = pm.project_role_id
                WHERE u.auth_user_id = auth.uid()
                  AND pm.is_active = TRUE
                  AND pr.role_name IN ('Project Manager', 'Team Member')
                  AND pr.is_active = TRUE
                  AND qi.id = quality_inspection_participants.inspection_id
            )
            OR
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN users u ON u.id = ur.user_id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name = 'PMO Admin'
                  AND ur.is_active = true
            )
        )
    );

-- Policy: Users can delete (soft delete) participants for inspections they have edit access to
CREATE POLICY quality_inspection_participants_delete_policy ON quality_inspection_participants
    FOR DELETE
    USING (
        (
            EXISTS (
                SELECT 1 FROM project_memberships pm
                JOIN projects p ON pm.project_id = p.id
                JOIN quality_inspections qi ON qi.project_id = p.id
                JOIN users u ON u.id = pm.user_id
                JOIN project_roles pr ON pr.id = pm.project_role_id
                WHERE u.auth_user_id = auth.uid()
                  AND pm.is_active = TRUE
                  AND pr.role_name = 'Project Manager'
                  AND pr.is_active = TRUE
                  AND qi.id = quality_inspection_participants.inspection_id
            )
            OR
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN users u ON u.id = ur.user_id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name = 'PMO Admin'
                  AND ur.is_active = true
            )
        )
    );

-- ============================================================================
-- End of v185_quality_register_rls_policies.sql
-- ============================================================================
