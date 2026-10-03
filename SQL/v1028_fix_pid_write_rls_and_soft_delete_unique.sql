-- ============================================================================
-- v1028: PID create/update — project_memberships write RLS + soft-delete unique
-- ============================================================================
-- Problems fixed:
-- 1) INSERT/UPDATE/DELETE policies from v215 only checked user_projects.
--    SELECT was opened to project_memberships in v835, so members could see
--    "No PID" but Create failed with RLS / empty insert.
-- 2) UNIQUE(project_id) blocked recreating a PID after soft-delete.
--
-- Write access uses can_write_pm_planning_document (project_memberships manager
-- roles + admins), with legacy user_projects kept as an OR for older rows.
-- ============================================================================

-- Soft-delete-friendly uniqueness: one active PID per project
DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'public.project_initiation_documents'::regclass
    AND contype = 'u'
    AND pg_get_constraintdef(oid) ILIKE '%(project_id)%'
  LIMIT 1;

  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.project_initiation_documents DROP CONSTRAINT %I', cname);
  END IF;
END $$;

DROP INDEX IF EXISTS public.uq_pid_project_id_active;
CREATE UNIQUE INDEX uq_pid_project_id_active
  ON public.project_initiation_documents (project_id)
  WHERE COALESCE(is_deleted, FALSE) = FALSE;

-- Ensure write helper exists (idempotent redefine matching v963x)
CREATE OR REPLACE FUNCTION public.can_write_pm_planning_document(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    JOIN users u ON u.id = ur.user_id
    WHERE u.auth_user_id = auth.uid()
      AND r.role_name IN ('pmo_admin', 'system_admin', 'account_owner', 'System Admin')
      AND ur.is_active = TRUE AND COALESCE(ur.is_deleted, FALSE) = FALSE
  )
  OR EXISTS (
    SELECT 1 FROM project_memberships pm
    JOIN project_roles pr ON pr.id = pm.project_role_id
    JOIN users u ON u.id = pm.user_id
    WHERE pm.project_id = p_project_id
      AND u.auth_user_id = auth.uid()
      AND pr.role_name IN ('portfolio_manager', 'programme_manager', 'project_manager')
      AND pm.is_active = TRUE
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_write_pm_planning_document(UUID) TO authenticated;

-- Legacy user_projects write check (kept as OR for older tenancy data)
CREATE OR REPLACE FUNCTION public.can_write_pid_via_user_projects(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_projects up
    JOIN users u ON up.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND up.project_id = p_project_id
      AND COALESCE(up.is_deleted, FALSE) = FALSE
      AND (
        up.project_role IN ('Project Manager', 'Project Director')
        OR up.access_level IN ('owner', 'admin')
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_write_pid_via_user_projects(UUID) TO authenticated;

DROP POLICY IF EXISTS policy_project_initiation_documents_insert ON project_initiation_documents;
CREATE POLICY policy_project_initiation_documents_insert ON project_initiation_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_write_pm_planning_document(project_id)
    OR public.can_write_pid_via_user_projects(project_id)
  );

DROP POLICY IF EXISTS policy_project_initiation_documents_update ON project_initiation_documents;
CREATE POLICY policy_project_initiation_documents_update ON project_initiation_documents
  FOR UPDATE TO authenticated
  USING (
    (status IS DISTINCT FROM 'approved')
    AND (
      public.can_write_pm_planning_document(project_id)
      OR public.can_write_pid_via_user_projects(project_id)
    )
  )
  WITH CHECK (
    public.can_write_pm_planning_document(project_id)
    OR public.can_write_pid_via_user_projects(project_id)
  );

DROP POLICY IF EXISTS policy_project_initiation_documents_delete ON project_initiation_documents;
CREATE POLICY policy_project_initiation_documents_delete ON project_initiation_documents
  FOR DELETE TO authenticated
  USING (
    (status = 'draft' OR status IS NULL)
    AND (
      public.can_write_pm_planning_document(project_id)
      OR public.can_write_pid_via_user_projects(project_id)
    )
  );

-- Allow writers to see soft-deleted PIDs so the app can revive them
DROP POLICY IF EXISTS policy_pid_select_deleted_for_writers ON project_initiation_documents;
CREATE POLICY policy_pid_select_deleted_for_writers
  ON project_initiation_documents FOR SELECT
  TO authenticated
  USING (
    is_deleted = TRUE
    AND (
      public.can_write_pm_planning_document(project_id)
      OR public.can_write_pid_via_user_projects(project_id)
    )
  );

NOTIFY pgrst, 'reload schema';
