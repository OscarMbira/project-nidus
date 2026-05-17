-- ============================================================================
-- v569: Assign rationalised PM sidebar items to project_manager role
-- Prerequisites: v568_pm_menu_items_seed.sql, v399, v401, v573
-- ============================================================================

DO $$
DECLARE
  v_pm_role_id UUID;
BEGIN
  SELECT id INTO v_pm_role_id FROM roles WHERE role_name = 'project_manager' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
  IF v_pm_role_id IS NULL THEN
    RAISE NOTICE 'v569: project_manager role not found';
    RETURN;
  END IF;

  -- Full / Contribute: can_view + can_use
  INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
  SELECT v_pm_role_id, m.id, TRUE, TRUE, TRUE, FALSE
  FROM menu_items m
  WHERE COALESCE(m.is_deleted, FALSE) = FALSE
    AND m.menu_code IN (
      SELECT unnest(ARRAY[
        'pm_section_dashboard', 'pm_project_dashboard',
        'pm_section_my_projects', 'pm_my_projects', 'pm_create_project', 'pm_on_hold_projects',
        'pm_team_members_section', 'pm_manage_members', 'pm_invite_team_manager', 'pm_invite_project_member', 'pm_pending_invitations',
        'pm_planning_section', 'pm_plans_group', 'pm_scope_group', 'pm_schedule_group', 'pm_resource_group', 'pm_advanced_planning_group',
        'pm_plans_dashboard', 'pm_project_plan', 'pm_stage_plan_create',
        'pm_scope_statement', 'pm_scope_management_plan', 'pm_wbs_builder', 'pm_requirements_register', 'pm_traceability_matrix',
        'pm_schedule_management_plan', 'pm_activity_list', 'pm_activity_sequencing', 'pm_gantt_chart',
        'pm_resource_list', 'pm_resource_capacity',
        'pm_planning_hub', 'pm_planning_ai', 'pm_planning_scenarios', 'pm_planning_pbs', 'pm_planning_health',
        'pm_planning_confidence', 'pm_planning_recovery', 'pm_planning_governance', 'pm_microplans', 'pm_microplans_drafts',
        'pm_section_delivery_controls', 'pm_raid_risk_register', 'pm_raid_issue_log', 'pm_raid_change_requests', 'pm_raid_delay_register',
        'pm_raid_daily_log', 'pm_raid_lessons_log',
        'pm_delivery_work_packages', 'pm_delivery_checkpoint_reports', 'pm_delivery_product_description',
        'pm_delivery_project_product_description', 'pm_delivery_product_status_account',
        'pm_section_process_forms', 'pm_forms_initiating', 'pm_forms_planning', 'pm_forms_executing', 'pm_forms_monitoring',
        'pm_forms_closing', 'pm_forms_agile', 'pm_forms_drafts', 'pm_forms_pending_approvals',
        'pm_section_tasks', 'pm_tasks_my', 'pm_tasks_board', 'pm_tasks_calendar',
        'pm_section_initiation_docs', 'pm_init_docs_business_case', 'pm_init_docs_project_brief', 'pm_init_docs_work_authorisations',
        'pm_section_reporting', 'pm_reports_library', 'pm_reports_builder', 'pm_reports_highlight', 'pm_reports_exception',
        'pm_reports_end_stage', 'pm_reports_end_project',
        'pm_section_quality_testing', 'pm_testing_dashboard', 'pm_testing_cases', 'pm_testing_suites', 'pm_testing_runs',
        'pm_testing_evidence', 'pm_testing_defects', 'pm_quality_register',
        'pm_section_stakeholders', 'pm_stakeholders_register', 'pm_stakeholders_engagement', 'pm_stakeholders_comms_plans',
        'pm_section_knowledge_resources', 'pm_ai_assistant',
        'pm_comms_section', 'pm_comms_hub', 'pm_comms_schedule_meeting', 'pm_comms_meetings', 'pm_comms_summaries',
        'pm_comms_direct', 'pm_comms_channels', 'pm_comms_pending_review',
        'org_knowledge', 'org_knowledge_eef', 'org_knowledge_opa', 'org_knowledge_opa_new', 'org_knowledge_opa_drafts',
        'pm_project_opa_templates', 'sim_pm_project_opa_templates',
        'platform_work_authorisation', 'platform_work_authorisation_drafts'
      ])
    )
  ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
    can_view = TRUE, can_use = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

  -- View-only: can_view, NOT can_use
  INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
  SELECT v_pm_role_id, m.id, TRUE, FALSE, TRUE, FALSE
  FROM menu_items m
  WHERE COALESCE(m.is_deleted, FALSE) = FALSE
    AND m.menu_code IN (
      'pm_archived_projects',
      'pm_resource_conflicts',
      'pm_planning_intelligence',
      'pm_reports_analytics',
      'pm_section_governance_baselines',
      'pm_gov_baseline_comms_strategy', 'pm_gov_baseline_config_strategy', 'pm_gov_baseline_quality_strategy',
      'pm_gov_baseline_risk_strategy', 'pm_gov_baseline_itto_templates', 'pm_gov_baseline_mandate',
      'pm_template_library', 'pm_resource_directory', 'pm_skill_matrix',
      'org_knowledge_eef_new', 'org_knowledge_eef_drafts', 'org_knowledge_eef_bulk',
      'org_knowledge_opa_bulk', 'pm_opa_templates_browse', 'sim_pm_opa_templates_browse'
    )
  ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
    can_view = TRUE, can_use = FALSE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

  -- Org knowledge hub: view
  INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
  SELECT v_pm_role_id, m.id, TRUE, TRUE, TRUE, FALSE
  FROM menu_items m
  WHERE m.menu_code = 'org_knowledge' AND COALESCE(m.is_deleted, FALSE) = FALSE
  ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

  -- Deactivate legacy v449 PM dashboard tree for project_manager (replaced by v568 sections)
  UPDATE role_menu_items rmi
  SET is_active = FALSE, is_deleted = TRUE, updated_at = NOW()
  FROM menu_items mi
  WHERE rmi.role_id = v_pm_role_id
    AND rmi.menu_item_id = mi.id
    AND mi.menu_code IN (
      'pm_dashboard', 'pm_governance', 'pm_initiation', 'pm_delivery', 'pm_controls', 'pm_reporting',
      'pm_financial', 'pm_itto', 'pm_delays', 'pm_closure',
      'pm_gov_mandate', 'pm_gov_communication_strategy', 'pm_gov_configuration_strategy', 'pm_gov_quality_strategy', 'pm_gov_risk_strategy',
      'pm_init_business_case', 'pm_init_project_brief', 'pm_init_pid', 'pm_init_benefits_review_plan',
      'pm_controls_risk_register', 'pm_controls_issue_register', 'pm_controls_quality_register',
      'pm_controls_configuration_items', 'pm_controls_lessons_log',
      'pm_report_checkpoint', 'pm_report_highlight', 'pm_report_issue_reports', 'pm_report_exception', 'pm_report_end_stage',
      'pm_fin_my_expenses', 'pm_fin_exp_approvals', 'pm_fin_reports', 'pm_fin_portfolio_evm',
      'pm_itto_templates', 'pm_itto_project', 'pm_itto_drafts',
      'pm_delay_register', 'pm_delay_drafts',
      'pm_closure_lessons_report', 'pm_closure_end_project_report',
      'pm_delivery_daily_log'
    );

  RAISE NOTICE 'v569_pm_role_menu_items_assign.sql applied';
END $$;
