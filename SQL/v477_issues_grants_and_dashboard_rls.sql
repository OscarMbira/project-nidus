-- ============================================================================
-- v477 — issues: GRANT to authenticated + account / PM SELECT RLS (dashboard)
-- Database: PostgreSQL 15+ (Supabase public schema)
-- ============================================================================
-- Problem:
--   v175 granted issue_registers, issue_actions, etc., but NOT public.issues.
--   v25 never added GRANT on issues. PostgREST then returns:
--     "permission denied for table issues"
--   getPmoExtendedMetrics → getRiskIssueSummary queries issues for org projects.
--
-- Fix:
--   1) GRANT DML to authenticated (RLS still enforces rows).
--   2) Add SELECT policies aligned with projects (v104): account owner + PM can
--      read issues for org projects without relying only on user_projects.
-- Idempotent: safe to re-run (DROP POLICY IF EXISTS).
-- ============================================================================

-- Core issue tables (v25) — required before RLS can allow any row access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.issues TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.issue_comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.issue_attachments TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.issues TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.issue_comments TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.issue_attachments TO service_role;

-- ---------------------------------------------------------------------------
-- RLS: SELECT issues when user can already see the parent project (account scope)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS policy_issues_select_account_scope ON public.issues;
CREATE POLICY policy_issues_select_account_scope
  ON public.issues
  FOR SELECT
  TO authenticated
  USING (
    is_deleted = FALSE
    AND EXISTS (
      SELECT 1
      FROM public.projects p
      INNER JOIN public.accounts a ON a.id = p.account_id AND a.is_deleted = FALSE
      WHERE p.id = issues.project_id
        AND p.is_deleted = FALSE
        AND a.owner_user_id = get_user_id_from_auth(auth.uid())
    )
  );

DROP POLICY IF EXISTS policy_issues_select_project_manager_scope ON public.issues;
CREATE POLICY policy_issues_select_project_manager_scope
  ON public.issues
  FOR SELECT
  TO authenticated
  USING (
    is_deleted = FALSE
    AND EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = issues.project_id
        AND p.is_deleted = FALSE
        AND p.project_manager_user_id = get_user_id_from_auth(auth.uid())
    )
  );

COMMENT ON POLICY policy_issues_select_account_scope ON public.issues IS
  'v477: Org account owners can read issues for projects in their account (PMO dashboard aggregates).';

COMMENT ON POLICY policy_issues_select_project_manager_scope ON public.issues IS
  'v477: Project managers can read issues for projects they manage.';

-- YOU MUST RUN IN SUPABASE: SQL Editor → paste → Run. Then reload Platform Dashboard.
