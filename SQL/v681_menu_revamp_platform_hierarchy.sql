-- =============================================================================
-- v681: Menu Revamp – Platform menu hierarchy (all 15 Platform roles)
-- Prerequisites: v680 must be applied (clears old data, adds missing roles)
-- Source of truth: Documentation/Role_Menu_Structures.md
--
-- Structure:
--   Level 1 = Section headers (no route_path, container only)
--   Level 2 = Group items    (route_path optional)
--   Level 3 = Leaf items     (route_path required)
--
-- menu_code naming:
--   plat_sec_*   = section headers
--   plat_grp_*   = group / parent items
--   plat_*       = leaf items (no sec/grp prefix for brevity)
--
-- methodology values: 'structured' | 'pmbok' | 'agile' | 'universal' | NULL
-- NULL methodology = visible under all tracks (cross-framework / universal)
-- =============================================================================

-- =============================================================================
-- ══ PMO LAYOUT SECTIONS ══════════════════════════════════════════════════════
-- Used by: pmo_admin, system_admin, account_owner
-- =============================================================================

INSERT INTO public.menu_items
  (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
VALUES

-- ─── Section: Executive Overview ─────────────────────────────────────────────
(gen_random_uuid(), 'plat_sec_exec_overview',       'Executive Overview',             NULL, NULL, 1, 10,  'universal',  'layout-dashboard',  TRUE, TRUE, NOW(), NOW()),

-- ─── Section: Project Delivery ───────────────────────────────────────────────
(gen_random_uuid(), 'plat_sec_project_delivery',    'Project Delivery',               NULL, NULL, 1, 20,  'universal',  'folder-kanban',     TRUE, TRUE, NOW(), NOW()),

-- ─── Section: [S] Predictive – Structured ────────────────────────────────────
(gen_random_uuid(), 'plat_sec_structured',          '[S] Predictive – Structured',    NULL, NULL, 1, 30,  'structured', 'shield',            TRUE, TRUE, NOW(), NOW()),

-- ─── Section: [P] Predictive – PMBOK ─────────────────────────────────────────
(gen_random_uuid(), 'plat_sec_pmbok',               '[P] Predictive – PMBOK',         NULL, NULL, 1, 40,  'pmbok',      'clipboard-list',    TRUE, TRUE, NOW(), NOW()),

-- ─── Section: [A] Agile & Lean ───────────────────────────────────────────────
(gen_random_uuid(), 'plat_sec_agile',               '[A] Agile & Lean',               NULL, NULL, 1, 50,  'agile',      'zap',               TRUE, TRUE, NOW(), NOW()),

-- ─── Section: Reporting & Intelligence ───────────────────────────────────────
(gen_random_uuid(), 'plat_sec_reporting',           'Reporting & Intelligence',       NULL, NULL, 1, 60,  'universal',  'bar-chart',         TRUE, TRUE, NOW(), NOW()),

-- ─── Section: Workflows & Governance ─────────────────────────────────────────
(gen_random_uuid(), 'plat_sec_workflows',           'Workflows & Governance',         NULL, NULL, 1, 70,  'universal',  'git-branch',        TRUE, TRUE, NOW(), NOW()),

-- ─── Section: Process Templates ──────────────────────────────────────────────
(gen_random_uuid(), 'plat_sec_process_templates',   'Process Templates',              NULL, NULL, 1, 80,  'universal',  'layers',            TRUE, TRUE, NOW(), NOW()),

-- ─── Section: Knowledge & Operations ─────────────────────────────────────────
(gen_random_uuid(), 'plat_sec_knowledge',           'Knowledge & Operations',         NULL, NULL, 1, 90,  'universal',  'bookmark',          TRUE, TRUE, NOW(), NOW()),

-- ─── Section: People & Resources ─────────────────────────────────────────────
(gen_random_uuid(), 'plat_sec_people',              'People & Resources',             NULL, NULL, 1, 100, 'universal',  'users',             TRUE, TRUE, NOW(), NOW()),

-- ─── Section: Email & Notifications ──────────────────────────────────────────
(gen_random_uuid(), 'plat_sec_email',               'Email & Notifications',          NULL, NULL, 1, 110, 'universal',  'mail',              TRUE, TRUE, NOW(), NOW()),

-- ─── Section: Administration ─────────────────────────────────────────────────
(gen_random_uuid(), 'plat_sec_admin',               'Administration',                 NULL, NULL, 1, 120, 'universal',  'settings',          TRUE, TRUE, NOW(), NOW()),

-- ─── Section: System Administration (system_admin only) ──────────────────────
(gen_random_uuid(), 'plat_sec_system_admin',        'System Administration',          NULL, NULL, 1, 130, 'universal',  'settings-2',        TRUE, TRUE, NOW(), NOW()),

-- ─── Section: Account & Subscription (account_owner only) ────────────────────
(gen_random_uuid(), 'plat_sec_account',             'Account & Subscription',         NULL, NULL, 1, 125, 'universal',  'credit-card',       TRUE, TRUE, NOW(), NOW()),

-- =============================================================================
-- ══ PM LAYOUT SECTIONS ═══════════════════════════════════════════════════════
-- Used by: project_manager, portfolio_manager, programme_manager, project_sponsor,
--          executive, project_board_member, pm_project_assurance, pm_quality_assurance,
--          stakeholder, viewer, portfolio_manager
-- =============================================================================

(gen_random_uuid(), 'plat_sec_universal',           'Universal',                      NULL, NULL, 1, 10,  'universal',  'layout-dashboard',  TRUE, TRUE, NOW(), NOW()),
(gen_random_uuid(), 'plat_sec_cross_fw',            'Cross-Framework',                NULL, NULL, 1, 90,  NULL,         'grid',              TRUE, TRUE, NOW(), NOW()),

-- PM role-specific sections
(gen_random_uuid(), 'plat_sec_approvals_gov',       'Approvals & Governance',         NULL, NULL, 1, 50,  'universal',  'check-circle',      TRUE, TRUE, NOW(), NOW()),
(gen_random_uuid(), 'plat_sec_quality_assurance',   'Quality & Assurance',            NULL, NULL, 1, 30,  'universal',  'shield-check',      TRUE, TRUE, NOW(), NOW()),
(gen_random_uuid(), 'plat_sec_reporting_controls',  'Reporting & Controls',           NULL, NULL, 1, 40,  'universal',  'bar-chart-2',       TRUE, TRUE, NOW(), NOW()),
(gen_random_uuid(), 'plat_sec_quality_testing',     'Quality & Testing',              NULL, NULL, 1, 30,  'universal',  'test-tube',         TRUE, TRUE, NOW(), NOW()),
(gen_random_uuid(), 'plat_sec_comm_reporting',      'Communication & Reporting',      NULL, NULL, 1, 30,  'universal',  'message-square',    TRUE, TRUE, NOW(), NOW()),

-- ─── Section: Approvals & Reporting (board_member) ───────────────────────────
(gen_random_uuid(), 'plat_sec_approvals_reporting', 'Approvals & Reporting',          NULL, NULL, 1, 40,  'universal',  'check-square',      TRUE, TRUE, NOW(), NOW()),

-- =============================================================================
-- ══ TM LAYOUT SECTIONS ═══════════════════════════════════════════════════════
-- Used by: pm_team_member, pm_team_manager
-- =============================================================================

(gen_random_uuid(), 'plat_sec_personal',            'Personal Workspace',             NULL, NULL, 1, 10,  'universal',  'user',              TRUE, TRUE, NOW(), NOW()),
(gen_random_uuid(), 'plat_sec_team_section',        'Team',                           NULL, NULL, 1, 20,  'universal',  'users',             TRUE, TRUE, NOW(), NOW()),
(gen_random_uuid(), 'plat_sec_delivery_artefacts',  'Delivery Artefacts',             NULL, NULL, 1, 30,  'universal',  'package',           TRUE, TRUE, NOW(), NOW()),
(gen_random_uuid(), 'plat_sec_team_mgmt',           'Team Management',                NULL, NULL, 1, 40,  'universal',  'briefcase',         TRUE, TRUE, NOW(), NOW()),
(gen_random_uuid(), 'plat_sec_delivery',            'Delivery',                       NULL, NULL, 1, 50,  'universal',  'truck',             TRUE, TRUE, NOW(), NOW());

-- =============================================================================
-- ══ LEVEL 2 + 3: PMO EXECUTIVE OVERVIEW ══════════════════════════════════════
-- =============================================================================

WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_sec_exec_overview' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('plat_dashboard_pmo',     'Dashboard',             '/platform/dashboard',              10, 'layout-dashboard'),
  ('plat_grp_portfolio',     'Portfolio',             NULL,                               20, 'briefcase'),
  ('plat_grp_programme',     'Programme',             NULL,                               30, 'layers'),
  ('plat_grp_plan_intel',    'Planning Intelligence', NULL,                               40, 'brain')
) AS v(mc, ml, rp, so, ic);

