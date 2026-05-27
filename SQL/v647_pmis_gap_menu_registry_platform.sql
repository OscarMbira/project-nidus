-- v647: PMIS gap menu registry — Platform PM, PMO, and /platform/* routes
-- Idempotent ON CONFLICT (menu_code). Source: projectplan/v631_PMIS_Gap_Analysis_Implementation_Plan.md
-- GAP-02 and GAP-24 are top-nav/FAB — no menu_items rows.

DO $$
DECLARE
  v_pm_cal UUID; v_pm_auto UUID; v_pm_okr UUID; v_pm_res UUID; v_pm_set UUID;
  v_pm_proc UUID; v_pm_plan UUID; v_pm_dash UUID; v_pm_coll UUID; v_pm_int UUID;
  v_pmo_cal UUID; v_pmo_okr UUID; v_pmo_dash UUID; v_pmo_proc UUID; v_pmo_cfg UUID;
  v_pmo_res UUID; v_pmo_coll UUID;
  v_plat_okr UUID; v_plat_res UUID; v_plat_set UUID; v_plat_del UUID; v_plat_plan UUID;
  v_plat_proc UUID; v_plat_rep UUID; v_plat_agile UUID; v_plat_dash UUID; v_plat_coll UUID;
  v_plat_admin UUID; v_plat_proj UUID;
BEGIN
  -- ═══ PM: Calendar (GAP-09 standalone) ═══════════════════════════════════════
  INSERT INTO public.menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('pm_calendar', 'Calendar', 'Universal calendar view', NULL, 1, 5, '/pm/calendar', 'calendar-days', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET route_path = EXCLUDED.route_path, sort_order = EXCLUDED.sort_order, menu_icon = EXCLUDED.menu_icon, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  -- ═══ PM: Automation (GAP-01) ══════════════════════════════════════════════
  INSERT INTO public.menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('pm_section_automations', 'Automation', 'Workflow automation rules', NULL, 1, 90, NULL, 'zap', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_pm_auto FROM public.menu_items WHERE menu_code = 'pm_section_automations' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('pm_automations_rules',     'Automation Rules',    v_pm_auto, 2, 1, '/pm/automations',           'zap', TRUE, TRUE),
    ('pm_automations_templates','Template Library',   v_pm_auto, 2, 2, '/pm/automations/templates', 'layers', TRUE, TRUE),
    ('pm_automations_log',     'Execution Log',       v_pm_auto, 2, 3, '/pm/automations/log',       'list', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  -- ═══ PM: Strategy & OKRs (GAP-03) ═════════════════════════════════════════
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('pm_section_strategy_okr', 'Strategy & OKRs', NULL, 1, 100, NULL, 'target', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_pm_okr FROM public.menu_items WHERE menu_code = 'pm_section_strategy_okr' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('pm_okr_dashboard',  'OKR Dashboard',           v_pm_okr, 2, 1, '/pm/okr',              'target', TRUE, TRUE),
    ('pm_okr_objectives', 'Objectives & Key Results', v_pm_okr, 2, 2, '/pm/okr/objectives', 'list', TRUE, TRUE),
    ('pm_okr_alignment',  'Alignment Map',           v_pm_okr, 2, 3, '/pm/okr/alignment',  'git-branch', TRUE, TRUE),
    ('pm_okr_checkins',   'OKR Check-ins',           v_pm_okr, 2, 4, '/pm/okr/checkins',    'check-circle', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  -- ═══ PM: Resources Hub (GAP-05,10,11,13,20) ═══════════════════════════════
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('pm_section_resources_hub', 'Resources Hub', NULL, 1, 110, NULL, 'users', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_pm_res FROM public.menu_items WHERE menu_code = 'pm_section_resources_hub' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('pm_workload_heatmap',      'Workload Heatmap',        v_pm_res, 2, 1, '/pm/resources/workload',            'layout-grid', TRUE, TRUE),
    ('pm_raci_matrix',           'RACI Matrix',             v_pm_res, 2, 2, '/pm/resources/raci',                'table-2', TRUE, TRUE),
    ('pm_skills_matrix',         'Skills Matrix',           v_pm_res, 2, 3, '/pm/resources/skills',              'book-marked', TRUE, TRUE),
    ('pm_timesheet_approvals',   'Timesheet Approvals',     v_pm_res, 2, 4, '/pm/resources/timesheet-approval', 'clipboard-check', TRUE, TRUE),
    ('pm_training_certifications','Training & Certifications', v_pm_res, 2, 5, '/pm/resources/training',       'graduation-cap', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  -- ═══ PM: Project Settings (GAP-04,06,07,08,19,22) ════════════════════════
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('pm_section_project_settings', 'Project Settings', NULL, 1, 120, NULL, 'settings', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_pm_set FROM public.menu_items WHERE menu_code = 'pm_section_project_settings' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('pm_custom_fields',       'Custom Fields',        v_pm_set, 2, 1, '/pm/settings/custom-fields',       'sliders-horizontal', TRUE, TRUE),
    ('pm_intake_forms',        'Public Intake Forms',  v_pm_set, 2, 2, '/pm/settings/intake-forms',          'file-input', TRUE, TRUE),
    ('pm_intake_submissions',  'Form Submissions',     v_pm_set, 2, 3, '/pm/settings/intake-forms/submissions', 'inbox', TRUE, TRUE),
    ('pm_client_portal',       'Client Portal',        v_pm_set, 2, 4, '/pm/settings/client-portal',       'globe', TRUE, TRUE),
    ('pm_recurring_tasks',     'Recurring Tasks',      v_pm_set, 2, 5, '/pm/settings/recurring-tasks',     'repeat', TRUE, TRUE),
    ('pm_guest_access',        'Guest Access',         v_pm_set, 2, 6, '/pm/settings/guest-access',        'user-plus', TRUE, TRUE),
    ('pm_clone_project',       'Clone This Project',   v_pm_set, 2, 7, '/pm/settings/clone',               'copy', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  -- ═══ PM: Procurement (GAP-12) ═════════════════════════════════════════════
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('pm_section_procurement', 'Procurement & Contracts', NULL, 1, 130, NULL, 'shopping-cart', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_pm_proc FROM public.menu_items WHERE menu_code = 'pm_section_procurement' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('pm_procurement_plan',    'Procurement Plan',   v_pm_proc, 2, 1, '/pm/procurement/plan',            'file-text', TRUE, TRUE),
    ('pm_vendor_register',   'Vendor Register',    v_pm_proc, 2, 2, '/pm/procurement/vendors',         'building', TRUE, TRUE),
    ('pm_purchase_requests',   'Purchase Requests',  v_pm_proc, 2, 3, '/pm/procurement/purchase-requests','file-plus', TRUE, TRUE),
    ('pm_purchase_orders',   'Purchase Orders',    v_pm_proc, 2, 4, '/pm/procurement/purchase-orders', 'shopping-bag', TRUE, TRUE),
    ('pm_contracts',           'Contracts',          v_pm_proc, 2, 5, '/pm/procurement/contracts',       'file-signature', TRUE, TRUE),
    ('pm_invoice_tracking',  'Invoice Tracking',   v_pm_proc, 2, 6, '/pm/procurement/invoices',        'receipt', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  -- ═══ PM: Planning Tools (GAP-14,15) ═══════════════════════════════════════
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('pm_section_planning_tools', 'Planning Tools', NULL, 1, 140, NULL, 'compass', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_pm_plan FROM public.menu_items WHERE menu_code = 'pm_section_planning_tools' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('pm_s_curve',           'S-Curve Analysis',     v_pm_plan, 2, 1, '/pm/planning/s-curve',  'line-chart', TRUE, TRUE),
    ('pm_baseline_compare',  'Baseline Comparison',  v_pm_plan, 2, 2, '/pm/planning/baseline', 'git-compare', TRUE, TRUE),
    ('pm_planning_poker',    'Planning Poker',       v_pm_plan, 2, 3, '/pm/planning/poker',    'gamepad-2', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  -- ═══ PM: Dashboards (GAP-16,23) ═══════════════════════════════════════════
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('pm_section_dashboards_analytics', 'Dashboards & Analytics', NULL, 1, 150, NULL, 'layout-dashboard', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_pm_dash FROM public.menu_items WHERE menu_code = 'pm_section_dashboards_analytics' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('pm_my_dashboards',     'My Dashboards',      v_pm_dash, 2, 1, '/pm/dashboards',          'layout-grid', TRUE, TRUE),
    ('pm_dashboard_builder', 'Dashboard Builder',  v_pm_dash, 2, 2, '/pm/dashboards/builder', 'plus-square', TRUE, TRUE),
    ('pm_scheduled_reports', 'Scheduled Reports',  v_pm_dash, 2, 3, '/pm/reporting/scheduled','calendar-clock', TRUE, TRUE),
    ('pm_report_archive',    'Report Archive',     v_pm_dash, 2, 4, '/pm/reporting/archive',  'archive', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  -- ═══ PM: Collaboration (GAP-18) ═══════════════════════════════════════════
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('pm_section_collaboration', 'Collaboration', NULL, 1, 160, NULL, 'pen-tool', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_pm_coll FROM public.menu_items WHERE menu_code = 'pm_section_collaboration' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('pm_whiteboards',     'Whiteboards',     v_pm_coll, 2, 1, '/pm/collaboration/whiteboards',     'pen-tool', TRUE, TRUE),
    ('pm_whiteboard_new',  'New Whiteboard',  v_pm_coll, 2, 2, '/pm/collaboration/whiteboards/new', 'plus', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  -- ═══ PM: Integrations (GAP-25) ════════════════════════════════════════════
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('pm_section_integrations', 'Integrations', NULL, 1, 170, NULL, 'plug', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_pm_int FROM public.menu_items WHERE menu_code = 'pm_section_integrations' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('pm_integrations_marketplace', 'Integration Marketplace', v_pm_int, 2, 1, '/pm/integrations',            'plug', TRUE, TRUE),
    ('pm_integrations_connections','My Connections',         v_pm_int, 2, 2, '/pm/integrations/connections', 'link', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  -- ═══ PM: Notification Preferences (GAP-21 standalone) ═════════════════════
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('pm_notification_preferences', 'Notification Preferences', NULL, 1, 180, '/pm/notifications/preferences', 'bell', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET route_path = EXCLUDED.route_path, sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  -- ═══ PMO: Calendar ══════════════════════════════════════════════════════════
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('pmo_calendar', 'Calendar', NULL, 1, 5, '/pmo/calendar', 'calendar-days', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  -- ═══ PMO: Strategy & OKRs + Portfolio Map (GAP-03,17) ═══════════════════════
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('pmo_section_strategy_okr', 'Strategy & OKRs', NULL, 1, 15, NULL, 'target', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET sort_order = EXCLUDED.sort_order, is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_pmo_okr FROM public.menu_items WHERE menu_code = 'pmo_section_strategy_okr' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('pmo_okr_dashboard',       'OKR Dashboard',            v_pmo_okr, 2, 1, '/pmo/okr',              'target', TRUE, TRUE),
    ('pmo_okr_objectives',     'Objectives & KRs',         v_pmo_okr, 2, 2, '/pmo/okr/objectives',   'list', TRUE, TRUE),
    ('pmo_okr_alignment',      'Alignment Map',            v_pmo_okr, 2, 3, '/pmo/okr/alignment',    'git-branch', TRUE, TRUE),
    ('pmo_okr_checkins',       'OKR Check-ins',            v_pmo_okr, 2, 4, '/pmo/okr/checkins',     'check-circle', TRUE, TRUE),
    ('pmo_portfolio_map',      'Strategic Portfolio Map',  v_pmo_okr, 2, 5, '/pmo/portfolio/map',    'map', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  -- ═══ PMO: Dashboards & Analytics (GAP-14,16,23) ═════════════════════════════
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('pmo_section_dashboards_analytics', 'Dashboards & Analytics', NULL, 1, 85, NULL, 'layout-dashboard', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_pmo_dash FROM public.menu_items WHERE menu_code = 'pmo_section_dashboards_analytics' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('pmo_s_curve',            'S-Curve Analysis',     v_pmo_dash, 2, 1, '/pmo/reporting/s-curve',    'line-chart', TRUE, TRUE),
    ('pmo_baseline_compare',   'Baseline Comparison',    v_pmo_dash, 2, 2, '/pmo/reporting/baseline', 'git-compare', TRUE, TRUE),
    ('pmo_my_dashboards',      'My Dashboards',        v_pmo_dash, 2, 3, '/pmo/dashboards',           'layout-grid', TRUE, TRUE),
    ('pmo_dashboard_builder',  'Dashboard Builder',    v_pmo_dash, 2, 4, '/pmo/dashboards/builder',   'plus-square', TRUE, TRUE),
    ('pmo_scheduled_reports',  'Scheduled Reports',    v_pmo_dash, 2, 5, '/pmo/reporting/scheduled',  'calendar-clock', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  -- ═══ PMO: Procurement (GAP-12) ══════════════════════════════════════════════
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('pmo_section_procurement_mgmt', 'Procurement Management', NULL, 1, 105, NULL, 'shopping-cart', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_pmo_proc FROM public.menu_items WHERE menu_code = 'pmo_section_procurement_mgmt' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('pmo_vendor_register',    'Vendor Register',    v_pmo_proc, 2, 1, '/pmo/procurement/vendors',          'building', TRUE, TRUE),
    ('pmo_purchase_requests',  'Purchase Requests',  v_pmo_proc, 2, 2, '/pmo/procurement/purchase-requests','file-plus', TRUE, TRUE),
    ('pmo_purchase_orders',    'Purchase Orders',    v_pmo_proc, 2, 3, '/pmo/procurement/purchase-orders',  'shopping-bag', TRUE, TRUE),
    ('pmo_contracts',          'Contracts',          v_pmo_proc, 2, 4, '/pmo/procurement/contracts',        'file-signature', TRUE, TRUE),
    ('pmo_invoice_tracking',  'Invoice Tracking',   v_pmo_proc, 2, 5, '/pmo/procurement/invoices',         'receipt', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  -- ═══ PMO: Platform Configuration (GAP-01,04,06,07,19,22,25) ═════════════
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('pmo_section_platform_config', 'Platform Configuration', NULL, 1, 135, NULL, 'settings-2', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_pmo_cfg FROM public.menu_items WHERE menu_code = 'pmo_section_platform_config' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('pmo_automations_rules',     'Automation Rules',     v_pmo_cfg, 2, 1, '/pmo/admin/automations',           'zap', TRUE, TRUE),
    ('pmo_automations_templates', 'Automation Templates', v_pmo_cfg, 2, 2, '/pmo/admin/automations/templates', 'layers', TRUE, TRUE),
    ('pmo_custom_fields',         'Custom Fields',        v_pmo_cfg, 2, 3, '/pmo/admin/custom-fields',         'sliders-horizontal', TRUE, TRUE),
    ('pmo_intake_forms',          'Public Intake Forms',  v_pmo_cfg, 2, 4, '/pmo/admin/intake-forms',          'file-input', TRUE, TRUE),
    ('pmo_client_portals',        'Client Portals',       v_pmo_cfg, 2, 5, '/pmo/admin/client-portals',        'globe', TRUE, TRUE),
    ('pmo_guest_access',          'Guest Access',         v_pmo_cfg, 2, 6, '/pmo/admin/guest-access',          'user-plus', TRUE, TRUE),
    ('pmo_project_clone',         'Project Cloning',      v_pmo_cfg, 2, 7, '/pmo/admin/project-clone',         'copy', TRUE, TRUE),
    ('pmo_integrations_hub',      'Integrations Hub',     v_pmo_cfg, 2, 8, '/pmo/admin/integrations',          'plug', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  -- ═══ PMO: Resources & Capacity (GAP-05,10,11,13,20) ═══════════════════════
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('pmo_section_resources_capacity', 'Resources & Capacity', NULL, 1, 145, NULL, 'users', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_pmo_res FROM public.menu_items WHERE menu_code = 'pmo_section_resources_capacity' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('pmo_workload_heatmap',       'Workload Heatmap',        v_pmo_res, 2, 1, '/pmo/resources/workload',              'layout-grid', TRUE, TRUE),
    ('pmo_raci_all_projects',      'RACI Matrix (All Projects)', v_pmo_res, 2, 2, '/pmo/resources/raci',              'table-2', TRUE, TRUE),
    ('pmo_skills_matrix',          'Skills Matrix',           v_pmo_res, 2, 3, '/pmo/resources/skills',                'book-marked', TRUE, TRUE),
    ('pmo_timesheet_approvals',    'Timesheet Approvals',     v_pmo_res, 2, 4, '/pmo/financial/timesheet-approvals',   'clipboard-check', TRUE, TRUE),
    ('pmo_training_certifications','Training & Certifications', v_pmo_res, 2, 5, '/pmo/resources/training',          'graduation-cap', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  -- ═══ PMO: Collaboration (GAP-15,18) ═══════════════════════════════════════
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('pmo_section_collaboration', 'Collaboration', NULL, 1, 155, NULL, 'pen-tool', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_pmo_coll FROM public.menu_items WHERE menu_code = 'pmo_section_collaboration' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('pmo_planning_poker',   'Planning Poker Sessions', v_pmo_coll, 2, 1, '/pmo/collaboration/poker',          'gamepad-2', TRUE, TRUE),
    ('pmo_whiteboards',      'Whiteboards',             v_pmo_coll, 2, 2, '/pmo/collaboration/whiteboards',   'pen-tool', TRUE, TRUE),
    ('pmo_whiteboard_new',   'New Whiteboard',          v_pmo_coll, 2, 3, '/pmo/collaboration/whiteboards/new','plus', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('pmo_notification_preferences', 'Notification Preferences', NULL, 1, 160, '/pmo/notifications/preferences', 'bell', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  -- ═══ Platform /platform/* (DB-driven roles) ═══════════════════════════════
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('platform_calendar', 'Calendar', NULL, 1, 20, '/platform/calendar', 'calendar-days', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('platform_section_strategy', 'Strategy & OKRs', NULL, 1, 25, NULL, 'target', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_plat_okr FROM public.menu_items WHERE menu_code = 'platform_section_strategy' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('platform_okr_goals', 'OKR & Goals', v_plat_okr, 2, 1, '/platform/okr', 'target', TRUE, TRUE),
    ('platform_portfolio_map', 'Strategic Portfolio Map', v_plat_okr, 2, 2, '/platform/portfolio/map', 'map', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('platform_section_resources', 'Resources', NULL, 1, 30, NULL, 'users', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_plat_res FROM public.menu_items WHERE menu_code = 'platform_section_resources' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('platform_workload_heatmap', 'Workload Heatmap', v_plat_res, 2, 1, '/platform/resources/workload', 'layout-grid', TRUE, TRUE),
    ('platform_skills_matrix', 'Skills Matrix', v_plat_res, 2, 2, '/platform/resources/skills', 'book-marked', TRUE, TRUE),
    ('platform_training', 'Training & Certifications', v_plat_res, 2, 3, '/platform/resources/training', 'graduation-cap', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('platform_section_settings', 'Settings', NULL, 1, 35, NULL, 'settings', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_plat_set FROM public.menu_items WHERE menu_code = 'platform_section_settings' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('platform_intake_forms', 'Intake Forms', v_plat_set, 2, 1, '/platform/intake-forms', 'file-input', TRUE, TRUE),
    ('platform_client_portal', 'Client Portal', v_plat_set, 2, 2, '/platform/client-portal', 'globe', TRUE, TRUE),
    ('platform_notification_prefs', 'Notification Preferences', v_plat_set, 2, 3, '/platform/settings/notifications', 'bell', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('platform_section_delivery', 'Delivery', NULL, 1, 40, NULL, 'truck', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_plat_del FROM public.menu_items WHERE menu_code = 'platform_section_delivery' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('platform_recurring_tasks', 'Recurring Tasks', v_plat_del, 2, 1, '/platform/recurring-tasks', 'repeat', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('platform_section_planning', 'Planning', NULL, 1, 45, NULL, 'compass', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_plat_plan FROM public.menu_items WHERE menu_code = 'platform_section_planning' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('platform_raci_matrix', 'RACI Matrix', v_plat_plan, 2, 1, '/platform/planning/raci', 'table-2', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('platform_section_procurement', 'Procurement', NULL, 1, 50, NULL, 'shopping-cart', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_plat_proc FROM public.menu_items WHERE menu_code = 'platform_section_procurement' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('platform_procurement', 'Procurement', v_plat_proc, 2, 1, '/platform/procurement', 'shopping-cart', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('platform_section_reporting', 'Reporting', NULL, 1, 55, NULL, 'bar-chart', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_plat_rep FROM public.menu_items WHERE menu_code = 'platform_section_reporting' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('platform_s_curve', 'S-Curve Analysis', v_plat_rep, 2, 1, '/platform/reporting/s-curve', 'line-chart', TRUE, TRUE),
    ('platform_scheduled_reports', 'Scheduled Reports', v_plat_rep, 2, 2, '/platform/reporting/scheduled', 'calendar-clock', TRUE, TRUE),
    ('platform_timesheet_approvals', 'Timesheet Approvals', v_plat_rep, 2, 3, '/platform/timesheets/approvals', 'clipboard-check', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('platform_section_agile', 'Agile', NULL, 1, 60, NULL, 'zap', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_plat_agile FROM public.menu_items WHERE menu_code = 'platform_section_agile' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('platform_planning_poker', 'Planning Poker', v_plat_agile, 2, 1, '/platform/agile/poker', 'gamepad-2', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('platform_section_dashboards', 'Dashboards', NULL, 1, 65, NULL, 'layout-dashboard', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_plat_dash FROM public.menu_items WHERE menu_code = 'platform_section_dashboards' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('platform_dashboard_builder', 'Dashboard Builder', v_plat_dash, 2, 1, '/platform/dashboards/builder', 'layout-grid', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('platform_section_collaboration', 'Collaboration', NULL, 1, 70, NULL, 'pen-tool', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_plat_coll FROM public.menu_items WHERE menu_code = 'platform_section_collaboration' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('platform_whiteboards', 'Whiteboards', v_plat_coll, 2, 1, '/platform/collaboration/whiteboards', 'pen-tool', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('platform_section_admin', 'Administration', NULL, 1, 75, NULL, 'shield', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_plat_admin FROM public.menu_items WHERE menu_code = 'platform_section_admin' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('platform_automations', 'Automation Rules', v_plat_admin, 2, 1, '/platform/automations', 'zap', TRUE, TRUE),
    ('platform_custom_fields', 'Custom Fields', v_plat_admin, 2, 2, '/platform/admin/custom-fields', 'sliders-horizontal', TRUE, TRUE),
    ('platform_guest_access', 'Guest Access Management', v_plat_admin, 2, 3, '/platform/admin/guest-access', 'user-plus', TRUE, TRUE),
    ('platform_integrations_hub', 'Integrations Hub', v_plat_admin, 2, 4, '/platform/admin/integrations', 'plug', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('platform_section_projects', 'Projects', NULL, 1, 80, NULL, 'folder', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_plat_proj FROM public.menu_items WHERE menu_code = 'platform_section_projects' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('platform_clone_project', 'Clone Project', v_plat_proj, 2, 1, '/platform/projects/clone', 'copy', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  RAISE NOTICE 'v647_pmis_gap_menu_registry_platform.sql completed';
END $$;
