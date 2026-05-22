-- =============================================================================
-- v628b: Comprehensive Team Member Sidebar Menu Seed
-- Creates all section headers and leaf items for team_member, team_lead,
-- team_manager roles. Includes Plans, Controls (full edit), Timesheets,
-- Decision Log, Team Charter, and Communications sections.
-- =============================================================================

-- ── Step 1: Section headers ───────────────────────────────────────────────────

INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level,
  sort_order, route_path, menu_icon, is_visible, is_active
)
VALUES
  ('tm_section_dashboard',        'Dashboard',             'Project dashboard',                     NULL, 1, 10,  '/platform/dashboard',     'layout-dashboard',  TRUE, TRUE),
  ('tm_section_my_work',          'My Work',               'Personal tasks and daily activities',   NULL, 1, 20,  NULL,                      'user-check',        TRUE, TRUE),
  ('tm_section_my_projects',      'My Projects',           'Projects you are a member of',          NULL, 1, 30,  NULL,                      'folder-kanban',     TRUE, TRUE),
  ('tm_section_plans',            'Plans',                 'Team and individual plans',             NULL, 1, 40,  NULL,                      'git-branch',        TRUE, TRUE),
  ('tm_section_controls',         'Controls & Registers',  'Project controls and registers',        NULL, 1, 50,  NULL,                      'list-checks',       TRUE, TRUE),
  ('tm_section_forms',            'Process Group Forms',   'Process group forms (view)',             NULL, 1, 60,  NULL,                      'file-text',         TRUE, TRUE),
  ('tm_section_team_charter',     'Team Charter',          'Team charter document',                 NULL, 1, 70,  NULL,                      'shield-check',      TRUE, TRUE),
  ('tm_section_communications',   'Communications',        'Team chat and calls',                   NULL, 1, 80,  NULL,                      'message-square',    TRUE, TRUE),
  ('tm_section_team',             'Team & Collaboration',  'Team directory and members',            NULL, 1, 90,  NULL,                      'users',             TRUE, TRUE),
  ('tm_section_stakeholders',     'Stakeholders',          'Stakeholder register and analysis',     NULL, 1, 100, NULL,                      'network',           TRUE, TRUE),
  ('tm_section_reporting',        'Reporting & Status',    'Status and highlight reports',          NULL, 1, 110, NULL,                      'bar-chart-2',       TRUE, TRUE),
  ('tm_section_timesheets',       'Timesheets',            'Log and manage your time entries',      NULL, 1, 120, NULL,                      'clock',             TRUE, TRUE),
  ('tm_section_knowledge',        'Knowledge & Resources', 'Templates and reference materials',     NULL, 1, 130, NULL,                      'book-open',         TRUE, TRUE),
  ('tm_section_appointment',      'Appointment Status',    'Track your project invitations',        NULL, 1, 140, '/app/invitation-tracker', 'mail-check',        TRUE, TRUE),
  ('tm_section_settings',         'Profile / Settings',    'Account settings',                      NULL, 1, 150, '/platform/settings',      'settings',          TRUE, TRUE)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label      = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  sort_order      = EXCLUDED.sort_order,
  route_path      = EXCLUDED.route_path,
  menu_icon       = EXCLUDED.menu_icon,
  is_visible      = TRUE,
  is_active       = TRUE,
  updated_at      = NOW();

-- ── Step 2: Leaf items ────────────────────────────────────────────────────────

-- My Work leaves
INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level,
  sort_order, route_path, menu_icon, is_visible, is_active
)
SELECT
  v.menu_code, v.menu_label, v.menu_description,
  p.id AS parent_menu_id,
  2 AS menu_level,
  v.sort_order, v.route_path, v.menu_icon, TRUE, TRUE
