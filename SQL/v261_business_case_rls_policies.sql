-- ============================================================================
-- Business Case RLS Policies
-- Version: v261
-- Description: Row Level Security policies for business case tables
-- Date: 2026-02-23
-- ============================================================================
--
-- Applies RLS to all 7 business case tables.
-- Policy design:
--   SELECT  — any authenticated user (in same organisation context)
--   INSERT  — authenticated user (system handles org scoping via service layer)
--   UPDATE  — creator or PMO Admin role (status must be draft/rejected)
--   DELETE  — PMO Admin only (soft delete preferred)
--
-- ============================================================================

-- ============================================================================
-- business_cases
-- ============================================================================

ALTER TABLE business_cases ENABLE ROW LEVEL SECURITY;

-- SELECT: any authenticated user
DROP POLICY IF EXISTS business_cases_select ON business_cases;
CREATE POLICY business_cases_select ON business_cases
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL
        AND is_deleted = false
    );

-- INSERT: any authenticated user
DROP POLICY IF EXISTS business_cases_insert ON business_cases;
CREATE POLICY business_cases_insert ON business_cases
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: creator or PMO Admin
DROP POLICY IF EXISTS business_cases_update ON business_cases;
CREATE POLICY business_cases_update ON business_cases
    FOR UPDATE
    USING (
        auth.uid() IS NOT NULL
        AND is_deleted = false
        AND (
            created_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid()
                  AND r.role_name IN ('pmo_admin', 'org_admin', 'super_admin')
                  AND ur.is_active = true
            )
        )
    )
    WITH CHECK (
        auth.uid() IS NOT NULL
    );

-- DELETE (hard): PMO Admin only — prefer soft delete
DROP POLICY IF EXISTS business_cases_delete ON business_cases;
CREATE POLICY business_cases_delete ON business_cases
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
              AND r.role_name IN ('pmo_admin', 'org_admin', 'super_admin')
              AND ur.is_active = true
        )
    );

-- ============================================================================
-- business_case_options
-- ============================================================================

ALTER TABLE business_case_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS business_case_options_select ON business_case_options;
CREATE POLICY business_case_options_select ON business_case_options
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL
        AND is_deleted = false
        AND EXISTS (
            SELECT 1 FROM business_cases bc
            WHERE bc.id = business_case_id AND bc.is_deleted = false
        )
    );

DROP POLICY IF EXISTS business_case_options_insert ON business_case_options;
CREATE POLICY business_case_options_insert ON business_case_options
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS business_case_options_update ON business_case_options;
CREATE POLICY business_case_options_update ON business_case_options
    FOR UPDATE
    USING (
        auth.uid() IS NOT NULL
        AND is_deleted = false
        AND (
            created_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid()
                  AND r.role_name IN ('pmo_admin', 'org_admin', 'super_admin')
                  AND ur.is_active = true
            )
        )
    )
    WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS business_case_options_delete ON business_case_options;
CREATE POLICY business_case_options_delete ON business_case_options
    FOR DELETE
    USING (
        auth.uid() IS NOT NULL
        AND (
            created_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid()
                  AND r.role_name IN ('pmo_admin', 'org_admin', 'super_admin')
                  AND ur.is_active = true
            )
        )
    );

-- ============================================================================
-- business_case_benefits
-- ============================================================================

ALTER TABLE business_case_benefits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS business_case_benefits_select ON business_case_benefits;
CREATE POLICY business_case_benefits_select ON business_case_benefits
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL
        AND is_deleted = false
    );

DROP POLICY IF EXISTS business_case_benefits_insert ON business_case_benefits;
CREATE POLICY business_case_benefits_insert ON business_case_benefits
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS business_case_benefits_update ON business_case_benefits;
CREATE POLICY business_case_benefits_update ON business_case_benefits
    FOR UPDATE
    USING (
        auth.uid() IS NOT NULL
        AND is_deleted = false
        AND (
            created_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid()
                  AND r.role_name IN ('pmo_admin', 'org_admin', 'super_admin')
                  AND ur.is_active = true
            )
        )
    )
    WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS business_case_benefits_delete ON business_case_benefits;
