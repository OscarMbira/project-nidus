-- v498 — Testing Centre seed (idempotent; run after v493-497)
-- Re-run safe: uses ON CONFLICT

INSERT INTO public.tc_test_modules (name, code, description, methodology_type, route_path, is_active) VALUES
('Authentication & Login', 'AUTH', 'Login and session', 'system', '/platform/login', true),
('User Management', 'USER_MGMT', 'User admin', 'system', '/platform/admin/users', true),
('Organisation Setup', 'ORG', 'Org', 'system', '/platform/admin/organisation', true),
('Project Startup', 'PROJECT_STARTUP', 'New project', 'predictive', '/platform/projects/create', true),
('Project Initiation', 'PROJECT_INIT', 'Projects', 'predictive', '/platform/projects', true),
('Project Planning', 'PROJECT_PLANNING', 'Planning', 'predictive', '/platform/projects', true),
('Stage / Phase Management', 'STAGE_MGMT', 'Stages', 'predictive', '/platform/projects', true),
('Work Authorisation', 'WORK_AUTH', 'WA', 'predictive', '/platform/work-authorisations', true),
('Risk Management', 'RISK_MGMT', 'Risks', 'hybrid', '/platform/risks', true),
('Issue Management', 'ISSUE_MGMT', 'Issues', 'hybrid', '/platform/issues', true),
('Change Control', 'CHANGE_CTRL', 'Changes', 'hybrid', '/platform/change-requests', true),
('Agile Backlog', 'AGILE_BACKLOG', 'Backlog', 'agile', '/platform/backlogs', true),
('Sprint Management', 'SPRINT_MGMT', 'Sprints', 'agile', '/platform/sprints', true),
('Kanban Board', 'KANBAN', 'Kanban', 'agile', '/platform/kanban', true),
('Reporting & Dashboards', 'REPORTING', 'Dash', 'system', '/platform/dashboard', true),
('Document Management', 'DOC_MGMT', 'Docs', 'system', '/platform/documents', true),
('Notifications', 'NOTIFICATIONS', 'Notify', 'system', '/platform/notifications', true),
('Audit Logs', 'AUDIT_LOGS', 'Audit', 'system', '/platform/admin/audit', true),
('Testing & Diagnostics Centre', 'TESTING_CENTRE', 'TDC', 'system', '/platform/testing-centre', true),
('PMO Dashboard', 'PMO_DASHBOARD', 'PMO', 'system', '/pmo/dashboard', true),
('PM Dashboard', 'PM_DASHBOARD', 'PM', 'system', '/pm/dashboard', true)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, route_path = EXCLUDED.route_path, updated_at = now();

-- Sim module mirror (note: code unique; same as platform)
INSERT INTO sim.tc_test_modules (name, code, description, methodology_type, route_path, is_active)
SELECT name, code, description, methodology_type,
  CASE WHEN code = 'AUTH' THEN '/simulator/login' WHEN code = 'REPORTING' THEN '/simulator/dashboard' ELSE '/simulator/' || lower(code) END,
  is_active
FROM public.tc_test_modules
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, updated_at = now();

INSERT INTO public.tc_test_environments (name, environment_type, base_url, is_default, is_active)
SELECT v.name, v.etype, v.burl, v.dfl, v.act FROM (VALUES
  ('Local Development', 'local', 'http://localhost:5173', true, true::boolean),
  ('Development / Staging', 'development', '', false, true::boolean),
  ('UAT', 'uat', '', false, true::boolean),
  ('Production (Read-Only)', 'production_readonly', '', false, true::boolean)
) AS v(name, etype, burl, dfl, act)
WHERE NOT EXISTS (SELECT 1 FROM public.tc_test_environments e WHERE e.name = v.name);

INSERT INTO sim.tc_test_environments (name, environment_type, base_url, is_default, is_active)
SELECT v.name, v.etype, v.burl, v.dfl, v.act FROM (VALUES
  ('Local Development', 'local', 'http://localhost:5173', true, true::boolean),
  ('Development / Staging', 'development', '', false, true::boolean),
  ('UAT', 'uat', '', false, true::boolean),
  ('Production (Read-Only)', 'production_readonly', '', false, true::boolean)
) AS v(name, etype, burl, dfl, act)
WHERE NOT EXISTS (SELECT 1 FROM sim.tc_test_environments e WHERE e.name = v.name);

-- Settings
INSERT INTO public.tc_settings (setting_key, setting_value, description) VALUES
('default_browser', '"chromium"'::jsonb, 'Default Playwright browser'),
('screenshot_capture_mode', '"failure"'::jsonb, 'Screenshot level'),
('trace_capture_mode', '"on_first_retry"'::jsonb, 'Trace mode'),
('evidence_retention_days', '90'::jsonb, 'Days'),
('max_screenshot_size_mb', '5'::jsonb, 'MB'),
('test_run_timeout_ms', '300000'::jsonb, 'Timeout'),
('safe_mode_production', 'true'::jsonb, 'Block destructive'),
('enable_visual_comparison', 'false'::jsonb, 'Visual diff'),
('enable_cursor_prompt_generation', 'true'::jsonb, 'AI prompts'),
('auto_create_defects_on_failure', 'false'::jsonb, 'Opt-in'),
('auto_generate_ai_fix_prompt', 'false'::jsonb, 'Opt-in'),
('auto_defect_failure_classifications', '["application_defect","permission_rls_issue","visual_regression","unknown_manual_review"]'::jsonb, 'Auto defect types'),
('auto_defect_severity_map', '{"critical":"critical","high":"high","medium":"medium","low":"low"}'::jsonb, 'Severity map'),
('ai_prompt_include_logs', 'true'::jsonb, 'Prompts'),
('ai_prompt_include_screenshots', 'true'::jsonb, 'Prompts'),
('ai_prompt_include_traces', 'true'::jsonb, 'Prompts'),
('ai_prompt_max_failures', '50'::jsonb, 'Batch size'),
('allowed_script_types', '["playwright","vitest","sql","api"]'::jsonb, 'Types'),
('allowed_script_directories', '["tests/e2e","tests/unit","tests/api","tests/db","test-runner"]'::jsonb, 'Paths'),
('default_environment', 'null'::jsonb, 'Set to Local Development env id after first seed')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, description = EXCLUDED.description, updated_at = now();

