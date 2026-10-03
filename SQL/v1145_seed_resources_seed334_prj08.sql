-- =============================================================================
-- v1145: Seed resource / time-tracking sample data for SEED334-PRJ-08 only
--        (Velocity Freight - Dynamic Route Optimization Pilot)
-- Covers the Resources sidebar leaves:
--   Resource Plan (resource_forecasts), Capacity Planning (resources +
--   resource_assignments + cross_project_resource_allocations +
--   resource_capacity_plans), Resource Directory (resources), Time Entry
--   (timesheet_entries), Resource Calendar (resource_calendar), Approvals
--   (timesheet_entries, pending/approved/rejected rows).
-- "Assignments" (project_memberships) is NOT covered here — this project
--   already has active project_memberships rows from earlier seed files
--   (v1079 / v1131); nothing further to seed there.
-- Prerequisites: v334 (project), v27 (resources/resource_assignments/
--   resource_calendar), v38 (cross_project_resource_allocations/
--   resource_capacity_plans/resource_forecasts), v628e (timesheet_entries).
-- Idempotent: fixed UUIDs + ON CONFLICT (id) DO NOTHING.
-- resources.resource_code is left NULL — no Admin ID Generation rule exists
--   for this pre-existing table/column (verified against SQL/), so there is
--   no trigger path to leave it for and no rule format to hand-mint against.
-- No other projects are seeded. Simulator practice projects are out of scope.
-- =============================================================================

