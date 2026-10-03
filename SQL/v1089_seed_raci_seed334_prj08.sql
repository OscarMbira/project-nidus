-- =============================================================================
-- v1089: Seed RACI matrices for SEED334-PRJ-08 (Velocity Freight pilot)
-- Purpose: Populate Project Team → RACI list (/pm/resources/raci) with sample
--          matrices, deliverable rows, and R/A/C/I assignments.
-- Prerequisites: v644 (raci_*), v334 (SEED334 projects), project_memberships
--                with users that have auth_user_id set.
-- Idempotent: fixed hex-only UUIDs + ON CONFLICT DO NOTHING. Safe to re-run.
-- Display IDs: none on raci_matrices / raci_rows / raci_assignments.
-- UI note: Select SEED334-PRJ-08 in the header, open Project Team → RACI.
-- Assignments.member_user_id REFERENCES auth.users(id) (not public.users.id).
-- =============================================================================

DO $$
DECLARE
  v_project_code TEXT := 'SEED334-PRJ-08';
  v_project_id   UUID;
  v_auth_uids    UUID[];
  v_auth_pm      UUID;
  v_auth_2       UUID;
  v_auth_3       UUID;
  v_auth_4       UUID;
  v_m1           UUID := 'a0890001-3348-4a01-9c01-534433340001'::UUID;
  v_m2           UUID := 'a0890001-3348-4a01-9c01-534433340002'::UUID;
  v_m3           UUID := 'a0890001-3348-4a01-9c01-534433340003'::UUID;
  -- Matrix 1 rows
  v_r11 UUID := 'a0890011-3348-4a01-9c01-534433340011'::UUID;
  v_r12 UUID := 'a0890011-3348-4a01-9c01-534433340012'::UUID;
  v_r13 UUID := 'a0890011-3348-4a01-9c01-534433340013'::UUID;
  v_r14 UUID := 'a0890011-3348-4a01-9c01-534433340014'::UUID;
  v_r15 UUID := 'a0890011-3348-4a01-9c01-534433340015'::UUID;
  -- Matrix 2 rows
  v_r21 UUID := 'a0890021-3348-4a01-9c01-534433340021'::UUID;
  v_r22 UUID := 'a0890021-3348-4a01-9c01-534433340022'::UUID;
  v_r23 UUID := 'a0890021-3348-4a01-9c01-534433340023'::UUID;
  -- Matrix 3 rows
  v_r31 UUID := 'a0890031-3348-4a01-9c01-534433340031'::UUID;
  v_r32 UUID := 'a0890031-3348-4a01-9c01-534433340032'::UUID;
