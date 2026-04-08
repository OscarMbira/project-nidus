-- =============================================================================
-- v226: Document Governance RLS Policies
-- Purpose: Enforce PMO/PM permissions at database level
-- PRD Reference: Documents/PMO_PM_Independent_Dashboards_PRD.md Section 8
-- =============================================================================

-- Helper function to check if user has PMO Admin role
CREATE OR REPLACE FUNCTION user_has_pmo_role(auth_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_role_assignments ura
    JOIN roles r ON ura.role_id = r.id
    WHERE ura.user_id = (SELECT id FROM users WHERE auth_user_id = auth_user_id)
    AND r.role_name = 'pmo_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user has PM role
CREATE OR REPLACE FUNCTION user_has_pm_role(auth_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_role_assignments ura
    JOIN roles r ON ura.role_id = r.id
    WHERE ura.user_id = (SELECT id FROM users WHERE auth_user_id = auth_user_id)
    AND r.role_name = 'project_manager'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Communication Management Strategies RLS
-- =============================================================================

-- PMO can read all CMS
CREATE POLICY "cms_pmo_read_all" ON communication_management_strategies
  FOR SELECT
  TO authenticated
  USING (
    user_has_pmo_role(auth.uid())
  );

-- PMO can write/update CMS where pmo_permission allows
CREATE POLICY "cms_pmo_write" ON communication_management_strategies
  FOR ALL
  TO authenticated
  USING (
    user_has_pmo_role(auth.uid())
    AND (pmo_permission = 'write' OR pmo_permission = 'approve')
  )
  WITH CHECK (
    user_has_pmo_role(auth.uid())
    AND (pmo_permission = 'write' OR pmo_permission = 'approve')
  );

-- PM can read CMS where pm_permission allows
CREATE POLICY "cms_pm_read" ON communication_management_strategies
  FOR SELECT
  TO authenticated
  USING (
    user_has_pm_role(auth.uid())
    AND pm_permission IN ('read', 'write', 'tailor')
  );

-- PM can write CMS where pm_permission = 'write' and not baseline
CREATE POLICY "cms_pm_write" ON communication_management_strategies
  FOR ALL
  TO authenticated
  USING (
    user_has_pm_role(auth.uid())
    AND pm_permission = 'write'
    AND is_baseline = FALSE
  )
  WITH CHECK (
    user_has_pm_role(auth.uid())
    AND pm_permission = 'write'
    AND is_baseline = FALSE
  );

-- PM cannot modify baselines
CREATE POLICY "cms_pm_no_baseline_modify" ON communication_management_strategies
  FOR UPDATE
  TO authenticated
  USING (
    user_has_pm_role(auth.uid())
    AND is_baseline = FALSE
  )
  WITH CHECK (
    user_has_pm_role(auth.uid())
    AND is_baseline = FALSE
  );

-- Only PMO can set is_baseline = true
CREATE POLICY "cms_only_pmo_baseline" ON communication_management_strategies
  FOR UPDATE
  TO authenticated
  USING (
    user_has_pmo_role(auth.uid())
  )
  WITH CHECK (
    (is_baseline = FALSE) OR (is_baseline = TRUE AND user_has_pmo_role(auth.uid()))
  );

-- =============================================================================
-- Configuration Management Strategies RLS
-- =============================================================================

CREATE POLICY "cfgms_pmo_read_all" ON configuration_management_strategies
  FOR SELECT TO authenticated
  USING (user_has_pmo_role(auth.uid()));

CREATE POLICY "cfgms_pmo_write" ON configuration_management_strategies
  FOR ALL TO authenticated
  USING (
    user_has_pmo_role(auth.uid())
    AND (pmo_permission = 'write' OR pmo_permission = 'approve')
  )
  WITH CHECK (
    user_has_pmo_role(auth.uid())
    AND (pmo_permission = 'write' OR pmo_permission = 'approve')
  );

CREATE POLICY "cfgms_pm_read" ON configuration_management_strategies
  FOR SELECT TO authenticated
  USING (
    user_has_pm_role(auth.uid())
    AND pm_permission IN ('read', 'write', 'tailor')
  );

CREATE POLICY "cfgms_pm_write" ON configuration_management_strategies
  FOR ALL TO authenticated
  USING (
    user_has_pm_role(auth.uid())
    AND pm_permission = 'write'
    AND is_baseline = FALSE
  )
  WITH CHECK (
    user_has_pm_role(auth.uid())
    AND pm_permission = 'write'
    AND is_baseline = FALSE
  );

CREATE POLICY "cfgms_pm_no_baseline_modify" ON configuration_management_strategies
  FOR UPDATE TO authenticated
  USING (
    user_has_pm_role(auth.uid())
    AND is_baseline = FALSE
  )
  WITH CHECK (
    user_has_pm_role(auth.uid())
    AND is_baseline = FALSE
  );

CREATE POLICY "cfgms_only_pmo_baseline" ON configuration_management_strategies
  FOR UPDATE TO authenticated
  USING (user_has_pmo_role(auth.uid()))
  WITH CHECK (
    (is_baseline = FALSE) OR (is_baseline = TRUE AND user_has_pmo_role(auth.uid()))
  );

-- =============================================================================
-- Quality Management Strategies RLS
-- =============================================================================

CREATE POLICY "qms_pmo_read_all" ON quality_management_strategies
  FOR SELECT TO authenticated
  USING (user_has_pmo_role(auth.uid()));

CREATE POLICY "qms_pmo_write" ON quality_management_strategies
  FOR ALL TO authenticated
  USING (
    user_has_pmo_role(auth.uid())
    AND (pmo_permission = 'write' OR pmo_permission = 'approve')
  )
  WITH CHECK (
    user_has_pmo_role(auth.uid())
    AND (pmo_permission = 'write' OR pmo_permission = 'approve')
  );

CREATE POLICY "qms_pm_read" ON quality_management_strategies
  FOR SELECT TO authenticated
  USING (
    user_has_pm_role(auth.uid())
    AND pm_permission IN ('read', 'write', 'tailor')
  );

CREATE POLICY "qms_pm_write" ON quality_management_strategies
  FOR ALL TO authenticated
  USING (
    user_has_pm_role(auth.uid())
    AND pm_permission = 'write'
    AND is_baseline = FALSE
  )
  WITH CHECK (
    user_has_pm_role(auth.uid())
    AND pm_permission = 'write'
    AND is_baseline = FALSE
  );

CREATE POLICY "qms_pm_no_baseline_modify" ON quality_management_strategies
  FOR UPDATE TO authenticated
  USING (
    user_has_pm_role(auth.uid())
    AND is_baseline = FALSE
  )
  WITH CHECK (
    user_has_pm_role(auth.uid())
    AND is_baseline = FALSE
  );

CREATE POLICY "qms_only_pmo_baseline" ON quality_management_strategies
  FOR UPDATE TO authenticated
  USING (user_has_pmo_role(auth.uid()))
  WITH CHECK (
    (is_baseline = FALSE) OR (is_baseline = TRUE AND user_has_pmo_role(auth.uid()))
  );

-- =============================================================================
-- Risk Management Strategies RLS
-- =============================================================================

CREATE POLICY "rms_pmo_read_all" ON risk_management_strategies
  FOR SELECT TO authenticated
  USING (user_has_pmo_role(auth.uid()));

CREATE POLICY "rms_pmo_write" ON risk_management_strategies
  FOR ALL TO authenticated
  USING (
    user_has_pmo_role(auth.uid())
    AND (pmo_permission = 'write' OR pmo_permission = 'approve')
  )
  WITH CHECK (
    user_has_pmo_role(auth.uid())
    AND (pmo_permission = 'write' OR pmo_permission = 'approve')
  );

CREATE POLICY "rms_pm_read" ON risk_management_strategies
  FOR SELECT TO authenticated
  USING (
    user_has_pm_role(auth.uid())
    AND pm_permission IN ('read', 'write', 'tailor')
  );

CREATE POLICY "rms_pm_write" ON risk_management_strategies
  FOR ALL TO authenticated
  USING (
    user_has_pm_role(auth.uid())
    AND pm_permission = 'write'
    AND is_baseline = FALSE
  )
  WITH CHECK (
    user_has_pm_role(auth.uid())
    AND pm_permission = 'write'
    AND is_baseline = FALSE
  );

CREATE POLICY "rms_pm_no_baseline_modify" ON risk_management_strategies
  FOR UPDATE TO authenticated
  USING (
    user_has_pm_role(auth.uid())
    AND is_baseline = FALSE
  )
  WITH CHECK (
    user_has_pm_role(auth.uid())
    AND is_baseline = FALSE
  );

CREATE POLICY "rms_only_pmo_baseline" ON risk_management_strategies
  FOR UPDATE TO authenticated
  USING (user_has_pmo_role(auth.uid()))
  WITH CHECK (
    (is_baseline = FALSE) OR (is_baseline = TRUE AND user_has_pmo_role(auth.uid()))
  );

-- =============================================================================
-- Project Mandates RLS
-- =============================================================================

CREATE POLICY "mandates_pmo_read_all" ON project_mandates
  FOR SELECT TO authenticated
  USING (user_has_pmo_role(auth.uid()));

CREATE POLICY "mandates_pmo_write" ON project_mandates
  FOR ALL TO authenticated
  USING (
    user_has_pmo_role(auth.uid())
    AND (pmo_permission = 'write' OR pmo_permission = 'approve')
  )
  WITH CHECK (
    user_has_pmo_role(auth.uid())
    AND (pmo_permission = 'write' OR pmo_permission = 'approve')
  );

CREATE POLICY "mandates_pm_read" ON project_mandates
  FOR SELECT TO authenticated
  USING (
    user_has_pm_role(auth.uid())
    AND pm_permission IN ('read', 'write', 'tailor')
  );

CREATE POLICY "mandates_pm_write" ON project_mandates
  FOR ALL TO authenticated
  USING (
    user_has_pm_role(auth.uid())
    AND pm_permission = 'write'
    AND is_baseline = FALSE
  )
  WITH CHECK (
    user_has_pm_role(auth.uid())
    AND pm_permission = 'write'
    AND is_baseline = FALSE
  );

CREATE POLICY "mandates_pm_no_baseline_modify" ON project_mandates
  FOR UPDATE TO authenticated
  USING (
    user_has_pm_role(auth.uid())
    AND is_baseline = FALSE
  )
  WITH CHECK (
    user_has_pm_role(auth.uid())
    AND is_baseline = FALSE
  );

CREATE POLICY "mandates_only_pmo_baseline" ON project_mandates
  FOR UPDATE TO authenticated
  USING (user_has_pmo_role(auth.uid()))
  WITH CHECK (
    (is_baseline = FALSE) OR (is_baseline = TRUE AND user_has_pmo_role(auth.uid()))
  );

-- =============================================================================
-- Project Briefs RLS
-- =============================================================================

CREATE POLICY "briefs_pmo_read_all" ON project_briefs
  FOR SELECT TO authenticated
  USING (user_has_pmo_role(auth.uid()));

CREATE POLICY "briefs_pmo_approve" ON project_briefs
  FOR UPDATE TO authenticated
  USING (
    user_has_pmo_role(auth.uid())
    AND pmo_permission = 'approve'
  )
  WITH CHECK (
    user_has_pmo_role(auth.uid())
    AND pmo_permission = 'approve'
  );

CREATE POLICY "briefs_pm_read" ON project_briefs
  FOR SELECT TO authenticated
  USING (
    user_has_pm_role(auth.uid())
    AND pm_permission IN ('read', 'write', 'tailor')
  );

CREATE POLICY "briefs_pm_write" ON project_briefs
  FOR ALL TO authenticated
  USING (
    user_has_pm_role(auth.uid())
    AND pm_permission = 'write'
  )
  WITH CHECK (
    user_has_pm_role(auth.uid())
    AND pm_permission = 'write'
  );

-- =============================================================================
-- Benefits Review Plans RLS
-- =============================================================================

CREATE POLICY "benefits_pmo_read_all" ON benefits_review_plans
  FOR SELECT TO authenticated
  USING (user_has_pmo_role(auth.uid()));

CREATE POLICY "benefits_pmo_approve" ON benefits_review_plans
  FOR UPDATE TO authenticated
  USING (
    user_has_pmo_role(auth.uid())
    AND pmo_permission = 'approve'
  )
  WITH CHECK (
    user_has_pmo_role(auth.uid())
    AND pmo_permission = 'approve'
  );

CREATE POLICY "benefits_pm_read" ON benefits_review_plans
  FOR SELECT TO authenticated
  USING (
    user_has_pm_role(auth.uid())
    AND pm_permission IN ('read', 'write', 'tailor')
  );

CREATE POLICY "benefits_pm_write" ON benefits_review_plans
  FOR ALL TO authenticated
  USING (
    user_has_pm_role(auth.uid())
    AND pm_permission = 'write'
  )
  WITH CHECK (
    user_has_pm_role(auth.uid())
    AND pm_permission = 'write'
  );

-- Note: Additional RLS policies for PM delivery documents (risk registers, 
-- issue registers, etc.) should follow similar patterns based on their 
-- governance requirements. These are handled by existing RLS policies that 
-- check project membership.