UPDATE public.tc_settings s
SET setting_value = to_jsonb((SELECT e.id::text FROM public.tc_test_environments e WHERE e.name = 'Local Development' LIMIT 1))
WHERE s.setting_key = 'default_environment';

INSERT INTO sim.tc_settings (setting_key, setting_value, description)
SELECT s.setting_key, s.setting_value, s.description FROM public.tc_settings s
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = now();

-- 68 test cases (plan v493 §6.4–6.15)
INSERT INTO public.tc_test_cases (test_case_code, title, module_id, test_type, scenario_type, priority, status, methodology_type, test_steps)
SELECT t.code, t.tle, m.id, t.tty, t.sct, t.pri, 'ready', 'hybrid', '[]'::jsonb
FROM (VALUES
  ('TC-AUTH-001', 'Valid credentials login succeeds and redirects to dashboard', 'AUTH', 'ui', 'positive', 'critical'),
  ('TC-AUTH-002', 'Invalid password login shows error message', 'AUTH', 'ui', 'negative', 'critical'),
  ('TC-AUTH-003', 'Logged-out user cannot access /platform/dashboard — redirected to login', 'AUTH', 'ui', 'negative', 'critical'),
  ('TC-AUTH-004', 'User only sees sidebar navigation items permitted for their role', 'AUTH', 'ui', 'positive', 'high'),
  ('TC-AUTH-005', 'Expired session redirects to login without data loss', 'AUTH', 'ui', 'edge_case', 'high'),
  ('TC-AUTH-006', 'Organisation verification required before project access', 'AUTH', 'ui', 'negative', 'high'),
  ('TC-USR-001', 'System Admin can create a new user and assign a role', 'USER_MGMT', 'ui', 'positive', 'high'),
  ('TC-USR-002', 'Duplicate email registration is rejected with validation error', 'USER_MGMT', 'ui', 'negative', 'high'),
  ('TC-USR-003', 'Non-admin cannot access user administration pages', 'USER_MGMT', 'ui', 'negative', 'critical'),
  ('TC-USR-004', 'Role change takes effect immediately on next navigation', 'USER_MGMT', 'ui', 'positive', 'medium'),
  ('TC-PROJ-001', 'Project Manager can create a predictive project with all required fields', 'PROJECT_STARTUP', 'ui', 'positive', 'critical'),
  ('TC-PROJ-002', 'Missing required project fields show field-level validation errors', 'PROJECT_STARTUP', 'ui', 'negative', 'critical'),
  ('TC-PROJ-003', 'Viewer cannot edit predictive project baseline', 'PROJECT_STARTUP', 'ui', 'negative', 'high'),
  ('TC-PROJ-004', 'Project appears in project list immediately after creation', 'PROJECT_STARTUP', 'ui', 'positive', 'high'),
  ('TC-PROJ-005', 'Project creation success confirmation shows project code and name', 'PROJECT_STARTUP', 'ui', 'positive', 'medium'),
  ('TC-PROJ-006', 'Trial project limit enforced — second free trial blocked', 'PROJECT_STARTUP', 'ui', 'negative', 'high'),
  ('TC-STAGE-001', 'Project Manager can create and name a project stage', 'STAGE_MGMT', 'ui', 'positive', 'high'),
  ('TC-STAGE-002', 'Stage cannot be closed without end-stage report', 'STAGE_MGMT', 'ui', 'negative', 'high'),
  ('TC-STAGE-003', 'Stage progress percentage calculates correctly from task completion', 'STAGE_MGMT', 'ui', 'positive', 'medium'),
  ('TC-STAGE-004', 'Viewer cannot modify stage status', 'STAGE_MGMT', 'ui', 'negative', 'high'),
  ('TC-WA-001', 'Project Manager can create a work authorisation request', 'WORK_AUTH', 'ui', 'positive', 'critical'),
  ('TC-WA-002', 'Approver can approve a submitted work authorisation', 'WORK_AUTH', 'ui', 'positive', 'critical'),
  ('TC-WA-003', 'Approver can reject with mandatory rejection reason', 'WORK_AUTH', 'ui', 'negative', 'high'),
  ('TC-WA-004', 'Work authorisation can be suspended and resumed', 'WORK_AUTH', 'ui', 'positive', 'high'),
  ('TC-WA-005', 'Unauthorised role cannot approve work authorisation', 'WORK_AUTH', 'ui', 'negative', 'critical'),
  ('TC-WA-006', 'Work authorisation history log records all status transitions', 'WORK_AUTH', 'database', 'positive', 'medium'),
  ('TC-RISK-001', 'Project Manager can create a risk with probability and impact', 'RISK_MGMT', 'ui', 'positive', 'critical'),
  ('TC-RISK-002', 'Risk score (probability × impact) calculates and displays correctly', 'RISK_MGMT', 'ui', 'positive', 'high'),
  ('TC-RISK-003', 'Missing probability or impact triggers field validation', 'RISK_MGMT', 'ui', 'negative', 'high'),
  ('TC-RISK-004', 'Risk can be linked to a project and appears in risk register', 'RISK_MGMT', 'ui', 'positive', 'medium'),
  ('TC-RISK-005', 'Viewer cannot delete a risk', 'RISK_MGMT', 'ui', 'negative', 'critical'),
  ('TC-ISS-001', 'Project Manager can create and save an issue', 'ISSUE_MGMT', 'ui', 'positive', 'critical'),
  ('TC-ISS-002', 'Issue can be escalated and escalation is recorded', 'ISSUE_MGMT', 'ui', 'positive', 'high'),
  ('TC-ISS-003', 'Issue status change is captured in audit log', 'ISSUE_MGMT', 'database', 'positive', 'high'),
  ('TC-ISS-004', 'Closed issue cannot be edited without re-open permission', 'ISSUE_MGMT', 'ui', 'negative', 'high'),
  ('TC-ISS-005', 'Team Member cannot delete a project issue', 'ISSUE_MGMT', 'ui', 'negative', 'critical'),
  ('TC-CHG-001', 'Change request can be created with all required fields', 'CHANGE_CTRL', 'ui', 'positive', 'critical'),
  ('TC-CHG-002', 'Change request can be assessed and impact recorded', 'CHANGE_CTRL', 'ui', 'positive', 'high'),
  ('TC-CHG-003', 'Change decision updates status and notifies requester', 'CHANGE_CTRL', 'ui', 'positive', 'high'),
  ('TC-CHG-004', 'Unauthorised role cannot approve a change request', 'CHANGE_CTRL', 'ui', 'negative', 'critical'),
  ('TC-CHG-005', 'Approved change request appears in PMO dashboard metrics', 'CHANGE_CTRL', 'ui', 'positive', 'medium'),
  ('TC-AGL-001', 'Product Owner can create a backlog item with story points', 'AGILE_BACKLOG', 'ui', 'positive', 'critical'),
  ('TC-AGL-002', 'Scrum Master can create a sprint with start and end dates', 'SPRINT_MGMT', 'ui', 'positive', 'critical'),
  ('TC-AGL-003', 'Team Member can update status of an assigned task', 'KANBAN', 'ui', 'positive', 'high'),
  ('TC-AGL-004', 'Sprint cannot be closed when required completion criteria are not met', 'SPRINT_MGMT', 'ui', 'negative', 'high'),
  ('TC-AGL-005', 'Viewer cannot move backlog items between columns', 'KANBAN', 'ui', 'negative', 'critical'),
  ('TC-AGL-006', 'Sprint velocity calculation is accurate from completed story points', 'SPRINT_MGMT', 'ui', 'positive', 'medium'),
  ('TC-AGL-007', 'Kanban board reflects task status changes in real time', 'KANBAN', 'ui', 'positive', 'medium'),
  ('TC-RPT-001', 'PMO dashboard loads summary metrics without errors', 'REPORTING', 'ui', 'positive', 'critical'),
  ('TC-RPT-002', 'PM dashboard loads project-specific KPIs for correct project', 'PM_DASHBOARD', 'ui', 'positive', 'critical'),
  ('TC-RPT-003', 'Project status counts on dashboard match database counts', 'REPORTING', 'database', 'positive', 'high'),
  ('TC-RPT-004', 'Agile sprint velocity metrics are accurate', 'REPORTING', 'ui', 'positive', 'high'),
  ('TC-RPT-005', 'Failed API response shows user-friendly error message (not raw error)', 'REPORTING', 'ui', 'negative', 'high'),
  ('TC-RPT-006', 'Export report button produces downloadable file', 'REPORTING', 'ui', 'positive', 'medium'),
  ('TC-TDC-001', 'System Admin can create a test case with all required fields', 'TESTING_CENTRE', 'ui', 'positive', 'critical'),
  ('TC-TDC-002', 'Viewer cannot delete a test case', 'TESTING_CENTRE', 'ui', 'negative', 'critical'),
  ('TC-TDC-003', 'Test suite can be created and test cases added in order', 'TESTING_CENTRE', 'ui', 'positive', 'high'),
  ('TC-TDC-004', 'Test run records pass/fail result per test case', 'TESTING_CENTRE', 'ui', 'positive', 'critical'),
  ('TC-TDC-005', 'Screenshot evidence is linked to the test run result', 'TESTING_CENTRE', 'ui', 'positive', 'high'),
  ('TC-TDC-006', 'Failed test automatically creates defect when auto-create is enabled', 'TESTING_CENTRE', 'database', 'positive', 'high'),
  ('TC-TDC-007', 'Batch AI fix prompt .md file is generated for all failures', 'TESTING_CENTRE', 'ui', 'positive', 'high'),
  ('TC-TDC-008', 'Diagnostic session generates Cursor/Claude AI fix prompt', 'TESTING_CENTRE', 'ui', 'positive', 'high'),
  ('TC-PERM-001', 'Viewer cannot create, edit, or delete any PMIS record', 'RISK_MGMT', 'ui', 'negative', 'critical'),
  ('TC-PERM-002', 'Team Member cannot access PMO dashboard', 'PMO_DASHBOARD', 'ui', 'negative', 'high'),
  ('TC-PERM-003', 'Project Manager cannot access system administration pages', 'USER_MGMT', 'ui', 'negative', 'high'),
  ('TC-PERM-004', 'Unauthenticated request to Supabase RPC returns RLS error', 'REPORTING', 'api', 'negative', 'critical'),
  ('TC-PERM-005', 'Role without testing_centre.run permission cannot start a test run', 'TESTING_CENTRE', 'ui', 'negative', 'high'),
  ('TC-PERM-006', 'Simulator user cannot read Platform (public schema) data via simDb', 'REPORTING', 'database', 'negative', 'critical')
) AS t(code, tle, mcode, tty, sct, pri)
JOIN public.tc_test_modules m ON m.code = t.mcode
ON CONFLICT (test_case_code) DO UPDATE SET
  title = EXCLUDED.title, module_id = EXCLUDED.module_id, test_type = EXCLUDED.test_type,
  scenario_type = EXCLUDED.scenario_type, priority = EXCLUDED.priority, updated_at = now();

