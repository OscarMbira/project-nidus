-- =============================================================================
-- v682: Menu Revamp – Simulator menu hierarchy (all 5 Simulator roles)
-- Prerequisites: v681 must be applied
-- Source of truth: Documentation/Role_Menu_Structures.md §5.4–5.7
--
-- All sim menu_codes use sim_ prefix.
-- "Practice" prefix used on all labels to distinguish from Platform.
-- =============================================================================

-- =============================================================================
-- PRE-FLIGHT: Hard-delete any previously soft-deleted sim_ rows
-- v680 soft-deleted all menu_items but the unique constraint on menu_code still
-- blocks re-insert of the same codes.  Remove them now so this script is
-- fully idempotent.  role_menu_items are handled first to respect FK order.
-- =============================================================================

-- 1. Remove role_menu_items that reference any sim_ row.
DELETE FROM public.role_menu_items
WHERE menu_item_id IN (
    SELECT id FROM public.menu_items WHERE LEFT(menu_code, 4) = 'sim_'
);

-- 2. Sever ALL inbound parent_menu_id pointers into the sim_ set,
--    regardless of the referencing row's own menu_code prefix.
--    This handles cross-prefix references left by earlier migrations
--    (e.g. a platform row whose parent happens to be a sim_ section header).
UPDATE public.menu_items
SET    parent_menu_id = NULL
WHERE  parent_menu_id IN (
    SELECT id FROM public.menu_items WHERE LEFT(menu_code, 4) = 'sim_'
);

-- 3. Delete sim_ rows deepest-level first to clear the self-referential FK.
DELETE FROM public.menu_items WHERE LEFT(menu_code, 4) = 'sim_' AND menu_level >= 3;
DELETE FROM public.menu_items WHERE LEFT(menu_code, 4) = 'sim_' AND menu_level =  2;
DELETE FROM public.menu_items WHERE LEFT(menu_code, 4) = 'sim_';

-- =============================================================================
-- ══ SIMULATOR SECTION HEADERS ═════════════════════════════════════════════════
-- =============================================================================

INSERT INTO public.menu_items
  (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'sim_sec_live',          'Live Simulation',                  NULL, NULL, 1,  5,  'universal',  'play-circle',       TRUE, TRUE, NOW(), NOW()),
  (gen_random_uuid(), 'sim_sec_exec',          'Executive Overview',               NULL, NULL, 1, 10,  'universal',  'layout-dashboard',  TRUE, TRUE, NOW(), NOW()),
  (gen_random_uuid(), 'sim_sec_proj_delivery', 'Practice Project Delivery',        NULL, NULL, 1, 20,  'universal',  'folder-kanban',     TRUE, TRUE, NOW(), NOW()),
  (gen_random_uuid(), 'sim_sec_structured',    '[S] Practice – Structured',        NULL, NULL, 1, 30,  'structured', 'shield',            TRUE, TRUE, NOW(), NOW()),
  (gen_random_uuid(), 'sim_sec_pmbok',         '[P] Practice – PMBOK',             NULL, NULL, 1, 40,  'pmbok',      'clipboard-list',    TRUE, TRUE, NOW(), NOW()),
  (gen_random_uuid(), 'sim_sec_agile',         '[A] Practice – Agile & Lean',      NULL, NULL, 1, 50,  'agile',      'zap',               TRUE, TRUE, NOW(), NOW()),
  (gen_random_uuid(), 'sim_sec_reporting',     'Practice Reporting & Intelligence',NULL, NULL, 1, 60,  'universal',  'bar-chart',         TRUE, TRUE, NOW(), NOW()),
  (gen_random_uuid(), 'sim_sec_workflows',     'Practice Workflows & Governance',  NULL, NULL, 1, 70,  'universal',  'git-branch',        TRUE, TRUE, NOW(), NOW()),
  (gen_random_uuid(), 'sim_sec_templates',     'Practice Process Templates',       NULL, NULL, 1, 80,  'universal',  'layers',            TRUE, TRUE, NOW(), NOW()),
  (gen_random_uuid(), 'sim_sec_knowledge',     'Practice Knowledge & Operations',  NULL, NULL, 1, 90,  'universal',  'bookmark',          TRUE, TRUE, NOW(), NOW()),
  (gen_random_uuid(), 'sim_sec_universal',     'Universal Practice',               NULL, NULL, 1, 10,  'universal',  'layout-dashboard',  TRUE, TRUE, NOW(), NOW()),
  (gen_random_uuid(), 'sim_sec_cross_fw',      'Practice Cross-Framework',         NULL, NULL, 1, 90,  NULL,         'grid',              TRUE, TRUE, NOW(), NOW()),
  (gen_random_uuid(), 'sim_sec_personal',      'Personal Practice Workspace',      NULL, NULL, 1, 10,  'universal',  'user',              TRUE, TRUE, NOW(), NOW()),
  (gen_random_uuid(), 'sim_sec_learning',      'Learning Hub',                     NULL, NULL, 1,  5,  'universal',  'graduation-cap',    TRUE, TRUE, NOW(), NOW()),
  (gen_random_uuid(), 'sim_sec_scenarios',     'Scenarios & Practice',             NULL, NULL, 1, 30,  'universal',  'map',               TRUE, TRUE, NOW(), NOW()),
  (gen_random_uuid(), 'sim_sec_subscription',  'Subscription & Upgrade',           NULL, NULL, 1, 80,  'universal',  'credit-card',       TRUE, TRUE, NOW(), NOW()),
  (gen_random_uuid(), 'sim_sec_system_admin',  'Simulator System Administration',  NULL, NULL, 1,130,  'universal',  'settings-2',        TRUE, TRUE, NOW(), NOW());

