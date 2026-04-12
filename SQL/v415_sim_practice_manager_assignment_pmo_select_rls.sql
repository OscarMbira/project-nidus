-- ============================================================================
-- v415: sim practice_projects / programmes / portfolios — PMO read for workload counts
-- Date: 2026-04-09
--
-- Problem:
--   Platform "Manager assignments" calls getSimActiveAssignmentCountOnly() which runs
--   HEAD/count queries on sim.practice_projects, sim.practice_programmes, sim.practice_portfolios
--   filtered by project_manager_user_id / programme_manager_user_id / portfolio_manager_user_id.
--
--   v242 policies ("practice_*_user_access") only allow rows where user_id = sim.get_current_user_id()
--   (sim record owner). The assigned manager is a different column and often a different user.
--   PMO admins must count assignments for every eligible manager → cross-tenant reads → 403 on HEAD.
--
-- Fix:
--   Add permissive SELECT policies for authenticated users who are PMO (or system) admins via
--   public.is_pmo_admin_user() (SECURITY DEFINER, v258+). Existing owner policies unchanged.
--
-- Prerequisites: v242, public.is_pmo_admin_user()
-- ============================================================================

GRANT SELECT ON sim.practice_projects TO authenticated;
GRANT SELECT ON sim.practice_programmes TO authenticated;
GRANT SELECT ON sim.practice_portfolios TO authenticated;

-- PMO / system admin: read all practice portfolios, programmes, projects (manager workload + admin UI)
DROP POLICY IF EXISTS "practice_projects_pmo_admin_select" ON sim.practice_projects;
CREATE POLICY "practice_projects_pmo_admin_select"
  ON sim.practice_projects
  FOR SELECT
  TO authenticated
  USING (public.is_pmo_admin_user());

DROP POLICY IF EXISTS "practice_programmes_pmo_admin_select" ON sim.practice_programmes;
CREATE POLICY "practice_programmes_pmo_admin_select"
  ON sim.practice_programmes
  FOR SELECT
  TO authenticated
  USING (public.is_pmo_admin_user());

DROP POLICY IF EXISTS "practice_portfolios_pmo_admin_select" ON sim.practice_portfolios;
CREATE POLICY "practice_portfolios_pmo_admin_select"
  ON sim.practice_portfolios
  FOR SELECT
  TO authenticated
  USING (public.is_pmo_admin_user());

COMMENT ON POLICY "practice_projects_pmo_admin_select" ON sim.practice_projects IS
  'PMO admin can SELECT (incl. HEAD count) for cross-user manager assignment workload.';

COMMENT ON POLICY "practice_programmes_pmo_admin_select" ON sim.practice_programmes IS
  'PMO admin can SELECT (incl. HEAD count) for cross-user manager assignment workload.';

COMMENT ON POLICY "practice_portfolios_pmo_admin_select" ON sim.practice_portfolios IS
  'PMO admin can SELECT (incl. HEAD count) for cross-user manager assignment workload.';