-- Mirror 68 to sim
INSERT INTO sim.tc_test_cases (test_case_code, title, module_id, test_type, scenario_type, priority, status, methodology_type, test_steps, is_active, is_reusable, tags, test_data)
SELECT t.code, t.tle, m.id, t.tty, t.sct, t.pri, 'ready', 'hybrid', '[]'::jsonb, true, true, array[]::text[], '{}'::jsonb
FROM (VALUES
  ('TC-AUTH-001', 'Valid credentials login succeeds and redirects to dashboard', 'AUTH', 'ui', 'positive', 'critical'),
  ('TC-AUTH-002', 'Invalid password login shows error message', 'AUTH', 'ui', 'negative', 'critical'),
  ('TC-AUTH-003', 'Logged-out user cannot access /platform/dashboard — redirected to login', 'AUTH', 'ui', 'negative', 'critical'),
  ('TC-AUTH-004', 'User only sees sidebar navigation items permitted for their role', 'AUTH', 'ui', 'positive', 'high'),
  ('TC-AUTH-005', 'Expired session redirects to login without data loss', 'AUTH', 'ui', 'edge_case', 'high'),
  ('TC-AUTH-006', 'Organisation verification required before project access', 'AUTH', 'ui', 'negative', 'high'),
  ('TC-USR-001', 'System Admin can create a new user and assign a role', 'USER_MGMT', 'ui', 'positive', 'high'),
  ('TC-USR-002', 'Duplicate email registration is rejected with validation error', 'USER_MGMT', 'ui', 'negative', 'high'),
  ('TC-USR-003', 'Non-admin cannot access user administration pages', 'USER_MGMT', 'ui', 'negative', 'critical'),
  ('TC-USR-004', 'Role change takes effect immediately on next navigation', 'USER_MGMT', 'ui', 'positive', 'medium'),
  ('TC-PROJ-001', 'Project Manager can create a predictive project with all required fields', 'PROJECT_STARTUP', 'ui', 'positive', 'critical'),
  ('TC-PROJ-002', 'Missing required project fields show field-level validation errors', 'PROJECT_STARTUP', 'ui', 'negative', 'critical'),
  ('TC-PROJ-003', 'Viewer cannot edit predictive project baseline', 'PROJECT_STARTUP', 'ui', 'negative', 'high'),
  ('TC-PROJ-004', 'Project appears in project list immediately after creation', 'PROJECT_STARTUP', 'ui', 'positive', 'high'),
  ('TC-PROJ-005', 'Project creation success confirmation shows project code and name', 'PROJECT_STARTUP', 'ui', 'positive', 'medium'),
  ('TC-PROJ-006', 'Trial project limit enforced — second free trial blocked', 'PROJECT_STARTUP', 'ui', 'negative', 'high'),
  ('TC-STAGE-001', 'Project Manager can create and name a project stage', 'STAGE_MGMT', 'ui', 'positive', 'high'),
  ('TC-STAGE-002', 'Stage cannot be closed without end-stage report', 'STAGE_MGMT', 'ui', 'negative', 'high'),
  ('TC-STAGE-003', 'Stage progress percentage calculates correctly from task completion', 'STAGE_MGMT', 'ui', 'positive', 'medium'),
  ('TC-STAGE-004', 'Viewer cannot modify stage status', 'STAGE_MGMT', 'ui', 'negative', 'high'),
  ('TC-WA-001', 'Project Manager can create a work authorisation request', 'WORK_AUTH', 'ui', 'positive', 'critical'),
  ('TC-WA-002', 'Approver can approve a submitted work authorisation', 'WORK_AUTH', 'ui', 'positive', 'critical'),
  ('TC-WA-003', 'Approver can reject with mandatory rejection reason', 'WORK_AUTH', 'ui', 'negative', 'high'),
  ('TC-WA-004', 'Work authorisation can be suspended and resumed', 'WORK_AUTH', 'ui', 'positive', 'high'),
  ('TC-WA-005', 'Unauthorised role cannot approve work authorisation', 'WORK_AUTH', 'ui', 'negative', 'critical'),
  ('TC-WA-006', 'Work authorisation history log records all status transitions', 'WORK_AUTH', 'database', 'positive', 'medium'),
  ('TC-RISK-001', 'Project Manager can create a risk with probability and impact', 'RISK_MGMT', 'ui', 'positive', 'critical'),
  ('TC-RISK-002', 'Risk score (probability × impact) calculates and displays correctly', 'RISK_MGMT', 'ui', 'positive', 'high'),
  ('TC-RISK-003', 'Missing probability or impact triggers field validation', 'RISK_MGMT', 'ui', 'negative', 'high'),
  ('TC-RISK-004', 'Risk can be linked to a project and appears in risk register', 'RISK_MGMT', 'ui', 'positive', 'medium'),
  ('TC-RISK-005', 'Viewer cannot delete a risk', 'RISK_MGMT', 'ui', 'negative', 'critical'),
  ('TC-ISS-001', 'Project Manager can create and save an issue', 'ISSUE_MGMT', 'ui', 'positive', 'critical'),
  ('TC-ISS-002', 'Issue can be escalated and escalation is recorded', 'ISSUE_MGMT', 'ui', 'positive', 'high'),
  ('TC-ISS-003', 'Issue status change is captured in audit log', 'ISSUE_MGMT', 'database', 'positive', 'high'),
  ('TC-ISS-004', 'Closed issue cannot be edited without re-open permission', 'ISSUE_MGMT', 'ui', 'negative', 'high'),
  ('TC-ISS-005', 'Team Member cannot delete a project issue', 'ISSUE_MGMT', 'ui', 'negative', 'critical'),
  ('TC-CHG-001', 'Change request can be created with all required fields', 'CHANGE_CTRL', 'ui', 'positive', 'critical'),
  ('TC-CHG-002', 'Change request can be assessed and impact recorded', 'CHANGE_CTRL', 'ui', 'positive', 'high'),
  ('TC-CHG-003', 'Change decision updates status and notifies requester', 'CHANGE_CTRL', 'ui', 'positive', 'high'),
  ('TC-CHG-004', 'Unauthorised role cannot approve a change request', 'CHANGE_CTRL', 'ui', 'negative', 'critical'),
  ('TC-CHG-005', 'Approved change request appears in PMO dashboard metrics', 'CHANGE_CTRL', 'ui', 'positive', 'medium'),
  ('TC-AGL-001', 'Product Owner can create a backlog item with story points', 'AGILE_BACKLOG', 'ui', 'positive', 'critical'),
  ('TC-AGL-002', 'Scrum Master can create a sprint with start and end dates', 'SPRINT_MGMT', 'ui', 'positive', 'critical'),
  ('TC-AGL-003', 'Team Member can update status of an assigned task', 'KANBAN', 'ui', 'positive', 'high'),
  ('TC-AGL-004', 'Sprint cannot be closed when required completion criteria are not met', 'SPRINT_MGMT', 'ui', 'negative', 'high'),
  ('TC-AGL-005', 'Viewer cannot move backlog items between columns', 'KANBAN', 'ui', 'negative', 'critical'),
  ('TC-AGL-006', 'Sprint velocity calculation is accurate from completed story points', 'SPRINT_MGMT', 'ui', 'positive', 'medium'),
  ('TC-AGL-007', 'Kanban board reflects task status changes in real time', 'KANBAN', 'ui', 'positive', 'medium'),
  ('TC-RPT-001', 'PMO dashboard loads summary metrics without errors', 'REPORTING', 'ui', 'positive', 'critical'),
  ('TC-RPT-002', 'PM dashboard loads project-specific KPIs for correct project', 'PM_DASHBOARD', 'ui', 'positive', 'critical'),
  ('TC-RPT-003', 'Project status counts on dashboard match database counts', 'REPORTING', 'database', 'positive', 'high'),
  ('TC-RPT-004', 'Agile sprint velocity metrics are accurate', 'REPORTING', 'ui', 'positive', 'high'),
  ('TC-RPT-005', 'Failed API response shows user-friendly error message (not raw error)', 'REPORTING', 'ui', 'negative', 'high'),
  ('TC-RPT-006', 'Export report button produces downloadable file', 'REPORTING', 'ui', 'positive', 'medium'),
  ('TC-TDC-001', 'System Admin can create a test case with all required fields', 'TESTING_CENTRE', 'ui', 'positive', 'critical'),
  ('TC-TDC-002', 'Viewer cannot delete a test case', 'TESTING_CENTRE', 'ui', 'negative', 'critical'),
  ('TC-TDC-003', 'Test suite can be created and test cases added in order', 'TESTING_CENTRE', 'ui', 'positive', 'high'),
  ('TC-TDC-004', 'Test run records pass/fail result per test case', 'TESTING_CENTRE', 'ui', 'positive', 'critical'),
  ('TC-TDC-005', 'Screenshot evidence is linked to the test run result', 'TESTING_CENTRE', 'ui', 'positive', 'high'),
  ('TC-TDC-006', 'Failed test automatically creates defect when auto-create is enabled', 'TESTING_CENTRE', 'database', 'positive', 'high'),
  ('TC-TDC-007', 'Batch AI fix prompt .md file is generated for all failures', 'TESTING_CENTRE', 'ui', 'positive', 'high'),
  ('TC-TDC-008', 'Diagnostic session generates Cursor/Claude AI fix prompt', 'TESTING_CENTRE', 'ui', 'positive', 'high'),
  ('TC-PERM-001', 'Viewer cannot create, edit, or delete any PMIS record', 'RISK_MGMT', 'ui', 'negative', 'critical'),
  ('TC-PERM-002', 'Team Member cannot access PMO dashboard', 'PMO_DASHBOARD', 'ui', 'negative', 'high'),
  ('TC-PERM-003', 'Project Manager cannot access system administration pages', 'USER_MGMT', 'ui', 'negative', 'high'),
  ('TC-PERM-004', 'Unauthenticated request to Supabase RPC returns RLS error', 'REPORTING', 'api', 'negative', 'critical'),
  ('TC-PERM-005', 'Role without testing_centre.run permission cannot start a test run', 'TESTING_CENTRE', 'ui', 'negative', 'high'),
  ('TC-PERM-006', 'Simulator user cannot read Platform (public schema) data via simDb', 'REPORTING', 'database', 'negative', 'critical')
) AS t(code, tle, mcode, tty, sct, pri)
JOIN sim.tc_test_modules m ON m.code = t.mcode
ON CONFLICT (test_case_code) DO UPDATE SET title = EXCLUDED.title, module_id = EXCLUDED.module_id, updated_at = now();

