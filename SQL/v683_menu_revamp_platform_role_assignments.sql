-- =============================================================================
-- v683: Menu Revamp – Platform role_menu_items assignments (all 15 Platform roles)
-- Prerequisites: v682 must be applied
-- Source of truth: Documentation/Role_Menu_Structures.md
--
-- Role name mapping (actual DB names):
--   plan name          → DB role_name
--   team_member        → pm_team_member
--   team_lead          → pm_team_manager
--   project_assurance  → pm_project_assurance
--   quality_assurance  → pm_quality_assurance
--
-- Strategy:
--   1. system_admin / account_owner / pmo_admin get ALL plat_* items
--   2. project_manager gets universal + all methodology tracks
--   3. Specialised PM roles get their specific subset
--   4. TM roles get their personal workspace sections
-- =============================================================================

-- =============================================================================
-- Helper: assign all items whose menu_code matches a LIKE pattern to a role
-- =============================================================================

-- ─── 1. system_admin – ALL Platform menu items ────────────────────────────────
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(),
       (SELECT id FROM public.roles WHERE role_name = 'system_admin'),
       mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
WHERE mi.menu_code LIKE 'plat_%'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view=TRUE, can_use=TRUE, is_active=TRUE, updated_at=NOW();

-- ─── 2. account_owner – ALL Platform menu items ───────────────────────────────
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(),
       (SELECT id FROM public.roles WHERE role_name = 'account_owner'),
       mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
WHERE mi.menu_code LIKE 'plat_%'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view=TRUE, can_use=TRUE, is_active=TRUE, updated_at=NOW();

-- ─── 3. pmo_admin – ALL Platform menu items EXCEPT system_admin section ───────
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(),
       (SELECT id FROM public.roles WHERE role_name = 'pmo_admin'),
       mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
WHERE mi.menu_code LIKE 'plat_%'
  AND mi.menu_code NOT IN ('plat_sec_system_admin','plat_sys_platform_settings','plat_sys_pwa',
                           'plat_sys_auth','plat_sys_security','plat_sys_gdpr','plat_sys_roles_perms',
                           'plat_sys_help_content','plat_sys_feedback','plat_sys_monitoring')
  AND mi.menu_code NOT LIKE 'plat_sec_account'
  AND mi.menu_code NOT IN ('plat_acct_current_plan','plat_acct_upgrade','plat_acct_billing',
                           'plat_acct_payment','plat_acct_org_profile','plat_acct_branding',
                           'plat_acct_domain')
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view=TRUE, can_use=TRUE, is_active=TRUE, updated_at=NOW();

-- ─── 4. portfolio_manager ─────────────────────────────────────────────────────
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(),
       (SELECT id FROM public.roles WHERE role_name = 'portfolio_manager'),
       mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
WHERE mi.menu_code IN (
  -- Universal / cross-role
  'plat_sec_universal','plat_pm_dashboard','plat_pm_ai',
  'plat_grp_portfolio','plat_portfolio_overview','plat_portfolio_dependencies',
  'plat_portfolio_collisions','plat_portfolio_map','plat_portfolio_alignment','plat_portfolio_benefits',
  'plat_grp_programme','plat_programme_management','plat_programme_benefits',
  'plat_grp_pm_projects','plat_pm_all_projects',
  -- Financial
  'plat_grp_pm_financial','plat_fin_evm','plat_fin_reports',
  -- Reporting
  'plat_grp_pm_reporting','plat_pm_rep_library','plat_pm_analytics','plat_pm_rep_builder',
  'plat_sec_reporting','plat_grp_reporting_assurance','plat_rep_analytics','plat_rep_builder','plat_rep_scheduled',
  -- [S] read-only
  'plat_sec_structured','plat_grp_initiation','plat_s_business_cases','plat_s_pids','plat_s_benefits_review',
  -- [P] read-only
  'plat_sec_pmbok',
  -- [A] read-only
  'plat_sec_agile','plat_grp_agile_metrics','plat_a_sprint_metrics',
  -- Strategy & OKRs
  'plat_sec_cross_fw','plat_xf_okr',
  'plat_xf_notif_prefs','plat_notif_prefs_shared'
) AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view=TRUE, can_use=TRUE, is_active=TRUE, updated_at=NOW();

-- ─── 5. programme_manager ─────────────────────────────────────────────────────
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(),
       (SELECT id FROM public.roles WHERE role_name = 'programme_manager'),
       mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
