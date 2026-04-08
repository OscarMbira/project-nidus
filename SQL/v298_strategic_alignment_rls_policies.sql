-- =====================================================
-- v298: Strategic Alignment tables – RLS policies and grants
-- =====================================================
-- Fixes 403 Forbidden when loading Strategy (objectives, alignment, etc.).
-- v41 enabled RLS on these tables but did not create policies; this adds them.
-- =====================================================

-- strategic_objectives
GRANT SELECT, INSERT, UPDATE, DELETE ON strategic_objectives TO authenticated;

DROP POLICY IF EXISTS policy_strategic_objectives_select ON strategic_objectives;
DROP POLICY IF EXISTS policy_strategic_objectives_insert ON strategic_objectives;
DROP POLICY IF EXISTS policy_strategic_objectives_update ON strategic_objectives;
DROP POLICY IF EXISTS policy_strategic_objectives_delete ON strategic_objectives;

CREATE POLICY policy_strategic_objectives_select ON strategic_objectives
    FOR SELECT TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY policy_strategic_objectives_insert ON strategic_objectives
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY policy_strategic_objectives_update ON strategic_objectives
    FOR UPDATE TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY policy_strategic_objectives_delete ON strategic_objectives
    FOR DELETE TO authenticated
    USING (is_deleted = FALSE);

-- objective_hierarchies
GRANT SELECT, INSERT, UPDATE, DELETE ON objective_hierarchies TO authenticated;

DROP POLICY IF EXISTS policy_objective_hierarchies_select ON objective_hierarchies;
DROP POLICY IF EXISTS policy_objective_hierarchies_insert ON objective_hierarchies;
DROP POLICY IF EXISTS policy_objective_hierarchies_update ON objective_hierarchies;
DROP POLICY IF EXISTS policy_objective_hierarchies_delete ON objective_hierarchies;

CREATE POLICY policy_objective_hierarchies_select ON objective_hierarchies
    FOR SELECT TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY policy_objective_hierarchies_insert ON objective_hierarchies
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY policy_objective_hierarchies_update ON objective_hierarchies
    FOR UPDATE TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY policy_objective_hierarchies_delete ON objective_hierarchies
    FOR DELETE TO authenticated
    USING (is_deleted = FALSE);

-- project_objective_mappings
GRANT SELECT, INSERT, UPDATE, DELETE ON project_objective_mappings TO authenticated;

DROP POLICY IF EXISTS policy_project_objective_mappings_select ON project_objective_mappings;
DROP POLICY IF EXISTS policy_project_objective_mappings_insert ON project_objective_mappings;
DROP POLICY IF EXISTS policy_project_objective_mappings_update ON project_objective_mappings;
DROP POLICY IF EXISTS policy_project_objective_mappings_delete ON project_objective_mappings;

CREATE POLICY policy_project_objective_mappings_select ON project_objective_mappings
    FOR SELECT TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY policy_project_objective_mappings_insert ON project_objective_mappings
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY policy_project_objective_mappings_update ON project_objective_mappings
    FOR UPDATE TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY policy_project_objective_mappings_delete ON project_objective_mappings
    FOR DELETE TO authenticated
    USING (is_deleted = FALSE);

-- strategic_contributions
GRANT SELECT, INSERT, UPDATE, DELETE ON strategic_contributions TO authenticated;

DROP POLICY IF EXISTS policy_strategic_contributions_select ON strategic_contributions;
DROP POLICY IF EXISTS policy_strategic_contributions_insert ON strategic_contributions;
DROP POLICY IF EXISTS policy_strategic_contributions_update ON strategic_contributions;
DROP POLICY IF EXISTS policy_strategic_contributions_delete ON strategic_contributions;

CREATE POLICY policy_strategic_contributions_select ON strategic_contributions
    FOR SELECT TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY policy_strategic_contributions_insert ON strategic_contributions
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY policy_strategic_contributions_update ON strategic_contributions
    FOR UPDATE TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY policy_strategic_contributions_delete ON strategic_contributions
    FOR DELETE TO authenticated
    USING (is_deleted = FALSE);

-- alignment_scores
GRANT SELECT, INSERT, UPDATE, DELETE ON alignment_scores TO authenticated;

DROP POLICY IF EXISTS policy_alignment_scores_select ON alignment_scores;
DROP POLICY IF EXISTS policy_alignment_scores_insert ON alignment_scores;
DROP POLICY IF EXISTS policy_alignment_scores_update ON alignment_scores;
DROP POLICY IF EXISTS policy_alignment_scores_delete ON alignment_scores;

CREATE POLICY policy_alignment_scores_select ON alignment_scores
    FOR SELECT TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY policy_alignment_scores_insert ON alignment_scores
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY policy_alignment_scores_update ON alignment_scores
    FOR UPDATE TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY policy_alignment_scores_delete ON alignment_scores
    FOR DELETE TO authenticated
    USING (is_deleted = FALSE);

-- strategic_reports
GRANT SELECT, INSERT, UPDATE, DELETE ON strategic_reports TO authenticated;

DROP POLICY IF EXISTS policy_strategic_reports_select ON strategic_reports;
DROP POLICY IF EXISTS policy_strategic_reports_insert ON strategic_reports;
DROP POLICY IF EXISTS policy_strategic_reports_update ON strategic_reports;
DROP POLICY IF EXISTS policy_strategic_reports_delete ON strategic_reports;

CREATE POLICY policy_strategic_reports_select ON strategic_reports
    FOR SELECT TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY policy_strategic_reports_insert ON strategic_reports
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY policy_strategic_reports_update ON strategic_reports
    FOR UPDATE TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY policy_strategic_reports_delete ON strategic_reports
    FOR DELETE TO authenticated
    USING (is_deleted = FALSE);

-- Success
DO $$
BEGIN
    RAISE NOTICE 'v298: Strategic alignment RLS policies and grants applied (strategic_objectives, objective_hierarchies, project_objective_mappings, strategic_contributions, alignment_scores, strategic_reports).';
END $$;
