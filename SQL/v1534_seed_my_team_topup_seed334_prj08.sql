-- =============================================================================
-- v1534: My Team sample top-up for SEED334-PRJ-08 (v1346)
-- =============================================================================
-- Ensures each active team on SEED334-PRJ-08 has ≥10 functional roles and
-- ≥10 active members. Members are taken from existing project memberships first;
-- if short, adds active organisation users as project members then team members
-- (demo only). Role labels use role titles only (CLAUDE.md rule 77).
-- Idempotent. Prerequisites: v1079, v390, v04.
-- =============================================================================

DO $$
DECLARE
  v_project_id UUID;
  v_account_id UUID;
  v_lead UUID;
  v_member_role_id UUID;
  v_team RECORD;
  v_roles TEXT[] := ARRAY[
    'Integration Specialist',
    'DevOps Engineer',
    'Operations Analyst',
    'Business Analyst',
    'Developer',
    'Tester',
    'Designer',
    'Tech Lead',
    'Scrum Master',
    'Support Engineer',
    'Data Analyst',
    'Release Manager'
  ];
  v_users UUID[];
  v_uid UUID;
  v_existing INT;
  v_i INT;
  v_role TEXT;
  v_need INT;
BEGIN
  SELECT p.id, p.account_id, COALESCE(p.project_manager_user_id, p.owner_user_id)
    INTO v_project_id, v_account_id, v_lead
  FROM public.projects p
  WHERE p.project_code = 'SEED334-PRJ-08'
    AND COALESCE(p.is_deleted, FALSE) = FALSE
  LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE NOTICE 'v1534: SEED334-PRJ-08 not found — skip';
    RETURN;
  END IF;

  -- project_memberships.project_role_id is NOT NULL
  SELECT id INTO v_member_role_id
  FROM public.project_roles
  WHERE role_name IN ('team_member', 'project_manager', 'team_lead')
    AND (project_id IS NULL OR project_id = v_project_id)
  ORDER BY
    CASE role_name WHEN 'team_member' THEN 0 WHEN 'team_lead' THEN 1 ELSE 2 END,
    CASE WHEN project_id IS NULL THEN 0 ELSE 1 END
  LIMIT 1;

  IF v_member_role_id IS NULL THEN
    RAISE NOTICE 'v1534: no project_roles row — will not create new memberships';
  END IF;

  FOR v_team IN
    SELECT t.id, t.team_name
    FROM public.teams t
    WHERE t.project_id = v_project_id
      AND COALESCE(t.is_deleted, FALSE) = FALSE
      AND COALESCE(t.is_active, TRUE) = TRUE
  LOOP
    -- Roles (≥10)
    FOR v_i IN 1 .. cardinality(v_roles) LOOP
      INSERT INTO public.team_functional_roles (team_id, role_label, required_skills, sort_order, is_active)
      VALUES (
        v_team.id,
        v_roles[v_i],
        CASE v_roles[v_i]
          WHEN 'Integration Specialist' THEN E'EDI / REST\nMessage queues\nContract testing'
          WHEN 'DevOps Engineer' THEN E'CI/CD\nKubernetes\nObservability'
          WHEN 'Operations Analyst' THEN E'KPI reporting\nIncident triage'
          ELSE NULL
        END,
        v_i * 10,
        TRUE
      )
      ON CONFLICT (team_id, role_label) DO UPDATE SET
        is_active = TRUE,
        sort_order = EXCLUDED.sort_order,
        updated_at = NOW();
    END LOOP;

    -- Candidate users: project memberships, then other users (with a valid project_role_id)
    v_users := ARRAY(
      SELECT pm.user_id
      FROM public.project_memberships pm
      WHERE pm.project_id = v_project_id
        AND COALESCE(pm.is_active, TRUE) = TRUE
        AND pm.user_id IS NOT NULL
      ORDER BY pm.created_at NULLS LAST
    );

    IF cardinality(COALESCE(v_users, ARRAY[]::UUID[])) < 10 AND v_member_role_id IS NOT NULL THEN
      FOR v_uid IN
        SELECT u.id
        FROM public.users u
        WHERE COALESCE(u.is_deleted, FALSE) = FALSE
          AND COALESCE(u.is_active, TRUE) = TRUE
          AND NOT (u.id = ANY (COALESCE(v_users, ARRAY[]::UUID[])))
        ORDER BY u.created_at NULLS LAST
        LIMIT GREATEST(0, 10 - cardinality(COALESCE(v_users, ARRAY[]::UUID[])))
      LOOP
        IF NOT EXISTS (
          SELECT 1 FROM public.project_memberships pm
          WHERE pm.project_id = v_project_id AND pm.user_id = v_uid
        ) THEN
          INSERT INTO public.project_memberships (
            project_id, user_id, project_role_id, invitation_status, is_active, accepted_at, created_at
          )
          VALUES (v_project_id, v_uid, v_member_role_id, 'accepted', TRUE, NOW(), NOW());
        END IF;
        v_users := array_append(COALESCE(v_users, ARRAY[]::UUID[]), v_uid);
      END LOOP;
    ELSIF cardinality(COALESCE(v_users, ARRAY[]::UUID[])) < 10 THEN
      RAISE NOTICE 'v1534: only % project members available for team % (need 10)',
        cardinality(COALESCE(v_users, ARRAY[]::UUID[])), v_team.team_name;
    END IF;

    IF v_lead IS NOT NULL AND NOT (v_lead = ANY (v_users)) THEN
      v_users := array_prepend(v_lead, v_users);
    END IF;

    SELECT count(*)::INT INTO v_existing
    FROM public.team_members m
    WHERE m.team_id = v_team.id
      AND COALESCE(m.is_deleted, FALSE) = FALSE
      AND COALESCE(m.is_active, TRUE) = TRUE;

    v_need := GREATEST(0, 10 - v_existing);
    v_i := 0;
    FOREACH v_uid IN ARRAY v_users LOOP
      EXIT WHEN v_need <= 0;
      CONTINUE WHEN EXISTS (
        SELECT 1 FROM public.team_members m
        WHERE m.team_id = v_team.id AND m.user_id = v_uid
          AND COALESCE(m.is_deleted, FALSE) = FALSE
          AND COALESCE(m.is_active, TRUE) = TRUE
      );
      v_i := v_i + 1;
      v_role := v_roles[((v_i - 1) % cardinality(v_roles)) + 1];
      INSERT INTO public.team_members (
        team_id, user_id, member_role, allocation_percentage,
        allocation_start_date, allocation_end_date, member_comments,
        is_active, is_deleted, created_by
      ) VALUES (
        v_team.id,
        v_uid,
        v_role,
        CASE (v_i % 4) WHEN 1 THEN 100 WHEN 2 THEN 80 WHEN 3 THEN 60 ELSE 40 END,
        CURRENT_DATE - ((v_i - 1) * 3),
        CURRENT_DATE + (120 + v_i * 7),
        'Demo assignment for My Team sample data (v1534).',
        TRUE,
        FALSE,
        COALESCE(v_lead, v_uid)
      )
      ON CONFLICT (team_id, user_id) DO UPDATE SET
        member_role = EXCLUDED.member_role,
        allocation_percentage = EXCLUDED.allocation_percentage,
        allocation_start_date = EXCLUDED.allocation_start_date,
        allocation_end_date = EXCLUDED.allocation_end_date,
        member_comments = COALESCE(public.team_members.member_comments, EXCLUDED.member_comments),
        is_active = TRUE,
        is_deleted = FALSE,
        left_at = NULL,
        updated_at = NOW();
      v_need := v_need - 1;
    END LOOP;

    RAISE NOTICE 'v1534: team % (%) topped up', v_team.team_name, v_team.id;
  END LOOP;
END $$;
