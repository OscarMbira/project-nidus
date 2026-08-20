-- =============================================================================
-- v886: Fix infinite RLS recursion on lessons_reports (42P17)
-- Prerequisites: v203 (tables), v204 (original RLS)
--
-- Console error on Lessons Log / Lessons Reports widget:
--   infinite recursion detected in policy for relation "lessons_reports"
--
-- Root cause (v204):
--   policy_lessons_reports_auth_select queries lessons_report_distribution
--   policy_lessons_report_distribution_auth_select queries lessons_reports
--   → PostgreSQL 42P17 when evaluating either policy.
--
-- Fix:
--   1) SECURITY DEFINER helper to test distribution recipient (bypasses RLS)
--   2) Rewrite lessons_reports SELECT without a plain subquery on distribution
--   3) Align membership with user_projects + project_memberships + owner/PM
--      (same pattern as v884 project_decisions)
-- Idempotent — safe to re-run.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.user_is_lessons_report_distribution_recipient(p_report_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lessons_report_distribution lrd
    WHERE lrd.lessons_report_id = p_report_id
      AND lrd.recipient_id = public.get_user_id_from_auth(auth.uid())
  );
$$;

COMMENT ON FUNCTION public.user_is_lessons_report_distribution_recipient(uuid) IS
  'RLS helper: true if current user is a distribution recipient. SECURITY DEFINER avoids lessons_reports ↔ distribution recursion.';

GRANT EXECUTE ON FUNCTION public.user_is_lessons_report_distribution_recipient(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_lessons_report_distribution_recipient(uuid) TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.lessons_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.lessons_reports TO service_role;

ALTER TABLE public.lessons_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS policy_lessons_reports_auth_select ON public.lessons_reports;
CREATE POLICY policy_lessons_reports_auth_select ON public.lessons_reports
  FOR SELECT
  TO authenticated
  USING (
    COALESCE(is_deleted, false) = false
    AND (
      EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        JOIN public.users u ON ur.user_id = u.id
        WHERE u.auth_user_id = auth.uid()
          AND r.role_name IN ('pmo_admin', 'System Admin', 'PMO Admin', 'admin')
          AND ur.is_active = TRUE
          AND COALESCE(ur.is_deleted, FALSE) = FALSE
      )
      OR EXISTS (
        SELECT 1
        FROM public.user_projects up
        JOIN public.users u ON up.user_id = u.id
        WHERE u.auth_user_id = auth.uid()
          AND up.project_id = lessons_reports.project_id
          AND COALESCE(up.is_deleted, FALSE) = FALSE
      )
      OR EXISTS (
        SELECT 1
        FROM public.project_memberships pm
        JOIN public.users u ON pm.user_id = u.id
        WHERE u.auth_user_id = auth.uid()
          AND pm.project_id = lessons_reports.project_id
          AND COALESCE(pm.is_active, TRUE) = TRUE
      )
      OR EXISTS (
        SELECT 1
        FROM public.projects p
        JOIN public.accounts a ON a.id = p.account_id AND COALESCE(a.is_deleted, FALSE) = FALSE
        WHERE p.id = lessons_reports.project_id
          AND COALESCE(p.is_deleted, FALSE) = FALSE
          AND a.owner_user_id = public.get_user_id_from_auth(auth.uid())
      )
      OR EXISTS (
        SELECT 1
        FROM public.projects p
        WHERE p.id = lessons_reports.project_id
          AND COALESCE(p.is_deleted, FALSE) = FALSE
          AND (
            p.owner_user_id = public.get_user_id_from_auth(auth.uid())
            OR p.project_manager_user_id = public.get_user_id_from_auth(auth.uid())
          )
      )
      OR author_id = public.get_user_id_from_auth(auth.uid())
      OR created_by = public.get_user_id_from_auth(auth.uid())
      OR public.user_is_lessons_report_distribution_recipient(lessons_reports.id)
    )
  );

DO $$
BEGIN
  RAISE NOTICE 'v886_fix_lessons_reports_rls_recursion.sql applied';
END $$;
