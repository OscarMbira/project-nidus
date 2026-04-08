-- ============================================================================
-- v358: RLS requirements_register + requirements_traceability_matrix
-- Prerequisites: v357, v356 (can_write_pm_planning_document)
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON requirements_register TO authenticated;
GRANT SELECT, INSERT, UPDATE ON requirements_traceability_matrix TO authenticated;

ALTER TABLE requirements_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE requirements_traceability_matrix ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS requirements_register_select ON requirements_register;
DROP POLICY IF EXISTS requirements_register_insert ON requirements_register;
DROP POLICY IF EXISTS requirements_register_update ON requirements_register;
DROP POLICY IF EXISTS requirements_trace_select ON requirements_traceability_matrix;
DROP POLICY IF EXISTS requirements_trace_insert ON requirements_traceability_matrix;
DROP POLICY IF EXISTS requirements_trace_update ON requirements_traceability_matrix;

CREATE POLICY requirements_register_select ON requirements_register
  FOR SELECT TO authenticated
  USING (
    is_deleted = FALSE
    AND (
      EXISTS (
        SELECT 1 FROM project_memberships pm
        JOIN users u ON u.id = pm.user_id
        WHERE pm.project_id = requirements_register.project_id
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

CREATE POLICY requirements_register_insert ON requirements_register
  FOR INSERT TO authenticated
  WITH CHECK (public.can_write_pm_planning_document(project_id) = TRUE);

CREATE POLICY requirements_register_update ON requirements_register
  FOR UPDATE TO authenticated
  USING (is_deleted = FALSE AND public.can_write_pm_planning_document(project_id) = TRUE)
  WITH CHECK (public.can_write_pm_planning_document(project_id) = TRUE);

CREATE POLICY requirements_trace_select ON requirements_traceability_matrix
  FOR SELECT TO authenticated
  USING (
    is_deleted = FALSE
    AND EXISTS (
      SELECT 1 FROM requirements_register rr
      JOIN project_memberships pm ON pm.project_id = rr.project_id
      JOIN users u ON u.id = pm.user_id
      WHERE rr.id = requirements_traceability_matrix.requirement_id
        AND u.auth_user_id = auth.uid() AND pm.is_active = TRUE
        AND rr.is_deleted = FALSE
    )
  );

CREATE POLICY requirements_trace_insert ON requirements_traceability_matrix
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM requirements_register rr
      WHERE rr.id = requirement_id
        AND public.can_write_pm_planning_document(rr.project_id) = TRUE
        AND rr.is_deleted = FALSE
    )
  );

CREATE POLICY requirements_trace_update ON requirements_traceability_matrix
  FOR UPDATE TO authenticated
  USING (
    is_deleted = FALSE
    AND EXISTS (
      SELECT 1 FROM requirements_register rr
      WHERE rr.id = requirements_traceability_matrix.requirement_id
        AND public.can_write_pm_planning_document(rr.project_id) = TRUE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM requirements_register rr
      WHERE rr.id = requirement_id
        AND public.can_write_pm_planning_document(rr.project_id) = TRUE
    )
  );
