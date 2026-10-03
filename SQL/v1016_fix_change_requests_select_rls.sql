-- ============================================================================
-- v1016: Fix HTTP 500 on change_requests, project_milestones, and
-- organisation_branding SELECT (RLS)
-- ============================================================================
-- New Change Summary / Milestones dashboard widgets got HTTP 500 on simple
-- project_id + status filtered SELECTs against change_requests and
-- project_milestones — even though the exact same queries succeed via the
-- service-role key (which bypasses RLS entirely). That isolates the failure to
-- RLS *evaluation* under the authenticated role, not a query-syntax problem.
--
-- Root cause: both tables' existing SELECT policies (v478 for change_requests;
-- v18/v139 for project_milestones) JOIN through public.users / public.user_roles /
-- public.accounts directly, WITHOUT disabling row_security — so those nested table
-- reads are themselves subject to RLS. This codebase has a long, well-documented
-- history of exactly this failure mode cascading through nested policies (16 prior
-- "fix RLS recursion" migrations exist: v81, v89, v92-100, v104, v108, v134-136,
-- v818, v886, v891). Rather than trace which specific nested policy is currently
-- broken, this reuses the SAME proven-safe pattern already used successfully by
-- can_access_project_budget() (v481, v268) and auth_user_can_access_project()
-- (v841, v406) — both SECURITY DEFINER with `SET row_security = off`, so the
-- nested table reads they perform are NOT subject to RLS at all, sidestepping the
-- whole class of bug. auth_user_can_access_project() already covers PMO/admin,
-- named project manager, project_memberships, user_projects, and user_roles.
-- ============================================================================

DROP POLICY IF EXISTS policy_change_requests_auth_select ON public.change_requests;
DROP POLICY IF EXISTS policy_change_requests_select_account_scope ON public.change_requests;
DROP POLICY IF EXISTS policy_change_requests_select_project_manager_scope ON public.change_requests;
DROP POLICY IF EXISTS policy_change_requests_select_v1016 ON public.change_requests;

CREATE POLICY policy_change_requests_select_v1016 ON public.change_requests
  FOR SELECT
  TO authenticated
  USING (
    is_deleted = FALSE
    AND public.auth_user_can_access_project(change_requests.project_id)
  );

COMMENT ON POLICY policy_change_requests_select_v1016 ON public.change_requests IS
  'v1016: replaces v478''s three overlapping SELECT policies (one had a role_name typo, all joined through users/user_roles subject to RLS). Reuses auth_user_can_access_project() (SECURITY DEFINER, row_security off) instead.';

-- project_milestones: same failure mode (fetchProjectMilestones() in ganttService.js,
-- used by PmMilestonesWidget) — the v18/v18_clean/v139-era policy joins through
-- `projects` without disabling row_security. Note: this is the OLDER Gantt-era
-- milestones table, distinct from the newer public.milestones (v966w/v966x, Phase 11
-- Milestone Register) — not touched here, different table, not implicated in this bug.

DROP POLICY IF EXISTS project_milestones_select_policy ON public.project_milestones;

CREATE POLICY project_milestones_select_policy ON public.project_milestones
  FOR SELECT
  TO authenticated
  USING (
    is_deleted = FALSE
    AND public.auth_user_can_access_project(project_milestones.project_id)
  );

-- organisation_branding: same failure mode, but account-scoped rather than
-- project-scoped, so auth_user_can_access_project() doesn't apply — v315's policy
-- (account owner OR project member of the account) joins through users/projects/
-- user_roles without disabling row_security. No existing generic
-- "can this user access this account" helper was found, so this adds one, same
-- safe pattern, same semantics as v315 (not expanding who can see branding).

CREATE OR REPLACE FUNCTION public.auth_user_can_access_account(p_account_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
SET row_security = off
AS $$
  SELECT
    p_account_id IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM public.accounts a
        JOIN public.users u ON u.id = a.owner_user_id
        WHERE a.id = p_account_id
          AND u.auth_user_id = auth.uid()
          AND COALESCE(a.is_deleted, FALSE) = FALSE
      )
      OR EXISTS (
        SELECT 1
        FROM public.projects p
        JOIN public.user_roles ur ON ur.project_id = p.id
        JOIN public.users u ON u.id = ur.user_id
        WHERE p.account_id = p_account_id
          AND u.auth_user_id = auth.uid()
          AND COALESCE(p.is_deleted, FALSE) = FALSE
          AND COALESCE(ur.is_deleted, FALSE) = FALSE
          AND ur.is_active = TRUE
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.auth_user_can_access_account(UUID) TO authenticated;

COMMENT ON FUNCTION public.auth_user_can_access_account(UUID) IS
  'v1016: TRUE if user owns the account or holds an active project-scoped role on a project in it. SECURITY DEFINER + row_security off so nested reads are not themselves subject to RLS — same pattern as auth_user_can_access_project() (v841).';

DROP POLICY IF EXISTS "organisation_branding_select_own_account" ON public.organisation_branding;
CREATE POLICY "organisation_branding_select_own_account"
  ON public.organisation_branding FOR SELECT
  USING (public.auth_user_can_access_account(account_id));

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1016: change_requests + project_milestones + organisation_branding SELECT RLS fixed';
  RAISE NOTICE '================================================';
END $$;
