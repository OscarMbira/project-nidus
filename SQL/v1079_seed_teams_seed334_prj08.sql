-- =============================================================================
-- v1079: Seed sample Teams (+ members, roles & skills) for SEED334-PRJ-08 ONLY
-- Purpose: Populate Create Team / Team Members demo data for
--          "Velocity Freight - Dynamic Route Optimization Pilot"
--          (project_code = SEED334-PRJ-08). No other projects are seeded.
-- Prerequisites:
--   v04 (teams, team_members), v390 (team_functional_roles),
--   v334 (SEED334 projects), v1076 (required_skills on roles),
--   v1077 (allocation dates), v1078 (team_types) recommended separately
-- Idempotent: reuses existing named teams; fixed UUID only for new inserts.
-- Display IDs: team_code left blank for BEFORE INSERT trigger (TEAM-NNNN).
-- UI note: Select SEED334-PRJ-08 in the header project selector, then Teams.
-- After run: Results tab must show 2 verification rows.
-- =============================================================================

DO $$
DECLARE
  v_project_id   UUID;
  v_project_code TEXT := 'SEED334-PRJ-08';
  v_lead_id      UUID;
  v_user_ids     UUID[];
  v_team1_id     UUID;
  v_team2_id     UUID;
  v_uid          UUID;
  i              INTEGER;
