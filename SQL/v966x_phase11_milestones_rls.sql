-- ============================================================================
-- v966x: Core PM Menu Rationalisation — Phase 11: Milestone Register (RLS)
-- ============================================================================
-- projectplan/v966_core_pm_menu_rationalisation_plan.md Phase 11.
--
-- public.milestones RLS mirrors SQL/v366_activity_list_rls.sql exactly (same project-scoped
-- register shape, same project_memberships convention used throughout this codebase): SELECT is
-- gated by an active project_memberships row for the signed-in user OR a broad admin/oversight
-- role; INSERT/UPDATE reuse the existing public.can_write_pm_planning_document(project_id)
-- helper (defined in SQL/v356_scope_management_plans_rls.sql, already relied on by
-- SQL/v963x_project_calendar_rls.sql and SQL/v366 itself) rather than redefining an equivalent
-- function. Soft-delete only (is_deleted flag via UPDATE) — no DELETE policy, matching the
-- codebase's dominant convention and v366's own precedent.
--
-- sim.milestones RLS mirrors SQL/v963b_assumptions_register_schema.sql's sim.assumptions
-- policies (the most recent fresh-table sim RLS precedent): a practice_projects row owned
-- directly by auth.uid() OR an active sim.practice_project_memberships row, matched directly
-- against auth.uid() (v389 convention — no join through public.users needed in sim).
--
-- Prerequisite: SQL/v966w_phase11_milestones_schema.sql (public.milestones / sim.milestones),
-- SQL/v356_scope_management_plans_rls.sql (public.can_write_pm_planning_document).
-- ============================================================================

-- ── 1. public.milestones ─────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE ON public.milestones TO authenticated;
GRANT ALL ON public.milestones TO service_role;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS milestones_select ON public.milestones;
DROP POLICY IF EXISTS milestones_insert ON public.milestones;
DROP POLICY IF EXISTS milestones_update ON public.milestones;

CREATE POLICY milestones_select ON public.milestones
  FOR SELECT TO authenticated
  USING (
    is_deleted = FALSE
    AND (
      EXISTS (
        SELECT 1 FROM public.project_memberships pm
        JOIN public.users u ON u.id = pm.user_id
        WHERE pm.project_id = milestones.project_id
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

CREATE POLICY milestones_insert ON public.milestones
  FOR INSERT TO authenticated
  WITH CHECK (public.can_write_pm_planning_document(project_id) = TRUE);

CREATE POLICY milestones_update ON public.milestones
  FOR UPDATE TO authenticated
  USING (is_deleted = FALSE AND public.can_write_pm_planning_document(project_id) = TRUE)
  WITH CHECK (public.can_write_pm_planning_document(project_id) = TRUE);

-- ── 2. sim.milestones ────────────────────────────────────────────────────────

ALTER TABLE sim.milestones ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON sim.milestones TO authenticated;
GRANT ALL ON sim.milestones TO service_role;

DROP POLICY IF EXISTS policy_sim_milestones_select ON sim.milestones;
CREATE POLICY policy_sim_milestones_select ON sim.milestones
  FOR SELECT TO authenticated
  USING (
    is_deleted = FALSE
    AND EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = milestones.project_id
        AND (pp.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM sim.practice_project_memberships m
          WHERE m.practice_project_id = pp.id AND m.user_id = auth.uid() AND m.is_active = TRUE
        ))
    )
  );

DROP POLICY IF EXISTS policy_sim_milestones_insert ON sim.milestones;
CREATE POLICY policy_sim_milestones_insert ON sim.milestones
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = milestones.project_id
        AND (pp.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM sim.practice_project_memberships m
          WHERE m.practice_project_id = pp.id AND m.user_id = auth.uid() AND m.is_active = TRUE
        ))
    )
  );

DROP POLICY IF EXISTS policy_sim_milestones_update ON sim.milestones;
CREATE POLICY policy_sim_milestones_update ON sim.milestones
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = milestones.project_id
        AND (pp.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM sim.practice_project_memberships m
          WHERE m.practice_project_id = pp.id AND m.user_id = auth.uid() AND m.is_active = TRUE
        ))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = milestones.project_id
        AND (pp.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM sim.practice_project_memberships m
          WHERE m.practice_project_id = pp.id AND m.user_id = auth.uid() AND m.is_active = TRUE
        ))
    )
  );

DO $$ BEGIN RAISE NOTICE 'v966x_phase11_milestones_rls.sql applied successfully'; END $$;
