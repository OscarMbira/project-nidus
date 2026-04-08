-- =============================================================================
-- v246: Practice Document Governance RLS Policies
-- Purpose: Enforce PMO/PM permissions at database level for practice documents in sim schema
-- PRD Reference: Simulator_PMO_PM_Independent_Dashboards_Implementation_Plan.md Phase 7
-- =============================================================================

-- Helper function to check if user has PMO Admin role (for practice context)
CREATE OR REPLACE FUNCTION sim.user_has_pmo_role_practice(auth_user_id UUID)
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

-- Helper function to check if user has PM role (for practice context)
CREATE OR REPLACE FUNCTION sim.user_has_pm_role_practice(auth_user_id UUID)
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
-- Practice Communication Management Strategies RLS
-- =============================================================================

-- Enable RLS
ALTER TABLE sim.practice_communication_management_strategies ENABLE ROW LEVEL SECURITY;

-- PMO can read all practice CMS
CREATE POLICY "practice_cms_pmo_read_all" ON sim.practice_communication_management_strategies
  FOR SELECT
  TO authenticated
  USING (
    sim.user_has_pmo_role_practice(auth.uid())
  );

-- PMO can write/update practice CMS where pmo_permission allows
CREATE POLICY "practice_cms_pmo_write" ON sim.practice_communication_management_strategies
  FOR ALL
  TO authenticated
  USING (
    sim.user_has_pmo_role_practice(auth.uid())
    AND (pmo_permission = 'write' OR pmo_permission = 'approve')
  )
  WITH CHECK (
    sim.user_has_pmo_role_practice(auth.uid())
    AND (pmo_permission = 'write' OR pmo_permission = 'approve')
  );

-- PM can read practice CMS where pm_permission allows
CREATE POLICY "practice_cms_pm_read" ON sim.practice_communication_management_strategies
  FOR SELECT
  TO authenticated
  USING (
    sim.user_has_pm_role_practice(auth.uid())
    AND pm_permission IN ('read', 'write', 'tailor')
  );

-- PM can write practice CMS where pm_permission = 'write' and not baseline
CREATE POLICY "practice_cms_pm_write" ON sim.practice_communication_management_strategies
  FOR ALL
  TO authenticated
  USING (
    sim.user_has_pm_role_practice(auth.uid())
    AND pm_permission = 'write'
    AND is_baseline = FALSE
  )
  WITH CHECK (
    sim.user_has_pm_role_practice(auth.uid())
    AND pm_permission = 'write'
    AND is_baseline = FALSE
  );

-- PM cannot modify practice baselines
CREATE POLICY "practice_cms_pm_no_baseline_modify" ON sim.practice_communication_management_strategies
  FOR UPDATE
  TO authenticated
  USING (
    sim.user_has_pm_role_practice(auth.uid())
    AND is_baseline = FALSE
  )
  WITH CHECK (
    sim.user_has_pm_role_practice(auth.uid())
    AND is_baseline = FALSE
  );

-- Only PMO can set is_baseline = true for practice documents
CREATE POLICY "practice_cms_only_pmo_baseline" ON sim.practice_communication_management_strategies
  FOR UPDATE
  TO authenticated
  USING (
    sim.user_has_pmo_role_practice(auth.uid())
  )
  WITH CHECK (
    (is_baseline = FALSE) OR (is_baseline = TRUE AND sim.user_has_pmo_role_practice(auth.uid()))
  );

-- =============================================================================
-- Practice Configuration Management Strategies RLS
-- =============================================================================

ALTER TABLE sim.practice_configuration_management_strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "practice_cfgms_pmo_read_all" ON sim.practice_configuration_management_strategies
  FOR SELECT TO authenticated
  USING (sim.user_has_pmo_role_practice(auth.uid()));

CREATE POLICY "practice_cfgms_pmo_write" ON sim.practice_configuration_management_strategies
  FOR ALL TO authenticated
  USING (
    sim.user_has_pmo_role_practice(auth.uid())
    AND (pmo_permission = 'write' OR pmo_permission = 'approve')
  )
  WITH CHECK (
    sim.user_has_pmo_role_practice(auth.uid())
    AND (pmo_permission = 'write' OR pmo_permission = 'approve')
  );

CREATE POLICY "practice_cfgms_pm_read" ON sim.practice_configuration_management_strategies
  FOR SELECT TO authenticated
  USING (
    sim.user_has_pm_role_practice(auth.uid())
    AND pm_permission IN ('read', 'write', 'tailor')
  );

CREATE POLICY "practice_cfgms_pm_write" ON sim.practice_configuration_management_strategies
  FOR ALL TO authenticated
  USING (
    sim.user_has_pm_role_practice(auth.uid())
    AND pm_permission = 'write'
    AND is_baseline = FALSE
  )
  WITH CHECK (
    sim.user_has_pm_role_practice(auth.uid())
    AND pm_permission = 'write'
    AND is_baseline = FALSE
  );

