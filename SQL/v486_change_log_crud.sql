-- ============================================================================
-- v486 — change_log: add is_deleted column + full CRUD RLS policies
-- Database: PostgreSQL 15+ (Supabase public schema)
-- ============================================================================
-- Adds soft-delete support and UPDATE/DELETE policies to change_log.
-- Safe to re-run (IF NOT EXISTS / DROP POLICY IF EXISTS).
-- ============================================================================

-- Step 1: Add soft-delete columns if they don't exist
ALTER TABLE public.change_log
  ADD COLUMN IF NOT EXISTS is_deleted    BOOLEAN   DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_at    TIMESTAMP,
  ADD COLUMN IF NOT EXISTS deleted_by    UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_by    UUID REFERENCES public.users(id);

CREATE INDEX IF NOT EXISTS idx_change_log_is_deleted
  ON public.change_log(is_deleted) WHERE is_deleted = FALSE;

-- Step 2: Ensure authenticated has full DML (SELECT already granted in v483)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.change_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.change_log TO service_role;

-- Step 3: Re-create SELECT policy to exclude soft-deleted rows
DROP POLICY IF EXISTS policy_change_log_select ON public.change_log;
CREATE POLICY policy_change_log_select
  ON public.change_log
  FOR SELECT
  TO authenticated
  USING (
    COALESCE(is_deleted, FALSE) = FALSE
    AND (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        JOIN public.users u ON ur.user_id = u.id
        WHERE u.auth_user_id = auth.uid()
          AND r.role_name IN ('pmo_admin', 'System Admin', 'PMO Admin')
          AND ur.is_active = TRUE AND ur.is_deleted = FALSE
      )
      OR EXISTS (
        SELECT 1 FROM public.user_projects up
        JOIN public.users u ON up.user_id = u.id
        WHERE u.auth_user_id = auth.uid()
          AND up.project_id = change_log.project_id
          AND up.is_deleted = FALSE
      )
      OR EXISTS (
        SELECT 1 FROM public.projects p
        INNER JOIN public.accounts a ON a.id = p.account_id AND a.is_deleted = FALSE
        WHERE p.id = change_log.project_id AND p.is_deleted = FALSE
          AND a.owner_user_id = get_user_id_from_auth(auth.uid())
      )
      OR EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = change_log.project_id AND p.is_deleted = FALSE
          AND p.project_manager_user_id = get_user_id_from_auth(auth.uid())
      )
      OR EXISTS (
        SELECT 1 FROM public.project_memberships pm
        JOIN public.users u ON pm.user_id = u.id
        WHERE u.auth_user_id = auth.uid()
          AND pm.project_id = change_log.project_id
          AND pm.is_active = TRUE
      )
    )
  );

-- Step 4: UPDATE policy — project members + pmo_admin/System Admin
DROP POLICY IF EXISTS policy_change_log_update ON public.change_log;
CREATE POLICY policy_change_log_update
  ON public.change_log
  FOR UPDATE
  TO authenticated
  USING (
    COALESCE(is_deleted, FALSE) = FALSE
    AND (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        JOIN public.users u ON ur.user_id = u.id
        WHERE u.auth_user_id = auth.uid()
          AND r.role_name IN ('pmo_admin', 'System Admin', 'PMO Admin')
          AND ur.is_active = TRUE AND ur.is_deleted = FALSE
      )
      OR performed_by = get_user_id_from_auth(auth.uid())
      OR created_by   = get_user_id_from_auth(auth.uid())
    )
  );

-- Step 5: DELETE policy (soft-delete UPDATE) — pmo_admin/System Admin only
DROP POLICY IF EXISTS policy_change_log_delete ON public.change_log;
CREATE POLICY policy_change_log_delete
  ON public.change_log
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      JOIN public.users u ON ur.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
        AND r.role_name IN ('pmo_admin', 'System Admin', 'PMO Admin')
        AND ur.is_active = TRUE AND ur.is_deleted = FALSE
    )
  );

COMMENT ON COLUMN public.change_log.is_deleted IS 'v486: soft delete flag';
COMMENT ON COLUMN public.change_log.updated_at  IS 'v486: last update timestamp';