WHERE mi.menu_code IN (
  'plat_sec_universal','plat_pm_dashboard','plat_pm_ai',
  'plat_grp_programme','plat_programme_management','plat_programme_benefits',
  'plat_grp_pm_projects','plat_pm_my_projects','plat_pm_manage_members',
  -- Financial
  'plat_grp_pm_financial','plat_pm_my_expenses','plat_pm_exp_approvals','plat_pm_fin_reports',
  -- Reporting
  'plat_grp_pm_reporting','plat_pm_rep_library','plat_pm_analytics',
  -- [S] full
  'plat_sec_structured','plat_grp_pm_pre_project','plat_pm_s_mandate','plat_pm_s_brief','plat_pm_s_business_case',
  'plat_grp_pm_gov_standards','plat_pm_s_cms','plat_pm_s_conf_ms','plat_pm_s_qms','plat_pm_s_rms',
  'plat_grp_pm_del_reporting','plat_pm_s_highlight','plat_pm_s_end_stage',
  -- [P] scoped
  'plat_sec_pmbok','plat_grp_pm_process_groups','plat_pm_p_planning','plat_pm_p_executing',
  'plat_pm_p_mc','plat_pm_p_closing',
  -- Controls
  'plat_grp_pm_controls','plat_pm_risk_reg','plat_pm_issue_log','plat_pm_change_log','plat_pm_delay_reg',
  -- Authorisation
  'plat_grp_pm_auth','plat_pm_pending_approval','plat_pm_submitted',
  -- Cross-framework
  'plat_sec_cross_fw','plat_xf_okr','plat_xf_notif_prefs','plat_notif_prefs_shared'
) AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view=TRUE, can_use=TRUE, is_active=TRUE, updated_at=NOW();

-- ─── 6. project_manager – full access ─────────────────────────────────────────
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(),
       (SELECT id FROM public.roles WHERE role_name = 'project_manager'),
       mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
WHERE mi.menu_code LIKE 'plat_%'
  AND mi.menu_code NOT LIKE 'plat_sec_exec%'
  AND mi.menu_code NOT LIKE 'plat_sec_project_delivery'
  AND mi.menu_code NOT LIKE 'plat_grp_projects'
  AND mi.menu_code NOT LIKE 'plat_grp_oversight%'
  AND mi.menu_code NOT LIKE 'plat_oversight%'
  AND mi.menu_code NOT LIKE 'plat_sec_reporting'
  AND mi.menu_code NOT LIKE 'plat_grp_reporting_assurance'
  AND mi.menu_code NOT LIKE 'plat_rep_%'
  AND mi.menu_code NOT LIKE 'plat_sec_workflows'
  AND mi.menu_code NOT LIKE 'plat_grp_workflows%'
  AND mi.menu_code NOT LIKE 'plat_grp_auth_lifecycle'
  AND mi.menu_code NOT LIKE 'plat_lc_%'
  AND mi.menu_code NOT LIKE 'plat_sec_process_templates'
  AND mi.menu_code NOT LIKE 'plat_pt_%'
  AND mi.menu_code NOT LIKE 'plat_sec_knowledge'
  AND mi.menu_code NOT LIKE 'plat_grp_knowledge%'
  AND mi.menu_code NOT LIKE 'plat_know_%'
  AND mi.menu_code NOT LIKE 'plat_grp_okr'
  AND mi.menu_code NOT LIKE 'plat_okr_%'
  AND mi.menu_code NOT LIKE 'plat_grp_procurement'
  AND mi.menu_code NOT LIKE 'plat_proc_%'
  AND mi.menu_code NOT LIKE 'plat_grp_collaboration'
  AND mi.menu_code NOT LIKE 'plat_collab_%'
  AND mi.menu_code NOT LIKE 'plat_sec_people'
  AND mi.menu_code NOT LIKE 'plat_people_%'
  AND mi.menu_code NOT LIKE 'plat_sec_email'
  AND mi.menu_code NOT LIKE 'plat_email_%'
  AND mi.menu_code NOT LIKE 'plat_sec_admin'
  AND mi.menu_code NOT LIKE 'plat_admin_%'
  AND mi.menu_code NOT LIKE 'plat_sec_system_admin'
  AND mi.menu_code NOT LIKE 'plat_sys_%'
  AND mi.menu_code NOT LIKE 'plat_sec_account'
  AND mi.menu_code NOT LIKE 'plat_acct_%'
  AND mi.menu_code NOT LIKE 'plat_sec_team_mgmt'
  AND mi.menu_code NOT LIKE 'plat_sec_delivery'
  AND mi.menu_code NOT LIKE 'plat_tl_%'
  AND mi.menu_code NOT LIKE 'plat_grp_tl_%'
  AND mi.menu_code NOT LIKE 'plat_sec_personal'
  AND mi.menu_code NOT LIKE 'plat_tm_%'
  AND mi.menu_code NOT LIKE 'plat_grp_tm_%'
  AND mi.menu_code NOT LIKE 'plat_sec_team_section'
  AND mi.menu_code NOT LIKE 'plat_sec_delivery_artefacts'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view=TRUE, can_use=TRUE, is_active=TRUE, updated_at=NOW();

