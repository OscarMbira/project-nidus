-- =============================================================================
-- v242: Simulator Practice Tables RLS Policies
-- Purpose: Row Level Security policies for all practice tables
-- PRD Reference: Simulator_Feature_Parity_Implementation_Plan.md Phase 1, Task 1.16
-- =============================================================================

-- Enable RLS on all practice tables
ALTER TABLE sim.practice_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_project_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_project_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_project_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_business_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_project_initiation_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_project_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_plan_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_plan_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_work_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_work_package_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_risk_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_risk_management_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_issue_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_issue_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_issue_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_issue_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_quality_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_quality_management_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_quality_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_daily_log_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_lessons_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_lesson_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_lessons_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_checkpoint_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_highlight_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_exception_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_end_stage_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_end_project_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_communication_management_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_configuration_management_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_configuration_item_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_benefits_review_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_product_descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_project_product_descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_product_status_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_portfolio_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_programme_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_stakeholder_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_governance_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_document_register ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's internal ID
CREATE OR REPLACE FUNCTION sim.get_current_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id FROM users 
    WHERE auth_user_id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies: Users can only access their own practice data
-- Practice Projects
CREATE POLICY "practice_projects_user_access" ON sim.practice_projects
  FOR ALL TO authenticated
  USING (user_id = sim.get_current_user_id())
  WITH CHECK (user_id = sim.get_current_user_id());

-- Practice Project Stages
CREATE POLICY "practice_stages_user_access" ON sim.practice_project_stages
  FOR ALL TO authenticated
  USING (user_id = sim.get_current_user_id())
  WITH CHECK (user_id = sim.get_current_user_id());

-- Practice Project Memberships
CREATE POLICY "practice_memberships_user_access" ON sim.practice_project_memberships
  FOR ALL TO authenticated
  USING (
    user_id = sim.get_current_user_id() OR
    practice_project_id IN (SELECT practice_project_id FROM sim.practice_project_memberships WHERE user_id = sim.get_current_user_id())
  )
  WITH CHECK (user_id = sim.get_current_user_id());

-- Practice Tasks
CREATE POLICY "practice_tasks_user_access" ON sim.practice_tasks
  FOR ALL TO authenticated
  USING (user_id = sim.get_current_user_id())
  WITH CHECK (user_id = sim.get_current_user_id());

-- Practice Task Assignments
CREATE POLICY "practice_task_assignments_user_access" ON sim.practice_task_assignments
  FOR ALL TO authenticated
  USING (
    user_id = sim.get_current_user_id() OR
    practice_task_id IN (SELECT id FROM sim.practice_tasks WHERE user_id = sim.get_current_user_id())
  )
  WITH CHECK (user_id = sim.get_current_user_id());

-- Practice Task Comments
CREATE POLICY "practice_task_comments_user_access" ON sim.practice_task_comments
  FOR ALL TO authenticated
  USING (
    user_id = sim.get_current_user_id() OR
    practice_task_id IN (SELECT id FROM sim.practice_tasks WHERE user_id = sim.get_current_user_id())
  )
  WITH CHECK (user_id = sim.get_current_user_id());

-- Practice Task Attachments
CREATE POLICY "practice_task_attachments_user_access" ON sim.practice_task_attachments
  FOR ALL TO authenticated
  USING (
    user_id = sim.get_current_user_id() OR
    practice_task_id IN (SELECT id FROM sim.practice_tasks WHERE user_id = sim.get_current_user_id())
  )
  WITH CHECK (user_id = sim.get_current_user_id());

-- Practice Briefs
CREATE POLICY "practice_briefs_user_access" ON sim.practice_project_briefs
  FOR ALL TO authenticated
  USING (user_id = sim.get_current_user_id())
  WITH CHECK (user_id = sim.get_current_user_id());

-- Practice Business Cases
CREATE POLICY "practice_business_cases_user_access" ON sim.practice_business_cases
  FOR ALL TO authenticated
  USING (user_id = sim.get_current_user_id())
  WITH CHECK (user_id = sim.get_current_user_id());

-- Practice PIDs
CREATE POLICY "practice_pids_user_access" ON sim.practice_project_initiation_documents
  FOR ALL TO authenticated
  USING (user_id = sim.get_current_user_id())
  WITH CHECK (user_id = sim.get_current_user_id());

-- Practice Plans
CREATE POLICY "practice_plans_user_access" ON sim.practice_project_plans
  FOR ALL TO authenticated
  USING (user_id = sim.get_current_user_id())
  WITH CHECK (user_id = sim.get_current_user_id());

