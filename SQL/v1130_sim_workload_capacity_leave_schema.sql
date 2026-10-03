-- ============================================================================
-- v1130: sim schema workload capacity + leave calendar (Simulator parity for v643/v1129)
-- (This file was originally written as v1125, renamed to v1130 to resolve a filename
-- collision with unrelated concurrent work — content unchanged.)
-- ============================================================================
-- projectplan/v1109_team_skills_capacity_leave_plan.md Phase 0.
-- Genuinely new for Simulator — sim schema never had capacity/leave tables. RLS is correct from
-- the start (no legacy self-only bug to fix, unlike v1129's Platform fix). sim.skill_categories/
-- skill_catalog/member_skills already exist (v963r) and get the same SELECT-broadening treatment
-- as public's did in v1129.
-- ============================================================================

CREATE TABLE IF NOT EXISTS sim.workload_capacity_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  practice_project_id UUID REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hours_per_day NUMERIC(5,2) NOT NULL DEFAULT 8,
  hours_per_week NUMERIC(6,2) NOT NULL DEFAULT 40,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_sim_workload_capacity_user
  ON sim.workload_capacity_settings (user_id, practice_project_id) WHERE is_deleted = FALSE;

CREATE TABLE IF NOT EXISTS sim.workload_leave_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  leave_type VARCHAR(40) NOT NULL
    CHECK (leave_type IN ('annual_leave', 'public_holiday', 'sick_leave', 'training', 'other')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT chk_sim_workload_leave_dates CHECK (end_date >= start_date)
);
CREATE INDEX IF NOT EXISTS idx_sim_workload_leave_user_dates
  ON sim.workload_leave_calendar (user_id, start_date, end_date) WHERE is_deleted = FALSE;

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('sim.workload_capacity_settings', 'Simulator per-user practice-project capacity (hours/day, hours/week) (v1109/v1130)', false, true),
  ('sim.workload_leave_calendar', 'Simulator per-user leave entries (v1109/v1130)', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

-- ----------------------------------------------------------------------------
-- Helper: does the target user (by auth uid) share an active practice project with the caller?
-- Mirrors the ownership-OR-active-membership pattern already used for sim.practice_constraints
-- etc. (v1132) — a raw join, since both practice_project_memberships.user_id and
-- practice_projects.user_id already reference auth.users(id) directly in this schema.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auth_user_shares_practice_project_with(p_target_auth_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    -- both caller and target are active members of the same practice project
    SELECT 1
    FROM sim.practice_project_memberships m_target
    JOIN sim.practice_project_memberships m_caller
      ON m_caller.practice_project_id = m_target.practice_project_id
    WHERE m_target.user_id = p_target_auth_user_id
      AND m_target.is_active = TRUE
      AND m_caller.user_id = auth.uid()
      AND m_caller.is_active = TRUE
  )
  OR EXISTS (
    -- caller owns a practice project the target is an active member of
    SELECT 1
    FROM sim.practice_projects pp
    JOIN sim.practice_project_memberships m_target ON m_target.practice_project_id = pp.id
    WHERE pp.user_id = auth.uid()
      AND m_target.user_id = p_target_auth_user_id
      AND m_target.is_active = TRUE
  )
  OR EXISTS (
    -- target owns a practice project the caller is an active member of
    SELECT 1
    FROM sim.practice_projects pp
    JOIN sim.practice_project_memberships m_caller ON m_caller.practice_project_id = pp.id
    WHERE pp.user_id = p_target_auth_user_id
      AND m_caller.user_id = auth.uid()
      AND m_caller.is_active = TRUE
  );
$$;

GRANT EXECUTE ON FUNCTION public.auth_user_shares_practice_project_with(UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- RLS: sim.workload_capacity_settings / sim.workload_leave_calendar
-- ----------------------------------------------------------------------------
ALTER TABLE sim.workload_capacity_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.workload_capacity_settings TO authenticated;
GRANT ALL ON sim.workload_capacity_settings TO service_role;

CREATE POLICY policy_sim_workload_capacity_select ON sim.workload_capacity_settings
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.auth_user_shares_practice_project_with(user_id));
CREATE POLICY policy_sim_workload_capacity_insert ON sim.workload_capacity_settings
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.is_user_pmo_admin(auth.uid()));
CREATE POLICY policy_sim_workload_capacity_update ON sim.workload_capacity_settings
  FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_user_pmo_admin(auth.uid())) WITH CHECK (user_id = auth.uid() OR public.is_user_pmo_admin(auth.uid()));
