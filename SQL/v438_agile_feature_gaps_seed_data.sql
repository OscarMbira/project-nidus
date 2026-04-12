-- ============================================================================
-- v438: Agile feature gaps (v350) — logical seed data (Platform + Simulator)
-- Prerequisites: v433–v437 applied; ≥1 public.projects, ≥1 public.users;
--   optional: user_stories, kanban_boards (for links and CoS demo).
-- Idempotent: removes rows tagged AGILE-SEED-v438 / SEED v438 / seed_ref v438 — then re-inserts.
-- Inserts DoD/DoR templates only when no active template exists for that type (won’t overwrite custom templates).
-- PostgreSQL 15+ (Supabase)
-- ============================================================================

DO $$
DECLARE
  v_project_id UUID;
  v_u1 UUID;
  v_u2 UUID;
  v_board_id UUID;
  v_story1 UUID;
  v_story2 UUID;
  v_release_id UUID;
  v_journey_id UUID;
  v_activity_id UUID;
  v_meeting_id UUID;
  v_pp_id UUID;
  v_sim_u1 UUID;
  v_sim_u2 UUID;
  v_sim_meeting_id UUID;
  v_dod_json JSONB := '[
      {"order":0,"text":"Unit tests pass in CI","is_required":true,"seed_ref":"v438"},
      {"order":1,"text":"Code reviewed and approved","is_required":true,"seed_ref":"v438"},
      {"order":2,"text":"Acceptance criteria verified","is_required":true,"seed_ref":"v438"}
    ]'::jsonb;
  v_dor_json JSONB := '[
      {"order":0,"text":"Story has clear acceptance criteria","is_required":true,"seed_ref":"v438"},
      {"order":1,"text":"Dependencies resolved or flagged","is_required":true,"seed_ref":"v438"},
      {"order":2,"text":"Sized and ordered in backlog","is_required":false,"seed_ref":"v438"}
    ]'::jsonb;
