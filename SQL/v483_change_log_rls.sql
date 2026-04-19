-- ============================================================================
-- v483 — change_log: GRANT + RLS
-- Database: PostgreSQL 15+ (Supabase public schema)
-- ============================================================================
-- Problem:
--   v31 created public.change_log but never GRANTed SELECT to authenticated.
--   PostgREST returns: "permission denied for table change_log"
--
-- Fix:
--   1) GRANT SELECT to authenticated (change_log is read-only for all roles).
--   2) ENABLE ROW LEVEL SECURITY.
--   3) SELECT policy: project members + pmo_admin/System Admin.
--   4) INSERT policy: only for system operations (performed_by = current user).
-- Idempotent: safe to re-run.
-- ============================================================================

-- Step 1: Grant permissions
GRANT SELECT, INSERT ON public.change_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.change_log TO service_role;

-- Step 2: Enable RLS
ALTER TABLE public.change_log ENABLE ROW LEVEL SECURITY;

-- Step 3: SELECT — project members OR pmo_admin/System Admin see all
DROP POLICY IF EXISTS policy_change_log_select ON public.change_log;
CREATE POLICY policy_change_log_select
  ON public.change_log
  FOR SELECT
  TO authenticated
  USING (
    -- PMO Admin / System Admin see all records
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      JOIN public.users u ON ur.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
        AND r.role_name IN ('pmo_admin', 'System Admin', 'PMO Admin')
        AND ur.is_active = TRUE
        AND ur.is_deleted = FALSE
    )
    OR
    -- Project members see logs for their projects
    EXISTS (
      SELECT 1
      FROM public.user_projects up
      JOIN public.users u ON up.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
        AND up.project_id = change_log.project_id
        AND up.is_deleted = FALSE
    )
    OR
    -- Account owners see all projects in their account
    EXISTS (
      SELECT 1
      FROM public.projects p
      INNER JOIN public.accounts a ON a.id = p.account_id AND a.is_deleted = FALSE
      WHERE p.id = change_log.project_id
        AND p.is_deleted = FALSE
        AND a.owner_user_id = get_user_id_from_auth(auth.uid())
    )
    OR
    -- Project managers see their managed projects
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = change_log.project_id
        AND p.is_deleted = FALSE
        AND p.project_manager_user_id = get_user_id_from_auth(auth.uid())
    )
    OR
    -- Project memberships (project_memberships table)
    EXISTS (
      SELECT 1
      FROM public.project_memberships pm
      JOIN public.users u ON pm.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
        AND pm.project_id = change_log.project_id
        AND pm.is_active = TRUE
    )
  );

-- Step 4: INSERT — authenticated users can log actions on their projects
DROP POLICY IF EXISTS policy_change_log_insert ON public.change_log;
CREATE POLICY policy_change_log_insert
  ON public.change_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    performed_by = get_user_id_from_auth(auth.uid())
    OR created_by = get_user_id_from_auth(auth.uid())
  );

COMMENT ON POLICY policy_change_log_select ON public.change_log IS
  'v483: Project members, managers, account owners, and PMO/System admins can read change log entries.';

COMMENT ON POLICY policy_change_log_insert ON public.change_log IS
  'v483: Authenticated users can insert change log entries they perform.';
