-- =============================================================================
-- v287: RLS Policies for Programme Sub-tables
-- Purpose: Add GRANT and access policies for the six programme sub-tables
--          that had RLS enabled in v37 but no actual policies defined.
--          Without policies, authenticated users get "permission denied".
--
-- Tables fixed:
--   programme_benefits      - Programme-level benefits tracking
--   programme_members       - Programme team members
--   programme_governance    - Governance & oversight
--   programme_milestones    - Programme milestones
--   programme_dependencies  - Programme dependencies
--   programme_reports       - Programme reports
--
-- Note: programmes and programme_projects were already fixed in v249.
--
-- Strategy (mirrors v278 / v286):
--   SELECT  — all authenticated users
--   INSERT  — all authenticated users (service layer enforces role checks)
--   UPDATE  — all authenticated users on non-deleted rows
--   DELETE  — restricted to pmo_admin / System Admin
-- =============================================================================


-- =============================================================================
-- TABLE: programme_benefits
-- =============================================================================

DROP POLICY IF EXISTS policy_programme_benefits_select ON programme_benefits;
DROP POLICY IF EXISTS policy_programme_benefits_insert ON programme_benefits;
DROP POLICY IF EXISTS policy_programme_benefits_update ON programme_benefits;
DROP POLICY IF EXISTS policy_programme_benefits_delete ON programme_benefits;

ALTER TABLE programme_benefits ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON programme_benefits TO authenticated;

CREATE POLICY policy_programme_benefits_select ON programme_benefits
    FOR SELECT TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY policy_programme_benefits_insert ON programme_benefits
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY policy_programme_benefits_update ON programme_benefits
    FOR UPDATE TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY policy_programme_benefits_delete ON programme_benefits
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN users u ON ur.user_id = u.id
            JOIN roles r ON ur.role_id = r.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name IN ('pmo_admin', 'System Admin')
              AND ur.is_active = TRUE
              AND ur.is_deleted = FALSE
        )
    );


-- =============================================================================
-- TABLE: programme_members
-- =============================================================================

DROP POLICY IF EXISTS policy_programme_members_select ON programme_members;
DROP POLICY IF EXISTS policy_programme_members_insert ON programme_members;
DROP POLICY IF EXISTS policy_programme_members_update ON programme_members;
DROP POLICY IF EXISTS policy_programme_members_delete ON programme_members;

ALTER TABLE programme_members ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON programme_members TO authenticated;

CREATE POLICY policy_programme_members_select ON programme_members
    FOR SELECT TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY policy_programme_members_insert ON programme_members
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY policy_programme_members_update ON programme_members
    FOR UPDATE TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY policy_programme_members_delete ON programme_members
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN users u ON ur.user_id = u.id
            JOIN roles r ON ur.role_id = r.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name IN ('pmo_admin', 'System Admin')
              AND ur.is_active = TRUE
              AND ur.is_deleted = FALSE
        )
    );


-- =============================================================================
-- TABLE: programme_governance
-- =============================================================================

DROP POLICY IF EXISTS policy_programme_governance_select ON programme_governance;
DROP POLICY IF EXISTS policy_programme_governance_insert ON programme_governance;
DROP POLICY IF EXISTS policy_programme_governance_update ON programme_governance;
DROP POLICY IF EXISTS policy_programme_governance_delete ON programme_governance;

ALTER TABLE programme_governance ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON programme_governance TO authenticated;

CREATE POLICY policy_programme_governance_select ON programme_governance
    FOR SELECT TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY policy_programme_governance_insert ON programme_governance
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY policy_programme_governance_update ON programme_governance
    FOR UPDATE TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY policy_programme_governance_delete ON programme_governance
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN users u ON ur.user_id = u.id
            JOIN roles r ON ur.role_id = r.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name IN ('pmo_admin', 'System Admin')
              AND ur.is_active = TRUE
              AND ur.is_deleted = FALSE
        )
    );


-- =============================================================================
-- TABLE: programme_milestones
-- =============================================================================

DROP POLICY IF EXISTS policy_programme_milestones_select ON programme_milestones;
DROP POLICY IF EXISTS policy_programme_milestones_insert ON programme_milestones;
DROP POLICY IF EXISTS policy_programme_milestones_update ON programme_milestones;
DROP POLICY IF EXISTS policy_programme_milestones_delete ON programme_milestones;

