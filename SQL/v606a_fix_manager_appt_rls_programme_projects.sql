-- =============================================================================
-- v606a_fix_manager_appt_rls_programme_projects.sql
-- Fix v606 RLS policies that incorrectly used projects.programme_id (column does not exist).
-- Projects link to programmes via programme_projects (v37).
-- Run this if v606 failed partway through policy creation, or after updating v606.
-- =============================================================================

DROP POLICY IF EXISTS policy_manager_appt_portfolio_scope ON public.manager_appointment_records;
CREATE POLICY policy_manager_appt_portfolio_scope ON public.manager_appointment_records
  FOR SELECT TO authenticated
  USING (
    COALESCE(is_deleted, FALSE) = FALSE
    AND (
      (entity_type = 'portfolio' AND portfolio_id IN (
        SELECT id FROM public.portfolios p
        WHERE p.portfolio_manager_user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
          AND COALESCE(p.is_deleted, FALSE) = FALSE
      ))
      OR (entity_type = 'programme' AND programme_id IN (
        SELECT pr.id FROM public.programmes pr
        INNER JOIN public.portfolios pf ON pf.id = pr.portfolio_id
        WHERE pf.portfolio_manager_user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
          AND COALESCE(pr.is_deleted, FALSE) = FALSE
          AND COALESCE(pf.is_deleted, FALSE) = FALSE
      ))
      OR (entity_type = 'project' AND project_id IN (
        SELECT pp.project_id
        FROM public.programme_projects pp
        INNER JOIN public.programmes pr ON pr.id = pp.programme_id AND COALESCE(pr.is_deleted, FALSE) = FALSE
        INNER JOIN public.portfolios pf ON pf.id = pr.portfolio_id AND COALESCE(pf.is_deleted, FALSE) = FALSE
        INNER JOIN public.projects pj ON pj.id = pp.project_id AND COALESCE(pj.is_deleted, FALSE) = FALSE
        WHERE pf.portfolio_manager_user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
          AND COALESCE(pp.is_deleted, FALSE) = FALSE
      ))
    )
  );

DROP POLICY IF EXISTS policy_manager_appt_programme_scope ON public.manager_appointment_records;
CREATE POLICY policy_manager_appt_programme_scope ON public.manager_appointment_records
  FOR SELECT TO authenticated
  USING (
    COALESCE(is_deleted, FALSE) = FALSE
    AND (
      (entity_type = 'programme' AND programme_id IN (
        SELECT id FROM public.programmes pr
        WHERE pr.programme_manager_user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
          AND COALESCE(pr.is_deleted, FALSE) = FALSE
      ))
      OR (entity_type = 'project' AND project_id IN (
        SELECT pp.project_id
        FROM public.programme_projects pp
        INNER JOIN public.programmes pr ON pr.id = pp.programme_id AND COALESCE(pr.is_deleted, FALSE) = FALSE
        INNER JOIN public.projects pj ON pj.id = pp.project_id AND COALESCE(pj.is_deleted, FALSE) = FALSE
        WHERE pr.programme_manager_user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
          AND COALESCE(pp.is_deleted, FALSE) = FALSE
      ))
    )
  );

DO $$ BEGIN RAISE NOTICE 'v606a_fix_manager_appt_rls_programme_projects.sql applied'; END $$;
