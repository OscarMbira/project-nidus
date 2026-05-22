-- =============================================================================
-- v605: Seed data for v592 — Decoupled Manager & Member Assignment
-- Plan: v592_Decoupled_Manager_Member_Assignment_Plan.md
--
-- Idempotent: safe to re-run. Does not insert dummy users.
-- Uses existing public.users (and auth.users for sim manager fields).
--
-- Prerequisites (at least one path):
--   • v334 — SEED334-PORT-* / SEED334-PROG-* / SEED334-PRJ-* (preferred)
--   • v305 — SEED-PORT-01 / SEED-PROG-01 (fallback when v334 not loaded)
--   • v384 — pm_max_concurrent_assignments system setting
--   • v592a/b/c RLS applied before testing assign/remove in UI
--
-- Platform seed pattern:
--   User A → portfolio_manager on SEED334-PORT-01 (and SEED-PORT-01 if present)
--   User B → programme_manager on SEED334-PROG-01 / SEED-PROG-01
--   User C → project_manager on programme-linked SEED334-PRJ-10..12
--
-- Simulator seed pattern (SEED592-* codes, owned by first user with auth link):
--   Practice portfolio + programme + 2 projects + active programme links
-- =============================================================================

DO $$
DECLARE
  v_portfolio_mgr_id UUID;
  v_programme_mgr_id UUID;
  v_project_mgr_id   UUID;
  v_auth_uid         UUID;
  v_pf1              UUID;
  v_pf2              UUID;
  v_prg1             UUID;
  v_prg2             UUID;
  v_pp1              UUID;
  v_pp2              UUID;
  v_has_v334         BOOLEAN := FALSE;
  v_has_v305         BOOLEAN := FALSE;
  v_user_count       INT;
