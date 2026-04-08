-- ============================================================================
-- Risk Register RLS Policies
-- Version: v173
-- Description: Row Level Security policies for unified Risk Register module
-- Date: 2026-01-19
-- ============================================================================
--
-- Purpose:
-- Implements Row Level Security (RLS) for all Risk Register tables to ensure
-- users can only access registers and risks for projects they're members of
-- or have appropriate permissions for.
--
-- Prerequisites:
-- - v172_risk_register_enhancement.sql must be run first
-- - All tables must exist
--
-- ============================================================================
-- SECTION 1: GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON risk_registers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON risks TO authenticated;
GRANT SELECT, INSERT, UPDATE ON risk_responses TO authenticated;
GRANT SELECT, INSERT, UPDATE ON risk_assessments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON risk_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE ON risk_probability_scales TO authenticated;
GRANT SELECT, INSERT, UPDATE ON risk_impact_scales TO authenticated;
GRANT SELECT, INSERT, UPDATE ON risk_matrix_thresholds TO authenticated;
GRANT SELECT, INSERT, UPDATE ON risk_comments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON risk_attachments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON risk_reviews TO authenticated;
GRANT SELECT, INSERT, UPDATE ON risk_links TO authenticated;

-- ============================================================================
-- SECTION 2: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE risk_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_probability_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_impact_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_matrix_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_links ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 3: RISK_REGISTERS RLS POLICIES
-- ============================================================================

-- Policy 1: Authenticated users can view registers for projects they're members of
DROP POLICY IF EXISTS policy_risk_registers_auth_select ON risk_registers;
CREATE POLICY policy_risk_registers_auth_select
    ON risk_registers FOR SELECT
    TO authenticated
    USING (
        is_deleted = FALSE
        AND (
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.project_id = risk_registers.project_id
                  AND up.is_deleted = FALSE
            )
            OR EXISTS (
                SELECT 1
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN users u ON ur.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name IN ('pmo_admin', 'System Admin')
                  AND ur.is_active = TRUE
                  AND ur.is_deleted = FALSE
            )
        )
    );

-- Policy 2: Project Manager can create registers for their projects
DROP POLICY IF EXISTS policy_risk_registers_auth_insert ON risk_registers;
CREATE POLICY policy_risk_registers_auth_insert
    ON risk_registers FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND (
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.project_id = risk_registers.project_id
                  AND up.access_level IN ('owner', 'admin')
                  AND up.is_deleted = FALSE
            )
            OR EXISTS (
                SELECT 1
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN users u ON ur.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name IN ('pmo_admin', 'System Admin')
                  AND ur.is_active = TRUE
                  AND ur.is_deleted = FALSE
            )
        )
    );

-- Policy 3: Project Manager and Team Managers can update registers
DROP POLICY IF EXISTS policy_risk_registers_auth_update ON risk_registers;
CREATE POLICY policy_risk_registers_auth_update
    ON risk_registers FOR UPDATE
    TO authenticated
    USING (
        is_deleted = FALSE
        AND (
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.project_id = risk_registers.project_id
                  AND up.access_level IN ('owner', 'admin')
                  AND up.is_deleted = FALSE
            )
            OR EXISTS (
                SELECT 1
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN users u ON ur.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name IN ('pmo_admin', 'System Admin')
                  AND ur.is_active = TRUE
                  AND ur.is_deleted = FALSE
            )
        )
    );

-- ============================================================================
-- SECTION 4: RISKS RLS POLICIES
-- ============================================================================

-- Policy 1: Users can view risks for projects they're members of
DROP POLICY IF EXISTS policy_risks_auth_select ON risks;
CREATE POLICY policy_risks_auth_select
    ON risks FOR SELECT
    TO authenticated
    USING (
        is_deleted = FALSE
        AND (
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.project_id = risks.project_id
                  AND up.is_deleted = FALSE
            )
            OR EXISTS (
                SELECT 1
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN users u ON ur.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name IN ('pmo_admin', 'System Admin')
                  AND ur.is_active = TRUE
                  AND ur.is_deleted = FALSE
            )
        )
    );

