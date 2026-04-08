-- ============================================================================
-- Test Runs & Executions RLS Policies
-- Version: v342
-- Description: Row Level Security for test_runs and test_case_executions
-- Date: 2026-03-27
-- ============================================================================

-- ============================================================================
-- SECTION 1: GRANT TABLE PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON test_runs             TO authenticated;
GRANT SELECT, INSERT, UPDATE ON test_case_executions  TO authenticated;

-- ============================================================================
-- SECTION 2: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE test_runs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_case_executions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 3: TEST_RUNS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS policy_test_runs_select ON test_runs;
CREATE POLICY policy_test_runs_select
    ON test_runs FOR SELECT
    TO authenticated
    USING (
        is_deleted = FALSE
        AND (
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.project_id  = test_runs.project_id
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

DROP POLICY IF EXISTS policy_test_runs_insert ON test_runs;
CREATE POLICY policy_test_runs_insert
    ON test_runs FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_projects up
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND up.project_id  = test_runs.project_id
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

DROP POLICY IF EXISTS policy_test_runs_update ON test_runs;
CREATE POLICY policy_test_runs_update
    ON test_runs FOR UPDATE
    TO authenticated
    USING (
        is_deleted = FALSE
        AND (
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.project_id  = test_runs.project_id
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
-- SECTION 4: TEST_CASE_EXECUTIONS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS policy_tce_select ON test_case_executions;
CREATE POLICY policy_tce_select
    ON test_case_executions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_projects up
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND up.project_id  = test_case_executions.project_id
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

DROP POLICY IF EXISTS policy_tce_insert ON test_case_executions;
CREATE POLICY policy_tce_insert
    ON test_case_executions FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_projects up
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND up.project_id  = test_case_executions.project_id
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

DROP POLICY IF EXISTS policy_tce_update ON test_case_executions;
CREATE POLICY policy_tce_update
    ON test_case_executions FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_projects up
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND up.project_id  = test_case_executions.project_id
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
