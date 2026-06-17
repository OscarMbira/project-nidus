-- v659: Sidebar menu rationalisation — Platform + Simulator PMO registry backfill
-- Idempotent ON CONFLICT (menu_code). Reparents misplaced DB rows via parent_menu_id.
-- Source: src/config/menuRegistry.js (Phases 2, 5, 6)
-- Note: menu_items has no category column — hierarchy uses parent_menu_id only.

-- =============================================================================
-- PART 1: Platform PMO — new sections and leaves
-- =============================================================================
DO $$
DECLARE
  v_gov UUID;
  v_oversight UUID;
  v_pt UUID;
  v_reporting UUID;
  v_email UUID;
  v_comms UUID;
  v_projects UUID;
BEGIN
  SELECT id INTO v_gov FROM public.menu_items WHERE menu_code = 'pmo_section_governance' LIMIT 1;
  SELECT id INTO v_oversight FROM public.menu_items WHERE menu_code = 'pmo_section_oversight' LIMIT 1;
  SELECT id INTO v_pt FROM public.menu_items WHERE menu_code = 'pmo_process_templates_section' LIMIT 1;

  -- EEF under Governance
  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES
    ('pmo_gov_eef_list',   'Environment Factors', NULL, v_gov, 2, 9,  '/platform/eef',          'package-open', TRUE, TRUE),
    ('pmo_gov_eef_new',    'Add EEF',             NULL, v_gov, 2, 10, '/platform/eef/new',      'file-plus',    TRUE, TRUE),
    ('pmo_gov_eef_drafts', 'EEF Drafts',          NULL, v_gov, 2, 11, '/platform/eef/on-hold',  'pause',        TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    parent_menu_id = EXCLUDED.parent_menu_id,
    route_path = EXCLUDED.route_path,
    sort_order = EXCLUDED.sort_order,
    menu_icon = EXCLUDED.menu_icon,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  -- Process template management under Process Templates
  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES
    ('pmo_pt_browse', 'Browse Templates', NULL, v_pt, 2, 8,  '/platform/templates',                              'layers',     TRUE, TRUE),
    ('pmo_pt_manage', 'Manage Templates', NULL, v_pt, 2, 9,  '/platform/templates/manage',                       'settings-2', TRUE, TRUE),
    ('pmo_pt_agile',  'Agile Templates',  NULL, v_pt, 2, 10, '/platform/projects/:projectId/scrum/templates',    'activity',   TRUE, TRUE),
    ('pmo_pt_new',    'New Template',     NULL, v_pt, 2, 11, '/platform/templates/new',                          'file-plus',  TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    parent_menu_id = EXCLUDED.parent_menu_id,
    route_path = EXCLUDED.route_path,
    sort_order = EXCLUDED.sort_order,
    menu_icon = EXCLUDED.menu_icon,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  -- Change Register under Oversight
  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES
    ('pmo_oversight_changes', 'Change Register (All)', NULL, v_oversight, 2, 9, '/pmo/registers/changes', 'refresh-ccw', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    parent_menu_id = EXCLUDED.parent_menu_id,
    route_path = EXCLUDED.route_path,
    sort_order = EXCLUDED.sort_order,
    menu_icon = EXCLUDED.menu_icon,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  -- Reporting & Assurance section
  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES (
    'pmo_section_reporting',
    'Reporting & Assurance',
    'Cross-project assurance and analytics reports',
    NULL, 1, 90,
    NULL, 'bar-chart-3', TRUE, TRUE
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  SELECT id INTO v_reporting FROM public.menu_items WHERE menu_code = 'pmo_section_reporting' LIMIT 1;

  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES
    ('pmo_report_lessons',        'Lessons Report',  NULL, v_reporting, 2, 5, '/pm/closure/lessons-report',                        'graduation-cap', TRUE, TRUE),
    ('pmo_report_sprint_metrics', 'Sprint Metrics',  NULL, v_reporting, 2, 6, '/platform/projects/:projectId/scrum/metrics',       'activity',       TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    parent_menu_id = EXCLUDED.parent_menu_id,
    route_path = EXCLUDED.route_path,
    sort_order = EXCLUDED.sort_order,
    menu_icon = EXCLUDED.menu_icon,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  -- Email & Notifications + Communications sub-group
  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES (
    'pmo_section_email',
    'Email & Notifications',
    'Email settings and communications hub',
    NULL, 1, 95,
    NULL, 'mail', TRUE, TRUE
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  SELECT id INTO v_email FROM public.menu_items WHERE menu_code = 'pmo_section_email' LIMIT 1;

  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES (
    'pmo_comms_section',
    'Communications',
    'Messages, direct messages, and meetings',
    v_email, 2, 5,
    NULL, 'message-square', TRUE, TRUE
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    parent_menu_id = EXCLUDED.parent_menu_id,
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  SELECT id INTO v_comms FROM public.menu_items WHERE menu_code = 'pmo_comms_section' LIMIT 1;

  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES
    ('pmo_comms_messages', 'Messages',        NULL, v_comms, 3, 1, '/platform/comms/messages', 'message-square', TRUE, TRUE),
    ('pmo_comms_direct',   'Direct Messages', NULL, v_comms, 3, 2, '/platform/comms/direct',   'message-square', TRUE, TRUE),
    ('pmo_comms_meetings', 'Meetings',        NULL, v_comms, 3, 3, '/platform/comms/meetings', 'clipboard-list', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    parent_menu_id = EXCLUDED.parent_menu_id,
    route_path = EXCLUDED.route_path,
    sort_order = EXCLUDED.sort_order,
    menu_icon = EXCLUDED.menu_icon,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  -- Story Map under Projects (Delivery Management)
  SELECT id INTO v_projects
  FROM public.menu_items
  WHERE menu_code IN ('pmo_projects_section', 'pmo_section_projects', 'pmo_pp_section')
  ORDER BY CASE menu_code WHEN 'pmo_projects_section' THEN 0 ELSE 1 END
  LIMIT 1;

  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES (
    'pmo_delivery_story_map',
    'Story Map',
    'User story map for agile delivery',
    v_projects,
    CASE WHEN v_projects IS NULL THEN 1 ELSE 2 END,
    10,
    '/platform/projects/:projectId/scrum/story-map',
    'map',
    TRUE,
    TRUE
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    parent_menu_id = COALESCE(EXCLUDED.parent_menu_id, menu_items.parent_menu_id),
    route_path = EXCLUDED.route_path,
    sort_order = EXCLUDED.sort_order,
    menu_icon = EXCLUDED.menu_icon,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  RAISE NOTICE 'v659 Part 1: Platform PMO menu items upserted';
END $$;

-- =============================================================================
-- PART 2: Simulator PMO — new sections and leaves
-- =============================================================================
DO $$
DECLARE
  v_gov UUID;
  v_oversight UUID;
  v_pt UUID;
  v_planning UUID;
  v_reporting UUID;
  v_email UUID;
  v_admin UUID;
BEGIN
  SELECT id INTO v_gov FROM public.menu_items WHERE menu_code = 'sim_pmo_section_governance' LIMIT 1;
  SELECT id INTO v_oversight FROM public.menu_items WHERE menu_code = 'sim_pmo_section_oversight' LIMIT 1;
  SELECT id INTO v_pt FROM public.menu_items WHERE menu_code = 'sim_pmo_process_templates_section' LIMIT 1;

  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES
    ('sim_pmo_pt_browse', 'Browse Templates', NULL, v_pt, 2, 8,  '/simulator/pmo/templates/browse', 'layers',     TRUE, TRUE),
    ('sim_pmo_pt_manage', 'Manage Templates', NULL, v_pt, 2, 9,  '/simulator/pmo/templates/manage', 'settings-2', TRUE, TRUE),
    ('sim_pmo_pt_agile',  'Agile Templates',  NULL, v_pt, 2, 10, '/simulator/pmo/templates/agile',  'activity',   TRUE, TRUE),
    ('sim_pmo_pt_new',    'New Template',     NULL, v_pt, 2, 11, '/simulator/pmo/templates/new',    'file-plus',  TRUE, TRUE)
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
  ) VALUES
    ('sim_pmo_oversight_changes', 'Change Register (All)', NULL, v_oversight, 2, 9, '/simulator/pmo/registers/changes', 'refresh-ccw', TRUE, TRUE)
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
  ) VALUES
    ('sim_pmo_gov_eef_list',   'Environment Factors', NULL, v_gov, 2, 8,  '/simulator/pmo/eef',          'package-open', TRUE, TRUE),
    ('sim_pmo_gov_eef_new',    'Add EEF',             NULL, v_gov, 2, 9,  '/simulator/pmo/eef/new',      'file-plus',    TRUE, TRUE),
    ('sim_pmo_gov_eef_drafts', 'EEF Drafts',          NULL, v_gov, 2, 10, '/simulator/pmo/eef/on-hold',  'pause',        TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    parent_menu_id = EXCLUDED.parent_menu_id,
    route_path = EXCLUDED.route_path,
    sort_order = EXCLUDED.sort_order,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  -- Planning Intelligence
  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES (
    'sim_pmo_section_planning', 'Planning Intelligence', 'Practice planning hub and rules', NULL, 1, 72, NULL, 'bar-chart-3', TRUE, TRUE
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  SELECT id INTO v_planning FROM public.menu_items WHERE menu_code = 'sim_pmo_section_planning' LIMIT 1;

  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES
    ('sim_pmo_planning_hub',              'Planning Hub',            NULL, v_planning, 2, 1, '/simulator/pmo/planning',                    'layout-dashboard', TRUE, TRUE),
    ('sim_pmo_planning_intelligence',     'Intelligence Rules',      NULL, v_planning, 2, 2, '/simulator/pmo/planning/intelligence',       'search-code',      TRUE, TRUE),
    ('sim_pmo_planning_governance_config','Governance Rules Config', NULL, v_planning, 2, 3, '/simulator/pmo/planning/governance-config', 'shield-check',     TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    parent_menu_id = EXCLUDED.parent_menu_id,
    route_path = EXCLUDED.route_path,
    sort_order = EXCLUDED.sort_order,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  -- Reporting & Assurance (replaces legacy sim_pmo_reporting single-link row as container)
  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES (
    'sim_pmo_section_reporting', 'Reporting & Assurance', 'Practice assurance reports and analytics', NULL, 1, 90, NULL, 'bar-chart-3', TRUE, TRUE
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    route_path = NULL,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  UPDATE public.menu_items SET route_path = NULL, updated_at = NOW()
  WHERE menu_code = 'sim_pmo_reporting';

  SELECT id INTO v_reporting FROM public.menu_items WHERE menu_code = 'sim_pmo_section_reporting' LIMIT 1;

  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES
    ('sim_pmo_report_highlight',      'Practice Highlight Reports',   NULL, v_reporting, 2, 1, '/simulator/pmo/reporting/highlight-reports',   'flag',           TRUE, TRUE),
    ('sim_pmo_report_exception',    'Practice Exception Reports',   NULL, v_reporting, 2, 2, '/simulator/pmo/reporting/exception-reports', 'file-warning',   TRUE, TRUE),
    ('sim_pmo_report_end_stage',    'Practice End Stage Reports',   NULL, v_reporting, 2, 3, '/simulator/pmo/reporting/end-stage-reports',   'file-clock',     TRUE, TRUE),
    ('sim_pmo_report_end_project',  'Practice End Project Reports', NULL, v_reporting, 2, 4, '/simulator/pmo/reporting/end-project-reports', 'file-check',     TRUE, TRUE),
    ('sim_pmo_report_lessons',      'Practice Lessons Report',      NULL, v_reporting, 2, 5, '/simulator/pmo/reporting/lessons-report',    'graduation-cap', TRUE, TRUE),
    ('sim_pmo_report_sprint_metrics','Sprint Metrics',              NULL, v_reporting, 2, 6, '/simulator/pmo/reporting/sprint-metrics',    'activity',       TRUE, TRUE),
    ('sim_pmo_report_library',      'Report Library',               NULL, v_reporting, 2, 7, '/simulator/reports',                           'file-text',      TRUE, TRUE),
    ('sim_pmo_report_analytics',    'Analytics',                    NULL, v_reporting, 2, 8, '/simulator/reports/analytics',                 'bar-chart-3',    TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    parent_menu_id = EXCLUDED.parent_menu_id,
    route_path = EXCLUDED.route_path,
    sort_order = EXCLUDED.sort_order,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  -- Email & Notifications
  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES (
    'sim_pmo_section_email', 'Email & Notifications', 'Practice email settings and communications', NULL, 1, 95, NULL, 'mail', TRUE, TRUE
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  SELECT id INTO v_email FROM public.menu_items WHERE menu_code = 'sim_pmo_section_email' LIMIT 1;

  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES
    ('sim_pmo_email_settings',             'Email Settings',       NULL, v_email, 2, 1, '/simulator/pmo/admin/email-settings',        'mail',      TRUE, TRUE),
    ('sim_pmo_email_sender_profiles',      'Sender Profiles',      NULL, v_email, 2, 2, '/simulator/pmo/admin/email-sender-profiles', 'at-sign',   TRUE, TRUE),
    ('sim_pmo_email_invitation_templates', 'Invitation Templates', NULL, v_email, 2, 3, '/simulator/settings/invitation-templates',   'file-text', TRUE, TRUE),
    ('sim_pmo_email_invitation_expiry',    'Invitation Expiry',    NULL, v_email, 2, 4, '/simulator/pmo/admin/invitation-settings',   'clock',     TRUE, TRUE),
    ('sim_pmo_comms_messages',             'Messages',             NULL, v_email, 2, 5, '/simulator/comms/messages',                  'message-square', TRUE, TRUE),
    ('sim_pmo_comms_direct',               'Direct Messages',      NULL, v_email, 2, 6, '/simulator/comms/direct',                    'message-square', TRUE, TRUE),
    ('sim_pmo_comms_meetings',             'Meetings',             NULL, v_email, 2, 7, '/simulator/comms/meetings',                  'clipboard-list', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    parent_menu_id = EXCLUDED.parent_menu_id,
    route_path = EXCLUDED.route_path,
    sort_order = EXCLUDED.sort_order,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  -- Administration
  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES (
    'sim_pmo_section_admin', 'Administration', 'Practice PMO administration', NULL, 1, 100, NULL, 'settings-2', TRUE, TRUE
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  SELECT id INTO v_admin FROM public.menu_items WHERE menu_code = 'sim_pmo_section_admin' LIMIT 1;

  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES
    ('sim_pmo_admin_local_data',       'Local Data Extensions', NULL, v_admin, 2, 1,  '/simulator/local-data-extensions',           'database',    TRUE, TRUE),
    ('sim_pmo_admin_form_templates',   'Form Templates',        NULL, v_admin, 2, 2,  '/simulator/pmo/admin/form-templates',        'file-text',   TRUE, TRUE),
    ('sim_pmo_admin_org_settings',     'Organisation Settings', NULL, v_admin, 2, 3,  '/simulator/pmo/admin/settings',              'settings-2',  TRUE, TRUE),
    ('sim_pmo_admin_users',            'User Management',       NULL, v_admin, 2, 4,  '/simulator/pmo/admin/users',                 'shield',      TRUE, TRUE),
    ('sim_pmo_admin_role_menu_access', 'Role Menu Access',      NULL, v_admin, 2, 5,  '/simulator/pmo/role-menu-access',            'shield-check',TRUE, TRUE),
    ('sim_pmo_admin_project_types',    'Project Types',         NULL, v_admin, 2, 6,  '/simulator/pmo/admin/project-types',         'layers',      TRUE, TRUE),
    ('sim_pmo_admin_funding_sources',  'Funding Sources',       NULL, v_admin, 2, 7,  '/simulator/pmo/admin/funding-sources',       'dollar-sign', TRUE, TRUE),
    ('sim_pmo_admin_budget_categories','Budget Categories',     NULL, v_admin, 2, 8,  '/simulator/pmo/admin/budget-categories',     'dollar-sign', TRUE, TRUE),
    ('sim_pmo_admin_subscription',     'Subscription',          NULL, v_admin, 2, 9,  '/simulator/pmo/admin/subscription',          'settings-2',  TRUE, TRUE),
    ('sim_pmo_admin_branding',         'Branding',              NULL, v_admin, 2, 10, '/simulator/pmo/admin/branding',              'settings-2',  TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    parent_menu_id = EXCLUDED.parent_menu_id,
    route_path = EXCLUDED.route_path,
    sort_order = EXCLUDED.sort_order,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  RAISE NOTICE 'v659 Part 2: Simulator PMO menu items upserted';
END $$;

-- =============================================================================
-- PART 3: Reparent misplaced items (parent_menu_id only — no category column)
-- =============================================================================
DO $$
DECLARE
  v_init UUID;
  v_gov UUID;
  v_pt UUID;
  v_reporting UUID;
  v_comms UUID;
  v_projects UUID;
BEGIN
  SELECT id INTO v_init FROM public.menu_items WHERE menu_code = 'pmo_section_initiation' LIMIT 1;
  SELECT id INTO v_gov FROM public.menu_items WHERE menu_code = 'pmo_section_governance' LIMIT 1;
  SELECT id INTO v_pt FROM public.menu_items WHERE menu_code = 'pmo_process_templates_section' LIMIT 1;
  SELECT id INTO v_reporting FROM public.menu_items WHERE menu_code = 'pmo_section_reporting' LIMIT 1;
  SELECT id INTO v_comms FROM public.menu_items WHERE menu_code = 'pmo_comms_section' LIMIT 1;

  SELECT id INTO v_projects
  FROM public.menu_items
  WHERE menu_code IN ('pmo_projects_section', 'pmo_section_projects', 'pmo_pp_section')
  ORDER BY CASE menu_code WHEN 'pmo_projects_section' THEN 0 ELSE 1 END
  LIMIT 1;

  -- EEF: org_knowledge_* → Governance
  IF v_gov IS NOT NULL THEN
    UPDATE public.menu_items SET parent_menu_id = v_gov, menu_level = 2, updated_at = NOW()
    WHERE menu_code IN ('org_knowledge_eef', 'org_knowledge_eef_new', 'org_knowledge_eef_drafts', 'org_knowledge_eef_bulk')
      AND COALESCE(is_deleted, FALSE) = FALSE;
  END IF;

  -- Templates: template_library_* + agile_templates → Process Templates
  IF v_pt IS NOT NULL THEN
    UPDATE public.menu_items SET parent_menu_id = v_pt, menu_level = 2, updated_at = NOW()
    WHERE menu_code IN ('template_library_browse', 'template_library_manage', 'template_library_new', 'agile_templates')
      AND COALESCE(is_deleted, FALSE) = FALSE;
  END IF;

  -- Reporting: sprint metrics + lessons/end-project if under initiation
  IF v_reporting IS NOT NULL THEN
    UPDATE public.menu_items SET parent_menu_id = v_reporting, menu_level = 2, updated_at = NOW()
    WHERE menu_code IN ('agile_sprint_metrics', 'pmo_report_sprint_metrics', 'pmo_report_lessons', 'pm_closure_lessons_report')
      AND COALESCE(is_deleted, FALSE) = FALSE;

    UPDATE public.menu_items SET parent_menu_id = v_reporting, menu_level = 2, updated_at = NOW()
    WHERE menu_code IN ('report_end_project_pmo', 'pm_reports_end_project', 'pm_closure_end_project_report')
      AND parent_menu_id = v_init
      AND COALESCE(is_deleted, FALSE) = FALSE;
  END IF;

  -- Communications → Email sub-group
  IF v_comms IS NOT NULL THEN
    UPDATE public.menu_items SET parent_menu_id = v_comms, menu_level = 3, updated_at = NOW()
    WHERE menu_code IN ('comms_messages', 'comms_direct', 'comms_meetings', 'pmo_comms_messages', 'pmo_comms_direct', 'pmo_comms_meetings')
      AND COALESCE(is_deleted, FALSE) = FALSE;
  END IF;

  -- Story map → Projects (Delivery)
  IF v_projects IS NOT NULL THEN
    UPDATE public.menu_items SET parent_menu_id = v_projects, menu_level = 2, updated_at = NOW()
    WHERE menu_code IN ('agile_story_map', 'pmo_delivery_story_map')
      AND COALESCE(is_deleted, FALSE) = FALSE;
  END IF;

  -- Any initiation orphans from section 1F audit
  IF v_init IS NOT NULL AND v_gov IS NOT NULL THEN
    UPDATE public.menu_items SET parent_menu_id = v_gov, menu_level = 2, updated_at = NOW()
    WHERE parent_menu_id = v_init
      AND menu_code IN ('org_knowledge_eef', 'org_knowledge_eef_new', 'org_knowledge_eef_drafts', 'org_knowledge_eef_bulk', 'pmo_gov_eef_list', 'pmo_gov_eef_new', 'pmo_gov_eef_drafts')
      AND COALESCE(is_deleted, FALSE) = FALSE;
  END IF;

  IF v_init IS NOT NULL AND v_pt IS NOT NULL THEN
    UPDATE public.menu_items SET parent_menu_id = v_pt, menu_level = 2, updated_at = NOW()
    WHERE parent_menu_id = v_init
      AND menu_code IN ('template_library_browse', 'template_library_manage', 'template_library_new', 'agile_templates', 'pmo_pt_browse', 'pmo_pt_manage', 'pmo_pt_agile', 'pmo_pt_new')
      AND COALESCE(is_deleted, FALSE) = FALSE;
  END IF;

  IF v_init IS NOT NULL AND v_reporting IS NOT NULL THEN
    UPDATE public.menu_items SET parent_menu_id = v_reporting, menu_level = 2, updated_at = NOW()
    WHERE parent_menu_id = v_init
      AND menu_code IN ('agile_sprint_metrics', 'pmo_report_lessons', 'pmo_report_sprint_metrics', 'pm_closure_lessons_report', 'report_end_project_pmo')
      AND COALESCE(is_deleted, FALSE) = FALSE;
  END IF;

  IF v_init IS NOT NULL AND v_comms IS NOT NULL THEN
    UPDATE public.menu_items SET parent_menu_id = v_comms, menu_level = 3, updated_at = NOW()
    WHERE parent_menu_id = v_init
      AND menu_code IN ('comms_messages', 'comms_direct', 'comms_meetings', 'pmo_comms_messages', 'pmo_comms_direct', 'pmo_comms_meetings')
      AND COALESCE(is_deleted, FALSE) = FALSE;
  END IF;

  IF v_init IS NOT NULL AND v_projects IS NOT NULL THEN
    UPDATE public.menu_items SET parent_menu_id = v_projects, menu_level = 2, updated_at = NOW()
    WHERE parent_menu_id = v_init
      AND menu_code IN ('agile_story_map', 'pmo_delivery_story_map')
      AND COALESCE(is_deleted, FALSE) = FALSE;
  END IF;

  RAISE NOTICE 'v659 Part 3: Misplaced menu items reparented';
END $$;

-- =============================================================================
-- PART 4: Deactivate duplicate RFP admin entries (Procurement is canonical)
-- =============================================================================
UPDATE public.menu_items
SET is_active = FALSE, is_visible = FALSE, updated_at = NOW()
WHERE menu_code LIKE 'pmo_admin_rfp%'
  AND COALESCE(is_deleted, FALSE) = FALSE;

-- =============================================================================
-- PART 5: role_menu_items for pmo_admin and system_admin
-- =============================================================================
DO $$
DECLARE
  v_role_id UUID;
  v_pmo_codes TEXT[] := ARRAY[
    'pmo_gov_eef_list', 'pmo_gov_eef_new', 'pmo_gov_eef_drafts',
    'pmo_pt_browse', 'pmo_pt_manage', 'pmo_pt_agile', 'pmo_pt_new',
    'pmo_oversight_changes',
    'pmo_section_reporting', 'pmo_report_lessons', 'pmo_report_sprint_metrics',
    'pmo_section_email', 'pmo_comms_section', 'pmo_comms_messages', 'pmo_comms_direct', 'pmo_comms_meetings',
    'pmo_delivery_story_map'
  ];
  v_sim_codes TEXT[] := ARRAY[
    'sim_pmo_pt_browse', 'sim_pmo_pt_manage', 'sim_pmo_pt_agile', 'sim_pmo_pt_new',
    'sim_pmo_oversight_changes',
    'sim_pmo_gov_eef_list', 'sim_pmo_gov_eef_new', 'sim_pmo_gov_eef_drafts',
    'sim_pmo_section_planning', 'sim_pmo_planning_hub', 'sim_pmo_planning_intelligence', 'sim_pmo_planning_governance_config',
    'sim_pmo_section_reporting',
    'sim_pmo_report_highlight', 'sim_pmo_report_exception', 'sim_pmo_report_end_stage', 'sim_pmo_report_end_project',
    'sim_pmo_report_lessons', 'sim_pmo_report_sprint_metrics', 'sim_pmo_report_library', 'sim_pmo_report_analytics',
    'sim_pmo_section_email',
    'sim_pmo_email_settings', 'sim_pmo_email_sender_profiles', 'sim_pmo_email_invitation_templates', 'sim_pmo_email_invitation_expiry',
    'sim_pmo_comms_messages', 'sim_pmo_comms_direct', 'sim_pmo_comms_meetings',
    'sim_pmo_section_admin',
    'sim_pmo_admin_local_data', 'sim_pmo_admin_form_templates', 'sim_pmo_admin_org_settings', 'sim_pmo_admin_users',
    'sim_pmo_admin_role_menu_access', 'sim_pmo_admin_project_types', 'sim_pmo_admin_funding_sources', 'sim_pmo_admin_budget_categories',
    'sim_pmo_admin_subscription', 'sim_pmo_admin_branding'
  ];
BEGIN
  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN ('pmo_admin', 'PMO Admin', 'system_admin', 'System Admin', 'super_admin')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code = ANY(v_pmo_codes || v_sim_codes)
      AND COALESCE(mi.is_deleted, FALSE) = FALSE
      AND mi.is_active = TRUE
    ON CONFLICT DO NOTHING;
  END LOOP;

  RAISE NOTICE 'v659 Part 5: role_menu_items seeded for PMO Admin / System Admin';
END $$;

DO $$
BEGIN
  RAISE NOTICE 'v659_sidebar_menu_rationalisation.sql completed';
END $$;
