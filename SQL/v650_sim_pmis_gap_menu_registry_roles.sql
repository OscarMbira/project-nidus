-- v650: Role menu items for v649 simulator PMIS gap menu registry
-- ON CONFLICT DO NOTHING only.

DO $$
DECLARE
  v_role_id UUID;
  v_sim_pm TEXT[] := ARRAY[
    'sim_pm_calendar',
    'sim_pm_section_strategy_okr', 'sim_pm_okr_dashboard', 'sim_pm_okr_objectives', 'sim_pm_okr_alignment', 'sim_pm_okr_checkins',
    'sim_pm_section_resources_hub', 'sim_pm_workload_heatmap', 'sim_pm_raci_matrix', 'sim_pm_skills_matrix',
    'sim_pm_timesheet_approvals', 'sim_pm_training_certifications',
    'sim_pm_section_project_settings', 'sim_pm_custom_fields', 'sim_pm_intake_forms', 'sim_pm_client_portal',
    'sim_pm_recurring_tasks', 'sim_pm_guest_access', 'sim_pm_clone_project',
    'sim_pm_section_procurement', 'sim_pm_vendor_register', 'sim_pm_purchase_requests', 'sim_pm_purchase_orders',
    'sim_pm_contracts', 'sim_pm_invoice_tracking',
    'sim_pm_section_planning_tools', 'sim_pm_s_curve', 'sim_pm_baseline_compare', 'sim_pm_planning_poker',
    'sim_pm_section_automations', 'sim_pm_automations_rules', 'sim_pm_automations_templates',
    'sim_pm_section_dashboards', 'sim_pm_my_dashboards', 'sim_pm_dashboard_builder', 'sim_pm_scheduled_reports',
    'sim_pm_section_collaboration', 'sim_pm_whiteboards', 'sim_pm_whiteboard_new',
    'sim_pm_notification_preferences'
  ];
  v_sim_pmo TEXT[] := ARRAY[
    'sim_pmo_calendar',
    'sim_pmo_section_strategy_okr', 'sim_pmo_okr_dashboard', 'sim_pmo_okr_objectives', 'sim_pmo_okr_alignment', 'sim_pmo_portfolio_map',
    'sim_pmo_section_dashboards_analytics', 'sim_pmo_s_curve', 'sim_pmo_baseline_compare', 'sim_pmo_my_dashboards',
    'sim_pmo_dashboard_builder', 'sim_pmo_scheduled_reports',
    'sim_pmo_section_procurement_mgmt', 'sim_pmo_vendor_register', 'sim_pmo_purchase_requests', 'sim_pmo_purchase_orders',
    'sim_pmo_contracts', 'sim_pmo_invoice_tracking',
    'sim_pmo_section_platform_config', 'sim_pmo_automations_rules', 'sim_pmo_custom_fields', 'sim_pmo_intake_forms',
    'sim_pmo_client_portals', 'sim_pmo_guest_access', 'sim_pmo_project_clone', 'sim_pmo_integrations_hub',
    'sim_pmo_section_resources_capacity', 'sim_pmo_workload_heatmap', 'sim_pmo_raci_matrix', 'sim_pmo_skills_matrix',
    'sim_pmo_timesheet_approvals', 'sim_pmo_training_certifications',
    'sim_pmo_section_collaboration', 'sim_pmo_planning_poker', 'sim_pmo_whiteboards',
    'sim_pmo_notification_preferences',
    'sim_team_mode_setup'
  ];
  v_sim_general TEXT[] := ARRAY[
    'sim_gap_calendar',
    'sim_gap_section_okr', 'sim_gap_okr_dashboard', 'sim_gap_okr_objectives', 'sim_gap_okr_checkins',
    'sim_gap_section_planning', 'sim_gap_recurring_tasks', 'sim_gap_raci_matrix', 'sim_gap_s_curve', 'sim_gap_planning_poker',
    'sim_gap_section_collaboration', 'sim_gap_whiteboards', 'sim_gap_whiteboard_new',
    'sim_gap_section_dashboards', 'sim_gap_my_dashboards', 'sim_gap_dashboard_builder', 'sim_gap_scheduled_reports',
    'sim_gap_notification_preferences',
    'sim_section_live_simulation', 'sim_team_mode_setup', 'sim_team_mode_active',
    'sim_section_certification_exams', 'sim_exams_browse', 'sim_exams_results', 'sim_exams_certificates',
    'sim_scenario_marketplace',
    'sim_run_analytics', 'sim_improvement_insights'
  ];
  v_sim_tm TEXT[] := ARRAY[
    'sim_tm_calendar',
    'sim_tm_section_resources', 'sim_tm_workload', 'sim_tm_raci', 'sim_tm_skills', 'sim_tm_training',
    'sim_tm_section_planning', 'sim_tm_recurring_tasks', 'sim_tm_s_curve', 'sim_tm_planning_poker',
    'sim_tm_section_collaboration', 'sim_tm_whiteboards',
    'sim_tm_timesheet_submit',
    'sim_tm_notification_preferences'
  ];
BEGIN
  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN ('project_manager', 'Project Manager', 'programme_manager', 'portfolio_manager')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code = ANY(v_sim_pm) AND COALESCE(mi.is_deleted, FALSE) = FALSE
    ON CONFLICT DO NOTHING;
  END LOOP;

  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN ('pmo_admin', 'PMO Admin', 'system_admin', 'System Admin', 'super_admin')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code = ANY(v_sim_pmo) AND COALESCE(mi.is_deleted, FALSE) = FALSE
    ON CONFLICT DO NOTHING;

    INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code = ANY(v_sim_pm) AND COALESCE(mi.is_deleted, FALSE) = FALSE
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Simulator general menus (GAP-26–29 + practice top-level)
  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN (
      'project_manager', 'Project Manager', 'pmo_admin', 'PMO Admin',
      'system_admin', 'System Admin', 'team_member', 'Team Member',
      'team_lead', 'team_manager', 'Team Lead', 'Team Manager',
      'programme_manager', 'portfolio_manager'
    ) AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code = ANY(v_sim_general) AND COALESCE(mi.is_deleted, FALSE) = FALSE
    ON CONFLICT DO NOTHING;
  END LOOP;

  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN ('team_member', 'Team Member', 'team_lead', 'team_manager', 'Team Lead', 'Team Manager')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code = ANY(v_sim_tm) AND COALESCE(mi.is_deleted, FALSE) = FALSE
    ON CONFLICT DO NOTHING;
  END LOOP;

  RAISE NOTICE 'v650_sim_pmis_gap_menu_registry_roles.sql completed';
END $$;
