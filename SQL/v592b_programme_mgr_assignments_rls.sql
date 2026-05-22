-- =============================================================================
-- v592b: Programme manager — scoped UPDATE for project managers
-- Plan: v592_Decoupled_Manager_Member_Assignment_Plan.md
-- =============================================================================

DROP POLICY IF EXISTS projects_update_programme_manager ON public.projects;
CREATE POLICY projects_update_programme_manager ON public.projects
  FOR UPDATE
  TO authenticated
  USING (
    is_deleted = FALSE
    AND EXISTS (
      SELECT 1
      FROM public.programme_projects pp
      INNER JOIN public.programmes prog ON prog.id = pp.programme_id AND prog.is_deleted = FALSE
      INNER JOIN public.users u ON u.id = prog.programme_manager_user_id
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
      INNER JOIN public.users u ON u.id = prog.programme_manager_user_id
      WHERE pp.project_id = projects.id
        AND (pp.is_deleted = FALSE OR pp.is_deleted IS NULL)
        AND u.auth_user_id = auth.uid()
    )
  );