-- Practice Plan Milestones
CREATE POLICY "practice_plan_milestones_user_access" ON sim.practice_plan_milestones
  FOR ALL TO authenticated
  USING (
    practice_plan_id IN (SELECT id FROM sim.practice_project_plans WHERE user_id = sim.get_current_user_id())
  )
  WITH CHECK (
    practice_plan_id IN (SELECT id FROM sim.practice_project_plans WHERE user_id = sim.get_current_user_id())
  );

-- Practice Plan Resources
CREATE POLICY "practice_plan_resources_user_access" ON sim.practice_plan_resources
  FOR ALL TO authenticated
  USING (
    practice_plan_id IN (SELECT id FROM sim.practice_project_plans WHERE user_id = sim.get_current_user_id())
  )
  WITH CHECK (
    practice_plan_id IN (SELECT id FROM sim.practice_project_plans WHERE user_id = sim.get_current_user_id())
  );

-- Practice Work Packages
CREATE POLICY "practice_work_packages_user_access" ON sim.practice_work_packages
  FOR ALL TO authenticated
  USING (user_id = sim.get_current_user_id())
  WITH CHECK (user_id = sim.get_current_user_id());

-- Practice Work Package Products
CREATE POLICY "practice_wp_products_user_access" ON sim.practice_work_package_products
  FOR ALL TO authenticated
  USING (
    practice_work_package_id IN (SELECT id FROM sim.practice_work_packages WHERE user_id = sim.get_current_user_id())
  )
  WITH CHECK (
    practice_work_package_id IN (SELECT id FROM sim.practice_work_packages WHERE user_id = sim.get_current_user_id())
  );

-- Practice Risk Register
CREATE POLICY "practice_risk_register_user_access" ON sim.practice_risk_register
  FOR ALL TO authenticated
  USING (user_id = sim.get_current_user_id())
  WITH CHECK (user_id = sim.get_current_user_id());

-- Practice Risks
CREATE POLICY "practice_risks_user_access" ON sim.practice_risks
  FOR ALL TO authenticated
  USING (user_id = sim.get_current_user_id())
  WITH CHECK (user_id = sim.get_current_user_id());

-- Practice Risk Management Strategies
CREATE POLICY "practice_rms_user_access" ON sim.practice_risk_management_strategies
  FOR ALL TO authenticated
  USING (user_id = sim.get_current_user_id())
  WITH CHECK (user_id = sim.get_current_user_id());

-- Practice Issue Register
CREATE POLICY "practice_issue_register_user_access" ON sim.practice_issue_register
  FOR ALL TO authenticated
  USING (user_id = sim.get_current_user_id())
  WITH CHECK (user_id = sim.get_current_user_id());

-- Practice Issues
CREATE POLICY "practice_issues_user_access" ON sim.practice_issues
  FOR ALL TO authenticated
  USING (user_id = sim.get_current_user_id())
  WITH CHECK (user_id = sim.get_current_user_id());

-- Practice Issue Reports
CREATE POLICY "practice_issue_reports_user_access" ON sim.practice_issue_reports
  FOR ALL TO authenticated
  USING (user_id = sim.get_current_user_id())
  WITH CHECK (user_id = sim.get_current_user_id());

-- Practice Issue Actions
CREATE POLICY "practice_issue_actions_user_access" ON sim.practice_issue_actions
  FOR ALL TO authenticated
  USING (
    practice_issue_id IN (SELECT id FROM sim.practice_issues WHERE user_id = sim.get_current_user_id())
  )
  WITH CHECK (
    practice_issue_id IN (SELECT id FROM sim.practice_issues WHERE user_id = sim.get_current_user_id())
  );

-- Practice Issue Decisions
CREATE POLICY "practice_issue_decisions_user_access" ON sim.practice_issue_decisions
  FOR ALL TO authenticated
  USING (
    practice_issue_id IN (SELECT id FROM sim.practice_issues WHERE user_id = sim.get_current_user_id())
  )
  WITH CHECK (
    practice_issue_id IN (SELECT id FROM sim.practice_issues WHERE user_id = sim.get_current_user_id())
  );

-- Practice Quality Register
CREATE POLICY "practice_quality_register_user_access" ON sim.practice_quality_register
  FOR ALL TO authenticated
  USING (user_id = sim.get_current_user_id())
  WITH CHECK (user_id = sim.get_current_user_id());