FROM (VALUES
  ('tm_my_tasks',          'My Tasks',           'Tasks assigned to me',                         'tm_section_my_work', 10, '/platform/tasks',                        'check-square'),
  ('tm_task_board',        'Task Board',         'Kanban task board',                            'tm_section_my_work', 20, '/platform/tasks/board',                  'layout'),
  ('tm_task_calendar',     'Task Calendar',      'Calendar view of tasks',                       'tm_section_my_work', 30, '/platform/tasks/calendar',               'calendar'),
  ('tm_daily_log',         'Daily Log',          'My daily work log entries',                    'tm_section_my_work', 40, '/app/daily-log/my-entries',              'notebook-pen'),
  ('tm_lesson_actions',    'My Lesson Actions',  'Lessons learned actions assigned to me',       'tm_section_my_work', 50, '/app/lessons/my-actions',                'lightbulb'),
  ('tm_issue_actions',     'My Issue Actions',   'Issue actions assigned to me',                 'tm_section_my_work', 60, '/app/issues/my-actions',                 'alert-triangle')
) AS v(menu_code, menu_label, menu_description, parent_code, sort_order, route_path, menu_icon)
JOIN public.menu_items p ON p.menu_code = v.parent_code
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label      = EXCLUDED.menu_label,
  parent_menu_id  = EXCLUDED.parent_menu_id,
  sort_order      = EXCLUDED.sort_order,
  route_path      = EXCLUDED.route_path,
  is_visible      = TRUE,
  is_active       = TRUE,
  updated_at      = NOW();

-- My Projects leaves
INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level,
  sort_order, route_path, menu_icon, is_visible, is_active
)
SELECT
  v.menu_code, v.menu_label, v.menu_description,
  p.id, 2, v.sort_order, v.route_path, v.menu_icon, TRUE, TRUE
FROM (VALUES
  ('tm_projects_list',     'My Projects',       'Projects I am a member of',    'tm_section_my_projects', 10, '/platform/projects',   'folder'),
  ('tm_project_members',   'Project Members',   'View project team members',    'tm_section_my_projects', 20, '/app/project-members', 'users')
) AS v(menu_code, menu_label, menu_description, parent_code, sort_order, route_path, menu_icon)
JOIN public.menu_items p ON p.menu_code = v.parent_code
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, parent_menu_id = EXCLUDED.parent_menu_id,
  sort_order = EXCLUDED.sort_order, route_path = EXCLUDED.route_path,
  is_visible = TRUE, is_active = TRUE, updated_at = NOW();

-- Plans leaves
INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level,
  sort_order, route_path, menu_icon, is_visible, is_active
)
SELECT
  v.menu_code, v.menu_label, v.menu_description,
  p.id, 2, v.sort_order, v.route_path, v.menu_icon, TRUE, TRUE
FROM (VALUES
  ('tm_my_plans',              'My Plans',                'My individual plans',                   'tm_section_plans', 10, '/platform/plans/my-plans',                               'user-square'),
  ('tm_team_workstream_plans', 'Team Workstream Plans',   'Team workstream plans (TL/TM only)',    'tm_section_plans', 20, '/platform/plans/team-workstreams',                       'network'),
  ('tm_plans_overview',        'Plans Overview',          'Overall project plans dashboard',       'tm_section_plans', 30, '/platform/projects/__PROJECT__/plans',                   'layout-grid'),
  ('tm_project_plan',          'Project Plan',            'The master project plan (view)',        'tm_section_plans', 40, '/platform/projects/__PROJECT__/plans/project-plan',      'git-branch'),
  ('tm_stage_plans',           'Stage Plans',             'Stage delivery plans (view)',           'tm_section_plans', 50, '/platform/projects/__PROJECT__/plans/stage-plan',        'milestone')
) AS v(menu_code, menu_label, menu_description, parent_code, sort_order, route_path, menu_icon)
JOIN public.menu_items p ON p.menu_code = v.parent_code
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, parent_menu_id = EXCLUDED.parent_menu_id,
  sort_order = EXCLUDED.sort_order, route_path = EXCLUDED.route_path,
  is_visible = TRUE, is_active = TRUE, updated_at = NOW();

-- Controls & Registers leaves
INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level,
  sort_order, route_path, menu_icon, is_visible, is_active
)
SELECT
  v.menu_code, v.menu_label, v.menu_description,
  p.id, 2, v.sort_order, v.route_path, v.menu_icon, TRUE, TRUE
