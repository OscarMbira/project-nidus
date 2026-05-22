-- =============================================================================
-- v592c: Simulator — portfolio / programme manager scoped manager field updates
-- Plan: v592_Decoupled_Manager_Member_Assignment_Plan.md
-- =============================================================================

-- Portfolio manager may update programme_manager on programmes in portfolios they manage
DROP POLICY IF EXISTS practice_programmes_portfolio_mgr_manager_update ON sim.practice_programmes;
CREATE POLICY practice_programmes_portfolio_mgr_manager_update ON sim.practice_programmes
  FOR UPDATE
  TO authenticated
  USING (
    is_deleted = FALSE
    AND practice_portfolio_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM sim.practice_portfolios pf
      WHERE pf.id = practice_programmes.practice_portfolio_id
        AND pf.is_deleted = FALSE
        AND pf.portfolio_manager_user_id = auth.uid()
    )
  )
  WITH CHECK (
    is_deleted = FALSE
    AND practice_portfolio_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM sim.practice_portfolios pf
      WHERE pf.id = practice_programmes.practice_portfolio_id
        AND pf.is_deleted = FALSE
        AND pf.portfolio_manager_user_id = auth.uid()
    )
  );

-- Portfolio manager may update project_manager on projects linked to programmes in their portfolios
DROP POLICY IF EXISTS practice_projects_portfolio_mgr_manager_update ON sim.practice_projects;
CREATE POLICY practice_projects_portfolio_mgr_manager_update ON sim.practice_projects
  FOR UPDATE
  TO authenticated
  USING (
    is_deleted = FALSE
    AND EXISTS (
      SELECT 1
      FROM sim.practice_programme_projects ppp
      INNER JOIN sim.practice_programmes prog ON prog.id = ppp.practice_programme_id AND prog.is_deleted = FALSE
      INNER JOIN sim.practice_portfolios pf ON pf.id = prog.practice_portfolio_id AND pf.is_deleted = FALSE
      WHERE ppp.practice_project_id = practice_projects.id
        AND ppp.assignment_status = 'active'
        AND pf.portfolio_manager_user_id = auth.uid()
    )
  )
  WITH CHECK (
    is_deleted = FALSE
    AND EXISTS (
      SELECT 1
      FROM sim.practice_programme_projects ppp
      INNER JOIN sim.practice_programmes prog ON prog.id = ppp.practice_programme_id AND prog.is_deleted = FALSE
      INNER JOIN sim.practice_portfolios pf ON pf.id = prog.practice_portfolio_id AND pf.is_deleted = FALSE
      WHERE ppp.practice_project_id = practice_projects.id
        AND ppp.assignment_status = 'active'
        AND pf.portfolio_manager_user_id = auth.uid()
    )
  );

-- Programme manager may update project_manager on projects in their programmes
DROP POLICY IF EXISTS practice_projects_programme_mgr_manager_update ON sim.practice_projects;
CREATE POLICY practice_projects_programme_mgr_manager_update ON sim.practice_projects
  FOR UPDATE
  TO authenticated
  USING (
    is_deleted = FALSE
    AND EXISTS (
      SELECT 1
      FROM sim.practice_programme_projects ppp
      INNER JOIN sim.practice_programmes prog ON prog.id = ppp.practice_programme_id AND prog.is_deleted = FALSE
      WHERE ppp.practice_project_id = practice_projects.id
        AND ppp.assignment_status = 'active'
        AND prog.programme_manager_user_id = auth.uid()
    )
  )
  WITH CHECK (
    is_deleted = FALSE
    AND EXISTS (
      SELECT 1
      FROM sim.practice_programme_projects ppp
      INNER JOIN sim.practice_programmes prog ON prog.id = ppp.practice_programme_id AND prog.is_deleted = FALSE
      WHERE ppp.practice_project_id = practice_projects.id
        AND ppp.assignment_status = 'active'
        AND prog.programme_manager_user_id = auth.uid()
    )
  );
