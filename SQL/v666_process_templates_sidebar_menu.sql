-- =============================================================================
-- v666: Process Templates sidebar — full v659/v629 structure + role grants
-- Restores Hub + 5 process groups + Browse/Manage/Agile/New + Industry Templates
-- Prerequisites: v629, v659, v577 (industry menu codes)
-- DB-only runtime: useMenu.js classifies these rows (no JS virtual injection)
-- =============================================================================

DO $$
DECLARE
  v_pt UUID;
  v_role_id UUID;
  v_pt_codes TEXT[] := ARRAY[
    'pmo_process_templates_section',
    'pmo_pt_hub', 'pmo_pt_pre', 'pmo_pt_init', 'pmo_pt_plan',
    'pmo_pt_exec', 'pmo_pt_mon', 'pmo_pt_close',
    'pmo_pt_browse', 'pmo_pt_manage', 'pmo_pt_agile', 'pmo_pt_new',
    'pmo_industry_templates', 'pmo_industry_templates_new', 'pmo_industry_templates_on_hold'
  ];
BEGIN
  SELECT id INTO v_pt FROM public.menu_items WHERE menu_code = 'pmo_process_templates_section' LIMIT 1;

  IF v_pt IS NULL THEN
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
      is_visible = TRUE,
      is_active = TRUE,
      is_deleted = FALSE,
      updated_at = NOW();

    SELECT id INTO v_pt FROM public.menu_items WHERE menu_code = 'pmo_process_templates_section' LIMIT 1;
  END IF;

  -- Ensure all process-group leaves exist under Process Templates section
  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES
    ('pmo_pt_hub',   'Hub Overview',           'Process templates hub', v_pt, 2, 1,  '/pmo/process-templates',                         'layers',       TRUE, TRUE),
    ('pmo_pt_pre',   'Pre-Project',            NULL, v_pt, 2, 2,  '/pmo/process-templates/pre-project',             'file-text',    TRUE, TRUE),
    ('pmo_pt_init',  'Initiating',             NULL, v_pt, 2, 3,  '/pmo/process-templates/initiating',              'play-circle',  TRUE, TRUE),
    ('pmo_pt_plan',  'Planning',               NULL, v_pt, 2, 4,  '/pmo/process-templates/planning',                'map',          TRUE, TRUE),
    ('pmo_pt_exec',  'Executing',              NULL, v_pt, 2, 5,  '/pmo/process-templates/executing',               'zap',          TRUE, TRUE),
    ('pmo_pt_mon',   'Monitoring & Control',   NULL, v_pt, 2, 6,  '/pmo/process-templates/monitoring-controlling',  'activity',     TRUE, TRUE),
    ('pmo_pt_close', 'Closing',                NULL, v_pt, 2, 7,  '/pmo/process-templates/closing',                 'check-circle', TRUE, TRUE),
    ('pmo_pt_browse', 'Browse Templates',      NULL, v_pt, 2, 8,  '/platform/templates',                            'layers',       TRUE, TRUE),
    ('pmo_pt_manage', 'Manage Templates',      NULL, v_pt, 2, 9,  '/platform/templates/manage',                     'settings-2',   TRUE, TRUE),
    ('pmo_pt_agile',  'Agile Templates',       NULL, v_pt, 2, 10, '/platform/projects/:projectId/scrum/templates',  'activity',     TRUE, TRUE),
    ('pmo_pt_new',    'New Template',          NULL, v_pt, 2, 11, '/platform/templates/new',                        'file-plus',    TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    parent_menu_id = v_pt,
    route_path = EXCLUDED.route_path,
    sort_order = EXCLUDED.sort_order,
    menu_icon = EXCLUDED.menu_icon,
    is_visible = TRUE,
    is_active = TRUE,
    is_deleted = FALSE,
    updated_at = NOW();

  -- Industry templates under Process Templates (v659 — moved from Projects)
  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES
    ('pmo_industry_templates',          'Industry Templates',     'PMO industry plan blueprints', v_pt, 2, 12, '/pmo/industry-templates',          'layers',       TRUE, TRUE),
    ('pmo_industry_templates_new',      'Add Industry Template',  'Create industry plan template', v_pt, 2, 13, '/pmo/industry-templates/new',      'plus-circle',  TRUE, TRUE),
    ('pmo_industry_templates_on_hold',  'Template Drafts',        'Draft industry templates',      v_pt, 2, 14, '/pmo/industry-templates/on-hold',  'pause-circle', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    parent_menu_id = v_pt,
    route_path = EXCLUDED.route_path,
    sort_order = EXCLUDED.sort_order,
    is_visible = TRUE,
    is_active = TRUE,
    is_deleted = FALSE,
    updated_at = NOW();

  -- Reparent any stray PT leaves that lost parent after rationalisation
  UPDATE public.menu_items SET parent_menu_id = v_pt, menu_level = 2, updated_at = NOW()
  WHERE menu_code = ANY(v_pt_codes)
    AND menu_code <> 'pmo_process_templates_section'
    AND COALESCE(is_deleted, FALSE) = FALSE;

  -- Deactivate legacy template_library duplicates when canonical pmo_pt_* exists
  UPDATE public.menu_items SET is_active = FALSE, is_visible = FALSE, updated_at = NOW()
  WHERE menu_code IN ('template_library_browse', 'template_library_manage', 'template_library_new', 'agile_templates')
    AND EXISTS (SELECT 1 FROM public.menu_items x WHERE x.menu_code = 'pmo_pt_browse' AND x.is_active = TRUE)
    AND COALESCE(is_deleted, FALSE) = FALSE;

  -- PMO Admin + System Admin: grant full Process Templates tree
  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN ('pmo_admin', 'PMO Admin', 'system_admin', 'System Admin', 'super_admin')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code = ANY(v_pt_codes)
      AND COALESCE(mi.is_active, TRUE) = TRUE
    ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
      can_view = TRUE,
      can_use = TRUE,
      is_active = TRUE,
      is_deleted = FALSE,
      updated_at = NOW();
  END LOOP;

  RAISE NOTICE 'v666_process_templates_sidebar_menu.sql applied';
END $$;

-- PM / Team Member process template sections (flat sidebars — not PMO categorised)
DO $$
DECLARE
  v_pm_role UUID;
  v_tm_role UUID;
BEGIN
  SELECT id INTO v_pm_role FROM public.roles
  WHERE role_name IN ('project_manager', 'Project Manager') AND COALESCE(is_active, TRUE) = TRUE LIMIT 1;

  IF v_pm_role IS NOT NULL THEN
    INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_pm_role, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code IN (
      'pm_process_templates_section',
      'pm_pt_hub', 'pm_pt_pre', 'pm_pt_init', 'pm_pt_plan', 'pm_pt_exec', 'pm_pt_mon', 'pm_pt_close'
    )
    ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
      can_view = TRUE, can_use = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();
  END IF;

  SELECT id INTO v_tm_role FROM public.roles
  WHERE role_name IN ('team_member', 'Team Member', 'pm_team_member', 'team_lead', 'Team Lead', 'team_manager', 'Team Manager')
    AND COALESCE(is_active, TRUE) = TRUE LIMIT 1;

  IF v_tm_role IS NOT NULL THEN
    INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_tm_role, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code IN (
      'tm_section_process_templates',
      'tm_pt_all', 'tm_pt_pre', 'tm_pt_init', 'tm_pt_plan', 'tm_pt_exec', 'tm_pt_mon', 'tm_pt_close'
    )
    ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
      can_view = TRUE, can_use = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();
  END IF;
END $$;