FROM (VALUES
  ('tm_risk_register',    'Risk Register',    'Project risk register',     'tm_section_controls', 10, '/pmo/oversight/risk-register',               'shield-alert'),
  ('tm_issue_log',        'Issue Log',        'Project issue log',         'tm_section_controls', 20, '/pmo/oversight/issue-register',              'alert-circle'),
  ('tm_change_log',       'Change Log',       'Change request log',        'tm_section_controls', 30, '/platform/projects/:id/registers/changes',   'git-pull-request'),
  ('tm_delay_log',        'Delay Log',        'Project delay log',         'tm_section_controls', 40, '/platform/delays',                           'clock-4'),
  ('tm_defect_register',  'Defect Register',  'Defects and quality log',   'tm_section_controls', 50, '/platform/testing/defects',                  'bug'),
  ('tm_decision_log',     'Decision Log',     'Project decisions register', 'tm_section_controls', 60, '/platform/governance/decisions',             'gavel')
) AS v(menu_code, menu_label, menu_description, parent_code, sort_order, route_path, menu_icon)
JOIN public.menu_items p ON p.menu_code = v.parent_code
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, parent_menu_id = EXCLUDED.parent_menu_id,
  sort_order = EXCLUDED.sort_order, route_path = EXCLUDED.route_path,
  is_visible = TRUE, is_active = TRUE, updated_at = NOW();

-- Process Group Forms leaves
INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level,
  sort_order, route_path, menu_icon, is_visible, is_active
)
SELECT
  v.menu_code, v.menu_label, v.menu_description,
  p.id, 2, v.sort_order, v.route_path, v.menu_icon, TRUE, TRUE
FROM (VALUES
  ('tm_form_initiating',  'Initiating',            'Initiating process group forms',          'tm_section_forms', 10, '/platform/projects/:projectId/forms?group=Initiating',  'play-circle'),
  ('tm_form_planning',    'Planning',              'Planning process group forms',            'tm_section_forms', 20, '/platform/projects/:projectId/forms?group=Planning',     'map'),
  ('tm_form_executing',   'Executing',             'Executing process group forms',           'tm_section_forms', 30, '/platform/projects/:projectId/forms?group=Executing',    'zap'),
  ('tm_form_monitoring',  'Monitoring & Control',  'Monitoring & controlling forms',          'tm_section_forms', 40, '/platform/projects/:projectId/forms?group=Monitoring',   'activity'),
  ('tm_form_closing',     'Closing',               'Closing process group forms',             'tm_section_forms', 50, '/platform/projects/:projectId/forms?group=Closing',      'check-circle'),
  ('tm_draft_forms',      'My Draft Forms',        'Resume in-progress draft forms',          'tm_section_forms', 60, '/platform/projects/:projectId/forms/drafts',             'file-clock')
) AS v(menu_code, menu_label, menu_description, parent_code, sort_order, route_path, menu_icon)
JOIN public.menu_items p ON p.menu_code = v.parent_code
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, parent_menu_id = EXCLUDED.parent_menu_id,
  sort_order = EXCLUDED.sort_order, route_path = EXCLUDED.route_path,
  is_visible = TRUE, is_active = TRUE, updated_at = NOW();

-- Team Charter leaf
INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level,
  sort_order, route_path, menu_icon, is_visible, is_active
)
SELECT
  'tm_team_charter_view', 'Team Charter', 'View the team charter document',
  p.id, 2, 10,
  '/platform/projects/__PROJECT__/team-charter',
  'shield-check', TRUE, TRUE
FROM public.menu_items p WHERE p.menu_code = 'tm_section_team_charter'
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, parent_menu_id = EXCLUDED.parent_menu_id,
  route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level,
  sort_order, route_path, menu_icon, is_visible, is_active
)
SELECT
  'tm_team_charter_edit', 'Edit Team Charter', 'Create / edit the team charter (TL/TM)',
  p.id, 2, 20,
  '/platform/projects/__PROJECT__/team-charter/edit',
  'file-edit', TRUE, TRUE
FROM public.menu_items p WHERE p.menu_code = 'tm_section_team_charter'
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, parent_menu_id = EXCLUDED.parent_menu_id,
  route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

-- Communications leaves
INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level,
  sort_order, route_path, menu_icon, is_visible, is_active
)
SELECT
  v.menu_code, v.menu_label, v.menu_description,
  p.id, 2, v.sort_order, v.route_path, v.menu_icon, TRUE, TRUE
