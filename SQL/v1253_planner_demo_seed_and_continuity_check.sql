-- ============================================================================
-- v1253: Project Planner — demo seed + upgrade/downgrade data-continuity check (v1239 Slice 8.5)
-- Run after v1247–v1257. Two independent parts; set the variables at the top of each block.
--
-- Part A (seed, optional): a demo plan in an EXISTING planner workspace, found by its owner's
--   email (accounts cannot be seeded without a real sign-in user). Display IDs are left blank
--   so the Admin ID Generation triggers assign them (rule 16.2). Idempotent: skipped if the demo
--   project already exists.
-- Part B (check): counts projects, tasks, links, baselines, hub records, timesheet entries and
--   memberships for an account, switches the edition planner → platform → planner with
--   apply_account_edition, counts again and RAISES if anything changed. Runs inside a
--   transaction that is rolled back, so the account is left exactly as it was.
-- ============================================================================

-- ── Part A: demo seed ───────────────────────────────────────────────────────
DO $$
DECLARE
  v_owner_email TEXT := 'set-me@example.com';   -- ← the planner owner's sign-in email
  v_user UUID;
  v_account UUID;
  v_project UUID;
  v_pm_role UUID;
  v_status UUID;
  t1 UUID; t2 UUID; t3 UUID; t4 UUID;
BEGIN
  SELECT u.id INTO v_user FROM public.users u WHERE lower(u.email) = lower(v_owner_email) LIMIT 1;
  SELECT a.id INTO v_account FROM public.accounts a WHERE a.owner_user_id = v_user AND a.product_edition = 'planner' LIMIT 1;
  IF v_account IS NULL THEN
    RAISE NOTICE 'v1253 A: no planner workspace owned by % — demo seed skipped', v_owner_email;
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM public.projects WHERE account_id = v_account AND project_name = 'Demo: Office move') THEN
    RAISE NOTICE 'v1253 A: demo project already present — skipped';
    RETURN;
  END IF;

  SELECT id INTO v_status FROM public.project_statuses WHERE is_active ORDER BY (lower(status_name) = 'planning') DESC, created_at LIMIT 1;
  INSERT INTO public.projects (project_name, project_code, account_id, owner_user_id, status_id, planned_start_date, project_manager_user_id, created_by)
  VALUES ('Demo: Office move', 'PRJ-' || lpad((floor(random() * 1000000))::int::text, 6, '0'), v_account, v_user, v_status, CURRENT_DATE, v_user, v_user)
  RETURNING id INTO v_project;
  SELECT id INTO v_pm_role FROM public.project_roles WHERE role_name = 'project_manager' AND project_id IS NULL LIMIT 1;
  INSERT INTO public.project_memberships (project_id, user_id, project_role_id, invitation_status, is_active) VALUES (v_project, v_user, v_pm_role, 'accepted', TRUE);
  INSERT INTO public.project_calendars (project_id, monday, tuesday, wednesday, thursday, friday, saturday, sunday, hours_per_day, created_by)
  VALUES (v_project, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE, FALSE, 8, v_user);

  INSERT INTO public.tasks (project_id, task_code, task_name, estimated_duration_days, estimated_hours, assigned_to_user_id, created_by)
  VALUES (v_project, '', 'Choose the new office', 5, 16, v_user, v_user) RETURNING id INTO t1;
  INSERT INTO public.tasks (project_id, task_code, task_name, estimated_duration_days, estimated_hours, assigned_to_user_id, created_by)
  VALUES (v_project, '', 'Order furniture', 10, 6, v_user, v_user) RETURNING id INTO t2;
  INSERT INTO public.tasks (project_id, task_code, task_name, estimated_duration_days, estimated_hours, created_by)
  VALUES (v_project, '', 'Pack and move', 3, 40, v_user) RETURNING id INTO t3;
  INSERT INTO public.tasks (project_id, task_code, task_name, estimated_duration_days, is_milestone, task_type, created_by)
  VALUES (v_project, '', 'Open in the new office', 0, TRUE, 'milestone', v_user) RETURNING id INTO t4;
  INSERT INTO public.task_dependencies (predecessor_task_id, successor_task_id, dependency_type, lag_days, created_by) VALUES
    (t1, t2, 'finish_to_start', 0, v_user),
    (t2, t3, 'finish_to_start', 2, v_user),
    (t3, t4, 'finish_to_start', 0, v_user);
  PERFORM public.planning_recalculate_schedule_impl('public', v_project, NULL);
  RAISE NOTICE 'v1253 A: demo project seeded in account %', v_account;