-- -----------------------------------------------------------------------------
-- 6.16–6.19 Extras: suites, suite–case links, automation registry, personas, verify
-- -----------------------------------------------------------------------------

INSERT INTO public.tc_test_suites (suite_code, name, description, suite_type, methodology_type, environment_id, is_active) VALUES
('SUITE-SMOKE-001', 'Authentication Smoke Suite', 'Core auth flow', 'smoke', 'hybrid',
  (SELECT id FROM public.tc_test_environments WHERE name = 'Local Development' LIMIT 1), true),
('SUITE-REG-PRED', 'Predictive Project Lifecycle Regression', 'Predictive, stages, work auth', 'regression', 'predictive',
  (SELECT id FROM public.tc_test_environments WHERE name = 'Local Development' LIMIT 1), true),
('SUITE-REG-AGILE', 'Agile Sprint Management Regression', 'Backlog, sprint, kanban', 'regression', 'agile',
  (SELECT id FROM public.tc_test_environments WHERE name = 'Local Development' LIMIT 1), true),
('SUITE-RISK-ISSUE', 'Risk, Issue & Change Management Suite', 'RIC modules', 'module', 'hybrid',
  (SELECT id FROM public.tc_test_environments WHERE name = 'Local Development' LIMIT 1), true),
('SUITE-PERM-NEG', 'Role Permission Negative Test Suite', 'Access control', 'regression', 'hybrid',
  (SELECT id FROM public.tc_test_environments WHERE name = 'Local Development' LIMIT 1), true),
