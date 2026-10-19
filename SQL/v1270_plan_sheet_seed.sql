-- =============================================================================
-- v1270 seed (feature v1265): a linked sample plan for the Plan Sheet (owner request 2026-10-13)
-- PRD: projectprd/v1265_plan_sheet_and_task_classification_PRD.md · rule 18.2 companion seed.
-- Run after v1265_task_outline_and_summaries.sql, v1266_multiple_baselines.sql and
-- v1269_tasks_due_date_constraint_fix.sql (a missed due date must not stop the recalculation).
--
--   Platform  SEED334-PRJ-08 (Velocity Freight - Dynamic Route Optimization Pilot), public
--   Simulator SEED592-PP-01  (SEED592 Practice Project Alpha), sim
--
-- 21 tasks in 5 phases (5 summary tasks + 16 tasks, 3 of them milestones), 3 levels deep where
-- it makes sense, with every task-form dropdown used:
--   Scheduling   Automatic (most) and Manual (pilot go-live on a fixed date)
--   Constraint   As soon as possible, Start no earlier than, Must start on, Finish no later than
--   Priority     Low, Medium, High, Critical
--   Assigned to  the project's own team members, in turn (none → left unassigned)
--   Status       To Do, In Progress, Completed, Blocked (+ blocked reason)
-- plus WBS codes, descriptions, estimated hours, due dates, progress and actual dates, and
-- 17 links of all four types (FS, SS, FF, SF) incl. links to/from summary tasks and lags.
-- Then the schedule is recalculated (summaries roll up) and, if the project has no schedule
-- baseline yet, the plan is saved as B0 (active) so Planned % / % Deviation show at once.
--
-- Dates: the plan is placed around TODAY (it starts about 6 weeks ago), so every view has
-- content: phase 1 done, data preparation in progress, build / testing / pilot ahead (Look-ahead,
-- Milestones, Variance, Planned % / % Deviation). The first task has a "Start no earlier than"
-- constraint on that date, which anchors the whole linked plan.
--
-- Rules: task_code is left '' so Admin ID Generation assigns TSK-… (rule 16.2); fixed hex-only
-- UUIDs. Re-running refreshes the sample tasks, links and sample baseline to today's dates
-- (ON CONFLICT DO UPDATE on the seed's own ids only); other tasks are never changed.
-- Rollback: SQL/v1270_plan_sheet_seed_rollback.sql
-- =============================================================================

CREATE OR REPLACE FUNCTION pg_temp.v1265_seed_plan(p_schema TEXT, p_project UUID, p_members UUID[], p_prefix TEXT)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_fk TEXT := CASE WHEN p_schema = 'sim' THEN 'practice_project_id' ELSE 'project_id' END;
  v_start DATE;
  v_status JSONB;
  r RECORD;
  v_id UUID;
  v_parent UUID;
  v_member UUID;
  v_count INT := 0;
  v_snapshot JSONB;
  v_baseline UUID;
  v_creator UUID;
  -- task id from its number in the list below (prefix + zero-padded number, hex only)
  tid TEXT := p_prefix || '-0000-4000-8000-0000000000';
BEGIN
  -- Monday about 6 weeks ago: today falls inside data preparation.
  v_start := date_trunc('week', CURRENT_DATE - 42)::date;

  SELECT jsonb_object_agg(status_code, id) INTO v_status FROM public.task_statuses;

  -- n, parent, position, name, description, duration, milestone, mode, constraint, constraint day,
  -- priority, member #, status, % done, actual start day, actual finish day, WBS, hours, due day, blocked reason
  FOR r IN
    SELECT * FROM (VALUES
      (1,  NULL, 1, 'Initiation', 'Start-up: agree the pilot scope and approve the charter.', NULL, FALSE, 'auto', 'asap', NULL, 'high', 1, 'completed', 100, 0, 9, 'VF-1', NULL, NULL, NULL),
      (2,  1,    1, 'Prepare project charter', 'Scope, objectives, pilot depots, success measures and budget for the route-optimisation pilot.', 5, FALSE, 'auto', 'snet', 0, 'high', 1, 'completed', 100, 0, 4, 'VF-1.1', 40, 6, NULL),
      (3,  1,    2, 'Stakeholder kick-off workshop', 'Workshop with operations, depot managers, IT and the telematics supplier.', 2, FALSE, 'auto', 'asap', NULL, 'medium', 2, 'completed', 100, 5, 6, 'VF-1.2', 16, NULL, NULL),
      (4,  1,    3, 'Charter approved', 'Steering committee approves the charter (gate to start delivery).', 0, TRUE, 'auto', 'asap', NULL, 'critical', 1, 'completed', 100, 9, 9, 'VF-1.3', NULL, 16, NULL),

      (5,  NULL, 2, 'Data preparation', 'Get route, order and vehicle data ready for the optimisation engine.', NULL, FALSE, 'auto', 'asap', NULL, 'high', 3, 'in_progress', 0, NULL, NULL, 'VF-2', NULL, NULL, NULL),
      (6,  5,    1, 'Source data inventory', 'List every source system: TMS, telematics, order management, depot rosters.', 4, FALSE, 'auto', 'asap', NULL, 'medium', 3, 'completed', 100, 10, 13, 'VF-2.1', 24, NULL, NULL),
      (7,  5,    2, 'Data quality assessment', 'Profile addresses, delivery windows and vehicle capacities; log quality issues.', 6, FALSE, 'auto', 'asap', NULL, 'high', 4, 'in_progress', 60, 14, NULL, 'VF-2.2', 36, NULL, NULL),
      (8,  5,    3, 'Data cleansing', 'Fix geocodes and missing delivery windows found in the assessment.', 8, FALSE, 'auto', 'asap', NULL, 'high', 3, 'todo', 0, NULL, NULL, 'VF-2.3', 48, NULL, NULL),

      (9,  NULL, 3, 'Route optimisation build', 'Configure the engine and connect it to vehicles and drivers.', NULL, FALSE, 'auto', 'asap', NULL, 'critical', 2, 'todo', 0, NULL, NULL, 'VF-3', NULL, NULL, NULL),
      (10, 9,    1, 'Optimisation engine configuration', 'Depots, vehicle types, shift rules and cost weights in the routing engine.', 10, FALSE, 'auto', 'snet', 30, 'critical', 2, 'todo', 0, NULL, NULL, 'VF-3.1', 80, NULL, NULL),
      (11, 9,    2, 'Telematics integration', 'Live vehicle positions from the telematics supplier into the engine.', 8, FALSE, 'auto', 'asap', NULL, 'high', 4, 'blocked', 0, NULL, NULL, 'VF-3.2', 64, NULL, 'Waiting for the telematics supplier''s API keys.'),
      (12, 9,    3, 'Driver app updates', 'Show optimised routes and live re-routing in the driver mobile app.', 6, FALSE, 'auto', 'asap', NULL, 'medium', 5, 'todo', 0, NULL, NULL, 'VF-3.3', 48, NULL, NULL),

      (13, NULL, 4, 'Testing', 'Prove the solution works end to end before the pilot.', NULL, FALSE, 'auto', 'asap', NULL, 'high', 5, 'todo', 0, NULL, NULL, 'VF-4', NULL, NULL, NULL),
      (14, 13,   1, 'System integration testing', 'End-to-end tests: orders in, routes out, vehicles tracked.', 7, FALSE, 'auto', 'asap', NULL, 'high', 5, 'todo', 0, NULL, NULL, 'VF-4.1', 56, NULL, NULL),
      (15, 13,   2, 'User acceptance testing', 'Depot planners and drivers test real days from two pilot depots.', 5, FALSE, 'auto', 'asap', NULL, 'medium', 1, 'todo', 0, NULL, NULL, 'VF-4.2', 40, NULL, NULL),
      (16, 13,   3, 'UAT sign-off', 'Business sign-off that the pilot can go live.', 0, TRUE, 'auto', 'asap', NULL, 'critical', 1, 'todo', 0, NULL, NULL, 'VF-4.3', NULL, NULL, NULL),

      (17, NULL, 5, 'Pilot rollout', 'Run the pilot at the first depot and close it out.', NULL, FALSE, 'auto', 'asap', NULL, 'high', 2, 'todo', 0, NULL, NULL, 'VF-5', NULL, NULL, NULL),
      (18, 17,   1, 'Pilot depot go-live', 'Go live at the Northgate depot on the agreed date (fixed with the depot).', 1, FALSE, 'manual', 'asap', NULL, 'critical', 2, 'todo', 0, NULL, NULL, 'VF-5.1', 8, NULL, NULL),
      (19, 17,   2, 'Hypercare', 'Daily support and route tuning for the first two weeks.', 10, FALSE, 'auto', 'mso', 75, 'high', 3, 'todo', 0, NULL, NULL, 'VF-5.2', 60, NULL, NULL),
      (20, 17,   3, 'Pilot closure report', 'Results against the success measures and a go / no-go for wider rollout.', 3, FALSE, 'auto', 'fnlt', 100, 'low', 4, 'todo', 0, NULL, NULL, 'VF-5.3', 24, 100, NULL),
      (21, 17,   4, 'Pilot closed', 'Steering committee accepts the closure report.', 0, TRUE, 'auto', 'asap', NULL, 'medium', 1, 'todo', 0, NULL, NULL, 'VF-5.4', NULL, NULL, NULL)
    ) AS t(n, parent, pos, name, descr, dur, milestone, mode, ctype, cday, priority, member, status, pct, astart, afinish, wbs, hours, due, blocked)
  LOOP
    v_id := (tid || lpad(r.n::text, 2, '0'))::uuid;
    v_parent := CASE WHEN r.parent IS NULL THEN NULL ELSE (tid || lpad(r.parent::text, 2, '0'))::uuid END;
    v_member := CASE WHEN COALESCE(array_length(p_members, 1), 0) = 0 THEN NULL
                     ELSE p_members[((r.member - 1) % array_length(p_members, 1)) + 1] END;
    EXECUTE format(
      'INSERT INTO %I.tasks (id, %I, task_code, task_name, task_description, parent_task_id, outline_position, wbs_code,
          task_type, priority, status_id, assigned_to_user_id, estimated_duration_days, estimated_hours, is_milestone,
          schedule_mode, constraint_type, constraint_date, planned_start_date, planned_end_date,
          percentage_complete, actual_start_date, actual_end_date, due_date, is_blocked, blocked_reason)
       VALUES ($1, $2, '''', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
       ON CONFLICT (id) DO UPDATE SET
          task_name = EXCLUDED.task_name, task_description = EXCLUDED.task_description,
          parent_task_id = EXCLUDED.parent_task_id, outline_position = EXCLUDED.outline_position,
          wbs_code = EXCLUDED.wbs_code, task_type = EXCLUDED.task_type, priority = EXCLUDED.priority,
          status_id = EXCLUDED.status_id, assigned_to_user_id = EXCLUDED.assigned_to_user_id,
          estimated_duration_days = EXCLUDED.estimated_duration_days, estimated_hours = EXCLUDED.estimated_hours,
          is_milestone = EXCLUDED.is_milestone, schedule_mode = EXCLUDED.schedule_mode,
          constraint_type = EXCLUDED.constraint_type, constraint_date = EXCLUDED.constraint_date,
          planned_start_date = EXCLUDED.planned_start_date, planned_end_date = EXCLUDED.planned_end_date,
          percentage_complete = EXCLUDED.percentage_complete, actual_start_date = EXCLUDED.actual_start_date,
          actual_end_date = EXCLUDED.actual_end_date, due_date = EXCLUDED.due_date,
          is_blocked = EXCLUDED.is_blocked, blocked_reason = EXCLUDED.blocked_reason, is_deleted = FALSE', p_schema, v_fk)
    USING v_id, p_project, r.name, r.descr, v_parent, r.pos, r.wbs,
          CASE WHEN r.milestone THEN 'milestone' ELSE 'task' END, r.priority, (v_status->>r.status)::uuid, v_member,
          COALESCE(r.dur, 1), r.hours, r.milestone, r.mode, r.ctype,
          CASE WHEN r.cday IS NULL THEN NULL ELSE v_start + r.cday END,
          CASE WHEN r.mode = 'manual' THEN v_start + 70 ELSE v_start END,
          CASE WHEN r.mode = 'manual' THEN v_start + 70 ELSE v_start END,
          r.pct, CASE WHEN r.astart IS NULL THEN NULL ELSE v_start + r.astart END,
          CASE WHEN r.afinish IS NULL THEN NULL ELSE v_start + r.afinish END,
          CASE WHEN r.due IS NULL THEN NULL ELSE v_start + r.due END,
          r.blocked IS NOT NULL, r.blocked;
    v_count := v_count + 1;
  END LOOP;

  -- Links: predecessor, successor, type, lag (days). Includes links to/from summary tasks.
  FOR r IN
    SELECT * FROM (VALUES
      (1,  2,  3,  'finish_to_start', 0),
      (2,  3,  4,  'finish_to_start', 0),
      (3,  4,  6,  'finish_to_start', 0),
      (4,  6,  7,  'finish_to_start', 0),
      (5,  7,  8,  'start_to_start', 3),
      (6,  6,  10, 'finish_to_start', 2),
      (7,  10, 11, 'start_to_start', 3),
      (8,  11, 12, 'finish_to_start', 0),
      (9,  8,  12, 'finish_to_finish', 0),
      (10, 9,  13, 'finish_to_start', 0),    -- summary → summary: testing waits for the whole build
      (11, 14, 15, 'finish_to_start', 0),
      (12, 15, 16, 'finish_to_start', 0),
      (13, 16, 18, 'finish_to_start', 0),
      (14, 18, 19, 'finish_to_start', 0),
      (15, 19, 20, 'start_to_finish', 5),
      (16, 20, 21, 'finish_to_start', 0),
      (17, 5,  14, 'finish_to_start', 1)     -- summary → task: data must be ready before SIT
    ) AS d(n, pred, succ, dtype, lag)
  LOOP
    EXECUTE format(
      'INSERT INTO %I.task_dependencies (id, predecessor_task_id, successor_task_id, dependency_type, lag_days)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET predecessor_task_id = EXCLUDED.predecessor_task_id, successor_task_id = EXCLUDED.successor_task_id,
          dependency_type = EXCLUDED.dependency_type, lag_days = EXCLUDED.lag_days, is_deleted = FALSE', p_schema)
    USING (p_prefix || '-0000-4000-9000-0000000000' || lpad(r.n::text, 2, '0'))::uuid,
          (tid || lpad(r.pred::text, 2, '0'))::uuid, (tid || lpad(r.succ::text, 2, '0'))::uuid, r.dtype, r.lag;
  END LOOP;

  -- Dates, float, critical path and summary roll-ups (database authority, SQL v1265 S1).
  PERFORM public.planning_recalculate_schedule_impl(p_schema, p_project, NULL);

  -- B0 baseline from the recalculated plan when the project has no schedule baseline yet, or
  -- refreshed when it is this seed's own sample baseline (so re-runs keep it in step).
  v_baseline := (p_prefix || '-0000-4000-a000-000000000001')::uuid;
  EXECUTE format('SELECT COUNT(*) FROM %I.project_baselines WHERE %I = $1 AND COALESCE(baseline_type, ''schedule'') = ''schedule''
                   AND NOT COALESCE(is_deleted, FALSE) AND id <> $2', p_schema, v_fk) INTO v_count USING p_project, v_baseline;
  IF v_count = 0 THEN
    EXECUTE format('SELECT jsonb_agg(jsonb_build_object(''id'', id, ''task_code'', task_code, ''task_name'', task_name,
                      ''start'', planned_start_date, ''finish'', planned_end_date, ''duration'', estimated_duration_days))
                    FROM %I.tasks WHERE %I = $1 AND NOT COALESCE(is_deleted, FALSE)', p_schema, v_fk)
      INTO v_snapshot USING p_project;
    v_creator := COALESCE(p_members[1], (SELECT id FROM public.users ORDER BY created_at LIMIT 1));
    EXECUTE format('INSERT INTO %I.project_baselines (id, %I, baseline_name, baseline_type, baseline_date, baseline_data, comments, created_by)
                    VALUES ($1, $2, ''Approved pilot plan'', ''schedule'', $5, $3, ''Sample baseline (v1265 seed).'', $4)
                    ON CONFLICT (id) DO UPDATE SET baseline_data = EXCLUDED.baseline_data, baseline_date = EXCLUDED.baseline_date,
                       is_deleted = FALSE', p_schema, v_fk)
      USING v_baseline, p_project, jsonb_build_object('tasks', COALESCE(v_snapshot, '[]'::jsonb)), v_creator, v_start;
    PERFORM public.planning_activate_baseline_impl(p_schema, v_baseline);
  END IF;

  RETURN 21;
END;
$$;

-- ── Platform: SEED334-PRJ-08 ─────────────────────────────────────────────────
DO $$
DECLARE
  v_project UUID := (SELECT id FROM public.projects WHERE project_code = 'SEED334-PRJ-08' AND NOT COALESCE(is_deleted, FALSE) LIMIT 1);
  v_members UUID[];
BEGIN
  IF v_project IS NULL THEN
    RAISE NOTICE 'v1265 seed: project SEED334-PRJ-08 not found, Platform part skipped.';
    RETURN;
  END IF;
  SELECT array_agg(DISTINCT pm.user_id ORDER BY pm.user_id) INTO v_members
  FROM public.project_memberships pm JOIN public.users u ON u.id = pm.user_id
  WHERE pm.project_id = v_project AND COALESCE(pm.is_active, TRUE) AND NOT COALESCE(u.is_deleted, FALSE);
  PERFORM pg_temp.v1265_seed_plan('public', v_project, COALESCE(v_members, '{}'), 'a1265000');
  RAISE NOTICE 'v1265 seed: Platform plan seeded on SEED334-PRJ-08 (% team member(s) used).', COALESCE(array_length(v_members, 1), 0);
END $$;

-- ── Simulator: SEED592-PP-01 ─────────────────────────────────────────────────
DO $$
DECLARE
  v_project UUID := (SELECT id FROM sim.practice_projects WHERE project_code = 'SEED592-PP-01' AND NOT COALESCE(is_deleted, FALSE) LIMIT 1);
  v_members UUID[];
BEGIN
  IF v_project IS NULL THEN
    RAISE NOTICE 'v1265 seed: practice project SEED592-PP-01 not found, Simulator part skipped.';
    RETURN;
  END IF;
  -- practice memberships hold the auth user id; tasks are assigned by users.id
  SELECT array_agg(DISTINCT u.id ORDER BY u.id) INTO v_members
  FROM sim.practice_project_memberships m
  JOIN public.users u ON u.auth_user_id = m.user_id OR u.id = m.user_id
  WHERE m.practice_project_id = v_project AND COALESCE(m.is_active, TRUE) AND NOT COALESCE(u.is_deleted, FALSE);
  IF v_members IS NULL THEN
    -- No practice team yet: assign to the practice project's owner.
    SELECT ARRAY[u.id] INTO v_members FROM sim.practice_projects p JOIN public.users u ON u.auth_user_id = p.user_id WHERE p.id = v_project;
  END IF;
  PERFORM pg_temp.v1265_seed_plan('sim', v_project, COALESCE(v_members, '{}'), 'b1265000');
  RAISE NOTICE 'v1265 seed: Simulator plan seeded on SEED592-PP-01.';
END $$;

-- What was seeded
SELECT 'public' AS schema, COUNT(*) AS seeded_tasks FROM public.tasks WHERE id::text LIKE 'a1265000-%' AND NOT COALESCE(is_deleted, FALSE)
UNION ALL
SELECT 'sim', COUNT(*) FROM sim.tasks WHERE id::text LIKE 'b1265000-%' AND NOT COALESCE(is_deleted, FALSE);
