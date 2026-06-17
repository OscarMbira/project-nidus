-- =============================================================================
-- v703: Seed Data – Tasks (10 tasks for EDP-2024)
-- Prerequisites: v696 (demo project must exist).
-- Covers tasks relevant to PM, team_member, team_lead roles.
-- Uses the first active task_status and resolves assigned users by role.
-- =============================================================================

DO $$
DECLARE
  v_project_id  UUID;
  v_pm_user_id  UUID;
  v_tm_user_id  UUID;
  v_status_todo UUID;
  v_status_wip  UUID;
  v_status_done UUID;
BEGIN

  SELECT id INTO v_project_id
  FROM public.projects
  WHERE project_code = 'EDP-2024' AND COALESCE(is_deleted, false) = false LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE NOTICE 'v703: Demo project not found – run v696 first. Skipping.';
    RETURN;
  END IF;

  -- Resolve task statuses
  SELECT id INTO v_status_todo FROM public.task_statuses
  WHERE LOWER(status_name) IN ('to do','todo','not started','backlog') LIMIT 1;

  SELECT id INTO v_status_wip  FROM public.task_statuses
  WHERE LOWER(status_name) IN ('in progress','in-progress','doing','active') LIMIT 1;

  SELECT id INTO v_status_done FROM public.task_statuses
  WHERE LOWER(status_name) IN ('done','complete','completed','closed') LIMIT 1;

  -- Fall back to first available status if named statuses not found
  IF v_status_todo IS NULL THEN
    SELECT id INTO v_status_todo FROM public.task_statuses LIMIT 1;
  END IF;
  IF v_status_wip  IS NULL THEN v_status_wip  := v_status_todo; END IF;
  IF v_status_done IS NULL THEN v_status_done := v_status_todo; END IF;

  -- Resolve PM user
  SELECT u.id INTO v_pm_user_id
  FROM public.users u
  JOIN public.user_roles ur ON ur.user_id = u.id
  JOIN public.roles r ON r.id = ur.role_id
  WHERE r.role_name = 'project_manager' AND ur.is_active = true
    AND COALESCE(u.is_deleted, false) = false LIMIT 1;

  IF v_pm_user_id IS NULL THEN
    SELECT id INTO v_pm_user_id FROM public.users WHERE COALESCE(is_deleted, false) = false LIMIT 1;
  END IF;

  -- Resolve TM user (different from PM if possible)
  SELECT u.id INTO v_tm_user_id
  FROM public.users u
  JOIN public.user_roles ur ON ur.user_id = u.id
  JOIN public.roles r ON r.id = ur.role_id
  WHERE r.role_name IN ('team_member', 'pm_team_member') AND ur.is_active = true
    AND COALESCE(u.is_deleted, false) = false LIMIT 1;

  IF v_tm_user_id IS NULL THEN v_tm_user_id := v_pm_user_id; END IF;

  -- Set auth.uid() so audit triggers get a real user ID
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', (
      SELECT auth_user_id::text FROM public.users WHERE id = v_pm_user_id AND auth_user_id IS NOT NULL LIMIT 1
    ))::text, true);

  -- ─── Insert tasks ─────────────────────────────────────────────────────────

  INSERT INTO public.tasks (
    id, project_id, task_name, task_description,
    status_id, priority,
    assigned_to_user_id,
    due_date, estimated_hours, actual_hours,
    is_active, is_deleted, created_at, updated_at
  )
  SELECT
    gen_random_uuid(), v_project_id, t.task_name, t.task_desc,
    CASE t.status
      WHEN 'todo' THEN v_status_todo
      WHEN 'wip'  THEN v_status_wip
      WHEN 'done' THEN v_status_done
      ELSE v_status_todo
    END,
    t.priority,
    CASE t.assignee WHEN 'pm' THEN v_pm_user_id ELSE v_tm_user_id END,
    CURRENT_DATE + (t.due_offset || ' days')::interval,
    t.est_hours, t.actual_hours,
    true, false, NOW(), NOW()
  FROM (VALUES
    -- (task_name, task_desc, status, priority, assignee, due_offset, est_hours, actual_hours)
    ('Finalise Stage 3 Entry Gate Checklist',
     'Review all Stage 3 entry criteria against current project status. Update the gate checklist with evidence links. Prepare gate review presentation for Programme Director.',
     'wip', 'high', 'pm', 5, 8, 3),

    ('Complete Risk Register Review – Q2',
     'Review all 10 active risks. Update probability and impact scores based on latest project status. Close RSK-010 (opportunity realised). Confirm risk owners are still current.',
     'todo', 'high', 'pm', 7, 4, 0),

    ('Update Integrated Programme Plan Following CR-003 Approval',
     'Incorporate the 6-week Stage 3 extension (CR-003) into the integrated programme plan. Update all milestone dates, dependency links, and Stage 4 start assumptions. Circulate revised plan to all workstream leads.',
     'wip', 'critical', 'pm', 3, 12, 6),

    ('Conduct Sprint 13 Retrospective',
     'Facilitate the Sprint 13 retrospective with the development team. Capture outcomes using the Start/Stop/Continue format. Agree 3 actionable improvements for Sprint 14. Add any lessons to the lessons log.',
     'todo', 'medium', 'pm', 2, 3, 0),

    ('Write API Integration Technical Specification – Payment Gateway',
     'Document the technical integration specification for the payment gateway API (ISS-001 resolution). Include retry logic implementation pattern, error handling matrix, and circuit breaker configuration. Target audience: development team.',
     'wip', 'high', 'tm', 4, 16, 10),

    ('Execute Data Cleansing Script – Customer Records Batch 3',
     'Run the approved data cleansing script against Customer Records Batch 3 (records 160,001–240,000). Log all anomalies. Update data quality dashboard. Flag any records requiring manual review to the Data Architect.',
     'todo', 'high', 'tm', 6, 8, 0),

    ('Build Power BI Dashboard – Project Financial Summary',
     'Create the Project Financial Summary dashboard in Power BI Embedded following CR-004 approval. Metrics: budget vs actuals, contingency remaining, monthly burn rate, forecast at completion. Sign-off required from Finance Director.',
     'wip', 'medium', 'tm', 10, 24, 14),

    ('Update Test Case Library – Payment Gateway Retry Logic',
     'Add 12 new test cases covering the payment gateway retry logic implementation (ISS-001 resolution). Map test cases to acceptance criteria AC-047 through AC-059. Assign to Sprint 14 execution.',
     'todo', 'high', 'tm', 8, 6, 0),

    ('Prepare Change Board Pack – CR-001 (HR Portal)',
     'Prepare the Change Board review pack for CR-001 (HR Portal scope request). Include impact assessment, cost-benefit analysis, schedule impact, risk assessment, and a recommendation. Circulate 5 working days before board.',
     'todo', 'medium', 'pm', 12, 8, 0),

    ('Implement 2FA Authentication Flow – Customer Portal (CR-005)',
     'Implement TOTP-based two-factor authentication using Auth0 MFA add-on as approved in CR-005. Includes: enrolment flow, login challenge, recovery codes, admin bypass, and E2E test coverage. Deliver within current sprint.',
     'wip', 'critical', 'tm', 7, 32, 18)

  ) AS t(task_name, task_desc, status, priority, assignee, due_offset, est_hours, actual_hours)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.tasks
    WHERE project_id = v_project_id AND task_name = t.task_name
  );

  RAISE NOTICE 'v703: Tasks seed complete for project %.', v_project_id;

END $$;