('SUITE-RELEASE', 'Release Readiness Suite', 'Critical *-001 smoke', 'release', 'hybrid',
  (SELECT id FROM public.tc_test_environments WHERE name = 'Local Development' LIMIT 1), true),
('SUITE-TDC', 'Testing Centre Self-Test Suite', 'TDC self coverage', 'module', 'system',
  (SELECT id FROM public.tc_test_environments WHERE name = 'Local Development' LIMIT 1), true)
ON CONFLICT (suite_code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, updated_at = now();

-- Link cases to suites (idempotent re-run: insert missing links only)
INSERT INTO public.tc_test_suite_cases (suite_id, tc_test_case_id, run_order, is_required)
SELECT s.id, c.id, o.ord, o.req
FROM (VALUES
  ('SUITE-SMOKE-001', 'TC-AUTH-001', 1, true), ('SUITE-SMOKE-001', 'TC-AUTH-002', 2, true),
  ('SUITE-SMOKE-001', 'TC-AUTH-003', 3, true), ('SUITE-SMOKE-001', 'TC-AUTH-004', 4, true)
) AS o(suite, code, ord, req)
JOIN public.tc_test_suites s ON s.suite_code = o.suite
JOIN public.tc_test_cases c ON c.test_case_code = o.code
ON CONFLICT (suite_id, tc_test_case_id) DO NOTHING;

INSERT INTO public.tc_test_suite_cases (suite_id, tc_test_case_id, run_order, is_required)
SELECT s.id, c.id, o.ord, true
FROM (VALUES
  ('SUITE-REG-PRED', 'TC-PROJ-001', 1), ('SUITE-REG-PRED', 'TC-PROJ-002', 2), ('SUITE-REG-PRED', 'TC-PROJ-003', 3), ('SUITE-REG-PRED', 'TC-PROJ-004', 4),
  ('SUITE-REG-PRED', 'TC-PROJ-005', 5), ('SUITE-REG-PRED', 'TC-PROJ-006', 6), ('SUITE-REG-PRED', 'TC-STAGE-001', 7), ('SUITE-REG-PRED', 'TC-STAGE-002', 8),
  ('SUITE-REG-PRED', 'TC-STAGE-003', 9), ('SUITE-REG-PRED', 'TC-STAGE-004', 10), ('SUITE-REG-PRED', 'TC-WA-001', 11), ('SUITE-REG-PRED', 'TC-WA-002', 12),
  ('SUITE-REG-PRED', 'TC-WA-003', 13), ('SUITE-REG-PRED', 'TC-WA-004', 14), ('SUITE-REG-PRED', 'TC-WA-005', 15), ('SUITE-REG-PRED', 'TC-WA-006', 16)
) AS o(suite, code, ord)
JOIN public.tc_test_suites s ON s.suite_code = o.suite
JOIN public.tc_test_cases c ON c.test_case_code = o.code
ON CONFLICT (suite_id, tc_test_case_id) DO NOTHING;

INSERT INTO public.tc_test_suite_cases (suite_id, tc_test_case_id, run_order, is_required)
SELECT s.id, c.id, o.ord, true
FROM (VALUES
  ('SUITE-REG-AGILE', 'TC-AGL-001', 1), ('SUITE-REG-AGILE', 'TC-AGL-002', 2), ('SUITE-REG-AGILE', 'TC-AGL-003', 3), ('SUITE-REG-AGILE', 'TC-AGL-004', 4),
  ('SUITE-REG-AGILE', 'TC-AGL-005', 5), ('SUITE-REG-AGILE', 'TC-AGL-006', 6), ('SUITE-REG-AGILE', 'TC-AGL-007', 7)
) AS o(suite, code, ord)
JOIN public.tc_test_suites s ON s.suite_code = o.suite
JOIN public.tc_test_cases c ON c.test_case_code = o.code
ON CONFLICT (suite_id, tc_test_case_id) DO NOTHING;

INSERT INTO public.tc_test_suite_cases (suite_id, tc_test_case_id, run_order, is_required)
SELECT s.id, c.id, o.ord, (c.priority = 'critical')
FROM (VALUES
  ('SUITE-RISK-ISSUE', 'TC-RISK-001', 1), ('SUITE-RISK-ISSUE', 'TC-RISK-002', 2), ('SUITE-RISK-ISSUE', 'TC-RISK-003', 3), ('SUITE-RISK-ISSUE', 'TC-RISK-004', 4), ('SUITE-RISK-ISSUE', 'TC-RISK-005', 5),
  ('SUITE-RISK-ISSUE', 'TC-ISS-001', 6), ('SUITE-RISK-ISSUE', 'TC-ISS-002', 7), ('SUITE-RISK-ISSUE', 'TC-ISS-003', 8), ('SUITE-RISK-ISSUE', 'TC-ISS-004', 9), ('SUITE-RISK-ISSUE', 'TC-ISS-005', 10),
  ('SUITE-RISK-ISSUE', 'TC-CHG-001', 11), ('SUITE-RISK-ISSUE', 'TC-CHG-002', 12), ('SUITE-RISK-ISSUE', 'TC-CHG-003', 13), ('SUITE-RISK-ISSUE', 'TC-CHG-004', 14), ('SUITE-RISK-ISSUE', 'TC-CHG-005', 15)
) AS o(suite, code, ord)
JOIN public.tc_test_suites s ON s.suite_code = o.suite
JOIN public.tc_test_cases c ON c.test_case_code = o.code
ON CONFLICT (suite_id, tc_test_case_id) DO NOTHING;

INSERT INTO public.tc_test_suite_cases (suite_id, tc_test_case_id, run_order, is_required)
SELECT s.id, c.id, o.ord, true
FROM (VALUES
  ('SUITE-PERM-NEG', 'TC-PERM-001', 1), ('SUITE-PERM-NEG', 'TC-PERM-002', 2), ('SUITE-PERM-NEG', 'TC-PERM-003', 3), ('SUITE-PERM-NEG', 'TC-PERM-004', 4),
  ('SUITE-PERM-NEG', 'TC-PERM-005', 5), ('SUITE-PERM-NEG', 'TC-PERM-006', 6), ('SUITE-PERM-NEG', 'TC-AUTH-003', 7), ('SUITE-PERM-NEG', 'TC-AUTH-004', 8)
) AS o(suite, code, ord)
JOIN public.tc_test_suites s ON s.suite_code = o.suite
JOIN public.tc_test_cases c ON c.test_case_code = o.code
ON CONFLICT (suite_id, tc_test_case_id) DO NOTHING;

INSERT INTO public.tc_test_suite_cases (suite_id, tc_test_case_id, run_order, is_required)
SELECT s.id, c.id, o.ord, true
FROM (VALUES
  ('SUITE-RELEASE', 'TC-AUTH-001', 1), ('SUITE-RELEASE', 'TC-USR-001', 2), ('SUITE-RELEASE', 'TC-PROJ-001', 3), ('SUITE-RELEASE', 'TC-STAGE-001', 4), ('SUITE-RELEASE', 'TC-WA-001', 5), ('SUITE-RELEASE', 'TC-RISK-001', 6),
  ('SUITE-RELEASE', 'TC-ISS-001', 7), ('SUITE-RELEASE', 'TC-CHG-001', 8), ('SUITE-RELEASE', 'TC-AGL-001', 9), ('SUITE-RELEASE', 'TC-RPT-001', 10), ('SUITE-RELEASE', 'TC-TDC-001', 11), ('SUITE-RELEASE', 'TC-PERM-001', 12)
) AS o(suite, code, ord)
JOIN public.tc_test_suites s ON s.suite_code = o.suite
JOIN public.tc_test_cases c ON c.test_case_code = o.code
ON CONFLICT (suite_id, tc_test_case_id) DO NOTHING;

INSERT INTO public.tc_test_suite_cases (suite_id, tc_test_case_id, run_order, is_required)
SELECT s.id, c.id, o.ord, true
FROM (VALUES
  ('SUITE-TDC', 'TC-TDC-001', 1), ('SUITE-TDC', 'TC-TDC-002', 2), ('SUITE-TDC', 'TC-TDC-003', 3), ('SUITE-TDC', 'TC-TDC-004', 4),
  ('SUITE-TDC', 'TC-TDC-005', 5), ('SUITE-TDC', 'TC-TDC-006', 6), ('SUITE-TDC', 'TC-TDC-007', 7), ('SUITE-TDC', 'TC-TDC-008', 8)
) AS o(suite, code, ord)
JOIN public.tc_test_suites s ON s.suite_code = o.suite
JOIN public.tc_test_cases c ON c.test_case_code = o.code
ON CONFLICT (suite_id, tc_test_case_id) DO NOTHING;

-- 6.17 Automation registry
INSERT INTO public.tc_allowed_script_directories (directory_path, description, is_active)
SELECT v.path, v.dsc, true FROM (VALUES
  ('tests/e2e', 'Playwright e2e'), ('tests/unit', 'Vitest'), ('tests/api', 'API tests'),
  ('tests/db', 'DB tests'), ('test-runner', 'Test runner')
) AS v(path, dsc)
WHERE NOT EXISTS (SELECT 1 FROM public.tc_allowed_script_directories a WHERE a.directory_path = v.path);

INSERT INTO public.tc_automation_scripts (script_key, script_type, script_path, tc_test_case_id, is_active, last_run_status)
SELECT v.key, v.ctype, v.path, c.id, true, null
FROM (VALUES
  ('e2e-auth-login-valid', 'playwright', 'tests/e2e/auth/login-valid.spec.ts', 'TC-AUTH-001'),
  ('e2e-auth-login-invalid', 'playwright', 'tests/e2e/auth/login-invalid.spec.ts', 'TC-AUTH-002'),
  ('e2e-auth-protected-route', 'playwright', 'tests/e2e/auth/protected-route.spec.ts', 'TC-AUTH-003'),
  ('e2e-proj-create', 'playwright', 'tests/e2e/predictive/project-create.spec.ts', 'TC-PROJ-001'),
  ('e2e-proj-validation', 'playwright', 'tests/e2e/predictive/project-validation.spec.ts', 'TC-PROJ-002'),
  ('e2e-risk-create', 'playwright', 'tests/e2e/risk-issue-change/risk-create.spec.ts', 'TC-RISK-001'),
  ('e2e-risk-score', 'playwright', 'tests/e2e/risk-issue-change/risk-score.spec.ts', 'TC-RISK-002'),
  ('e2e-perm-viewer', 'playwright', 'tests/e2e/permissions/viewer-restrictions.spec.ts', 'TC-PERM-001'),
  ('e2e-perm-rls', 'playwright', 'tests/e2e/permissions/rls-unauthenticated.spec.ts', 'TC-PERM-004'),
  ('unit-risk-priority', 'vitest', 'tests/unit/riskPriority.test.ts', 'TC-RISK-002'),
  ('unit-sprint-velocity', 'vitest', 'tests/unit/sprintVelocity.test.ts', 'TC-AGL-006'),
  ('unit-permission-checker', 'vitest', 'tests/unit/permissionChecker.test.ts', 'TC-PERM-001'),
  ('db-rls-sim-isolation', 'sql', 'tests/db/sim-isolation.sql', 'TC-PERM-006')
) AS v(key, ctype, path, tcode)
JOIN public.tc_test_cases c ON c.test_case_code = v.tcode
ON CONFLICT (script_key) DO UPDATE SET script_path = EXCLUDED.script_path, tc_test_case_id = EXCLUDED.tc_test_case_id, updated_at = now();

-- 6.18 Persona test data sets
INSERT INTO public.tc_test_data_sets (name, persona, data, environment_type, is_active)
SELECT v.n, v.p, v.d::jsonb, v.e, true FROM (VALUES
  ('System Admin Persona', 'system_admin', '{"role":"system_admin","email_env_var":"E2E_SYSADMIN_EMAIL","password_env_var":"E2E_SYSADMIN_PASS"}', 'local'),
  ('PMO Admin Persona', 'pmo_admin', '{"role":"pmo_admin","email_env_var":"E2E_PMO_EMAIL","password_env_var":"E2E_PMO_PASS"}', 'local'),
  ('Project Manager Persona', 'project_manager', '{"role":"project_manager","email_env_var":"E2E_PM_EMAIL","password_env_var":"E2E_PM_PASS","sample_project_id_env_var":"E2E_PM_PROJECT_ID"}', 'local'),
  ('Scrum Master Persona', 'scrum_master', '{"role":"scrum_master","email_env_var":"E2E_SM_EMAIL","password_env_var":"E2E_SM_PASS"}', 'local'),
  ('Product Owner Persona', 'product_owner', '{"role":"product_owner","email_env_var":"E2E_PO_EMAIL","password_env_var":"E2E_PO_PASS"}', 'local'),
  ('Team Member Persona', 'team_member', '{"role":"team_member","email_env_var":"E2E_TM_EMAIL","password_env_var":"E2E_TM_PASS"}', 'local'),
  ('Tester Persona', 'tester', '{"role":"tester","email_env_var":"E2E_TESTER_EMAIL","password_env_var":"E2E_TESTER_PASS"}', 'local'),
  ('Viewer Persona', 'viewer', '{"role":"viewer","email_env_var":"E2E_VIEWER_EMAIL","password_env_var":"E2E_VIEWER_PASS"}', 'local')
) AS v(n, p, d, e)
WHERE NOT EXISTS (SELECT 1 FROM public.tc_test_data_sets t WHERE t.name = v.n);

-- Sim: mirror suites and links (by code)
INSERT INTO sim.tc_test_suites (suite_code, name, description, suite_type, methodology_type, environment_id, is_active)
SELECT suite_code, name, description, suite_type, methodology_type,
  (SELECT e.id FROM sim.tc_test_environments e WHERE e.name = 'Local Development' LIMIT 1), is_active
FROM public.tc_test_suites
WHERE suite_code LIKE 'SUITE-%'
ON CONFLICT (suite_code) DO UPDATE SET name = EXCLUDED.name, updated_at = now();

INSERT INTO sim.tc_test_suite_cases (suite_id, tc_test_case_id, run_order, is_required)
SELECT ns.id, nc.id, p.run_order, p.is_required
FROM public.tc_test_suite_cases p
JOIN public.tc_test_suites ps ON ps.id = p.suite_id
JOIN public.tc_test_cases pc ON pc.id = p.tc_test_case_id
JOIN sim.tc_test_suites ns ON ns.suite_code = ps.suite_code
JOIN sim.tc_test_cases nc ON nc.test_case_code = pc.test_case_code
ON CONFLICT (suite_id, tc_test_case_id) DO NOTHING;

INSERT INTO sim.tc_automation_scripts (script_key, script_type, script_path, tc_test_case_id, is_active, last_run_status)
SELECT a.script_key, a.script_type, a.script_path, c.id, true, null
FROM public.tc_automation_scripts a
JOIN public.tc_test_cases pc ON pc.id = a.tc_test_case_id
JOIN sim.tc_test_cases c ON c.test_case_code = pc.test_case_code
ON CONFLICT (script_key) DO UPDATE SET script_path = EXCLUDED.script_path, updated_at = now();

INSERT INTO sim.tc_test_data_sets (name, persona, data, environment_type, is_active)
SELECT t.name, t.persona, t.data, t.environment_type, t.is_active FROM public.tc_test_data_sets t
WHERE NOT EXISTS (SELECT 1 FROM sim.tc_test_data_sets s WHERE s.name = t.name);
-- 6.19.1 Verify (uncomment in SQL client)
-- SELECT (SELECT COUNT(*) FROM public.tc_test_modules) AS modules,
--        (SELECT COUNT(*) FROM public.tc_test_cases) AS cases,
--        (SELECT COUNT(*) FROM public.tc_test_suites) AS suites,
--        (SELECT COUNT(*) FROM public.tc_test_suite_cases) AS suite_case_links;