-- Portfolio children
WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_portfolio' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('plat_portfolio_overview',      'Portfolio Overview',           '/platform/portfolio',                   10, 'briefcase'),
  ('plat_portfolio_dependencies',  'Portfolio Dependencies',       '/platform/portfolio/dependencies',      20, 'git-merge'),
  ('plat_portfolio_collisions',    'Portfolio Collisions',         '/pmo/planning/collisions',              30, 'alert-triangle'),
  ('plat_portfolio_map',           'Portfolio Map',                '/pmo/strategy/portfolio-map',           40, 'map'),
  ('plat_portfolio_alignment',     'Strategic Alignment',          '/platform/strategy/alignment',          50, 'target'),
  ('plat_portfolio_benefits',      'Benefits Pipeline',            '/platform/benefits',                    60, 'trending-up')
) AS v(mc, ml, rp, so, ic);

-- Programme children
WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_programme' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('plat_programme_management',    'Programme Management',         '/platform/programme',                   10, 'layers'),
  ('plat_programme_benefits',      'Benefits Management',          '/platform/programme/benefits',          20, 'trending-up')
) AS v(mc, ml, rp, so, ic);

-- Planning Intelligence children
WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_plan_intel' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('plat_plan_intel_hub',      'Planning Hub',                   '/pmo/planning',                          10, 'compass'),
  ('plat_plan_intel_rules',    'Intelligence Rules',             '/pmo/planning/intelligence-rules',       20, 'cpu'),
  ('plat_plan_gov_rules',      'Governance Rules Configuration', '/pmo/planning/governance-rules',         30, 'sliders')
) AS v(mc, ml, rp, so, ic);

-- =============================================================================
-- ══ LEVEL 2 + 3: PMO PROJECT DELIVERY ════════════════════════════════════════
-- =============================================================================

WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_sec_project_delivery' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('plat_grp_projects',      'Projects',          NULL, 10, 'folder'),
  ('plat_grp_oversight',     'Project Oversight', NULL, 20, 'eye')
) AS v(mc, ml, rp, so, ic);

-- Projects children
WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_projects' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('plat_project_dashboard',   'Project Dashboard',          '/platform/dashboard',              10, 'layout-dashboard'),
  ('plat_my_projects',         'My Projects',                '/platform/projects',               20, 'folder'),
  ('plat_all_projects',        'All Projects',               '/platform/projects',               30, 'folders'),
  ('plat_create_project',      'Create Project / Quick Create', '/platform/projects/create',     40, 'plus-circle'),
  ('plat_archived_projects',   'Archived Projects',          '/platform/projects/archived',      50, 'archive'),
  ('plat_onhold_projects',     'On Hold / Drafts',           '/platform/projects/on-hold',       60, 'pause-circle'),
  ('plat_members_roles',       'Members & Roles',            '/platform/project-users',          70, 'user-check'),
  ('plat_daily_log_pmo',       'My Daily Log',               '/platform/daily-log/my-entries',   80, 'book-open'),
  ('plat_story_map_pmo',       'Story Map',                  '/platform/story-map',              90, 'map-pin'),
  ('plat_releases_pmo',        'Releases',                   '/platform/releases',              100, 'tag')
) AS v(mc, ml, rp, so, ic);

-- Project Oversight children
WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_oversight' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('plat_oversight_risk',      'Risk Register',              '/pmo/oversight/risks',             10, 'alert-octagon'),
  ('plat_oversight_issue',     'Issue Register',             '/pmo/oversight/issues',            20, 'alert-circle'),
  ('plat_oversight_quality',   'Quality Register',           '/pmo/oversight/quality',           30, 'check-square'),
  ('plat_oversight_lessons',   'Lessons Log',                '/pmo/oversight/lessons',           40, 'book'),
  ('plat_oversight_delay',     'Delay Register / Templates', '/platform/delays',                 50, 'clock'),
  ('plat_oversight_scope',     'Scope Oversight',            '/pmo/oversight/scope',             60, 'maximize'),
  ('plat_oversight_schedule',  'Schedule Oversight',         '/pmo/oversight/schedules',         70, 'calendar'),
  ('plat_oversight_change',    'Change Register',            '/pmo/oversight/change',            80, 'git-commit')
) AS v(mc, ml, rp, so, ic);

-- =============================================================================
-- ══ LEVEL 2 + 3: [S] STRUCTURED SECTION (PMO) ════════════════════════════════
-- =============================================================================

WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_sec_structured' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, 'structured', v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('plat_grp_initiation',    'Initiation Hub',        NULL, 10, 'sunrise'),
  ('plat_grp_gov_standards', 'Governance & Standards', NULL, 20, 'shield')
) AS v(mc, ml, rp, so, ic);

