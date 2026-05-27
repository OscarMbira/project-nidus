-- v649: Simulator PMIS gap menu registry — sim PM, sim PMO, sim general, sim TM
-- Idempotent ON CONFLICT (menu_code). Source: v631 plan GAP-01 to GAP-29 (simulator)

DO $$
DECLARE
  v_sim_pm_cal UUID; v_sim_pm_okr UUID; v_sim_pm_res UUID; v_sim_pm_set UUID;
  v_sim_pm_proc UUID; v_sim_pm_plan UUID; v_sim_pm_auto UUID; v_sim_pm_dash UUID;
  v_sim_pm_coll UUID;
  v_sim_pmo_cal UUID; v_sim_pmo_okr UUID; v_sim_pmo_dash UUID; v_sim_pmo_proc UUID;
  v_sim_pmo_cfg UUID; v_sim_pmo_res UUID; v_sim_pmo_coll UUID;
  v_sim_gen_cal UUID; v_sim_gen_okr UUID; v_sim_gen_plan UUID; v_sim_gen_coll UUID;
  v_sim_gen_dash UUID; v_sim_live UUID; v_sim_scenarios UUID; v_sim_profile UUID;
  v_sim_exams UUID;
  v_sim_tm_cal UUID; v_sim_tm_res UUID; v_sim_tm_plan UUID; v_sim_tm_coll UUID;
