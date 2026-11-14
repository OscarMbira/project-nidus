-- ============================================================================
-- v1455: Consolidated role menus — Team Lead / Team Manager and Team Member placements (Slice 6)
-- PRD/plan: projectprd/v1341 (D7, D24, stories 13–17) / projectplan/v1341
-- Design source: Documentation/Consolidated_Role_Menus_Proposal.md §6.6, §6.7
--
-- 'team' (Team Lead, Team Manager): the PM placements, without the PM-only setup documents,
--   project settings, budgets, procurement, benefits and closure. Same sections (D1).
-- 'team_member': Home (my work), the team directory in Project Setup, delivery and testing,
--   raising risks / issues / changes and own actions, readiness work, and documents / reports.
-- No team-assignment check (D24): role grants still decide what each user can open.
-- Both apps: Simulator items copy too, because v1454 gave them 'pm' placements; exclusions match
-- the menu code and the label (ignoring a leading "Practice ").
-- Idempotent. Run after v1454.
-- ============================================================================

-- ── 1. Team Lead / Team Manager ('team') ────────────────────────────────────
INSERT INTO public.menu_item_placements (menu_item_id, placement_key, section_code, parent_menu_item_id, slot_key, sort_order, scope)
SELECT p.menu_item_id, 'team', p.section_code, p.parent_menu_item_id, p.slot_key, p.sort_order, p.scope
FROM public.menu_item_placements p
JOIN public.menu_items mi ON mi.id = p.menu_item_id
WHERE p.placement_key = 'pm' AND p.is_active = TRUE
  AND mi.menu_code NOT IN (
    'plat_pm_s_mandate', 'plat_pm_s_business_case', 'plat_s_benefits_review', 'plat_pm_s_benefits_rp',
    'plat_pm_ps_governance', 'plat_pm_approval_chains', 'plat_pm_manage_roles',
    'plat_pm_s_qms', 'plat_pm_s_rms', 'plat_pm_s_cms', 'plat_pm_s_conf_ms', 'plat_pm_s_doc_gov',
    'plat_pm_s_regional_format', 'plat_pm_s_working_days_holidays', 'plat_pm_s_timesheet_settings',
    'plat_pm_testing_environments', 'plat_pm_risk_categories', 'plat_pm_industry_modules', 'sim_pm_industry_modules',
    'plat_grp_pm_projects', 'plat_pm_create_project', 'plat_pm_archives', 'plat_pm_all_projects',
    'plat_pm_budget', 'plat_pm_cost_actuals', 'plat_pm_cost_evm', 'plat_pm_fin_reports', 'plat_pm_exp_approvals',
    'plat_pm_procurement', 'plat_pm_benefits', 'plat_pm_project_closure', 'plat_pm_s_work_auth',
    'plat_pm_p_itto_templates', 'plat_pm_p_itto_drafts', 'plat_pm_eef',
    'plat_grp_template_library', 'plat_grp_process_groups', 'plat_grp_standards_based_forms',
    'plat_pm_templates', 'plat_pm_project_templates'
  )
  AND lower(regexp_replace(mi.menu_label, '^Practice\s+', '', 'i')) NOT IN (
    'project mandate', 'business case', 'benefits review plan', 'benefits review plans', 'governance setup',
    'quality management strategy', 'risk management strategy', 'communication management strategy',
    'configuration management strategy', 'financial management', 'financial mgmt', 'budget', 'procurement',
    'project closure', 'create project', 'create practice project', 'industry modules'
  )
ON CONFLICT (menu_item_id, placement_key) DO UPDATE SET
  section_code = EXCLUDED.section_code,
  parent_menu_item_id = EXCLUDED.parent_menu_item_id,
  slot_key = EXCLUDED.slot_key,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE,
  updated_at = NOW();

