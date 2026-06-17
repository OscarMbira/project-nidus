-- =============================================================================
-- v667: PMO sidebar admin restore — platform menu_items seed + role grants
-- Fixes: PMO Administration reduced to 3 items after v664 DB-only (no JS injection)
-- Root cause: Platform admin leaves were never in menu_items (only sim_* in v659);
--   v664 removed pmoMenuConfig virtual fallbacks; useMenu whitelist stripped legacy codes.
-- Prerequisites: v130, v153, v273, v314, v485, v518, v638, v659, v660, v664, v665, v666
-- =============================================================================

-- =============================================================================
-- PART 1: Upsert PMO Administration leaves under pmo_admin_section
-- =============================================================================
DO $$
DECLARE
  v_admin UUID;
BEGIN
  SELECT id INTO v_admin FROM public.menu_items WHERE menu_code = 'pmo_admin_section' LIMIT 1;

  IF v_admin IS NULL THEN
    RAISE NOTICE 'v667 Part 1 skipped — pmo_admin_section not found';
    RETURN;
  END IF;

  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES
    ('pmo_admin_form_templates',   'Form Templates',        'Manage dynamic form templates',           v_admin, 2,  1, '/platform/admin/form-templates',        'file-text',   TRUE, TRUE),
    ('pmo_admin_org_settings',     'Organisation Settings', 'Organisation profile and preferences',    v_admin, 2,  2, '/platform/pmo-admin/settings',            'settings-2',  TRUE, TRUE),
    ('pmo_admin_users',            'User Management',       'Manage organisation users and roles',     v_admin, 2,  3, '/platform/pmo-admin/users',               'shield',      TRUE, TRUE),
    ('pmo_admin_funding_sources',  'Funding Sources',       'PMO-managed funding source labels',       v_admin, 2,  7, '/platform/pmo-admin/funding-sources',     'dollar-sign', TRUE, TRUE),
    ('pmo_admin_subscription',     'Subscription',          'Organisation subscription and billing',   v_admin, 2,  9, '/platform/pmo-admin/subscription',        'credit-card', TRUE, TRUE),
    ('pmo_admin_branding',         'Branding',              'Organisation branding and identity',      v_admin, 2, 10, '/platform/pmo-admin/branding',            'sparkles',    TRUE, TRUE),
    ('pmo_admin_branding_identity', 'Branding & Identity',   'Logos, app name, and tagline',            v_admin, 2, 11, '/platform/organisation/branding',         'palette',     TRUE, TRUE),
    ('pmo_admin_branding_history', 'Branding History',      'View and revert branding configurations', v_admin, 2, 12, '/platform/organisation/branding-history', 'history',     TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    menu_description = EXCLUDED.menu_description,
    parent_menu_id = v_admin,
    menu_level = EXCLUDED.menu_level,
    sort_order = EXCLUDED.sort_order,
    route_path = EXCLUDED.route_path,
    menu_icon = EXCLUDED.menu_icon,
    is_visible = TRUE,
    is_active = TRUE,
    is_deleted = FALSE,
    updated_at = NOW();

  -- Reactivate Project Types (v660 incorrectly deactivated the only platform row)
  UPDATE public.menu_items
  SET is_active = TRUE, is_visible = TRUE, parent_menu_id = v_admin, menu_level = 2, sort_order = 5, updated_at = NOW()
  WHERE menu_code = 'pmo_admin_project_types'
    AND COALESCE(is_deleted, FALSE) = FALSE;

  -- Ensure Project Statuses + Budget Categories are under PMO Admin
  UPDATE public.menu_items
  SET parent_menu_id = v_admin, menu_level = 2, is_active = TRUE, is_visible = TRUE, updated_at = NOW()
  WHERE menu_code IN ('pmo_admin_project_statuses', 'pmo_admin_budget_categories')
    AND COALESCE(is_deleted, FALSE) = FALSE;

  -- Role Menu Access (v485 code pmo_role_menu_access)
  UPDATE public.menu_items
  SET parent_menu_id = v_admin, menu_level = 2, sort_order = 4, is_active = TRUE, is_visible = TRUE, updated_at = NOW()
  WHERE menu_code = 'pmo_role_menu_access'
    AND COALESCE(is_deleted, FALSE) = FALSE;

  -- Integrations Hub — reparent from platform config section
  UPDATE public.menu_items
  SET parent_menu_id = v_admin, menu_level = 2, sort_order = 13, is_active = TRUE, is_visible = TRUE, updated_at = NOW()
  WHERE menu_code IN ('pmo_admin_integrations', 'pmo_integrations_hub')
    AND COALESCE(is_deleted, FALSE) = FALSE;

  -- PMIS gap admin config items → PMO Administration
  UPDATE public.menu_items
  SET parent_menu_id = v_admin, menu_level = 2, is_active = TRUE, is_visible = TRUE, updated_at = NOW()
  WHERE menu_code IN (
    'pmo_automations_rules', 'pmo_automations_templates',
    'pmo_custom_fields', 'pmo_intake_forms', 'pmo_client_portals',
    'pmo_guest_access', 'pmo_project_clone'
  ) AND COALESCE(is_deleted, FALSE) = FALSE;

  RAISE NOTICE 'v667 Part 1: PMO Administration leaves upserted';
END $$;

-- =============================================================================
-- PART 2: Reparent Local Data Extensions + LDE children under PMO Admin
-- =============================================================================
DO $$
DECLARE
  v_admin UUID;
  v_lde UUID;
BEGIN
  SELECT id INTO v_admin FROM public.menu_items WHERE menu_code = 'pmo_admin_section' LIMIT 1;
  SELECT id INTO v_lde FROM public.menu_items WHERE menu_code = 'local_data_extensions' LIMIT 1;

  IF v_admin IS NOT NULL AND v_lde IS NOT NULL THEN
    UPDATE public.menu_items
    SET parent_menu_id = v_admin, menu_level = 2, sort_order = 0, is_active = TRUE, is_visible = TRUE, updated_at = NOW()
    WHERE menu_code = 'local_data_extensions'
      AND COALESCE(is_deleted, FALSE) = FALSE;

    UPDATE public.menu_items
    SET menu_level = 3, updated_at = NOW()
    WHERE parent_menu_id = v_lde
      AND menu_code LIKE 'lde_%'
      AND COALESCE(is_deleted, FALSE) = FALSE;
  END IF;

  -- Hide legacy top-level Organisation Settings section (leaves replaced by pmo_admin_* rows)
  UPDATE public.menu_items
  SET is_visible = FALSE, updated_at = NOW()
  WHERE menu_code = 'organisation_settings'
    AND route_path IS NULL
    AND COALESCE(is_deleted, FALSE) = FALSE;

  UPDATE public.menu_items
  SET is_active = FALSE, is_visible = FALSE, updated_at = NOW()
  WHERE menu_code IN ('org_branding', 'org_branding_history', 'org_colour_themes', 'org_typography')
    AND COALESCE(is_deleted, FALSE) = FALSE;

  RAISE NOTICE 'v667 Part 2: Local Data Extensions reparented; legacy org settings hidden';
END $$;

-- =============================================================================
-- PART 3: Comprehensive role_menu_items for pmo_admin + system_admin
-- =============================================================================
DO $$
DECLARE
  v_role_id UUID;
  v_pmo_codes TEXT[] := ARRAY[
    -- PMO Administration (v667 + prior seeds)
    'pmo_admin_section',
    'local_data_extensions',
    'lde_field_definitions', 'lde_field_groups', 'lde_screen_mapping',
    'lde_validation_rules', 'lde_field_permissions', 'lde_audit_history',
    'pmo_admin_form_templates', 'pmo_admin_org_settings', 'pmo_admin_users',
    'pmo_role_menu_access', 'pmo_admin_project_types', 'pmo_admin_project_statuses',
    'pmo_admin_funding_sources', 'pmo_admin_budget_categories', 'pmo_admin_subscription',
    'pmo_admin_branding', 'pmo_admin_branding_identity', 'pmo_admin_branding_history',
    'pmo_admin_integrations', 'pmo_integrations_hub',
    'pmo_automations_rules', 'pmo_automations_templates',
    'pmo_custom_fields', 'pmo_intake_forms', 'pmo_client_portals', 'pmo_guest_access', 'pmo_project_clone',
    -- Initiation (v638)
    'pmo_section_initiation',
    'pmo_init_business_case', 'pmo_init_project_brief', 'pmo_init_benefits_review_plan',
    'pmo_admin_briefs_section', 'pmo_admin_briefs_all', 'pmo_init_briefs_all',
    -- Governance (v638 + v659 + v265)
    'pmo_section_governance',
    'pmo_gov_mandates_section', 'pmo_gov_mandates_create', 'pmo_gov_mandates_all', 'pmo_gov_mandates_unlinked',
    'pmo_admin_mandates_section', 'pmo_admin_mandates_create', 'pmo_admin_mandates_all', 'pmo_admin_mandates_unlinked',
    'pmo_gov_communication_strategy', 'pmo_gov_configuration_strategy', 'pmo_gov_quality_strategy', 'pmo_gov_risk_strategy',
    'gov_communication_strategy', 'gov_configuration_strategy', 'gov_quality_strategy', 'gov_risk_strategy',
    'pmo_gov_itto_templates', 'pmo_gov_itto_drafts',
    'pmo_gov_eef_list', 'pmo_gov_eef_new', 'pmo_gov_eef_drafts',
    -- Process Templates (v666)
    'pmo_process_templates_section',
    'pmo_pt_hub', 'pmo_pt_pre', 'pmo_pt_init', 'pmo_pt_plan', 'pmo_pt_exec', 'pmo_pt_mon', 'pmo_pt_close',
    'pmo_pt_browse', 'pmo_pt_manage', 'pmo_pt_agile', 'pmo_pt_new',
    'pmo_industry_templates', 'pmo_industry_templates_new', 'pmo_industry_templates_on_hold',
    -- Knowledge & Assets (v660)
    'pmo_section_knowledge',
    'pmo_knowledge_hub', 'pmo_knowledge_opa', 'pmo_knowledge_opa_new', 'pmo_knowledge_opa_drafts', 'pmo_knowledge_opa_bulk',
    'org_knowledge', 'org_knowledge_opa', 'org_knowledge_opa_new', 'org_knowledge_opa_drafts', 'org_knowledge_opa_bulk',
    -- System Administration (v660)
    'pmo_section_system_admin',
    'pmo_sys_platform_settings', 'pmo_sys_pwa_settings',
    -- Workflows (v660)
    'pmo_section_workflows',
    'pmo_workflows_mandate_pending', 'pmo_workflows_brief_pending',
    'pmo_admin_mandates_pending_approvals', 'pmo_admin_briefs_pending_approvals',
    -- Reporting (v659 + v265)
    'pmo_section_reporting', 'reports', 'reports-analytics',
    'pmo_report_lessons', 'pmo_report_sprint_metrics', 'pmo_report_lean_metrics', 'pmo_report_agile_metrics',
    'report_highlight_pmo', 'report_exception_pmo', 'report_end_stage_pmo', 'report_end_project_pmo',
    -- Email & Notifications (v659 + v665)
    'pmo_section_email', 'pmo_comms_section',
    'pmo_comms_messages', 'pmo_comms_direct', 'pmo_comms_meetings', 'pmo_comms_pending_ai',
    'pmo_email_settings', 'pmo_email_sender_profiles', 'pmo_email_invitation_templates', 'pmo_email_invitation_expiry',
    -- Teams (v664)
    'platform_teams',
    'platform_teams_manager_assignments', 'platform_teams_assignment_settings',
    'platform_teams_assign_roles', 'platform_teams_add_users', 'platform_teams_send_invites',
    'platform_teams_invitation_tracker', 'platform_teams_appointment_tracker',
    'platform_teams_all', 'platform_teams_my', 'platform_teams_directory',
    'platform_teams_workload', 'platform_teams_my_team',
    -- Stakeholders (v664)
    'platform_stakeholders',
    'platform_stakeholders_register', 'platform_stakeholders_analysis', 'platform_stakeholders_assessment_matrix',
    'platform_stakeholders_engagement', 'platform_stakeholders_communications', 'platform_stakeholders_monitoring',
    -- Project Oversight (v265)
    'pmo_oversight', 'pmo_oversight_risk', 'pmo_oversight_issue', 'pmo_oversight_quality', 'pmo_oversight_lessons',
    'pmo_oversight_changes',
    -- Delivery / Projects (v659)
    'pmo_delivery_story_map'
  ];
BEGIN
  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE LOWER(TRIM(role_name)) IN ('pmo_admin', 'system_admin', 'super_admin')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code = ANY(v_pmo_codes)
      AND COALESCE(mi.is_deleted, FALSE) = FALSE
      AND mi.is_active = TRUE
    ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
      can_view = TRUE,
      can_use = TRUE,
      is_active = TRUE,
      is_deleted = FALSE,
      updated_at = NOW();
  END LOOP;

  RAISE NOTICE 'v667 Part 3: role_menu_items granted for PMO Admin / System Admin';
END $$;

DO $$
BEGIN
  RAISE NOTICE 'v667_pmo_sidebar_admin_restore.sql completed';
END $$;