DO $$
DECLARE
  v_project_id   UUID;
  v_project_code TEXT := 'SEED334-PRJ-08';
  v_owner_id     UUID;
  v_owner_name   TEXT;
  v_owner_auth   UUID;

  v_user1 UUID; v_name1 TEXT; v_auth1 UUID;
  v_user2 UUID; v_name2 TEXT; v_auth2 UUID;
  v_user3 UUID; v_name3 TEXT; v_auth3 UUID;
  v_user4 UUID; v_name4 TEXT; v_auth4 UUID;

  -- fixed ids (prefixed with this migration's version number, per v1079/v1144 convention)
  v_res1 UUID := '11450001-a101-4a01-9c01-534433340001';
  v_res2 UUID := '11450001-a101-4a01-9c01-534433340002';
  v_res3 UUID := '11450001-a101-4a01-9c01-534433340003';
  v_res4 UUID := '11450001-a101-4a01-9c01-534433340004';

  v_asg1 UUID := '11450002-a501-4a01-9c01-534433340001';
  v_asg2 UUID := '11450002-a501-4a01-9c01-534433340002';
  v_asg3 UUID := '11450002-a501-4a01-9c01-534433340003';
  v_asg4 UUID := '11450002-a501-4a01-9c01-534433340004';

  v_cal1 UUID := '11450003-ca01-4a01-9c01-534433340001';
  v_cal2 UUID := '11450003-ca01-4a01-9c01-534433340002';
  v_cal3 UUID := '11450003-ca01-4a01-9c01-534433340003';
  v_cal4 UUID := '11450003-ca01-4a01-9c01-534433340004';

  v_xpa1 UUID := '11450004-ba01-4a01-9c01-534433340001';
  v_xpa2 UUID := '11450004-ba01-4a01-9c01-534433340002';
  v_xpa3 UUID := '11450004-ba01-4a01-9c01-534433340003';
  v_xpa4 UUID := '11450004-ba01-4a01-9c01-534433340004';

  v_cap1 UUID := '11450005-cb01-4a01-9c01-534433340001';
  v_cap2 UUID := '11450005-cb01-4a01-9c01-534433340002';

  v_fc1 UUID := '11450006-fc01-4a01-9c01-534433340001';
  v_fc2 UUID := '11450006-fc01-4a01-9c01-534433340002';
  v_fc3 UUID := '11450006-fc01-4a01-9c01-534433340003';

  v_win_start DATE := CURRENT_DATE - 60;
  v_win_end   DATE := CURRENT_DATE + 90;
BEGIN
  SELECT id, owner_user_id INTO v_project_id, v_owner_id
  FROM public.projects
  WHERE project_code = v_project_code
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'v1145: project % not found — run v334 first', v_project_code;
  END IF;

  IF v_owner_id IS NOT NULL THEN
    SELECT full_name, auth_user_id INTO v_owner_name, v_owner_auth
    FROM public.users WHERE id = v_owner_id;
  END IF;

  CREATE TEMP TABLE _v1145_members ON COMMIT DROP AS
  SELECT u.id AS user_id, u.full_name, u.auth_user_id,
         ROW_NUMBER() OVER (ORDER BY pm.created_at NULLS LAST) AS rn
  FROM public.project_memberships pm
  JOIN public.users u ON u.id = pm.user_id
  WHERE pm.project_id = v_project_id
    AND COALESCE(pm.is_active, TRUE) = TRUE;

  SELECT user_id, full_name, auth_user_id INTO v_user1, v_name1, v_auth1 FROM _v1145_members WHERE rn = 1;
  SELECT user_id, full_name, auth_user_id INTO v_user2, v_name2, v_auth2 FROM _v1145_members WHERE rn = 2;
  SELECT user_id, full_name, auth_user_id INTO v_user3, v_name3, v_auth3 FROM _v1145_members WHERE rn = 3;
  SELECT user_id, full_name, auth_user_id INTO v_user4, v_name4, v_auth4 FROM _v1145_members WHERE rn = 4;

  -- Fall back to the project owner, then to member 1/2, for any unfilled slot
  v_user1 := COALESCE(v_user1, v_owner_id); v_name1 := COALESCE(v_name1, v_owner_name); v_auth1 := COALESCE(v_auth1, v_owner_auth);
  v_user2 := COALESCE(v_user2, v_user1);    v_name2 := COALESCE(v_name2, v_name1);      v_auth2 := COALESCE(v_auth2, v_auth1);
  v_user3 := COALESCE(v_user3, v_user1);    v_name3 := COALESCE(v_name3, v_name1);      v_auth3 := COALESCE(v_auth3, v_auth1);
  v_user4 := COALESCE(v_user4, v_user2);    v_name4 := COALESCE(v_name4, v_name2);      v_auth4 := COALESCE(v_auth4, v_auth2);

  IF v_user1 IS NULL THEN
    RAISE EXCEPTION 'v1145: no project members or owner found for % — cannot seed resource/time data', v_project_code;
  END IF;

  -- ---------------------------------------------------------------------------
  -- RESOURCE DIRECTORY (account-wide table; linked to this project's own team)
  -- ---------------------------------------------------------------------------
  -- resource_name is always the role persona, never the linked member's real
  -- name — SEED334-PRJ-08 can have fewer than 4 distinct active members, and
  -- the fallback chain above would otherwise collapse several slots to the
  -- same person, making 4 "different" resources all display one name
  -- (v1150 fixes this same issue for environments that already ran this
  -- file before this correction).
  INSERT INTO public.resources (
    id, resource_name, resource_type, resource_category, resource_description,
    default_capacity_hours_per_day, default_capacity_days_per_week, default_capacity_percentage,
    is_active, is_available, user_id, created_by, is_deleted
  ) VALUES
    (v_res1, 'Route Planning Analyst', 'human', 'Route Planning',
     'Builds and tunes the dynamic route plans for the Harare depot corridors.',
     8.0, 5, 100.00, TRUE, TRUE, v_user1, v_owner_id, FALSE),

    (v_res2, 'Dispatch Coordinator', 'human', 'Dispatch',
     'Runs the morning dispatch board and reconciles driver check-ins against the plan.',
     8.0, 5, 100.00, TRUE, TRUE, v_user2, v_owner_id, FALSE),

    (v_res3, 'Fleet Operations Lead', 'human', 'Fleet Operations',
     'Owns vehicle availability, fuel scheduling, and depot handover for the pilot corridors.',
     8.0, 5, 75.00, TRUE, TRUE, v_user3, v_owner_id, FALSE),

    (v_res4, 'Driver Relations Officer', 'human', 'Driver Relations',
     'Liaises with night-shift drivers on rest windows and route-change communication.',
     6.0, 5, 100.00, TRUE, TRUE, v_user4, v_owner_id, FALSE)
  ON CONFLICT (id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- CAPACITY PLANNING — assignments driving the utilization dashboard
  -- (wide date window so "this week" always falls inside it)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.resource_assignments (
    id, resource_id, assignment_type, assignment_target_id,
    assignment_start_date, assignment_end_date,
    allocated_hours_per_day, total_allocated_hours, allocation_percentage,
    assignment_status, role_in_assignment, responsibility_description,
    created_by, is_deleted
  ) VALUES
    (v_asg1, v_res1, 'project', v_project_id, v_win_start, v_win_end,
     6.0, 6.0 * (v_win_end - v_win_start + 1), 75.00,
     'in_progress', 'Route Planning Analyst', 'Weekly corridor plan tuning and empty-kilometre tracking.',
     v_owner_id, FALSE),

    (v_asg2, v_res2, 'project', v_project_id, v_win_start, v_win_end,
     8.0, 8.0 * (v_win_end - v_win_start + 1), 100.00,
     'in_progress', 'Dispatch Coordinator', 'Daily dispatch board ownership for the pilot depots.',
     v_owner_id, FALSE),

    (v_asg3, v_res3, 'project', v_project_id, v_win_start, v_win_end,
     4.0, 4.0 * (v_win_end - v_win_start + 1), 50.00,
     'in_progress', 'Fleet Operations Lead', 'Vehicle and fuel scheduling for pilot-corridor trucks.',
     v_owner_id, FALSE),

    (v_asg4, v_res4, 'project', v_project_id, v_win_start, v_win_end,
     3.0, 3.0 * (v_win_end - v_win_start + 1), 50.00,
     'in_progress', 'Driver Relations Officer', 'Night-shift driver liaison and rest-window checks.',
     v_owner_id, FALSE)
  ON CONFLICT (id) DO NOTHING;

  -- Cross-project allocations panel (same story, project-scoped view)
  INSERT INTO public.cross_project_resource_allocations (
    id, resource_id, project_id, allocation_start_date, allocation_end_date,
    allocation_percentage, allocation_type, allocation_status,
    allocation_priority, is_critical_resource, allocated_by_user_id, allocation_notes,
    created_by, is_deleted
  ) VALUES
    (v_xpa1, v_res1, v_project_id, v_win_start, v_win_end, 75.00, 'dedicated', 'active',
     'high', TRUE, v_owner_id, 'Core route-planning capacity for the pilot.', v_owner_id, FALSE),
    (v_xpa2, v_res2, v_project_id, v_win_start, v_win_end, 100.00, 'dedicated', 'active',
     'critical', TRUE, v_owner_id, 'Dispatch cannot run without this seat.', v_owner_id, FALSE),
    (v_xpa3, v_res3, v_project_id, v_win_start, v_win_end, 50.00, 'shared', 'active',
     'medium', FALSE, v_owner_id, 'Split with regular depot operations.', v_owner_id, FALSE),
    (v_xpa4, v_res4, v_project_id, v_win_start, v_win_end, 50.00, 'part-time', 'active',
     'medium', FALSE, v_owner_id, 'Part-time liaison role for the pilot only.', v_owner_id, FALSE)
  ON CONFLICT (id) DO NOTHING;

  -- Capacity plan summary rows (cross-project capacity panel)
  INSERT INTO public.resource_capacity_plans (
    id, resource_id, plan_scope, plan_start_date, plan_end_date, plan_type,
    planned_capacity_hours, planned_allocation_hours, plan_status,
    plan_owner_user_id, plan_notes, created_by, is_deleted
  ) VALUES
    (v_cap1, v_res1, 'project', v_win_start, v_win_end, 'weekly',
     8.0 * (v_win_end - v_win_start + 1), 6.0 * (v_win_end - v_win_start + 1), 'active',
     v_owner_id, 'Route planning capacity for the Velocity Freight pilot.', v_owner_id, FALSE),
    (v_cap2, v_res2, 'project', v_win_start, v_win_end, 'weekly',
     8.0 * (v_win_end - v_win_start + 1), 8.0 * (v_win_end - v_win_start + 1), 'active',
     v_owner_id, 'Dispatch is fully dedicated to the pilot for its duration.', v_owner_id, FALSE)
  ON CONFLICT (id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- RESOURCE CALENDAR — a few unavailability / partial days for realism
  -- ---------------------------------------------------------------------------
  INSERT INTO public.resource_calendar (
    id, resource_id, calendar_date, availability_type, available_hours,
    unavailability_reason, notes, created_by, is_deleted
  ) VALUES
    (v_cal1, v_res1, CURRENT_DATE + 5, 'unavailable', NULL,
     'training', 'Route-optimisation tooling refresher.', v_owner_id, FALSE),
    (v_cal2, v_res2, CURRENT_DATE + 2, 'partial', 4.0,
     'medical', 'Half-day clinic appointment.', v_owner_id, FALSE),
    (v_cal3, v_res3, CURRENT_DATE + 9, 'unavailable', NULL,
     'vacation', 'Approved leave, covered by depot supervisor.', v_owner_id, FALSE),
    (v_cal4, v_res4, CURRENT_DATE - 3, 'partial', 3.0,
     'other', 'Attended night-shift listening session outside normal hours.', v_owner_id, FALSE)
  ON CONFLICT (id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- RESOURCE PLAN — account-wide demand forecasts (no project_id column exists
  -- on resource_forecasts; scoped in narrative only, per schema limitation)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.resource_forecasts (
    id, forecast_scope, forecast_start_date, forecast_end_date, forecast_type,
    resource_category, resource_type,
    forecasted_demand_count, forecasted_demand_hours,
    forecasted_availability_count, forecasted_availability_hours,
    forecast_confidence_level, forecast_confidence_percentage,
    forecast_methodology, forecast_notes, forecast_owner_user_id, created_by, is_deleted
  ) VALUES
    (v_fc1, 'project', CURRENT_DATE, CURRENT_DATE + 30, 'monthly',
     'Route Planning', 'human', 2, 320.0, 1, 176.0,
     'medium', 65.00, 'trend',
     'Velocity Freight pilot: a second route-planning analyst is needed once the third depot joins the trial.',
     v_owner_id, v_owner_id, FALSE),

    (v_fc2, 'project', CURRENT_DATE, CURRENT_DATE + 30, 'monthly',
     'Dispatch', 'human', 1, 176.0, 1, 176.0,
     'high', 90.00, 'historical',
     'Dispatch coverage is fully staffed for the current pilot scope.',
     v_owner_id, v_owner_id, FALSE),

    (v_fc3, 'project', CURRENT_DATE + 30, CURRENT_DATE + 90, 'quarterly',
     'Fleet Operations', 'human', 2, 264.0, 1, 132.0,
     'low', 40.00, 'expert_judgment',
     'If the pilot extends to night corridors fleet-wide, a second ops lead will be needed next quarter.',
     v_owner_id, v_owner_id, FALSE)
  ON CONFLICT (id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- TIME ENTRY / APPROVALS — timesheet_entries (both sidebar leaves share this
  -- table; user_id/reviewed_by are auth.users(id), not public.users(id))
  -- ---------------------------------------------------------------------------
  IF v_auth1 IS NOT NULL THEN
    INSERT INTO public.timesheet_entries (
      id, project_id, user_id, entry_date, hours_worked, description, work_category,
      status, submitted_at, reviewed_by, reviewed_at, review_notes, is_deleted
    ) VALUES
      -- Approved
      ('11450007-be01-4a01-9c01-534433340001', v_project_id, v_auth1, CURRENT_DATE - 12, 7.5,
       'Rebuilt the Harare depot corridor plan around the new fuel-stop constraints.', 'general',
       'approved', NOW() - INTERVAL '11 days', v_owner_auth, NOW() - INTERVAL '10 days',
       'Looks right — matches the corridor change log.', FALSE),
      ('11450007-be01-4a01-9c01-534433340002', v_project_id, v_auth2, CURRENT_DATE - 11, 8.0,
       'Ran the morning dispatch board and reconciled two late check-ins.', 'general',
       'approved', NOW() - INTERVAL '10 days', v_owner_auth, NOW() - INTERVAL '9 days',
       'Approved.', FALSE),
      ('11450007-be01-4a01-9c01-534433340003', v_project_id, v_auth3, CURRENT_DATE - 9, 4.0,
       'Fuel scheduling review for the pilot-corridor trucks.', 'review',
       'approved', NOW() - INTERVAL '8 days', v_owner_auth, NOW() - INTERVAL '7 days',
       'Approved.', FALSE),

      -- Submitted (pending — shows in Approvals)
      ('11450007-be01-4a01-9c01-534433340004', v_project_id, v_auth1, CURRENT_DATE - 3, 6.5,
       'Tuned the west-depot route to add the loading-delay allowance.', 'general',
       'submitted', NOW() - INTERVAL '2 days', NULL, NULL, NULL, FALSE),
      ('11450007-be01-4a01-9c01-534433340005', v_project_id, v_auth2, CURRENT_DATE - 2, 8.0,
       'Dispatch board coverage plus driver check-in reconciliation.', 'general',
       'submitted', NOW() - INTERVAL '1 day', NULL, NULL, NULL, FALSE),
      ('11450007-be01-4a01-9c01-534433340006', v_project_id, v_auth4, CURRENT_DATE - 1, 3.0,
       'Night-shift listening session follow-up and rest-window notes.', 'meeting',
       'submitted', NOW() - INTERVAL '12 hours', NULL, NULL, NULL, FALSE),

      -- Rejected
      ('11450007-be01-4a01-9c01-534433340007', v_project_id, v_auth3, CURRENT_DATE - 6, 9.5,
       'Depot handover and vehicle inspection.', 'general',
       'rejected', NOW() - INTERVAL '5 days', v_owner_auth, NOW() - INTERVAL '4 days',
       'Over the daily cap — please split the inspection hours onto a separate day.', FALSE),

      -- Draft
      ('11450007-be01-4a01-9c01-534433340008', v_project_id, v_auth4, CURRENT_DATE, 2.5,
       'Morning driver briefing on the updated night corridor.', 'meeting',
       'draft', NULL, NULL, NULL, NULL, FALSE),
      ('11450007-be01-4a01-9c01-534433340009', v_project_id, v_auth1, CURRENT_DATE, 5.0,
       'Corridor plan adjustments following yesterday''s dispatch notes.', 'general',
       'draft', NULL, NULL, NULL, NULL, FALSE)
    ON CONFLICT (id) DO NOTHING;
  ELSE
    RAISE NOTICE 'v1145: no auth_user_id resolvable for % team — skipped timesheet_entries seed', v_project_code;
  END IF;

  RAISE NOTICE 'v1145: resource/time sample data ready for % (directory, capacity, calendar, plan, timesheets/approvals).', v_project_code;
END $$;