END $$;

-- ── Part B: continuity check (rolled back) ──────────────────────────────────
BEGIN;
DO $$
DECLARE
  v_account UUID := NULL;   -- ← an account id to check; NULL = the first planner account
  v_before JSONB;
  v_after JSONB;
BEGIN
  IF v_account IS NULL THEN
    SELECT id INTO v_account FROM public.accounts WHERE product_edition = 'planner' ORDER BY created_at LIMIT 1;
  END IF;
  IF v_account IS NULL THEN RAISE NOTICE 'v1253 B: no planner account to check'; RETURN; END IF;

  v_before := (
    SELECT jsonb_build_object(
      'projects', (SELECT COUNT(*) FROM public.projects p WHERE p.account_id = v_account),
      'tasks', (SELECT COUNT(*) FROM public.tasks t JOIN public.projects p ON p.id = t.project_id WHERE p.account_id = v_account),
      'links', (SELECT COUNT(*) FROM public.task_dependencies d JOIN public.tasks t ON t.id = d.successor_task_id JOIN public.projects p ON p.id = t.project_id WHERE p.account_id = v_account),
      'baselines', (SELECT COUNT(*) FROM public.project_baselines b JOIN public.projects p ON p.id = b.project_id WHERE p.account_id = v_account),
      'hub_scenarios', (SELECT COUNT(*) FROM public.plan_scenarios s JOIN public.projects p ON p.id = s.project_id WHERE p.account_id = v_account),
      'timesheets', (SELECT COUNT(*) FROM public.timesheet_entries e JOIN public.projects p ON p.id = e.project_id WHERE p.account_id = v_account),
      'members', (SELECT COUNT(*) FROM public.project_memberships m JOIN public.projects p ON p.id = m.project_id WHERE p.account_id = v_account)
    ));

  PERFORM public.apply_account_edition(v_account, 'platform', 'v1253 continuity check (rolled back)', 'test', NULL);
  PERFORM public.apply_account_edition(v_account, 'planner', 'v1253 continuity check (rolled back)', 'test', NULL);

  v_after := (
    SELECT jsonb_build_object(
      'projects', (SELECT COUNT(*) FROM public.projects p WHERE p.account_id = v_account),
      'tasks', (SELECT COUNT(*) FROM public.tasks t JOIN public.projects p ON p.id = t.project_id WHERE p.account_id = v_account),
      'links', (SELECT COUNT(*) FROM public.task_dependencies d JOIN public.tasks t ON t.id = d.successor_task_id JOIN public.projects p ON p.id = t.project_id WHERE p.account_id = v_account),
      'baselines', (SELECT COUNT(*) FROM public.project_baselines b JOIN public.projects p ON p.id = b.project_id WHERE p.account_id = v_account),
      'hub_scenarios', (SELECT COUNT(*) FROM public.plan_scenarios s JOIN public.projects p ON p.id = s.project_id WHERE p.account_id = v_account),
      'timesheets', (SELECT COUNT(*) FROM public.timesheet_entries e JOIN public.projects p ON p.id = e.project_id WHERE p.account_id = v_account),
      'members', (SELECT COUNT(*) FROM public.project_memberships m JOIN public.projects p ON p.id = m.project_id WHERE p.account_id = v_account)
    ));

  IF v_before IS DISTINCT FROM v_after THEN
    RAISE EXCEPTION 'v1253 B FAIL: counts changed across upgrade/downgrade. before=% after=%', v_before, v_after;
  END IF;
  RAISE NOTICE 'v1253 B PASS: counts identical across upgrade and downgrade for account %: %', v_account, v_before;
END $$;
ROLLBACK;
