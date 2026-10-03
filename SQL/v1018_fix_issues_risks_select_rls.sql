-- ============================================================================
-- v1018: Fix HTTP 500 on issues and risks SELECT (RLS) — same bug class as v1016
-- ============================================================================
-- Console showed a fresh 500 on `issues` after v1016 landed, and the new RAID
-- Summary dashboard widget's risk/issue counts were silently defaulting to 0
-- (caught via Promise.allSettled) rather than showing real numbers.
--
-- v820_pm_dashboard_project_memberships_rls_fix.sql already diagnosed this exact
-- failure class and its own header is explicit: "A scan found ~138 tables whose
-- RLS policies reference user_projects the same way... the other ~133 have the
-- same latent bug and should be tracked as a separate, larger remediation
-- effort." This migration is NOT that remediation — it only fixes the two tables
-- actively causing visible errors right now (issues, risks), using the same
-- auth_user_can_access_project() pattern already applied in v1016. The ~136
-- other affected tables remain a known, tracked, separate follow-up — do not
-- assume this "fixes RLS" project-wide.
--
-- issues had THREE overlapping SELECT policies (v477 x2, v820 x1), risks had ONE
-- (v820) — none disable row_security, so their nested users/project_memberships/
-- accounts reads are themselves subject to RLS.
-- ============================================================================

DROP POLICY IF EXISTS policy_issues_select_account_scope ON public.issues;
DROP POLICY IF EXISTS policy_issues_select_project_manager_scope ON public.issues;
DROP POLICY IF EXISTS policy_issues_select_project_membership ON public.issues;
DROP POLICY IF EXISTS policy_issues_select_v1018 ON public.issues;

CREATE POLICY policy_issues_select_v1018 ON public.issues
  FOR SELECT
  TO authenticated
  USING (
    is_deleted = FALSE
    AND public.auth_user_can_access_project(issues.project_id)
  );

COMMENT ON POLICY policy_issues_select_v1018 ON public.issues IS
  'v1018: replaces v477''s two + v820''s one overlapping SELECT policies. Reuses auth_user_can_access_project() (SECURITY DEFINER, row_security off) instead of raw joins subject to RLS.';

DROP POLICY IF EXISTS policy_risks_select_project_membership ON public.risks;
DROP POLICY IF EXISTS policy_risks_select_v1018 ON public.risks;

CREATE POLICY policy_risks_select_v1018 ON public.risks
  FOR SELECT
  TO authenticated
  USING (
    is_deleted = FALSE
    AND public.auth_user_can_access_project(risks.project_id)
  );

COMMENT ON POLICY policy_risks_select_v1018 ON public.risks IS
  'v1018: replaces v820''s project_membership-only SELECT policy. Reuses auth_user_can_access_project() (SECURITY DEFINER, row_security off) — also broader (covers PMO/admin, PM, user_projects, user_roles, not just project_memberships).';

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1018: issues + risks SELECT RLS fixed via auth_user_can_access_project()';
  RAISE NOTICE 'Reminder: v820 documented ~138 tables with this same latent bug class.';
  RAISE NOTICE 'Only issues + risks were fixed here (actively broken); the rest remain a';
  RAISE NOTICE 'known, separate remediation effort — do not assume RLS is now fully fixed.';
  RAISE NOTICE '================================================';
END $$;