-- =============================================================================
-- ══ LIVE SIMULATION (all sim roles) ═══════════════════════════════════════════
-- =============================================================================

WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_sec_live' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('sim_start_new_run',      'Start New Run',           '/simulator',                  10, 'play'),
  ('sim_active_run',         'Active Run Dashboard',    '/simulator/active-run',       20, 'activity'),
  ('sim_event_inbox',        'Event Inbox',             '/simulator/events',           30, 'inbox'),
  ('sim_evm_dashboard',      'EVM Dashboard',           '/simulator/evm',              40, 'trending-up'),
  ('sim_run_history',        'My Run History',          '/simulator/history',          50, 'clock')
) AS v(mc, ml, rp, so, ic);

-- =============================================================================
-- ══ SIMULATOR PMO: EXECUTIVE OVERVIEW ════════════════════════════════════════
-- =============================================================================

WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_sec_exec' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('sim_pmo_dashboard',        'Practice Dashboard',        '/simulator/dashboard',                10, 'layout-dashboard'),
  ('sim_grp_pmo_portfolio',    'Practice Portfolio',         NULL,                                 20, 'briefcase'),
  ('sim_grp_pmo_programme',    'Practice Programme',         NULL,                                 30, 'layers'),
  ('sim_pmo_plan_intel',       'Planning Intelligence',      '/simulator/planning/intelligence',   40, 'brain')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_grp_pmo_portfolio' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('sim_pmo_portfolio_deps',      'Portfolio Dependencies', '/simulator/portfolio/dependencies',  10, 'git-merge'),
  ('sim_pmo_portfolio_collisions','Portfolio Collisions',   '/simulator/portfolio/collisions',    20, 'alert-triangle')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_grp_pmo_programme' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('sim_pmo_programme_mgmt',    'Programme Management', '/simulator/programme',         10, 'layers'),
  ('sim_pmo_benefits_mgmt',     'Benefits Management',  '/simulator/programme/benefits',20, 'trending-up')
) AS v(mc, ml, rp, so, ic);

-- =============================================================================
-- ══ SIMULATOR PMO: PRACTICE PROJECT DELIVERY ══════════════════════════════════
-- =============================================================================

WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_sec_proj_delivery' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('sim_pmo_practice_projects', 'Practice Projects',       '/simulator/practice-projects',  10, 'folder'),
  ('sim_grp_pmo_oversight',     'Practice Project Oversight', NULL,                          20, 'eye')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_grp_pmo_oversight' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('sim_pmo_risk_reg',     'Risk Register',             '/simulator/practice-risks',      10, 'alert-octagon'),
  ('sim_pmo_issue_reg',    'Issue Register',            '/simulator/practice-issues',     20, 'alert-circle'),
  ('sim_pmo_quality_reg',  'Quality Register',          '/simulator/practice-quality',    30, 'check-square'),
  ('sim_pmo_lessons',      'Lessons Log',               '/simulator/practice-lessons',    40, 'book'),
  ('sim_pmo_delay_reg',    'Delay Register / Templates','/simulator/delays',              50, 'clock'),
  ('sim_pmo_scope',        'Scope Oversight',           '/simulator/scope',               60, 'maximize'),
  ('sim_pmo_schedule',     'Schedule Oversight',        '/simulator/schedule',            70, 'calendar'),
  ('sim_pmo_change_reg',   'Change Register',           '/simulator/change',              80, 'git-commit')
) AS v(mc, ml, rp, so, ic);

-- =============================================================================
-- ══ SIMULATOR [S] STRUCTURED ══════════════════════════════════════════════════
-- =============================================================================

WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_sec_structured' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, 'structured', v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('sim_grp_pmo_initiation', 'Practice Initiation Hub',        NULL, 10, 'sunrise'),
  ('sim_grp_pmo_gov',        'Practice Governance & Standards', NULL, 20, 'shield')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_grp_pmo_initiation' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'structured', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('sim_pmo_mandates',          'Practice Mandates',               '/simulator/practice-mandates',          10, 'file-text'),
  ('sim_pmo_briefs',            'Practice Briefs',                 '/simulator/practice-briefs',            20, 'file'),
  ('sim_pmo_business_cases',    'Practice Business Cases',         '/simulator/practice-business-cases',    30, 'briefcase'),
  ('sim_pmo_pids',              'Practice PIDs',                   '/simulator/practice-pids',              40, 'clipboard'),
  ('sim_pmo_benefits_rp',       'Practice Benefits Review Plans',  '/simulator/practice-benefits-review-plan',50,'trending-up')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_grp_pmo_gov' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'structured', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('sim_pmo_cms',      'Communication Mgmt Strategy',  '/simulator/practice-cms',        10, 'message-circle'),
  ('sim_pmo_conf_ms',  'Configuration Mgmt Strategy',  '/simulator/practice-config-ms',  20, 'settings'),
  ('sim_pmo_qms',      'Quality Mgmt Strategy',         '/simulator/practice-qms',        30, 'check-circle'),
  ('sim_pmo_rms',      'Risk Mgmt Strategy',            '/simulator/practice-rms',        40, 'shield-alert'),
  ('sim_pmo_itto',     'ITTO Templates / Drafts',       '/simulator/itto',                50, 'git-branch'),
  ('sim_pmo_eef',      'Enterprise Environmental Factors','/simulator/eef',               60, 'globe')
) AS v(mc, ml, rp, so, ic);

-- =============================================================================
-- ══ SIMULATOR [P] PMBOK ═══════════════════════════════════════════════════════
-- =============================================================================

WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_sec_pmbok' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, 'pmbok', v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('sim_grp_pmo_process_groups', 'Practice Process Group Forms', NULL, 10, 'clipboard-list')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_grp_pmo_process_groups' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'pmbok', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('sim_pmo_p_initiating', 'Initiating',               '/simulator/process-group-forms?group=initiating', 10, 'play-circle'),
  ('sim_pmo_p_planning',   'Planning',                 '/simulator/process-group-forms?group=planning',   20, 'edit'),
  ('sim_pmo_p_executing',  'Executing',                '/simulator/process-group-forms?group=executing',  30, 'zap'),
  ('sim_pmo_p_mc',         'Monitoring & Controlling', '/simulator/process-group-forms?group=monitoring', 40, 'activity'),
  ('sim_pmo_p_closing',    'Closing',                  '/simulator/process-group-forms?group=closing',    50, 'check-circle')
) AS v(mc, ml, rp, so, ic);

-- =============================================================================
-- ══ SIMULATOR [A] AGILE ═══════════════════════════════════════════════════════
-- =============================================================================

WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_sec_agile' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, 'agile', v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('sim_grp_agile_tools',    'Practice Agile & Lean Tools', NULL, 10, 'zap'),
  ('sim_grp_agile_delivery', 'Practice Agile Delivery',     NULL, 20, 'send'),
  ('sim_grp_agile_metrics',  'Practice Agile Metrics',      NULL, 30, 'bar-chart-2')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_grp_agile_tools' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'agile', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('sim_a_scrum_of_scrums', 'Scrum of Scrums',  '/simulator/scrum-of-scrums',    10, 'users'),
  ('sim_a_vsm',             'Value Stream Map', '/simulator/value-stream-map',   20, 'activity'),
  ('sim_a_kaizen',          'Kaizen Board',      '/simulator/kaizen-board',       30, 'trello')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_grp_agile_delivery' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'agile', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('sim_a_story_map', 'Practice Story Map', '/simulator/story-map', 10, 'map-pin'),
  ('sim_a_releases',  'Releases',           '/simulator/releases',  20, 'tag')
) AS v(mc, ml, rp, so, ic);

-- =============================================================================
-- ══ SIMULATOR REPORTING, WORKFLOWS, TEMPLATES, KNOWLEDGE (PMO) ═══════════════
-- =============================================================================

-- Reporting
WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_sec_reporting' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('sim_pmo_reporting',    'Practice Reporting & Assurance', '/simulator/reports',             10, 'file-text'),
  ('sim_pmo_financial',    'Practice Financial Management',  '/simulator/financial-reports',   20, 'dollar-sign')
) AS v(mc, ml, rp, so, ic);

-- Workflows
WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_sec_workflows' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('sim_pmo_workflows',     'Practice Workflows & Approvals',       '/simulator/authorisation/queue',    10, 'git-branch'),
  ('sim_pmo_auth_lifecycle','Practice Authorisation & Lifecycle',   '/simulator/authorisation/dashboard',20, 'lock'),
  ('sim_pmo_quality_wf',    'Practice Quality & Testing',           '/simulator/testing',                30, 'check-square')
) AS v(mc, ml, rp, so, ic);

-- Templates
WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_sec_templates' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('sim_pmo_process_templates','Practice Process Templates (Hub)', '/simulator/templates',              10, 'layers')
) AS v(mc, ml, rp, so, ic);

-- Knowledge
WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_sec_knowledge' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('sim_pmo_knowledge',    'Practice Knowledge & Assets', '/simulator/knowledge',             10, 'bookmark'),
  ('sim_pmo_procurement',  'Practice Procurement',         '/simulator/procurement',           20, 'shopping-cart'),
  ('sim_pmo_email',        'Practice Email & Notifications','/simulator/email-settings',       30, 'mail'),
  ('sim_pmo_admin',        'Practice Administration',      '/simulator/admin/settings',        40, 'settings')
) AS v(mc, ml, rp, so, ic);

-- =============================================================================
-- ══ SIMULATOR SYSTEM ADMINISTRATION (simulator_admin only) ════════════════════
-- =============================================================================

WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_sec_system_admin' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('sim_sys_platform_settings',  'Platform Settings',        '/admin/settings',                        10, 'settings-2'),
  ('sim_sys_pwa',                'PWA Settings',             '/admin/pwa-settings',                    20, 'smartphone'),
  ('sim_sys_subscription',       'Subscription & Billing',   '/platform/subscription',                 30, 'credit-card'),
  ('sim_sys_branding',           'Branding & Identity',      '/platform/organisation/branding',        40, 'image'),
  ('sim_grp_scenario_mgmt',      'Scenario Management',       NULL,                                    50, 'map'),
  ('sim_sys_user_mgmt',          'User Management',           '/simulator/admin/users',                60, 'users'),
  ('sim_sys_leaderboard_admin',  'Leaderboard Administration','/simulator/admin/leaderboard',          70, 'trophy'),
  ('sim_sys_cert_admin',         'Certificate Administration','/simulator/admin/certificates',         80, 'award')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_grp_scenario_mgmt' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('sim_admin_all_scenarios',   'All Scenarios',        '/simulator/admin/scenarios',            10, 'list'),
  ('sim_admin_publish',         'Publish / Unpublish',  '/simulator/admin/scenarios',            20, 'toggle-right'),
  ('sim_admin_scenario_analytics','Scenario Analytics', '/simulator/admin/scenarios/analytics',  30, 'pie-chart')
) AS v(mc, ml, rp, so, ic);