-- Initiation Hub children
WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_initiation' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'structured', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('plat_s_mandates',          'Project Mandates',               '/pmo/mandates',                     10, 'file-text'),
  ('plat_s_briefs',            'Project Briefs',                 '/platform/brief',                   20, 'file'),
  ('plat_s_business_cases',    'Business Cases',                 '/pmo/initiation/business-case',     30, 'briefcase'),
  ('plat_s_pids',              'Project Initiation Documents',   '/platform/pid',                     40, 'clipboard'),
  ('plat_s_benefits_review',   'Benefits Review Plans',          '/pm/initiation/benefits-review-plan',50, 'trending-up')
) AS v(mc, ml, rp, so, ic);

-- Governance & Standards children
WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_gov_standards' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'structured', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('plat_s_cms',         'Communication Management Strategy',   '/pm/governance/communication-strategy',  10, 'message-circle'),
  ('plat_s_config_ms',   'Configuration Management Strategy',   '/pm/governance/configuration-strategy',  20, 'settings'),
  ('plat_s_qms',         'Quality Management Strategy',         '/pm/governance/quality-strategy',        30, 'check-circle'),
  ('plat_s_rms',         'Risk Management Strategy',            '/pm/governance/risk-strategy',           40, 'shield-alert'),
  ('plat_s_itto',        'ITTO Templates / Drafts',             '/platform/itto/templates',               50, 'git-branch'),
  ('plat_s_eef',         'Enterprise Environmental Factors',    '/platform/eef',                          60, 'globe')
) AS v(mc, ml, rp, so, ic);

-- =============================================================================
-- ══ LEVEL 2 + 3: [P] PMBOK SECTION ══════════════════════════════════════════
-- =============================================================================

WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_sec_pmbok' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, 'pmbok', v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('plat_grp_process_groups', 'Process Group Forms', NULL, 10, 'clipboard-list')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_process_groups' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'pmbok', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('plat_p_initiating',    'Initiating',              '/platform/process-group-forms?group=initiating',    10, 'play-circle'),
  ('plat_p_planning',      'Planning',                '/platform/process-group-forms?group=planning',      20, 'edit'),
  ('plat_p_executing',     'Executing',               '/platform/process-group-forms?group=executing',     30, 'zap'),
  ('plat_p_mc',            'Monitoring & Controlling','/platform/process-group-forms?group=monitoring',    40, 'activity'),
  ('plat_p_closing',       'Closing',                 '/platform/process-group-forms?group=closing',       50, 'check-circle'),
  ('plat_p_drafts',        'Drafts',                  '/platform/process-group-forms/drafts',              60, 'file-minus'),
  ('plat_p_approvals',     'Approvals',               '/pmo/authorisation/queue',                          70, 'thumbs-up')
) AS v(mc, ml, rp, so, ic);

-- =============================================================================
-- ══ LEVEL 2 + 3: [A] AGILE SECTION ══════════════════════════════════════════
-- =============================================================================

WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_sec_agile' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, 'agile', v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('plat_grp_agile_tools',    'Agile & Lean Tools',   NULL, 10, 'zap'),
  ('plat_grp_agile_delivery', 'Agile Delivery',        NULL, 20, 'send'),
  ('plat_grp_agile_metrics',  'Agile Metrics',         NULL, 30, 'bar-chart-2')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_agile_tools' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'agile', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('plat_a_scrum_of_scrums', 'Scrum of Scrums',   '/platform/scrum-of-scrums',   10, 'users'),
  ('plat_a_vsm',             'Value Stream Map',  '/platform/value-stream-map',  20, 'activity'),
  ('plat_a_kaizen',          'Kaizen Board',       '/platform/kaizen-board',      30, 'trello')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_agile_delivery' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'agile', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('plat_a_story_maps', 'Story Maps',   '/platform/story-map',   10, 'map-pin'),
  ('plat_a_releases',   'Releases',     '/platform/releases',    20, 'tag')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_agile_metrics' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'agile', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('plat_a_sprint_metrics', 'Sprint Metrics', '/platform/sprint-metrics', 10, 'bar-chart'),
  ('plat_a_lean_metrics',   'Lean Metrics',   '/platform/lean-metrics',   20, 'trending-up')
) AS v(mc, ml, rp, so, ic);

-- =============================================================================
-- ══ LEVEL 2 + 3: REPORTING & INTELLIGENCE (PMO) ══════════════════════════════
-- =============================================================================

WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_sec_reporting' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('plat_grp_reporting_assurance', 'Reporting & Assurance', NULL, 10, 'file-text'),
  ('plat_grp_financial',           'Financial Management',  NULL, 20, 'dollar-sign')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_reporting_assurance' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('plat_rep_highlight',       'Highlight Reports',      '/pm/reporting/highlight',              10, 'sun'),
  ('plat_rep_exception',       'Exception Reports',      '/pm/reporting/exception',              20, 'alert-circle'),
  ('plat_rep_end_stage',       'End Stage Reports',      '/pm/reporting/end-stage',              30, 'flag'),
  ('plat_rep_end_project',     'End Project Reports',    '/platform/structured/end-project-report',40,'award'),
  ('plat_rep_lessons',         'Lessons Reports',        '/platform/reports',                    50, 'book-open'),
  ('plat_rep_library',         'Report Library',         '/platform/reports',                    60, 'archive'),
  ('plat_rep_analytics',       'Analytics Dashboards',   '/platform/analytics',                  70, 'pie-chart'),
  ('plat_rep_builder',         'Dashboard Builder',      '/platform/report-builder',             80, 'layout'),
  ('plat_rep_scheduled',       'Scheduled Reports',      '/platform/scheduled-reports',          90, 'clock'),
  ('plat_rep_agile_metrics',   'Agile Metrics Hub',      '/platform/sprint-metrics',            100, 'bar-chart-2')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_financial' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('plat_fin_reports',     'Financial Reports',   '/platform/financial-reports',          10, 'dollar-sign'),
  ('plat_fin_evm',         'Portfolio EVM',       '/platform/portfolio-evm',              20, 'trending-up'),
  ('plat_fin_approvals',   'Expense Approvals',   '/platform/expenses/approvals',         30, 'check-square'),
  ('plat_fin_thresholds',  'Expense Thresholds',  '/platform/expense-thresholds',         40, 'sliders')
) AS v(mc, ml, rp, so, ic);

-- =============================================================================
-- ══ LEVEL 2 + 3: WORKFLOWS & GOVERNANCE ══════════════════════════════════════
-- =============================================================================

WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_sec_workflows' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('plat_grp_workflows_approvals', 'Workflows & Approvals',      NULL, 10, 'git-branch'),
  ('plat_grp_auth_lifecycle',      'Authorisation & Lifecycle',  NULL, 20, 'lock'),
  ('plat_grp_quality_testing_pmo', 'Quality & Testing',          NULL, 30, 'check-square')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_workflows_approvals' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('plat_wf_mandate_approvals', 'Mandate Pending Approvals', '/pmo/authorisation/queue',    10, 'file-text'),
  ('plat_wf_brief_approvals',   'Brief Pending Approvals',   '/pmo/authorisation/queue',    20, 'file')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_auth_lifecycle' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('plat_lc_auth_queue',      'Authorisation Queue',    '/pmo/authorisation/queue',         10, 'inbox'),
  ('plat_lc_dashboard',       'Lifecycle Dashboard',    '/pmo/authorisation/dashboard',     20, 'layout'),
  ('plat_lc_configure',       'Configure Rules',        '/pmo/authorisation/configure',     30, 'sliders'),
  ('plat_lc_chains',          'Approval Chains',        '/pmo/authorisation/chains',        40, 'link'),
  ('plat_lc_retention',       'Archive Retention',      '/pmo/authorisation/archive-retention', 50, 'database'),
  ('plat_lc_vault',           'Archive Vault',          '/pmo/authorisation/archive',       60, 'hard-drive')
) AS v(mc, ml, rp, so, ic);

-- =============================================================================
-- ══ LEVEL 2 + 3: PROCESS TEMPLATES ══════════════════════════════════════════
-- =============================================================================

WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_sec_process_templates' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, v.meth, v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('plat_pt_hub',           'Hub',                '/pmo/process-templates',              10, 'universal', 'home'),
  ('plat_pt_preproject',    'Pre-Project',        '/pmo/process-templates/pre-project',  20, 'universal', 'sunrise'),
  ('plat_pt_initiating',    'Initiating',         '/pmo/process-templates/initiating',   30, 'universal', 'play'),
  ('plat_pt_planning',      'Planning',           '/pmo/process-templates/planning',     40, 'universal', 'edit-3'),
  ('plat_pt_executing',     'Executing',          '/pmo/process-templates/executing',    50, 'universal', 'zap'),
  ('plat_pt_mc',            'Monitoring & Control','/pmo/process-templates/monitoring',  60, 'universal', 'activity'),
  ('plat_pt_closing',       'Closing',            '/pmo/process-templates/closing',      70, 'universal', 'check-circle'),
  ('plat_pt_browse',        'Browse / Manage',    '/pmo/process-templates',              80, 'universal', 'grid'),
  ('plat_pt_agile',         'Agile Templates',    '/pmo/process-templates/agile',        90, 'agile',     'zap'),
  ('plat_pt_new',           'New Template',       '/pmo/process-templates/create',      100, 'universal', 'plus-circle'),
  ('plat_pt_industry',      'Industry Templates', '/pmo/process-templates/industry',    110, 'universal', 'globe')
) AS v(mc, ml, rp, so, meth, ic);

-- =============================================================================
-- ══ LEVEL 2 + 3: KNOWLEDGE & OPERATIONS ══════════════════════════════════════
-- =============================================================================

WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_sec_knowledge' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('plat_grp_knowledge_assets', 'Knowledge & Assets',  NULL, 10, 'bookmark'),
  ('plat_grp_okr',              'Strategy & OKRs',     NULL, 20, 'target'),
  ('plat_grp_procurement',      'Procurement',         NULL, 30, 'shopping-cart'),
  ('plat_grp_collaboration',    'Collaboration',       NULL, 40, 'layout')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_knowledge_assets' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('plat_know_hub',          'Org Knowledge Hub',     '/platform/org-knowledge',         10, 'book'),
  ('plat_know_assets',       'Process Assets',        '/platform/opa',                   20, 'package'),
  ('plat_know_add_opa',      'Add OPA',               '/platform/opa/new',               30, 'plus'),
  ('plat_know_opa_drafts',   'OPA Drafts',            '/platform/opa/on-hold',           40, 'file-minus'),
  ('plat_know_opa_bulk',     'OPA Bulk Upload',       '/platform/opa/bulk-upload',       50, 'upload-cloud')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_okr' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('plat_okr_dashboard',   'OKR Dashboard',          '/pmo/okr',                      10, 'target'),
  ('plat_okr_objectives',  'Objectives & Key Results','/pmo/okr/objectives',           20, 'flag'),
  ('plat_okr_alignment',   'Alignment Map',           '/pmo/okr/alignment',            30, 'git-merge'),
  ('plat_okr_checkins',    'OKR Check-ins',           '/pmo/okr/check-ins',            40, 'check-circle')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_procurement' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('plat_proc_rfp',         'RFP Register',   '/pmo/procurement/rfp',   10, 'file-text'),
  ('plat_proc_load_rfp',    'Load RFP',       '/pmo/rfp/create',        20, 'upload'),
  ('plat_proc_drafts',      'RFP Drafts',     '/pmo/rfp/drafts',        30, 'file-minus')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_collaboration' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('plat_collab_whiteboard', 'Whiteboard', '/pmo/collaboration/whiteboard', 10, 'layout')
) AS v(mc, ml, rp, so, ic);

-- =============================================================================
-- ══ LEVEL 2 + 3: PEOPLE & RESOURCES ══════════════════════════════════════════
-- =============================================================================

WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_sec_people' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('plat_people_mgr_assign',     'Manager Assignments',   '/pmo-admin/manager-assignments',        10, 'user-check'),
  ('plat_people_appt_tracker',   'Appointment Tracker',   '/pmo-admin/appointments',               20, 'calendar'),
  ('plat_people_assign_settings','Assignment Settings',   '/pmo-admin/assignment-settings',        30, 'settings'),
  ('plat_people_inv_tracker',    'Invitation Tracker',    '/pmo/invitation-tracker',               40, 'mail'),
  ('plat_people_send_inv',       'Send Invitations',      '/platform/send-invitations',            50, 'send'),
  ('plat_people_assign_roles',   'Assign Roles',          '/platform/assign-roles',                60, 'shield'),
  ('plat_people_add_users',      'Add Users',             '/platform/add-users',                   70, 'user-plus'),
  ('plat_people_resource_dir',   'Resource Directory',    '/platform/resources',                   80, 'users'),
  ('plat_people_team_capacity',  'Team Capacity',         '/platform/resources/capacity',          90, 'bar-chart'),
  ('plat_people_stakeholders',   'Stakeholders',          '/platform/stakeholders/register',      100, 'user-check')
) AS v(mc, ml, rp, so, ic);

-- =============================================================================
-- ══ LEVEL 2 + 3: EMAIL & NOTIFICATIONS ═══════════════════════════════════════
-- =============================================================================

WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_sec_email' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('plat_email_settings',        'Email Settings',          '/platform/email-settings',              10, 'settings'),
  ('plat_email_senders',         'Sender Profiles',         '/platform/email-senders',               20, 'user'),
  ('plat_email_inv_templates',   'Invitation Templates',    '/platform/email-templates',             30, 'file-text'),
  ('plat_email_inv_expiry',      'Invitation Expiry',       '/platform/invitation-expiry',           40, 'clock'),
  ('plat_email_messages',        'Messages',                '/platform/comms',                       50, 'message-square'),
  ('plat_email_direct_msgs',     'Direct Messages',         '/platform/comms/direct-messages',       60, 'message-circle'),
  ('plat_email_meetings',        'Meetings',                '/platform/meetings',                    70, 'video'),
  ('plat_email_ai_reviews',      'Pending AI Reviews',      '/platform/ai-reviews',                  80, 'cpu'),
  ('plat_notif_prefs',           'Notification Preferences','/platform/notification-preferences',    90, 'bell')
) AS v(mc, ml, rp, so, ic);

-- =============================================================================
-- ══ LEVEL 2 + 3: ADMINISTRATION ══════════════════════════════════════════════
-- =============================================================================

WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_sec_admin' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('plat_admin_local_data',     'Local Data Extensions',  '/platform/admin/local-data-extensions',  10, 'database'),
  ('plat_admin_form_templates', 'Form Templates',          '/platform/admin/form-templates',         20, 'layout'),
  ('plat_admin_org_settings',   'Organisation Settings',   '/platform/organisation/profile',         30, 'settings'),
  ('plat_admin_user_mgmt',      'User Management',         '/platform/user-management',              40, 'users'),
  ('plat_admin_role_access',    'Role Menu Access',        '/admin/role-menu-management',            50, 'shield'),
  ('plat_admin_project_types',  'Project Types',           '/pmo-admin/project-types',               60, 'tag'),
  ('plat_admin_proj_statuses',  'Project Statuses',        '/pmo-admin/project-statuses',            70, 'toggle-right'),
  ('plat_admin_funding',        'Funding Sources',         '/pmo-admin/funding-sources',             80, 'dollar-sign'),
  ('plat_admin_budget_cats',    'Budget Categories',       '/pmo-admin/budget-categories',           90, 'pie-chart'),
  ('plat_admin_subscription',   'Subscription',            '/platform/subscription',                100, 'credit-card'),
  ('plat_admin_branding',       'Branding & Identity',     '/platform/organisation/branding',       110, 'image'),
  ('plat_admin_integrations',   'Integrations',            '/platform/integrations',                120, 'plug')
) AS v(mc, ml, rp, so, ic);

-- =============================================================================
-- ══ LEVEL 2 + 3: SYSTEM ADMINISTRATION ═══════════════════════════════════════
-- =============================================================================

WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_sec_system_admin' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('plat_sys_platform_settings', 'Platform Settings',       '/admin/settings',                       10, 'settings-2'),
  ('plat_sys_pwa',               'PWA Settings',            '/admin/pwa-settings',                   20, 'smartphone'),
  ('plat_sys_auth',              'Authentication Settings', '/admin/authentication-settings',         30, 'lock'),
  ('plat_sys_security',          'Encryption & Security',   '/admin/security-settings',              40, 'shield'),
  ('plat_sys_gdpr',              'GDPR Compliance',         '/admin/gdpr-compliance',                50, 'file-shield'),
  ('plat_sys_roles_perms',       'Roles & Permissions',     '/admin/role-menu-management',           60, 'user-cog'),
  ('plat_sys_help_content',      'Help Content Management', '/admin/help-management',                70, 'help-circle'),
  ('plat_sys_feedback',          'Feedback Analysis',       '/admin/feedback-analysis',              80, 'message-circle'),
  ('plat_sys_monitoring',        'Monitoring Dashboard',    '/admin/monitoring-dashboard',           90, 'activity')
) AS v(mc, ml, rp, so, ic);

-- =============================================================================
-- ══ LEVEL 2 + 3: ACCOUNT & SUBSCRIPTION ══════════════════════════════════════
-- =============================================================================

WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_sec_account' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('plat_acct_current_plan',   'Current Plan',         '/platform/subscription',                    10, 'credit-card'),
  ('plat_acct_upgrade',        'Upgrade / Downgrade',  '/platform/subscription/upgrade',            20, 'arrow-up-circle'),
  ('plat_acct_billing',        'Billing History',      '/platform/subscription/billing-history',    30, 'file-text'),
  ('plat_acct_payment',        'Payment Methods',      '/platform/subscription/payment-methods',    40, 'credit-card'),
  ('plat_acct_org_profile',    'Organisation Profile', '/platform/organisation/profile',            50, 'building'),
  ('plat_acct_branding',       'Branding & Identity',  '/platform/organisation/branding',           60, 'image'),
  ('plat_acct_domain',         'Domain Settings',      '/platform/organisation/domain-settings',    70, 'globe')
) AS v(mc, ml, rp, so, ic);

-- =============================================================================
-- ══ PM LAYOUT: UNIVERSAL SECTION ══════════════════════════════════════════════
-- Used by: project_manager, portfolio_manager, programme_manager (full)
-- =============================================================================

WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_sec_universal' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('plat_pm_dashboard',        'Dashboard',              '/platform/dashboard',              10, 'layout-dashboard'),
  ('plat_pm_ai',               'AI Assistant',           '/platform/ai-assistant',           15, 'cpu'),
  ('plat_grp_pm_projects',     'Projects',               NULL,                               20, 'folder'),
  ('plat_grp_pm_tasks',        'Tasks',                  NULL,                               30, 'check-square'),
  ('plat_grp_pm_teams',        'Teams',                  NULL,                               40, 'users'),
  ('plat_pm_calendar',         'Calendar',               '/platform/calendar',               50, 'calendar'),
  ('plat_grp_pm_controls',     'Controls & Registers',   NULL,                               60, 'shield-alert'),
  ('plat_grp_pm_stakeholders', 'Stakeholders',           NULL,                               70, 'user-check'),
  ('plat_pm_quality_testing',  'Quality & Testing',      '/platform/testing/dashboard',      80, 'check-circle'),
  ('plat_grp_pm_reporting',    'Reporting & Analytics',  NULL,                               90, 'bar-chart'),
  ('plat_grp_pm_financial',    'Financial',              NULL,                              100, 'dollar-sign'),
  ('plat_grp_pm_auth',         'Authorisation',          NULL,                              110, 'lock')
) AS v(mc, ml, rp, so, ic);

-- Projects children (PM)
WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_pm_projects' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('plat_pm_my_projects',      'My Projects',        '/platform/projects',               10, 'folder'),
  ('plat_pm_all_projects',     'All Projects',       '/platform/projects',               20, 'folders'),
  ('plat_pm_create_project',   'Create Project',     '/platform/projects/create',        30, 'plus-circle'),
  ('plat_pm_templates',        'Templates',          '/platform/templates',              40, 'layout'),
  ('plat_pm_archives',         'Archives / On Hold', '/platform/projects/on-hold',       50, 'archive'),
  ('plat_pm_manage_members',   'Manage Members',     '/platform/project-users',          60, 'user-check'),
  ('plat_pm_daily_log',        'My Daily Log',       '/platform/daily-log/my-entries',   70, 'book-open'),
  ('plat_pm_lessons',          'Lessons Log',        '/platform/lessons',                80, 'book')
) AS v(mc, ml, rp, so, ic);