BEGIN
  SELECT id INTO v_project_id
  FROM public.projects
  WHERE project_code = v_project_code
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'v1089: project % not found — run SEED334 project seed first', v_project_code;
  END IF;

  -- Auth user ids for members on this project (FK target for raci_assignments)
  SELECT ARRAY(
    SELECT DISTINCT u.auth_user_id
    FROM public.project_memberships pm
    JOIN public.users u ON u.id = pm.user_id
    WHERE pm.project_id = v_project_id
      AND COALESCE(pm.is_active, TRUE) = TRUE
      AND u.auth_user_id IS NOT NULL
      AND COALESCE(u.is_deleted, FALSE) = FALSE
    ORDER BY u.auth_user_id
    LIMIT 4
  ) INTO v_auth_uids;

  IF v_auth_uids IS NULL OR cardinality(v_auth_uids) = 0 THEN
    -- Fallback: any user linked to auth
    SELECT ARRAY(
      SELECT u.auth_user_id
      FROM public.users u
      WHERE u.auth_user_id IS NOT NULL
        AND COALESCE(u.is_deleted, FALSE) = FALSE
      ORDER BY u.created_at NULLS LAST
      LIMIT 1
    ) INTO v_auth_uids;
  END IF;

  IF v_auth_uids IS NULL OR cardinality(v_auth_uids) = 0 THEN
    RAISE EXCEPTION 'v1089: no auth-linked users available for RACI assignments';
  END IF;

  v_auth_pm := v_auth_uids[1];
  v_auth_2  := COALESCE(v_auth_uids[2], v_auth_pm);
  v_auth_3  := COALESCE(v_auth_uids[3], v_auth_2);
  v_auth_4  := COALESCE(v_auth_uids[4], v_auth_3);

  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', v_auth_pm::text)::text,
    true
  );

  -- ── Matrices ───────────────────────────────────────────────────────────────
  INSERT INTO public.raci_matrices (
    id, project_id, matrix_name, matrix_version, status, created_by, created_at, updated_at
  ) VALUES
    (v_m1, v_project_id, 'Delivery Workstream RACI', 1, 'active',
     v_auth_pm, NOW() - INTERVAL '40 days', NOW() - INTERVAL '5 days'),
    (v_m2, v_project_id, 'Stakeholder Communication RACI', 1, 'active',
     v_auth_pm, NOW() - INTERVAL '28 days', NOW() - INTERVAL '3 days'),
    (v_m3, v_project_id, 'Pilot Go-Live RACI', 1, 'draft',
     v_auth_pm, NOW() - INTERVAL '7 days', NOW() - INTERVAL '1 day')
  ON CONFLICT (id) DO NOTHING;

  -- ── Rows — Delivery Workstream ─────────────────────────────────────────────
  INSERT INTO public.raci_rows (
    id, matrix_id, deliverable_name, sort_order, created_at, updated_at
  ) VALUES
    (v_r11, v_m1, 'Define dynamic routing requirements', 10, NOW() - INTERVAL '39 days', NOW() - INTERVAL '39 days'),
    (v_r12, v_m1, 'Design ML route-optimisation pipeline', 20, NOW() - INTERVAL '38 days', NOW() - INTERVAL '38 days'),
    (v_r13, v_m1, 'Build driver mobile ETA updates', 30, NOW() - INTERVAL '35 days', NOW() - INTERVAL '35 days'),
    (v_r14, v_m1, 'Run regional fleet pilot (wave 1)', 40, NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),
    (v_r15, v_m1, 'Approve wave-1 go / no-go decision', 50, NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days')
  ON CONFLICT (id) DO NOTHING;

  -- ── Rows — Stakeholder Communication ───────────────────────────────────────
  INSERT INTO public.raci_rows (
    id, matrix_id, deliverable_name, sort_order, created_at, updated_at
  ) VALUES
    (v_r21, v_m2, 'Weekly status pack to steering committee', 10, NOW() - INTERVAL '27 days', NOW() - INTERVAL '27 days'),
    (v_r22, v_m2, 'Depot change-impact briefings', 20, NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days'),
    (v_r23, v_m2, 'Customer communication on ETA accuracy', 30, NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days')
  ON CONFLICT (id) DO NOTHING;

  -- ── Rows — Pilot Go-Live (draft) ───────────────────────────────────────────
  INSERT INTO public.raci_rows (
    id, matrix_id, deliverable_name, sort_order, created_at, updated_at
  ) VALUES
    (v_r31, v_m3, 'Cutover checklist and rollback plan', 10, NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),
    (v_r32, v_m3, 'Hypercare rota for first 14 days', 20, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days')
  ON CONFLICT (id) DO NOTHING;

  -- ── Assignments (R / A / C / I) ─────────────────────────────────────────────
  -- Fewer than 4 distinct project members collapses v_auth_2/3/4 onto the same
  -- auth uid — DISTINCT ON + ON CONFLICT (row_id, member_user_id, raci_role)
  -- keeps the seed idempotent when that happens.
  INSERT INTO public.raci_assignments (id, row_id, member_user_id, raci_role)
  SELECT DISTINCT ON (x.row_id, x.member_user_id, x.raci_role)
    x.id, x.row_id, x.member_user_id, x.raci_role
  FROM (
    VALUES
      -- Delivery workstream
      ('a0890101-3348-4a01-9c01-534433340101'::UUID, v_r11, v_auth_2,  'R'),
      ('a0890101-3348-4a01-9c01-534433340102'::UUID, v_r11, v_auth_pm, 'A'),
      ('a0890101-3348-4a01-9c01-534433340103'::UUID, v_r11, v_auth_3,  'C'),
      ('a0890101-3348-4a01-9c01-534433340104'::UUID, v_r11, v_auth_4,  'I'),

      ('a0890101-3348-4a01-9c01-534433340111'::UUID, v_r12, v_auth_2,  'R'),
      ('a0890101-3348-4a01-9c01-534433340112'::UUID, v_r12, v_auth_pm, 'A'),
      ('a0890101-3348-4a01-9c01-534433340113'::UUID, v_r12, v_auth_3,  'C'),

      ('a0890101-3348-4a01-9c01-534433340121'::UUID, v_r13, v_auth_3,  'R'),
      ('a0890101-3348-4a01-9c01-534433340122'::UUID, v_r13, v_auth_pm, 'A'),
      ('a0890101-3348-4a01-9c01-534433340123'::UUID, v_r13, v_auth_2,  'C'),
      ('a0890101-3348-4a01-9c01-534433340124'::UUID, v_r13, v_auth_4,  'I'),

      ('a0890101-3348-4a01-9c01-534433340131'::UUID, v_r14, v_auth_pm, 'A'),
      ('a0890101-3348-4a01-9c01-534433340132'::UUID, v_r14, v_auth_2,  'R'),
      ('a0890101-3348-4a01-9c01-534433340133'::UUID, v_r14, v_auth_4,  'C'),

      ('a0890101-3348-4a01-9c01-534433340141'::UUID, v_r15, v_auth_pm, 'A'),
      ('a0890101-3348-4a01-9c01-534433340142'::UUID, v_r15, v_auth_2,  'C'),
      ('a0890101-3348-4a01-9c01-534433340143'::UUID, v_r15, v_auth_3,  'I'),
      ('a0890101-3348-4a01-9c01-534433340144'::UUID, v_r15, v_auth_4,  'R'),

      -- Stakeholder communication
      ('a0890101-3348-4a01-9c01-534433340201'::UUID, v_r21, v_auth_pm, 'A'),
      ('a0890101-3348-4a01-9c01-534433340202'::UUID, v_r21, v_auth_4,  'R'),
      ('a0890101-3348-4a01-9c01-534433340203'::UUID, v_r21, v_auth_2,  'C'),

      ('a0890101-3348-4a01-9c01-534433340211'::UUID, v_r22, v_auth_4,  'R'),
      ('a0890101-3348-4a01-9c01-534433340212'::UUID, v_r22, v_auth_pm, 'A'),
      ('a0890101-3348-4a01-9c01-534433340213'::UUID, v_r22, v_auth_3,  'I'),

      ('a0890101-3348-4a01-9c01-534433340221'::UUID, v_r23, v_auth_4,  'R'),
      ('a0890101-3348-4a01-9c01-534433340222'::UUID, v_r23, v_auth_pm, 'A'),
      ('a0890101-3348-4a01-9c01-534433340223'::UUID, v_r23, v_auth_2,  'C'),

      -- Pilot go-live (draft)
      ('a0890101-3348-4a01-9c01-534433340301'::UUID, v_r31, v_auth_2,  'R'),
      ('a0890101-3348-4a01-9c01-534433340302'::UUID, v_r31, v_auth_pm, 'A'),
      ('a0890101-3348-4a01-9c01-534433340311'::UUID, v_r32, v_auth_3,  'R'),
      ('a0890101-3348-4a01-9c01-534433340312'::UUID, v_r32, v_auth_pm, 'A'),
      ('a0890101-3348-4a01-9c01-534433340313'::UUID, v_r32, v_auth_4,  'I')
  ) AS x(id, row_id, member_user_id, raci_role)
  ORDER BY x.row_id, x.member_user_id, x.raci_role, x.id
  ON CONFLICT (row_id, member_user_id, raci_role) DO NOTHING;

  RAISE NOTICE 'v1089: RACI seed complete for % — 3 matrices, rows + assignments (auth members=%)',
    v_project_code, cardinality(v_auth_uids);
END $$;

-- Verification (expect 3 matrices for SEED334-PRJ-08)
SELECT m.matrix_name, m.status, m.matrix_version,
       (SELECT COUNT(*) FROM public.raci_rows r WHERE r.matrix_id = m.id AND COALESCE(r.is_deleted, FALSE) = FALSE) AS row_count
FROM public.raci_matrices m
JOIN public.projects p ON p.id = m.project_id
WHERE p.project_code = 'SEED334-PRJ-08'
  AND COALESCE(m.is_deleted, FALSE) = FALSE
ORDER BY m.matrix_name;