BEGIN
  SELECT id INTO v_project_id
  FROM public.projects
  WHERE project_code = v_project_code
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'v1079: project % not found — run v334 first', v_project_code;
  END IF;

  SELECT owner_user_id INTO v_lead_id
  FROM public.projects
  WHERE id = v_project_id;

  IF v_lead_id IS NULL THEN
    SELECT pm.user_id INTO v_lead_id
    FROM public.project_memberships pm
    WHERE pm.project_id = v_project_id
      AND COALESCE(pm.is_active, TRUE) = TRUE
    ORDER BY pm.created_at NULLS LAST
    LIMIT 1;
  END IF;

  IF v_lead_id IS NULL THEN
    SELECT id INTO v_lead_id
    FROM public.users
    WHERE COALESCE(is_deleted, FALSE) = FALSE
    LIMIT 1;
  END IF;

  IF v_lead_id IS NULL THEN
    RAISE EXCEPTION 'v1079: no users available to seed teams';
  END IF;

  SELECT ARRAY(
    SELECT pm.user_id
    FROM public.project_memberships pm
    WHERE pm.project_id = v_project_id
      AND COALESCE(pm.is_active, TRUE) = TRUE
      AND pm.user_id IS NOT NULL
    ORDER BY pm.created_at NULLS LAST
    LIMIT 5
  ) INTO v_user_ids;

  IF v_user_ids IS NULL OR cardinality(v_user_ids) = 0 THEN
    v_user_ids := ARRAY[v_lead_id];
  ELSIF NOT (v_lead_id = ANY (v_user_ids)) THEN
    v_user_ids := array_prepend(v_lead_id, v_user_ids);
  END IF;

  -- ── Team 1: Route Optimization Delivery ─────────────────────────────────
  SELECT id INTO v_team1_id
  FROM public.teams
  WHERE project_id = v_project_id
    AND team_name = 'Route Optimization Delivery'
  ORDER BY CASE WHEN COALESCE(is_deleted, FALSE) = FALSE THEN 0 ELSE 1 END, created_at
  LIMIT 1;

  IF v_team1_id IS NULL THEN
    INSERT INTO public.teams (
      id, project_id, team_name, team_description, team_type,
      team_lead_user_id, max_team_size,
      team_code, is_active, is_deleted, created_by
    ) VALUES (
      'a0790001-3348-4a01-9c01-534433340001'::UUID,
      v_project_id,
      'Route Optimization Delivery',
      'Core delivery squad for ML-assisted routing, KPIs on miles, fuel, and on-time delivery for Velocity Freight.',
      'delivery',
      v_lead_id,
      8,
      '',
      TRUE,
      FALSE,
      v_lead_id
    )
    RETURNING id INTO v_team1_id;
  ELSE
    UPDATE public.teams
    SET team_description = 'Core delivery squad for ML-assisted routing, KPIs on miles, fuel, and on-time delivery for Velocity Freight.',
        team_type = 'delivery',
        team_lead_user_id = COALESCE(team_lead_user_id, v_lead_id),
        max_team_size = COALESCE(max_team_size, 8),
        is_active = TRUE,
        is_deleted = FALSE,
        deleted_at = NULL,
        deleted_by = NULL,
        updated_at = NOW()
    WHERE id = v_team1_id;
  END IF;

  INSERT INTO public.team_functional_roles (team_id, role_label, required_skills, sort_order, is_active)
  VALUES
    (v_team1_id, 'Frontend Developer', E'React\nTypeScript\nCSS\nAccessibility', 10, TRUE),
    (v_team1_id, 'Backend Developer', E'Node.js\nPostgreSQL\nDocker\nREST APIs', 20, TRUE),
    (v_team1_id, 'Data / ML Engineer', E'Python\nscikit-learn\nFeature stores\nModel monitoring', 30, TRUE),
    (v_team1_id, 'QA / Test Analyst', E'Selenium\nAPI testing\nTest design\nRegression automation', 40, TRUE),
    (v_team1_id, 'Product Owner', E'Roadmapping\nStakeholder management\nAcceptance criteria', 50, TRUE)
  ON CONFLICT (team_id, role_label) DO UPDATE SET
    required_skills = EXCLUDED.required_skills,
    sort_order = EXCLUDED.sort_order,
    is_active = TRUE,
    updated_at = NOW();

  FOR i IN 1 .. LEAST(cardinality(v_user_ids), 4) LOOP
    v_uid := v_user_ids[i];
    INSERT INTO public.team_members (
      team_id, user_id, member_role, allocation_percentage,
      allocation_start_date, allocation_end_date,
      is_active, is_deleted, created_by
    ) VALUES (
      v_team1_id,
      v_uid,
      CASE i
        WHEN 1 THEN 'Product Owner'
        WHEN 2 THEN 'Frontend Developer'
        WHEN 3 THEN 'Backend Developer'
        ELSE 'QA / Test Analyst'
      END,
      CASE i WHEN 1 THEN 50 WHEN 2 THEN 100 WHEN 3 THEN 80 ELSE 60 END,
      CURRENT_DATE - ((i - 1) * 7),
      CURRENT_DATE + (90 + (i * 14)),
      TRUE,
      FALSE,
      v_lead_id
    )
    ON CONFLICT (team_id, user_id) DO UPDATE SET
      member_role = EXCLUDED.member_role,
      allocation_percentage = EXCLUDED.allocation_percentage,
      allocation_start_date = EXCLUDED.allocation_start_date,
      allocation_end_date = EXCLUDED.allocation_end_date,
      is_active = TRUE,
      is_deleted = FALSE,
      left_at = NULL,
      updated_at = NOW();
  END LOOP;

  -- ── Team 2: Integration & Ops Support ───────────────────────────────────
  SELECT id INTO v_team2_id
  FROM public.teams
  WHERE project_id = v_project_id
    AND team_name = 'Integration & Ops Support'
  ORDER BY CASE WHEN COALESCE(is_deleted, FALSE) = FALSE THEN 0 ELSE 1 END, created_at
  LIMIT 1;

  IF v_team2_id IS NULL THEN
    INSERT INTO public.teams (
      id, project_id, team_name, team_description, team_type,
      team_lead_user_id, max_team_size,
      team_code, is_active, is_deleted, created_by
    ) VALUES (
      'a0790001-3348-4a01-9c01-534433340002'::UUID,
      v_project_id,
      'Integration & Ops Support',
      'Cross-functional support for telematics feeds, carrier APIs, and pilot operations readiness.',
      'cross-functional',
      v_lead_id,
      6,
      '',
      TRUE,
      FALSE,
      v_lead_id
    )
    RETURNING id INTO v_team2_id;
  ELSE
    UPDATE public.teams
    SET team_description = 'Cross-functional support for telematics feeds, carrier APIs, and pilot operations readiness.',
        team_type = 'cross-functional',
        team_lead_user_id = COALESCE(team_lead_user_id, v_lead_id),
        max_team_size = COALESCE(max_team_size, 6),
        is_active = TRUE,
        is_deleted = FALSE,
        deleted_at = NULL,
        deleted_by = NULL,
        updated_at = NOW()
    WHERE id = v_team2_id;
  END IF;

  INSERT INTO public.team_functional_roles (team_id, role_label, required_skills, sort_order, is_active)
  VALUES
    (v_team2_id, 'Integration Specialist', E'EDI / REST\nMessage queues\nMapping specs\nContract testing', 10, TRUE),
    (v_team2_id, 'DevOps Engineer', E'CI/CD\nKubernetes\nObservability\nInfrastructure as code', 20, TRUE),
    (v_team2_id, 'Operations Analyst', E'KPI reporting\nIncident triage\nProcess documentation', 30, TRUE)
  ON CONFLICT (team_id, role_label) DO UPDATE SET
    required_skills = EXCLUDED.required_skills,
    sort_order = EXCLUDED.sort_order,
    is_active = TRUE,
    updated_at = NOW();

  FOR i IN 1 .. LEAST(cardinality(v_user_ids), 3) LOOP
    v_uid := v_user_ids[i];
    INSERT INTO public.team_members (
      team_id, user_id, member_role, allocation_percentage,
      allocation_start_date, allocation_end_date,
      is_active, is_deleted, created_by
    ) VALUES (
      v_team2_id,
      v_uid,
      CASE i
        WHEN 1 THEN 'Operations Analyst'
        WHEN 2 THEN 'Integration Specialist'
        ELSE 'DevOps Engineer'
      END,
      CASE i WHEN 1 THEN 40 WHEN 2 THEN 70 ELSE 50 END,
      CURRENT_DATE - 14,
      CURRENT_DATE + 120,
      TRUE,
      FALSE,
      v_lead_id
    )
    ON CONFLICT (team_id, user_id) DO UPDATE SET
      member_role = EXCLUDED.member_role,
      allocation_percentage = EXCLUDED.allocation_percentage,
      allocation_start_date = EXCLUDED.allocation_start_date,
      allocation_end_date = EXCLUDED.allocation_end_date,
      is_active = TRUE,
      is_deleted = FALSE,
      left_at = NULL,
      updated_at = NOW();
  END LOOP;

  RAISE NOTICE 'v1079: seeded teams % and % on project % (%)',
    v_team1_id, v_team2_id, v_project_code, v_project_id;
END $$;

-- Verification (Results tab must show 2 rows)
SELECT
  t.team_code,
  t.team_name,
  t.team_type,
  t.is_active,
  t.is_deleted,
  p.project_code,
  p.project_name
FROM public.teams t
JOIN public.projects p ON p.id = t.project_id
WHERE p.project_code = 'SEED334-PRJ-08'
  AND t.team_name IN ('Route Optimization Delivery', 'Integration & Ops Support')
  AND COALESCE(t.is_deleted, FALSE) = FALSE
ORDER BY t.team_name;