CREATE POLICY policy_sim_workload_capacity_delete ON sim.workload_capacity_settings
  FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_user_pmo_admin(auth.uid()));

ALTER TABLE sim.workload_leave_calendar ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.workload_leave_calendar TO authenticated;
GRANT ALL ON sim.workload_leave_calendar TO service_role;

CREATE POLICY policy_sim_workload_leave_select ON sim.workload_leave_calendar
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.auth_user_shares_practice_project_with(user_id));
CREATE POLICY policy_sim_workload_leave_insert ON sim.workload_leave_calendar
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.is_user_pmo_admin(auth.uid()));
CREATE POLICY policy_sim_workload_leave_update ON sim.workload_leave_calendar
  FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_user_pmo_admin(auth.uid())) WITH CHECK (user_id = auth.uid() OR public.is_user_pmo_admin(auth.uid()));
CREATE POLICY policy_sim_workload_leave_delete ON sim.workload_leave_calendar
  FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_user_pmo_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- sim.skill_categories / sim.skill_catalog / sim.member_skills: broaden SELECT the same way
-- v1129 did for the public schema originals — verify the existing policy names from v963r before
-- dropping (may differ from public's naming).
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'sim' AND tablename IN ('skill_categories', 'skill_catalog', 'member_skills')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON sim.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

CREATE POLICY policy_sim_skill_categories_select ON sim.skill_categories
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY policy_sim_skill_categories_write ON sim.skill_categories
  FOR INSERT TO authenticated WITH CHECK (public.is_user_pmo_admin(auth.uid()));
CREATE POLICY policy_sim_skill_categories_update ON sim.skill_categories
  FOR UPDATE TO authenticated
  USING (public.is_user_pmo_admin(auth.uid())) WITH CHECK (public.is_user_pmo_admin(auth.uid()));
CREATE POLICY policy_sim_skill_categories_delete ON sim.skill_categories
  FOR DELETE TO authenticated USING (public.is_user_pmo_admin(auth.uid()));

CREATE POLICY policy_sim_skill_catalog_select ON sim.skill_catalog
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY policy_sim_skill_catalog_write ON sim.skill_catalog
  FOR INSERT TO authenticated WITH CHECK (public.is_user_pmo_admin(auth.uid()));
CREATE POLICY policy_sim_skill_catalog_update ON sim.skill_catalog
  FOR UPDATE TO authenticated
  USING (public.is_user_pmo_admin(auth.uid())) WITH CHECK (public.is_user_pmo_admin(auth.uid()));
CREATE POLICY policy_sim_skill_catalog_delete ON sim.skill_catalog
  FOR DELETE TO authenticated USING (public.is_user_pmo_admin(auth.uid()));

CREATE POLICY policy_sim_member_skills_select ON sim.member_skills
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.auth_user_shares_practice_project_with(user_id));
CREATE POLICY policy_sim_member_skills_insert ON sim.member_skills
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.is_user_pmo_admin(auth.uid()));
CREATE POLICY policy_sim_member_skills_update ON sim.member_skills
  FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_user_pmo_admin(auth.uid())) WITH CHECK (user_id = auth.uid() OR public.is_user_pmo_admin(auth.uid()));
CREATE POLICY policy_sim_member_skills_delete ON sim.member_skills
  FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_user_pmo_admin(auth.uid()));

DO $$ BEGIN
  RAISE NOTICE 'v1130_sim_workload_capacity_leave_schema.sql applied successfully';
END $$;