BEGIN
  -- ═══ Simulator PM ═══════════════════════════════════════════════════════════
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('sim_pm_calendar', 'Practice Calendar', NULL, 1, 5, '/simulator/pm/calendar', 'calendar-days', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('sim_pm_section_strategy_okr', 'Practice Strategy & OKRs', NULL, 1, 90, NULL, 'target', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_sim_pm_okr FROM public.menu_items WHERE menu_code = 'sim_pm_section_strategy_okr' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('sim_pm_okr_dashboard',  'OKR Dashboard',            v_sim_pm_okr, 2, 1, '/simulator/pm/okr',              'target', TRUE, TRUE),
    ('sim_pm_okr_objectives', 'Objectives & KRs',         v_sim_pm_okr, 2, 2, '/simulator/pm/okr/objectives',   'list', TRUE, TRUE),
    ('sim_pm_okr_alignment',  'Alignment Map',            v_sim_pm_okr, 2, 3, '/simulator/pm/okr/alignment',    'git-branch', TRUE, TRUE),
    ('sim_pm_okr_checkins',   'OKR Check-ins',            v_sim_pm_okr, 2, 4, '/simulator/pm/okr/checkins',     'check-circle', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('sim_pm_section_resources_hub', 'Practice Resources Hub', NULL, 1, 100, NULL, 'users', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_sim_pm_res FROM public.menu_items WHERE menu_code = 'sim_pm_section_resources_hub' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('sim_pm_workload_heatmap',       'Workload Heatmap',         v_sim_pm_res, 2, 1, '/simulator/pm/resources/workload',            'layout-grid', TRUE, TRUE),
    ('sim_pm_raci_matrix',           'RACI Matrix',              v_sim_pm_res, 2, 2, '/simulator/pm/resources/raci',                'table-2', TRUE, TRUE),
    ('sim_pm_skills_matrix',         'Skills Matrix',            v_sim_pm_res, 2, 3, '/simulator/pm/resources/skills',              'book-marked', TRUE, TRUE),
    ('sim_pm_timesheet_approvals',   'Timesheet Approvals',      v_sim_pm_res, 2, 4, '/simulator/pm/resources/timesheet-approval',  'clipboard-check', TRUE, TRUE),
    ('sim_pm_training_certifications','Training & Certifications', v_sim_pm_res, 2, 5, '/simulator/pm/resources/training',        'graduation-cap', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('sim_pm_section_project_settings', 'Practice Project Settings', NULL, 1, 110, NULL, 'settings', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_sim_pm_set FROM public.menu_items WHERE menu_code = 'sim_pm_section_project_settings' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('sim_pm_custom_fields',    'Custom Fields',          v_sim_pm_set, 2, 1, '/simulator/pm/settings/custom-fields',  'sliders-horizontal', TRUE, TRUE),
    ('sim_pm_intake_forms',     'Public Intake Forms',    v_sim_pm_set, 2, 2, '/simulator/pm/settings/intake-forms',   'file-input', TRUE, TRUE),
    ('sim_pm_client_portal',    'Client Portal',          v_sim_pm_set, 2, 3, '/simulator/pm/settings/client-portal',  'globe', TRUE, TRUE),
    ('sim_pm_recurring_tasks',  'Recurring Tasks',        v_sim_pm_set, 2, 4, '/simulator/pm/settings/recurring-tasks','repeat', TRUE, TRUE),
    ('sim_pm_guest_access',     'Guest Access',           v_sim_pm_set, 2, 5, '/simulator/pm/settings/guest-access', 'user-plus', TRUE, TRUE),
    ('sim_pm_clone_project',    'Clone Practice Project', v_sim_pm_set, 2, 6, '/simulator/pm/settings/clone',          'copy', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('sim_pm_section_procurement', 'Practice Procurement', NULL, 1, 120, NULL, 'shopping-cart', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_sim_pm_proc FROM public.menu_items WHERE menu_code = 'sim_pm_section_procurement' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('sim_pm_vendor_register',   'Vendor Register',    v_sim_pm_proc, 2, 1, '/simulator/pm/procurement/vendors',          'building', TRUE, TRUE),
    ('sim_pm_purchase_requests', 'Purchase Requests',v_sim_pm_proc, 2, 2, '/simulator/pm/procurement/purchase-requests','file-plus', TRUE, TRUE),
    ('sim_pm_purchase_orders',   'Purchase Orders',    v_sim_pm_proc, 2, 3, '/simulator/pm/procurement/purchase-orders',  'shopping-bag', TRUE, TRUE),
    ('sim_pm_contracts',         'Contracts',          v_sim_pm_proc, 2, 4, '/simulator/pm/procurement/contracts',        'file-signature', TRUE, TRUE),
    ('sim_pm_invoice_tracking',  'Invoice Tracking',   v_sim_pm_proc, 2, 5, '/simulator/pm/procurement/invoices',         'receipt', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('sim_pm_section_planning_tools', 'Practice Planning Tools', NULL, 1, 130, NULL, 'compass', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_sim_pm_plan FROM public.menu_items WHERE menu_code = 'sim_pm_section_planning_tools' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('sim_pm_s_curve',          'S-Curve Analysis',     v_sim_pm_plan, 2, 1, '/simulator/pm/planning/s-curve',  'line-chart', TRUE, TRUE),
    ('sim_pm_baseline_compare', 'Baseline Comparison',  v_sim_pm_plan, 2, 2, '/simulator/pm/planning/baseline', 'git-compare', TRUE, TRUE),
    ('sim_pm_planning_poker',   'Planning Poker',       v_sim_pm_plan, 2, 3, '/simulator/pm/planning/poker',    'gamepad-2', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('sim_pm_section_automations', 'Practice Automation Rules', NULL, 1, 140, NULL, 'zap', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_sim_pm_auto FROM public.menu_items WHERE menu_code = 'sim_pm_section_automations' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('sim_pm_automations_rules',     'My Automation Rules', v_sim_pm_auto, 2, 1, '/simulator/pm/automations',           'zap', TRUE, TRUE),
    ('sim_pm_automations_templates', 'Template Library',  v_sim_pm_auto, 2, 2, '/simulator/pm/automations/templates', 'layers', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('sim_pm_section_dashboards', 'Practice Dashboards', NULL, 1, 150, NULL, 'layout-dashboard', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_sim_pm_dash FROM public.menu_items WHERE menu_code = 'sim_pm_section_dashboards' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('sim_pm_my_dashboards',     'My Dashboards',     v_sim_pm_dash, 2, 1, '/simulator/pm/dashboards',          'layout-grid', TRUE, TRUE),
    ('sim_pm_dashboard_builder', 'Dashboard Builder', v_sim_pm_dash, 2, 2, '/simulator/pm/dashboards/builder','plus-square', TRUE, TRUE),
    ('sim_pm_scheduled_reports', 'Scheduled Reports', v_sim_pm_dash, 2, 3, '/simulator/pm/reporting/scheduled','calendar-clock', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('sim_pm_section_collaboration', 'Practice Collaboration', NULL, 1, 160, NULL, 'pen-tool', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_sim_pm_coll FROM public.menu_items WHERE menu_code = 'sim_pm_section_collaboration' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('sim_pm_whiteboards',    'Whiteboards',    v_sim_pm_coll, 2, 1, '/simulator/pm/collaboration/whiteboards',     'pen-tool', TRUE, TRUE),
    ('sim_pm_whiteboard_new', 'New Whiteboard', v_sim_pm_coll, 2, 2, '/simulator/pm/collaboration/whiteboards/new', 'plus', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('sim_pm_notification_preferences', 'Notification Preferences', NULL, 1, 170, '/simulator/pm/notifications/preferences', 'bell', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  -- ═══ Simulator PMO ══════════════════════════════════════════════════════════
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('sim_pmo_calendar', 'Practice Calendar', NULL, 1, 5, '/simulator/pmo/calendar', 'calendar-days', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('sim_pmo_section_strategy_okr', 'Practice Strategy & OKRs', NULL, 1, 15, NULL, 'target', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_sim_pmo_okr FROM public.menu_items WHERE menu_code = 'sim_pmo_section_strategy_okr' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('sim_pmo_okr_dashboard',   'OKR Dashboard',           v_sim_pmo_okr, 2, 1, '/simulator/pmo/okr',              'target', TRUE, TRUE),
    ('sim_pmo_okr_objectives',  'Objectives & KRs',        v_sim_pmo_okr, 2, 2, '/simulator/pmo/okr/objectives',   'list', TRUE, TRUE),
    ('sim_pmo_okr_alignment',   'Alignment Map',           v_sim_pmo_okr, 2, 3, '/simulator/pmo/okr/alignment',    'git-branch', TRUE, TRUE),
    ('sim_pmo_portfolio_map',   'Strategic Portfolio Map', v_sim_pmo_okr, 2, 4, '/simulator/pmo/portfolio/map',    'map', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('sim_pmo_section_dashboards_analytics', 'Practice Dashboards & Analytics', NULL, 1, 85, NULL, 'layout-dashboard', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_sim_pmo_dash FROM public.menu_items WHERE menu_code = 'sim_pmo_section_dashboards_analytics' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('sim_pmo_s_curve',           'S-Curve Analysis',    v_sim_pmo_dash, 2, 1, '/simulator/pmo/reporting/s-curve',    'line-chart', TRUE, TRUE),
    ('sim_pmo_baseline_compare',  'Baseline Comparison', v_sim_pmo_dash, 2, 2, '/simulator/pmo/reporting/baseline', 'git-compare', TRUE, TRUE),
    ('sim_pmo_my_dashboards',     'My Dashboards',       v_sim_pmo_dash, 2, 3, '/simulator/pmo/dashboards',         'layout-grid', TRUE, TRUE),
    ('sim_pmo_dashboard_builder', 'Dashboard Builder',   v_sim_pmo_dash, 2, 4, '/simulator/pmo/dashboards/builder', 'plus-square', TRUE, TRUE),
    ('sim_pmo_scheduled_reports', 'Scheduled Reports',   v_sim_pmo_dash, 2, 5, '/simulator/pmo/reporting/scheduled','calendar-clock', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('sim_pmo_section_procurement_mgmt', 'Practice Procurement Management', NULL, 1, 105, NULL, 'shopping-cart', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_sim_pmo_proc FROM public.menu_items WHERE menu_code = 'sim_pmo_section_procurement_mgmt' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('sim_pmo_vendor_register',   'Vendor Register',   v_sim_pmo_proc, 2, 1, '/simulator/pmo/procurement/vendors',          'building', TRUE, TRUE),
    ('sim_pmo_purchase_requests', 'Purchase Requests', v_sim_pmo_proc, 2, 2, '/simulator/pmo/procurement/purchase-requests','file-plus', TRUE, TRUE),
    ('sim_pmo_purchase_orders',   'Purchase Orders',   v_sim_pmo_proc, 2, 3, '/simulator/pmo/procurement/purchase-orders',  'shopping-bag', TRUE, TRUE),
    ('sim_pmo_contracts',         'Contracts',         v_sim_pmo_proc, 2, 4, '/simulator/pmo/procurement/contracts',        'file-signature', TRUE, TRUE),
    ('sim_pmo_invoice_tracking',  'Invoice Tracking',  v_sim_pmo_proc, 2, 5, '/simulator/pmo/procurement/invoices',         'receipt', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('sim_pmo_section_platform_config', 'Practice Platform Config', NULL, 1, 135, NULL, 'settings-2', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_sim_pmo_cfg FROM public.menu_items WHERE menu_code = 'sim_pmo_section_platform_config' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('sim_pmo_automations_rules',  'Automation Rules',  v_sim_pmo_cfg, 2, 1, '/simulator/pmo/admin/automations',        'zap', TRUE, TRUE),
    ('sim_pmo_custom_fields',      'Custom Fields',     v_sim_pmo_cfg, 2, 2, '/simulator/pmo/admin/custom-fields',      'sliders-horizontal', TRUE, TRUE),
    ('sim_pmo_intake_forms',       'Public Intake Forms', v_sim_pmo_cfg, 2, 3, '/simulator/pmo/admin/intake-forms',     'file-input', TRUE, TRUE),
    ('sim_pmo_client_portals',     'Client Portals',    v_sim_pmo_cfg, 2, 4, '/simulator/pmo/admin/client-portals',     'globe', TRUE, TRUE),
    ('sim_pmo_guest_access',       'Guest Access',      v_sim_pmo_cfg, 2, 5, '/simulator/pmo/admin/guest-access',       'user-plus', TRUE, TRUE),
    ('sim_pmo_project_clone',      'Project Cloning',   v_sim_pmo_cfg, 2, 6, '/simulator/pmo/admin/project-clone',      'copy', TRUE, TRUE),
    ('sim_pmo_integrations_hub',   'Integrations Hub',  v_sim_pmo_cfg, 2, 7, '/simulator/pmo/admin/integrations',       'plug', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('sim_pmo_section_resources_capacity', 'Practice Resources & Capacity', NULL, 1, 125, NULL, 'users', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_sim_pmo_res FROM public.menu_items WHERE menu_code = 'sim_pmo_section_resources_capacity' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('sim_pmo_workload_heatmap',        'Workload Heatmap',        v_sim_pmo_res, 2, 1, '/simulator/pmo/resources/workload',              'layout-grid', TRUE, TRUE),
    ('sim_pmo_raci_matrix',             'RACI Matrix',             v_sim_pmo_res, 2, 2, '/simulator/pmo/resources/raci',                  'table-2', TRUE, TRUE),
    ('sim_pmo_skills_matrix',           'Skills Matrix',           v_sim_pmo_res, 2, 3, '/simulator/pmo/resources/skills',                'book-marked', TRUE, TRUE),
    ('sim_pmo_timesheet_approvals',     'Timesheet Approvals',     v_sim_pmo_res, 2, 4, '/simulator/pmo/financial/timesheet-approvals',   'clipboard-check', TRUE, TRUE),
    ('sim_pmo_training_certifications', 'Training & Certifications', v_sim_pmo_res, 2, 5, '/simulator/pmo/resources/training',        'graduation-cap', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('sim_pmo_section_collaboration', 'Practice Collaboration', NULL, 1, 155, NULL, 'pen-tool', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_sim_pmo_coll FROM public.menu_items WHERE menu_code = 'sim_pmo_section_collaboration' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('sim_pmo_planning_poker', 'Planning Poker', v_sim_pmo_coll, 2, 1, '/simulator/pmo/collaboration/poker',       'gamepad-2', TRUE, TRUE),
    ('sim_pmo_whiteboards',    'Whiteboards',    v_sim_pmo_coll, 2, 2, '/simulator/pmo/collaboration/whiteboards', 'pen-tool', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('sim_pmo_notification_preferences', 'Notification Preferences', NULL, 1, 160, '/simulator/pmo/notifications/preferences', 'bell', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  -- ═══ Simulator General (top-level) ══════════════════════════════════════════
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('sim_gap_calendar', 'Practice Calendar', NULL, 1, 22, '/simulator/calendar', 'calendar-days', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('sim_gap_section_okr', 'Practice OKR & Goals', NULL, 1, 23, NULL, 'target', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_sim_gen_okr FROM public.menu_items WHERE menu_code = 'sim_gap_section_okr' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('sim_gap_okr_dashboard',  'OKR Dashboard',    v_sim_gen_okr, 2, 1, '/simulator/okr',            'target', TRUE, TRUE),
    ('sim_gap_okr_objectives', 'Objectives & KRs', v_sim_gen_okr, 2, 2, '/simulator/okr/objectives', 'list', TRUE, TRUE),
    ('sim_gap_okr_checkins',   'OKR Check-ins',    v_sim_gen_okr, 2, 3, '/simulator/okr/checkins',   'check-circle', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('sim_gap_section_planning', 'Practice Planning Tools', NULL, 1, 24, NULL, 'compass', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_sim_gen_plan FROM public.menu_items WHERE menu_code = 'sim_gap_section_planning' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('sim_gap_recurring_tasks', 'Recurring Tasks', v_sim_gen_plan, 2, 1, '/simulator/planning/recurring-tasks', 'repeat', TRUE, TRUE),
    ('sim_gap_raci_matrix',     'RACI Matrix',     v_sim_gen_plan, 2, 2, '/simulator/planning/raci',          'table-2', TRUE, TRUE),
    ('sim_gap_s_curve',         'S-Curve Analysis',v_sim_gen_plan, 2, 3, '/simulator/planning/s-curve',       'line-chart', TRUE, TRUE),
    ('sim_gap_planning_poker',  'Planning Poker',  v_sim_gen_plan, 2, 4, '/simulator/planning/poker',         'gamepad-2', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('sim_gap_section_collaboration', 'Collaboration', NULL, 1, 25, NULL, 'pen-tool', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_sim_gen_coll FROM public.menu_items WHERE menu_code = 'sim_gap_section_collaboration' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('sim_gap_whiteboards',    'Whiteboards',    v_sim_gen_coll, 2, 1, '/simulator/collaboration/whiteboards',     'pen-tool', TRUE, TRUE),
    ('sim_gap_whiteboard_new', 'New Whiteboard', v_sim_gen_coll, 2, 2, '/simulator/collaboration/whiteboards/new', 'plus', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('sim_gap_section_dashboards', 'Dashboards & Analytics', NULL, 1, 26, NULL, 'layout-dashboard', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_sim_gen_dash FROM public.menu_items WHERE menu_code = 'sim_gap_section_dashboards' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('sim_gap_my_dashboards',     'My Dashboards',     v_sim_gen_dash, 2, 1, '/simulator/dashboards',          'layout-grid', TRUE, TRUE),
    ('sim_gap_dashboard_builder', 'Dashboard Builder', v_sim_gen_dash, 2, 2, '/simulator/dashboards/builder',  'plus-square', TRUE, TRUE),
    ('sim_gap_scheduled_reports', 'Scheduled Reports', v_sim_gen_dash, 2, 3, '/simulator/reporting/scheduled', 'calendar-clock', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('sim_gap_notification_preferences', 'Notification Preferences', NULL, 1, 27, '/simulator/notifications/preferences', 'bell', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  -- GAP-26: append to Live Simulation (create section if missing)
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('sim_section_live_simulation', 'Live Simulation', NULL, 1, 15, NULL, 'play', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_sim_live FROM public.menu_items WHERE menu_code IN ('sim_section_live_simulation', 'sim-live-simulation', 'sim_live_simulation') ORDER BY menu_code LIMIT 1;
  IF v_sim_live IS NULL THEN
    SELECT id INTO v_sim_live FROM public.menu_items WHERE menu_code = 'sim_section_live_simulation' LIMIT 1;
  END IF;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('sim_team_mode_setup',  'Team Mode (Multiplayer)', v_sim_live, 2, 20, '/simulator/team-mode/setup',  'users', TRUE, TRUE),
    ('sim_team_mode_active', 'Active Team Session',     v_sim_live, 2, 21, '/simulator/team-mode/active', 'radio', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = COALESCE(EXCLUDED.parent_menu_id, public.menu_items.parent_menu_id), route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  -- GAP-27: Certification Exams section
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('sim_section_certification_exams', 'Certification Exams', NULL, 1, 28, NULL, 'award', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_sim_exams FROM public.menu_items WHERE menu_code = 'sim_section_certification_exams' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('sim_exams_browse',       'Browse Exams',       v_sim_exams, 2, 1, '/simulator/exams',              'search', TRUE, TRUE),
    ('sim_exams_results',      'My Exam Results',    v_sim_exams, 2, 2, '/simulator/exams/results',      'bar-chart', TRUE, TRUE),
    ('sim_exams_certificates', 'Exam Certificates',  v_sim_exams, 2, 3, '/simulator/exams/certificates', 'award', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  -- GAP-28: Scenario Marketplace under Scenarios
  SELECT id INTO v_sim_scenarios FROM public.menu_items
  WHERE menu_code IN ('sim_scenarios', 'sim-scenarios', 'sim_section_scenarios') LIMIT 1;
  IF v_sim_scenarios IS NOT NULL THEN
    INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
    VALUES ('sim_scenario_marketplace', 'Scenario Marketplace', v_sim_scenarios, 2, 50, '/simulator/scenarios/marketplace', 'store', TRUE, TRUE)
    ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  ELSE
    INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
    VALUES ('sim_scenario_marketplace', 'Scenario Marketplace', NULL, 1, 29, '/simulator/scenarios/marketplace', 'store', TRUE, TRUE)
    ON CONFLICT (menu_code) DO UPDATE SET route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  END IF;

  -- GAP-29: Cross-run analytics under Profile
  SELECT id INTO v_sim_profile FROM public.menu_items
  WHERE menu_code IN ('sim_profile', 'sim-profile', 'sim_section_profile') LIMIT 1;
  IF v_sim_profile IS NOT NULL THEN
    INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
      ('sim_run_analytics',      'Cross-Run Analytics',    v_sim_profile, 2, 40, '/simulator/profile/run-analytics', 'line-chart', TRUE, TRUE),
      ('sim_improvement_insights','Improvement Insights',  v_sim_profile, 2, 41, '/simulator/profile/improvement',   'lightbulb', TRUE, TRUE)
    ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  ELSE
    INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
      ('sim_run_analytics',       'Cross-Run Analytics',   NULL, 1, 30, '/simulator/profile/run-analytics', 'line-chart', TRUE, TRUE),
      ('sim_improvement_insights','Improvement Insights', NULL, 1, 31, '/simulator/profile/improvement',   'lightbulb', TRUE, TRUE)
    ON CONFLICT (menu_code) DO UPDATE SET route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  END IF;

  -- ═══ Simulator TM ═══════════════════════════════════════════════════════════
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('sim_tm_calendar', 'My Calendar', NULL, 1, 5, '/simulator/tm/calendar', 'calendar-days', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('sim_tm_section_resources', 'Resources', NULL, 1, 20, NULL, 'users', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_sim_tm_res FROM public.menu_items WHERE menu_code = 'sim_tm_section_resources' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('sim_tm_workload',   'My Workload',         v_sim_tm_res, 2, 1, '/simulator/tm/workload',  'layout-grid', TRUE, TRUE),
    ('sim_tm_raci',       'RACI Matrix',         v_sim_tm_res, 2, 2, '/simulator/tm/raci',      'table-2', TRUE, TRUE),
    ('sim_tm_skills',     'My Skills Profile',   v_sim_tm_res, 2, 3, '/simulator/tm/skills',    'book-marked', TRUE, TRUE),
    ('sim_tm_training',   'Training & Certifications', v_sim_tm_res, 2, 4, '/simulator/tm/training', 'graduation-cap', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('sim_tm_section_planning', 'Planning Tools', NULL, 1, 30, NULL, 'compass', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_sim_tm_plan FROM public.menu_items WHERE menu_code = 'sim_tm_section_planning' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('sim_tm_recurring_tasks', 'Recurring Tasks', v_sim_tm_plan, 2, 1, '/simulator/tm/recurring-tasks', 'repeat', TRUE, TRUE),
    ('sim_tm_s_curve',         'S-Curve View',    v_sim_tm_plan, 2, 2, '/simulator/tm/planning/s-curve', 'line-chart', TRUE, TRUE),
    ('sim_tm_planning_poker',  'Planning Poker',  v_sim_tm_plan, 2, 3, '/simulator/tm/planning/poker',   'gamepad-2', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('sim_tm_section_collaboration', 'Collaboration', NULL, 1, 40, NULL, 'pen-tool', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET is_visible = TRUE, is_active = TRUE, updated_at = NOW();
  SELECT id INTO v_sim_tm_coll FROM public.menu_items WHERE menu_code = 'sim_tm_section_collaboration' LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active) VALUES
    ('sim_tm_whiteboards', 'Whiteboards', v_sim_tm_coll, 2, 1, '/simulator/tm/whiteboards', 'pen-tool', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET parent_menu_id = EXCLUDED.parent_menu_id, route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('sim_tm_timesheet_submit', 'Submit for Approval', NULL, 1, 50, '/simulator/tm/timesheets/submit', 'send', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  INSERT INTO public.menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('sim_tm_notification_preferences', 'Notification Preferences', NULL, 1, 60, '/simulator/tm/notifications/preferences', 'bell', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

  RAISE NOTICE 'v649_sim_pmis_gap_menu_registry.sql completed';
END $$;
