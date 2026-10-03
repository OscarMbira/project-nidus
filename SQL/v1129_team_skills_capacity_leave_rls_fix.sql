-- ============================================================================
-- v1129: Extend Skill Matrix / Capacity Planning / Leave Calendar RLS to
-- project-team visibility
-- ============================================================================
-- projectplan/v1109_team_skills_capacity_leave_plan.md Phase 0.
-- (This file was originally written as v1124, renamed to v1129 to resolve a filename
-- collision with unrelated concurrent work — content unchanged.)
-- v643/v644's original policies only let a user see their OWN member_skills/
-- workload_capacity_settings/workload_leave_calendar row, or a PMO Admin see everyone's — no
-- "project team can see each other's" rule, which defeats the purpose of a team-facing Skill
-- Matrix / Capacity Planning / Leave Calendar. skill_categories/skill_catalog (the read-only
-- reference catalog) were even PMO-Admin-only to SELECT, so nobody else could see what skills
-- exist at all.
--
-- Fix: split each policy into SELECT (broadened) vs INSERT/UPDATE/DELETE (unchanged scope — self
-- or PMO Admin only, never opened up to "any teammate can edit your row").
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper: does the target user (by auth uid) share an active project with the caller?
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auth_user_shares_project_with(p_target_auth_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users target_u
    JOIN public.user_roles ur ON ur.user_id = target_u.id
    JOIN public.projects p ON p.id = ur.project_id
    WHERE target_u.auth_user_id = p_target_auth_user_id
      AND ur.is_active = TRUE
      AND COALESCE(ur.is_deleted, FALSE) = FALSE
      AND COALESCE(p.is_deleted, FALSE) = FALSE
      AND public.auth_user_can_access_project(p.id)
  );
$$;

GRANT EXECUTE ON FUNCTION public.auth_user_shares_project_with(UUID) TO authenticated;

COMMENT ON FUNCTION public.auth_user_shares_project_with(UUID) IS
  'v1129: TRUE if p_target_auth_user_id holds an active project role on a project the calling user (auth.uid()) can also access. SECURITY DEFINER + row_security off, same pattern as auth_user_can_access_project() (v841).';

-- ----------------------------------------------------------------------------
-- skill_categories / skill_catalog: readable by any authenticated user; writes stay PMO-Admin-only
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS policy_skill_categories ON public.skill_categories;
CREATE POLICY policy_skill_categories_select ON public.skill_categories
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY policy_skill_categories_insert ON public.skill_categories
  FOR INSERT TO authenticated WITH CHECK (public.is_user_pmo_admin(auth.uid()));
CREATE POLICY policy_skill_categories_update ON public.skill_categories
  FOR UPDATE TO authenticated
  USING (public.is_user_pmo_admin(auth.uid())) WITH CHECK (public.is_user_pmo_admin(auth.uid()));
CREATE POLICY policy_skill_categories_delete ON public.skill_categories
  FOR DELETE TO authenticated USING (public.is_user_pmo_admin(auth.uid()));

DROP POLICY IF EXISTS policy_skill_catalog ON public.skill_catalog;
CREATE POLICY policy_skill_catalog_select ON public.skill_catalog
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY policy_skill_catalog_insert ON public.skill_catalog
  FOR INSERT TO authenticated WITH CHECK (public.is_user_pmo_admin(auth.uid()));
CREATE POLICY policy_skill_catalog_update ON public.skill_catalog
  FOR UPDATE TO authenticated
  USING (public.is_user_pmo_admin(auth.uid())) WITH CHECK (public.is_user_pmo_admin(auth.uid()));
CREATE POLICY policy_skill_catalog_delete ON public.skill_catalog
  FOR DELETE TO authenticated USING (public.is_user_pmo_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- member_skills: self OR PMO Admin OR project teammate may SELECT; only self OR PMO Admin may write
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS policy_member_skills ON public.member_skills;
CREATE POLICY policy_member_skills_select ON public.member_skills
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_user_pmo_admin(auth.uid())
    OR public.auth_user_shares_project_with(user_id)
  );
CREATE POLICY policy_member_skills_insert ON public.member_skills
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_user_pmo_admin(auth.uid()));
CREATE POLICY policy_member_skills_update ON public.member_skills
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_user_pmo_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_user_pmo_admin(auth.uid()));
CREATE POLICY policy_member_skills_delete ON public.member_skills
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_user_pmo_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- workload_capacity_settings: same self/admin/teammate split
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS policy_workload_capacity_own ON public.workload_capacity_settings;
CREATE POLICY policy_workload_capacity_select ON public.workload_capacity_settings
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_user_pmo_admin(auth.uid())
    OR public.auth_user_shares_project_with(user_id)
  );
CREATE POLICY policy_workload_capacity_insert ON public.workload_capacity_settings
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_user_pmo_admin(auth.uid()));
CREATE POLICY policy_workload_capacity_update ON public.workload_capacity_settings
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_user_pmo_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_user_pmo_admin(auth.uid()));
CREATE POLICY policy_workload_capacity_delete ON public.workload_capacity_settings
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_user_pmo_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- workload_leave_calendar: same self/admin/teammate split
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS policy_workload_leave_own ON public.workload_leave_calendar;
CREATE POLICY policy_workload_leave_select ON public.workload_leave_calendar
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_user_pmo_admin(auth.uid())
    OR public.auth_user_shares_project_with(user_id)
  );
CREATE POLICY policy_workload_leave_insert ON public.workload_leave_calendar
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_user_pmo_admin(auth.uid()));
CREATE POLICY policy_workload_leave_update ON public.workload_leave_calendar
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_user_pmo_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_user_pmo_admin(auth.uid()));
CREATE POLICY policy_workload_leave_delete ON public.workload_leave_calendar
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_user_pmo_admin(auth.uid()));

DO $$ BEGIN
  RAISE NOTICE 'v1129_team_skills_capacity_leave_rls_fix.sql applied successfully';
END $$;