-- Tasks children (PM)
WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_pm_tasks' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('plat_pm_my_tasks',     'My Tasks',          '/platform/tasks',           10, 'check'),
  ('plat_pm_all_tasks',    'All Tasks',         '/platform/tasks',           20, 'list'),
  ('plat_pm_task_board',   'Task Board',        '/platform/tasks/board',     30, 'trello'),
  ('plat_pm_task_calendar','Task Calendar',     '/platform/tasks/calendar',  40, 'calendar')
) AS v(mc, ml, rp, so, ic);

-- Teams children (PM)
WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_pm_teams' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('plat_pm_all_teams',       'All Teams',          '/platform/teams',                 10, 'users'),
  ('plat_pm_my_team',         'My Team',            '/platform/my-team',               20, 'user'),
  ('plat_pm_resource_dir',    'Resource Directory', '/platform/resources',             30, 'user-check'),
  ('plat_pm_skill_matrix',    'Skill Matrix',       '/platform/resources/skills',      40, 'star'),
  ('plat_pm_capacity',        'Capacity Planning',  '/platform/resources/capacity',    50, 'bar-chart'),
  ('plat_pm_leave_cal',       'Leave Calendar',     '/platform/calendar',              60, 'calendar')
) AS v(mc, ml, rp, so, ic);

-- Controls & Registers children (PM)
WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_pm_controls' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('plat_pm_risk_reg',     'Risk Register',          '/platform/risks',                  10, 'alert-octagon'),
  ('plat_pm_issue_log',    'Issue Log',              '/platform/issues',                 20, 'alert-circle'),
  ('plat_pm_change_log',   'Change Log',             '/platform/change',                 30, 'git-commit'),
  ('plat_pm_delay_reg',    'Delay Register',         '/platform/delays',                 40, 'clock'),
  ('plat_pm_requirements', 'Requirements Register',  '/platform/scope/requirements',     50, 'clipboard'),
  ('plat_pm_eef',          'EEF',                    '/platform/eef',                    60, 'globe')
) AS v(mc, ml, rp, so, ic);

-- Stakeholders children (PM)
WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_pm_stakeholders' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('plat_pm_stkh_register',  'Stakeholder Register',  '/platform/stakeholders/register',   10, 'users'),
  ('plat_pm_stkh_analysis',  'Stakeholder Analysis',  '/platform/stakeholders/analysis',   20, 'pie-chart'),
  ('plat_pm_stkh_engagement','Engagement Planning',   '/platform/stakeholders/engagement', 30, 'heart'),
  ('plat_pm_stkh_comms',     'Communication Plans',   '/platform/stakeholders/communication',40,'message-square'),
  ('plat_pm_stkh_matrix',    'Power/Interest Matrix', '/platform/stakeholders/assessment', 50, 'grid'),
  ('plat_pm_stkh_assess',    'Assessment Matrix',     '/platform/stakeholders/assessment', 60, 'bar-chart-2')
) AS v(mc, ml, rp, so, ic);

-- Reporting & Analytics children (PM)
WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_pm_reporting' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('plat_pm_rep_library',    'Report Library',       '/platform/reports',              10, 'archive'),
  ('plat_pm_rep_builder',    'Report Builder',       '/platform/report-builder',       20, 'layout'),
  ('plat_pm_analytics',      'Analytics Dashboards', '/platform/analytics',            30, 'pie-chart'),
  ('plat_pm_custom_metrics', 'Custom Metrics',       '/platform/analytics/custom-metrics',40,'sliders')
) AS v(mc, ml, rp, so, ic);

-- Financial children (PM)
WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_pm_financial' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('plat_pm_my_expenses',    'My Expenses',      '/platform/expenses/my',         10, 'dollar-sign'),
  ('plat_pm_exp_approvals',  'Expense Approvals','/platform/expenses/approvals',  20, 'check-square'),
  ('plat_pm_fin_reports',    'Financial Reports', '/platform/financial-reports',  30, 'bar-chart')
) AS v(mc, ml, rp, so, ic);

-- Authorisation children (PM)
WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_pm_auth' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('plat_pm_pending_approval',   'Pending My Approval',    '/pmo/authorisation/queue',         10, 'inbox'),
  ('plat_pm_submitted',          'My Submitted Records',   '/pm/authorisation/submitted',      20, 'send'),
  ('plat_pm_approval_chains',    'Approval Chains',        '/pmo/authorisation/chains',        30, 'link')
) AS v(mc, ml, rp, so, ic);

-- =============================================================================
-- ══ PM [S] STRUCTURED SECTION ══════════════════════════════════════════════
-- =============================================================================

WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_sec_structured' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, 'structured', v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('plat_grp_pm_pre_project',   'Pre-Project & Initiation', NULL, 10, 'sunrise'),
  ('plat_grp_pm_proj_controls', 'Project Controls',         NULL, 20, 'shield'),
  ('plat_grp_pm_gov_standards', 'Governance & Standards',   NULL, 30, 'book'),
  ('plat_grp_pm_del_reporting', 'Delivery Reporting',       NULL, 40, 'file-text')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_pm_pre_project' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'structured', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('plat_pm_s_mandate',        'Project Mandate',   '/pmo/mandates',                    10, 'file-text'),
  ('plat_pm_s_brief',          'Project Brief',     '/platform/brief',                  20, 'file'),
  ('plat_pm_s_business_case',  'Business Case',     '/pmo/initiation/business-case',    30, 'briefcase')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_pm_proj_controls' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'structured', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('plat_pm_s_pid',            'Project Initiation Document',  '/platform/pid',                        10, 'clipboard'),
  ('plat_pm_s_benefits_rp',    'Benefits Review Plan',         '/pm/initiation/benefits-review-plan',  20, 'trending-up'),
  ('plat_pm_s_work_packages',  'Work Packages',                '/pm/delivery/work-packages',           30, 'package'),
  ('plat_pm_s_prod_desc',      'Product Descriptions',         '/platform/product-descriptions',       40, 'box'),
  ('plat_pm_s_ppd',            'Project Product Description',  '/platform/ppd',                        50, 'file-plus')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_pm_gov_standards' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'structured', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('plat_pm_s_cms',          'Communication Mgmt Strategy',    '/pm/governance/communication-strategy',  10, 'message-circle'),
  ('plat_pm_s_conf_ms',      'Configuration Mgmt Strategy',    '/pm/governance/configuration-strategy',  20, 'settings'),
  ('plat_pm_s_qms',          'Quality Mgmt Strategy',          '/pm/governance/quality-strategy',        30, 'check-circle'),
  ('plat_pm_s_rms',          'Risk Mgmt Strategy',             '/pm/governance/risk-strategy',           40, 'shield-alert'),
  ('plat_pm_s_doc_gov',      'Document Governance',            '/platform/document-governance',          50, 'book'),
  ('plat_pm_s_gov_framework','Governance Framework',           '/platform/governance/framework',         60, 'shield'),
  ('plat_pm_s_policies',     'Policies & Compliance',          '/platform/governance/policies',          70, 'file-check'),
  ('plat_pm_s_decision_log', 'Decision Log',                   '/platform/decision-log',                 80, 'clipboard'),
  ('plat_pm_s_work_auth',    'Work Authorisations',            '/platform/work-authorisation',           90, 'key'),
  ('plat_pm_s_stage_gates',  'Stage Gate Reviews',             '/platform/stage-gates',                 100, 'flag')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_pm_del_reporting' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'structured', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('plat_pm_s_checkpoint',   'Checkpoint Reports',    '/platform/structured/checkpoint-reports',  10, 'flag'),
  ('plat_pm_s_highlight',    'Highlight Reports',     '/pm/reporting/highlight',                  20, 'sun'),
  ('plat_pm_s_issue_rep',    'Issue Reports',         '/pm/reporting/issues',                     30, 'alert-circle'),
  ('plat_pm_s_exception',    'Exception Reports',     '/pm/reporting/exception',                  40, 'alert-triangle'),
  ('plat_pm_s_end_stage',    'End Stage Reports',     '/pm/reporting/end-stage',                  50, 'flag'),
  ('plat_pm_s_end_project',  'End Project Report',    '/platform/structured/end-project-report',  60, 'award')
) AS v(mc, ml, rp, so, ic);

