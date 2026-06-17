-- =============================================================================
-- v696: Seed Foundation – Demo project, registers & role-based user references
-- Purpose : Creates a single demo project ("Enterprise Digital Transformation")
--           that all subsequent seed files (v697–v704) attach data to.
--           Safe to re-run – uses ON CONFLICT DO NOTHING throughout.
-- Prerequisites: At least one account and one user with role pmo_admin must exist.
-- =============================================================================

-- ─── STEP 1: Resolve seed context ────────────────────────────────────────────
-- We pick the first active account and the first pmo_admin user.
-- All seed rows are tied to these resolved IDs.

DO $$
DECLARE
  v_account_id     UUID;
  v_pmo_user_id    UUID;
  v_pmo_auth_uid   UUID;   -- auth.users id for the pmo user (needed for trigger context)
  v_pm_user_id     UUID;
  v_project_id     UUID;
  v_risk_reg_id    UUID;
  v_issue_reg_id   UUID;
  v_lessons_log_id UUID;
BEGIN

  -- Resolve account
  SELECT id INTO v_account_id FROM public.accounts WHERE is_deleted = false LIMIT 1;
  IF v_account_id IS NULL THEN
    RAISE NOTICE 'v696: No account found – skipping seed.';
    RETURN;
  END IF;

  -- Resolve PMO Admin user
  SELECT u.id INTO v_pmo_user_id
  FROM public.users u
  JOIN public.user_roles ur ON ur.user_id = u.id
  JOIN public.roles r ON r.id = ur.role_id
  WHERE r.role_name = 'pmo_admin'
    AND ur.is_active = true
    AND COALESCE(u.is_deleted, false) = false
  LIMIT 1;

  IF v_pmo_user_id IS NULL THEN
    -- Fall back to any active user
    SELECT id INTO v_pmo_user_id FROM public.users WHERE COALESCE(is_deleted, false) = false LIMIT 1;
  END IF;

  IF v_pmo_user_id IS NULL THEN
    RAISE NOTICE 'v696: No user found – skipping seed.';
    RETURN;
  END IF;

  -- ─── Set auth.uid() context so BEFORE INSERT triggers can set created_by ───
  -- trigger_set_created_fields() always does NEW.created_by := auth.uid().
  -- When running as the postgres/service role in the SQL editor, auth.uid()
  -- returns NULL — violating the NOT NULL constraint on created_by.
  -- Setting request.jwt.claims makes auth.uid() return a real user ID.
  SELECT auth_user_id INTO v_pmo_auth_uid
  FROM public.users WHERE id = v_pmo_user_id;

  IF v_pmo_auth_uid IS NOT NULL THEN
    PERFORM set_config(
      'request.jwt.claims',
      json_build_object('sub', v_pmo_auth_uid::text)::text,
      true   -- local to this transaction
    );
    RAISE NOTICE 'v696: Auth context set to user % (auth_uid %).', v_pmo_user_id, v_pmo_auth_uid;
  ELSE
    RAISE NOTICE 'v696: Warning – no auth_user_id found for user %; created_by triggers may fail.', v_pmo_user_id;
  END IF;

  -- Resolve Project Manager user (different from PMO if possible)
  SELECT u.id INTO v_pm_user_id
  FROM public.users u
  JOIN public.user_roles ur ON ur.user_id = u.id
  JOIN public.roles r ON r.id = ur.role_id
  WHERE r.role_name = 'project_manager'
    AND ur.is_active = true
    AND COALESCE(u.is_deleted, false) = false
  LIMIT 1;

  IF v_pm_user_id IS NULL THEN
    v_pm_user_id := v_pmo_user_id;  -- fall back to PMO user
  END IF;

  -- ─── STEP 2: Create (or locate) the demo project ─────────────────────────

  SELECT id INTO v_project_id
  FROM public.projects
  WHERE project_code = 'EDP-2024'
    AND account_id   = v_account_id
    AND COALESCE(is_deleted, false) = false
  LIMIT 1;

  IF v_project_id IS NULL THEN
    INSERT INTO public.projects (
      id, account_id, project_name, project_code, project_description,
      owner_user_id, planned_start_date, planned_end_date,
      budget_amount, is_deleted, created_at, updated_at
    )
    VALUES (
      gen_random_uuid(), v_account_id,
      'Enterprise Digital Transformation',
      'EDP-2024',
      'Full-stack digital transformation programme covering ERP migration, customer portal rebuild, data warehouse modernisation, and mobile workforce enablement across all business units.',
      v_pmo_user_id,
      CURRENT_DATE - INTERVAL '6 months',
      CURRENT_DATE + INTERVAL '18 months',
      4500000.00,
      false, NOW(), NOW()
    )
    RETURNING id INTO v_project_id;
    RAISE NOTICE 'v696: Created demo project EDP-2024 (%).',  v_project_id;
  ELSE
    RAISE NOTICE 'v696: Using existing project EDP-2024 (%).', v_project_id;
  END IF;

  -- ─── STEP 3: Create risk register for project ────────────────────────────

  SELECT id INTO v_risk_reg_id
  FROM public.risk_registers
  WHERE project_id = v_project_id AND COALESCE(is_deleted, false) = false
  LIMIT 1;

  IF v_risk_reg_id IS NULL THEN
    INSERT INTO public.risk_registers (
      id, project_id,
      register_reference, version_number,
      is_active, is_deleted,
      created_by, created_at, updated_at
    )
    VALUES (
      gen_random_uuid(), v_project_id,
      'RR-EDP-2024-001', '1.0',
      true, false,
      v_pmo_user_id, NOW(), NOW()
    )
    RETURNING id INTO v_risk_reg_id;
    RAISE NOTICE 'v696: Created risk register (%).', v_risk_reg_id;
  END IF;

  -- ─── STEP 4: Create issue register for project ───────────────────────────

  SELECT id INTO v_issue_reg_id
  FROM public.issue_registers
  WHERE project_id = v_project_id AND COALESCE(is_deleted, false) = false
  LIMIT 1;

  IF v_issue_reg_id IS NULL THEN
    INSERT INTO public.issue_registers (
      id, project_id,
      register_reference, version_number,
      is_deleted,
      created_by, created_at, updated_at
    )
    VALUES (
      gen_random_uuid(), v_project_id,
      'IR-EDP-2024-001', '1.0',
      false,
      v_pmo_user_id, NOW(), NOW()
    )
    RETURNING id INTO v_issue_reg_id;
    RAISE NOTICE 'v696: Created issue register (%).', v_issue_reg_id;
  END IF;

  -- ─── STEP 5: Create lessons log for project ──────────────────────────────
  -- Table is lessons_logs (plural). Required NOT NULL: log_reference, author_id,
  -- owner_id, created_by. No log_title column exists.

  SELECT id INTO v_lessons_log_id
  FROM public.lessons_logs
  WHERE project_id = v_project_id AND COALESCE(is_deleted, false) = false
  LIMIT 1;

  IF v_lessons_log_id IS NULL THEN
    BEGIN
      INSERT INTO public.lessons_logs (
        id, project_id,
        log_reference, version_number,
        author_id, owner_id,
        is_deleted, created_by, created_at, updated_at
      )
      VALUES (
        gen_random_uuid(), v_project_id,
        'LL-EDP-2024-001', '1.0',
        v_pmo_user_id, v_pmo_user_id,
        false, v_pmo_user_id, NOW(), NOW()
      )
      RETURNING id INTO v_lessons_log_id;
      RAISE NOTICE 'v696: Created lessons log (%).', v_lessons_log_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'v696: lessons_logs insert skipped – %.', SQLERRM;
    END;
  END IF;

  RAISE NOTICE 'v696: Foundation complete. project=%, risk_reg=%, issue_reg=%',
    v_project_id, v_risk_reg_id, v_issue_reg_id;

END $$;

-- Register foundation tables if not yet tracked
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('risk_registers',  'Per-project risk register containers',      false, true),
  ('issue_registers', 'Per-project issue register containers',     false, true),
  ('lessons_log',     'Per-project lessons learned log container', false, true)
ON CONFLICT (table_name) DO NOTHING;
