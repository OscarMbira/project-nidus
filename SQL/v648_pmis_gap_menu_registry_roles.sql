-- v648: Role menu items for v647 PMIS gap menu registry
-- Per v631 role matrix. ON CONFLICT DO NOTHING only.

DO $$
DECLARE
  v_role_id UUID;
  v_pm_all TEXT[] := ARRAY[
    'pm_calendar',
    'pm_section_automations', 'pm_automations_rules', 'pm_automations_templates', 'pm_automations_log',
    'pm_section_strategy_okr', 'pm_okr_dashboard', 'pm_okr_objectives', 'pm_okr_alignment', 'pm_okr_checkins',
    'pm_section_resources_hub', 'pm_workload_heatmap', 'pm_raci_matrix', 'pm_skills_matrix',
    'pm_timesheet_approvals', 'pm_training_certifications',
    'pm_section_project_settings', 'pm_custom_fields', 'pm_intake_forms', 'pm_intake_submissions',
    'pm_client_portal', 'pm_recurring_tasks', 'pm_guest_access', 'pm_clone_project',
    'pm_section_procurement', 'pm_procurement_plan', 'pm_vendor_register', 'pm_purchase_requests',
    'pm_purchase_orders', 'pm_contracts', 'pm_invoice_tracking',
    'pm_section_planning_tools', 'pm_s_curve', 'pm_baseline_compare', 'pm_planning_poker',
    'pm_section_dashboards_analytics', 'pm_my_dashboards', 'pm_dashboard_builder',
    'pm_scheduled_reports', 'pm_report_archive',
    'pm_section_collaboration', 'pm_whiteboards', 'pm_whiteboard_new',
    'pm_section_integrations', 'pm_integrations_marketplace', 'pm_integrations_connections',
    'pm_notification_preferences'
  ];
  v_pmo_all TEXT[] := ARRAY[
    'pmo_calendar',
    'pmo_section_strategy_okr', 'pmo_okr_dashboard', 'pmo_okr_objectives', 'pmo_okr_alignment',
    'pmo_okr_checkins', 'pmo_portfolio_map',
    'pmo_section_dashboards_analytics', 'pmo_s_curve', 'pmo_baseline_compare',
    'pmo_my_dashboards', 'pmo_dashboard_builder', 'pmo_scheduled_reports',
    'pmo_section_procurement_mgmt', 'pmo_vendor_register', 'pmo_purchase_requests',
    'pmo_purchase_orders', 'pmo_contracts', 'pmo_invoice_tracking',
    'pmo_section_platform_config', 'pmo_automations_rules', 'pmo_automations_templates',
    'pmo_custom_fields', 'pmo_intake_forms', 'pmo_client_portals', 'pmo_guest_access',
    'pmo_project_clone', 'pmo_integrations_hub',
    'pmo_section_resources_capacity', 'pmo_workload_heatmap', 'pmo_raci_all_projects',
    'pmo_skills_matrix', 'pmo_timesheet_approvals', 'pmo_training_certifications',
    'pmo_section_collaboration', 'pmo_planning_poker', 'pmo_whiteboards', 'pmo_whiteboard_new',
    'pmo_notification_preferences'
  ];
  v_executive TEXT[] := ARRAY[
    'platform_calendar', 'platform_section_strategy', 'platform_okr_goals', 'platform_portfolio_map',
    'platform_section_reporting', 'platform_s_curve',
    'platform_section_dashboards', 'platform_dashboard_builder',
    'platform_section_settings', 'platform_notification_prefs'
  ];
  v_sponsor TEXT[] := ARRAY[
    'platform_calendar', 'platform_section_strategy', 'platform_okr_goals',
    'platform_section_resources', 'platform_workload_heatmap',
    'platform_section_reporting', 'platform_s_curve',
    'platform_section_dashboards', 'platform_dashboard_builder',
    'platform_section_settings', 'platform_notification_prefs'
  ];
  v_stakeholder TEXT[] := ARRAY[
    'platform_calendar',
    'platform_section_settings', 'platform_notification_prefs'
  ];
  v_team_member TEXT[] := ARRAY[
    'platform_calendar',
    'platform_section_resources', 'platform_workload_heatmap', 'platform_skills_matrix', 'platform_training',
    'platform_section_delivery', 'platform_recurring_tasks',
    'platform_section_planning', 'platform_raci_matrix',
    'platform_section_agile', 'platform_planning_poker',
    'platform_section_collaboration', 'platform_whiteboards',
    'platform_section_dashboards', 'platform_dashboard_builder',
    'platform_section_settings', 'platform_notification_prefs'
  ];
  v_team_lead TEXT[] := ARRAY[
    'platform_calendar',
    'platform_section_resources', 'platform_workload_heatmap', 'platform_skills_matrix', 'platform_training',
    'platform_section_delivery', 'platform_recurring_tasks',
    'platform_section_planning', 'platform_raci_matrix',
    'platform_section_reporting', 'platform_timesheet_approvals',
    'platform_section_agile', 'platform_planning_poker',
    'platform_section_collaboration', 'platform_whiteboards',
    'platform_section_dashboards', 'platform_dashboard_builder',
    'platform_section_settings', 'platform_notification_prefs'
  ];
BEGIN
  -- Project Manager
  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN ('project_manager', 'Project Manager', 'programme_manager', 'portfolio_manager')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code = ANY(v_pm_all) AND COALESCE(mi.is_deleted, FALSE) = FALSE
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- PMO Admin / System Admin
  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN ('pmo_admin', 'PMO Admin', 'system_admin', 'System Admin', 'super_admin')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code = ANY(v_pmo_all) AND COALESCE(mi.is_deleted, FALSE) = FALSE
    ON CONFLICT DO NOTHING;

    INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code = ANY(v_pm_all) AND COALESCE(mi.is_deleted, FALSE) = FALSE
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Executive
  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN ('executive', 'project_executive', 'Project Executive', 'Executive')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi WHERE mi.menu_code = ANY(v_executive) AND COALESCE(mi.is_deleted, FALSE) = FALSE
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Project Sponsor
  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN ('project_sponsor', 'sponsor', 'Sponsor', 'Project Sponsor')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi WHERE mi.menu_code = ANY(v_sponsor) AND COALESCE(mi.is_deleted, FALSE) = FALSE
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Stakeholder
  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN ('stakeholder', 'Stakeholder', 'viewer', 'Viewer')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi WHERE mi.menu_code = ANY(v_stakeholder) AND COALESCE(mi.is_deleted, FALSE) = FALSE
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Team Member
  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN ('team_member', 'Team Member')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi WHERE mi.menu_code = ANY(v_team_member) AND COALESCE(mi.is_deleted, FALSE) = FALSE
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Team Lead
  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN ('team_lead', 'team_manager', 'Team Lead', 'Team Manager')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi WHERE mi.menu_code = ANY(v_team_lead) AND COALESCE(mi.is_deleted, FALSE) = FALSE
    ON CONFLICT DO NOTHING;
  END LOOP;

  RAISE NOTICE 'v648_pmis_gap_menu_registry_roles.sql completed';
END $$;