-- Policy 2: Project Manager and Team Managers can add risks
DROP POLICY IF EXISTS policy_risks_auth_insert ON risks;
CREATE POLICY policy_risks_auth_insert
    ON risks FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND (
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.project_id = risks.project_id
                  AND up.access_level IN ('owner', 'admin', 'member')
                  AND up.is_deleted = FALSE
            )
            OR EXISTS (
                SELECT 1
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN users u ON ur.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name IN ('pmo_admin', 'System Admin')
                  AND ur.is_active = TRUE
                  AND ur.is_deleted = FALSE
            )
        )
    );

-- Policy 3: Risk owner, PM, or Team Manager can update risks
DROP POLICY IF EXISTS policy_risks_auth_update ON risks;
CREATE POLICY policy_risks_auth_update
    ON risks FOR UPDATE
    TO authenticated
    USING (
        is_deleted = FALSE
        AND (
            risk_owner_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
            OR EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.project_id = risks.project_id
                  AND up.access_level IN ('owner', 'admin')
                  AND up.is_deleted = FALSE
            )
            OR EXISTS (
                SELECT 1
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN users u ON ur.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name IN ('pmo_admin', 'System Admin')
                  AND ur.is_active = TRUE
                  AND ur.is_deleted = FALSE
            )
        )
    );

-- ============================================================================
-- SECTION 5: RISK_RESPONSES RLS POLICIES
-- ============================================================================

-- Policy 1: Users can view responses for risks they can view
DROP POLICY IF EXISTS policy_risk_responses_select ON risk_responses;
CREATE POLICY policy_risk_responses_select
    ON risk_responses FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM risks r
            WHERE r.id = risk_responses.risk_id
              AND r.is_deleted = FALSE
        )
    );

-- Policy 2: Users can create responses
DROP POLICY IF EXISTS policy_risk_responses_insert ON risk_responses;
CREATE POLICY policy_risk_responses_insert
    ON risk_responses FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND EXISTS (
            SELECT 1 FROM risks r
            WHERE r.id = risk_responses.risk_id
              AND r.is_deleted = FALSE
        )
    );

-- Policy 3: Assigned user or PM can update responses
DROP POLICY IF EXISTS policy_risk_responses_update ON risk_responses;
CREATE POLICY policy_risk_responses_update
    ON risk_responses FOR UPDATE
    TO authenticated
    USING (
        assigned_to_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        OR EXISTS (
            SELECT 1 FROM risks r
            JOIN user_projects up ON r.project_id = up.project_id
            JOIN users u ON up.user_id = u.id
            WHERE r.id = risk_responses.risk_id
              AND u.auth_user_id = auth.uid()
              AND up.access_level IN ('owner', 'admin')
              AND up.is_deleted = FALSE
        )
    );

-- ============================================================================
-- SECTION 6: RISK_ASSESSMENTS RLS POLICIES
-- ============================================================================

-- Policy 1: Users can view assessments for risks they can view
DROP POLICY IF EXISTS policy_risk_assessments_select ON risk_assessments;
CREATE POLICY policy_risk_assessments_select
    ON risk_assessments FOR SELECT
    TO authenticated
    USING (
        is_deleted = FALSE
        AND EXISTS (
            SELECT 1 FROM risks r
            WHERE r.id = risk_assessments.risk_id
              AND r.is_deleted = FALSE
        )
    );

-- Policy 2: Users can create assessments
DROP POLICY IF EXISTS policy_risk_assessments_insert ON risk_assessments;
CREATE POLICY policy_risk_assessments_insert
    ON risk_assessments FOR INSERT
    TO authenticated
    WITH CHECK (
        assessed_by_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND EXISTS (
            SELECT 1 FROM risks r
            WHERE r.id = risk_assessments.risk_id
              AND r.is_deleted = FALSE
        )
    );

-- ============================================================================
-- SECTION 7: RISK_COMMENTS RLS POLICIES
-- ============================================================================

-- Policy 1: Users can view comments for risks they can view
DROP POLICY IF EXISTS policy_risk_comments_select ON risk_comments;
CREATE POLICY policy_risk_comments_select
    ON risk_comments FOR SELECT
    TO authenticated
    USING (
        is_deleted = FALSE
        AND EXISTS (
            SELECT 1 FROM risks r
            WHERE r.id = risk_comments.risk_id
              AND r.is_deleted = FALSE
        )
    );

