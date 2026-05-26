-- =============================================================================
-- v635_sim_process_templates_sidebar_menu.sql
-- Simulator PMO + PM Process Templates sidebar menu_items (DB parity with Platform v629)
-- Run after v629_process_templates_new_tables.sql
-- =============================================================================

DO $$
DECLARE
  v_sim_pmo_parent UUID;
  v_sim_pm_parent UUID;
  v_role_id UUID;
BEGIN
  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES (
    'sim_pmo_process_templates_section',
    'Process Templates',
    'Simulator PMO — PMBOK process templates hub',
    NULL, 1, 75,
    NULL, 'layers', TRUE, TRUE
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    menu_description = EXCLUDED.menu_description,
    sort_order = EXCLUDED.sort_order,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  SELECT id INTO v_sim_pmo_parent FROM public.menu_items WHERE menu_code = 'sim_pmo_process_templates_section' LIMIT 1;

  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES
    ('sim_pmo_pt_hub',   'Hub Overview',         NULL, v_sim_pmo_parent, 2, 1, '/simulator/pmo/process-templates',                        'layers',       TRUE, TRUE),
    ('sim_pmo_pt_pre',   'Pre-Project',          NULL, v_sim_pmo_parent, 2, 2, '/simulator/pmo/process-templates/pre-project',            'file-text',    TRUE, TRUE),
    ('sim_pmo_pt_init',  'Initiating',           NULL, v_sim_pmo_parent, 2, 3, '/simulator/pmo/process-templates/initiating',             'play-circle',  TRUE, TRUE),
    ('sim_pmo_pt_plan',  'Planning',             NULL, v_sim_pmo_parent, 2, 4, '/simulator/pmo/process-templates/planning',               'map',          TRUE, TRUE),
    ('sim_pmo_pt_exec',  'Executing',            NULL, v_sim_pmo_parent, 2, 5, '/simulator/pmo/process-templates/executing',                'zap',          TRUE, TRUE),
    ('sim_pmo_pt_mon',   'Monitoring & Control', NULL, v_sim_pmo_parent, 2, 6, '/simulator/pmo/process-templates/monitoring-controlling',   'activity',     TRUE, TRUE),
    ('sim_pmo_pt_close', 'Closing',              NULL, v_sim_pmo_parent, 2, 7, '/simulator/pmo/process-templates/closing',                  'check-circle', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    parent_menu_id = EXCLUDED.parent_menu_id,
    route_path = EXCLUDED.route_path,
    sort_order = EXCLUDED.sort_order,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES (
    'sim_pm_process_templates_section',
    'Process Templates',
    'Simulator PM — view masters and copy to practice workspace',
    NULL, 1, 145,
    NULL, 'layers', TRUE, TRUE
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  SELECT id INTO v_sim_pm_parent FROM public.menu_items WHERE menu_code = 'sim_pm_process_templates_section' LIMIT 1;

  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES
    ('sim_pm_pt_hub',   'Hub Overview',         NULL, v_sim_pm_parent, 2, 1, '/simulator/pm/process-templates',                        'layers',       TRUE, TRUE),
    ('sim_pm_pt_pre',   'Pre-Project',          NULL, v_sim_pm_parent, 2, 2, '/simulator/pm/process-templates/pre-project',            'file-text',    TRUE, TRUE),
    ('sim_pm_pt_init',  'Initiating',           NULL, v_sim_pm_parent, 2, 3, '/simulator/pm/process-templates/initiating',             'play-circle',  TRUE, TRUE),
    ('sim_pm_pt_plan',  'Planning',             NULL, v_sim_pm_parent, 2, 4, '/simulator/pm/process-templates/planning',               'map',          TRUE, TRUE),
    ('sim_pm_pt_exec',  'Executing',            NULL, v_sim_pm_parent, 2, 5, '/simulator/pm/process-templates/executing',                'zap',          TRUE, TRUE),
    ('sim_pm_pt_mon',   'Monitoring & Control', NULL, v_sim_pm_parent, 2, 6, '/simulator/pm/process-templates/monitoring-controlling',   'activity',     TRUE, TRUE),
    ('sim_pm_pt_close', 'Closing',              NULL, v_sim_pm_parent, 2, 7, '/simulator/pm/process-templates/closing',                  'check-circle', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    parent_menu_id = EXCLUDED.parent_menu_id,
    route_path = EXCLUDED.route_path,
    sort_order = EXCLUDED.sort_order,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN ('pmo_admin', 'PMO Admin', 'system_admin', 'System Admin')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code IN (
      'sim_pmo_process_templates_section',
      'sim_pmo_pt_hub', 'sim_pmo_pt_pre', 'sim_pmo_pt_init', 'sim_pmo_pt_plan',
      'sim_pmo_pt_exec', 'sim_pmo_pt_mon', 'sim_pmo_pt_close'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN ('project_manager', 'Project Manager')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code IN (
      'sim_pm_process_templates_section',
      'sim_pm_pt_hub', 'sim_pm_pt_pre', 'sim_pm_pt_init', 'sim_pm_pt_plan',
      'sim_pm_pt_exec', 'sim_pm_pt_mon', 'sim_pm_pt_close'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

END $$;
