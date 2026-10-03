-- ============================================================================
-- v966a: Core PM Menu Rationalisation — Phase 0: delete fully-dead menu generations
-- ============================================================================
-- projectplan/v966_core_pm_menu_rationalisation_plan.md Phase 0.
-- projectplan/v966_full_three_layout_menu_audit.md — full audit this is built from.
--
-- Every menu_code below was individually verified, via a fresh live query against
-- role_menu_items (can_view=true AND is_active=true AND is_deleted=false — the exact filter
-- apps/platform/src/hooks/useMenu.js's fetchRoleMenuItemsPageForChunk() uses to build a real
-- user's sidebar), to have ZERO active grants to ANY of the 111 roles in this database. That
-- means: unreachable by any user, in any organisation, today. Every route these 300 rows cover
-- already exists live elsewhere in the granted plat_sec_* tree, which this initiative's
-- subsequent phases continue to work from exclusively.
--
-- Three rows were found WITH live grants and are deliberately excluded from this list (kept
-- active, handled by a later phase instead of deleted here):
--   - platform_timesheet_approval_settings (5 roles) — same route as GAP-13's canonical
--     Timesheet Approval Settings page; Phase 4 (Resources consolidation) retargets its grants
--     onto the canonical row rather than dropping them here.
--   - pm_project_calendar / pm_project_calendar_exceptions (both granted) — a working
--     project-schedule calendar-exceptions feature; Phase 5 (Calendar consolidation) folds this
--     into the canonical schedule calendar rather than dropping it here.
--
-- Also NOT touched here (deliberately excluded from this pass, per the plan's own caution):
-- the pmo-cat-* family (16 roots, 367 nodes) — some of its ids are live category anchors that
-- inferCategoryId()/orphan-bucketing in pmoMenuHierarchyUtils.js targets by menu_code, even
-- though almost none of their own direct DB children carry grants. Deactivating these needs a
-- code-level check first (do any hardcode-reference this menu_code as a bucketing target?), not
-- attempted in this SQL-only pass. Also not touched: pmo_admin_local_registers (a real, live,
-- granted "Manage Local Registers" entry point — a false-positive prefix match, correctly
-- excluded from the deletion candidate list during audit verification).
--
-- Deactivate, not delete (matches the v965 Process Group Forms precedent) — in case anything
-- unexpected still references one of these ids by FK, and to keep a paper trail.
-- ============================================================================

DO $$
DECLARE
  v_deactivated_count INT := 0;
BEGIN
  UPDATE public.menu_items
  SET is_visible = FALSE, is_active = FALSE, updated_at = NOW()
  WHERE menu_code IN (
    -- Platform 2nd/3rd-generation dead rewrites (platform_section_*, tm_section_*) + flat
    -- platform_* singletons — 87 codes, 0 grants each.
    'platform_section_strategy', 'platform_okr_goals', 'platform_portfolio_map', 'platform_section_resources', 'platform_workload_heatmap', 'platform_skills_matrix', 'platform_training', 'platform_section_settings',
    'platform_intake_forms', 'platform_client_portal', 'platform_notification_prefs', 'platform_section_delivery', 'platform_recurring_tasks', 'platform_section_planning', 'platform_raci_matrix', 'platform_section_reporting',
    'platform_s_curve', 'platform_scheduled_reports', 'platform_timesheet_approvals', 'platform_section_agile', 'platform_planning_poker', 'platform_section_dashboards', 'platform_dashboard_builder', 'platform_section_collaboration',
    'platform_whiteboards', 'platform_section_admin', 'platform_automations', 'platform_custom_fields', 'platform_guest_access', 'platform_integrations_hub', 'tm_section_my_work', 'tm_my_tasks',
    'tm_task_board', 'tm_task_calendar', 'tm_daily_log', 'tm_lesson_actions', 'tm_issue_actions', 'tm_section_plans', 'tm_my_plans', 'tm_team_workstream_plans',
    'tm_plans_overview', 'tm_project_plan', 'tm_stage_plans', 'tm_section_controls', 'tm_risk_register', 'tm_issue_log', 'tm_change_log', 'tm_delay_log',
    'tm_defect_register', 'tm_decision_log', 'tm_section_team_charter', 'tm_team_charter_view', 'tm_team_charter_edit', 'tm_section_team', 'tm_my_team', 'tm_team_directory',
    'tm_section_reporting', 'tm_highlight_reports', 'tm_checkpoint_reports', 'tm_reports_library', 'tm_section_timesheets', 'tm_my_timesheets', 'tm_log_time', 'tm_team_timesheets',
    'tm_timesheet_period_submit', 'tm_section_knowledge', 'tm_industry_templates', 'tm_section_appointment', 'tm_section_communications', 'tm_team_chat', 'tm_video_calls', 'tm_voice_calls',
    'platform_calendar', 'platform_change_log', 'platform_controls', 'platform_feedback', 'platform_my_work', 'platform_people_stakeholders', 'platform_planning', 'platform_quality_testing',
    'platform_stakeholders', 'platform_stakeholders_register', 'platform_stakeholders_analysis', 'platform_stakeholders_assessment_matrix', 'platform_stakeholders_engagement', 'platform_stakeholders_communications', 'platform_stakeholders_monitoring',

    -- PM layout dead generation (pm_section_*, pm_*) — 142 codes, 0 grants each
    -- (pm_project_calendar / pm_project_calendar_exceptions deliberately excluded — see header).
    'pm_calendar',
    'pm_dashboard', 'pm_initiation', 'pm_delivery', 'pm_delivery_daily_log', 'pm_controls', 'pm_controls_risk_register', 'pm_controls_issue_register', 'pm_controls_quality_register',
    'pm_controls_configuration_items', 'pm_controls_lessons_log', 'pm_reporting', 'pm_report_checkpoint', 'pm_report_highlight', 'pm_report_issue_reports', 'pm_report_exception', 'pm_report_end_stage',
    'pm_delays', 'pm_delay_register', 'pm_delay_drafts', 'pm_closure', 'pm_closure_end_project_report', 'pm_section_automations', 'pm_automations_rules', 'pm_automations_templates',
    'pm_automations_log', 'pm_section_strategy_okr', 'pm_okr_dashboard', 'pm_okr_objectives', 'pm_okr_alignment', 'pm_okr_checkins', 'pm_section_resources_hub', 'pm_workload_heatmap',
    'pm_raci_matrix', 'pm_skills_matrix', 'pm_timesheet_approvals', 'pm_training_certifications', 'pm_section_project_settings', 'pm_custom_fields', 'pm_intake_forms', 'pm_intake_submissions',
    'pm_client_portal', 'pm_recurring_tasks', 'pm_guest_access', 'pm_clone_project', 'pm_planning_section', 'pm_plans_group', 'pm_scope_group', 'pm_schedule_group',
    'pm_resource_group', 'pm_advanced_planning_group', 'pm_planning_hub', 'pm_planning_ai', 'pm_planning_scenarios', 'pm_planning_pbs', 'pm_planning_health', 'pm_planning_confidence',
    'pm_planning_recovery', 'pm_planning_governance', 'pm_planning_intelligence', 'pm_microplans', 'pm_microplans_drafts', 'pm_resource_list', 'pm_resource_capacity', 'pm_resource_conflicts',
    'pm_schedule_management_plan', 'pm_activity_list', 'pm_activity_sequencing', 'pm_gantt_chart', 'pm_scope_statement', 'pm_scope_management_plan', 'pm_wbs_builder', 'pm_requirements_register',
    'pm_traceability_matrix', 'pm_plans_dashboard', 'pm_project_plan', 'pm_stage_plan_create', 'pm_section_planning_tools', 'pm_s_curve', 'pm_baseline_compare', 'pm_planning_poker',
    'pm_section_dashboards_analytics', 'pm_my_dashboards', 'pm_dashboard_builder', 'pm_scheduled_reports', 'pm_report_archive', 'pm_section_collaboration', 'pm_whiteboards', 'pm_whiteboard_new',
    'pm_section_delivery_controls', 'pm_raid_risk_register', 'pm_raid_issue_log', 'pm_raid_change_requests', 'pm_raid_delay_register', 'pm_raid_daily_log', 'pm_raid_lessons_log', 'pm_delivery_work_packages',
    'pm_delivery_checkpoint_reports', 'pm_delivery_product_description', 'pm_delivery_project_product_description', 'pm_delivery_product_status_account', 'pm_section_tasks', 'pm_tasks_my', 'pm_tasks_board', 'pm_tasks_calendar',
    'pm_section_initiation_docs', 'pm_init_docs_business_case', 'pm_init_docs_project_brief', 'pm_init_docs_work_authorisations', 'pm_section_reporting', 'pm_reports_library', 'pm_reports_builder', 'pm_reports_analytics',
    'pm_reports_highlight', 'pm_reports_exception', 'pm_reports_end_stage', 'pm_reports_end_project', 'pm_comms_section', 'pm_comms_hub', 'pm_comms_schedule_meeting', 'pm_comms_meetings',
    'pm_comms_summaries', 'pm_comms_direct', 'pm_comms_channels', 'pm_comms_pending_review', 'pm_financial', 'pm_fin_my_expenses', 'pm_fin_exp_approvals', 'pm_fin_reports',
    'pm_fin_portfolio_evm', 'pm_itto', 'pm_itto_templates', 'pm_itto_project', 'pm_itto_drafts', 'pm_section_quality_testing', 'pm_testing_dashboard', 'pm_testing_cases',
    'pm_testing_suites', 'pm_testing_runs', 'pm_testing_evidence', 'pm_testing_defects', 'pm_quality_register',

    -- PMO layout dead generation (pmo_section_*, pmo_calendar, pmo_planning, and their
    -- descendants) — 71 codes, 0 grants each. pmo-cat-* and pmo_admin_local_registers
    -- deliberately excluded — see header.
    'pmo_calendar', 'pmo_section_strategy_okr', 'pmo_okr_dashboard',
    'pmo_okr_objectives', 'pmo_okr_alignment', 'pmo_okr_checkins', 'pmo_portfolio_map', 'pmo_planning', 'pmo_planning_hub', 'pmo_portfolio_collisions', 'pmo_intel_rules',
    'pmo_governance_config', 'pmo_section_dashboards_analytics', 'pmo_s_curve', 'pmo_planning_s_curve', 'pmo_baseline_compare', 'pmo_my_dashboards', 'pmo_dashboard_builder', 'pmo_scheduled_reports',
    'pmo_whiteboard', 'pmo_section_knowledge', 'pmo_knowledge_hub', 'pmo_knowledge_opa', 'pmo_knowledge_opa_new', 'pmo_knowledge_opa_drafts', 'org_knowledge_opa', 'pmo_knowledge_opa_bulk',
    'org_knowledge_opa_new', 'org_knowledge_opa_drafts', 'org_knowledge_opa_bulk', 'org_knowledge', 'pm_opa_templates_browse', 'pm_project_opa_templates', 'pmo_section_reporting', 'agile_sprint_metrics',
    'pm_closure_lessons_report', 'pmo_report_lessons', 'pmo_report_sprint_metrics', 'pmo_section_system_admin', 'pmo_sys_platform_settings', 'pmo_sys_pwa_settings', 'pmo_section_collaboration', 'pmo_planning_poker',
    'pmo_whiteboards', 'pmo_whiteboard_new', 'pmo_section_authorisation', 'pmo_auth_queue', 'pmo_auth_dashboard', 'pmo_auth_configure', 'pmo_auth_chains', 'pmo_auth_archive_retention',
    'pmo_auth_archive_vault', 'pmo_section_workflows', 'pmo_workflows_mandate_pending', 'pmo_workflows_brief_pending', 'pmo_admin_briefs_pending_approvals', 'pmo_admin_mandates_pending_approvals', 'pmo_section_email', 'pmo_email_settings',
    'pmo_email_sender_profiles', 'pmo_email_invitation_templates', 'pmo_email_invitation_expiry', 'pmo_comms_section', 'pmo_notification_preferences', 'pmo_notification_prefs', 'comms_messages', 'pmo_comms_messages',
    'comms_direct', 'pmo_comms_direct', 'pmo_comms_meetings', 'comms_meetings'
  )
  AND COALESCE(is_deleted, FALSE) = FALSE;
  GET DIAGNOSTICS v_deactivated_count = ROW_COUNT;

  RAISE NOTICE 'v966a: deactivated % dead menu_items rows (expected 300 — Platform 87, PM 142, PMO 71)', v_deactivated_count;
END $$;

-- Deactivate any role_menu_items rows still pointing at the now-deactivated menu_items (should
-- be none, since every code above was verified to have 0 active grants — this is a defensive
-- no-op unless the verification data went stale between audit and this SQL being run).
UPDATE public.role_menu_items rmi
SET is_active = FALSE, updated_at = NOW()
FROM public.menu_items mi
WHERE rmi.menu_item_id = mi.id
  AND mi.is_active = FALSE
  AND mi.menu_code IN (
    -- (same 300-code list as above — reuse via a join on the rows just deactivated, not
    -- restated literally; PostgreSQL doesn't support referencing a prior UPDATE's rows
    -- directly across statements, so this re-filters by is_active=FALSE + the same code list.
    -- Safe because nothing else in this transaction deactivates menu_items by code.)
    'platform_section_strategy', 'platform_okr_goals', 'platform_portfolio_map', 'platform_section_resources', 'platform_workload_heatmap', 'platform_skills_matrix', 'platform_training', 'platform_section_settings',
    'platform_intake_forms', 'platform_client_portal', 'platform_notification_prefs', 'platform_section_delivery', 'platform_recurring_tasks', 'platform_section_planning', 'platform_raci_matrix', 'platform_section_reporting',
    'platform_s_curve', 'platform_scheduled_reports', 'platform_timesheet_approvals', 'platform_section_agile', 'platform_planning_poker', 'platform_section_dashboards', 'platform_dashboard_builder', 'platform_section_collaboration',
    'platform_whiteboards', 'platform_section_admin', 'platform_automations', 'platform_custom_fields', 'platform_guest_access', 'platform_integrations_hub', 'tm_section_my_work', 'tm_my_tasks',
    'tm_task_board', 'tm_task_calendar', 'tm_daily_log', 'tm_lesson_actions', 'tm_issue_actions', 'tm_section_plans', 'tm_my_plans', 'tm_team_workstream_plans',
    'tm_plans_overview', 'tm_project_plan', 'tm_stage_plans', 'tm_section_controls', 'tm_risk_register', 'tm_issue_log', 'tm_change_log', 'tm_delay_log',
    'tm_defect_register', 'tm_decision_log', 'tm_section_team_charter', 'tm_team_charter_view', 'tm_team_charter_edit', 'tm_section_team', 'tm_my_team', 'tm_team_directory',
    'tm_section_reporting', 'tm_highlight_reports', 'tm_checkpoint_reports', 'tm_reports_library', 'tm_section_timesheets', 'tm_my_timesheets', 'tm_log_time', 'tm_team_timesheets',
    'tm_timesheet_period_submit', 'tm_section_knowledge', 'tm_industry_templates', 'tm_section_appointment', 'tm_section_communications', 'tm_team_chat', 'tm_video_calls', 'tm_voice_calls',
    'platform_calendar', 'platform_change_log', 'platform_controls', 'platform_feedback', 'platform_my_work', 'platform_people_stakeholders', 'platform_planning', 'platform_quality_testing',
    'platform_stakeholders', 'platform_stakeholders_register', 'platform_stakeholders_analysis', 'platform_stakeholders_assessment_matrix', 'platform_stakeholders_engagement', 'platform_stakeholders_communications', 'platform_stakeholders_monitoring',
    'pm_calendar',
    'pm_dashboard', 'pm_initiation', 'pm_delivery', 'pm_delivery_daily_log', 'pm_controls', 'pm_controls_risk_register', 'pm_controls_issue_register', 'pm_controls_quality_register',
    'pm_controls_configuration_items', 'pm_controls_lessons_log', 'pm_reporting', 'pm_report_checkpoint', 'pm_report_highlight', 'pm_report_issue_reports', 'pm_report_exception', 'pm_report_end_stage',
    'pm_delays', 'pm_delay_register', 'pm_delay_drafts', 'pm_closure', 'pm_closure_end_project_report', 'pm_section_automations', 'pm_automations_rules', 'pm_automations_templates',
    'pm_automations_log', 'pm_section_strategy_okr', 'pm_okr_dashboard', 'pm_okr_objectives', 'pm_okr_alignment', 'pm_okr_checkins', 'pm_section_resources_hub', 'pm_workload_heatmap',
    'pm_raci_matrix', 'pm_skills_matrix', 'pm_timesheet_approvals', 'pm_training_certifications', 'pm_section_project_settings', 'pm_custom_fields', 'pm_intake_forms', 'pm_intake_submissions',
    'pm_client_portal', 'pm_recurring_tasks', 'pm_guest_access', 'pm_clone_project', 'pm_planning_section', 'pm_plans_group', 'pm_scope_group', 'pm_schedule_group',
    'pm_resource_group', 'pm_advanced_planning_group', 'pm_planning_hub', 'pm_planning_ai', 'pm_planning_scenarios', 'pm_planning_pbs', 'pm_planning_health', 'pm_planning_confidence',
    'pm_planning_recovery', 'pm_planning_governance', 'pm_planning_intelligence', 'pm_microplans', 'pm_microplans_drafts', 'pm_resource_list', 'pm_resource_capacity', 'pm_resource_conflicts',
    'pm_schedule_management_plan', 'pm_activity_list', 'pm_activity_sequencing', 'pm_gantt_chart', 'pm_scope_statement', 'pm_scope_management_plan', 'pm_wbs_builder', 'pm_requirements_register',
    'pm_traceability_matrix', 'pm_plans_dashboard', 'pm_project_plan', 'pm_stage_plan_create', 'pm_section_planning_tools', 'pm_s_curve', 'pm_baseline_compare', 'pm_planning_poker',
    'pm_section_dashboards_analytics', 'pm_my_dashboards', 'pm_dashboard_builder', 'pm_scheduled_reports', 'pm_report_archive', 'pm_section_collaboration', 'pm_whiteboards', 'pm_whiteboard_new',
    'pm_section_delivery_controls', 'pm_raid_risk_register', 'pm_raid_issue_log', 'pm_raid_change_requests', 'pm_raid_delay_register', 'pm_raid_daily_log', 'pm_raid_lessons_log', 'pm_delivery_work_packages',
    'pm_delivery_checkpoint_reports', 'pm_delivery_product_description', 'pm_delivery_project_product_description', 'pm_delivery_product_status_account', 'pm_section_tasks', 'pm_tasks_my', 'pm_tasks_board', 'pm_tasks_calendar',
    'pm_section_initiation_docs', 'pm_init_docs_business_case', 'pm_init_docs_project_brief', 'pm_init_docs_work_authorisations', 'pm_section_reporting', 'pm_reports_library', 'pm_reports_builder', 'pm_reports_analytics',
    'pm_reports_highlight', 'pm_reports_exception', 'pm_reports_end_stage', 'pm_reports_end_project', 'pm_comms_section', 'pm_comms_hub', 'pm_comms_schedule_meeting', 'pm_comms_meetings',
    'pm_comms_summaries', 'pm_comms_direct', 'pm_comms_channels', 'pm_comms_pending_review', 'pm_financial', 'pm_fin_my_expenses', 'pm_fin_exp_approvals', 'pm_fin_reports',
    'pm_fin_portfolio_evm', 'pm_itto', 'pm_itto_templates', 'pm_itto_project', 'pm_itto_drafts', 'pm_section_quality_testing', 'pm_testing_dashboard', 'pm_testing_cases',
    'pm_testing_suites', 'pm_testing_runs', 'pm_testing_evidence', 'pm_testing_defects', 'pm_quality_register',
    'pmo_calendar', 'pmo_section_strategy_okr', 'pmo_okr_dashboard',
    'pmo_okr_objectives', 'pmo_okr_alignment', 'pmo_okr_checkins', 'pmo_portfolio_map', 'pmo_planning', 'pmo_planning_hub', 'pmo_portfolio_collisions', 'pmo_intel_rules',
    'pmo_governance_config', 'pmo_section_dashboards_analytics', 'pmo_s_curve', 'pmo_planning_s_curve', 'pmo_baseline_compare', 'pmo_my_dashboards', 'pmo_dashboard_builder', 'pmo_scheduled_reports',
    'pmo_whiteboard', 'pmo_section_knowledge', 'pmo_knowledge_hub', 'pmo_knowledge_opa', 'pmo_knowledge_opa_new', 'pmo_knowledge_opa_drafts', 'org_knowledge_opa', 'pmo_knowledge_opa_bulk',
    'org_knowledge_opa_new', 'org_knowledge_opa_drafts', 'org_knowledge_opa_bulk', 'org_knowledge', 'pm_opa_templates_browse', 'pm_project_opa_templates', 'pmo_section_reporting', 'agile_sprint_metrics',
    'pm_closure_lessons_report', 'pmo_report_lessons', 'pmo_report_sprint_metrics', 'pmo_section_system_admin', 'pmo_sys_platform_settings', 'pmo_sys_pwa_settings', 'pmo_section_collaboration', 'pmo_planning_poker',
    'pmo_whiteboards', 'pmo_whiteboard_new', 'pmo_section_authorisation', 'pmo_auth_queue', 'pmo_auth_dashboard', 'pmo_auth_configure', 'pmo_auth_chains', 'pmo_auth_archive_retention',
    'pmo_auth_archive_vault', 'pmo_section_workflows', 'pmo_workflows_mandate_pending', 'pmo_workflows_brief_pending', 'pmo_admin_briefs_pending_approvals', 'pmo_admin_mandates_pending_approvals', 'pmo_section_email', 'pmo_email_settings',
    'pmo_email_sender_profiles', 'pmo_email_invitation_templates', 'pmo_email_invitation_expiry', 'pmo_comms_section', 'pmo_notification_preferences', 'pmo_notification_prefs', 'comms_messages', 'pmo_comms_messages',
    'comms_direct', 'pmo_comms_direct', 'pmo_comms_meetings', 'comms_meetings'
  )
  AND COALESCE(rmi.is_deleted, FALSE) = FALSE;

DO $$ BEGIN RAISE NOTICE 'v966a_phase0_delete_dead_menu_generations.sql applied successfully'; END $$;