-- Policy 2: Users can add comments
DROP POLICY IF EXISTS policy_risk_comments_insert ON risk_comments;
CREATE POLICY policy_risk_comments_insert
    ON risk_comments FOR INSERT
    TO authenticated
    WITH CHECK (
        commented_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND EXISTS (
            SELECT 1 FROM risks r
            WHERE r.id = risk_comments.risk_id
              AND r.is_deleted = FALSE
        )
    );

-- Policy 3: Users can edit/delete their own comments
DROP POLICY IF EXISTS policy_risk_comments_update ON risk_comments;
CREATE POLICY policy_risk_comments_update
    ON risk_comments FOR UPDATE
    TO authenticated
    USING (
        is_deleted = FALSE
        AND commented_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
    );

DROP POLICY IF EXISTS policy_risk_comments_delete ON risk_comments;
CREATE POLICY policy_risk_comments_delete
    ON risk_comments FOR DELETE
    TO authenticated
    USING (
        commented_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
    );

-- ============================================================================
-- SECTION 8: RISK_ATTACHMENTS RLS POLICIES
-- ============================================================================

-- Policy 1: Users can view attachments for risks they can view
DROP POLICY IF EXISTS policy_risk_attachments_select ON risk_attachments;
CREATE POLICY policy_risk_attachments_select
    ON risk_attachments FOR SELECT
    TO authenticated
    USING (
        is_deleted = FALSE
        AND EXISTS (
            SELECT 1 FROM risks r
            WHERE r.id = risk_attachments.risk_id
              AND r.is_deleted = FALSE
        )
    );

-- Policy 2: Users can upload attachments
DROP POLICY IF EXISTS policy_risk_attachments_insert ON risk_attachments;
CREATE POLICY policy_risk_attachments_insert
    ON risk_attachments FOR INSERT
    TO authenticated
    WITH CHECK (
        uploaded_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND EXISTS (
            SELECT 1 FROM risks r
            WHERE r.id = risk_attachments.risk_id
              AND r.is_deleted = FALSE
        )
    );

-- Policy 3: Uploader or PM can delete attachments
DROP POLICY IF EXISTS policy_risk_attachments_delete ON risk_attachments;
CREATE POLICY policy_risk_attachments_delete
    ON risk_attachments FOR DELETE
    TO authenticated
    USING (
        uploaded_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        OR EXISTS (
            SELECT 1 FROM risks r
            JOIN user_projects up ON r.project_id = up.project_id
            JOIN users u ON up.user_id = u.id
            WHERE r.id = risk_attachments.risk_id
              AND u.auth_user_id = auth.uid()
              AND up.access_level IN ('owner', 'admin')
              AND up.is_deleted = FALSE
        )
    );

-- ============================================================================
-- SECTION 9: RISK_REVIEWS RLS POLICIES
-- ============================================================================

-- Policy 1: Users can view reviews for registers they can view
DROP POLICY IF EXISTS policy_risk_reviews_select ON risk_reviews;
CREATE POLICY policy_risk_reviews_select
    ON risk_reviews FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM risk_registers rr
            WHERE rr.id = risk_reviews.risk_register_id
              AND rr.is_deleted = FALSE
        )
    );

-- Policy 2: PM can create reviews
DROP POLICY IF EXISTS policy_risk_reviews_insert ON risk_reviews;
CREATE POLICY policy_risk_reviews_insert
    ON risk_reviews FOR INSERT
    TO authenticated
    WITH CHECK (
        reviewed_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND EXISTS (
            SELECT 1 FROM risk_registers rr
            JOIN user_projects up ON rr.project_id = up.project_id
            JOIN users u ON up.user_id = u.id
            WHERE rr.id = risk_reviews.risk_register_id
              AND u.auth_user_id = auth.uid()
              AND up.access_level IN ('owner', 'admin')
              AND up.is_deleted = FALSE
        )
    );

-- ============================================================================
-- SECTION 10: RISK_LINKS RLS POLICIES
-- ============================================================================

-- Policy 1: Users can view links for risks they can view
DROP POLICY IF EXISTS policy_risk_links_select ON risk_links;
CREATE POLICY policy_risk_links_select
    ON risk_links FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM risks r
            WHERE r.id = risk_links.source_risk_id
              AND r.is_deleted = FALSE
        )
    );

