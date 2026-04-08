-- ============================================================================
-- v356: RLS for scope_management_plans + shared planning write helper
-- Prerequisites: v355, project_memberships, roles, users
-- ============================================================================

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

GRANT SELECT, INSERT, UPDATE ON scope_management_plans TO authenticated;
ALTER TABLE scope_management_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS scope_management_plans_select ON scope_management_plans;
DROP POLICY IF EXISTS scope_management_plans_insert ON scope_management_plans;
DROP POLICY IF EXISTS scope_management_plans_update ON scope_management_plans;

CREATE POLICY scope_management_plans_select ON scope_management_plans
  FOR SELECT TO authenticated
  USING (
    is_deleted = FALSE
    AND (
      EXISTS (
        SELECT 1 FROM project_memberships pm
        JOIN users u ON u.id = pm.user_id
        WHERE pm.project_id = scope_management_plans.project_id
          AND u.auth_user_id = auth.uid()
          AND pm.is_active = TRUE
      )
      OR EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        JOIN users u ON u.id = ur.user_id
        WHERE u.auth_user_id = auth.uid()
          AND r.role_name IN ('pmo_admin', 'system_admin', 'account_owner', 'System Admin')
          AND ur.is_active = TRUE AND COALESCE(ur.is_deleted, FALSE) = FALSE
      )
    )
  );

CREATE POLICY scope_management_plans_insert ON scope_management_plans
  FOR INSERT TO authenticated
  WITH CHECK (public.can_write_pm_planning_document(project_id) = TRUE);

CREATE POLICY scope_management_plans_update ON scope_management_plans
  FOR UPDATE TO authenticated
  USING (
    is_deleted = FALSE
    AND public.can_write_pm_planning_document(project_id) = TRUE
  )
  WITH CHECK (public.can_write_pm_planning_document(project_id) = TRUE);