FROM (VALUES
  ('tm_team_chat',     'Team Chat',    'Real-time team messaging',            'tm_section_communications', 10, '/platform/communications/chat',        'message-circle'),
  ('tm_video_calls',   'Video Calls',  'Schedule and log video calls',        'tm_section_communications', 20, '/platform/communications/video-calls', 'video'),
  ('tm_voice_calls',   'Voice Calls',  'Schedule and log voice calls',        'tm_section_communications', 30, '/platform/communications/voice-calls', 'phone')
) AS v(menu_code, menu_label, menu_description, parent_code, sort_order, route_path, menu_icon)
JOIN public.menu_items p ON p.menu_code = v.parent_code
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, parent_menu_id = EXCLUDED.parent_menu_id,
  sort_order = EXCLUDED.sort_order, route_path = EXCLUDED.route_path,
  is_visible = TRUE, is_active = TRUE, updated_at = NOW();

-- Team & Collaboration leaves
INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level,
  sort_order, route_path, menu_icon, is_visible, is_active
)
SELECT
  v.menu_code, v.menu_label, v.menu_description,
  p.id, 2, v.sort_order, v.route_path, v.menu_icon, TRUE, TRUE
FROM (VALUES
  ('tm_my_team',        'My Team',        'Your workstream team members',  'tm_section_team', 10, '/platform/teams/my-team', 'users'),
  ('tm_team_directory', 'Team Directory', 'All project team members',      'tm_section_team', 20, '/platform/teams',         'address-book')
) AS v(menu_code, menu_label, menu_description, parent_code, sort_order, route_path, menu_icon)
JOIN public.menu_items p ON p.menu_code = v.parent_code
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, parent_menu_id = EXCLUDED.parent_menu_id,
  sort_order = EXCLUDED.sort_order, route_path = EXCLUDED.route_path,
  is_visible = TRUE, is_active = TRUE, updated_at = NOW();

-- Stakeholders leaves
INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level,
  sort_order, route_path, menu_icon, is_visible, is_active
)
SELECT
  v.menu_code, v.menu_label, v.menu_description,
  p.id, 2, v.sort_order, v.route_path, v.menu_icon, TRUE, TRUE
FROM (VALUES
  ('tm_stakeholder_register',  'Stakeholder Register',  'View project stakeholders',        'tm_section_stakeholders', 10, '/platform/stakeholders/register',  'network'),
  ('tm_stakeholder_analysis',  'Stakeholder Analysis',  'View stakeholder SEAM analysis',   'tm_section_stakeholders', 20, '/platform/stakeholders/analysis',  'pie-chart')
) AS v(menu_code, menu_label, menu_description, parent_code, sort_order, route_path, menu_icon)
JOIN public.menu_items p ON p.menu_code = v.parent_code
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, parent_menu_id = EXCLUDED.parent_menu_id,
  sort_order = EXCLUDED.sort_order, route_path = EXCLUDED.route_path,
  is_visible = TRUE, is_active = TRUE, updated_at = NOW();

-- Reporting leaves
INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level,
  sort_order, route_path, menu_icon, is_visible, is_active
)
SELECT
  v.menu_code, v.menu_label, v.menu_description,
  p.id, 2, v.sort_order, v.route_path, v.menu_icon, TRUE, TRUE
FROM (VALUES
  ('tm_highlight_reports',   'Highlight Reports',   'Project highlight reports',     'tm_section_reporting', 10, '/pm/reporting/highlight-reports',   'bar-chart-2'),
  ('tm_checkpoint_reports',  'Checkpoint Reports',  'Team checkpoint reports',       'tm_section_reporting', 20, '/pm/reporting/checkpoint-reports',  'check-square'),
  ('tm_reports_library',     'Reports Library',     'All project reports',           'tm_section_reporting', 30, '/platform/reports',                 'library')
) AS v(menu_code, menu_label, menu_description, parent_code, sort_order, route_path, menu_icon)
JOIN public.menu_items p ON p.menu_code = v.parent_code
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, parent_menu_id = EXCLUDED.parent_menu_id,
  sort_order = EXCLUDED.sort_order, route_path = EXCLUDED.route_path,
  is_visible = TRUE, is_active = TRUE, updated_at = NOW();