CREATE POLICY "practice_cfgms_pm_no_baseline_modify" ON sim.practice_configuration_management_strategies
  FOR UPDATE TO authenticated
  USING (
    sim.user_has_pm_role_practice(auth.uid())
    AND is_baseline = FALSE
  )
  WITH CHECK (
    sim.user_has_pm_role_practice(auth.uid())
    AND is_baseline = FALSE
  );

CREATE POLICY "practice_cfgms_only_pmo_baseline" ON sim.practice_configuration_management_strategies
  FOR UPDATE TO authenticated
  USING (sim.user_has_pmo_role_practice(auth.uid()))
  WITH CHECK (
    (is_baseline = FALSE) OR (is_baseline = TRUE AND sim.user_has_pmo_role_practice(auth.uid()))
  );

-- =============================================================================
-- Practice Quality Management Strategies RLS
-- =============================================================================

ALTER TABLE sim.practice_quality_management_strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "practice_qms_pmo_read_all" ON sim.practice_quality_management_strategies
  FOR SELECT TO authenticated
  USING (sim.user_has_pmo_role_practice(auth.uid()));

CREATE POLICY "practice_qms_pmo_write" ON sim.practice_quality_management_strategies
  FOR ALL TO authenticated
  USING (
    sim.user_has_pmo_role_practice(auth.uid())
    AND (pmo_permission = 'write' OR pmo_permission = 'approve')
  )
  WITH CHECK (
    sim.user_has_pmo_role_practice(auth.uid())
    AND (pmo_permission = 'write' OR pmo_permission = 'approve')
  );

CREATE POLICY "practice_qms_pm_read" ON sim.practice_quality_management_strategies
  FOR SELECT TO authenticated
  USING (
    sim.user_has_pm_role_practice(auth.uid())
    AND pm_permission IN ('read', 'write', 'tailor')
  );

CREATE POLICY "practice_qms_pm_write" ON sim.practice_quality_management_strategies
  FOR ALL TO authenticated
  USING (
    sim.user_has_pm_role_practice(auth.uid())
    AND pm_permission = 'write'
    AND is_baseline = FALSE
  )
  WITH CHECK (
    sim.user_has_pm_role_practice(auth.uid())
    AND pm_permission = 'write'
    AND is_baseline = FALSE
  );

CREATE POLICY "practice_qms_pm_no_baseline_modify" ON sim.practice_quality_management_strategies
  FOR UPDATE TO authenticated
  USING (
    sim.user_has_pm_role_practice(auth.uid())
    AND is_baseline = FALSE
  )
  WITH CHECK (
    sim.user_has_pm_role_practice(auth.uid())
    AND is_baseline = FALSE
  );

CREATE POLICY "practice_qms_only_pmo_baseline" ON sim.practice_quality_management_strategies
  FOR UPDATE TO authenticated
  USING (sim.user_has_pmo_role_practice(auth.uid()))
  WITH CHECK (
    (is_baseline = FALSE) OR (is_baseline = TRUE AND sim.user_has_pmo_role_practice(auth.uid()))
  );

-- =============================================================================
-- Practice Risk Management Strategies RLS
-- =============================================================================

ALTER TABLE sim.practice_risk_management_strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "practice_rms_pmo_read_all" ON sim.practice_risk_management_strategies
  FOR SELECT TO authenticated
  USING (sim.user_has_pmo_role_practice(auth.uid()));

CREATE POLICY "practice_rms_pmo_write" ON sim.practice_risk_management_strategies
  FOR ALL TO authenticated
  USING (
    sim.user_has_pmo_role_practice(auth.uid())
    AND (pmo_permission = 'write' OR pmo_permission = 'approve')
  )
  WITH CHECK (
    sim.user_has_pmo_role_practice(auth.uid())
    AND (pmo_permission = 'write' OR pmo_permission = 'approve')
  );

CREATE POLICY "practice_rms_pm_read" ON sim.practice_risk_management_strategies
  FOR SELECT TO authenticated
  USING (
    sim.user_has_pm_role_practice(auth.uid())
    AND pm_permission IN ('read', 'write', 'tailor')
  );

CREATE POLICY "practice_rms_pm_write" ON sim.practice_risk_management_strategies
  FOR ALL TO authenticated
  USING (
    sim.user_has_pm_role_practice(auth.uid())
    AND pm_permission = 'write'
    AND is_baseline = FALSE
  )
  WITH CHECK (
    sim.user_has_pm_role_practice(auth.uid())
    AND pm_permission = 'write'
    AND is_baseline = FALSE
  );

