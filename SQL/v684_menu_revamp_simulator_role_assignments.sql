-- =============================================================================
-- v684: Menu Revamp – Simulator role_menu_items assignments (all 5 Simulator roles)
-- Prerequisites: v683 must be applied
-- Source of truth: Documentation/Role_Menu_Structures.md §5.4–5.7
-- =============================================================================

-- =============================================================================
-- 1. simulator_admin – ALL simulator menu items
-- =============================================================================
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(),
       (SELECT id FROM public.roles WHERE role_name = 'simulator_admin'),
       mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
WHERE mi.menu_code LIKE 'sim_%'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view=TRUE, can_use=TRUE, is_active=TRUE, updated_at=NOW();

-- =============================================================================
-- 2. sim_pmo_admin – all sim items EXCEPT system admin section
-- =============================================================================
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(),
       (SELECT id FROM public.roles WHERE role_name = 'sim_pmo_admin'),
       mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
WHERE mi.menu_code LIKE 'sim_%'
  AND mi.menu_code NOT IN (
    'sim_sec_system_admin','sim_sys_platform_settings','sim_sys_pwa','sim_sys_subscription',
    'sim_sys_branding','sim_grp_scenario_mgmt','sim_sys_user_mgmt',
    'sim_sys_leaderboard_admin','sim_sys_cert_admin',
    'sim_admin_all_scenarios','sim_admin_publish','sim_admin_scenario_analytics'
  )
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view=TRUE, can_use=TRUE, is_active=TRUE, updated_at=NOW();

-- =============================================================================
-- 3. sim_project_manager – universal practice + all tracks + cross-framework
-- =============================================================================
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(),
       (SELECT id FROM public.roles WHERE role_name = 'sim_project_manager'),
       mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
WHERE mi.menu_code IN (
  -- Live simulation
  'sim_sec_live','sim_start_new_run','sim_active_run','sim_event_inbox','sim_evm_dashboard','sim_run_history',
  -- Universal practice
  'sim_sec_universal','sim_pm_dashboard','sim_pm_ai',
  'sim_grp_pm_projects','sim_pm_my_projects','sim_pm_create_project','sim_pm_manage_members','sim_pm_tasks',
  'sim_grp_pm_teams','sim_pm_practice_teams','sim_pm_my_team',
  'sim_pm_calendar','sim_grp_pm_controls',
  'sim_pm_risk_reg','sim_pm_issue_reg','sim_pm_quality_reg','sim_pm_delay_reg','sim_pm_lessons','sim_pm_cmdb',
  'sim_pm_stakeholders','sim_pm_quality','sim_pm_financial',
  -- [S]
  'sim_sec_structured','sim_grp_pm_pre_project','sim_pm_s_mandate','sim_pm_s_brief','sim_pm_s_business_case',
  'sim_grp_pm_proj_controls','sim_pm_s_pid','sim_pm_s_benefits_rp','sim_pm_s_work_packages',
  'sim_pm_s_prod_desc','sim_pm_s_ppd',
  'sim_grp_pm_gov_standards','sim_pm_s_cms','sim_pm_s_conf_ms','sim_pm_s_qms','sim_pm_s_rms',
  'sim_grp_pm_del_reporting','sim_pm_s_checkpoint','sim_pm_s_highlight','sim_pm_s_exception',
  'sim_pm_s_end_stage','sim_pm_s_end_project',
  -- [P]
  'sim_sec_pmbok','sim_grp_pm_process_groups','sim_pm_p_initiating','sim_pm_p_drafts','sim_pm_p_approvals',
  -- [A]
  'sim_sec_agile','sim_grp_pm_agile_delivery','sim_pm_a_story_map','sim_pm_a_releases',
  'sim_pm_a_process_forms',
  'sim_grp_pm_lean_tools','sim_pm_a_vsm','sim_pm_a_kaizen',
  -- Cross-framework
  'sim_sec_cross_fw','sim_pm_xf_process_templates','sim_pm_xf_strategies',
  'sim_grp_pm_xf_auth','sim_pm_pending_approval','sim_pm_submitted',
  'sim_pm_xf_lifecycle',
  'sim_grp_pm_xf_scenarios','sim_pm_browse_scenarios','sim_pm_my_progress',
  'sim_pm_xf_learning','sim_pm_xf_leaderboard','sim_pm_xf_certificates',
  'sim_pm_xf_profile','sim_pm_xf_settings','sim_pm_xf_notif_prefs'
) AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view=TRUE, can_use=TRUE, is_active=TRUE, updated_at=NOW();

