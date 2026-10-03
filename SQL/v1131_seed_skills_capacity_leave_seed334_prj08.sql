-- =============================================================================
-- v1131: Seed Skill Matrix / Capacity Planning / Leave Calendar data for
--        SEED334-PRJ-08 ONLY ("Velocity Freight - Dynamic Route Optimization Pilot")
-- (This file was originally written as v1126, renamed to v1131 to resolve a filename
-- collision with unrelated concurrent work — content unchanged.)
-- Purpose: Populate the three Teams-page tabs built in v1109, for demo purposes.
-- Prerequisites: v334 (SEED334 project), v1079 (seeded teams/members), v643/v644 (tables),
--   v1129 (RLS fix) recommended first so the seeded rows are actually visible to the team.
-- Idempotent: catalog rows keyed by (account_id, skill_name)/(account_id, category_name);
--   member_skills/capacity/leave keyed by their own unique constraints where present, otherwise
--   guarded by a NOT EXISTS check.
-- No other projects are seeded. Uses the SAME team-member resolution as v1079 (project_memberships
-- for SEED334-PRJ-08), converted to auth_user_id since member_skills/workload_* key off
-- auth.users(id) directly, not public.users(id).
-- =============================================================================

DO $$
DECLARE
  v_project_id    UUID;
  v_project_code  TEXT := 'SEED334-PRJ-08';
  v_account_id    UUID;
  v_lead_id       UUID;       -- public.users.id
  v_lead_auth_id  UUID;       -- auth.users.id — resolved from v_lead_id, for auth.users(id)-FK columns
  v_user_ids      UUID[];     -- public.users.id[]
  v_auth_ids      UUID[];     -- auth.users.id[], same order as v_user_ids
  v_cat_delivery  UUID;
  v_cat_technical UUID;
  v_skill_ids     UUID[];
  v_uid           UUID;
  v_auid          UUID;
  i               INTEGER;
