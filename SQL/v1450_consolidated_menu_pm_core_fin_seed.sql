-- ============================================================================
-- v1450: Consolidated role menus — Project Manager placements: Core PM + Banking (Slice 3)
-- PRD/plan: projectprd/v1341 / projectplan/v1341_consolidated_role_menus_plan.md
-- Design source: Documentation/Consolidated_Role_Menus_Proposal.md §3, §4, §6.2
--
-- 1. Catalogue (rule 75): new consolidated-only row "Project Settings" (plat_pm_project_settings)
--    under Project Setup. is_visible = FALSE, so today's sidebar never shows it; the consolidated
--    sidebar shows it where its placement puts it (D13b sub-menu).
-- 2. Default sections (story 25) on the Core PM category rows: an unplaced page under one of
--    these falls back to that section instead of disappearing.
-- 3. PM placements ('pm') for every Core PM page from CSV Files/core_pm_menu_audit.csv.csv and the
--    Banking (FIN) groups. Pages listed twice in the catalogue are placed twice; the engine keeps
--    one entry per route in a section.
-- Nothing changes in any sidebar until an organisation's switch is turned on (Admin).
-- Idempotent. Run after v1449.
-- ============================================================================

-- ── 1. Project Settings sub-menu row (consolidated-only) ────────────────────
INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'plat_pm_project_settings', 'Project Settings',
  'Project-level settings (v1341 D13b): regional format, working days, timesheets, signatories, environments, industry modules.',
  NULL,
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_project_setup' AND COALESCE(is_deleted, FALSE) = FALSE),
  3, 90, 'universal', 'settings', TRUE, FALSE, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_project_settings');

-- ── 2. Default sections for category rows (safety net) ──────────────────────
UPDATE public.menu_items mi
   SET default_section_code = v.section_code
  FROM (VALUES
    ('plat_grp_pm_projects',      'home'),
    ('plat_grp_pm_tasks',         'deliver_test'),
    ('plat_grp_pm_teams',         'money_resources'),
    ('plat_grp_pm_controls',      'risks_governance'),
    ('plat_grp_pm_financial',     'money_resources'),
    ('plat_grp_pm_reporting',     'footer'),
    ('plat_grp_pm_stakeholders',  'stakeholders_adoption'),
    ('plat_grp_pm_auth',          'risks_governance'),
    ('plat_grp_agile_tools',      'deliver_test'),
    ('plat_grp_gov_standards',    'project_setup'),
    ('plat_grp_initiation',       'project_setup'),
    ('plat_grp_plan_intel',       'plan_schedule'),
    ('plat_grp_project_execution','deliver_test'),
    ('plat_grp_standards_based_forms', 'footer'),
    ('plat_grp_process_groups',   'footer'),
    ('plat_grp_template_library', 'footer'),
    ('plat_grp_okr',              'readiness_close'),
    ('plat_sec_account',          'home'),
    ('plat_sec_system_admin',     'home'),
    ('plat_pm_project_setup',     'project_setup'),
    ('plat_pm_scope_deliverables','scope_requirements'),
    ('plat_pm_planning',          'plan_schedule'),
    ('plat_pm_raid',              'risks_governance'),
    ('plat_pm_quality',           'deliver_test'),
    ('plat_pm_testing',           'deliver_test'),
    ('plat_pm_change_control',    'risks_governance'),
    ('plat_pm_governance',        'risks_governance'),
    ('plat_pm_resources',         'money_resources'),
    ('plat_pm_procurement',       'money_resources'),
    ('plat_pm_benefits',          'readiness_close'),
    ('plat_pm_project_closure',   'readiness_close'),
    ('plat_pm_communications',    'home'),
    ('plat_pm_documents',         'footer'),
    ('plat_pm_rep_standard',      'footer'),
    ('plat_pm_rep_tools',         'footer'),
    ('plat_pm_templates',         'footer'),
    ('plat_pm_project_templates', 'footer')
  ) AS v(menu_code, section_code)
 WHERE mi.menu_code = v.menu_code
   AND mi.default_section_code IS DISTINCT FROM v.section_code;