-- Practice Quality Management Strategies
CREATE POLICY "practice_qms_user_access" ON sim.practice_quality_management_strategies
  FOR ALL TO authenticated
  USING (user_id = sim.get_current_user_id())
  WITH CHECK (user_id = sim.get_current_user_id());

-- Practice Quality Activities
CREATE POLICY "practice_quality_activities_user_access" ON sim.practice_quality_activities
  FOR ALL TO authenticated
  USING (user_id = sim.get_current_user_id())
  WITH CHECK (user_id = sim.get_current_user_id());

-- Practice Daily Logs
CREATE POLICY "practice_daily_logs_user_access" ON sim.practice_daily_logs
  FOR ALL TO authenticated
  USING (user_id = sim.get_current_user_id())
  WITH CHECK (user_id = sim.get_current_user_id());

-- Practice Daily Log Entries
CREATE POLICY "practice_daily_log_entries_user_access" ON sim.practice_daily_log_entries
  FOR ALL TO authenticated
  USING (
    practice_daily_log_id IN (SELECT id FROM sim.practice_daily_logs WHERE user_id = sim.get_current_user_id())
  )
  WITH CHECK (
    practice_daily_log_id IN (SELECT id FROM sim.practice_daily_logs WHERE user_id = sim.get_current_user_id())
  );

-- Practice Lessons Log
CREATE POLICY "practice_lessons_log_user_access" ON sim.practice_lessons_log
  FOR ALL TO authenticated
  USING (user_id = sim.get_current_user_id())
  WITH CHECK (user_id = sim.get_current_user_id());

-- Practice Lesson Entries
CREATE POLICY "practice_lesson_entries_user_access" ON sim.practice_lesson_entries
  FOR ALL TO authenticated
  USING (
    practice_lessons_log_id IN (SELECT id FROM sim.practice_lessons_log WHERE user_id = sim.get_current_user_id())
  )
  WITH CHECK (
    practice_lessons_log_id IN (SELECT id FROM sim.practice_lessons_log WHERE user_id = sim.get_current_user_id())
  );

-- Practice Lessons Reports
CREATE POLICY "practice_lessons_reports_user_access" ON sim.practice_lessons_reports
  FOR ALL TO authenticated
  USING (user_id = sim.get_current_user_id())
  WITH CHECK (user_id = sim.get_current_user_id());

-- Practice Checkpoint Reports
CREATE POLICY "practice_checkpoint_reports_user_access" ON sim.practice_checkpoint_reports
  FOR ALL TO authenticated
  USING (user_id = sim.get_current_user_id())
  WITH CHECK (user_id = sim.get_current_user_id());

-- Practice Highlight Reports
CREATE POLICY "practice_highlight_reports_user_access" ON sim.practice_highlight_reports
  FOR ALL TO authenticated
  USING (user_id = sim.get_current_user_id())
  WITH CHECK (user_id = sim.get_current_user_id());

-- Practice Exception Reports
CREATE POLICY "practice_exception_reports_user_access" ON sim.practice_exception_reports
  FOR ALL TO authenticated
  USING (user_id = sim.get_current_user_id())
  WITH CHECK (user_id = sim.get_current_user_id());

-- Practice End Stage Reports
CREATE POLICY "practice_end_stage_reports_user_access" ON sim.practice_end_stage_reports
  FOR ALL TO authenticated
  USING (user_id = sim.get_current_user_id())
  WITH CHECK (user_id = sim.get_current_user_id());

-- Practice End Project Reports
CREATE POLICY "practice_end_project_reports_user_access" ON sim.practice_end_project_reports
  FOR ALL TO authenticated
  USING (user_id = sim.get_current_user_id())
  WITH CHECK (user_id = sim.get_current_user_id());

-- Practice Communication Management Strategies
CREATE POLICY "practice_cms_user_access" ON sim.practice_communication_management_strategies
  FOR ALL TO authenticated
  USING (user_id = sim.get_current_user_id())
  WITH CHECK (user_id = sim.get_current_user_id());

-- Practice Configuration Management Strategies
CREATE POLICY "practice_config_ms_user_access" ON sim.practice_configuration_management_strategies
  FOR ALL TO authenticated
  USING (user_id = sim.get_current_user_id())
  WITH CHECK (user_id = sim.get_current_user_id());

-- Practice Configuration Item Records
CREATE POLICY "practice_config_items_user_access" ON sim.practice_configuration_item_records
  FOR ALL TO authenticated
  USING (user_id = sim.get_current_user_id())
  WITH CHECK (user_id = sim.get_current_user_id());

