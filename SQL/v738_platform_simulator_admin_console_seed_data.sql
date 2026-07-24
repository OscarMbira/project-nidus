-- ============================================================================
-- v738: Platform & Simulator admin console demo seed data
-- PostgreSQL 15+ / Supabase (public + sim schemas)
-- Prerequisites: v696 foundation (optional), v734 simulator schema, v681 menus
-- Idempotent: fixed UUIDs + ON CONFLICT. Safe to re-run.
-- Run: pnpm run platform:seed-admin-console
-- ============================================================================

DO $$
DECLARE
  v_account_id   UUID;
  v_user_id      UUID;
  v_auth_user_id UUID;
  v_status_id    UUID;
  v_has_lb_type  BOOLEAN;
BEGIN
  -- ─── Resolve org + user ─────────────────────────────────────────────────
  SELECT id INTO v_account_id
  FROM public.accounts
  WHERE COALESCE(is_deleted, false) = false
  ORDER BY created_at
  LIMIT 1;

  SELECT u.id INTO v_user_id
  FROM public.users u
  WHERE COALESCE(u.is_deleted, false) = false
  ORDER BY u.created_at
  LIMIT 1;

  -- sim.certificates / leaderboard_entries FK auth.users(id), not public.users
  SELECT au.id INTO v_auth_user_id
  FROM auth.users au
  INNER JOIN public.users u
    ON u.auth_user_id = au.id
   AND COALESCE(u.is_deleted, false) = false
  ORDER BY u.created_at
  LIMIT 1;

  IF v_auth_user_id IS NULL THEN
    SELECT id INTO v_auth_user_id
    FROM auth.users
    ORDER BY created_at
    LIMIT 1;
  END IF;

  SELECT id INTO v_status_id
  FROM public.project_statuses
  WHERE COALESCE(is_deleted, false) = false
  ORDER BY COALESCE(status_order, 0), status_code NULLS LAST
  LIMIT 1;

  IF v_account_id IS NULL OR v_user_id IS NULL THEN
    RAISE NOTICE 'v738: No account/user found — skipping project seed. Run v696 foundation first.';
  ELSE
    -- ─── Demo platform projects ─────────────────────────────────────────────
    INSERT INTO public.projects (
      id, account_id, project_name, project_code, project_description,
      owner_user_id, project_manager_user_id, status_id,
      planned_start_date, planned_end_date, budget_amount,
      is_deleted, created_at, updated_at
    )
    VALUES
      (
        'e7380001-0001-4001-8001-000000000001'::uuid,
        v_account_id,
        'Admin Demo — Customer Portal Rebuild',
        'ADMSEED-PRJ-01',
        'Sample project for admin Platform > Projects overview.',
        v_user_id, v_user_id, v_status_id,
        CURRENT_DATE - INTERVAL '90 days',
        CURRENT_DATE + INTERVAL '180 days',
        850000.00,
        false, NOW() - INTERVAL '85 days', NOW()
      ),
      (
        'e7380001-0001-4001-8001-000000000002'::uuid,
        v_account_id,
        'Admin Demo — ERP Finance Cutover',
        'ADMSEED-PRJ-02',
        'Second demo project for portfolio reporting smoke tests.',
        v_user_id, v_user_id, v_status_id,
        CURRENT_DATE - INTERVAL '45 days',
        CURRENT_DATE + INTERVAL '120 days',
        1200000.00,
        false, NOW() - INTERVAL '40 days', NOW()
      ),
      (
        'e7380001-0001-4001-8001-000000000003'::uuid,
        v_account_id,
        'Admin Demo — Data Warehouse Modernisation',
        'ADMSEED-PRJ-03',
        'Third demo project linked to the first active organisation.',
        v_user_id, v_user_id, v_status_id,
        CURRENT_DATE - INTERVAL '14 days',
        CURRENT_DATE + INTERVAL '365 days',
        2100000.00,
        false, NOW() - INTERVAL '10 days', NOW()
      )
    ON CONFLICT (id) DO UPDATE SET
      project_name = EXCLUDED.project_name,
      project_description = EXCLUDED.project_description,
      status_id = EXCLUDED.status_id,
      budget_amount = EXCLUDED.budget_amount,
      is_deleted = false,
      updated_at = NOW();

    RAISE NOTICE 'v738: Upserted 3 ADMSEED platform projects.';
  END IF;

  -- ─── Activate v734 scenario templates for admin simulator pages ─────────
  UPDATE sim.scenarios
  SET is_active = true,
      updated_at = NOW()
  WHERE target_role IN (
    'project_manager', 'programme_manager', 'portfolio_manager',
    'pmo_analyst', 'project_coordinator'
  )
    AND COALESCE(is_active, false) = false;

  -- Dedicated active admin-demo scenarios (fixed IDs)
  INSERT INTO sim.scenarios (
    id, scenario_code, name, short_description, description,
    industry, methodology, difficulty_level, target_role,
    duration_minutes, estimated_time_display,
    is_premium, is_active, is_featured, sort_order, scenario_data
  )
  VALUES
    (
      'e7380002-0001-4001-8001-000000000001'::uuid,
      'ADMSEED-SCN-01',
      'Admin Demo — Sprint Recovery',
      'Recover a slipping agile delivery within two iterations.',
      'Practice backlog re-prioritisation and stakeholder comms as PM.',
      'Technology', 'agile', 'intermediate', 'project_manager',
      90, '90 min', false, true, true, 900,
      '{"seed":"v738","admin_demo":true}'::jsonb
    ),
    (
      'e7380002-0001-4001-8001-000000000002'::uuid,
      'ADMSEED-SCN-02',
      'Admin Demo — Programme Replan',
      'Rebalance tranches after a critical dependency failure.',
      'Programme-level dependency and benefits recovery exercise.',
      'Construction', 'structured', 'advanced', 'programme_manager',
      120, '2 hours', false, true, false, 910,
      '{"seed":"v738","admin_demo":true}'::jsonb
    )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = true,
    updated_at = NOW();

  RAISE NOTICE 'v738: Upserted admin-demo simulator scenarios.';

  -- ─── Simulator certificates (requires auth.users FK) ──────────────────────
  IF v_auth_user_id IS NOT NULL THEN
    INSERT INTO sim.certificates (
      id, user_id, certificate_type, certificate_name,
      certificate_number, verification_code,
      issue_date, score, grade, is_verified, created_at
    )
    VALUES
      (
        'e7380003-0001-4001-8001-000000000001'::uuid,
        v_auth_user_id,
        'role_mastery',
        'Project Manager Foundations — Demo',
        'ADMSEED-CERT-001',
        'ADMSEED-VERIFY-001',
        NOW() - INTERVAL '30 days',
        82, 'B+', true, NOW() - INTERVAL '30 days'
      ),
      (
        'e7380003-0001-4001-8001-000000000002'::uuid,
        v_auth_user_id,
        'module_completion',
        'PMO Governance Module — Demo',
        'ADMSEED-CERT-002',
        'ADMSEED-VERIFY-002',
        NOW() - INTERVAL '14 days',
        91, 'A', true, NOW() - INTERVAL '14 days'
      )
    ON CONFLICT (id) DO UPDATE SET
      certificate_name = EXCLUDED.certificate_name,
      score = EXCLUDED.score,
      is_verified = EXCLUDED.is_verified;

    RAISE NOTICE 'v738: Upserted admin-demo simulator certificates.';
  ELSE
    RAISE NOTICE 'v738: No auth user — skipping certificate seed.';
  END IF;

  -- ─── Leaderboard entries (supports v66 and v692 column layouts) ─────────
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'sim'
      AND table_name = 'leaderboard_entries'
      AND column_name = 'leaderboard_type'
  ) INTO v_has_lb_type;

  IF v_auth_user_id IS NOT NULL THEN
    IF v_has_lb_type THEN
      INSERT INTO sim.leaderboard_entries (
        id, user_id, leaderboard_type, category, score, rank,
        simulations_count, recorded_at, created_at
      )
      VALUES
        (
          'e7380004-0001-4001-8001-000000000001'::uuid,
          v_auth_user_id, 'global', NULL, 2450, 1, 12,
          NOW() - INTERVAL '1 day', NOW() - INTERVAL '7 days'
        ),
        (
          'e7380004-0001-4001-8001-000000000002'::uuid,
          v_auth_user_id, 'role', 'project_manager', 1980, 2, 8,
          NOW() - INTERVAL '1 day', NOW() - INTERVAL '7 days'
        )
      ON CONFLICT (id) DO UPDATE SET
        score = EXCLUDED.score,
        rank = EXCLUDED.rank,
        recorded_at = EXCLUDED.recorded_at;
    ELSE
      INSERT INTO sim.leaderboard_entries (
        id, user_id, display_name, period, total_points, rank,
        scenarios_completed, certificates_earned, is_deleted, created_at, updated_at
      )
      VALUES
        (
          'e7380004-0001-4001-8001-000000000001'::uuid,
          v_auth_user_id, 'Admin Demo Player', 'all_time', 2450, 1,
          12, 2, false, NOW() - INTERVAL '7 days', NOW()
        ),
        (
          'e7380004-0001-4001-8001-000000000002'::uuid,
          v_auth_user_id, 'Admin Demo PM', 'this_month', 1980, 2,
          8, 1, false, NOW() - INTERVAL '7 days', NOW()
        )
      ON CONFLICT (id) DO UPDATE SET
        total_points = EXCLUDED.total_points,
        rank = EXCLUDED.rank,
        updated_at = NOW();
    END IF;

    RAISE NOTICE 'v738: Upserted admin-demo leaderboard entries.';
  END IF;

  -- ─── Mirror menu markers (visible platform + simulator nav samples) ───────
  INSERT INTO public.menu_items (
    id, menu_code, menu_label, route_path, parent_menu_id, menu_level,
    sort_order, methodology, menu_icon,     is_active, is_visible, is_deleted, created_at, updated_at
  )
  VALUES
    (
      'e7380005-0001-4001-8001-000000000001'::uuid,
      'admseed-plat-dashboard',
      'Admin Seed — Platform Dashboard',
      '/app/dashboard',
      NULL, 1, 9990, 'universal', 'layout-dashboard',
      true, true, false, NOW(), NOW()
    ),
    (
      'e7380005-0001-4001-8001-000000000002'::uuid,
      'admseed-plat-projects',
      'Admin Seed — Projects Hub',
      '/app/projects',
      NULL, 1, 9991, 'universal', 'folder',
      true, true, false, NOW(), NOW()
    ),
    (
      'e7380005-0001-4001-8001-000000000003'::uuid,
      'admseed-sim-scenarios',
      'Admin Seed — Simulator Scenarios',
      '/simulator/scenarios',
      NULL, 1, 9990, 'universal', 'play',
      true, true, false, NOW(), NOW()
    ),
    (
      'e7380005-0001-4001-8001-000000000004'::uuid,
      'admseed-sim-leaderboard',
      'Admin Seed — Simulator Leaderboard',
      '/simulator/leaderboard',
      NULL, 1, 9991, 'universal', 'trophy',
      true, true, false, NOW(), NOW()
    )
  ON CONFLICT (id) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    route_path = EXCLUDED.route_path,
    methodology = EXCLUDED.methodology,
    is_active = true,
    is_visible = true,
    is_deleted = false,
    updated_at = NOW();

  RAISE NOTICE 'v738: Upserted admin mirror menu marker rows.';
END $$;
