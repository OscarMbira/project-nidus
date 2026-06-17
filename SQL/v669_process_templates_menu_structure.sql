-- =============================================================================
-- v669: Process Templates sidebar structure — v629 PMBOK hub + Agile subsection
-- Fixes: template_library_* polluting Process Templates; missing Hub/5 groups;
--   adds Agile container (Backlogs, Sprint Planning, Story Map, etc.)
-- Prerequisites: v629, v666, v668
-- =============================================================================

DO $$
DECLARE
  v_pt UUID;
  v_agile UUID;
  v_knowledge UUID;
  v_role_id UUID;
  v_pt_codes TEXT[] := ARRAY[
    'pmo_process_templates_section',
    'pmo_pt_hub', 'pmo_pt_pre', 'pmo_pt_init', 'pmo_pt_plan',
    'pmo_pt_exec', 'pmo_pt_mon', 'pmo_pt_close',
    'pmo_pt_browse', 'pmo_pt_manage', 'pmo_pt_new',
    'pmo_pt_agile_section',
    'pmo_pt_product_backlog', 'pmo_pt_sprint_planning', 'pmo_pt_agile',
    'pmo_pt_story_map', 'pmo_pt_sprint_metrics', 'pmo_pt_releases', 'pmo_pt_roadmap',
    'pmo_industry_templates', 'pmo_industry_templates_new', 'pmo_industry_templates_on_hold'
  ];
