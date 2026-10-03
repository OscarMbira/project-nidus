-- =============================================================================
-- v1184: Seed a sample Work Plan for SEED334-PRJ-08 (Velocity Freight pilot)
-- Purpose: Populate the new "Work Plan" tab on My Timesheets with a realistic sample so the
--          v1180 Work Plans vs Timesheet Comparison feature can be exercised end-to-end on the
--          project already used to test Timesheets/Overtime this session.
-- Prerequisites: v1180 (billing_type), v1181 (work_plan_item_statuses), v1183 (core tables),
--                v1079 (SEED334-PRJ-08 project_memberships).
-- Also flips SEED334-PRJ-08 to billing_type = 'time_and_material' so the comparison UI is
-- actually visible for this project.
-- Idempotent: fixed hex-only UUIDs + ON CONFLICT DO NOTHING/UPDATE. Safe to re-run.
-- UI note: Select SEED334-PRJ-08 in the header, open My Timesheets → Work Plan tab.
-- =============================================================================

DO $$
DECLARE
  v_project_code TEXT := 'SEED334-PRJ-08';
  v_project_id   UUID;
  v_auth_user    UUID;
  v_plan_id      UUID := 'a0890041-3348-4a01-9c01-534433340041'::UUID;
  v_week_start   DATE;
BEGIN
  SELECT id INTO v_project_id
  FROM public.projects
  WHERE project_code = v_project_code
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'v1184: project % not found — run SEED334 project seed first', v_project_code;
  END IF;

  -- Flip this project to Time & Material so the comparison UI activates.
  UPDATE public.projects SET billing_type = 'time_and_material', updated_at = NOW()
  WHERE id = v_project_id AND billing_type IS NULL;

  -- Same team-member resolution pattern as v1089 (RACI seed) for this project.
  SELECT u.auth_user_id INTO v_auth_user
  FROM public.project_memberships pm
  JOIN public.users u ON u.id = pm.user_id
  WHERE pm.project_id = v_project_id
    AND COALESCE(pm.is_active, TRUE) = TRUE
    AND u.auth_user_id IS NOT NULL
    AND COALESCE(u.is_deleted, FALSE) = FALSE
  ORDER BY u.auth_user_id
  LIMIT 1;

  IF v_auth_user IS NULL THEN
    RAISE EXCEPTION 'v1184: no project_memberships with an auth_user_id found for % — run v1079 first', v_project_code;
  END IF;

  -- Current (Mon-start) week, matching the same week-boundary convention the UI uses.
  v_week_start := CURRENT_DATE - ((EXTRACT(ISODOW FROM CURRENT_DATE)::INT - 1));

  INSERT INTO public.project_work_plans
    (id, project_id, user_id, period_type, period_start_date, period_end_date, status)
  VALUES
    (v_plan_id, v_project_id, v_auth_user, 'weekly', v_week_start, v_week_start + 6, 'draft')
  ON CONFLICT (project_id, user_id, period_start_date) DO UPDATE SET
    status = EXCLUDED.status,
    updated_at = NOW();

  -- Items inspired by the attached sample sheet ("PLANNED WORK ITEMS - GENERAL PROJECT
  -- ACTIVITIES"), mapped onto the new fixed status list and given Estimated Hours (the
  -- best-practice field the sample didn't have) so the hours-variance comparison has something
  -- real to compare against this week's Timesheet entries.
  INSERT INTO public.project_work_plan_items
    (id, work_plan_id, sort_order, details, status_code, target_completion_pct,
     planned_start_date, planned_end_date, role_code, work_category, estimated_hours, remark)
  VALUES
    ('a0890042-3348-4a01-9c01-534433340001'::UUID, v_plan_id, 10,
     'Project Meeting (Functional, Integration, Testing, Data Migration, PWC)', 'in_progress', NULL,
     v_week_start, NULL, 'BA', 'meeting', 5, 'Ongoing exercise until go-live'),
    ('a0890042-3348-4a01-9c01-534433340002'::UUID, v_plan_id, 20,
     'UAT2 Support', 'in_progress', NULL,
     v_week_start, NULL, 'BA', 'support', 8, 'Ongoing exercise until go-live'),
    ('a0890042-3348-4a01-9c01-534433340003'::UUID, v_plan_id, 30,
     'Mantis Defect Review, Resolution and Packaging', 'in_progress', NULL,
     v_week_start, NULL, 'BA', 'defect_fixing', 6, 'Providing support for testing to users'),
    ('a0890042-3348-4a01-9c01-534433340004'::UUID, v_plan_id, 40,
     'Adhoc Meetings', 'in_progress', NULL,
     v_week_start, NULL, 'BA', 'meeting', 2, NULL),
    ('a0890042-3348-4a01-9c01-534433340005'::UUID, v_plan_id, 50,
     'ATM Charges: defects analysis, fixing, testing and deployment (4 open tickets as at close of Friday)', 'not_started', NULL,
     v_week_start, NULL, 'BA', 'defect_fixing', 4, NULL),
    ('a0890042-3348-4a01-9c01-534433340006'::UUID, v_plan_id, 60,
     'Reports Mapping & configuration — Category Ranges & Product-centric PL (Lera Technologies)', 'in_progress', NULL,
     v_week_start, v_week_start + 4, 'BA', 'documentation', 3, '4 worksheets')
  ON CONFLICT (id) DO UPDATE SET
    details = EXCLUDED.details,
    status_code = EXCLUDED.status_code,
    estimated_hours = EXCLUDED.estimated_hours,
    updated_at = NOW();

  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1184: Work Plan seeded for % — plan % (% items), billing_type=time_and_material', v_project_code, v_plan_id, 6;
  RAISE NOTICE '================================================';
END $$;