-- ─── 7. project_sponsor ───────────────────────────────────────────────────────
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(),
       (SELECT id FROM public.roles WHERE role_name = 'project_sponsor'),
       mi.id,
       TRUE,
       CASE WHEN mi.menu_code IN ('plat_pm_all_projects','plat_fin_reports','plat_fin_evm') THEN FALSE ELSE TRUE END,
       TRUE, NOW(), NOW()
FROM public.menu_items mi
WHERE mi.menu_code IN (
  'plat_sec_universal','plat_pm_dashboard','plat_pm_my_projects',
  'plat_grp_pm_financial','plat_fin_reports','plat_fin_evm',
  -- [S] approve + read
  'plat_sec_structured','plat_grp_pm_pre_project','plat_pm_s_mandate','plat_pm_s_brief',
  'plat_pm_s_business_case','plat_grp_pm_proj_controls','plat_pm_s_pid','plat_pm_s_benefits_rp',
  -- Approvals & Governance
  'plat_sec_approvals_gov','plat_grp_pm_auth','plat_pm_pending_approval','plat_pm_submitted','plat_pm_approval_chains',
  'plat_pm_s_decision_log','plat_pm_s_work_auth','plat_pm_s_stage_gates',
  -- Reporting
  'plat_grp_pm_reporting','plat_pm_rep_library',
  'plat_pm_s_highlight','plat_pm_s_exception','plat_pm_s_end_stage','plat_pm_s_end_project',
  -- Stakeholders
  'plat_grp_pm_stakeholders','plat_pm_stkh_register',
  'plat_xf_notif_prefs','plat_notif_prefs_shared'
) AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE
  SET can_view=TRUE,
      can_use=EXCLUDED.can_use,
      is_active=TRUE, updated_at=NOW();

-- ─── 8. executive – read-only ─────────────────────────────────────────────────
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(),
       (SELECT id FROM public.roles WHERE role_name = 'executive'),
       mi.id, TRUE, FALSE, TRUE, NOW(), NOW()
FROM public.menu_items mi
WHERE mi.menu_code IN (
  'plat_exec_dashboard','plat_sec_universal',
  'plat_grp_portfolio','plat_portfolio_overview','plat_portfolio_map','plat_portfolio_alignment','plat_portfolio_benefits',
  'plat_grp_programme',
  'plat_grp_pm_projects','plat_pm_all_projects',
  'plat_grp_pm_reporting','plat_pm_rep_library','plat_pm_analytics',
  'plat_pm_s_highlight','plat_pm_s_exception','plat_pm_s_end_project',
  'plat_grp_pm_financial','plat_fin_evm','plat_fin_reports',
  'plat_sec_structured','plat_pm_s_business_case','plat_pm_s_benefits_rp',
  'plat_xf_notif_prefs','plat_notif_prefs_shared'
) AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view=TRUE, can_use=FALSE, is_active=TRUE, updated_at=NOW();

-- ─── 9. project_board_member ──────────────────────────────────────────────────
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(),
       (SELECT id FROM public.roles WHERE role_name = 'project_board_member'),
       mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
WHERE mi.menu_code IN (
  'plat_sec_universal','plat_pm_dashboard','plat_pm_my_projects',
  -- [S] review + approve
  'plat_sec_structured','plat_grp_pm_pre_project','plat_pm_s_mandate','plat_pm_s_brief','plat_pm_s_business_case',
  'plat_grp_pm_proj_controls','plat_pm_s_pid',
  'plat_pm_s_gov_framework','plat_pm_s_decision_log','plat_pm_s_work_auth','plat_pm_s_stage_gates',
  -- Approvals & Reporting
  'plat_sec_approvals_reporting','plat_grp_pm_auth',
  'plat_pm_pending_approval','plat_pm_submitted','plat_pm_approval_chains',
  'plat_pm_s_highlight','plat_pm_s_exception','plat_pm_s_end_stage','plat_pm_s_checkpoint',
  -- Project Oversight (read-only)
  'plat_grp_pm_controls','plat_pm_risk_reg','plat_pm_issue_log','plat_pm_change_log',
  'plat_xf_notif_prefs','plat_notif_prefs_shared'
) AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view=TRUE, can_use=TRUE, is_active=TRUE, updated_at=NOW();