-- Timesheets leaves
INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level,
  sort_order, route_path, menu_icon, is_visible, is_active
)
SELECT
  v.menu_code, v.menu_label, v.menu_description,
  p.id, 2, v.sort_order, v.route_path, v.menu_icon, TRUE, TRUE
FROM (VALUES
  ('tm_my_timesheets',    'My Timesheets',    'View and manage my time entries',          'tm_section_timesheets', 10, '/platform/timesheets',       'clock'),
  ('tm_log_time',         'Log Time',         'Add a new timesheet entry',                'tm_section_timesheets', 20, '/platform/timesheets/new',   'plus-circle'),
  ('tm_team_timesheets',  'Team Timesheets',  'Review and approve team time (TL/TM)',     'tm_section_timesheets', 30, '/platform/timesheets/team',  'users-round')
) AS v(menu_code, menu_label, menu_description, parent_code, sort_order, route_path, menu_icon)
JOIN public.menu_items p ON p.menu_code = v.parent_code
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, parent_menu_id = EXCLUDED.parent_menu_id,
  sort_order = EXCLUDED.sort_order, route_path = EXCLUDED.route_path,
  is_visible = TRUE, is_active = TRUE, updated_at = NOW();

-- Knowledge leaf
INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level,
  sort_order, route_path, menu_icon, is_visible, is_active
)
SELECT
  'tm_industry_templates', 'Industry Templates', 'Browse industry plan templates',
  p.id, 2, 10, '/platform/industry-templates', 'layers', TRUE, TRUE
FROM public.menu_items p WHERE p.menu_code = 'tm_section_knowledge'
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, parent_menu_id = EXCLUDED.parent_menu_id,
  route_path = EXCLUDED.route_path, is_visible = TRUE, is_active = TRUE, updated_at = NOW();

-- ── Step 3: role_menu_items for team_member ───────────────────────────────────
-- All items: can_view=true
-- Edit-enabled items: can_use=true
-- View-only items (Plans overview, Stage Plans, Project Plan, Charter view,
--   Stakeholders, Reporting, Forms except Draft): can_use=false
-- Team Workstream Plans, Team Timesheets, Charter Edit: not assigned (TL/TM only)

INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
SELECT
  r.id,
  mi.id,
  TRUE,
  CASE WHEN mi.menu_code IN (
    -- View-only for basic team members
    'tm_plans_overview',
    'tm_project_plan',
    'tm_stage_plans',
    'tm_form_initiating',
    'tm_form_planning',
    'tm_form_executing',
    'tm_form_monitoring',
    'tm_form_closing',
    'tm_team_charter_view',
    'tm_stakeholder_register',
    'tm_stakeholder_analysis',
    'tm_highlight_reports',
    'tm_checkpoint_reports',
    'tm_reports_library',
    'tm_project_members',
    'tm_my_team',
    'tm_team_directory'
  ) THEN FALSE ELSE TRUE END,
  TRUE,
  FALSE
FROM public.roles r
CROSS JOIN public.menu_items mi
WHERE r.role_name IN ('team_member', 'Team Member', 'pm_team_member')
  AND mi.menu_code IN (
    -- Sections
    'tm_section_dashboard', 'tm_section_my_work', 'tm_section_my_projects',
    'tm_section_plans', 'tm_section_controls', 'tm_section_forms',
    'tm_section_team_charter', 'tm_section_communications', 'tm_section_team',
    'tm_section_stakeholders', 'tm_section_reporting', 'tm_section_timesheets',
    'tm_section_knowledge', 'tm_section_appointment', 'tm_section_settings',
    -- My Work
    'tm_my_tasks', 'tm_task_board', 'tm_task_calendar',
    'tm_daily_log', 'tm_lesson_actions', 'tm_issue_actions',
    -- My Projects
    'tm_projects_list', 'tm_project_members',
    -- Plans (view-only for overview/project/stage; own plans can edit)
    'tm_my_plans', 'tm_plans_overview', 'tm_project_plan', 'tm_stage_plans',
    -- Controls (full edit)
    'tm_risk_register', 'tm_issue_log', 'tm_change_log',
    'tm_delay_log', 'tm_defect_register', 'tm_decision_log',
    -- Forms (view, draft forms edit)
    'tm_form_initiating', 'tm_form_planning', 'tm_form_executing',
    'tm_form_monitoring', 'tm_form_closing', 'tm_draft_forms',
    -- Team Charter (view only)
    'tm_team_charter_view',
    -- Communications (full edit)
    'tm_team_chat', 'tm_video_calls', 'tm_voice_calls',
    -- Team
    'tm_my_team', 'tm_team_directory',
    -- Stakeholders (view only)
    'tm_stakeholder_register', 'tm_stakeholder_analysis',
    -- Reporting (view only)
    'tm_highlight_reports', 'tm_checkpoint_reports', 'tm_reports_library',
    -- Timesheets (own entries only; no team timesheets)
    'tm_my_timesheets', 'tm_log_time',
    -- Knowledge
    'tm_industry_templates'
  )
  AND mi.is_active = TRUE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view   = TRUE,
  can_use    = EXCLUDED.can_use,
  is_active  = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

