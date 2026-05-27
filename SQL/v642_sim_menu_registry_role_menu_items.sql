-- v642: Role menu items for v641 simulator registry backfill
-- ON CONFLICT DO NOTHING — does not overwrite custom role assignments.

DO $$
DECLARE
  v_role_id UUID;
  v_sim_pmo_codes TEXT[] := ARRAY[
    'sim_pmo_section_initiation',
    'sim_pmo_init_business_case', 'sim_pmo_init_project_brief', 'sim_pmo_init_benefits_review_plan',
    'sim_pmo_section_governance',
    'sim_pmo_gov_mandate', 'sim_pmo_gov_communication_strategy', 'sim_pmo_gov_configuration_strategy',
    'sim_pmo_gov_quality_strategy', 'sim_pmo_gov_risk_strategy', 'sim_pmo_gov_itto_templates', 'sim_pmo_gov_itto_drafts',
    'sim_pmo_section_oversight',
    'sim_pmo_oversight_risk_register', 'sim_pmo_oversight_issue_register', 'sim_pmo_oversight_quality_register',
    'sim_pmo_oversight_lessons_log', 'sim_pmo_oversight_delays', 'sim_pmo_oversight_delay_templates',
    'sim_pmo_oversight_scope', 'sim_pmo_oversight_schedules',
    'sim_pmo_process_templates_section',
    'sim_pmo_pt_hub', 'sim_pmo_pt_pre', 'sim_pmo_pt_init', 'sim_pmo_pt_plan', 'sim_pmo_pt_exec', 'sim_pmo_pt_mon', 'sim_pmo_pt_close',
    'sim_pmo', 'sim_pmo_dashboard', 'sim_pmo_procurement', 'sim_pmo_reporting'
  ];
  v_sim_pm_codes TEXT[] := ARRAY[
    'sim_pm_section_initiation',
    'sim_pm_init_business_case', 'sim_pm_init_project_brief', 'sim_pm_init_pid',
    'sim_pm_init_benefits_review_plan',
    'sim_pm_process_templates_section',
    'sim_pm_pt_hub', 'sim_pm_pt_pre', 'sim_pm_pt_init', 'sim_pm_pt_plan', 'sim_pm_pt_exec', 'sim_pm_pt_mon', 'sim_pm_pt_close',
    'sim_pm_dashboard', 'sim_pm_governance', 'sim_pm_delivery', 'sim_pm_controls', 'sim_pm_reporting'
  ];
BEGIN
  -- PMO Admin / System Admin — simulator PMO menus
  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN ('pmo_admin', 'PMO Admin', 'system_admin', 'System Admin', 'super_admin')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code = ANY(v_sim_pmo_codes)
      AND COALESCE(mi.is_deleted, FALSE) = FALSE
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Project Manager — simulator PM menus
  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN ('project_manager', 'Project Manager', 'programme_manager', 'portfolio_manager')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code = ANY(v_sim_pm_codes)
      AND COALESCE(mi.is_deleted, FALSE) = FALSE
    ON CONFLICT DO NOTHING;
  END LOOP;

  RAISE NOTICE 'v642_sim_menu_registry_role_menu_items.sql completed';
END $$;
