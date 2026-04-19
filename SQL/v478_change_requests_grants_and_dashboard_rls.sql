-- ============================================================================
-- v478 — change_requests: GRANT + RLS (dashboard + change management UI)
-- Database: PostgreSQL 15+ (Supabase public schema)
-- ============================================================================
-- Problem:
--   v31 created public.change_requests but never GRANTed DML to authenticated.
--   PostgREST returns: "permission denied for table change_requests"
--   getRiskIssueSummary / getExecutiveAlerts query change_requests for org projects.
--
-- Fix:
--   1) GRANT DML to authenticated (RLS enforces rows).
--   2) ENABLE ROW LEVEL SECURITY.
--   3) SELECT/INSERT/UPDATE policies aligned with issues (v175) plus account owner
--      and project manager SELECT (v477 pattern) for PMO dashboard visibility.
-- Idempotent: safe to re-run (DROP POLICY IF EXISTS).
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.change_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.change_requests TO service_role;

ALTER TABLE public.change_requests ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Core policies (mirror v175 issues: team member + PMO / System Admin)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS policy_change_requests_auth_select ON public.change_requests;
CREATE POLICY policy_change_requests_auth_select
  ON public.change_requests
  FOR SELECT
  TO authenticated
  USING (
    is_deleted = FALSE
    AND (
      EXISTS (
        SELECT 1
        FROM public.user_projects up
        JOIN public.users u ON up.user_id = u.id
        WHERE u.auth_user_id = auth.uid()
          AND up.project_id = change_requests.project_id
          AND up.is_deleted = FALSE
      )
      OR EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        JOIN public.users u ON ur.user_id = u.id
        WHERE u.auth_user_id = auth.uid()
          AND r.role_name IN ('pmo_admin', 'System Admin')
          AND ur.is_active = TRUE
          AND ur.is_deleted = FALSE
      )
    )
  );

DROP POLICY IF EXISTS policy_change_requests_auth_insert ON public.change_requests;
CREATE POLICY policy_change_requests_auth_insert
  ON public.change_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = (
      SELECT id FROM public.users
      WHERE auth_user_id = auth.uid() AND is_deleted = FALSE
      LIMIT 1
    )
    AND (
      EXISTS (
        SELECT 1
        FROM public.user_projects up
        JOIN public.users u ON up.user_id = u.id
        WHERE u.auth_user_id = auth.uid()
          AND up.project_id = change_requests.project_id
          AND up.access_level IN ('owner', 'admin', 'member')
          AND up.is_deleted = FALSE
      )
      OR EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        JOIN public.users u ON ur.user_id = u.id
        WHERE u.auth_user_id = auth.uid()
          AND r.role_name IN ('pmo_admin', 'System Admin')
          AND ur.is_active = TRUE
          AND ur.is_deleted = FALSE
      )
    )
  );

DROP POLICY IF EXISTS policy_change_requests_auth_update ON public.change_requests;
CREATE POLICY policy_change_requests_auth_update
  ON public.change_requests
  FOR UPDATE
  TO authenticated
  USING (
    is_deleted = FALSE
    AND (
      EXISTS (
        SELECT 1
        FROM public.user_projects up
        JOIN public.users u ON up.user_id = u.id
        WHERE u.auth_user_id = auth.uid()
          AND up.project_id = change_requests.project_id
          AND up.access_level IN ('owner', 'admin')
          AND up.is_deleted = FALSE
      )
      OR (
        submitted_by = (
          SELECT id FROM public.users
          WHERE auth_user_id = auth.uid() AND is_deleted = FALSE
          LIMIT 1
        )
        AND submitted_by IS NOT NULL
      )
      OR (
        created_by = (
          SELECT id FROM public.users
          WHERE auth_user_id = auth.uid() AND is_deleted = FALSE
          LIMIT 1
        )
        AND created_by IS NOT NULL
      )
      OR EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        JOIN public.users u ON ur.user_id = u.id
        WHERE u.auth_user_id = auth.uid()
          AND r.role_name IN ('pmo_admin', 'System Admin')
          AND ur.is_active = TRUE
          AND ur.is_deleted = FALSE
      )
    )
  );

-- ---------------------------------------------------------------------------
-- RLS: SELECT when user can see parent project via account / PM (v477 pattern)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS policy_change_requests_select_account_scope ON public.change_requests;
CREATE POLICY policy_change_requests_select_account_scope
  ON public.change_requests
  FOR SELECT
  TO authenticated
  USING (
    is_deleted = FALSE
    AND EXISTS (
      SELECT 1
      FROM public.projects p
      INNER JOIN public.accounts a ON a.id = p.account_id AND a.is_deleted = FALSE
      WHERE p.id = change_requests.project_id
        AND p.is_deleted = FALSE
        AND a.owner_user_id = get_user_id_from_auth(auth.uid())
    )
  );

DROP POLICY IF EXISTS policy_change_requests_select_project_manager_scope ON public.change_requests;
CREATE POLICY policy_change_requests_select_project_manager_scope
  ON public.change_requests
  FOR SELECT
  TO authenticated
  USING (
    is_deleted = FALSE
    AND EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = change_requests.project_id
        AND p.is_deleted = FALSE
        AND p.project_manager_user_id = get_user_id_from_auth(auth.uid())
    )
  );

COMMENT ON POLICY policy_change_requests_auth_select ON public.change_requests IS
  'v478: Team members and PMO admins can read change requests for accessible projects.';

COMMENT ON POLICY policy_change_requests_select_account_scope ON public.change_requests IS
  'v478: Org account owners can read change requests for projects in their account (PMO dashboard).';

COMMENT ON POLICY policy_change_requests_select_project_manager_scope ON public.change_requests IS
  'v478: Project managers can read change requests for projects they manage.';

-- YOU MUST RUN IN SUPABASE: SQL Editor → paste → Run. Then reload Platform Dashboard.