-- =============================================================================
-- ══ PM [P] PMBOK SECTION ══════════════════════════════════════════════════════
-- =============================================================================

WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_sec_pmbok' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, 'pmbok', v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('plat_grp_pm_process_groups', 'Process Group Forms', NULL, 10, 'clipboard-list'),
  ('plat_grp_pm_itto',           'ITTO Framework',      NULL, 20, 'git-branch')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_pm_process_groups' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'pmbok', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('plat_pm_p_initiating',  'Initiating',               '/platform/process-group-forms?group=initiating',  10, 'play-circle'),
  ('plat_pm_p_planning',    'Planning',                 '/platform/process-group-forms?group=planning',    20, 'edit'),
  ('plat_pm_p_executing',   'Executing',                '/platform/process-group-forms?group=executing',   30, 'zap'),
  ('plat_pm_p_mc',          'Monitoring & Controlling', '/platform/process-group-forms?group=monitoring',  40, 'activity'),
  ('plat_pm_p_closing',     'Closing',                  '/platform/process-group-forms?group=closing',     50, 'check-circle'),
  ('plat_pm_p_drafts',      'Drafts',                   '/platform/process-group-forms/drafts',            60, 'file-minus'),
  ('plat_pm_p_approvals',   'Approvals',                '/pmo/authorisation/queue',                        70, 'thumbs-up')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_pm_itto' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'pmbok', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('plat_pm_p_itto_templates', 'ITTO Templates',  '/platform/itto/templates', 10, 'git-branch'),
  ('plat_pm_p_itto_project',   'ITTO Project',    '/platform/itto/project',   20, 'folder'),
  ('plat_pm_p_itto_drafts',    'ITTO Drafts',     '/platform/itto/drafts',    30, 'file-minus')
) AS v(mc, ml, rp, so, ic);

-- =============================================================================
-- ══ PM [A] AGILE SECTION ══════════════════════════════════════════════════════
-- =============================================================================

WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_sec_agile' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, 'agile', v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('plat_grp_pm_agile_delivery', 'Agile Delivery',   NULL, 10, 'send'),
  ('plat_pm_a_process_forms',    'Agile Process Forms', '/platform/agile-process-forms', 20, 'list'),
  ('plat_grp_pm_lean_tools',     'Lean Tools',        NULL, 30, 'activity'),
  ('plat_grp_pm_planning_tools', 'Planning Tools',    NULL, 40, 'compass')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_pm_agile_delivery' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'agile', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('plat_pm_a_story_map',    'Story Map',          '/platform/story-map',   10, 'map-pin'),
  ('plat_pm_a_releases',     'Releases / Sprints', '/platform/releases',    20, 'tag')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_pm_lean_tools' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'agile', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('plat_pm_a_vsm',    'Value Stream Map', '/platform/value-stream-map', 10, 'activity'),
  ('plat_pm_a_kaizen', 'Kaizen Board',     '/platform/kaizen-board',     20, 'trello')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_pm_planning_tools' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'agile', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('plat_pm_a_planning_poker', 'Planning Poker',     '/pm/planning/planning-poker', 10, 'cpu'),
  ('plat_pm_a_scurve',         'S-Curve & Baselines','/pm/planning/s-curve',        20, 'trending-up')
) AS v(mc, ml, rp, so, ic);

-- =============================================================================
-- ══ PM CROSS-FRAMEWORK SECTION ════════════════════════════════════════════════
-- =============================================================================

WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_sec_cross_fw' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, NULL, v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('plat_xf_process_templates',  'Process Templates',      '/pmo/process-templates',                    10, 'layers'),
  ('plat_xf_knowledge',          'Knowledge & Resources',  '/platform/org-knowledge',                   20, 'bookmark'),
  ('plat_xf_okr',                'Strategy & OKRs',        '/pmo/okr',                                  30, 'target'),
  ('plat_xf_resources_hub',      'Resources Hub',          '/platform/resources',                       40, 'users'),
  ('plat_xf_project_settings',   'Project Settings',       '/platform/project-settings',                50, 'settings'),
  ('plat_xf_procurement',        'Procurement & Contracts','/platform/procurement',                     60, 'shopping-cart'),
  ('plat_xf_dashboards',         'Dashboards & Analytics', '/platform/analytics',                       70, 'pie-chart'),
  ('plat_xf_collaboration',      'Collaboration',          '/pmo/collaboration/whiteboard',             80, 'layout'),
  ('plat_xf_automation',         'Automation',             '/platform/automation',                      90, 'cpu'),
  ('plat_xf_integrations',       'Integrations',           '/platform/integrations',                   100, 'plug'),
  ('plat_xf_notif_prefs',        'Notification Preferences','/platform/notification-preferences',      110, 'bell')
) AS v(mc, ml, rp, so, ic);

-- =============================================================================
-- ══ TM LAYOUT SECTIONS ════════════════════════════════════════════════════════
-- =============================================================================