BEGIN
  SELECT id INTO v_project_id
  FROM public.projects
  WHERE COALESCE(is_deleted, FALSE) = FALSE
  ORDER BY created_at ASC NULLS LAST
  LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE NOTICE 'v438: No public.projects row — agile seed skipped.';
    RETURN;
  END IF;

  SELECT id INTO v_u1 FROM public.users WHERE COALESCE(is_deleted, FALSE) = FALSE ORDER BY created_at ASC NULLS LAST LIMIT 1;
  SELECT id INTO v_u2 FROM public.users WHERE COALESCE(is_deleted, FALSE) = FALSE AND id <> v_u1 ORDER BY created_at ASC NULLS LAST LIMIT 1;
  IF v_u2 IS NULL THEN v_u2 := v_u1; END IF;

  SELECT id INTO v_board_id
  FROM public.kanban_boards
  WHERE project_id = v_project_id AND COALESCE(is_deleted, FALSE) = FALSE
  ORDER BY created_at ASC NULLS LAST
  LIMIT 1;

  SELECT id INTO v_story1 FROM public.user_stories
  WHERE project_id = v_project_id AND COALESCE(is_deleted, FALSE) = FALSE
  ORDER BY created_at ASC NULLS LAST LIMIT 1;
  SELECT id INTO v_story2 FROM public.user_stories
  WHERE project_id = v_project_id AND COALESCE(is_deleted, FALSE) = FALSE AND id IS DISTINCT FROM v_story1
  ORDER BY created_at ASC NULLS LAST LIMIT 1;

  -- -------------------------------------------------------------------------
  -- Cleanup previous v438 seed (public)
  -- -------------------------------------------------------------------------
  DELETE FROM public.sos_team_updates
  WHERE meeting_id IN (
    SELECT id FROM public.scrum_of_scrums_meetings WHERE notes = 'AGILE-SEED-v438' AND project_id = v_project_id
  );
  DELETE FROM public.scrum_of_scrums_meetings WHERE notes = 'AGILE-SEED-v438' AND project_id = v_project_id;

  DELETE FROM public.release_stories
  WHERE release_id IN (
    SELECT id FROM public.agile_releases WHERE release_goal = 'AGILE-SEED-v438' AND project_id = v_project_id
  );
  DELETE FROM public.agile_releases WHERE release_goal = 'AGILE-SEED-v438' AND project_id = v_project_id;

  DELETE FROM public.xp_ci_builds WHERE notes = 'AGILE-SEED-v438' AND project_id = v_project_id;
  DELETE FROM public.xp_code_reviews WHERE feedback = 'AGILE-SEED-v438' AND project_id = v_project_id;
  DELETE FROM public.xp_pair_sessions WHERE notes = 'AGILE-SEED-v438' AND project_id = v_project_id;

  DELETE FROM public.lean_kaizen_items
  WHERE project_id = v_project_id AND title LIKE 'SEED v438 —%';
  DELETE FROM public.lean_value_stream_maps
  WHERE project_id = v_project_id AND map_name = 'SEED v438 — Order fulfilment (demo)';

  DELETE FROM public.story_map_items
  WHERE project_id = v_project_id AND title LIKE 'SEED v438 —%';

  DELETE FROM public.project_agile_templates
  WHERE project_id = v_project_id AND items::text LIKE '%"seed_ref":"v438"%';

  IF v_board_id IS NOT NULL THEN
    DELETE FROM public.kanban_classes_of_service
    WHERE board_id = v_board_id AND name LIKE 'SEED v438 %';
  END IF;

  -- -------------------------------------------------------------------------
  -- project_agile_templates: only insert seed if slot is free (won’t overwrite user templates)
  -- -------------------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM public.project_agile_templates
    WHERE project_id = v_project_id AND template_type = 'dod' AND COALESCE(is_deleted, FALSE) = FALSE
  ) THEN
    INSERT INTO public.project_agile_templates (
      project_id, template_type, items, auto_apply_to_new_stories, is_active, created_by_user_id, is_deleted
    )
    VALUES (v_project_id, 'dod', v_dod_json, FALSE, TRUE, v_u1, FALSE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.project_agile_templates
    WHERE project_id = v_project_id AND template_type = 'dor' AND COALESCE(is_deleted, FALSE) = FALSE
  ) THEN
    INSERT INTO public.project_agile_templates (
      project_id, template_type, items, auto_apply_to_new_stories, is_active, created_by_user_id, is_deleted
    )
    VALUES (v_project_id, 'dor', v_dor_json, TRUE, TRUE, v_u1, FALSE);
  END IF;

  -- -------------------------------------------------------------------------
  -- Story map
  -- -------------------------------------------------------------------------
  INSERT INTO public.story_map_items (
    project_id, item_type, parent_id, user_story_id, title, description, col_order, row_order, is_deleted
  )
  VALUES (
    v_project_id, 'journey', NULL, NULL,
    'SEED v438 — Shopper checkout',
    'Horizontal journey for demo story map',
    0, 0, FALSE
  )
  RETURNING id INTO v_journey_id;

  INSERT INTO public.story_map_items (
    project_id, item_type, parent_id, user_story_id, title, description, col_order, row_order, is_deleted
  )
  VALUES (
    v_project_id, 'activity', v_journey_id, NULL,
    'SEED v438 — Payment step',
    'Card validation and PSP handoff',
    1, 0, FALSE
  )
  RETURNING id INTO v_activity_id;

  INSERT INTO public.story_map_items (
    project_id, item_type, parent_id, user_story_id, title, description, col_order, row_order, is_deleted
  )
  VALUES (
    v_project_id, 'story', v_activity_id, v_story1,
    'SEED v438 — Pay with saved card',
    'Linked to first backlog story when present',
    1, 1, FALSE
  );

  -- -------------------------------------------------------------------------
  -- Release + story links
  -- -------------------------------------------------------------------------
  INSERT INTO public.agile_releases (
    project_id, release_name, release_version, target_date, release_status, release_goal, is_deleted
  )
  VALUES (
    v_project_id,
    'SEED v438 — Release 2026.06',
    '2026.06',
    (CURRENT_DATE + INTERVAL '90 days')::date,
    'planned',
    'AGILE-SEED-v438',
    FALSE
  )
  RETURNING id INTO v_release_id;

  IF v_story1 IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.release_stories WHERE release_id = v_release_id AND user_story_id = v_story1
  ) THEN
    INSERT INTO public.release_stories (release_id, user_story_id) VALUES (v_release_id, v_story1);
  END IF;
  IF v_story2 IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.release_stories WHERE release_id = v_release_id AND user_story_id = v_story2
  ) THEN
    INSERT INTO public.release_stories (release_id, user_story_id) VALUES (v_release_id, v_story2);
  END IF;

  -- -------------------------------------------------------------------------
  -- Kanban classes of service (definitions only; does not mutate existing cards)
  -- -------------------------------------------------------------------------
  IF v_board_id IS NOT NULL THEN
    INSERT INTO public.kanban_classes_of_service (
      board_id, name, policy, color, wip_limit, sort_order, is_deleted
    )
    VALUES
      (v_board_id, 'SEED v438 Expedite', 'Interrupt policy: one at a time; stakeholder approval required.', '#ef4444', 1, 0, FALSE),
      (v_board_id, 'SEED v438 Standard', 'Default class; FIFO within column.', '#64748b', NULL, 1, FALSE);
  END IF;

  -- -------------------------------------------------------------------------
  -- XP
  -- -------------------------------------------------------------------------
  INSERT INTO public.xp_pair_sessions (
    project_id, driver_user_id, navigator_user_id, session_date, duration_minutes, notes
  )
  VALUES (
    v_project_id, v_u1, v_u2, CURRENT_DATE - 1, 90,
    'AGILE-SEED-v438: Implemented checkout API slice + tests.'
  );

  INSERT INTO public.xp_code_reviews (
    project_id, reviewer_user_id, author_user_id, user_story_id, review_date, status, feedback
  )
  VALUES (
    v_project_id, v_u2, v_u1, v_story1, CURRENT_DATE - 2, 'approved', 'AGILE-SEED-v438'
  );

  INSERT INTO public.xp_ci_builds (
    project_id, build_number, branch, status, build_date, duration_seconds, pipeline_url, notes
  )
  VALUES (
    v_project_id, 'build-SEED-v438-001', 'main', 'passing', NOW() - INTERVAL '2 hours', 420,
    'https://example.com/ci/pipeline/seed-v438',
    'AGILE-SEED-v438'
  );

  -- -------------------------------------------------------------------------
  -- Lean
  -- -------------------------------------------------------------------------
  INSERT INTO public.lean_value_stream_maps (
    project_id, map_name, map_data, created_by_user_id, is_deleted
  )
  VALUES (
    v_project_id,
    'SEED v438 — Order fulfilment (demo)',
    jsonb_build_object(
      'nodes', jsonb_build_array(
        jsonb_build_object('id','n1','label','Order received','process_time_min',5,'wait_time_min',120,'x',40,'y',40),
        jsonb_build_object('id','n2','label','Pick & pack','process_time_min',45,'wait_time_min',30,'x',200,'y',40),
        jsonb_build_object('id','n3','label','Ship','process_time_min',15,'wait_time_min',1440,'x',360,'y',40)
      ),
      'edges', jsonb_build_array(
        jsonb_build_object('from','n1','to','n2'),
        jsonb_build_object('from','n2','to','n3')
      ),
      'metrics', jsonb_build_object(
        'lead_time_min', 1555,
        'process_time_min', 65,
        'flow_efficiency_pct', round((100.0 * 65.0 / 1555.0)::numeric, 1)
      ),
      'seed', 'v438'
    ),
    v_u1,
    FALSE
  );

  INSERT INTO public.lean_kaizen_items (
    project_id, title, waste_type, description, impact, status, is_deleted
  )
  VALUES (
    v_project_id,
    'SEED v438 — Reduce wait before QA',
    'waiting',
    'Batch smaller test packages; visualize queue age on board.',
    'high',
    'in_progress',
    FALSE
  );

  -- -------------------------------------------------------------------------
  -- Scrum of Scrums
  -- -------------------------------------------------------------------------
  INSERT INTO public.scrum_of_scrums_meetings (
    project_id, meeting_date, facilitator_user_id, notes
  )
  VALUES (
    v_project_id, CURRENT_DATE, v_u1, 'AGILE-SEED-v438'
  )
  RETURNING id INTO v_meeting_id;

  INSERT INTO public.sos_team_updates (
    meeting_id, team_name, accomplished, planned, impediments, needs_coordination
  )
  VALUES
    (v_meeting_id, 'Checkout squad', 'Shipped payment retry.', 'Dark-launch feature flag.', 'Waiting on legal copy.', TRUE),
    (v_meeting_id, 'Inventory squad', 'Reduced stockout alerts.', 'Connect to new supplier API.', 'None.', FALSE);

  -- -------------------------------------------------------------------------
  -- user_stories: DoR + TDD sample (first story only)
  -- -------------------------------------------------------------------------
  IF v_story1 IS NOT NULL THEN
    UPDATE public.user_stories
    SET
      definition_of_ready = ARRAY['Acceptance criteria agreed', 'Dependencies listed'],
      tdd_followed = TRUE
    WHERE id = v_story1;
  END IF;

  -- -------------------------------------------------------------------------
  -- Simulator (sim.*)
  -- -------------------------------------------------------------------------
  SELECT id INTO v_pp_id FROM sim.practice_projects
  WHERE COALESCE(is_deleted, FALSE) = FALSE
  ORDER BY created_at ASC NULLS LAST
  LIMIT 1;

  IF v_pp_id IS NULL THEN
    RAISE NOTICE 'v438: Platform agile seed applied for project %. No sim.practice_projects — simulator seed skipped.', v_project_id;
    RETURN;
  END IF;

  SELECT u.id INTO v_sim_u1
  FROM public.users u
  INNER JOIN sim.practice_projects pp ON pp.user_id = u.auth_user_id
  WHERE pp.id = v_pp_id AND COALESCE(u.is_deleted, FALSE) = FALSE
  LIMIT 1;
  IF v_sim_u1 IS NULL THEN
    v_sim_u1 := v_u1;
  END IF;
  v_sim_u2 := v_u2;

  DELETE FROM sim.sos_team_updates WHERE meeting_id IN (
    SELECT id FROM sim.scrum_of_scrums_meetings WHERE notes = 'AGILE-SEED-v438' AND practice_project_id = v_pp_id
  );
  DELETE FROM sim.scrum_of_scrums_meetings WHERE notes = 'AGILE-SEED-v438' AND practice_project_id = v_pp_id;

  DELETE FROM sim.release_stories WHERE release_id IN (
    SELECT id FROM sim.agile_releases WHERE release_goal = 'AGILE-SEED-v438' AND practice_project_id = v_pp_id
  );
  DELETE FROM sim.agile_releases WHERE release_goal = 'AGILE-SEED-v438' AND practice_project_id = v_pp_id;

  DELETE FROM sim.xp_ci_builds WHERE notes = 'AGILE-SEED-v438' AND practice_project_id = v_pp_id;
  DELETE FROM sim.xp_code_reviews WHERE feedback = 'AGILE-SEED-v438' AND practice_project_id = v_pp_id;
  DELETE FROM sim.xp_pair_sessions WHERE notes = 'AGILE-SEED-v438' AND practice_project_id = v_pp_id;

  DELETE FROM sim.lean_kaizen_items WHERE practice_project_id = v_pp_id AND title LIKE 'SEED v438 —%';
  DELETE FROM sim.lean_value_stream_maps WHERE practice_project_id = v_pp_id AND map_name = 'SEED v438 — Practice flow (sim)';
  DELETE FROM sim.story_map_items WHERE practice_project_id = v_pp_id AND title LIKE 'SEED v438 —%';
  DELETE FROM sim.project_agile_templates WHERE practice_project_id = v_pp_id AND items::text LIKE '%"seed_ref":"v438-sim"%';

  IF NOT EXISTS (
    SELECT 1 FROM sim.project_agile_templates
    WHERE practice_project_id = v_pp_id AND template_type = 'dod' AND COALESCE(is_deleted, FALSE) = FALSE
  ) THEN
    INSERT INTO sim.project_agile_templates (
      practice_project_id, template_type, items, auto_apply_to_new_stories, is_active, created_by_user_id, is_deleted
    )
    VALUES (
      v_pp_id,
      'dod',
      '[{"order":0,"text":"Simulator demo DoD","is_required":true,"seed_ref":"v438-sim"}]'::jsonb,
      FALSE,
      TRUE,
      v_sim_u1,
      FALSE
    );
  END IF;

  INSERT INTO sim.story_map_items (
    practice_project_id, item_type, parent_id, title, col_order, row_order, is_deleted
  )
  VALUES (
    v_pp_id, 'journey', NULL, 'SEED v438 — Practice journey', 0, 0, FALSE
  );

  INSERT INTO sim.agile_releases (
    practice_project_id, release_name, release_version, target_date, release_status, release_goal, is_deleted
  )
  VALUES (
    v_pp_id, 'SEED v438 — Sim milestone', 'sim.1', CURRENT_DATE + 30, 'planned', 'AGILE-SEED-v438', FALSE
  );

  INSERT INTO sim.xp_pair_sessions (
    practice_project_id, driver_user_id, navigator_user_id, session_date, duration_minutes, notes
  )
  VALUES (
    v_pp_id, v_sim_u1, v_sim_u2, CURRENT_DATE, 60, 'AGILE-SEED-v438'
  );

  INSERT INTO sim.xp_code_reviews (
    practice_project_id, reviewer_user_id, author_user_id, review_date, status, feedback
  )
  VALUES (
    v_pp_id, v_sim_u2, v_sim_u1, CURRENT_DATE - 1, 'pending', 'AGILE-SEED-v438'
  );

  INSERT INTO sim.xp_ci_builds (
    practice_project_id, build_number, branch, status, build_date, duration_seconds, notes
  )
  VALUES (
    v_pp_id, 'sim-build-v438', 'develop', 'passing', NOW(), 180, 'AGILE-SEED-v438'
  );

  INSERT INTO sim.lean_kaizen_items (
    practice_project_id, title, waste_type, description, impact, status, is_deleted
  )
  VALUES (
    v_pp_id,
    'SEED v438 — Simulator handoff clarity',
    'overprocessing',
    'Shorten practice scenario instructions.',
    'medium',
    'identified',
    FALSE
  );

  INSERT INTO sim.lean_value_stream_maps (
    practice_project_id, map_name, map_data, created_by_user_id, is_deleted
  )
  VALUES (
    v_pp_id,
    'SEED v438 — Practice flow (sim)',
    '{"nodes":[{"id":"a","label":"Learn","process_time_min":30,"wait_time_min":0}],"edges":[],"seed":"v438-sim"}'::jsonb,
    v_sim_u1,
    FALSE
  );

  INSERT INTO sim.scrum_of_scrums_meetings (
    practice_project_id, meeting_date, facilitator_user_id, notes
  )
  VALUES (v_pp_id, CURRENT_DATE, v_sim_u1, 'AGILE-SEED-v438')
  RETURNING id INTO v_sim_meeting_id;

  INSERT INTO sim.sos_team_updates (meeting_id, team_name, accomplished, planned, impediments, needs_coordination)
  VALUES (v_sim_meeting_id, 'Practice team A', 'Onboarded scenario.', 'Next module.', '', FALSE);

  RAISE NOTICE 'v438: Agile seed applied for project % and sim practice_project %', v_project_id, v_pp_id;
END $$;
