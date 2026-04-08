-- ============================================================================
-- v366: RLS activity_list
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON activity_list TO authenticated;
ALTER TABLE activity_list ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS activity_list_select ON activity_list;
DROP POLICY IF EXISTS activity_list_insert ON activity_list;
DROP POLICY IF EXISTS activity_list_update ON activity_list;

CREATE POLICY activity_list_select ON activity_list
  FOR SELECT TO authenticated
  USING (
    is_deleted = FALSE
    AND (
      EXISTS (
        SELECT 1 FROM project_memberships pm
        JOIN users u ON u.id = pm.user_id
        WHERE pm.project_id = activity_list.project_id
          AND u.auth_user_id = auth.uid() AND pm.is_active = TRUE
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

CREATE POLICY activity_list_insert ON activity_list
  FOR INSERT TO authenticated
  WITH CHECK (public.can_write_pm_planning_document(project_id) = TRUE);

CREATE POLICY activity_list_update ON activity_list
  FOR UPDATE TO authenticated
  USING (is_deleted = FALSE AND public.can_write_pm_planning_document(project_id) = TRUE)
  WITH CHECK (public.can_write_pm_planning_document(project_id) = TRUE);
