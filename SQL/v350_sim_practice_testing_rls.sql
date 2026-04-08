-- ============================================================================
-- Simulator — Practice Testing & Defects RLS
-- Version: v350
-- Prerequisites: v347–v349, sim.get_current_user_id() (v242)
-- Date: 2026-03-27
-- ============================================================================

GRANT USAGE, SELECT ON SEQUENCE sim.practice_test_case_ref_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE sim.practice_defect_ref_seq TO authenticated;

GRANT SELECT, INSERT, UPDATE ON sim.practice_test_suites TO authenticated;
GRANT SELECT, INSERT, UPDATE ON sim.practice_test_cases TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.practice_test_case_steps TO authenticated;
GRANT SELECT, INSERT, UPDATE ON sim.practice_test_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON sim.practice_test_case_executions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON sim.practice_defects TO authenticated;
GRANT SELECT, INSERT, UPDATE ON sim.practice_defect_comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.practice_defect_attachments TO authenticated;
GRANT SELECT, INSERT ON sim.practice_defect_history TO authenticated;

ALTER TABLE sim.practice_test_suites ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_test_case_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_test_case_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_defects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_defect_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_defect_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_defect_history ENABLE ROW LEVEL SECURITY;

-- Helper: practice project owned by current user (matches v242 pattern)
DROP POLICY IF EXISTS policy_practice_test_suites_all ON sim.practice_test_suites;
CREATE POLICY policy_practice_test_suites_all ON sim.practice_test_suites
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = practice_test_suites.practice_project_id
        AND pp.user_id = sim.get_current_user_id()
        AND COALESCE(pp.is_deleted, false) = false
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = practice_test_suites.practice_project_id
        AND pp.user_id = sim.get_current_user_id()
    )
  );

DROP POLICY IF EXISTS policy_practice_test_cases_all ON sim.practice_test_cases;
CREATE POLICY policy_practice_test_cases_all ON sim.practice_test_cases
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = practice_test_cases.practice_project_id
        AND pp.user_id = sim.get_current_user_id()
        AND COALESCE(pp.is_deleted, false) = false
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = practice_test_cases.practice_project_id
        AND pp.user_id = sim.get_current_user_id()
    )
  );

DROP POLICY IF EXISTS policy_practice_test_case_steps_all ON sim.practice_test_case_steps;
CREATE POLICY policy_practice_test_case_steps_all ON sim.practice_test_case_steps
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.practice_test_cases tc
      JOIN sim.practice_projects pp ON pp.id = tc.practice_project_id
      WHERE tc.id = practice_test_case_steps.test_case_id
        AND pp.user_id = sim.get_current_user_id()
        AND COALESCE(pp.is_deleted, false) = false
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.practice_test_cases tc
      JOIN sim.practice_projects pp ON pp.id = tc.practice_project_id
      WHERE tc.id = practice_test_case_steps.test_case_id
        AND pp.user_id = sim.get_current_user_id()
    )
  );

DROP POLICY IF EXISTS policy_practice_test_runs_all ON sim.practice_test_runs;
CREATE POLICY policy_practice_test_runs_all ON sim.practice_test_runs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = practice_test_runs.practice_project_id
        AND pp.user_id = sim.get_current_user_id()
        AND COALESCE(pp.is_deleted, false) = false
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = practice_test_runs.practice_project_id
        AND pp.user_id = sim.get_current_user_id()
    )
  );

DROP POLICY IF EXISTS policy_practice_tce_all ON sim.practice_test_case_executions;
CREATE POLICY policy_practice_tce_all ON sim.practice_test_case_executions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = practice_test_case_executions.practice_project_id
        AND pp.user_id = sim.get_current_user_id()
        AND COALESCE(pp.is_deleted, false) = false
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = practice_test_case_executions.practice_project_id
        AND pp.user_id = sim.get_current_user_id()
    )
  );

DROP POLICY IF EXISTS policy_practice_defects_all ON sim.practice_defects;
CREATE POLICY policy_practice_defects_all ON sim.practice_defects
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = practice_defects.practice_project_id
        AND pp.user_id = sim.get_current_user_id()
        AND COALESCE(pp.is_deleted, false) = false
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = practice_defects.practice_project_id
        AND pp.user_id = sim.get_current_user_id()
    )
  );

DROP POLICY IF EXISTS policy_practice_defect_comments_all ON sim.practice_defect_comments;
CREATE POLICY policy_practice_defect_comments_all ON sim.practice_defect_comments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.practice_defects d
      JOIN sim.practice_projects pp ON pp.id = d.practice_project_id
      WHERE d.id = practice_defect_comments.defect_id
        AND pp.user_id = sim.get_current_user_id()
        AND COALESCE(pp.is_deleted, false) = false
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.practice_defects d
      JOIN sim.practice_projects pp ON pp.id = d.practice_project_id
      WHERE d.id = practice_defect_comments.defect_id
        AND pp.user_id = sim.get_current_user_id()
    )
  );

DROP POLICY IF EXISTS policy_practice_defect_attachments_all ON sim.practice_defect_attachments;
CREATE POLICY policy_practice_defect_attachments_all ON sim.practice_defect_attachments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.practice_defects d
      JOIN sim.practice_projects pp ON pp.id = d.practice_project_id
      WHERE d.id = practice_defect_attachments.defect_id
        AND pp.user_id = sim.get_current_user_id()
        AND COALESCE(pp.is_deleted, false) = false
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.practice_defects d
      JOIN sim.practice_projects pp ON pp.id = d.practice_project_id
      WHERE d.id = practice_defect_attachments.defect_id
        AND pp.user_id = sim.get_current_user_id()
    )
  );

DROP POLICY IF EXISTS policy_practice_defect_history_select ON sim.practice_defect_history;
CREATE POLICY policy_practice_defect_history_select ON sim.practice_defect_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.practice_defects d
      JOIN sim.practice_projects pp ON pp.id = d.practice_project_id
      WHERE d.id = practice_defect_history.defect_id
        AND pp.user_id = sim.get_current_user_id()
        AND COALESCE(pp.is_deleted, false) = false
    )
  );

DROP POLICY IF EXISTS policy_practice_defect_history_insert ON sim.practice_defect_history;
CREATE POLICY policy_practice_defect_history_insert ON sim.practice_defect_history
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.practice_defects d
      JOIN sim.practice_projects pp ON pp.id = d.practice_project_id
      WHERE d.id = practice_defect_history.defect_id
        AND pp.user_id = sim.get_current_user_id()
    )
  );
