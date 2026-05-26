-- v629: Process Templates — sidebar menu_items + role_menu_items
-- Platform PMO (DB sidebar), PM, and Team Member menus
-- Run after v629_process_templates_new_tables.sql (optional — useMenu also injects virtual items)

DO $$
DECLARE
  v_pmo_parent UUID;
  v_pm_parent UUID;
  v_tm_parent UUID;
  v_role_id UUID;
BEGIN
  -- PMO Admin / platform PMO sidebar section
  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES (
    'pmo_process_templates_section',
    'Process Templates',
    'PMBOK-aligned process templates hub (Pre-Project + 5 process groups)',
    NULL, 1, 75,
    NULL, 'layers', TRUE, TRUE
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    menu_description = EXCLUDED.menu_description,
    sort_order = EXCLUDED.sort_order,
    menu_icon = EXCLUDED.menu_icon,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  SELECT id INTO v_pmo_parent FROM public.menu_items WHERE menu_code = 'pmo_process_templates_section' LIMIT 1;

  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES
    ('pmo_pt_hub',   'Hub Overview',           NULL, v_pmo_parent, 2, 1, '/pmo/process-templates',                         'layers',       TRUE, TRUE),
    ('pmo_pt_pre',   'Pre-Project',            NULL, v_pmo_parent, 2, 2, '/pmo/process-templates/pre-project',             'file-text',    TRUE, TRUE),
    ('pmo_pt_init',  'Initiating',             NULL, v_pmo_parent, 2, 3, '/pmo/process-templates/initiating',              'play-circle',  TRUE, TRUE),
    ('pmo_pt_plan',  'Planning',               NULL, v_pmo_parent, 2, 4, '/pmo/process-templates/planning',                'map',          TRUE, TRUE),
    ('pmo_pt_exec',  'Executing',              NULL, v_pmo_parent, 2, 5, '/pmo/process-templates/executing',               'zap',          TRUE, TRUE),
    ('pmo_pt_mon',   'Monitoring & Control',   NULL, v_pmo_parent, 2, 6, '/pmo/process-templates/monitoring-controlling',  'activity',     TRUE, TRUE),
    ('pmo_pt_close', 'Closing',                NULL, v_pmo_parent, 2, 7, '/pmo/process-templates/closing',                 'check-circle', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    parent_menu_id = EXCLUDED.parent_menu_id,
    route_path = EXCLUDED.route_path,
    sort_order = EXCLUDED.sort_order,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  -- PM sidebar section
  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES (
    'pm_process_templates_section',
    'Process Templates',
    'View master templates and copy to your workspace',
    NULL, 1, 145,
    NULL, 'layers', TRUE, TRUE
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  SELECT id INTO v_pm_parent FROM public.menu_items WHERE menu_code = 'pm_process_templates_section' LIMIT 1;

  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES
    ('pm_pt_hub',   'Hub Overview',           NULL, v_pm_parent, 2, 1, '/pm/process-templates',                         'layers',       TRUE, TRUE),
    ('pm_pt_pre',   'Pre-Project',            NULL, v_pm_parent, 2, 2, '/pm/process-templates/pre-project',             'file-text',    TRUE, TRUE),
    ('pm_pt_init',  'Initiating',             NULL, v_pm_parent, 2, 3, '/pm/process-templates/initiating',              'play-circle',  TRUE, TRUE),
    ('pm_pt_plan',  'Planning',               NULL, v_pm_parent, 2, 4, '/pm/process-templates/planning',                'map',          TRUE, TRUE),
    ('pm_pt_exec',  'Executing',              NULL, v_pm_parent, 2, 5, '/pm/process-templates/executing',               'zap',          TRUE, TRUE),
    ('pm_pt_mon',   'Monitoring & Control',   NULL, v_pm_parent, 2, 6, '/pm/process-templates/monitoring-controlling',  'activity',     TRUE, TRUE),
    ('pm_pt_close', 'Closing',                NULL, v_pm_parent, 2, 7, '/pm/process-templates/closing',                 'check-circle', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    parent_menu_id = EXCLUDED.parent_menu_id,
    route_path = EXCLUDED.route_path,
    sort_order = EXCLUDED.sort_order,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  -- Team Member section
  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES (
    'tm_section_process_templates',
    'Process Templates',
    'Read-only access to master templates with copy-and-edit workflow',
    NULL, 1, 65,
    NULL, 'layers', TRUE, TRUE
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  SELECT id INTO v_tm_parent FROM public.menu_items WHERE menu_code = 'tm_section_process_templates' LIMIT 1;

  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES
    ('tm_pt_all',   'All Process Templates',  NULL, v_tm_parent, 2, 1, '/pm/process-templates',                         'layers',       TRUE, TRUE),
    ('tm_pt_pre',   'Pre-Project',            NULL, v_tm_parent, 2, 2, '/pm/process-templates/pre-project',             'file-text',    TRUE, TRUE),
    ('tm_pt_init',  'Initiating',             NULL, v_tm_parent, 2, 3, '/pm/process-templates/initiating',              'play-circle',  TRUE, TRUE),
    ('tm_pt_plan',  'Planning',               NULL, v_tm_parent, 2, 4, '/pm/process-templates/planning',                'map',          TRUE, TRUE),
    ('tm_pt_exec',  'Executing',              NULL, v_tm_parent, 2, 5, '/pm/process-templates/executing',               'zap',          TRUE, TRUE),
    ('tm_pt_mon',   'Monitoring & Control',   NULL, v_tm_parent, 2, 6, '/pm/process-templates/monitoring-controlling',  'activity',     TRUE, TRUE),
    ('tm_pt_close', 'Closing',                NULL, v_tm_parent, 2, 7, '/pm/process-templates/closing',                 'check-circle', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    parent_menu_id = EXCLUDED.parent_menu_id,
    route_path = EXCLUDED.route_path,
    sort_order = EXCLUDED.sort_order,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  -- Assign to PMO Admin
  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN ('pmo_admin', 'PMO Admin', 'system_admin', 'System Admin', 'super_admin')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code IN (
      'pmo_process_templates_section',
      'pmo_pt_hub', 'pmo_pt_pre', 'pmo_pt_init', 'pmo_pt_plan', 'pmo_pt_exec', 'pmo_pt_mon', 'pmo_pt_close'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Assign to Project Manager
  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN ('project_manager', 'Project Manager')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code IN (
      'pm_process_templates_section',
      'pm_pt_hub', 'pm_pt_pre', 'pm_pt_init', 'pm_pt_plan', 'pm_pt_exec', 'pm_pt_mon', 'pm_pt_close'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Assign to Team Member / Team Manager / Team Lead
  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN (
      'team_member', 'Team Member', 'pm_team_member',
      'team_manager', 'Team Manager', 'team_lead', 'Team Lead'
    )
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code IN (
      'tm_section_process_templates',
      'tm_pt_all', 'tm_pt_pre', 'tm_pt_init', 'tm_pt_plan', 'tm_pt_exec', 'tm_pt_mon', 'tm_pt_close'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

END $$;