BEGIN
  SELECT id INTO v_pt FROM public.menu_items WHERE menu_code = 'pmo_process_templates_section' LIMIT 1;
  SELECT id INTO v_knowledge FROM public.menu_items WHERE menu_code = 'pmo_section_knowledge' LIMIT 1;

  IF v_pt IS NULL THEN
    RAISE NOTICE 'v669 skipped — pmo_process_templates_section not found';
    RETURN;
  END IF;

  -- ── v629 PMBOK hub + template library shortcuts (canonical pmo_pt_* codes) ───
  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES
    ('pmo_pt_hub',   'Hub Overview',           'Process templates hub index', v_pt, 2,  1, '/pmo/process-templates',                         'layers',       TRUE, TRUE),
    ('pmo_pt_pre',   'Pre-Project',            'Business case, mandate, BRP', v_pt, 2,  2, '/pmo/process-templates/pre-project',             'file-text',    TRUE, TRUE),
    ('pmo_pt_init',  'Initiating',             'Initiating process group',    v_pt, 2,  3, '/pmo/process-templates/initiating',              'play-circle',  TRUE, TRUE),
    ('pmo_pt_plan',  'Planning',               'Planning process group',      v_pt, 2,  4, '/pmo/process-templates/planning',                'map',          TRUE, TRUE),
    ('pmo_pt_exec',  'Executing',              'Executing process group',     v_pt, 2,  5, '/pmo/process-templates/executing',               'zap',          TRUE, TRUE),
    ('pmo_pt_mon',   'Monitoring & Controlling', 'Monitoring process group', v_pt, 2,  6, '/pmo/process-templates/monitoring-controlling',  'activity',     TRUE, TRUE),
    ('pmo_pt_close', 'Closing',                'Closing process group',       v_pt, 2,  7, '/pmo/process-templates/closing',                 'check-circle', TRUE, TRUE),
    ('pmo_pt_browse', 'Browse Templates',      'Published master templates',  v_pt, 2, 20, '/platform/templates',                            'layers',       TRUE, TRUE),
    ('pmo_pt_manage', 'Manage Templates',      'PMO template administration', v_pt, 2, 21, '/platform/templates/manage',                     'settings-2',   TRUE, TRUE),
    ('pmo_pt_new',    'New Template',          'Create master template',      v_pt, 2, 22, '/platform/templates/new',                        'file-plus',    TRUE, TRUE)
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

  -- ── Agile subsection (predictive vs agile split per v629 hub + scrum routes) ─
  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES (
    'pmo_pt_agile_section', 'Agile', 'Agile / Scrum templates and backlogs', v_pt, 2, 30,
    NULL, 'activity', TRUE, TRUE
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    parent_menu_id = v_pt,
    sort_order = EXCLUDED.sort_order,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  SELECT id INTO v_agile FROM public.menu_items WHERE menu_code = 'pmo_pt_agile_section' LIMIT 1;

  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES
    ('pmo_pt_product_backlog',  'Product Backlog',   'Product backlog and user stories', v_agile, 3, 1, '/platform/projects/:projectId/scrum/product-backlog',  'list',         TRUE, TRUE),
    ('pmo_pt_sprint_planning',  'Sprint Planning',   'Plan sprint backlog',              v_agile, 3, 2, '/platform/projects/:projectId/scrum/sprint-planning',  'calendar',     TRUE, TRUE),
    ('pmo_pt_agile',            'Agile Templates',   'DoD / DoR templates',              v_agile, 3, 3, '/platform/projects/:projectId/scrum/templates',        'list-checks',  TRUE, TRUE),
    ('pmo_pt_story_map',        'Story Map',         'User story map',                   v_agile, 3, 4, '/platform/projects/:projectId/scrum/story-map',        'map',          TRUE, TRUE),
    ('pmo_pt_sprint_metrics',   'Sprint Metrics',    'Velocity and burndown',            v_agile, 3, 5, '/platform/projects/:projectId/scrum/metrics',          'activity',     TRUE, TRUE),
    ('pmo_pt_releases',         'Releases',          'Agile releases',                   v_agile, 3, 6, '/platform/projects/:projectId/scrum/releases',           'git-merge',    TRUE, TRUE),
    ('pmo_pt_roadmap',          'Roadmap',           'Release roadmap',                  v_agile, 3, 7, '/platform/projects/:projectId/scrum/roadmap',          'compass',      TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    parent_menu_id = v_agile,
    route_path = EXCLUDED.route_path,
    sort_order = EXCLUDED.sort_order,
    menu_icon = EXCLUDED.menu_icon,
    is_visible = TRUE,
    is_active = TRUE,
    is_deleted = FALSE,
    updated_at = NOW();

  -- Industry templates (v659 — under Process Templates, not Projects)
  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES
    ('pmo_industry_templates',         'Industry Templates',     'PMO industry plan blueprints', v_pt, 2, 40, '/pmo/industry-templates',          'layers',       TRUE, TRUE),
    ('pmo_industry_templates_new',     'Add Industry Template',  'Create industry template',     v_pt, 2, 41, '/pmo/industry-templates/new',      'plus-circle',  TRUE, TRUE),
    ('pmo_industry_templates_on_hold', 'Template Drafts',        'Draft industry templates',     v_pt, 2, 42, '/pmo/industry-templates/on-hold',  'pause-circle', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    parent_menu_id = v_pt,
    route_path = EXCLUDED.route_path,
    sort_order = EXCLUDED.sort_order,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  -- Deactivate legacy v407 template_library duplicates (Categories/Drafts/Bulk/Notifications pollution)
  UPDATE public.menu_items
  SET is_active = FALSE, is_visible = FALSE, updated_at = NOW()
  WHERE menu_code IN (
    'template_library', 'template_library_browse', 'template_library_manage', 'template_library_new',
    'template_library_categories', 'template_library_project_copies', 'template_library_on_hold',
    'template_library_bulk', 'template_library_notifications', 'agile_templates'
  )
  AND EXISTS (SELECT 1 FROM public.menu_items x WHERE x.menu_code = 'pmo_pt_hub' AND x.is_active = TRUE)
  AND COALESCE(is_deleted, FALSE) = FALSE;

  -- Reparent surviving template_library hub under Knowledge & Assets (optional admin access)
  IF v_knowledge IS NOT NULL THEN
    UPDATE public.menu_items
    SET parent_menu_id = v_knowledge, menu_level = 2, updated_at = NOW()
    WHERE menu_code = 'template_library'
      AND is_active = FALSE
      AND COALESCE(is_deleted, FALSE) = FALSE;
  END IF;

  -- Role grants: full Process Templates tree for PMO Admin / System Admin
  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE LOWER(TRIM(role_name)) IN ('pmo_admin', 'system_admin', 'super_admin')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code = ANY(v_pt_codes)
      AND COALESCE(mi.is_deleted, FALSE) = FALSE
      AND mi.is_active = TRUE
    ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
      can_view = TRUE,
      can_use = TRUE,
      is_active = TRUE,
      is_deleted = FALSE,
      updated_at = NOW();
  END LOOP;

  RAISE NOTICE 'v669_process_templates_menu_structure.sql applied';
END $$;