-- read-only for oversight items
UPDATE public.role_menu_items
SET can_use = FALSE, updated_at = NOW()
WHERE role_id = (SELECT id FROM public.roles WHERE role_name = 'project_board_member')
  AND menu_item_id IN (
    SELECT id FROM public.menu_items
    WHERE menu_code IN ('plat_pm_risk_reg','plat_pm_issue_log','plat_pm_change_log')
    AND COALESCE(is_deleted,FALSE) = FALSE
  );

-- ─── 10. pm_project_assurance ─────────────────────────────────────────────────
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(),
       (SELECT id FROM public.roles WHERE role_name = 'pm_project_assurance'),
       mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
WHERE mi.menu_code IN (
  'plat_sec_universal','plat_pm_dashboard','plat_pm_my_projects',
  -- Quality & Assurance
  'plat_sec_quality_assurance','plat_pm_quality_testing',
  'plat_pm_s_gov_framework','plat_pm_s_policies','plat_pm_s_doc_gov',
  -- [S] read-only
  'plat_sec_structured','plat_pm_s_business_case','plat_pm_s_pid','plat_pm_s_benefits_rp',
  'plat_pm_s_qms','plat_pm_s_conf_ms',
  -- [P] read-only
  'plat_sec_pmbok','plat_grp_pm_process_groups',
  'plat_pm_p_initiating','plat_pm_p_planning','plat_pm_p_executing','plat_pm_p_mc','plat_pm_p_closing',
  -- Reporting & Controls
  'plat_sec_reporting_controls',
  'plat_pm_s_exception','plat_pm_s_end_stage','plat_pm_s_end_project',
  'plat_pm_risk_reg','plat_pm_issue_log','plat_pm_delay_reg',
  -- Authorisation
  'plat_grp_pm_auth','plat_pm_pending_approval','plat_pm_submitted',
  'plat_xf_notif_prefs','plat_notif_prefs_shared'
) AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view=TRUE, can_use=TRUE, is_active=TRUE, updated_at=NOW();

-- read-only for [S]/[P] items
UPDATE public.role_menu_items
SET can_use = FALSE, updated_at = NOW()
WHERE role_id = (SELECT id FROM public.roles WHERE role_name = 'pm_project_assurance')
  AND menu_item_id IN (
    SELECT id FROM public.menu_items
    WHERE menu_code IN ('plat_pm_s_business_case','plat_pm_s_pid','plat_pm_s_benefits_rp',
                        'plat_pm_s_qms','plat_pm_s_conf_ms',
                        'plat_pm_p_initiating','plat_pm_p_planning','plat_pm_p_executing',
                        'plat_pm_p_mc','plat_pm_p_closing',
                        'plat_pm_s_exception','plat_pm_s_end_stage','plat_pm_s_end_project',
                        'plat_pm_risk_reg','plat_pm_issue_log','plat_pm_delay_reg')
    AND COALESCE(is_deleted,FALSE) = FALSE
  );

-- ─── 11. pm_quality_assurance ─────────────────────────────────────────────────
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(),
       (SELECT id FROM public.roles WHERE role_name = 'pm_quality_assurance'),
       mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
WHERE mi.menu_code IN (
  'plat_sec_universal','plat_pm_dashboard','plat_pm_my_projects',
  'plat_sec_quality_testing','plat_pm_quality_testing',
  -- [S] read-only
  'plat_sec_structured','plat_pm_s_qms',
  -- Reporting
  'plat_grp_pm_reporting','plat_pm_rep_library',
  -- Authorisation
  'plat_grp_pm_auth','plat_pm_pending_approval',
  'plat_xf_notif_prefs','plat_notif_prefs_shared'
) AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view=TRUE, can_use=TRUE, is_active=TRUE, updated_at=NOW();

UPDATE public.role_menu_items
SET can_use = FALSE, updated_at = NOW()
WHERE role_id = (SELECT id FROM public.roles WHERE role_name = 'pm_quality_assurance')
  AND menu_item_id IN (
    SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_s_qms' AND COALESCE(is_deleted,FALSE) = FALSE
  );

-- ─── 12. stakeholder ──────────────────────────────────────────────────────────
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(),
       (SELECT id FROM public.roles WHERE role_name = 'stakeholder'),
       mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