-- =============================================================================
-- 4. sim_team_member – personal workspace + team + limited tracks
-- =============================================================================
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(),
       (SELECT id FROM public.roles WHERE role_name = 'sim_team_member'),
       mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
WHERE mi.menu_code IN (
  -- Live simulation (limited)
  'sim_sec_live','sim_active_run','sim_event_inbox','sim_run_history',
  -- Personal workspace
  'sim_sec_personal','sim_tm_dashboard',
  'sim_grp_tm_tasks','sim_tm_task_board','sim_tm_task_list','sim_tm_task_calendar',
  'sim_tm_daily_log',
  'sim_grp_tm_team','sim_tm_my_team','sim_tm_comms',
  -- [S] assigned work packages read-only
  'sim_sec_structured','sim_tm_s_work_packages',
  -- [A] sprint tasks
  'sim_sec_agile','sim_tm_sprint_tasks','sim_tm_story_map_ro',
  -- Cross-framework
  'sim_sec_cross_fw','sim_grp_tm_auth','sim_tm_submitted','sim_tm_pending_appr',
  'sim_tm_scenarios_browse','sim_tm_learning','sim_tm_leaderboard',
  'sim_tm_certificates','sim_tm_profile','sim_tm_notif_prefs'
) AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view=TRUE, can_use=TRUE, is_active=TRUE, updated_at=NOW();

-- read-only for assigned artefacts and story map
UPDATE public.role_menu_items
SET can_use = FALSE, updated_at = NOW()
WHERE role_id = (SELECT id FROM public.roles WHERE role_name = 'sim_team_member')
  AND menu_item_id IN (
    SELECT id FROM public.menu_items
    WHERE menu_code IN ('sim_tm_s_work_packages','sim_tm_story_map_ro')
    AND COALESCE(is_deleted,FALSE) = FALSE
  );

-- =============================================================================
-- 5. simulator_user (General Learner) – learning hub + live sim + scenarios
-- =============================================================================
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(),
       (SELECT id FROM public.roles WHERE role_name = 'simulator_user'),
       mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
WHERE mi.menu_code IN (
  -- Learning Hub
  'sim_sec_learning','sim_learner_dashboard','sim_learner_ai','sim_learner_learning_path',
  'sim_learner_leaderboard','sim_learner_certs',
  'sim_grp_learner_profile','sim_learner_my_stats','sim_learner_badges',
  'sim_learner_settings',
  -- Live Simulation
  'sim_sec_live','sim_start_new_run','sim_active_run','sim_event_inbox','sim_evm_dashboard','sim_run_history',
  -- Scenarios & Practice
  'sim_sec_scenarios',
  'sim_grp_learner_scenarios','sim_learner_browse_scenarios','sim_learner_my_progress','sim_learner_custom_scenarios',
  'sim_learner_prac_projects',
  -- [S] scenario-scoped
  'sim_sec_structured','sim_grp_learner_s_initiation',
  'sim_learner_s_mandate','sim_learner_s_brief','sim_learner_s_business_case',
  -- [P] scenario-scoped
  'sim_sec_pmbok','sim_learner_p_process_groups',
  -- [A] scenario-scoped
  'sim_sec_agile','sim_learner_a_tools',
  -- Subscription & Upgrade
  'sim_sec_subscription','sim_learner_upgrade','sim_learner_marketplace',
  'sim_learner_cert_exams','sim_learner_notif_prefs'
) AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view=TRUE, can_use=TRUE, is_active=TRUE, updated_at=NOW();

-- Custom scenarios are premium-only: free-tier users see the item but cannot use it
-- (Premium gate is enforced at the component level; can_use=TRUE here, gate in UI)