-- ── Step 4: role_menu_items for team_lead and team_manager ────────────────────
-- Same as team_member PLUS:
--   Team Workstream Plans, Team Charter Edit, Team Timesheets — can_use=true

INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
SELECT
  r.id,
  mi.id,
  TRUE,
  CASE WHEN mi.menu_code IN (
    -- View-only even for TL/TM
    'tm_plans_overview',
    'tm_project_plan',
    'tm_stage_plans',
    'tm_form_initiating',
    'tm_form_planning',
    'tm_form_executing',
    'tm_form_monitoring',
    'tm_form_closing',
    'tm_stakeholder_register',
    'tm_stakeholder_analysis',
    'tm_highlight_reports',
    'tm_checkpoint_reports',
    'tm_reports_library',
    'tm_project_members',
    'tm_my_team',
    'tm_team_directory'
  ) THEN FALSE ELSE TRUE END,
  TRUE,
  FALSE
FROM public.roles r
CROSS JOIN public.menu_items mi
WHERE r.role_name IN ('team_lead', 'team_manager', 'Team Lead', 'Team Manager')
  AND mi.menu_code IN (
    -- All team_member items
    'tm_section_dashboard', 'tm_section_my_work', 'tm_section_my_projects',
    'tm_section_plans', 'tm_section_controls', 'tm_section_forms',
    'tm_section_team_charter', 'tm_section_communications', 'tm_section_team',
    'tm_section_stakeholders', 'tm_section_reporting', 'tm_section_timesheets',
    'tm_section_knowledge', 'tm_section_appointment', 'tm_section_settings',
    'tm_my_tasks', 'tm_task_board', 'tm_task_calendar',
    'tm_daily_log', 'tm_lesson_actions', 'tm_issue_actions',
    'tm_projects_list', 'tm_project_members',
    'tm_my_plans', 'tm_team_workstream_plans', 'tm_plans_overview',
    'tm_project_plan', 'tm_stage_plans',
    'tm_risk_register', 'tm_issue_log', 'tm_change_log',
    'tm_delay_log', 'tm_defect_register', 'tm_decision_log',
    'tm_form_initiating', 'tm_form_planning', 'tm_form_executing',
    'tm_form_monitoring', 'tm_form_closing', 'tm_draft_forms',
    'tm_team_charter_view', 'tm_team_charter_edit',
    'tm_team_chat', 'tm_video_calls', 'tm_voice_calls',
    'tm_my_team', 'tm_team_directory',
    'tm_stakeholder_register', 'tm_stakeholder_analysis',
    'tm_highlight_reports', 'tm_checkpoint_reports', 'tm_reports_library',
    'tm_my_timesheets', 'tm_log_time', 'tm_team_timesheets',
    'tm_industry_templates'
  )
  AND mi.is_active = TRUE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view   = TRUE,
  can_use    = EXCLUDED.can_use,
  is_active  = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

-- ── Register team_charters in database_tables (if not done in v628c) ──────────
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('team_charters',    'Team charter documents defining team purpose, values, norms, and ways of working per project', false, true),
  ('project_decisions','Project decision log with status, rationale, and impact tracking', false, true),
  ('timesheet_entries','Team member timesheet entries with approval workflow', false, true),
  ('team_messages',    'Real-time project team chat messages', false, true),
  ('team_calls',       'Video and voice call scheduling and log per project', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at        = NOW();
