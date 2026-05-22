-- =============================================================================
-- v592a: Portfolio manager — scoped UPDATE for programme & project managers
-- Plan: v592_Decoupled_Manager_Member_Assignment_Plan.md
-- =============================================================================

-- Programmes: portfolio manager may set programme_manager_user_id for programmes in their portfolios
DROP POLICY IF EXISTS programmes_update_portfolio_manager ON public.programmes;
CREATE POLICY programmes_update_portfolio_manager ON public.programmes
  FOR UPDATE
  TO authenticated
  USING (
    is_deleted = FALSE
    AND portfolio_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.portfolios p
      INNER JOIN public.users u ON u.id = p.portfolio_manager_user_id
      WHERE p.id = programmes.portfolio_id
        AND p.is_deleted = FALSE
        AND u.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    is_deleted = FALSE
    AND portfolio_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.portfolios p
      INNER JOIN public.users u ON u.id = p.portfolio_manager_user_id
      WHERE p.id = programmes.portfolio_id
        AND p.is_deleted = FALSE
        AND u.auth_user_id = auth.uid()
    )
  );

-- Projects: portfolio manager may set project_manager_user_id for projects in programmes under their portfolios
DROP POLICY IF EXISTS projects_update_portfolio_manager ON public.projects;
CREATE POLICY projects_update_portfolio_manager ON public.projects
  FOR UPDATE
  TO authenticated
  USING (
    is_deleted = FALSE
    AND EXISTS (
      SELECT 1
      FROM public.programme_projects pp
      INNER JOIN public.programmes prog ON prog.id = pp.programme_id AND prog.is_deleted = FALSE
      INNER JOIN public.portfolios p ON p.id = prog.portfolio_id AND p.is_deleted = FALSE
      INNER JOIN public.users u ON u.id = p.portfolio_manager_user_id
      WHERE pp.project_id = projects.id
        AND (pp.is_deleted = FALSE OR pp.is_deleted IS NULL)
        AND u.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    is_deleted = FALSE
    AND EXISTS (
      SELECT 1
      FROM public.programme_projects pp
      INNER JOIN public.programmes prog ON prog.id = pp.programme_id AND prog.is_deleted = FALSE
      INNER JOIN public.portfolios p ON p.id = prog.portfolio_id AND p.is_deleted = FALSE
      INNER JOIN public.users u ON u.id = p.portfolio_manager_user_id
      WHERE pp.project_id = projects.id
        AND (pp.is_deleted = FALSE OR pp.is_deleted IS NULL)
        AND u.auth_user_id = auth.uid()
    )
  );