-- Practice Benefits Review Plans
CREATE POLICY "practice_benefits_plans_user_access" ON sim.practice_benefits_review_plans
  FOR ALL TO authenticated
  USING (user_id = sim.get_current_user_id())
  WITH CHECK (user_id = sim.get_current_user_id());

-- Practice Product Descriptions
CREATE POLICY "practice_product_descriptions_user_access" ON sim.practice_product_descriptions
  FOR ALL TO authenticated
  USING (user_id = sim.get_current_user_id())
  WITH CHECK (user_id = sim.get_current_user_id());

-- Practice Project Product Descriptions
CREATE POLICY "practice_ppd_user_access" ON sim.practice_project_product_descriptions
  FOR ALL TO authenticated
  USING (user_id = sim.get_current_user_id())
  WITH CHECK (user_id = sim.get_current_user_id());

-- Practice Product Status Accounts
CREATE POLICY "practice_psa_user_access" ON sim.practice_product_status_accounts
  FOR ALL TO authenticated
  USING (user_id = sim.get_current_user_id())
  WITH CHECK (user_id = sim.get_current_user_id());

-- Practice Portfolios
CREATE POLICY "practice_portfolios_user_access" ON sim.practice_portfolios
  FOR ALL TO authenticated
  USING (user_id = sim.get_current_user_id())
  WITH CHECK (user_id = sim.get_current_user_id());

-- Practice Programmes
CREATE POLICY "practice_programmes_user_access" ON sim.practice_programmes
  FOR ALL TO authenticated
  USING (user_id = sim.get_current_user_id())
  WITH CHECK (user_id = sim.get_current_user_id());

-- Practice Portfolio Projects
CREATE POLICY "practice_portfolio_projects_user_access" ON sim.practice_portfolio_projects
  FOR ALL TO authenticated
  USING (
    practice_portfolio_id IN (SELECT id FROM sim.practice_portfolios WHERE user_id = sim.get_current_user_id())
  )
  WITH CHECK (
    practice_portfolio_id IN (SELECT id FROM sim.practice_portfolios WHERE user_id = sim.get_current_user_id())
  );

-- Practice Programme Projects
CREATE POLICY "practice_programme_projects_user_access" ON sim.practice_programme_projects
  FOR ALL TO authenticated
  USING (
    practice_programme_id IN (SELECT id FROM sim.practice_programmes WHERE user_id = sim.get_current_user_id())
  )
  WITH CHECK (
    practice_programme_id IN (SELECT id FROM sim.practice_programmes WHERE user_id = sim.get_current_user_id())
  );

-- Practice Dependencies
CREATE POLICY "practice_dependencies_user_access" ON sim.practice_dependencies
  FOR ALL TO authenticated
  USING (user_id = sim.get_current_user_id())
  WITH CHECK (user_id = sim.get_current_user_id());

-- Practice Stakeholder Register
CREATE POLICY "practice_stakeholders_user_access" ON sim.practice_stakeholder_register
  FOR ALL TO authenticated
  USING (user_id = sim.get_current_user_id())
  WITH CHECK (user_id = sim.get_current_user_id());

-- Practice Teams
CREATE POLICY "practice_teams_user_access" ON sim.practice_teams
  FOR ALL TO authenticated
  USING (user_id = sim.get_current_user_id())
  WITH CHECK (user_id = sim.get_current_user_id());

-- Practice Team Members
CREATE POLICY "practice_team_members_user_access" ON sim.practice_team_members
  FOR ALL TO authenticated
  USING (
    practice_team_id IN (SELECT id FROM sim.practice_teams WHERE user_id = sim.get_current_user_id()) OR
    user_id = sim.get_current_user_id()
  )
  WITH CHECK (
    practice_team_id IN (SELECT id FROM sim.practice_teams WHERE user_id = sim.get_current_user_id())
  );

-- Practice Governance Decisions
CREATE POLICY "practice_governance_decisions_user_access" ON sim.practice_governance_decisions
  FOR ALL TO authenticated
  USING (user_id = sim.get_current_user_id())
  WITH CHECK (user_id = sim.get_current_user_id());

-- Practice Document Register
CREATE POLICY "practice_document_register_user_access" ON sim.practice_document_register
  FOR ALL TO authenticated
  USING (user_id = sim.get_current_user_id())
  WITH CHECK (user_id = sim.get_current_user_id());

-- Note: Instructors/enterprise admins can view learner practice data
-- This would require additional policies based on role checks, which can be added later
-- For now, all practice data is user-scoped