-- ── 3. Project Manager placements ───────────────────────────────────────────
INSERT INTO public.menu_item_placements (menu_item_id, placement_key, section_code, parent_menu_item_id, slot_key, sort_order)
SELECT mi.id, 'pm', v.section_code, par.id, v.slot_key, v.sort_order
FROM (VALUES
  -- 1. Home
  ('plat_pm_dashboard',              'home',                  NULL::text, NULL::text, 10),
  ('plat_pm_ai',                     'home',                  NULL, NULL, 15),
  ('plat_grp_pm_projects',           'home',                  NULL, NULL, 20),
  ('plat_pm_my_projects',            'home',                  'plat_grp_pm_projects', NULL, 10),
  ('plat_pm_all_projects',           'home',                  'plat_grp_pm_projects', NULL, 20),
  ('plat_pm_create_project',         'home',                  'plat_grp_pm_projects', NULL, 30),
  ('plat_pm_archives',               'home',                  'plat_grp_pm_projects', NULL, 40),
  ('plat_pm_my_tasks',               'home',                  NULL, NULL, 30),
  ('plat_pm_daily_log',              'home',                  NULL, NULL, 35),
  ('plat_pm_pending_approval',       'home',                  NULL, NULL, 40),
  ('plat_pm_submitted',              'home',                  NULL, NULL, 45),
  ('plat_pm_communications',         'home',                  NULL, NULL, 50),
  ('plat_tm_meetings',               'home',                  'plat_pm_communications', NULL, 60),
  ('plat_pm_calendar',               'home',                  NULL, NULL, 60),
  ('plat_pm_my_expenses',            'home',                  NULL, NULL, 70),
  ('plat_pm_my_team',                'home',                  NULL, NULL, 75),
  -- 2. Project Setup
  ('plat_pm_s_project_details',      'project_setup',         NULL, NULL, 10),
  ('plat_pm_s_mandate',              'project_setup',         NULL, NULL, 20),
  ('plat_pm_s_brief',                'project_setup',         NULL, NULL, 30),
  ('plat_pm_s_charter',              'project_setup',         NULL, NULL, 35),
  ('plat_pm_s_business_case',        'project_setup',         NULL, NULL, 40),
  ('plat_s_pids',                    'project_setup',         NULL, NULL, 50),
  ('plat_pm_s_pid',                  'project_setup',         NULL, NULL, 51),
  ('plat_s_benefits_review',         'project_setup',         NULL, NULL, 60),
  ('plat_pm_s_benefits_rp',          'project_setup',         NULL, NULL, 61),
  ('plat_pm_project_team',           'project_setup',         NULL, NULL, 70),
  ('plat_pm_ps_governance',          'project_setup',         NULL, NULL, 80),
  ('plat_pm_approval_chains',        'project_setup',         'plat_pm_ps_governance', NULL, 90),
  ('plat_pm_project_settings',       'project_setup',         NULL, NULL, 90),
  ('plat_pm_s_regional_format',      'project_setup',         'plat_pm_project_settings', NULL, 10),
  ('plat_pm_s_working_days_holidays','project_setup',         'plat_pm_project_settings', NULL, 20),
  ('plat_pm_s_timesheet_settings',   'project_setup',         'plat_pm_project_settings', NULL, 30),
  ('plat_pm_s_document_signatory',   'project_setup',         'plat_pm_project_settings', NULL, 40),
  ('plat_pm_testing_environments',   'project_setup',         'plat_pm_project_settings', NULL, 50),
  ('plat_pm_risk_categories',        'project_setup',         'plat_pm_project_settings', NULL, 70),
  ('plat_pm_s_qms',                  'project_setup',         NULL, NULL, 100),
  ('plat_pm_s_rms',                  'project_setup',         NULL, NULL, 101),
  ('plat_pm_s_cms',                  'project_setup',         NULL, NULL, 102),
  ('plat_pm_s_conf_ms',              'project_setup',         NULL, NULL, 103),
  ('plat_pm_s_doc_gov',              'project_setup',         NULL, NULL, 105),
  ('plat_pm_manage_roles',           'project_setup',         'plat_pm_project_team', NULL, 90),
  -- 3. Scope & Requirements
  ('plat_pm_planning_scope_statement','scope_requirements',   NULL, NULL, 10),
  ('plat_pm_requirements',           'scope_requirements',    NULL, 'requirements', 20),
  ('plat_pm_sd_pbs',                 'scope_requirements',    NULL, NULL, 30),
  ('plat_pm_s_ppd',                  'scope_requirements',    NULL, NULL, 35),
  ('plat_pm_s_prod_desc',            'scope_requirements',    NULL, NULL, 36),
  ('plat_pm_planning_wbs',           'scope_requirements',    NULL, NULL, 40),
  ('plat_pm_s_work_packages',        'scope_requirements',    NULL, NULL, 45),
  ('plat_pm_sd_deliverable_register','scope_requirements',    NULL, NULL, 50),
  ('plat_pm_eef',                    'scope_requirements',    NULL, NULL, 90),
  -- 4. Plan & Schedule
  ('plat_pm_planning_schedule',      'plan_schedule',         NULL, NULL, 10),
  ('plat_pm_planning_milestones',    'plan_schedule',         NULL, NULL, 20),
  ('plat_pm_dependencies_reg',       'plan_schedule',         NULL, NULL, 30),
  ('plat_pm_planning_dependencies',  'plan_schedule',         NULL, NULL, 31),
  ('plat_pm_external_dependencies',  'plan_schedule',         NULL, NULL, 35),
  ('plat_pm_a_scurve',               'plan_schedule',         NULL, NULL, 40),
  ('plat_pm_delay_reg',              'plan_schedule',         NULL, NULL, 45),
  ('plat_pm_planning_scenarios',     'plan_schedule',         NULL, NULL, 50),
  ('plat_pm_planning_assumptions',   'plan_schedule',         NULL, NULL, 55),
  ('plat_pm_planning_calendar',      'plan_schedule',         NULL, NULL, 60),
  ('plat_pm_p_itto_project',         'plan_schedule',         NULL, NULL, 70),
  ('plat_pm_p_itto_templates',       'plan_schedule',         NULL, NULL, 71),
  ('plat_pm_p_itto_drafts',          'plan_schedule',         NULL, NULL, 72),
  -- 5. Deliver & Test
  ('plat_pm_task_board',             'deliver_test',          NULL, NULL, 10),
  ('plat_pm_all_tasks',              'deliver_test',          NULL, NULL, 11),
  ('plat_pm_task_calendar',          'deliver_test',          NULL, NULL, 12),
  ('plat_pm_s_work_auth',            'deliver_test',          NULL, NULL, 20),
  ('plat_pm_quality',                'deliver_test',          NULL, 'quality', 60),
  ('plat_pm_testing',                'deliver_test',          NULL, 'testing', 70),
  ('plat_pm_a_releases',             'deliver_test',          NULL, NULL, 80),
  ('plat_pm_a_story_map',            'deliver_test',          NULL, NULL, 81),
  ('plat_pm_a_vsm',                  'deliver_test',          NULL, NULL, 82),
  ('plat_pm_a_kaizen',               'deliver_test',          NULL, NULL, 83),
  ('plat_pm_a_planning_poker',       'deliver_test',          NULL, NULL, 84),
  ('plat_pm_a_process_forms',        'deliver_test',          NULL, NULL, 85),
  -- 6. Risks, Changes & Governance
  ('plat_pm_raid_log',               'risks_governance',      NULL, NULL, 5),
  ('plat_pm_risk_reg',               'risks_governance',      NULL, NULL, 10),
  ('plat_pm_issue_log',              'risks_governance',      NULL, NULL, 20),
  ('plat_pm_assumptions_reg',        'risks_governance',      NULL, NULL, 30),
  ('plat_pm_constraints_reg',        'risks_governance',      NULL, NULL, 35),
  ('plat_pm_change_control',         'risks_governance',      NULL, NULL, 40),
  ('plat_pm_s_decision_log',         'risks_governance',      NULL, NULL, 50),
  ('plat_pm_governance_actions',     'risks_governance',      NULL, NULL, 55),
  ('plat_pm_gov_stage_gates',        'risks_governance',      NULL, NULL, 60),
  ('plat_pm_s_stage_gates',          'risks_governance',      NULL, NULL, 61),
  ('plat_pm_gov_meetings',           'risks_governance',      NULL, NULL, 65),
  ('plat_pm_s_policies',             'risks_governance',      NULL, 'compliance', 80),
  ('plat_pm_lessons_ctrl',           'risks_governance',      NULL, NULL, 90),
  -- 7. Stakeholders & Adoption
  ('plat_pm_stkh_register',          'stakeholders_adoption', NULL, NULL, 10),
  ('plat_pm_stkh_analysis',          'stakeholders_adoption', NULL, NULL, 20),
  ('plat_pm_stkh_engagement',        'stakeholders_adoption', NULL, NULL, 30),
  ('plat_pm_stkh_matrix',            'stakeholders_adoption', NULL, NULL, 40),
  ('plat_pm_stkh_assess',            'stakeholders_adoption', NULL, NULL, 41),
  ('plat_pm_stkh_comms',             'stakeholders_adoption', NULL, NULL, 50),
  ('plat_pm_stkh_comm_options',      'stakeholders_adoption', NULL, NULL, 55),
  -- 8. Readiness, Benefits & Close
  ('plat_pm_benefits',               'readiness_close',       NULL, 'benefits_results', 10),
  ('plat_pm_project_closure',        'readiness_close',       NULL, NULL, 90),
  -- 9. Money & Resources
  ('plat_pm_budget',                 'money_resources',       NULL, NULL, 10),
  ('plat_pm_cost_actuals',           'money_resources',       NULL, NULL, 20),
  ('plat_pm_cost_evm',               'money_resources',       NULL, NULL, 30),
  ('plat_pm_fin_reports',            'money_resources',       NULL, NULL, 35),
  ('plat_pm_exp_approvals',          'money_resources',       NULL, NULL, 40),
  ('plat_pm_resources',              'money_resources',       NULL, NULL, 50),
  ('plat_pm_all_teams',              'money_resources',       NULL, NULL, 55),
  ('plat_pm_skill_matrix',           'money_resources',       NULL, NULL, 56),
  ('plat_pm_procurement',            'money_resources',       NULL, 'procurement', 60),
  -- Footer: Reports & Documents
  ('plat_pm_rep_standard',           'footer',                NULL, NULL, 10),
  ('plat_pm_rep_tools',              'footer',                NULL, NULL, 20),
  ('plat_pm_rep_timesheet_overview', 'footer',                NULL, NULL, 30),
  ('plat_pm_rep_work_plan_variance', 'footer',                NULL, NULL, 31),
  ('plat_pm_s_checkpoint',           'footer',                NULL, NULL, 40),
  ('plat_pm_s_highlight',            'footer',                NULL, NULL, 41),
  ('plat_pm_s_issue_rep',            'footer',                NULL, NULL, 42),
  ('plat_pm_s_exception',            'footer',                NULL, NULL, 43),
  ('plat_pm_s_end_stage',            'footer',                NULL, NULL, 44),
  ('plat_pm_s_end_project',          'footer',                NULL, NULL, 45),
  ('plat_pm_documents',              'footer',                NULL, NULL, 50),
  ('plat_pm_templates',              'footer',                NULL, NULL, 60),
  ('plat_pm_project_templates',      'footer',                NULL, NULL, 61),
  ('plat_grp_template_library',      'footer',                NULL, NULL, 70),
  ('plat_grp_process_groups',        'footer',                NULL, NULL, 75),
  ('plat_grp_standards_based_forms', 'footer',                NULL, NULL, 76),
  -- Banking & Financial Services (FIN) — proposal §4, §6.2
  ('fin_cat_transformation',         'project_setup',         NULL, 'delivery_overview', 15),
  ('fin_cat_core_banking',           'scope_requirements',    NULL, NULL, 55),
  ('fin_cat_data_migration',         'deliver_test',          NULL, 'data_migration', 40),
  ('fin_cat_testing_assurance',      'deliver_test',          NULL, 'testing', 71),
  ('fin_cat_change_management',      'stakeholders_adoption', NULL, 'business_change', 60),
  ('fin_cat_training',               'stakeholders_adoption', NULL, 'training', 70),
  ('fin_cat_operational_readiness',  'readiness_close',       NULL, 'operational_readiness', 30),
  ('fin_cat_cutover',                'readiness_close',       NULL, 'cutover', 40),
  ('fin_cat_go_live',                'readiness_close',       NULL, 'go_live_hypercare', 50),
  ('fin_cat_hypercare',              'readiness_close',       NULL, 'go_live_hypercare', 51)
) AS v(menu_code, section_code, parent_code, slot_key, sort_order)
JOIN public.menu_items mi ON mi.menu_code = v.menu_code AND COALESCE(mi.is_deleted, FALSE) = FALSE
LEFT JOIN public.menu_items par ON par.menu_code = v.parent_code AND COALESCE(par.is_deleted, FALSE) = FALSE
ON CONFLICT (menu_item_id, placement_key) DO UPDATE SET
  section_code = EXCLUDED.section_code,
  parent_menu_item_id = EXCLUDED.parent_menu_item_id,
  slot_key = EXCLUDED.slot_key,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE,
  updated_at = NOW();

-- ── Check ───────────────────────────────────────────────────────────────────
SELECT
  (SELECT count(*) FROM public.menu_item_placements WHERE placement_key = 'pm') AS pm_placements,
  (SELECT count(*) FROM public.menu_items WHERE menu_code = 'plat_pm_project_settings' AND is_visible = FALSE) AS project_settings_row_expected_1,
  (SELECT count(*) FROM public.menu_items WHERE default_section_code IS NOT NULL) AS items_with_default_section;
