-- v639: Role menu items for v638 registry backfill
-- Does not delete custom role_menu_items; ON CONFLICT DO NOTHING only.

DO $$
DECLARE
  v_role_id UUID;
  v_pmo_codes TEXT[] := ARRAY[
    'pmo_section_initiation',
    'pmo_init_business_case', 'pmo_init_project_brief', 'pmo_init_benefits_review_plan',
    'pmo_section_governance',
    'pmo_gov_mandate', 'pmo_gov_mandate_approval', 'pmo_gov_communication_strategy',
    'pmo_gov_configuration_strategy', 'pmo_gov_quality_strategy', 'pmo_gov_risk_strategy',
    'pmo_gov_itto_templates', 'pmo_gov_itto_drafts',
    'pmo_section_oversight',
    'pmo_oversight_risk_register', 'pmo_oversight_issue_register', 'pmo_oversight_quality_register',
    'pmo_oversight_lessons_log', 'pmo_oversight_delays', 'pmo_oversight_delay_templates',
    'pmo_oversight_scope', 'pmo_oversight_schedules',
    'pmo_process_templates_section',
    'pmo_pt_hub', 'pmo_pt_pre', 'pmo_pt_init', 'pmo_pt_plan', 'pmo_pt_exec', 'pmo_pt_mon', 'pmo_pt_close'
  ];
  v_pm_codes TEXT[] := ARRAY[
    'pm_section_initiation',
    'pm_init_business_case', 'pm_init_project_brief', 'pm_init_pid', 'pm_init_benefits_review_plan',
    'pm_process_templates_section',
    'pm_pt_hub', 'pm_pt_pre', 'pm_pt_init', 'pm_pt_plan', 'pm_pt_exec', 'pm_pt_mon', 'pm_pt_close'
  ];
BEGIN
  -- PMO Admin / System Admin
  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN ('pmo_admin', 'PMO Admin', 'system_admin', 'System Admin', 'super_admin')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code = ANY(v_pmo_codes)
      AND COALESCE(mi.is_deleted, FALSE) = FALSE
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Project Manager
  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN ('project_manager', 'Project Manager')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code = ANY(v_pm_codes)
      AND COALESCE(mi.is_deleted, FALSE) = FALSE
    ON CONFLICT DO NOTHING;
  END LOOP;

  RAISE NOTICE 'v639_menu_registry_role_menu_items.sql completed';
END $$;
