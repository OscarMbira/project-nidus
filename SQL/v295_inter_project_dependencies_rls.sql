-- =====================================================
-- v295: Inter-Project Dependencies RLS policies
-- =====================================================
-- Fixes 403 Forbidden when querying inter_project_dependencies.
-- v39 enabled RLS but did not create policies; this adds them.
-- =====================================================

-- inter_project_dependencies
GRANT SELECT, INSERT, UPDATE, DELETE ON inter_project_dependencies TO authenticated;

DROP POLICY IF EXISTS policy_inter_project_dependencies_select ON inter_project_dependencies;
DROP POLICY IF EXISTS policy_inter_project_dependencies_insert ON inter_project_dependencies;
DROP POLICY IF EXISTS policy_inter_project_dependencies_update ON inter_project_dependencies;
DROP POLICY IF EXISTS policy_inter_project_dependencies_delete ON inter_project_dependencies;

CREATE POLICY policy_inter_project_dependencies_select ON inter_project_dependencies
    FOR SELECT TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY policy_inter_project_dependencies_insert ON inter_project_dependencies
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY policy_inter_project_dependencies_update ON inter_project_dependencies
    FOR UPDATE TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY policy_inter_project_dependencies_delete ON inter_project_dependencies
    FOR DELETE TO authenticated
    USING (is_deleted = FALSE);

-- dependency_impacts (used by Impact Analysis)
GRANT SELECT, INSERT, UPDATE, DELETE ON dependency_impacts TO authenticated;

DROP POLICY IF EXISTS policy_dependency_impacts_select ON dependency_impacts;
DROP POLICY IF EXISTS policy_dependency_impacts_insert ON dependency_impacts;
DROP POLICY IF EXISTS policy_dependency_impacts_update ON dependency_impacts;
DROP POLICY IF EXISTS policy_dependency_impacts_delete ON dependency_impacts;

CREATE POLICY policy_dependency_impacts_select ON dependency_impacts
    FOR SELECT TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY policy_dependency_impacts_insert ON dependency_impacts
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY policy_dependency_impacts_update ON dependency_impacts
    FOR UPDATE TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY policy_dependency_impacts_delete ON dependency_impacts
    FOR DELETE TO authenticated
    USING (is_deleted = FALSE);