BEGIN
  -- -------------------------------------------------------------------------
  -- Resolve up to three distinct platform users (prefer role holders)
  -- -------------------------------------------------------------------------
  SELECT u.id INTO v_portfolio_mgr_id
  FROM public.users u
  INNER JOIN public.user_roles ur ON ur.user_id = u.id AND COALESCE(ur.is_deleted, FALSE) = FALSE
  INNER JOIN public.roles r ON r.id = ur.role_id
    AND r.role_name IN ('portfolio_manager', 'Portfolio Manager')
    AND COALESCE(r.is_deleted, FALSE) = FALSE
  WHERE COALESCE(u.is_deleted, FALSE) = FALSE
  LIMIT 1;

  SELECT u.id INTO v_programme_mgr_id
  FROM public.users u
  INNER JOIN public.user_roles ur ON ur.user_id = u.id AND COALESCE(ur.is_deleted, FALSE) = FALSE
  INNER JOIN public.roles r ON r.id = ur.role_id
    AND r.role_name IN ('programme_manager', 'Programme Manager', 'pm_programme_manager')
    AND COALESCE(r.is_deleted, FALSE) = FALSE
  WHERE COALESCE(u.is_deleted, FALSE) = FALSE
    AND u.id IS DISTINCT FROM v_portfolio_mgr_id
  LIMIT 1;

  SELECT u.id INTO v_project_mgr_id
  FROM public.users u
  INNER JOIN public.user_roles ur ON ur.user_id = u.id AND COALESCE(ur.is_deleted, FALSE) = FALSE
  INNER JOIN public.roles r ON r.id = ur.role_id
    AND r.role_name IN ('project_manager', 'Project Manager')
    AND COALESCE(r.is_deleted, FALSE) = FALSE
  WHERE COALESCE(u.is_deleted, FALSE) = FALSE
    AND u.id IS DISTINCT FROM v_portfolio_mgr_id
    AND u.id IS DISTINCT FROM v_programme_mgr_id
  LIMIT 1;

  SELECT COUNT(*) INTO v_user_count
  FROM public.users u
  WHERE COALESCE(u.is_deleted, FALSE) = FALSE;

  IF v_user_count < 1 THEN
    RAISE NOTICE 'v605: No public.users — skipping platform manager assignment seed.';
  ELSE
    IF v_portfolio_mgr_id IS NULL THEN
      SELECT u.id INTO v_portfolio_mgr_id
      FROM public.users u
      WHERE COALESCE(u.is_deleted, FALSE) = FALSE
      ORDER BY u.created_at ASC NULLS LAST
      OFFSET 0 LIMIT 1;
    END IF;

    IF v_programme_mgr_id IS NULL THEN
      SELECT u.id INTO v_programme_mgr_id
      FROM public.users u
      WHERE COALESCE(u.is_deleted, FALSE) = FALSE
        AND u.id IS DISTINCT FROM v_portfolio_mgr_id
      ORDER BY u.created_at ASC NULLS LAST
      OFFSET 0 LIMIT 1;
    END IF;
    IF v_programme_mgr_id IS NULL THEN
      v_programme_mgr_id := v_portfolio_mgr_id;
    END IF;

    IF v_project_mgr_id IS NULL THEN
      SELECT u.id INTO v_project_mgr_id
      FROM public.users u
      WHERE COALESCE(u.is_deleted, FALSE) = FALSE
        AND u.id IS DISTINCT FROM v_portfolio_mgr_id
        AND u.id IS DISTINCT FROM v_programme_mgr_id
      ORDER BY u.created_at ASC NULLS LAST
      OFFSET 0 LIMIT 1;
    END IF;
    IF v_project_mgr_id IS NULL THEN
      v_project_mgr_id := v_portfolio_mgr_id;
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolio_code = 'SEED334-PORT-01' AND COALESCE(is_deleted, FALSE) = FALSE
    ) INTO v_has_v334;

    SELECT EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolio_code = 'SEED-PORT-01' AND COALESCE(is_deleted, FALSE) = FALSE
    ) INTO v_has_v305;

    IF NOT v_has_v334 AND NOT v_has_v305 THEN
      RAISE NOTICE 'v605: No SEED334 or v305 portfolios found — run v334 or v305 first. Platform manager seed skipped.';
    ELSE
      -- Portfolio managers (v334 + optional v305)
      IF v_has_v334 THEN
        UPDATE public.portfolios SET
          portfolio_manager_user_id = v_portfolio_mgr_id,
          updated_at = NOW()
        WHERE portfolio_code IN ('SEED334-PORT-01', 'SEED334-PORT-02', 'SEED334-PORT-03')
          AND COALESCE(is_deleted, FALSE) = FALSE;

        UPDATE public.programmes SET
          programme_manager_user_id = v_programme_mgr_id,
          updated_at = NOW()
        WHERE programme_code IN ('SEED334-PROG-01', 'SEED334-PROG-02')
          AND COALESCE(is_deleted, FALSE) = FALSE;

        UPDATE public.projects p SET
          project_manager_user_id = v_project_mgr_id,
          updated_at = NOW()
        FROM public.programme_projects pp
        INNER JOIN public.programmes prog ON prog.id = pp.programme_id
        WHERE pp.project_id = p.id
          AND COALESCE(pp.is_deleted, FALSE) = FALSE
          AND (pp.assignment_status = 'active' OR pp.assignment_status IS NULL)
          AND prog.programme_code = 'SEED334-PROG-01'
          AND COALESCE(prog.is_deleted, FALSE) = FALSE
          AND p.project_code IN ('SEED334-PRJ-10', 'SEED334-PRJ-11', 'SEED334-PRJ-12')
          AND COALESCE(p.is_deleted, FALSE) = FALSE;

        RAISE NOTICE 'v605: Platform SEED334 managers — portfolio %, programme %, sample projects %',
          v_portfolio_mgr_id, v_programme_mgr_id, v_project_mgr_id;
      END IF;

      IF v_has_v305 THEN
        UPDATE public.portfolios SET
          portfolio_manager_user_id = COALESCE(portfolio_manager_user_id, v_portfolio_mgr_id),
          updated_at = NOW()
        WHERE portfolio_code = 'SEED-PORT-01'
          AND COALESCE(is_deleted, FALSE) = FALSE;

        UPDATE public.programmes SET
          programme_manager_user_id = COALESCE(programme_manager_user_id, v_programme_mgr_id),
          updated_at = NOW()
        WHERE programme_code = 'SEED-PROG-01'
          AND COALESCE(is_deleted, FALSE) = FALSE;
      END IF;
    END IF;
  END IF;

  -- -------------------------------------------------------------------------
  -- Simulator: SEED592 practice hierarchy (auth.users for portfolio/programme mgr)
  -- -------------------------------------------------------------------------
  SELECT u.auth_user_id INTO v_auth_uid
  FROM public.users u
  INNER JOIN auth.users au ON au.id = u.auth_user_id
  WHERE COALESCE(u.is_deleted, FALSE) = FALSE
    AND u.auth_user_id IS NOT NULL
  ORDER BY u.created_at ASC NULLS LAST
  LIMIT 1;

  IF v_auth_uid IS NULL THEN
    RAISE NOTICE 'v605: No user with auth.users link — simulator SEED592 skipped.';
    RETURN;
  END IF;

  IF v_portfolio_mgr_id IS NULL THEN
    SELECT u.id INTO v_portfolio_mgr_id
    FROM public.users u
    WHERE u.auth_user_id = v_auth_uid
    LIMIT 1;
  END IF;

  INSERT INTO sim.practice_portfolios (
    portfolio_code, portfolio_name, portfolio_description,
    portfolio_type, portfolio_status, portfolio_manager_user_id,
    user_id, is_deleted
  )
  VALUES (
    'SEED592-PF-01',
    'SEED592 Practice Portfolio — Digital',
    'Simulator practice portfolio for v592 portfolio-manager assignment testing.',
    'strategic', 'active', v_auth_uid,
    v_auth_uid, FALSE
  )
  ON CONFLICT (portfolio_code) DO UPDATE SET
    portfolio_name = EXCLUDED.portfolio_name,
    portfolio_description = EXCLUDED.portfolio_description,
    portfolio_status = EXCLUDED.portfolio_status,
    portfolio_manager_user_id = EXCLUDED.portfolio_manager_user_id,
    user_id = EXCLUDED.user_id,
    is_deleted = FALSE,
    updated_at = NOW();

  INSERT INTO sim.practice_portfolios (
    portfolio_code, portfolio_name, portfolio_description,
    portfolio_type, portfolio_status, portfolio_manager_user_id,
    user_id, is_deleted
  )
  VALUES (
    'SEED592-PF-02',
    'SEED592 Practice Portfolio — Operations',
    'Second practice portfolio for scoped assignment lists.',
    'operational', 'active', v_auth_uid,
    v_auth_uid, FALSE
  )
  ON CONFLICT (portfolio_code) DO UPDATE SET
    portfolio_name = EXCLUDED.portfolio_name,
    portfolio_description = EXCLUDED.portfolio_description,
    portfolio_status = EXCLUDED.portfolio_status,
    portfolio_manager_user_id = EXCLUDED.portfolio_manager_user_id,
    user_id = EXCLUDED.user_id,
    is_deleted = FALSE,
    updated_at = NOW();

  SELECT id INTO v_pf1 FROM sim.practice_portfolios WHERE portfolio_code = 'SEED592-PF-01' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
  SELECT id INTO v_pf2 FROM sim.practice_portfolios WHERE portfolio_code = 'SEED592-PF-02' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;

  IF v_pf1 IS NOT NULL THEN
    INSERT INTO sim.practice_programmes (
      programme_code, programme_name, programme_description,
      programme_type, programme_status, practice_portfolio_id,
      programme_manager_user_id, user_id, is_deleted
    )
    VALUES (
      'SEED592-PRG-01',
      'SEED592 Practice Programme — Customer',
      'Programme under SEED592-PF-01 for programme-manager assignment testing.',
      'technology', 'active', v_pf1,
      v_auth_uid, v_auth_uid, FALSE
    )
    ON CONFLICT (programme_code) DO UPDATE SET
      programme_name = EXCLUDED.programme_name,
      programme_description = EXCLUDED.programme_description,
      practice_portfolio_id = EXCLUDED.practice_portfolio_id,
      programme_status = EXCLUDED.programme_status,
      programme_manager_user_id = EXCLUDED.programme_manager_user_id,
      user_id = EXCLUDED.user_id,
      is_deleted = FALSE,
      updated_at = NOW();
  END IF;

  IF v_pf2 IS NOT NULL THEN
    INSERT INTO sim.practice_programmes (
      programme_code, programme_name, programme_description,
      programme_type, programme_status, practice_portfolio_id,
      programme_manager_user_id, user_id, is_deleted
    )
    VALUES (
      'SEED592-PRG-02',
      'SEED592 Practice Programme — Infrastructure',
      'Programme under SEED592-PF-02.',
      'business_transformation', 'active', v_pf2,
      NULL, v_auth_uid, FALSE
    )
    ON CONFLICT (programme_code) DO UPDATE SET
      programme_name = EXCLUDED.programme_name,
      programme_description = EXCLUDED.programme_description,
      practice_portfolio_id = EXCLUDED.practice_portfolio_id,
      programme_status = EXCLUDED.programme_status,
      user_id = EXCLUDED.user_id,
      is_deleted = FALSE,
      updated_at = NOW();
  END IF;

  SELECT id INTO v_prg1 FROM sim.practice_programmes WHERE programme_code = 'SEED592-PRG-01' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
  SELECT id INTO v_prg2 FROM sim.practice_programmes WHERE programme_code = 'SEED592-PRG-02' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;

  INSERT INTO sim.practice_projects (
    project_name, project_code, project_description, user_id, is_deleted
  )
  SELECT
    'SEED592 Practice Project Alpha',
    'SEED592-PP-01',
    'Practice project linked to SEED592-PRG-01 for project-manager assignment testing.',
    v_auth_uid,
    FALSE
  WHERE NOT EXISTS (
    SELECT 1 FROM sim.practice_projects
    WHERE project_code = 'SEED592-PP-01' AND COALESCE(is_deleted, FALSE) = FALSE
  );

  INSERT INTO sim.practice_projects (
    project_name, project_code, project_description, user_id, is_deleted
  )
  SELECT
    'SEED592 Practice Project Beta',
    'SEED592-PP-02',
    'Practice project linked to SEED592-PRG-01.',
    v_auth_uid,
    FALSE
  WHERE NOT EXISTS (
    SELECT 1 FROM sim.practice_projects
    WHERE project_code = 'SEED592-PP-02' AND COALESCE(is_deleted, FALSE) = FALSE
  );

  SELECT id INTO v_pp1 FROM sim.practice_projects WHERE project_code = 'SEED592-PP-01' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
  SELECT id INTO v_pp2 FROM sim.practice_projects WHERE project_code = 'SEED592-PP-02' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;

  IF v_pp1 IS NOT NULL AND v_portfolio_mgr_id IS NOT NULL THEN
    UPDATE sim.practice_projects SET
      project_manager_user_id = v_portfolio_mgr_id,
      updated_at = NOW()
    WHERE id = v_pp1 AND COALESCE(is_deleted, FALSE) = FALSE;
  END IF;

  IF v_prg1 IS NOT NULL AND v_pp1 IS NOT NULL THEN
    INSERT INTO sim.practice_programme_projects (
      practice_programme_id, practice_project_id, assignment_status
    )
    VALUES (v_prg1, v_pp1, 'active')
    ON CONFLICT (practice_programme_id, practice_project_id) DO UPDATE SET
      assignment_status = 'active',
      updated_at = NOW();
  END IF;

  IF v_prg1 IS NOT NULL AND v_pp2 IS NOT NULL THEN
    INSERT INTO sim.practice_programme_projects (
      practice_programme_id, practice_project_id, assignment_status
    )
    VALUES (v_prg1, v_pp2, 'active')
    ON CONFLICT (practice_programme_id, practice_project_id) DO UPDATE SET
      assignment_status = 'active',
      updated_at = NOW();
  END IF;

  RAISE NOTICE 'v605: Simulator SEED592 complete for auth user % (PF-01/02, PRG-01/02, PP-01/02).', v_auth_uid;
END $$;