WHERE mi.menu_code IN (
  'plat_sec_universal','plat_pm_dashboard','plat_pm_my_projects',
  'plat_sec_comm_reporting',
  'plat_pm_s_highlight','plat_pm_s_end_project',
  'plat_tm_messages','plat_tm_direct_msgs','plat_tm_meetings',
  'plat_sec_structured','plat_pm_s_benefits_rp','plat_pm_s_brief',
  'plat_xf_notif_prefs','plat_notif_prefs_shared'
) AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view=TRUE, can_use=FALSE, is_active=TRUE, updated_at=NOW();

-- ─── 13. viewer – read-only dashboard only ────────────────────────────────────
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(),
       (SELECT id FROM public.roles WHERE role_name = 'viewer'),
       mi.id, TRUE, FALSE, TRUE, NOW(), NOW()
FROM public.menu_items mi
WHERE mi.menu_code IN (
  'plat_sec_universal','plat_pm_dashboard','plat_pm_my_projects',
  'plat_grp_pm_reporting','plat_pm_rep_library',
  'plat_xf_notif_prefs','plat_notif_prefs_shared'
) AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view=TRUE, can_use=FALSE, is_active=TRUE, updated_at=NOW();

-- ─── 14. pm_team_member (team_member) ─────────────────────────────────────────
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(),
       (SELECT id FROM public.roles WHERE role_name = 'pm_team_member'),
       mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
WHERE mi.menu_code LIKE 'plat_tm_%'
   OR mi.menu_code LIKE 'plat_grp_tm_%'
   OR mi.menu_code IN (
      'plat_sec_personal','plat_sec_team_section','plat_sec_delivery_artefacts',
      'plat_sec_structured','plat_tm_s_work_packages_ro',
      'plat_sec_agile','plat_grp_tm_agile','plat_tm_sprint_tasks','plat_tm_story_map_ro',
      'plat_sec_cross_fw',
      'plat_notif_prefs_shared'
   )
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view=TRUE, can_use=TRUE, is_active=TRUE, updated_at=NOW();

UPDATE public.role_menu_items
SET can_use = FALSE, updated_at = NOW()
WHERE role_id = (SELECT id FROM public.roles WHERE role_name = 'pm_team_member')
  AND menu_item_id IN (
    SELECT id FROM public.menu_items
    WHERE menu_code IN ('plat_tm_s_work_packages_ro','plat_tm_story_map_ro')
    AND COALESCE(is_deleted,FALSE) = FALSE
  );

-- ─── 15. pm_team_manager (team_lead) – inherits TM + team management extras ───
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(),
       (SELECT id FROM public.roles WHERE role_name = 'pm_team_manager'),
       mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
WHERE mi.menu_code LIKE 'plat_tm_%'
   OR mi.menu_code LIKE 'plat_grp_tm_%'
   OR mi.menu_code LIKE 'plat_tl_%'
   OR mi.menu_code LIKE 'plat_grp_tl_%'
   OR mi.menu_code IN (
      'plat_sec_personal','plat_sec_team_section','plat_sec_delivery_artefacts',
      'plat_sec_team_mgmt','plat_sec_delivery',
      'plat_sec_structured','plat_tm_s_work_packages_ro',
      'plat_sec_agile','plat_grp_tm_agile','plat_tm_sprint_tasks','plat_tm_story_map_ro',
      'plat_sec_cross_fw',
      'plat_notif_prefs_shared'
   )
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view=TRUE, can_use=TRUE, is_active=TRUE, updated_at=NOW();

-- ─── 16. pm_change_authority – change + authorisation focused ─────────────────
-- This DB role wasn't in the plan but exists; give it change-related items
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(),
       (SELECT id FROM public.roles WHERE role_name = 'pm_change_authority'),
       mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
WHERE mi.menu_code IN (
  'plat_sec_universal','plat_pm_dashboard','plat_pm_my_projects',
  'plat_pm_change_log','plat_grp_pm_auth','plat_pm_pending_approval','plat_pm_submitted','plat_pm_approval_chains',
  'plat_sec_workflows','plat_grp_workflows_approvals','plat_wf_mandate_approvals','plat_wf_brief_approvals',
  'plat_grp_auth_lifecycle','plat_lc_auth_queue','plat_lc_chains',
  'plat_xf_notif_prefs','plat_notif_prefs_shared'
) AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view=TRUE, can_use=TRUE, is_active=TRUE, updated_at=NOW();