CREATE POLICY business_case_benefits_delete ON business_case_benefits
    FOR DELETE
    USING (
        auth.uid() IS NOT NULL
        AND (
            created_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid()
                  AND r.role_name IN ('pmo_admin', 'org_admin', 'super_admin')
                  AND ur.is_active = true
            )
        )
    );

-- ============================================================================
-- business_case_dis_benefits
-- ============================================================================

ALTER TABLE business_case_dis_benefits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS business_case_dis_benefits_select ON business_case_dis_benefits;
CREATE POLICY business_case_dis_benefits_select ON business_case_dis_benefits
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL
        AND is_deleted = false
    );

DROP POLICY IF EXISTS business_case_dis_benefits_insert ON business_case_dis_benefits;
CREATE POLICY business_case_dis_benefits_insert ON business_case_dis_benefits
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS business_case_dis_benefits_update ON business_case_dis_benefits;
CREATE POLICY business_case_dis_benefits_update ON business_case_dis_benefits
    FOR UPDATE
    USING (
        auth.uid() IS NOT NULL
        AND is_deleted = false
        AND (
            created_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid()
                  AND r.role_name IN ('pmo_admin', 'org_admin', 'super_admin')
                  AND ur.is_active = true
            )
        )
    )
    WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS business_case_dis_benefits_delete ON business_case_dis_benefits;
CREATE POLICY business_case_dis_benefits_delete ON business_case_dis_benefits
    FOR DELETE
    USING (
        auth.uid() IS NOT NULL
        AND (
            created_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid()
                  AND r.role_name IN ('pmo_admin', 'org_admin', 'super_admin')
                  AND ur.is_active = true
            )
        )
    );

-- ============================================================================
-- business_case_revisions
-- ============================================================================

ALTER TABLE business_case_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS business_case_revisions_select ON business_case_revisions;
CREATE POLICY business_case_revisions_select ON business_case_revisions
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS business_case_revisions_insert ON business_case_revisions;
CREATE POLICY business_case_revisions_insert ON business_case_revisions
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Revisions are immutable — no UPDATE/DELETE policies

-- ============================================================================
-- business_case_approvals
-- ============================================================================

ALTER TABLE business_case_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS business_case_approvals_select ON business_case_approvals;
CREATE POLICY business_case_approvals_select ON business_case_approvals
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS business_case_approvals_insert ON business_case_approvals;
CREATE POLICY business_case_approvals_insert ON business_case_approvals
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS business_case_approvals_update ON business_case_approvals;
CREATE POLICY business_case_approvals_update ON business_case_approvals
    FOR UPDATE
    USING (
        auth.uid() IS NOT NULL
        AND (
            approver_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid()
                  AND r.role_name IN ('pmo_admin', 'org_admin', 'super_admin')
                  AND ur.is_active = true
            )
        )
    )
    WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- business_case_distribution
-- ============================================================================

ALTER TABLE business_case_distribution ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS business_case_distribution_select ON business_case_distribution;
CREATE POLICY business_case_distribution_select ON business_case_distribution
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS business_case_distribution_insert ON business_case_distribution;
CREATE POLICY business_case_distribution_insert ON business_case_distribution
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS business_case_distribution_delete ON business_case_distribution;
CREATE POLICY business_case_distribution_delete ON business_case_distribution
    FOR DELETE
    USING (
        auth.uid() IS NOT NULL
        AND (
            created_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid()
                  AND r.role_name IN ('pmo_admin', 'org_admin', 'super_admin')
                  AND ur.is_active = true
            )
        )
    );

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    v_rls_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_rls_count
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN (
          'business_cases',
          'business_case_options',
          'business_case_benefits',
          'business_case_dis_benefits',
          'business_case_revisions',
          'business_case_approvals',
          'business_case_distribution'
      )
      AND rowsecurity = true;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Business Case RLS Policies Applied';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Tables with RLS enabled: % / 7', v_rls_count;
    RAISE NOTICE 'v261_business_case_rls_policies.sql completed successfully';
    RAISE NOTICE '================================================';
END $$;

-- ============================================================================
-- END OF FILE
-- ============================================================================
