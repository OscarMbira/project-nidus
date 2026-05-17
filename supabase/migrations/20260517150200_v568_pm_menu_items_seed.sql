-- ============================================================================
-- v568: PM sidebar rationalisation — menu_items (§1–§15)
-- Prerequisites: v05 menu tables, v399 team section, v401 org knowledge, v410 comms
-- Does NOT modify pmoMenuConfig or PMO-only items.
-- ============================================================================

DO $$
DECLARE
  v_s1 UUID; v_s2 UUID; v_s3 UUID; v_s4 UUID; v_s5 UUID; v_s6 UUID;
  v_s7 UUID; v_s8 UUID; v_s9 UUID; v_s10 UUID; v_s11 UUID; v_s12 UUID; v_s14 UUID; v_s15 UUID;
  v_plans UUID; v_scope UUID; v_sched UUID; v_res UUID; v_adv UUID;
BEGIN
  -- §1 Project Dashboard
  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('pm_section_dashboard', 'Project Dashboard', 'PM project-scoped dashboard', NULL, 1, 100, NULL, 'layout-dashboard', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();
  SELECT id INTO v_s1 FROM menu_items WHERE menu_code = 'pm_section_dashboard' LIMIT 1;

  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('pm_project_dashboard', 'Project Dashboard', 'Project dashboard tab', v_s1, 2, 1, '/platform/dashboard?tab=projects', 'layout-dashboard', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = v_s1, route_path = EXCLUDED.route_path, sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

  -- §2 My Projects
  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('pm_section_my_projects', 'My Projects', 'Project list and lifecycle', NULL, 1, 110, NULL, 'folder-kanban', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();
  SELECT id INTO v_s2 FROM menu_items WHERE menu_code = 'pm_section_my_projects' LIMIT 1;

  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES
    ('pm_my_projects', 'My Projects', NULL, v_s2, 2, 1, '/platform/projects', 'folder-kanban', TRUE, TRUE),
    ('pm_create_project', 'Create Project', NULL, v_s2, 2, 2, '/platform/projects/create', 'folder-plus', TRUE, TRUE),
    ('pm_on_hold_projects', 'On Hold / Drafts', NULL, v_s2, 2, 3, '/app/projects/on-hold', 'pause-circle', TRUE, TRUE),
    ('pm_archived_projects', 'Archived Projects', NULL, v_s2, 2, 4, '/platform/projects/archives', 'archive', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

  -- §4 Project Planning
  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('pm_planning_section', 'Project Planning', 'Plans, scope, schedule, resources, advanced planning', NULL, 1, 130, NULL, 'calendar-range', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();
  SELECT id INTO v_s4 FROM menu_items WHERE menu_code = 'pm_planning_section' LIMIT 1;

  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES
    ('pm_plans_group', 'Plans & Documents', NULL, v_s4, 2, 10, NULL, 'file-text', TRUE, TRUE),
    ('pm_scope_group', 'Scope Management', NULL, v_s4, 2, 20, NULL, 'target', TRUE, TRUE),
    ('pm_schedule_group', 'Schedule & Activities', NULL, v_s4, 2, 30, NULL, 'calendar', TRUE, TRUE),
    ('pm_resource_group', 'Resource Planning', NULL, v_s4, 2, 40, NULL, 'users', TRUE, TRUE),
    ('pm_advanced_planning_group', 'Advanced Planning Tools', NULL, v_s4, 2, 50, NULL, 'sparkles', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = v_s4, sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

  SELECT id INTO v_plans FROM menu_items WHERE menu_code = 'pm_plans_group' LIMIT 1;
  SELECT id INTO v_scope FROM menu_items WHERE menu_code = 'pm_scope_group' LIMIT 1;
  SELECT id INTO v_sched FROM menu_items WHERE menu_code = 'pm_schedule_group' LIMIT 1;
  SELECT id INTO v_res FROM menu_items WHERE menu_code = 'pm_resource_group' LIMIT 1;
  SELECT id INTO v_adv FROM menu_items WHERE menu_code = 'pm_advanced_planning_group' LIMIT 1;

  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES
    ('pm_plans_dashboard', 'Plans Dashboard', NULL, v_plans, 3, 1, '/platform/projects/:id/plans', 'layout-grid', TRUE, TRUE),
    ('pm_project_plan', 'Project Plan', NULL, v_plans, 3, 2, '/platform/projects/:id/plans/project-plan', 'file-text', TRUE, TRUE),
    ('pm_stage_plan_create', 'Create Stage Plan', NULL, v_plans, 3, 3, '/platform/projects/:id/plans/stage-plan/create', 'file-plus', TRUE, TRUE),
    ('pm_scope_statement', 'Scope Statement', NULL, v_scope, 3, 1, '/platform/projects/:id/scope/statement', 'file-text', TRUE, TRUE),
    ('pm_scope_management_plan', 'Scope Management Plan', NULL, v_scope, 3, 2, '/platform/projects/:id/scope/management-plan', 'clipboard-list', TRUE, TRUE),
    ('pm_wbs_builder', 'WBS Builder', NULL, v_scope, 3, 3, '/platform/projects/:id/scope/wbs', 'network', TRUE, TRUE),
    ('pm_requirements_register', 'Requirements Register', NULL, v_scope, 3, 4, '/platform/projects/:id/scope/requirements', 'list', TRUE, TRUE),
    ('pm_traceability_matrix', 'Traceability Matrix', NULL, v_scope, 3, 5, '/platform/projects/:id/scope/traceability', 'git-merge', TRUE, TRUE),
    ('pm_schedule_management_plan', 'Schedule Management Plan', NULL, v_sched, 3, 1, '/platform/projects/:id/schedule/management-plan', 'calendar', TRUE, TRUE),
    ('pm_activity_list', 'Activity List', NULL, v_sched, 3, 2, '/platform/projects/:id/schedule/activities', 'list', TRUE, TRUE),
    ('pm_activity_sequencing', 'Activity Sequencing', NULL, v_sched, 3, 3, '/platform/projects/:id/schedule/dependencies', 'git-branch', TRUE, TRUE),
    ('pm_gantt_chart', 'Gantt Chart', NULL, v_sched, 3, 4, '/platform/projects/:id/schedule/gantt', 'bar-chart-horizontal', TRUE, TRUE),
    ('pm_resource_list', 'Resource List', NULL, v_res, 3, 1, '/platform/resources', 'users', TRUE, TRUE),
    ('pm_resource_capacity', 'Capacity Planning', NULL, v_res, 3, 2, '/platform/resources/capacity', 'bar-chart-2', TRUE, TRUE),
    ('pm_resource_conflicts', 'Resource Conflicts', NULL, v_res, 3, 3, '/platform/resources/conflicts', 'alert-triangle', TRUE, TRUE),
    ('pm_planning_hub', 'Planning Hub', NULL, v_adv, 3, 1, '/pm/planning', 'compass', TRUE, TRUE),
    ('pm_planning_ai', 'AI Plan Generator', NULL, v_adv, 3, 2, '/pm/planning/ai', 'bot', TRUE, TRUE),
    ('pm_planning_scenarios', 'What-If Scenarios', NULL, v_adv, 3, 3, '/pm/planning/scenarios', 'flask-conical', TRUE, TRUE),
    ('pm_planning_pbs', 'PBS Builder', NULL, v_adv, 3, 4, '/pm/planning/pbs', 'layers', TRUE, TRUE),
    ('pm_planning_health', 'Plan Health Dashboard', NULL, v_adv, 3, 5, '/pm/planning/health', 'activity', TRUE, TRUE),
    ('pm_planning_confidence', 'Confidence Forecast', NULL, v_adv, 3, 6, '/pm/planning/confidence', 'trending-up', TRUE, TRUE),
    ('pm_planning_recovery', 'Recovery Planning', NULL, v_adv, 3, 7, '/pm/planning/recovery', 'life-buoy', TRUE, TRUE),
    ('pm_planning_governance', 'Governance Gates', NULL, v_adv, 3, 8, '/pm/planning/governance', 'shield-check', TRUE, TRUE),
    ('pm_planning_intelligence', 'Planning Analytics', NULL, v_adv, 3, 9, '/pm/planning/intelligence', 'pie-chart', TRUE, TRUE),
    ('pm_microplans', 'Micro Plans', NULL, v_adv, 3, 10, '/pm/planning/microplans', 'list', TRUE, TRUE),
    ('pm_microplans_drafts', 'Micro Plan Drafts', NULL, v_adv, 3, 11, '/pm/planning/microplans/drafts', 'pause', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

  -- §5 Delivery Controls
  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('pm_section_delivery_controls', 'Delivery Controls', 'RAID, change, delay, team artefacts', NULL, 1, 200, NULL, 'shield-alert', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();
  SELECT id INTO v_s5 FROM menu_items WHERE menu_code = 'pm_section_delivery_controls' LIMIT 1;

  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES
    ('pm_raid_risk_register', 'Risk Register', NULL, v_s5, 2, 1, '/app/risks', 'alert-triangle', TRUE, TRUE),
    ('pm_raid_issue_log', 'Issue Log', NULL, v_s5, 2, 2, '/app/issues', 'alert-circle', TRUE, TRUE),
    ('pm_raid_change_requests', 'Change Requests', NULL, v_s5, 2, 3, '/app/change-requests', 'git-pull-request', TRUE, TRUE),
    ('pm_raid_delay_register', 'Delay Register', NULL, v_s5, 2, 4, '/platform/delays', 'clock-alert', TRUE, TRUE),
    ('pm_raid_daily_log', 'Daily Log', NULL, v_s5, 2, 5, '/app/daily-log/my-entries', 'calendar', TRUE, TRUE),
    ('pm_raid_lessons_log', 'Lessons Log', NULL, v_s5, 2, 6, '/app/lessons/my-actions', 'graduation-cap', TRUE, TRUE),
    ('pm_delivery_work_packages', 'Work Packages', NULL, v_s5, 2, 10, '/pm/delivery/work-packages', 'layers', TRUE, TRUE),
    ('pm_delivery_checkpoint_reports', 'Checkpoint Reports', NULL, v_s5, 2, 11, '/pm/reporting/checkpoint-reports', 'flag', TRUE, TRUE),
    ('pm_delivery_product_description', 'Product Description', NULL, v_s5, 2, 12, '/pm/delivery/product-description', 'file-text', TRUE, TRUE),
    ('pm_delivery_project_product_description', 'Project Product Description', NULL, v_s5, 2, 13, '/pm/delivery/project-product-description', 'clipboard-list', TRUE, TRUE),
    ('pm_delivery_product_status_account', 'Product Status Account', NULL, v_s5, 2, 14, '/pm/delivery/product-status-account', 'activity', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = v_s5, route_path = EXCLUDED.route_path, sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

  -- §6 Process Group Forms
  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('pm_section_process_forms', 'Process Group Forms', 'PRINCE2 process group forms', NULL, 1, 210, NULL, 'file-stack', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();
  SELECT id INTO v_s6 FROM menu_items WHERE menu_code = 'pm_section_process_forms' LIMIT 1;

  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES
    ('pm_forms_initiating', 'Initiating', NULL, v_s6, 2, 1, '/platform/projects/:id/forms?group=Initiating', 'play', TRUE, TRUE),
    ('pm_forms_planning', 'Planning', NULL, v_s6, 2, 2, '/platform/projects/:id/forms?group=Planning', 'map', TRUE, TRUE),
    ('pm_forms_executing', 'Executing', NULL, v_s6, 2, 3, '/platform/projects/:id/forms?group=Executing', 'hammer', TRUE, TRUE),
    ('pm_forms_monitoring', 'Monitoring & Controlling', NULL, v_s6, 2, 4, '/platform/projects/:id/forms?group=Monitoring', 'activity', TRUE, TRUE),
    ('pm_forms_closing', 'Closing', NULL, v_s6, 2, 5, '/platform/projects/:id/forms?group=Closing', 'folder-closed', TRUE, TRUE),
    ('pm_forms_agile', 'Agile', NULL, v_s6, 2, 6, '/platform/projects/:id/forms?group=Agile', 'zap', TRUE, TRUE),
    ('pm_forms_drafts', 'My Drafts', NULL, v_s6, 2, 7, '/platform/projects/:id/forms/drafts', 'pause', TRUE, TRUE),
    ('pm_forms_pending_approvals', 'Pending Approvals', NULL, v_s6, 2, 8, '/platform/projects/:id/forms?status=in_review', 'clock', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = v_s6, route_path = EXCLUDED.route_path, sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

  -- §7 Tasks
  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('pm_section_tasks', 'Tasks', 'Personal task management', NULL, 1, 220, NULL, 'check-square', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();
  SELECT id INTO v_s7 FROM menu_items WHERE menu_code = 'pm_section_tasks' LIMIT 1;

  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES
    ('pm_tasks_my', 'My Tasks', NULL, v_s7, 2, 1, '/platform/tasks', 'list', TRUE, TRUE),
    ('pm_tasks_board', 'Board View', NULL, v_s7, 2, 2, '/platform/tasks/board', 'columns', TRUE, TRUE),
    ('pm_tasks_calendar', 'Calendar', NULL, v_s7, 2, 3, '/platform/tasks/calendar', 'calendar', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = v_s7, route_path = EXCLUDED.route_path, sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

  -- §8 Initiation Documents
  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('pm_section_initiation_docs', 'Initiation Documents', 'Business case, brief, work authorisations', NULL, 1, 230, NULL, 'briefcase', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();
  SELECT id INTO v_s8 FROM menu_items WHERE menu_code = 'pm_section_initiation_docs' LIMIT 1;

  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES
    ('pm_init_docs_business_case', 'Business Case', NULL, v_s8, 2, 1, '/pmo/initiation/business-case', 'briefcase', TRUE, TRUE),
    ('pm_init_docs_project_brief', 'Project Brief', NULL, v_s8, 2, 2, '/pmo/initiation/project-brief', 'file-text', TRUE, TRUE),
    ('pm_init_docs_work_authorisations', 'Work Authorisations', NULL, v_s8, 2, 3, '/platform/work-authorisations', 'file-check', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = v_s8, route_path = EXCLUDED.route_path, sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

  -- §9 Reporting
  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('pm_section_reporting', 'Reporting', 'Project reports and assurance', NULL, 1, 240, NULL, 'bar-chart', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();
  SELECT id INTO v_s9 FROM menu_items WHERE menu_code = 'pm_section_reporting' LIMIT 1;

  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES
    ('pm_reports_library', 'Report Library', NULL, v_s9, 2, 1, '/platform/reports', 'library', TRUE, TRUE),
    ('pm_reports_builder', 'Report Builder', NULL, v_s9, 2, 2, '/platform/reports/builder', 'file-bar-chart', TRUE, TRUE),
    ('pm_reports_analytics', 'Analytics', NULL, v_s9, 2, 3, '/platform/reports/analytics', 'pie-chart', TRUE, TRUE),
    ('pm_reports_highlight', 'Highlight Reports', NULL, v_s9, 2, 4, '/pmo/reporting/highlight-reports', 'flag', TRUE, TRUE),
    ('pm_reports_exception', 'Exception Reports', NULL, v_s9, 2, 5, '/pmo/reporting/exception-reports', 'file-warning', TRUE, TRUE),
    ('pm_reports_end_stage', 'End Stage Reports', NULL, v_s9, 2, 6, '/pmo/reporting/end-stage-reports', 'file-clock', TRUE, TRUE),
    ('pm_reports_end_project', 'End Project Reports', NULL, v_s9, 2, 7, '/pmo/reporting/end-project-reports', 'file-check', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = v_s9, route_path = EXCLUDED.route_path, sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

  -- §10 Quality & Testing
  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('pm_section_quality_testing', 'Quality & Testing', 'Testing centre and quality register', NULL, 1, 250, NULL, 'flask-conical', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();
  SELECT id INTO v_s10 FROM menu_items WHERE menu_code = 'pm_section_quality_testing' LIMIT 1;

  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES
    ('pm_testing_dashboard', 'Testing Dashboard', NULL, v_s10, 2, 1, '/platform/testing-centre', 'layout-dashboard', TRUE, TRUE),
    ('pm_testing_cases', 'Test Case Library', NULL, v_s10, 2, 2, '/platform/testing-centre/cases', 'list', TRUE, TRUE),
    ('pm_testing_suites', 'Test Suites', NULL, v_s10, 2, 3, '/platform/testing-centre/suites', 'layers', TRUE, TRUE),
    ('pm_testing_runs', 'Test Runs', NULL, v_s10, 2, 4, '/platform/testing-centre/runs', 'play', TRUE, TRUE),
    ('pm_testing_evidence', 'Screenshot Evidence', NULL, v_s10, 2, 5, '/platform/testing-centre/evidence', 'camera', TRUE, TRUE),
    ('pm_testing_defects', 'Defects & Issue Links', NULL, v_s10, 2, 6, '/platform/testing-centre/defects', 'bug', TRUE, TRUE),
    ('pm_quality_register', 'Quality Register', NULL, v_s10, 2, 7, '/platform/quality-management', 'check-square', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = v_s10, route_path = EXCLUDED.route_path, sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

  -- §11 Stakeholders
  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('pm_section_stakeholders', 'Stakeholders', 'Stakeholder engagement', NULL, 1, 260, NULL, 'users-2', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();
  SELECT id INTO v_s11 FROM menu_items WHERE menu_code = 'pm_section_stakeholders' LIMIT 1;

  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES
    ('pm_stakeholders_register', 'Stakeholder Register', NULL, v_s11, 2, 1, '/platform/stakeholders/register', 'users', TRUE, TRUE),
    ('pm_stakeholders_engagement', 'Engagement Planning', NULL, v_s11, 2, 2, '/platform/stakeholders/engagement', 'handshake', TRUE, TRUE),
    ('pm_stakeholders_comms_plans', 'Communication Plans', NULL, v_s11, 2, 3, '/platform/stakeholders/communications', 'megaphone', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = v_s11, route_path = EXCLUDED.route_path, sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

  -- §12 Governance Baselines (view-only — PMO routes)
  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('pm_section_governance_baselines', 'Governance Baselines', 'PMO-defined strategies (read-only for PM)', NULL, 1, 270, NULL, 'shield', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();
  SELECT id INTO v_s12 FROM menu_items WHERE menu_code = 'pm_section_governance_baselines' LIMIT 1;

  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES
    ('pm_gov_baseline_comms_strategy', 'Communication Strategy', NULL, v_s12, 2, 1, '/pmo/governance/communication-strategy', 'megaphone', TRUE, TRUE),
    ('pm_gov_baseline_config_strategy', 'Configuration Strategy', NULL, v_s12, 2, 2, '/pmo/governance/configuration-strategy', 'settings-2', TRUE, TRUE),
    ('pm_gov_baseline_quality_strategy', 'Quality Strategy', NULL, v_s12, 2, 3, '/pmo/governance/quality-strategy', 'check-square', TRUE, TRUE),
    ('pm_gov_baseline_risk_strategy', 'Risk Strategy', NULL, v_s12, 2, 4, '/pmo/governance/risk-strategy', 'alert-triangle', TRUE, TRUE),
    ('pm_gov_baseline_itto_templates', 'ITTO Templates', NULL, v_s12, 2, 5, '/platform/itto/templates', 'git-branch', TRUE, TRUE),
    ('pm_gov_baseline_mandate', 'Project Mandate', NULL, v_s12, 2, 6, '/pmo/governance/mandate', 'file-text', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = v_s12, route_path = EXCLUDED.route_path, sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

  -- §14 Knowledge & Resources
  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('pm_section_knowledge_resources', 'Knowledge & Resources', 'Templates, directory, AI', NULL, 1, 290, NULL, 'book-open', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();
  SELECT id INTO v_s14 FROM menu_items WHERE menu_code = 'pm_section_knowledge_resources' LIMIT 1;

  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES
    ('pm_template_library', 'Template Library', NULL, v_s14, 2, 1, '/platform/templates', 'library', TRUE, TRUE),
    ('pm_resource_directory', 'Resource Directory', NULL, v_s14, 2, 2, '/platform/teams/directory', 'users', TRUE, TRUE),
    ('pm_skill_matrix', 'Skill Matrix', NULL, v_s14, 2, 3, '/platform/teams/skills', 'grid-3x3', TRUE, TRUE),
    ('pm_ai_assistant', 'AI Assistant', NULL, v_s14, 2, 4, '/platform/ai', 'bot', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = v_s14, route_path = EXCLUDED.route_path, sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

  -- §15 Communications & Meetings
  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('pm_comms_section', 'Communications & Meetings', 'Meetings, channels, DMs', NULL, 1, 300, NULL, 'message-square', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();
  SELECT id INTO v_s15 FROM menu_items WHERE menu_code = 'pm_comms_section' LIMIT 1;

  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES
    ('pm_comms_hub', 'Comms Hub', NULL, v_s15, 2, 1, '/platform/comms', 'message-square', TRUE, TRUE),
    ('pm_comms_schedule_meeting', 'Schedule Meeting', NULL, v_s15, 2, 2, '/platform/comms/meetings/new', 'calendar-clock', TRUE, TRUE),
    ('pm_comms_meetings', 'My Meetings', NULL, v_s15, 2, 3, '/platform/comms/meetings', 'video', TRUE, TRUE),
    ('pm_comms_summaries', 'Meeting Summaries', NULL, v_s15, 2, 4, '/platform/comms/meetings/summaries', 'file-text', TRUE, TRUE),
    ('pm_comms_direct', 'Direct Messages', NULL, v_s15, 2, 5, '/platform/comms/direct', 'mail', TRUE, TRUE),
    ('pm_comms_channels', 'Channel Messages', NULL, v_s15, 2, 6, '/platform/comms/messages', 'messages-square', TRUE, TRUE),
    ('pm_comms_pending_review', 'Pending AI Reviews', NULL, v_s15, 2, 7, '/platform/comms/pending-review', 'bot', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = v_s15, route_path = EXCLUDED.route_path, sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

  RAISE NOTICE 'v568_pm_menu_items_seed.sql applied';
END $$;