-- =============================================================================
-- ══ SIMULATOR PM LAYOUT: UNIVERSAL PRACTICE ═══════════════════════════════════
-- sim_project_manager
-- =============================================================================

WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_sec_universal' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('sim_pm_dashboard',        'Practice Dashboard',      '/simulator/dashboard',             10, 'layout-dashboard'),
  ('sim_pm_ai',               'AI Workspace',            '/simulator/ai-workspace',          15, 'cpu'),
  ('sim_grp_pm_projects',     'Practice Projects',        NULL,                              20, 'folder'),
  ('sim_grp_pm_teams',        'Practice Teams',           NULL,                              30, 'users'),
  ('sim_pm_calendar',         'Practice Calendar',       '/simulator/calendar',              40, 'calendar'),
  ('sim_grp_pm_controls',     'Practice Controls & Registers', NULL,                         50, 'shield-alert'),
  ('sim_pm_stakeholders',     'Practice Stakeholders',   '/simulator/practice-stakeholders', 60, 'user-check'),
  ('sim_pm_quality',          'Practice Quality & Testing','/simulator/testing',             70, 'check-circle'),
  ('sim_pm_financial',        'Practice Financial Mgmt', '/simulator/expenses/my',           80, 'dollar-sign')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_grp_pm_projects' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('sim_pm_my_projects',      'My Practice Projects',   '/simulator/practice-projects',     10, 'folder'),
  ('sim_pm_create_project',   'Create Practice Project','/simulator/practice-projects/create',20,'plus-circle'),
  ('sim_pm_manage_members',   'Manage Members',         '/simulator/practice-members',      30, 'user-check'),
  ('sim_pm_tasks',            'Practice Tasks',         '/simulator/practice-tasks',        40, 'check-square')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_grp_pm_teams' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('sim_pm_practice_teams',   'Practice Teams',    '/simulator/practice-teams',    10, 'users'),
  ('sim_pm_my_team',          'My Practice Team',  '/simulator/practice-teams',    20, 'user')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_grp_pm_controls' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('sim_pm_risk_reg',    'Risk Register',      '/simulator/practice-risks',      10, 'alert-octagon'),
  ('sim_pm_issue_reg',   'Issue Register',     '/simulator/practice-issues',     20, 'alert-circle'),
  ('sim_pm_quality_reg', 'Quality Register',   '/simulator/practice-quality',    30, 'check-square'),
  ('sim_pm_delay_reg',   'Delay Register',     '/simulator/delays',              40, 'clock'),
  ('sim_pm_lessons',     'Lessons Log',        '/simulator/practice-lessons',    50, 'book'),
  ('sim_pm_cmdb',        'Configuration Items','/simulator/practice-config-items',60,'settings')
) AS v(mc, ml, rp, so, ic);

-- =============================================================================
-- ══ SIMULATOR PM [S] STRUCTURED ═══════════════════════════════════════════════
-- =============================================================================

WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_sec_structured' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, 'structured', v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('sim_grp_pm_pre_project',    'Practice Pre-Project & Initiation', NULL, 10, 'sunrise'),
  ('sim_grp_pm_proj_controls',  'Practice Project Controls',          NULL, 20, 'shield'),
  ('sim_grp_pm_gov_standards',  'Practice Governance & Standards',    NULL, 30, 'book'),
  ('sim_grp_pm_del_reporting',  'Practice Delivery Reporting',        NULL, 40, 'file-text')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_grp_pm_pre_project' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'structured', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('sim_pm_s_mandate',       'Practice Mandate',      '/simulator/practice-mandates',       10, 'file-text'),
  ('sim_pm_s_brief',         'Practice Brief',        '/simulator/practice-briefs',         20, 'file'),
  ('sim_pm_s_business_case', 'Practice Business Case','/simulator/practice-business-cases', 30, 'briefcase')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_grp_pm_proj_controls' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'structured', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('sim_pm_s_pid',           'Practice PID',                 '/simulator/practice-pids',                   10, 'clipboard'),
  ('sim_pm_s_benefits_rp',   'Practice Benefits Review Plan','/simulator/practice-benefits-review-plan',   20, 'trending-up'),
  ('sim_pm_s_work_packages', 'Practice Work Packages',       '/simulator/practice-work-packages',          30, 'package'),
  ('sim_pm_s_prod_desc',     'Practice Product Descriptions','/simulator/practice-product-descriptions',   40, 'box'),
  ('sim_pm_s_ppd',           'Practice PPD',                 '/simulator/practice-ppd',                    50, 'file-plus')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_grp_pm_gov_standards' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'structured', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('sim_pm_s_cms',      'Communication Mgmt Strategy',  '/simulator/practice-cms',        10, 'message-circle'),
  ('sim_pm_s_conf_ms',  'Configuration Mgmt Strategy',  '/simulator/practice-config-ms',  20, 'settings'),
  ('sim_pm_s_qms',      'Quality Mgmt Strategy',         '/simulator/practice-qms',        30, 'check-circle'),
  ('sim_pm_s_rms',      'Risk Mgmt Strategy',            '/simulator/practice-rms',        40, 'shield-alert')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_grp_pm_del_reporting' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'structured', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('sim_pm_s_checkpoint', 'Checkpoint Reports',  '/simulator/checkpoint-reports',  10, 'flag'),
  ('sim_pm_s_highlight',  'Highlight Reports',   '/simulator/highlight-reports',   20, 'sun'),
  ('sim_pm_s_exception',  'Exception Reports',   '/simulator/exception-reports',   30, 'alert-triangle'),
  ('sim_pm_s_end_stage',  'End Stage Reports',   '/simulator/end-stage-reports',   40, 'flag'),
  ('sim_pm_s_end_project','End Project Report',  '/simulator/end-project-report',  50, 'award')
) AS v(mc, ml, rp, so, ic);

-- =============================================================================
-- ══ SIMULATOR PM [P] & [A] ════════════════════════════════════════════════════
-- =============================================================================

-- PM PMBOK
WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_sec_pmbok' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, 'pmbok', v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('sim_grp_pm_process_groups', 'Practice Process Group Forms', NULL, 10, 'clipboard-list')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_grp_pm_process_groups' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'pmbok', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('sim_pm_p_initiating',  'Initiating / Planning / Executing / M&C / Closing', '/simulator/process-group-forms', 10, 'clipboard-list'),
  ('sim_pm_p_drafts',      'Drafts',    '/simulator/process-group-forms/drafts',  20, 'file-minus'),
  ('sim_pm_p_approvals',   'Approvals', '/simulator/authorisation/queue',          30, 'thumbs-up')
) AS v(mc, ml, rp, so, ic);

-- PM Agile
WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_sec_agile' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, 'agile', v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('sim_grp_pm_agile_delivery',  'Practice Agile Delivery',   NULL, 10, 'send'),
  ('sim_pm_a_process_forms',     'Practice Agile Process Forms','/simulator/practice-scrum', 20, 'list'),
  ('sim_grp_pm_lean_tools',      'Practice Lean Tools',        NULL, 30, 'activity')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_grp_pm_agile_delivery' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'agile', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('sim_pm_a_story_map',   'Story Map',           '/simulator/story-map', 10, 'map-pin'),
  ('sim_pm_a_releases',    'Releases / Sprints',  '/simulator/releases',  20, 'tag')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_grp_pm_lean_tools' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'agile', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('sim_pm_a_vsm',    'Value Stream Map', '/simulator/value-stream-map', 10, 'activity'),
  ('sim_pm_a_kaizen', 'Kaizen Board',     '/simulator/kaizen-board',     20, 'trello')
) AS v(mc, ml, rp, so, ic);

-- =============================================================================
-- ══ SIMULATOR PM CROSS-FRAMEWORK ══════════════════════════════════════════════
-- =============================================================================

WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_sec_cross_fw' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, NULL, v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('sim_pm_xf_process_templates', 'Practice Process Templates',  '/simulator/templates',               10, 'layers'),
  ('sim_pm_xf_strategies',        'Practice Strategies',         '/simulator/practice-cms',            20, 'shield'),
  ('sim_grp_pm_xf_auth',          'Practice Authorisation',      NULL,                                 30, 'lock'),
  ('sim_pm_xf_lifecycle',         'Practice Lifecycle',          '/simulator/lifecycle',               40, 'refresh-cw'),
  ('sim_grp_pm_xf_scenarios',     'Scenarios',                   NULL,                                 50, 'map'),
  ('sim_pm_xf_learning',          'Learning Path',               '/simulator/learning-path',           60, 'book-open'),
  ('sim_pm_xf_leaderboard',       'Leaderboard',                 '/simulator/leaderboard',             70, 'trophy'),
  ('sim_pm_xf_certificates',      'Certificates',                '/simulator/exams/certificates',      80, 'award'),
  ('sim_pm_xf_profile',           'My Profile (Stats / Badges)', '/simulator/profile',                 90, 'user'),
  ('sim_pm_xf_settings',          'Settings',                    '/simulator/settings',               100, 'settings'),
  ('sim_pm_xf_notif_prefs',       'Notification Preferences',    '/simulator/notification-preferences',110,'bell')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_grp_pm_xf_auth' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, NULL, v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('sim_pm_pending_approval', 'Pending My Approval',  '/simulator/authorisation/queue',    10, 'inbox'),
  ('sim_pm_submitted',        'My Submitted Records', '/simulator/authorisation/submitted', 20, 'send')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_grp_pm_xf_scenarios' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, NULL, v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('sim_pm_browse_scenarios', 'Browse Scenarios',   '/simulator/scenarios',          10, 'list'),
  ('sim_pm_my_progress',      'My Progress',        '/simulator/profile/run-analytics',20,'trending-up')
) AS v(mc, ml, rp, so, ic);

-- =============================================================================
-- ══ SIMULATOR TM LAYOUT ═══════════════════════════════════════════════════════
-- sim_team_member
-- =============================================================================

WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_sec_personal' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('sim_tm_dashboard',        'Practice Dashboard',       '/simulator/dashboard',               10, 'layout-dashboard'),
  ('sim_grp_tm_tasks',        'My Practice Tasks',         NULL,                                20, 'check-square'),
  ('sim_tm_daily_log',        'My Practice Daily Log',    '/simulator/daily-log',               30, 'book-open'),
  ('sim_grp_tm_team',         'Practice Team',             NULL,                                40, 'users')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_grp_tm_tasks' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('sim_tm_task_board',    'Task Board',    '/simulator/practice-tasks/board',    10, 'trello'),
  ('sim_tm_task_list',     'Task List',     '/simulator/practice-tasks',          20, 'list'),
  ('sim_tm_task_calendar', 'Task Calendar', '/simulator/practice-tasks/calendar', 30, 'calendar')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_grp_tm_team' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('sim_tm_my_team',        'My Practice Team',    '/simulator/practice-teams',    10, 'users'),
  ('sim_tm_comms',          'Team Communications', '/simulator/comms',             20, 'message-square')
) AS v(mc, ml, rp, so, ic);

-- TM [S] and [A]
WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_sec_structured' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, 'structured', v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('sim_tm_s_work_packages','Assigned Practice Work Packages','/simulator/practice-work-packages',10,'package')
) AS v(mc, ml, rp, so, ic);

WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_sec_agile' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, 'agile', v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('sim_tm_sprint_tasks',   'My Practice Sprint Tasks',  '/simulator/sprint-tasks',  10, 'zap'),
  ('sim_tm_story_map_ro',   'Practice Story Map (read)', '/simulator/story-map',     20, 'map-pin')
) AS v(mc, ml, rp, so, ic);

-- TM cross-framework
WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_sec_cross_fw' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, NULL, v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('sim_grp_tm_auth',         'Practice Authorisation',      NULL,                                 10, 'lock'),
  ('sim_tm_scenarios_browse', 'Scenarios (browse only)',      '/simulator/scenarios',               20, 'list'),
  ('sim_tm_learning',         'Learning Path',                '/simulator/learning-path',           30, 'book-open'),
  ('sim_tm_leaderboard',      'Leaderboard',                  '/simulator/leaderboard',             40, 'trophy'),
  ('sim_tm_certificates',     'Certificates',                 '/simulator/exams/certificates',      50, 'award'),
  ('sim_tm_profile',          'My Profile',                   '/simulator/profile',                 60, 'user'),
  ('sim_tm_notif_prefs',      'Notification Preferences',     '/simulator/notification-preferences',70,'bell')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_grp_tm_auth' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, NULL, v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('sim_tm_submitted',      'My Submitted Records', '/simulator/authorisation/submitted', 10, 'send'),
  ('sim_tm_pending_appr',   'Pending My Approval',  '/simulator/authorisation/queue',     20, 'inbox')
) AS v(mc, ml, rp, so, ic);