CREATE POLICY "practice_rms_pm_no_baseline_modify" ON sim.practice_risk_management_strategies
  FOR UPDATE TO authenticated
  USING (
    sim.user_has_pm_role_practice(auth.uid())
    AND is_baseline = FALSE
  )
  WITH CHECK (
    sim.user_has_pm_role_practice(auth.uid())
    AND is_baseline = FALSE
  );

CREATE POLICY "practice_rms_only_pmo_baseline" ON sim.practice_risk_management_strategies
  FOR UPDATE TO authenticated
  USING (sim.user_has_pmo_role_practice(auth.uid()))
  WITH CHECK (
    (is_baseline = FALSE) OR (is_baseline = TRUE AND sim.user_has_pmo_role_practice(auth.uid()))
  );

-- =============================================================================
-- Practice Project Briefs RLS
-- =============================================================================

ALTER TABLE sim.practice_project_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "practice_briefs_pmo_read_all" ON sim.practice_project_briefs
  FOR SELECT TO authenticated
  USING (sim.user_has_pmo_role_practice(auth.uid()));

CREATE POLICY "practice_briefs_pmo_approve" ON sim.practice_project_briefs
  FOR UPDATE TO authenticated
  USING (
    sim.user_has_pmo_role_practice(auth.uid())
    AND pmo_permission = 'approve'
  )
  WITH CHECK (
    sim.user_has_pmo_role_practice(auth.uid())
    AND pmo_permission = 'approve'
  );

CREATE POLICY "practice_briefs_pm_read" ON sim.practice_project_briefs
  FOR SELECT TO authenticated
  USING (
    sim.user_has_pm_role_practice(auth.uid())
    AND pm_permission IN ('read', 'write', 'tailor')
  );

CREATE POLICY "practice_briefs_pm_write" ON sim.practice_project_briefs
  FOR ALL TO authenticated
  USING (
    sim.user_has_pm_role_practice(auth.uid())
    AND pm_permission = 'write'
  )
  WITH CHECK (
    sim.user_has_pm_role_practice(auth.uid())
    AND pm_permission = 'write'
  );

-- =============================================================================
-- Practice Business Cases RLS
-- =============================================================================

ALTER TABLE sim.practice_business_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "practice_business_cases_pmo_read_all" ON sim.practice_business_cases
  FOR SELECT TO authenticated
  USING (sim.user_has_pmo_role_practice(auth.uid()));

CREATE POLICY "practice_business_cases_pmo_approve" ON sim.practice_business_cases
  FOR UPDATE TO authenticated
  USING (
    sim.user_has_pmo_role_practice(auth.uid())
    AND pmo_permission = 'approve'
  )
  WITH CHECK (
    sim.user_has_pmo_role_practice(auth.uid())
    AND pmo_permission = 'approve'
  );

CREATE POLICY "practice_business_cases_pm_read" ON sim.practice_business_cases
  FOR SELECT TO authenticated
  USING (
    sim.user_has_pm_role_practice(auth.uid())
    AND pm_permission IN ('read', 'write', 'tailor')
  );

CREATE POLICY "practice_business_cases_pm_write" ON sim.practice_business_cases
  FOR ALL TO authenticated
  USING (
    sim.user_has_pm_role_practice(auth.uid())
    AND pm_permission = 'write'
  )
  WITH CHECK (
    sim.user_has_pm_role_practice(auth.uid())
    AND pm_permission = 'write'
  );

-- =============================================================================
-- Practice Benefits Review Plans RLS
-- =============================================================================

ALTER TABLE sim.practice_benefits_review_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "practice_benefits_pmo_read_all" ON sim.practice_benefits_review_plans
  FOR SELECT TO authenticated
  USING (sim.user_has_pmo_role_practice(auth.uid()));

CREATE POLICY "practice_benefits_pmo_approve" ON sim.practice_benefits_review_plans
  FOR UPDATE TO authenticated
  USING (
    sim.user_has_pmo_role_practice(auth.uid())
    AND pmo_permission = 'approve'
  )
  WITH CHECK (
    sim.user_has_pmo_role_practice(auth.uid())
    AND pmo_permission = 'approve'
  );

CREATE POLICY "practice_benefits_pm_read" ON sim.practice_benefits_review_plans
  FOR SELECT TO authenticated
  USING (
    sim.user_has_pm_role_practice(auth.uid())
    AND pm_permission IN ('read', 'write', 'tailor')
  );

CREATE POLICY "practice_benefits_pm_write" ON sim.practice_benefits_review_plans
  FOR ALL TO authenticated
  USING (
    sim.user_has_pm_role_practice(auth.uid())
    AND pm_permission = 'write'
  )
  WITH CHECK (
    sim.user_has_pm_role_practice(auth.uid())
    AND pm_permission = 'write'
  );

-- Note: Additional RLS policies for PM practice delivery documents (risk registers, 
-- issue registers, etc.) should follow similar patterns based on their 
-- governance requirements. These are handled by existing practice RLS policies that 
-- check user_id ownership in sim schema.
