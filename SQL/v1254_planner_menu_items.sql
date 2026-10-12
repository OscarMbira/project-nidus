-- ============================================================================
-- v1254: Project Planner sidebar — the pln_ menu tree (v1239 Slice 5.2a, D19)
-- All route paths are /app/... (planner.<domain>). Rows are read by planner_menu() (v1256),
-- which also requires a role grant (v1255) and the planner allow-list (v1249/v1250).
-- The Platform/Simulator sidebars never show pln_ rows (their prefix filters, v1239 5.2a).
-- Idempotent (ON CONFLICT on menu_code). Run v1250 afterwards to allow-list these rows.
--
-- Deviations from the plan's list (recorded in the v1239 plan):
--   * Timesheets has one item, "My week": the planned-vs-logged comparison is a column on it.
--   * "Members & roles" appears once (Project setup); Settings has "Workspace" instead.
--   * "Regional settings" is not in the Planner yet (the screen is Platform-bound).
-- ============================================================================

CREATE OR REPLACE FUNCTION pg_temp.pln_menu(p_code TEXT, p_label TEXT, p_route TEXT, p_parent TEXT, p_sort INT, p_icon TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE v_parent UUID;
BEGIN
  IF p_parent IS NOT NULL THEN
    SELECT id INTO v_parent FROM public.menu_items WHERE menu_code = p_parent;
  END IF;
  INSERT INTO public.menu_items (menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, menu_icon, is_active, is_visible)
  VALUES (p_code, p_label, 'Project Planner (v1239)', p_route, v_parent, CASE WHEN p_parent IS NULL THEN 1 ELSE 2 END, p_sort, p_icon, TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label, route_path = EXCLUDED.route_path, parent_menu_id = EXCLUDED.parent_menu_id,
    menu_level = EXCLUDED.menu_level, sort_order = EXCLUDED.sort_order, menu_icon = EXCLUDED.menu_icon,
    is_active = TRUE, is_visible = TRUE, is_deleted = FALSE, updated_at = NOW();
END $$;

-- Top level
SELECT pg_temp.pln_menu('pln_home',      'Home',            '/app',                  NULL, 10,  'home');
SELECT pg_temp.pln_menu('pln_projects',  'Projects',        '/app/projects',         NULL, 20,  'folder');
SELECT pg_temp.pln_menu('pln_schedule',  'Schedule',        NULL,                    NULL, 30,  'calendar');
SELECT pg_temp.pln_menu('pln_setup',     'Project setup',   NULL,                    NULL, 40,  'settings');
SELECT pg_temp.pln_menu('pln_hub',       'Planning Hub',    NULL,                    NULL, 50,  'lightbulb');
SELECT pg_temp.pln_menu('pln_workload',  'Workload',        '/app/schedule/workload', NULL, 60, 'users');
SELECT pg_temp.pln_menu('pln_timesheets','Timesheets',      NULL,                    NULL, 70,  'clock');
SELECT pg_temp.pln_menu('pln_exchange',  'Import / export', '/app/schedule/exchange', NULL, 80, 'exchange');
SELECT pg_temp.pln_menu('pln_settings',  'Settings',        NULL,                    NULL, 90,  'settings');

-- Schedule
SELECT pg_temp.pln_menu('pln_schedule_tasks',         'Plan grid',     '/app/schedule/activities',    'pln_schedule', 10, 'layout-grid');
SELECT pg_temp.pln_menu('pln_schedule_gantt',         'Gantt',         '/app/schedule/gantt',         'pln_schedule', 20, 'bar-chart-2');
SELECT pg_temp.pln_menu('pln_schedule_board',         'Board',         '/app/schedule/board',         'pln_schedule', 30, 'layout-grid');
SELECT pg_temp.pln_menu('pln_schedule_calendar',      'Calendar',      '/app/schedule/due-dates',     'pln_schedule', 40, 'calendar');
SELECT pg_temp.pln_menu('pln_schedule_network',       'Network',       '/app/schedule/network',       'pln_schedule', 50, 'bar-chart-2');
SELECT pg_temp.pln_menu('pln_schedule_critical_path', 'Critical path', '/app/schedule/critical-path', 'pln_schedule', 60, 'bar-chart-2');
SELECT pg_temp.pln_menu('pln_schedule_look_ahead',    'Look-ahead',    '/app/schedule/look-ahead',    'pln_schedule', 70, 'calendar');
SELECT pg_temp.pln_menu('pln_schedule_variance',      'Variance',      '/app/schedule/variance',      'pln_schedule', 80, 'bar-chart-2');
SELECT pg_temp.pln_menu('pln_schedule_milestones',    'Milestones',    '/app/schedule/milestones',    'pln_schedule', 90, 'calendar');
SELECT pg_temp.pln_menu('pln_schedule_baselines',     'Baselines',     '/app/schedule/baselines',     'pln_schedule', 100, 'bar-chart-2');

-- Project setup
SELECT pg_temp.pln_menu('pln_setup_calendars',    'Calendars & exceptions', '/app/schedule/calendar',     'pln_setup', 10, 'calendar');
SELECT pg_temp.pln_menu('pln_setup_dependencies', 'Dependencies',           '/app/schedule/dependencies', 'pln_setup', 20, 'exchange');
SELECT pg_temp.pln_menu('pln_setup_members',      'Members & invitations',  '/app/members',               'pln_setup', 30, 'users');

-- Planning Hub
SELECT pg_temp.pln_menu('pln_hub_overview',     'Overview',            '/app/planning',              'pln_hub', 10,  'lightbulb');
SELECT pg_temp.pln_menu('pln_hub_intelligence', 'Intelligence',        '/app/planning/intelligence', 'pln_hub', 20,  'lightbulb');
SELECT pg_temp.pln_menu('pln_hub_scenarios',    'Scenarios',           '/app/planning/scenarios',    'pln_hub', 30,  'lightbulb');
SELECT pg_temp.pln_menu('pln_hub_pbs',          'Product breakdown',   '/app/planning/pbs',          'pln_hub', 40,  'layout-grid');
SELECT pg_temp.pln_menu('pln_hub_health',       'Plan health',         '/app/planning/health',       'pln_hub', 50,  'bar-chart-2');
SELECT pg_temp.pln_menu('pln_hub_ai',           'AI plan draft',       '/app/planning/ai',           'pln_hub', 60,  'lightbulb');
SELECT pg_temp.pln_menu('pln_hub_executive',    'Executive view',      '/app/planning/executive',    'pln_hub', 70,  'bar-chart-2');
SELECT pg_temp.pln_menu('pln_hub_recovery',     'Recovery',            '/app/planning/recovery',     'pln_hub', 80,  'lightbulb');
SELECT pg_temp.pln_menu('pln_hub_confidence',   'Confidence forecast', '/app/planning/confidence',   'pln_hub', 90,  'bar-chart-2');
SELECT pg_temp.pln_menu('pln_hub_governance',   'Governance gates',    '/app/planning/governance',   'pln_hub', 100, 'settings');
SELECT pg_temp.pln_menu('pln_hub_microplans',   'Micro-plans',         '/app/planning/microplans',   'pln_hub', 110, 'layout-grid');
SELECT pg_temp.pln_menu('pln_hub_collisions',   'Portfolio collisions','/app/planning/collisions',   'pln_hub', 120, 'bar-chart-2');

-- Timesheets
SELECT pg_temp.pln_menu('pln_timesheets_my_week', 'My week', '/app/schedule/time', 'pln_timesheets', 10, 'clock');

-- Settings
SELECT pg_temp.pln_menu('pln_settings_workspace',          'Workspace',             '/app/settings',                       'pln_settings', 10, 'settings');
SELECT pg_temp.pln_menu('pln_settings_intelligence_rules', 'Intelligence rules',    '/app/planning/intelligence-rules',    'pln_settings', 20, 'settings');
SELECT pg_temp.pln_menu('pln_settings_governance_rules',   'Governance-gate rules', '/app/planning/governance-rules',      'pln_settings', 30, 'settings');
SELECT pg_temp.pln_menu('pln_settings_billing',            'Billing',               '/app/billing',                        'pln_settings', 40, 'settings');
SELECT pg_temp.pln_menu('pln_settings_upgrade',            'Upgrade',               '/app/upgrade',                        'pln_settings', 50, 'settings');

DO $$
DECLARE v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.menu_items WHERE menu_code LIKE 'pln\_%' AND COALESCE(is_deleted, FALSE) = FALSE;
  RAISE NOTICE 'v1254 applied: % pln_ menu rows', v_count;
END $$;