-- Team timesheet approvals and team capacity sit in Money & Resources for the team layout.
INSERT INTO public.menu_item_placements (menu_item_id, placement_key, section_code, parent_menu_item_id, slot_key, sort_order)
SELECT mi.id, 'team', v.section_code, NULL, NULL, v.sort_order
FROM (VALUES
  ('plat_tl_timesheet_mgmt', 'money_resources', 10),
  ('plat_tm_timesheets',     'money_resources', 11),
  ('plat_pm_capacity',       'money_resources', 20)
) AS v(menu_code, section_code, sort_order)
JOIN public.menu_items mi ON mi.menu_code = v.menu_code AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (menu_item_id, placement_key) DO UPDATE SET
  section_code = EXCLUDED.section_code, sort_order = EXCLUDED.sort_order, is_active = TRUE, updated_at = NOW();

-- ── 2. Team Member ('team_member') ──────────────────────────────────────────
-- Core pages by code (Platform) …
INSERT INTO public.menu_item_placements (menu_item_id, placement_key, section_code, parent_menu_item_id, slot_key, sort_order)
SELECT mi.id, 'team_member', v.section_code, NULL, v.slot_key, v.sort_order
FROM (VALUES
  ('plat_pm_dashboard',         'home',             NULL::text, 10),
  ('plat_pm_ai',                'home',             NULL, 15),
  ('plat_pm_my_tasks',          'home',             NULL, 20),
  ('plat_tm_timesheets',        'home',             NULL, 25),
  ('plat_pm_daily_log',         'home',             NULL, 30),
  ('plat_pm_pending_approval',  'home',             NULL, 40),
  ('plat_pm_communications',    'home',             NULL, 50),
  ('plat_pm_my_projects',       'home',             NULL, 60),
  ('plat_pm_my_expenses',       'home',             NULL, 70),
  ('plat_pm_pt_members',        'project_setup',    NULL, 10),
  ('plat_pm_pt_contacts',       'project_setup',    NULL, 20),
  ('plat_pm_task_board',        'deliver_test',     NULL, 10),
  ('plat_pm_testing',           'deliver_test',     'testing', 70),
  ('plat_pm_raid_log',          'risks_governance', NULL, 10),
  ('plat_pm_risk_reg',          'risks_governance', NULL, 20),
  ('plat_pm_issue_log',         'risks_governance', NULL, 30),
  ('plat_pm_change_control',    'risks_governance', NULL, 40),
  ('plat_pm_governance_actions','risks_governance', NULL, 50),
  ('plat_pm_documents',         'footer',           NULL, 10),
  ('plat_pm_rep_standard',      'footer',           NULL, 20)
) AS v(menu_code, section_code, slot_key, sort_order)
JOIN public.menu_items mi ON mi.menu_code = v.menu_code AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (menu_item_id, placement_key) DO UPDATE SET
  section_code = EXCLUDED.section_code, slot_key = EXCLUDED.slot_key, sort_order = EXCLUDED.sort_order,
  is_active = TRUE, updated_at = NOW();

-- … the same pages in the Simulator (by label), and industry delivery / readiness work.
INSERT INTO public.menu_item_placements (menu_item_id, placement_key, section_code, parent_menu_item_id, slot_key, sort_order)
SELECT p.menu_item_id, 'team_member', p.section_code, NULL, p.slot_key, p.sort_order
FROM public.menu_item_placements p
JOIN public.menu_items mi ON mi.id = p.menu_item_id
WHERE p.placement_key = 'pm' AND p.is_active = TRUE
  AND (
    (mi.menu_code LIKE 'sim\_%' AND lower(regexp_replace(mi.menu_label, '^Practice\s+', '', 'i')) IN (
      'dashboard', 'ai workspace', 'my tasks', 'daily log', 'pending my approval', 'comms hub',
      'risk register', 'issue register', 'raid log', 'change requests', 'actions', 'test planning', 'task board'))
    OR (mi.menu_code ~ '^[a-z]{3}_cat_' AND p.section_code IN ('deliver_test', 'readiness_close'))
  )
ON CONFLICT (menu_item_id, placement_key) DO NOTHING;

-- ── Check ───────────────────────────────────────────────────────────────────
SELECT placement_key, count(*) AS placements
FROM public.menu_item_placements
WHERE placement_key IN ('pm', 'team', 'team_member')
GROUP BY placement_key
ORDER BY placement_key;
