-- =============================================================================
-- v971: Seed Data — Resources group (Core PM sidebar).
-- Covers: Resource Directory (resources), Capacity Planning
--         (resource_capacity_plans + cross_project_resource_allocations),
--         Assignments (project_memberships — 0 rows for anchor projects; the
--         legacy public.user_projects table already has 30 rows for these
--         projects but is NOT what the Assignments page reads).
-- Time Entry / Approvals (public.timesheet_entries) — 0 rows system-wide, now
-- seeded below too. Note: timesheet_entries.user_id / reviewed_by reference
-- auth.users(id), NOT public.users(id) like most other tables — seed rows use
-- the resolved auth_user_id, not the public.users id.
-- Prerequisites: v305 (anchor projects), v27 (resources), v38 (capacity/alloc),
--                v628e (timesheet_entries), core project_memberships / project_roles.
-- Idempotent: fixed hex-only UUIDs + ON CONFLICT (id) DO NOTHING. Safe to re-run.
-- Display IDs: resources.resource_code is a plain optional VARCHAR with no admin
--   display-id trigger wired — left NULL (not required) rather than hand-minted.
-- =============================================================================

DO $$
DECLARE
  v_proj_dw  UUID; -- SEED-PP-01 Digital Workspace Rollout
  v_proj_bi  UUID; -- SEED-PP-02 BI Platform Implementation
  v_proj_erp UUID; -- SEED-PP-03 ERP Phase 1
  v_user_id  UUID;
  v_user2_id UUID;
  v_user3_id UUID;
  v_auth_uid UUID;

  v_res1 UUID := '97100001-2501-4a01-9c01-534433340001';
  v_res2 UUID := '97100001-2501-4a01-9c01-534433340002';
  v_res3 UUID := '97100001-2501-4a01-9c01-534433340003';
  v_res4 UUID := '97100001-2501-4a01-9c01-534433340004';

  v_role_pm UUID;
  v_role_tm UUID;
  v_role_ba UUID;