-- Policy 2: Users can create links
DROP POLICY IF EXISTS policy_risk_links_insert ON risk_links;
CREATE POLICY policy_risk_links_insert
    ON risk_links FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        AND EXISTS (
            SELECT 1 FROM risks r
            WHERE r.id = risk_links.source_risk_id
              AND r.is_deleted = FALSE
        )
    );

-- ============================================================================
-- SECTION 11: SCALE TABLES RLS POLICIES
-- ============================================================================

-- Risk Categories: Organization members can view, PMO Admins can manage
DROP POLICY IF EXISTS policy_risk_categories_select ON risk_categories;
CREATE POLICY policy_risk_categories_select
    ON risk_categories FOR SELECT
    TO authenticated
    USING (
        is_active = TRUE
        AND EXISTS (
            SELECT 1 FROM projects p
            JOIN user_projects up ON p.id = up.project_id
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND p.account_id = risk_categories.organisation_id
              AND up.is_deleted = FALSE
        )
    );

DROP POLICY IF EXISTS policy_risk_categories_insert ON risk_categories;
CREATE POLICY policy_risk_categories_insert
    ON risk_categories FOR INSERT
    TO authenticated
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
        )
    );

-- Probability Scales: Organization members can view, PMO Admins can manage
DROP POLICY IF EXISTS policy_risk_probability_scales_select ON risk_probability_scales;
CREATE POLICY policy_risk_probability_scales_select
    ON risk_probability_scales FOR SELECT
    TO authenticated
    USING (
        is_active = TRUE
        AND EXISTS (
            SELECT 1 FROM projects p
            JOIN user_projects up ON p.id = up.project_id
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND p.account_id = risk_probability_scales.organisation_id
              AND up.is_deleted = FALSE
        )
    );

DROP POLICY IF EXISTS policy_risk_probability_scales_insert ON risk_probability_scales;
CREATE POLICY policy_risk_probability_scales_insert
    ON risk_probability_scales FOR INSERT
    TO authenticated
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
        )
    );

-- Impact Scales: Organization members can view, PMO Admins can manage
DROP POLICY IF EXISTS policy_risk_impact_scales_select ON risk_impact_scales;
CREATE POLICY policy_risk_impact_scales_select
    ON risk_impact_scales FOR SELECT
    TO authenticated
    USING (
        is_active = TRUE
        AND EXISTS (
            SELECT 1 FROM projects p
            JOIN user_projects up ON p.id = up.project_id
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND p.account_id = risk_impact_scales.organisation_id
              AND up.is_deleted = FALSE
        )
    );

DROP POLICY IF EXISTS policy_risk_impact_scales_insert ON risk_impact_scales;
CREATE POLICY policy_risk_impact_scales_insert
    ON risk_impact_scales FOR INSERT
    TO authenticated
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
        )
    );

-- Matrix Thresholds: Organization members can view, PMO Admins can manage
DROP POLICY IF EXISTS policy_risk_matrix_thresholds_select ON risk_matrix_thresholds;
CREATE POLICY policy_risk_matrix_thresholds_select
    ON risk_matrix_thresholds FOR SELECT
    TO authenticated
    USING (
        is_active = TRUE
        AND EXISTS (
            SELECT 1 FROM projects p
            JOIN user_projects up ON p.id = up.project_id
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND p.account_id = risk_matrix_thresholds.organisation_id
              AND up.is_deleted = FALSE
        )
    );

DROP POLICY IF EXISTS policy_risk_matrix_thresholds_insert ON risk_matrix_thresholds;
CREATE POLICY policy_risk_matrix_thresholds_insert
    ON risk_matrix_thresholds FOR INSERT
    TO authenticated
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
        )
    );

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
      AND tablename IN (
          'risk_registers',
          'risks',
          'risk_responses',
          'risk_assessments',
          'risk_categories',
          'risk_probability_scales',
          'risk_impact_scales',
          'risk_matrix_thresholds',
          'risk_comments',
          'risk_attachments',
          'risk_reviews',
          'risk_links'
      );

    IF policies_count < 20 THEN
        RAISE WARNING 'Expected at least 20 RLS policies, found %', policies_count;
    END IF;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Risk Register RLS Policies Created';
    RAISE NOTICE 'Policies: %', policies_count;
    RAISE NOTICE '========================================';
END $$;