-- =============================================================================
-- ══ SIMULATOR LEARNER (simulator_user) ════════════════════════════════════════
-- =============================================================================

-- Learning Hub
WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_sec_learning' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('sim_learner_dashboard',    'Dashboard (Learner)',    '/simulator/dashboard',           10, 'layout-dashboard'),
  ('sim_learner_ai',           'AI Workspace',           '/simulator/ai-workspace',        20, 'cpu'),
  ('sim_learner_learning_path','Learning Path',          '/simulator/learning-path',       30, 'book-open'),
  ('sim_learner_leaderboard',  'Leaderboard',            '/simulator/leaderboard',         40, 'trophy'),
  ('sim_learner_certs',        'Certificates',           '/simulator/exams/certificates',  50, 'award'),
  ('sim_grp_learner_profile',  'My Profile',              NULL,                            60, 'user'),
  ('sim_learner_settings',     'Settings',               '/simulator/settings',            70, 'settings')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_grp_learner_profile' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('sim_learner_my_stats',  'My Stats',            '/simulator/profile',         10, 'bar-chart'),
  ('sim_learner_badges',    'Badges & Achievements','/simulator/profile/badges', 20, 'award')
) AS v(mc, ml, rp, so, ic);

-- Scenarios & Practice
WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_sec_scenarios' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('sim_grp_learner_scenarios',  'Scenarios',                NULL,                           10, 'map'),
  ('sim_learner_prac_projects',  'Practice Projects (limited)','/simulator/practice-projects',20, 'folder')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_grp_learner_scenarios' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('sim_learner_browse_scenarios','Browse Scenarios',    '/simulator/scenarios',              10, 'list'),
  ('sim_learner_my_progress',     'My Progress',         '/simulator/profile/run-analytics', 20, 'trending-up'),
  ('sim_learner_custom_scenarios','Custom Scenarios',    '/simulator/custom-scenarios',       30, 'plus-square')
) AS v(mc, ml, rp, so, ic);

-- Learner [S]/[P]/[A] practice (scenario-scoped)
WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_sec_structured' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, 'structured', v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('sim_grp_learner_s_initiation','Practice Initiation (scenario-scoped)',NULL,10,'sunrise')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_grp_learner_s_initiation' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'structured', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('sim_learner_s_mandate',       'Practice Mandate',      '/simulator/practice-mandates',        10, 'file-text'),
  ('sim_learner_s_brief',         'Practice Brief',        '/simulator/practice-briefs',          20, 'file'),
  ('sim_learner_s_business_case', 'Practice Business Case','/simulator/practice-business-cases',  30, 'briefcase')
) AS v(mc, ml, rp, so, ic);

WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_sec_pmbok' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, 'pmbok', v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('sim_learner_p_process_groups','Practice Process Groups','/simulator/process-group-forms',10,'clipboard-list')
) AS v(mc, ml, rp, so, ic);

WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_sec_agile' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, 'agile', v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('sim_learner_a_tools','Practice Agile Tools','/simulator/practice-scrum',10,'zap')
) AS v(mc, ml, rp, so, ic);

-- Subscription & Upgrade (learner)
WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'sim_sec_subscription' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('sim_learner_upgrade',       'Upgrade to Premium',    '/trial/upgrade',                    10, 'arrow-up-circle'),
  ('sim_learner_marketplace',   'Scenario Marketplace',  '/simulator/scenarios/marketplace',  20, 'shopping-cart'),
  ('sim_learner_cert_exams',    'Certification Exams',   '/simulator/exams',                  30, 'award'),
  ('sim_learner_notif_prefs',   'Notification Preferences','/simulator/notification-preferences',40,'bell')
) AS v(mc, ml, rp, so, ic);
