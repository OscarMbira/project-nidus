-- ============================================================================
-- v370 (replaces v370–v382 split): RLS for sim PM planning tables
-- Owner access via sim.practice_projects.user_id = sim.get_current_user_id()
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON sim.scope_management_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE ON sim.requirements_register TO authenticated;
GRANT SELECT, INSERT, UPDATE ON sim.requirements_traceability_matrix TO authenticated;
GRANT SELECT, INSERT, UPDATE ON sim.scope_statements TO authenticated;
GRANT SELECT, INSERT, UPDATE ON sim.wbs_nodes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON sim.schedule_management_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE ON sim.activity_list TO authenticated;
GRANT SELECT, INSERT, UPDATE ON sim.activity_dependencies TO authenticated;

ALTER TABLE sim.scope_management_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.requirements_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.requirements_traceability_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.scope_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.wbs_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.schedule_management_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.activity_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.activity_dependencies ENABLE ROW LEVEL SECURITY;

-- scope_management_plans
DROP POLICY IF EXISTS sim_smp_all ON sim.scope_management_plans;
CREATE POLICY sim_smp_all ON sim.scope_management_plans FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sim.practice_projects pp
    WHERE pp.id = scope_management_plans.practice_project_id
      AND pp.user_id = sim.get_current_user_id()
      AND COALESCE(pp.is_deleted, false) = false
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM sim.practice_projects pp
    WHERE pp.id = practice_project_id AND pp.user_id = sim.get_current_user_id()
  ));

-- requirements_register
DROP POLICY IF EXISTS sim_rr_all ON sim.requirements_register;
CREATE POLICY sim_rr_all ON sim.requirements_register FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sim.practice_projects pp
    WHERE pp.id = requirements_register.practice_project_id
      AND pp.user_id = sim.get_current_user_id()
      AND COALESCE(pp.is_deleted, false) = false
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM sim.practice_projects pp
    WHERE pp.id = practice_project_id AND pp.user_id = sim.get_current_user_id()
  ));

-- traceability
DROP POLICY IF EXISTS sim_rtm_all ON sim.requirements_traceability_matrix;
CREATE POLICY sim_rtm_all ON sim.requirements_traceability_matrix FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sim.requirements_register rr
    JOIN sim.practice_projects pp ON pp.id = rr.practice_project_id
    WHERE rr.id = requirements_traceability_matrix.requirement_id
      AND pp.user_id = sim.get_current_user_id()
      AND COALESCE(pp.is_deleted, false) = false
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM sim.requirements_register rr
    JOIN sim.practice_projects pp ON pp.id = rr.practice_project_id
    WHERE rr.id = requirement_id AND pp.user_id = sim.get_current_user_id()
  ));

-- scope_statements
DROP POLICY IF EXISTS sim_ss_all ON sim.scope_statements;
CREATE POLICY sim_ss_all ON sim.scope_statements FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sim.practice_projects pp
    WHERE pp.id = scope_statements.practice_project_id
      AND pp.user_id = sim.get_current_user_id()
      AND COALESCE(pp.is_deleted, false) = false
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM sim.practice_projects pp
    WHERE pp.id = practice_project_id AND pp.user_id = sim.get_current_user_id()
  ));

-- wbs_nodes
DROP POLICY IF EXISTS sim_wbs_all ON sim.wbs_nodes;
CREATE POLICY sim_wbs_all ON sim.wbs_nodes FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sim.practice_projects pp
    WHERE pp.id = wbs_nodes.practice_project_id
      AND pp.user_id = sim.get_current_user_id()
      AND COALESCE(pp.is_deleted, false) = false
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM sim.practice_projects pp
    WHERE pp.id = practice_project_id AND pp.user_id = sim.get_current_user_id()
  ));

-- schedule_management_plans
DROP POLICY IF EXISTS sim_schedp_all ON sim.schedule_management_plans;
CREATE POLICY sim_schedp_all ON sim.schedule_management_plans FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sim.practice_projects pp
    WHERE pp.id = schedule_management_plans.practice_project_id
      AND pp.user_id = sim.get_current_user_id()
      AND COALESCE(pp.is_deleted, false) = false
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM sim.practice_projects pp
    WHERE pp.id = practice_project_id AND pp.user_id = sim.get_current_user_id()
  ));

-- activity_list
DROP POLICY IF EXISTS sim_al_all ON sim.activity_list;
CREATE POLICY sim_al_all ON sim.activity_list FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sim.practice_projects pp
    WHERE pp.id = activity_list.practice_project_id
      AND pp.user_id = sim.get_current_user_id()
      AND COALESCE(pp.is_deleted, false) = false
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM sim.practice_projects pp
    WHERE pp.id = practice_project_id AND pp.user_id = sim.get_current_user_id()
  ));

-- activity_dependencies
DROP POLICY IF EXISTS sim_ad_all ON sim.activity_dependencies;
CREATE POLICY sim_ad_all ON sim.activity_dependencies FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sim.practice_projects pp
    WHERE pp.id = activity_dependencies.practice_project_id
      AND pp.user_id = sim.get_current_user_id()
      AND COALESCE(pp.is_deleted, false) = false
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM sim.practice_projects pp
    WHERE pp.id = practice_project_id AND pp.user_id = sim.get_current_user_id()
  ));
