-- ============================================================================
-- v963x: RLS — project_calendars / project_calendar_exceptions (+ sim mirror)
-- Follows the same read (member OR pmo/admin) + write (can_write_pm_planning_document) pattern
-- as v364_schedule_management_plans_rls.sql for the Platform planning-document tables.
--
-- CORRECTED after a failed run (ERROR 42883: function public.can_write_pm_planning_document(uuid)
-- does not exist). That function is defined in v356_scope_management_plans_rls.sql, not in this
-- file — this migration assumed v356 (a much older, pre-v963 migration) had already been run
-- against this database, which it evidently had not been. Re-declaring it here (CREATE OR
-- REPLACE, identical definition to v356) removes that silent undeclared prerequisite so this
-- file no longer depends on migration order outside itself; safe to run even if v356 already
-- created it elsewhere.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.can_write_pm_planning_document(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    JOIN users u ON u.id = ur.user_id
    WHERE u.auth_user_id = auth.uid()
      AND r.role_name IN ('pmo_admin', 'system_admin', 'account_owner', 'System Admin')
      AND ur.is_active = TRUE AND COALESCE(ur.is_deleted, FALSE) = FALSE
  )
  OR EXISTS (
    SELECT 1 FROM project_memberships pm
    JOIN project_roles pr ON pr.id = pm.project_role_id
    JOIN users u ON u.id = pm.user_id
    WHERE pm.project_id = p_project_id
      AND u.auth_user_id = auth.uid()
      AND pr.role_name IN ('portfolio_manager', 'programme_manager', 'project_manager')
      AND pm.is_active = TRUE
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_write_pm_planning_document(UUID) TO authenticated;

-- ── Platform (public schema) ────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_calendars TO authenticated;
ALTER TABLE public.project_calendars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_calendars_select ON public.project_calendars;
DROP POLICY IF EXISTS project_calendars_insert ON public.project_calendars;
DROP POLICY IF EXISTS project_calendars_update ON public.project_calendars;
DROP POLICY IF EXISTS project_calendars_delete ON public.project_calendars;

CREATE POLICY project_calendars_select ON public.project_calendars
  FOR SELECT TO authenticated
  USING (
    is_deleted = FALSE
    AND (
      EXISTS (
        SELECT 1 FROM public.project_memberships pm
        JOIN public.users u ON u.id = pm.user_id
        WHERE pm.project_id = project_calendars.project_id
          AND u.auth_user_id = auth.uid() AND pm.is_active = TRUE
      )
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        JOIN public.users u ON u.id = ur.user_id
        WHERE u.auth_user_id = auth.uid()
          AND r.role_name IN ('pmo_admin', 'system_admin', 'account_owner', 'System Admin')
          AND ur.is_active = TRUE AND COALESCE(ur.is_deleted, FALSE) = FALSE
      )
    )
  );

CREATE POLICY project_calendars_insert ON public.project_calendars
  FOR INSERT TO authenticated
  WITH CHECK (public.can_write_pm_planning_document(project_id) = TRUE);

CREATE POLICY project_calendars_update ON public.project_calendars
  FOR UPDATE TO authenticated
  USING (is_deleted = FALSE AND public.can_write_pm_planning_document(project_id) = TRUE)
  WITH CHECK (public.can_write_pm_planning_document(project_id) = TRUE);

CREATE POLICY project_calendars_delete ON public.project_calendars
  FOR DELETE TO authenticated
  USING (public.can_write_pm_planning_document(project_id) = TRUE);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_calendar_exceptions TO authenticated;
ALTER TABLE public.project_calendar_exceptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_calendar_exceptions_select ON public.project_calendar_exceptions;
DROP POLICY IF EXISTS project_calendar_exceptions_insert ON public.project_calendar_exceptions;
DROP POLICY IF EXISTS project_calendar_exceptions_update ON public.project_calendar_exceptions;
DROP POLICY IF EXISTS project_calendar_exceptions_delete ON public.project_calendar_exceptions;

CREATE POLICY project_calendar_exceptions_select ON public.project_calendar_exceptions
  FOR SELECT TO authenticated
  USING (
    is_deleted = FALSE
    AND (
      EXISTS (
        SELECT 1 FROM public.project_memberships pm
        JOIN public.users u ON u.id = pm.user_id
        WHERE pm.project_id = project_calendar_exceptions.project_id
          AND u.auth_user_id = auth.uid() AND pm.is_active = TRUE
      )
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        JOIN public.users u ON u.id = ur.user_id
        WHERE u.auth_user_id = auth.uid()
          AND r.role_name IN ('pmo_admin', 'system_admin', 'account_owner', 'System Admin')
          AND ur.is_active = TRUE AND COALESCE(ur.is_deleted, FALSE) = FALSE
      )
    )
  );

CREATE POLICY project_calendar_exceptions_insert ON public.project_calendar_exceptions
  FOR INSERT TO authenticated
  WITH CHECK (public.can_write_pm_planning_document(project_id) = TRUE);

CREATE POLICY project_calendar_exceptions_update ON public.project_calendar_exceptions
  FOR UPDATE TO authenticated
  USING (is_deleted = FALSE AND public.can_write_pm_planning_document(project_id) = TRUE)
  WITH CHECK (public.can_write_pm_planning_document(project_id) = TRUE);

CREATE POLICY project_calendar_exceptions_delete ON public.project_calendar_exceptions
  FOR DELETE TO authenticated
  USING (public.can_write_pm_planning_document(project_id) = TRUE);

-- ── Simulator (sim schema) — ownership via practice_projects.user_id, matching
-- v370_sim_pm_planning_rls.sql's sim_schedp_all policy shape for schedule_management_plans ──

GRANT SELECT, INSERT, UPDATE, DELETE ON sim.project_calendars TO authenticated;
ALTER TABLE sim.project_calendars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sim_project_calendars_all ON sim.project_calendars;
CREATE POLICY sim_project_calendars_all ON sim.project_calendars FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sim.practice_projects pp
    WHERE pp.id = project_calendars.practice_project_id
      AND pp.user_id = sim.get_current_user_id()
      AND COALESCE(pp.is_deleted, false) = false
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM sim.practice_projects pp
    WHERE pp.id = practice_project_id AND pp.user_id = sim.get_current_user_id()
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON sim.project_calendar_exceptions TO authenticated;
ALTER TABLE sim.project_calendar_exceptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sim_project_calendar_exceptions_all ON sim.project_calendar_exceptions;
CREATE POLICY sim_project_calendar_exceptions_all ON sim.project_calendar_exceptions FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sim.practice_projects pp
    WHERE pp.id = project_calendar_exceptions.practice_project_id
      AND pp.user_id = sim.get_current_user_id()
      AND COALESCE(pp.is_deleted, false) = false
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM sim.practice_projects pp
    WHERE pp.id = practice_project_id AND pp.user_id = sim.get_current_user_id()
  ));

DO $$ BEGIN RAISE NOTICE 'v963x_project_calendar_rls.sql applied'; END $$;