ALTER TABLE programme_milestones ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON programme_milestones TO authenticated;

CREATE POLICY policy_programme_milestones_select ON programme_milestones
    FOR SELECT TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY policy_programme_milestones_insert ON programme_milestones
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY policy_programme_milestones_update ON programme_milestones
    FOR UPDATE TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY policy_programme_milestones_delete ON programme_milestones
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN users u ON ur.user_id = u.id
            JOIN roles r ON ur.role_id = r.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name IN ('pmo_admin', 'System Admin')
              AND ur.is_active = TRUE
              AND ur.is_deleted = FALSE
        )
    );


-- =============================================================================
-- TABLE: programme_dependencies
-- =============================================================================

DROP POLICY IF EXISTS policy_programme_dependencies_select ON programme_dependencies;
DROP POLICY IF EXISTS policy_programme_dependencies_insert ON programme_dependencies;
DROP POLICY IF EXISTS policy_programme_dependencies_update ON programme_dependencies;
DROP POLICY IF EXISTS policy_programme_dependencies_delete ON programme_dependencies;

ALTER TABLE programme_dependencies ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON programme_dependencies TO authenticated;

CREATE POLICY policy_programme_dependencies_select ON programme_dependencies
    FOR SELECT TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY policy_programme_dependencies_insert ON programme_dependencies
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY policy_programme_dependencies_update ON programme_dependencies
    FOR UPDATE TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY policy_programme_dependencies_delete ON programme_dependencies
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN users u ON ur.user_id = u.id
            JOIN roles r ON ur.role_id = r.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name IN ('pmo_admin', 'System Admin')
              AND ur.is_active = TRUE
              AND ur.is_deleted = FALSE
        )
    );


-- =============================================================================
-- TABLE: programme_reports
-- =============================================================================

DROP POLICY IF EXISTS policy_programme_reports_select ON programme_reports;
DROP POLICY IF EXISTS policy_programme_reports_insert ON programme_reports;
DROP POLICY IF EXISTS policy_programme_reports_update ON programme_reports;
DROP POLICY IF EXISTS policy_programme_reports_delete ON programme_reports;

ALTER TABLE programme_reports ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON programme_reports TO authenticated;

CREATE POLICY policy_programme_reports_select ON programme_reports
    FOR SELECT TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY policy_programme_reports_insert ON programme_reports
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY policy_programme_reports_update ON programme_reports
    FOR UPDATE TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY policy_programme_reports_delete ON programme_reports
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN users u ON ur.user_id = u.id
            JOIN roles r ON ur.role_id = r.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name IN ('pmo_admin', 'System Admin')
              AND ur.is_active = TRUE
              AND ur.is_deleted = FALSE
        )
    );


-- =============================================================================
-- Verification
-- =============================================================================

DO $$
DECLARE
    v_benefits      INTEGER;
    v_members       INTEGER;
    v_governance    INTEGER;
    v_milestones    INTEGER;
    v_dependencies  INTEGER;
    v_reports       INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_benefits     FROM pg_policies WHERE tablename = 'programme_benefits';
    SELECT COUNT(*) INTO v_members      FROM pg_policies WHERE tablename = 'programme_members';
    SELECT COUNT(*) INTO v_governance   FROM pg_policies WHERE tablename = 'programme_governance';
    SELECT COUNT(*) INTO v_milestones   FROM pg_policies WHERE tablename = 'programme_milestones';
    SELECT COUNT(*) INTO v_dependencies FROM pg_policies WHERE tablename = 'programme_dependencies';
    SELECT COUNT(*) INTO v_reports      FROM pg_policies WHERE tablename = 'programme_reports';

    RAISE NOTICE '================================================';
    RAISE NOTICE 'v287 Programme Sub-tables RLS Applied';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'programme_benefits     policies: %', v_benefits;
    RAISE NOTICE 'programme_members      policies: %', v_members;
    RAISE NOTICE 'programme_governance   policies: %', v_governance;
    RAISE NOTICE 'programme_milestones   policies: %', v_milestones;
    RAISE NOTICE 'programme_dependencies policies: %', v_dependencies;
    RAISE NOTICE 'programme_reports      policies: %', v_reports;
    RAISE NOTICE '================================================';
END $$;