-- Personal Workspace
WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_sec_personal' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('plat_tm_dashboard',        'Dashboard',           '/platform/dashboard',               10, 'layout-dashboard'),
  ('plat_grp_tm_my_tasks',     'My Tasks',            NULL,                                20, 'check-square'),
  ('plat_tm_daily_log',        'My Daily Log',        '/platform/daily-log/my-entries',    30, 'book-open'),
  ('plat_tm_lesson_actions',   'My Lesson Actions',   '/platform/lessons/my-actions',      40, 'book'),
  ('plat_tm_timesheets',       'Timesheets',          '/platform/timesheets/my',           50, 'clock'),
  ('plat_tm_calendar',         'Calendar',            '/platform/calendar',                60, 'calendar')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_tm_my_tasks' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('plat_tm_task_board',    'Task Board',    '/platform/tasks/board',    10, 'trello'),
  ('plat_tm_task_list',     'Task List',     '/platform/tasks',          20, 'list'),
  ('plat_tm_task_calendar', 'Task Calendar', '/platform/tasks/calendar', 30, 'calendar')
) AS v(mc, ml, rp, so, ic);

-- Team section (TM)
WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_sec_team_section' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('plat_grp_tm_my_team',   'My Team',        NULL,                       10, 'users'),
  ('plat_grp_tm_comms',     'Communications', NULL,                       20, 'message-square')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_tm_my_team' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('plat_tm_team_members',    'Team Members',  '/platform/teams',          10, 'users'),
  ('plat_tm_team_board',      'Team Board',    '/platform/team-board',     20, 'trello'),
  ('plat_tm_team_calendar',   'Team Calendar', '/platform/calendar',       30, 'calendar')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_tm_comms' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('plat_tm_messages',       'Messages',        '/platform/comms',                    10, 'message-square'),
  ('plat_tm_direct_msgs',    'Direct Messages', '/platform/comms/direct-messages',    20, 'message-circle'),
  ('plat_tm_meetings',       'Meetings',        '/platform/meetings',                 30, 'video')
) AS v(mc, ml, rp, so, ic);

-- Delivery Artefacts (TM read-only)
WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_sec_delivery_artefacts' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, 'structured', v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('plat_tm_work_packages',  'My Work Packages (assigned)',    '/pm/delivery/work-packages',        10, 'package'),
  ('plat_tm_prod_desc',      'My Product Descriptions (assigned)','/platform/product-descriptions', 20, 'box')
) AS v(mc, ml, rp, so, ic);

-- TM [S] section
WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_sec_structured' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, 'structured', v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('plat_tm_s_work_packages_ro', 'Work Packages (assigned to me)', '/pm/delivery/work-packages', 10, 'package')
) AS v(mc, ml, rp, so, ic);

-- TM [A] section
WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_sec_agile' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, 'agile', v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('plat_grp_tm_agile', 'Agile Delivery', NULL, 10, 'send')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_tm_agile' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'agile', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('plat_tm_sprint_tasks',  'My Sprint Tasks',    '/platform/sprint-tasks',     10, 'zap'),
  ('plat_tm_story_map_ro',  'Story Map (read)',   '/platform/story-map',        20, 'map-pin')
) AS v(mc, ml, rp, so, ic);

-- TM cross-framework
WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_sec_cross_fw' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, NULL, v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('plat_grp_tm_auth',       'Authorisation',           NULL,                                10, 'lock'),
  ('plat_tm_okr_contrib',    'My OKR Contributions',    '/pmo/okr/objectives',               20, 'target'),
  ('plat_tm_workload',       'Workload Heatmap',         '/platform/resources/capacity',     30, 'bar-chart-2'),
  ('plat_tm_notif_prefs',    'Notification Preferences','/platform/notification-preferences', 40, 'bell')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_tm_auth' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, NULL, v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('plat_tm_submitted',     'My Submitted Records', '/pm/authorisation/submitted', 10, 'send'),
  ('plat_tm_pending_appr',  'Pending My Approval',  '/pmo/authorisation/queue',    20, 'inbox')
) AS v(mc, ml, rp, so, ic);

-- Team Management (team_lead extra)
WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_sec_team_mgmt' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('plat_grp_tl_team',    'Team', NULL, 10, 'users')
) AS v(mc, ml, rp, so, ic);

WITH par AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_tl_team' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, par.id, 3, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM par, (VALUES
  ('plat_tl_all_members',      'All Team Members',    '/platform/teams',                  10, 'users'),
  ('plat_tl_assignments',      'Team Assignments',    '/pmo-admin/manager-assignments',   20, 'user-check'),
  ('plat_tl_workstream_plans', 'Workstream Plans',    '/platform/workstream-plans',       30, 'git-branch'),
  ('plat_tl_charter',          'Team Charter',        '/platform/team-charter',           40, 'file-text'),
  ('plat_tl_timesheet_mgmt',   'Timesheet Management','/platform/timesheets/team',        50, 'clock'),
  ('plat_tl_capacity',         'Team Capacity',       '/platform/resources/capacity',     60, 'bar-chart')
) AS v(mc, ml, rp, so, ic);

-- Team Lead Delivery section
WITH sec AS (SELECT id FROM public.menu_items WHERE menu_code = 'plat_sec_delivery' AND COALESCE(is_deleted,FALSE)=FALSE)
INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), v.mc, v.ml, v.rp, sec.id, 2, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM sec, (VALUES
  ('plat_tl_work_packages',  'Work Packages',              '/pm/delivery/work-packages',       10, 'package'),
  ('plat_tl_prod_desc',      'Product Descriptions',        '/platform/product-descriptions',   20, 'box'),
  ('plat_tl_daily_log',      'Daily Log (team)',            '/platform/daily-log/my-entries',   30, 'book'),
  ('plat_tl_controls',       'Controls & Registers',        '/platform/risks',                  40, 'shield-alert'),
  ('plat_tl_checkpoint',     'Checkpoint Reports',          '/platform/structured/checkpoint-reports',50, 'flag'),
  ('plat_tl_team_reports',   'Team Reports',                '/platform/reports',                60, 'file-text')
) AS v(mc, ml, rp, so, ic);

-- =============================================================================
-- ══ SHARED NOTIFICATION PREFERENCE (all roles) ═══════════════════════════════
-- =============================================================================

INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
VALUES (gen_random_uuid(), 'plat_notif_prefs_shared', 'Notification Preferences', '/platform/notification-preferences', NULL, 2, 999, 'universal', 'bell', TRUE, TRUE, NOW(), NOW())
ON CONFLICT (menu_code) DO NOTHING;

-- =============================================================================
-- ══ EXECUTIVE DASHBOARD ═══════════════════════════════════════════════════════
-- =============================================================================

INSERT INTO public.menu_items (id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
VALUES (gen_random_uuid(), 'plat_exec_dashboard', 'Executive Dashboard', '/platform/executive/dashboard', NULL, 2, 10, 'universal', 'layout-dashboard', TRUE, TRUE, NOW(), NOW())
ON CONFLICT (menu_code) DO NOTHING;
