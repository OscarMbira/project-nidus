-- =============================================================================
-- v970: Seed Data — Planning group (Core PM sidebar).
-- Covers: S-Curve & Baselines (project_baselines + baseline_snapshots),
--         Milestones (milestones), Calendars (project_calendars).
-- Already covered by SQL/v969 (RAID seed) — NOT repeated here:
--   Planning Assumptions -> public.assumptions (same table/route as RAID's
--   Assumptions Register leaf); Dependencies -> public.dependencies_register.
-- GENUINE GAPS FOUND (flagged, not fixed — no new tables created per task
-- scope): the Schedule sub-group's tables do not exist in the live database,
-- even though migration files for them exist:
--   - public.activity_list        (SQL/v365_activity_list.sql)      -> Activity Register leaf
--   - public.activity_dependencies(SQL/v367_activity_dependencies.sql) -> Network/Dependencies leaf
--     (Gantt reuses activity_list — same gap)
--   - public.schedule_management_plans (SQL/v363_schedule_management_plans.sql) -> Schedule Mgmt Plan leaf
--   - public.scope_statements     (SQL/v359_scope_statements.sql)   -> Scope Statement leaf
--   - public.wbs_nodes            (SQL/v361_wbs_nodes.sql)          -> WBS Builder leaf
--   These 5 migrations (v359/361/363/365/367) were apparently never applied to
--   this environment. Running them is a separate fix, out of scope for a pure
--   data-seed task — no seed rows were written for these 5 leaves.
--   Also: "Scenario Planning" (menu_code plat_pm_planning_scenarios, route
--   /pm/planning/scenarios) has no matching <Route> registered anywhere in
--   apps/platform/src/routes/** or packages/modules/** — the sidebar leaf
--   appears unwired (dead link), so there is no live table to seed either.
-- Prerequisites: v305 (anchor projects), v139/v644 (baselines), v966w (milestones),
--                v963w (project_calendars).
-- Idempotent: fixed hex-only UUIDs + ON CONFLICT (id) DO NOTHING. Safe to re-run.
-- Display IDs: none of these tables have a human-readable reference column with
--   an admin display-id trigger wired — plain names/labels used directly.
-- =============================================================================

DO $$
DECLARE
  v_proj_dw  UUID; -- SEED-PP-01 Digital Workspace Rollout
  v_proj_bi  UUID; -- SEED-PP-02 BI Platform Implementation
  v_proj_erp UUID; -- SEED-PP-03 ERP Phase 1
  v_user_id  UUID;
  v_auth_uid UUID;

  v_bl1 UUID := '97000001-b101-4a01-9c01-534433340001';
  v_bl2 UUID := '97000001-b101-4a01-9c01-534433340002';
BEGIN

  SELECT id INTO v_proj_dw  FROM public.projects WHERE project_code = 'SEED-PP-01' AND COALESCE(is_deleted, false) = false LIMIT 1;
  SELECT id INTO v_proj_bi  FROM public.projects WHERE project_code = 'SEED-PP-02' AND COALESCE(is_deleted, false) = false LIMIT 1;
  SELECT id INTO v_proj_erp FROM public.projects WHERE project_code = 'SEED-PP-03' AND COALESCE(is_deleted, false) = false LIMIT 1;

  IF v_proj_dw IS NULL OR v_proj_bi IS NULL OR v_proj_erp IS NULL THEN
    RAISE NOTICE 'v970: One or more anchor seed projects (SEED-PP-01/02/03) not found — run v305 first. Skipping.';
    RETURN;
  END IF;

  SELECT id INTO v_user_id FROM public.users WHERE COALESCE(is_deleted, false) = false LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'v970: No user available to attribute seed rows. Skipping.';
    RETURN;
  END IF;

  SELECT auth_user_id INTO v_auth_uid FROM public.users WHERE id = v_user_id LIMIT 1;
  IF v_auth_uid IS NOT NULL THEN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_auth_uid::text)::text, true);
  END IF;

  -- ---------------------------------------------------------------------------
  -- S-CURVE & BASELINES (public.project_baselines + public.baseline_snapshots)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.project_baselines (
    id, project_id, baseline_name, baseline_type, baseline_date, baseline_data,
    approved_by, approval_date, is_active, comments, created_by, created_at
  ) VALUES
    (v_bl1, v_proj_dw, 'Wave 1 Approved Baseline', 'integrated', CURRENT_DATE - 90,
     '{"planned_duration_days": 180, "planned_budget": 420000}'::jsonb,
     v_user_id, NOW() - INTERVAL '85 days', true, 'Baseline approved at project kickoff.',
     v_user_id, NOW() - INTERVAL '90 days'),

    (v_bl2, v_proj_bi, 'BI Platform Integrated Baseline', 'integrated', CURRENT_DATE - 75,
     '{"planned_duration_days": 240, "planned_budget": 650000}'::jsonb,
     v_user_id, NOW() - INTERVAL '70 days', true, 'Baseline approved by Programme Board.',
     v_user_id, NOW() - INTERVAL '75 days')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.baseline_snapshots (
    id, baseline_id, snapshot_date, planned_cost, earned_value, actual_cost,
    planned_pct_complete, actual_pct_complete, snapshot_data, created_at, updated_at
  ) VALUES
    ('97000002-b501-4a01-9c01-534433340001', v_bl1, CURRENT_DATE - 60, 140000, 132000, 138000, 33, 31, '{}'::jsonb, NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days'),
    ('97000002-b501-4a01-9c01-534433340002', v_bl1, CURRENT_DATE - 30, 280000, 260000, 275000, 67, 62, '{}'::jsonb, NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'),
    ('97000002-b501-4a01-9c01-534433340003', v_bl1, CURRENT_DATE, 420000, 350000, 400000, 100, 83, '{}'::jsonb, NOW(), NOW()),
    ('97000002-b501-4a01-9c01-534433340004', v_bl2, CURRENT_DATE - 45, 200000, 185000, 210000, 31, 28, '{}'::jsonb, NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days'),
    ('97000002-b501-4a01-9c01-534433340005', v_bl2, CURRENT_DATE, 400000, 350000, 390000, 62, 54, '{}'::jsonb, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- MILESTONES (public.milestones) — across 3 anchor projects
  -- ---------------------------------------------------------------------------
  INSERT INTO public.milestones (
    id, project_id, milestone_name, description, target_date, forecast_date, actual_date,
    status, owner_user_id, sequence_order, notes,
    is_deleted, created_at, created_by
  ) VALUES
    ('97000003-3501-4a01-9c01-534433340001', v_proj_dw, 'Wave 1 Rollout Complete', 'HQ and Birmingham offices fully migrated to the new digital workspace.',
     CURRENT_DATE - 45, CURRENT_DATE - 45, CURRENT_DATE - 42,
     'achieved', v_user_id, 1, 'Completed 3 days behind forecast due to a hardware delivery delay.',
     false, NOW() - INTERVAL '95 days', v_user_id),

    ('97000003-3501-4a01-9c01-534433340002', v_proj_dw, 'Wave 2 Rollout Complete', 'Manchester and Leeds offices fully migrated.',
     CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '30 days', NULL,
     'planned', v_user_id, 2, NULL,
     false, NOW() - INTERVAL '95 days', v_user_id),

    ('97000003-3501-4a01-9c01-534433340003', v_proj_bi, 'Data Warehouse Schema Freeze', 'Finance data warehouse schema frozen ahead of ETL build.',
     CURRENT_DATE - 60, CURRENT_DATE - 60, CURRENT_DATE - 60,
     'achieved', v_user_id, 1, NULL,
     false, NOW() - INTERVAL '110 days', v_user_id),

    ('97000003-3501-4a01-9c01-534433340004', v_proj_bi, 'BI Platform Go-Live', 'Enterprise BI platform available to all business units.',
     CURRENT_DATE + INTERVAL '15 days', CURRENT_DATE + INTERVAL '22 days', NULL,
     'at_risk', v_user_id, 2, 'At risk due to two open high-severity issues in UAT.',
     false, NOW() - INTERVAL '110 days', v_user_id),

    ('97000003-3501-4a01-9c01-534433340005', v_proj_erp, 'ERP Phase 1 UAT Sign-off', 'User acceptance testing complete and signed off by business owners.',
     CURRENT_DATE + INTERVAL '10 days', CURRENT_DATE + INTERVAL '10 days', NULL,
     'planned', v_user_id, 1, NULL,
     false, NOW() - INTERVAL '70 days', v_user_id)
  ON CONFLICT (id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- CALENDARS (public.project_calendars) — one working-week calendar per project
  -- ---------------------------------------------------------------------------
  INSERT INTO public.project_calendars (
    id, project_id, monday, tuesday, wednesday, thursday, friday, saturday, sunday,
    hours_per_day, timezone, notes,
    is_deleted, created_at, created_by
  ) VALUES
    ('97000004-9c01-4a01-9c01-534433340001', v_proj_dw, true, true, true, true, true, false, false, 8, 'Europe/London', 'Standard Mon-Fri working calendar.', false, NOW() - INTERVAL '95 days', v_user_id),
    ('97000004-9c01-4a01-9c01-534433340002', v_proj_bi, true, true, true, true, true, false, false, 7.5, 'Europe/London', 'Standard Mon-Fri, 7.5h/day per team agreement.', false, NOW() - INTERVAL '110 days', v_user_id),
    ('97000004-9c01-4a01-9c01-534433340003', v_proj_erp, true, true, true, true, true, false, false, 8, 'Europe/London', NULL, false, NOW() - INTERVAL '70 days', v_user_id)
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'v970: Planning seed complete (baselines/snapshots, milestones, project calendars) for SEED-PP-01/02/03.';

END $$;
