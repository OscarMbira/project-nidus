-- =============================================================================
-- v481: project_budget_categories — GRANT + align can_access_project_budget
-- PostgreSQL 15+ / Supabase (public schema)
-- =============================================================================
-- Fixes: 403 / 42501 "permission denied for table project_budget_categories"
-- when editing a project Financial step.
--
-- Causes addressed:
--   1) Table may lack GRANT to role `authenticated` (PostgREST uses it).
--   2) can_access_project_budget (v268) was narrower than project SELECT (v104/v403/v406):
--      e.g. project owner / PM / account owner not in user_projects could be denied.
-- =============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_budget_categories TO authenticated;

-- Optional: ensure helper used by policies is executable (Supabase-safe)
GRANT EXECUTE ON FUNCTION public.can_access_project_budget(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_access_project_budget(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
SET row_security = off
AS $$
  SELECT
    p_project_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = p_project_id
        AND COALESCE(p.is_deleted, FALSE) = FALSE
        AND (
          public.auth_user_can_access_project(p.id)
          OR EXISTS (
            SELECT 1
            FROM public.users u
            WHERE u.auth_user_id = auth.uid()
              AND COALESCE(u.is_deleted, FALSE) = FALSE
              AND (
                p.owner_user_id = u.id
                OR p.project_manager_user_id = u.id
                OR (
                  p.account_id IS NOT NULL
                  AND EXISTS (
                    SELECT 1
                    FROM public.accounts a
                    WHERE a.id = p.account_id
                      AND a.owner_user_id = u.id
                      AND COALESCE(a.is_deleted, FALSE) = FALSE
                  )
                )
              )
          )
        )
    );
$$;

COMMENT ON FUNCTION public.can_access_project_budget(UUID) IS
  'v481: TRUE if user may access project budget rows — auth_user_can_access_project OR project owner/PM/account owner.';