BEGIN

  SELECT id INTO v_proj_dw  FROM public.projects WHERE project_code = 'SEED-PP-01' AND COALESCE(is_deleted, false) = false LIMIT 1;
  SELECT id INTO v_proj_bi  FROM public.projects WHERE project_code = 'SEED-PP-02' AND COALESCE(is_deleted, false) = false LIMIT 1;
  SELECT id INTO v_proj_erp FROM public.projects WHERE project_code = 'SEED-PP-03' AND COALESCE(is_deleted, false) = false LIMIT 1;

  IF v_proj_dw IS NULL OR v_proj_bi IS NULL OR v_proj_erp IS NULL THEN
    RAISE NOTICE 'v971: One or more anchor seed projects (SEED-PP-01/02/03) not found — run v305 first. Skipping.';
    RETURN;
  END IF;

  SELECT id INTO v_user_id FROM public.users WHERE COALESCE(is_deleted, false) = false ORDER BY id LIMIT 1;
  SELECT id INTO v_user2_id FROM public.users WHERE COALESCE(is_deleted, false) = false AND id <> v_user_id ORDER BY id LIMIT 1;
  SELECT id INTO v_user3_id FROM public.users WHERE COALESCE(is_deleted, false) = false AND id NOT IN (v_user_id, v_user2_id) ORDER BY id LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'v971: No user available to attribute seed rows. Skipping.';
    RETURN;
  END IF;

  SELECT auth_user_id INTO v_auth_uid FROM public.users WHERE id = v_user_id LIMIT 1;
  IF v_auth_uid IS NOT NULL THEN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_auth_uid::text)::text, true);
  END IF;

  SELECT id INTO v_role_pm FROM public.project_roles WHERE role_name = 'project_manager' LIMIT 1;
  SELECT id INTO v_role_tm FROM public.project_roles WHERE role_name = 'team_member' LIMIT 1;
  SELECT id INTO v_role_ba FROM public.project_roles WHERE role_name = 'project_assurance' LIMIT 1;

  -- ---------------------------------------------------------------------------
  -- RESOURCE DIRECTORY (public.resources) — 4 human resources
  -- ---------------------------------------------------------------------------
  INSERT INTO public.resources (
    id, resource_name, resource_type, resource_category, resource_description,
    default_capacity_hours_per_day, default_capacity_days_per_week, default_capacity_percentage,
    hourly_rate, currency_code, is_active, is_available, user_id,
    is_deleted, created_at, created_by
  ) VALUES
    (v_res1, 'Naledi Moyo', 'human', 'delivery', 'Senior Business Analyst — workspace and BI workstreams.',
     8, 5, 100, 65, 'USD', true, true, v_user_id, false, NOW() - INTERVAL '80 days', v_user_id),

    (v_res2, 'Thabo Dlamini', 'human', 'delivery', 'Technical Lead — infrastructure and integrations.',
     8, 5, 100, 75, 'USD', true, true, COALESCE(v_user2_id, v_user_id), false, NOW() - INTERVAL '80 days', v_user_id),

    (v_res3, 'Ayanda Nkosi', 'human', 'delivery', 'PMO Analyst — reporting and financial tracking, shared across 2 projects.',
     8, 5, 60, 45, 'USD', true, true, COALESCE(v_user3_id, v_user_id), false, NOW() - INTERVAL '60 days', v_user_id),

    (v_res4, 'BI Test Environment', 'equipment', 'infrastructure', 'Shared UAT/test environment for BI platform validation.',
     24, 7, 100, NULL, 'USD', true, true, NULL, false, NOW() - INTERVAL '60 days', v_user_id)
  ON CONFLICT (id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- CAPACITY PLANNING (public.resource_capacity_plans) — per-resource plans
  -- ---------------------------------------------------------------------------
  -- NOTE (2026-08-24): available_capacity_hours, capacity_utilization_percentage, and
  -- is_over_capacity are all GENERATED ALWAYS AS ... STORED columns on this table (see
  -- v38_cross_project_resources.sql) — Postgres computes them automatically and rejects any
  -- explicit value (ERROR 428C9). Dropped from the column list and VALUES tuples below; the
  -- underlying planned_capacity_hours/planned_allocation_hours values are unchanged, so the
  -- generated columns will compute the same intended figures (e.g. 680/720 = 94.4%) automatically.
  INSERT INTO public.resource_capacity_plans (
    id, resource_id, plan_scope, plan_start_date, plan_end_date, plan_type,
    planned_capacity_hours, planned_allocation_hours, plan_status, plan_owner_user_id,
    is_deleted, created_at, created_by
  ) VALUES
    ('97100002-c901-4a01-9c01-534433340001', v_res1, 'project', CURRENT_DATE - 30, CURRENT_DATE + INTERVAL '60 days', 'rolling',
     720, 680, 'active', v_user_id, false, NOW() - INTERVAL '30 days', v_user_id),

    ('97100002-c901-4a01-9c01-534433340002', v_res2, 'project', CURRENT_DATE - 30, CURRENT_DATE + INTERVAL '60 days', 'rolling',
     720, 760, 'active', v_user_id, false, NOW() - INTERVAL '30 days', v_user_id),

    ('97100002-c901-4a01-9c01-534433340003', v_res3, 'portfolio', CURRENT_DATE - 15, CURRENT_DATE + INTERVAL '75 days', 'rolling',
     432, 400, 'active', v_user_id, false, NOW() - INTERVAL '15 days', v_user_id)
  ON CONFLICT (id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- CROSS-PROJECT ALLOCATIONS (public.cross_project_resource_allocations)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.cross_project_resource_allocations (
    id, resource_id, project_id, allocation_start_date, allocation_end_date,
    allocation_percentage, allocated_hours_per_week, allocation_type, allocation_status,
    allocation_priority, is_critical_resource, allocated_by_user_id,
    is_deleted, created_at, created_by
  ) VALUES
    ('97100003-a101-4a01-9c01-534433340001', v_res1, v_proj_dw, CURRENT_DATE - 30, CURRENT_DATE + INTERVAL '60 days',
     60, 24, 'planned', 'active', 'high', true, v_user_id, false, NOW() - INTERVAL '30 days', v_user_id),

    ('97100003-a101-4a01-9c01-534433340002', v_res1, v_proj_bi, CURRENT_DATE - 30, CURRENT_DATE + INTERVAL '60 days',
     40, 16, 'planned', 'active', 'medium', false, v_user_id, false, NOW() - INTERVAL '30 days', v_user_id),

    ('97100003-a101-4a01-9c01-534433340003', v_res2, v_proj_dw, CURRENT_DATE - 30, CURRENT_DATE + INTERVAL '60 days',
     100, 40, 'planned', 'active', 'critical', true, v_user_id, false, NOW() - INTERVAL '30 days', v_user_id),

    ('97100003-a101-4a01-9c01-534433340004', v_res3, v_proj_erp, CURRENT_DATE - 15, CURRENT_DATE + INTERVAL '75 days',
     50, 20, 'planned', 'active', 'medium', false, v_user_id, false, NOW() - INTERVAL '15 days', v_user_id)
  ON CONFLICT (id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- ASSIGNMENTS (public.project_memberships) — a handful across 3 anchors
  -- ---------------------------------------------------------------------------
  IF v_role_pm IS NOT NULL AND v_role_tm IS NOT NULL THEN
    INSERT INTO public.project_memberships (
      id, project_id, user_id, project_role_id, invitation_status, is_active, accepted_at, created_at
    ) VALUES
      ('97100004-9301-4a01-9c01-534433340001', v_proj_dw, v_user_id, v_role_pm, 'accepted', true, NOW() - INTERVAL '95 days', NOW() - INTERVAL '95 days'),
      ('97100004-9301-4a01-9c01-534433340002', v_proj_dw, COALESCE(v_user2_id, v_user_id), v_role_tm, 'accepted', true, NOW() - INTERVAL '90 days', NOW() - INTERVAL '90 days'),
      ('97100004-9301-4a01-9c01-534433340003', v_proj_bi, v_user_id, v_role_pm, 'accepted', true, NOW() - INTERVAL '110 days', NOW() - INTERVAL '110 days'),
      ('97100004-9301-4a01-9c01-534433340004', v_proj_bi, COALESCE(v_user3_id, v_user_id), COALESCE(v_role_ba, v_role_tm), 'accepted', true, NOW() - INTERVAL '105 days', NOW() - INTERVAL '105 days'),
      ('97100004-9301-4a01-9c01-534433340005', v_proj_erp, COALESCE(v_user2_id, v_user_id), v_role_pm, 'accepted', true, NOW() - INTERVAL '70 days', NOW() - INTERVAL '70 days')
    ON CONFLICT (id) DO NOTHING;
  ELSE
    RAISE NOTICE 'v971: project_roles lookup (project_manager/team_member) not found — Assignments (project_memberships) rows skipped.';
  END IF;

  -- ---------------------------------------------------------------------------
  -- TIME ENTRY / APPROVALS (public.timesheet_entries) — user_id/reviewed_by
  -- reference auth.users(id), not public.users(id).
  -- ---------------------------------------------------------------------------
  IF v_auth_uid IS NOT NULL THEN
    INSERT INTO public.timesheet_entries (
      id, project_id, user_id, entry_date, hours_worked, description, work_category,
      status, submitted_at, reviewed_by, reviewed_at, created_at, updated_at, is_deleted
    ) VALUES
      ('97100005-7e01-4a01-9c01-534433340001', v_proj_dw, v_auth_uid, CURRENT_DATE - 3, 7.5,
       'Workspace rollout wave 2 planning and vendor coordination.', 'meeting',
       'approved', NOW() - INTERVAL '3 days', v_auth_uid, NOW() - INTERVAL '2 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days', false),

      ('97100005-7e01-4a01-9c01-534433340002', v_proj_dw, v_auth_uid, CURRENT_DATE - 2, 8,
       'Change request assessment for VPN client decommission delay.', 'review',
       'submitted', NOW() - INTERVAL '2 days', NULL, NULL, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', false),

      ('97100005-7e01-4a01-9c01-534433340003', v_proj_bi, v_auth_uid, CURRENT_DATE - 5, 6.5,
       'BI platform UAT defect triage session.', 'testing',
       'approved', NOW() - INTERVAL '5 days', v_auth_uid, NOW() - INTERVAL '4 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days', false),

      ('97100005-7e01-4a01-9c01-534433340004', v_proj_erp, v_auth_uid, CURRENT_DATE - 1, 4,
       'ERP Phase 1 UAT script preparation.', 'documentation',
       'draft', NULL, NULL, NULL, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', false)
    ON CONFLICT (id) DO NOTHING;
  ELSE
    RAISE NOTICE 'v971: No auth_user_id resolvable for seed user — timesheet_entries rows skipped (FK requires auth.users).';
  END IF;

  RAISE NOTICE 'v971: Resources seed complete (resource directory, capacity plans, cross-project allocations, assignments, timesheet entries) for SEED-PP-01/02/03.';

END $$;
