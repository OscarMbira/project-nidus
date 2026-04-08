-- ============================================================================
-- v362: RLS wbs_nodes
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON wbs_nodes TO authenticated;
ALTER TABLE wbs_nodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wbs_nodes_select ON wbs_nodes;
DROP POLICY IF EXISTS wbs_nodes_insert ON wbs_nodes;
DROP POLICY IF EXISTS wbs_nodes_update ON wbs_nodes;

CREATE POLICY wbs_nodes_select ON wbs_nodes
  FOR SELECT TO authenticated
  USING (
    is_deleted = FALSE
    AND (
      EXISTS (
        SELECT 1 FROM project_memberships pm
        JOIN users u ON u.id = pm.user_id
        WHERE pm.project_id = wbs_nodes.project_id
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

CREATE POLICY wbs_nodes_insert ON wbs_nodes
  FOR INSERT TO authenticated
  WITH CHECK (public.can_write_pm_planning_document(project_id) = TRUE);

CREATE POLICY wbs_nodes_update ON wbs_nodes
  FOR UPDATE TO authenticated
  USING (is_deleted = FALSE AND public.can_write_pm_planning_document(project_id) = TRUE)
  WITH CHECK (public.can_write_pm_planning_document(project_id) = TRUE);
