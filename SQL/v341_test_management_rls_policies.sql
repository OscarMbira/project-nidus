-- ============================================================================
-- Test Management RLS Policies — Test Suites, Test Cases, Steps
-- Version: v341
-- Description: Row Level Security for test_suites, test_cases, test_case_steps
-- Date: 2026-03-27
-- ============================================================================
--
-- Access model:
--   - All authenticated project members can SELECT (read)
--   - Team Member, PM, PMO, PMO Admin can INSERT/UPDATE
--   - Only PM, PMO, PMO Admin can DELETE (soft-delete via is_deleted flag)
--   - PMO Admin can access all projects
--
-- ============================================================================

-- ============================================================================
-- SECTION 1: GRANT TABLE PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON test_suites       TO authenticated;
GRANT SELECT, INSERT, UPDATE ON test_cases        TO authenticated;
GRANT SELECT, INSERT, UPDATE ON test_case_steps   TO authenticated;

GRANT USAGE, SELECT ON SEQUENCE test_case_ref_seq TO authenticated;

-- ============================================================================
-- SECTION 2: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE test_suites     ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_cases      ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_case_steps ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 3: TEST_SUITES RLS POLICIES
-- ============================================================================

-- Helper: is the current user a member of this project?
-- (reuses the same pattern as issue_registers)

DROP POLICY IF EXISTS policy_test_suites_select ON test_suites;
CREATE POLICY policy_test_suites_select
    ON test_suites FOR SELECT
    TO authenticated
    USING (
        is_deleted = FALSE
        AND (
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.project_id  = test_suites.project_id
                  AND up.is_deleted  = FALSE
            )
            OR EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN users u ON ur.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name IN ('pmo_admin','System Admin')
                  AND ur.is_active   = TRUE
                  AND ur.is_deleted  = FALSE
            )
        )
    );

DROP POLICY IF EXISTS policy_test_suites_insert ON test_suites;
CREATE POLICY policy_test_suites_insert
    ON test_suites FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_projects up
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND up.project_id  = test_suites.project_id
              AND up.is_deleted  = FALSE
        )
        OR EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            JOIN users u ON ur.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name IN ('pmo_admin','System Admin')
              AND ur.is_active   = TRUE
              AND ur.is_deleted  = FALSE
        )
    );

DROP POLICY IF EXISTS policy_test_suites_update ON test_suites;
CREATE POLICY policy_test_suites_update
    ON test_suites FOR UPDATE
    TO authenticated
    USING (
        is_deleted = FALSE
        AND (
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.project_id  = test_suites.project_id
                  AND up.is_deleted  = FALSE
            )
            OR EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN users u ON ur.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name IN ('pmo_admin','System Admin')
                  AND ur.is_active   = TRUE
                  AND ur.is_deleted  = FALSE
            )
        )
    );

-- ============================================================================
-- SECTION 4: TEST_CASES RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS policy_test_cases_select ON test_cases;
CREATE POLICY policy_test_cases_select
    ON test_cases FOR SELECT
    TO authenticated
    USING (
        is_deleted = FALSE
        AND (
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.project_id  = test_cases.project_id
                  AND up.is_deleted  = FALSE
            )
            OR EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN users u ON ur.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name IN ('pmo_admin','System Admin')
                  AND ur.is_active   = TRUE
                  AND ur.is_deleted  = FALSE
            )
        )
    );

DROP POLICY IF EXISTS policy_test_cases_insert ON test_cases;
CREATE POLICY policy_test_cases_insert
    ON test_cases FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_projects up
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND up.project_id  = test_cases.project_id
              AND up.is_deleted  = FALSE
        )
        OR EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            JOIN users u ON ur.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name IN ('pmo_admin','System Admin')
              AND ur.is_active   = TRUE
              AND ur.is_deleted  = FALSE
        )
    );

DROP POLICY IF EXISTS policy_test_cases_update ON test_cases;
CREATE POLICY policy_test_cases_update
    ON test_cases FOR UPDATE
    TO authenticated
    USING (
        is_deleted = FALSE
        AND (
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.project_id  = test_cases.project_id
                  AND up.is_deleted  = FALSE
            )
            OR EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN users u ON ur.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name IN ('pmo_admin','System Admin')
                  AND ur.is_active   = TRUE
                  AND ur.is_deleted  = FALSE
            )
        )
    );

-- ============================================================================
-- SECTION 5: TEST_CASE_STEPS RLS POLICIES
-- (Steps inherit access from their parent test_case's project)
-- ============================================================================

DROP POLICY IF EXISTS policy_test_case_steps_select ON test_case_steps;
CREATE POLICY policy_test_case_steps_select
    ON test_case_steps FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM test_cases tc
            JOIN user_projects up ON up.project_id = tc.project_id
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id          = auth.uid()
              AND tc.id                   = test_case_steps.test_case_id
              AND tc.is_deleted           = FALSE
              AND up.is_deleted           = FALSE
        )
        OR EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            JOIN users u ON ur.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name IN ('pmo_admin','System Admin')
              AND ur.is_active   = TRUE
              AND ur.is_deleted  = FALSE
        )
    );

DROP POLICY IF EXISTS policy_test_case_steps_insert ON test_case_steps;
CREATE POLICY policy_test_case_steps_insert
    ON test_case_steps FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM test_cases tc
            JOIN user_projects up ON up.project_id = tc.project_id
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND tc.id          = test_case_steps.test_case_id
              AND tc.is_deleted  = FALSE
              AND up.is_deleted  = FALSE
        )
        OR EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            JOIN users u ON ur.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name IN ('pmo_admin','System Admin')
              AND ur.is_active   = TRUE
              AND ur.is_deleted  = FALSE
        )
    );

DROP POLICY IF EXISTS policy_test_case_steps_update ON test_case_steps;
CREATE POLICY policy_test_case_steps_update
    ON test_case_steps FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM test_cases tc
            JOIN user_projects up ON up.project_id = tc.project_id
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND tc.id          = test_case_steps.test_case_id
              AND tc.is_deleted  = FALSE
              AND up.is_deleted  = FALSE
        )
        OR EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            JOIN users u ON ur.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name IN ('pmo_admin','System Admin')
              AND ur.is_active   = TRUE
              AND ur.is_deleted  = FALSE
        )
    );

DROP POLICY IF EXISTS policy_test_case_steps_delete ON test_case_steps;
CREATE POLICY policy_test_case_steps_delete
    ON test_case_steps FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM test_cases tc
            JOIN user_projects up ON up.project_id = tc.project_id
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND tc.id          = test_case_steps.test_case_id
              AND tc.is_deleted  = FALSE
              AND up.is_deleted  = FALSE
        )
        OR EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            JOIN users u ON ur.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name IN ('pmo_admin','System Admin')
              AND ur.is_active   = TRUE
              AND ur.is_deleted  = FALSE
        )
    );