BEGIN
  SELECT id, account_id INTO v_project_id, v_account_id
  FROM public.projects
  WHERE project_code = v_project_code
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'v1131: project % not found — run v334 first', v_project_code;
  END IF;
  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'v1131: project % has no account_id', v_project_code;
  END IF;

  SELECT owner_user_id INTO v_lead_id FROM public.projects WHERE id = v_project_id;
  IF v_lead_id IS NULL THEN
    SELECT pm.user_id INTO v_lead_id
    FROM public.project_memberships pm
    WHERE pm.project_id = v_project_id AND COALESCE(pm.is_active, TRUE) = TRUE
    ORDER BY pm.created_at NULLS LAST LIMIT 1;
  END IF;
  IF v_lead_id IS NULL THEN
    RAISE EXCEPTION 'v1131: no lead/user found for % — run v1079 first', v_project_code;
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

  -- Resolve auth_user_id for each (member_skills/workload_* key off auth.users(id))
  SELECT ARRAY(
    SELECT u.auth_user_id FROM public.users u
    WHERE u.id = ANY(v_user_ids) AND u.auth_user_id IS NOT NULL
  ) INTO v_auth_ids;

  IF v_auth_ids IS NULL OR cardinality(v_auth_ids) = 0 THEN
    RAISE EXCEPTION 'v1131: none of the resolved team members have a linked auth_user_id';
  END IF;

  -- created_by on workload_leave_calendar FKs to auth.users(id), not public.users(id) — v_lead_id
  -- itself must never be written to an auth.users(id)-FK column.
  SELECT auth_user_id INTO v_lead_auth_id FROM public.users WHERE id = v_lead_id;
  IF v_lead_auth_id IS NULL THEN
    v_lead_auth_id := v_auth_ids[1];
  END IF;

  -- ── Skill catalog (account-scoped reference data) ───────────────────────────
  INSERT INTO public.skill_categories (account_id, category_name, category_code, sort_order)
  VALUES (v_account_id, 'Delivery & Product', 'DELIVERY', 10)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_cat_delivery FROM public.skill_categories
  WHERE account_id = v_account_id AND category_name = 'Delivery & Product' LIMIT 1;

  INSERT INTO public.skill_categories (account_id, category_name, category_code, sort_order)
  VALUES (v_account_id, 'Technical', 'TECH', 20)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_cat_technical FROM public.skill_categories
  WHERE account_id = v_account_id AND category_name = 'Technical' LIMIT 1;

  INSERT INTO public.skill_catalog (account_id, category_id, skill_name, skill_code)
  VALUES
    (v_account_id, v_cat_technical, 'Python', 'PY'),
    (v_account_id, v_cat_technical, 'React', 'REACT'),
    (v_account_id, v_cat_technical, 'PostgreSQL', 'PGSQL'),
    (v_account_id, v_cat_technical, 'Kubernetes', 'K8S'),
    (v_account_id, v_cat_delivery, 'Stakeholder Management', 'STAKEHOLDER'),
    (v_account_id, v_cat_delivery, 'Roadmapping', 'ROADMAP')
  ON CONFLICT DO NOTHING;

  SELECT ARRAY(
    SELECT id FROM public.skill_catalog WHERE account_id = v_account_id ORDER BY skill_name LIMIT 6
  ) INTO v_skill_ids;

  -- ── member_skills: each team member gets 1-2 skills at varying competency ──
  FOR i IN 1 .. cardinality(v_auth_ids) LOOP
    v_auid := v_auth_ids[i];
    INSERT INTO public.member_skills (account_id, user_id, skill_id, competency_level, assessed_at, notes)
    VALUES (
      v_account_id,
      v_auid,
      v_skill_ids[((i - 1) % cardinality(v_skill_ids)) + 1],
      ((i % 5) + 1),
      CURRENT_DATE - (i * 10),
      'Seeded for SEED334-PRJ-08 demo'
    )
    ON CONFLICT (user_id, skill_id) DO UPDATE SET
      competency_level = EXCLUDED.competency_level,
      assessed_at = EXCLUDED.assessed_at,
      updated_at = NOW();

    IF cardinality(v_skill_ids) > 1 THEN
      INSERT INTO public.member_skills (account_id, user_id, skill_id, competency_level, assessed_at, notes)
      VALUES (
        v_account_id,
        v_auid,
        v_skill_ids[(i % cardinality(v_skill_ids)) + 1],
        (((i + 2) % 5) + 1),
        CURRENT_DATE - (i * 6),
        'Seeded for SEED334-PRJ-08 demo'
      )
      ON CONFLICT (user_id, skill_id) DO UPDATE SET
        competency_level = EXCLUDED.competency_level,
        assessed_at = EXCLUDED.assessed_at,
        updated_at = NOW();
    END IF;
  END LOOP;

  -- ── workload_capacity_settings: varied hours/day per member ─────────────────
  FOR i IN 1 .. cardinality(v_auth_ids) LOOP
    v_auid := v_auth_ids[i];
    IF NOT EXISTS (
      SELECT 1 FROM public.workload_capacity_settings
      WHERE user_id = v_auid AND project_id = v_project_id AND is_deleted = FALSE
    ) THEN
      INSERT INTO public.workload_capacity_settings (
        account_id, project_id, user_id, hours_per_day, hours_per_week, effective_from
      ) VALUES (
        v_account_id, v_project_id, v_auid,
        CASE (i % 3) WHEN 0 THEN 6 WHEN 1 THEN 8 ELSE 4 END,
        CASE (i % 3) WHEN 0 THEN 30 WHEN 1 THEN 40 ELSE 20 END,
        CURRENT_DATE - 14
      );
    END IF;
  END LOOP;

  -- ── workload_leave_calendar: one leave entry per member, varied types ───────
  FOR i IN 1 .. cardinality(v_auth_ids) LOOP
    v_auid := v_auth_ids[i];
    IF NOT EXISTS (
      SELECT 1 FROM public.workload_leave_calendar
      WHERE user_id = v_auid AND is_deleted = FALSE
        AND start_date = (CURRENT_DATE + (i * 7))
    ) THEN
      INSERT INTO public.workload_leave_calendar (
        account_id, user_id, leave_type, start_date, end_date, notes, created_by
      ) VALUES (
        v_account_id,
        v_auid,
        (ARRAY['annual_leave', 'public_holiday', 'sick_leave', 'training', 'other'])[((i - 1) % 5) + 1],
        CURRENT_DATE + (i * 7),
        CURRENT_DATE + (i * 7) + (CASE WHEN (i % 5) = 2 THEN 0 ELSE 2 END),
        'Seeded for SEED334-PRJ-08 demo',
        v_lead_auth_id
      );
    END IF;
  END LOOP;

  RAISE NOTICE 'v1131: seeded skills/capacity/leave for % team members on % (%)',
    cardinality(v_auth_ids), v_project_code, v_project_id;
END $$;

-- Verification (Results tab should show rows for SEED334-PRJ-08's team)
SELECT 'member_skills' AS source, count(*) AS rows
FROM public.member_skills ms
JOIN public.users u ON u.auth_user_id = ms.user_id
JOIN public.project_memberships pm ON pm.user_id = u.id
JOIN public.projects p ON p.id = pm.project_id
WHERE p.project_code = 'SEED334-PRJ-08'
UNION ALL
SELECT 'workload_capacity_settings', count(*)
FROM public.workload_capacity_settings wcs
JOIN public.projects p ON p.id = wcs.project_id
WHERE p.project_code = 'SEED334-PRJ-08'
UNION ALL
SELECT 'workload_leave_calendar', count(*)
FROM public.workload_leave_calendar wlc
JOIN public.users u ON u.auth_user_id = wlc.user_id
JOIN public.project_memberships pm ON pm.user_id = u.id
JOIN public.projects p ON p.id = pm.project_id
WHERE p.project_code = 'SEED334-PRJ-08';
