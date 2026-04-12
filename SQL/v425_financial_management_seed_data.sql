-- ============================================================================
-- v425: Financial Management (v349) — logical seed data (≥20 rows per table)
-- Prerequisites: ≥1 active project, user, account. Financial tables v417–v421 applied as needed.
--   INSERT/SELECT counts use EXECUTE + to_regclass(): PostgreSQL validates INSERT targets at parse time;
--   a plain INSERT ... WHERE to_regclass() still errors if the table is missing.
-- If sim.practice_projects is empty, one bootstrap row is inserted (project_code FM-SEED-v425-PP).
-- Idempotent: deletes FM-SEED v425 rows then re-inserts
-- ============================================================================

DO $$
DECLARE
  pc INT; uc INT; ac INT;
BEGIN
  SELECT COUNT(*) INTO pc FROM public.projects WHERE COALESCE(is_deleted, FALSE) = FALSE;
  IF pc < 1 THEN RAISE EXCEPTION 'v425: Need at least one active public.projects row'; END IF;
  SELECT COUNT(*) INTO uc FROM public.users WHERE COALESCE(is_deleted, FALSE) = FALSE;
  IF uc < 1 THEN RAISE EXCEPTION 'v425: Need at least one public.users row'; END IF;
  SELECT COUNT(*) INTO ac FROM public.accounts WHERE COALESCE(is_deleted, FALSE) = FALSE;
  IF ac < 1 THEN RAISE EXCEPTION 'v425: Need at least one public.accounts row'; END IF;
END $$;

-- Simulator: ensure at least one practice project for sim.* financial seed (no manual step in empty DBs)
-- practice_projects.user_id FK targets auth.users(id), not public.users.id — use auth_user_id with a live auth row
INSERT INTO sim.practice_projects (project_name, project_code, user_id, project_description)
SELECT
  'FM-SEED v425 practice project',
  'FM-SEED-v425-PP',
  u.auth_user_id,
  'Auto-created by v425 financial seed because no active sim.practice_projects row existed.'
FROM public.users u
INNER JOIN auth.users au ON au.id = u.auth_user_id
WHERE COALESCE(u.is_deleted, FALSE) = FALSE
  AND u.auth_user_id IS NOT NULL
  AND (SELECT COUNT(*) FROM sim.practice_projects WHERE COALESCE(is_deleted, FALSE) = FALSE) = 0
ORDER BY u.created_at ASC NULLS LAST
LIMIT 1;

DO $$
DECLARE n INT;
BEGIN
  SELECT COUNT(*) INTO n FROM sim.practice_projects WHERE COALESCE(is_deleted, FALSE) = FALSE;
  IF n < 1 THEN
    RAISE EXCEPTION 'v425: No sim.practice_projects row. Bootstrap insert needs at least one public.users row with auth_user_id present in auth.users.';
  END IF;
END $$;

-- Clean previous seed (only tables that exist — apply v417–v421 before v425 for full coverage)
DO $$
BEGIN
  IF to_regclass('public.expense_approval_steps') IS NOT NULL AND to_regclass('public.project_expense_claims') IS NOT NULL THEN
    DELETE FROM public.expense_approval_steps s
    WHERE EXISTS (SELECT 1 FROM public.project_expense_claims c WHERE c.id = s.expense_claim_id AND c.description LIKE 'FM-SEED v425%');
  END IF;
  IF to_regclass('public.project_expense_claims') IS NOT NULL THEN
    DELETE FROM public.project_expense_claims WHERE description LIKE 'FM-SEED v425%';
  END IF;
  IF to_regclass('sim.expense_approval_steps') IS NOT NULL AND to_regclass('sim.project_expense_claims') IS NOT NULL THEN
    DELETE FROM sim.expense_approval_steps s
    WHERE EXISTS (SELECT 1 FROM sim.project_expense_claims c WHERE c.id = s.expense_claim_id AND c.description LIKE 'FM-SEED v425%');
  END IF;
  IF to_regclass('sim.project_expense_claims') IS NOT NULL THEN
    DELETE FROM sim.project_expense_claims WHERE description LIKE 'FM-SEED v425%';
  END IF;
  IF to_regclass('public.project_cost_entries') IS NOT NULL THEN
    DELETE FROM public.project_cost_entries WHERE description LIKE 'FM-SEED v425%';
  END IF;
  IF to_regclass('public.project_budget_baselines') IS NOT NULL THEN
    DELETE FROM public.project_budget_baselines WHERE baseline_name LIKE 'FM-SEED v425%';
  END IF;
  IF to_regclass('public.project_evm_snapshots') IS NOT NULL THEN
    DELETE FROM public.project_evm_snapshots WHERE notes LIKE 'FM-SEED v425%';
  END IF;
  IF to_regclass('public.project_revenue_entries') IS NOT NULL THEN
    DELETE FROM public.project_revenue_entries WHERE description LIKE 'FM-SEED v425%';
  END IF;
  IF to_regclass('public.expense_approval_thresholds') IS NOT NULL THEN
    DELETE FROM public.expense_approval_thresholds WHERE threshold_name LIKE 'FM-SEED v425%';
  END IF;
  IF to_regclass('sim.project_cost_entries') IS NOT NULL THEN
    DELETE FROM sim.project_cost_entries WHERE description LIKE 'FM-SEED v425%';
  END IF;
  IF to_regclass('sim.project_budget_baselines') IS NOT NULL THEN
    DELETE FROM sim.project_budget_baselines WHERE baseline_name LIKE 'FM-SEED v425%';
  END IF;
  IF to_regclass('sim.project_evm_snapshots') IS NOT NULL THEN
    DELETE FROM sim.project_evm_snapshots WHERE notes LIKE 'FM-SEED v425%';
  END IF;
  IF to_regclass('sim.project_revenue_entries') IS NOT NULL THEN
    DELETE FROM sim.project_revenue_entries WHERE description LIKE 'FM-SEED v425%';
  END IF;
  IF to_regclass('sim.expense_approval_thresholds') IS NOT NULL THEN
    DELETE FROM sim.expense_approval_thresholds WHERE threshold_name LIKE 'FM-SEED v425%';
  END IF;
END $$;

-- ========== PUBLIC ==========
-- INSERT targets are validated at parse time: use EXECUTE so missing tables (v417–v420) do not error.

DO $v425_wrap$
BEGIN
  IF to_regclass('public.project_cost_entries') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO public.project_cost_entries (
        project_id, entry_date, amount, currency, description, entered_by_user_id, approval_status
      )
      SELECT
        pu.id,
        (CURRENT_DATE - (g.i * 2))::DATE,
        (500 + g.i * 175.25)::NUMERIC(15, 2),
        'USD',
        'FM-SEED v425 cost line ' || g.i,
        uu.id,
        (ARRAY['recorded', 'recorded', 'pending', 'approved'])[1 + ((g.i - 1) % 4)]
      FROM generate_series(1, 22) AS g(i)
      CROSS JOIN LATERAL (
        SELECT id FROM public.projects WHERE COALESCE(is_deleted, FALSE) = FALSE ORDER BY created_at OFFSET ((g.i - 1) % (SELECT COUNT(*)::INT FROM public.projects WHERE COALESCE(is_deleted, FALSE) = FALSE)) LIMIT 1
      ) pu
      CROSS JOIN LATERAL (
        SELECT id FROM public.users WHERE COALESCE(is_deleted, FALSE) = FALSE ORDER BY created_at OFFSET ((g.i * 2) % (SELECT GREATEST(COUNT(*)::INT, 1) FROM public.users WHERE COALESCE(is_deleted, FALSE) = FALSE)) LIMIT 1
      ) uu
    $sql$;
  END IF;

  IF to_regclass('public.project_budget_baselines') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO public.project_budget_baselines (
        project_id, baseline_name, version_number, total_amount, categories_snapshot, is_locked, created_by_user_id
      )
      SELECT
        pu.id,
        'FM-SEED v425 baseline ' || g.i,
        1 + ((g.i - 1) / GREATEST(np.n, 1)),
        (100000 + g.i * 5000)::NUMERIC(18, 2),
        jsonb_build_array(
          jsonb_build_object('category_code', 'LAB', 'amount', 40000 + g.i * 100),
          jsonb_build_object('category_code', 'MAT', 'amount', 25000 + g.i * 50)
        ),
        (g.i % 3 = 0),
        (SELECT id FROM public.users WHERE COALESCE(is_deleted, FALSE) = FALSE ORDER BY created_at LIMIT 1)
      FROM generate_series(1, 22) AS g(i)
      CROSS JOIN (SELECT COUNT(*)::INT AS n FROM public.projects WHERE COALESCE(is_deleted, FALSE) = FALSE) np
      CROSS JOIN LATERAL (
        SELECT id FROM public.projects WHERE COALESCE(is_deleted, FALSE) = FALSE ORDER BY created_at
        OFFSET ((g.i - 1) % GREATEST(np.n, 1)) LIMIT 1
      ) pu
    $sql$;
  END IF;

  IF to_regclass('public.project_evm_snapshots') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO public.project_evm_snapshots (
        project_id, period_date, planned_value, earned_value, actual_cost, notes, created_by_user_id
      )
      SELECT
        pu.id,
        (DATE_TRUNC('month', CURRENT_DATE) - ((g.i - 1) || ' months')::INTERVAL)::DATE,
        (10000 + g.i * 100)::NUMERIC(18, 4),
        (9500 + g.i * 95)::NUMERIC(18, 4),
        (9800 + g.i * 110)::NUMERIC(18, 4),
        'FM-SEED v425 EVM ' || g.i,
        (SELECT id FROM public.users WHERE COALESCE(is_deleted, FALSE) = FALSE ORDER BY created_at LIMIT 1)
      FROM generate_series(1, 22) AS g(i)
      CROSS JOIN (SELECT COUNT(*)::INT AS n FROM public.projects WHERE COALESCE(is_deleted, FALSE) = FALSE) np
      CROSS JOIN LATERAL (
        SELECT id FROM public.projects WHERE COALESCE(is_deleted, FALSE) = FALSE ORDER BY created_at
        OFFSET ((g.i + 3) % GREATEST(np.n, 1)) LIMIT 1
      ) pu
    $sql$;
  END IF;

  IF to_regclass('public.project_revenue_entries') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO public.project_revenue_entries (
        project_id, revenue_date, amount, currency, revenue_type, description, is_confirmed
      )
      SELECT
        pu.id,
        (CURRENT_DATE - (g.i * 4))::DATE,
        (2000 + g.i * 320.5)::NUMERIC(15, 2),
        'USD',
        (ARRAY['contract_payment', 'milestone', 'retainer', 'grant', 'other'])[1 + ((g.i - 1) % 5)],
        'FM-SEED v425 revenue ' || g.i,
        (g.i % 2 = 0)
      FROM generate_series(1, 22) AS g(i)
      CROSS JOIN (SELECT COUNT(*)::INT AS n FROM public.projects WHERE COALESCE(is_deleted, FALSE) = FALSE) np
      CROSS JOIN LATERAL (
        SELECT id FROM public.projects WHERE COALESCE(is_deleted, FALSE) = FALSE ORDER BY created_at
        OFFSET ((g.i - 1) % GREATEST(np.n, 1)) LIMIT 1
      ) pu
    $sql$;
  END IF;

  IF to_regclass('public.expense_approval_thresholds') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO public.expense_approval_thresholds (
        account_id, threshold_name, min_amount, max_amount, required_approval_level, is_active
      )
      SELECT
        a.id,
        'FM-SEED v425 band ' || g.i,
        ((g.i - 1) * 5000)::NUMERIC(15, 2),
        CASE WHEN g.i < 22 THEN ((g.i * 5000) - 0.01)::NUMERIC(15, 2) ELSE NULL END,
        1 + ((g.i - 1) % 3),
        TRUE
      FROM generate_series(1, 22) AS g(i)
      CROSS JOIN LATERAL (
        SELECT id FROM public.accounts WHERE COALESCE(is_deleted, FALSE) = FALSE ORDER BY created_at
        OFFSET ((g.i - 1) % (SELECT GREATEST(COUNT(*)::INT, 1) FROM public.accounts WHERE COALESCE(is_deleted, FALSE) = FALSE)) LIMIT 1
      ) a
    $sql$;
  END IF;

  IF to_regclass('public.project_expense_claims') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO public.project_expense_claims (
        project_id, submitted_by_user_id, expense_type, expense_date, amount, currency,
        description, vendor_name, claim_status, current_approval_level, total_approval_levels,
        approval_chain, is_reimbursable
      )
      SELECT
        pu.id,
        uu.id,
        (ARRAY['travel', 'meals', 'vendor', 'equipment', 'training', 'other'])[1 + ((g.i - 1) % 6)],
        (CURRENT_DATE - g.i)::DATE,
        (150 + g.i * 45.75)::NUMERIC(15, 2),
        'USD',
        'FM-SEED v425 claim ' || g.i,
        'Vendor ' || ((g.i % 5) + 1),
        (ARRAY['draft', 'pending_l1', 'pending_l2', 'fully_approved', 'paid', 'rejected'])[1 + ((g.i - 1) % 6)],
        CASE WHEN g.i % 6 IN (1, 2) THEN 1 WHEN g.i % 6 = 3 THEN 2 ELSE NULL END,
        CASE WHEN g.i % 4 = 0 THEN 3 WHEN g.i % 4 = 1 THEN 2 ELSE 1 END,
        '[]'::JSONB,
        TRUE
      FROM generate_series(1, 22) AS g(i)
      CROSS JOIN (SELECT COUNT(*)::INT AS n FROM public.projects WHERE COALESCE(is_deleted, FALSE) = FALSE) np
      CROSS JOIN LATERAL (
        SELECT id FROM public.projects WHERE COALESCE(is_deleted, FALSE) = FALSE ORDER BY created_at
        OFFSET ((g.i - 1) % GREATEST(np.n, 1)) LIMIT 1
      ) pu
      CROSS JOIN LATERAL (
        SELECT id FROM public.users WHERE COALESCE(is_deleted, FALSE) = FALSE ORDER BY created_at
        OFFSET ((g.i * 3) % (SELECT GREATEST(COUNT(*)::INT, 1) FROM public.users WHERE COALESCE(is_deleted, FALSE) = FALSE)) LIMIT 1
      ) uu
    $sql$;
  END IF;

  IF to_regclass('public.expense_approval_steps') IS NOT NULL AND to_regclass('public.project_expense_claims') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO public.expense_approval_steps (
        expense_claim_id, approval_level, approver_user_id, approver_role_name, action, comments
      )
      SELECT
        c.id,
        1,
        uu.id,
        'project_manager',
        'approved',
        'FM-SEED v425 step ' || c.rn
      FROM (
        SELECT id, row_number() OVER (ORDER BY created_at) AS rn
        FROM public.project_expense_claims
        WHERE description LIKE 'FM-SEED v425%'
      ) c
      CROSS JOIN LATERAL (
        SELECT id FROM public.users WHERE COALESCE(is_deleted, FALSE) = FALSE ORDER BY created_at
        OFFSET ((c.rn + 1) % (SELECT GREATEST(COUNT(*)::INT, 1) FROM public.users WHERE COALESCE(is_deleted, FALSE) = FALSE)) LIMIT 1
      ) uu
      WHERE c.rn <= 22
    $sql$;
  END IF;
END
$v425_wrap$;

-- ========== SIM ==========

DO $v425_sim$
BEGIN
  IF to_regclass('sim.project_cost_entries') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO sim.project_cost_entries (
        practice_project_id, entry_date, amount, currency, description, entered_by_user_id, approval_status
      )
      SELECT
        pp.id,
        (CURRENT_DATE - (g.i * 2))::DATE,
        (400 + g.i * 150)::NUMERIC(15, 2),
        'USD',
        'FM-SEED v425 sim cost ' || g.i,
        uu.id,
        'recorded'
      FROM generate_series(1, 22) AS g(i)
      CROSS JOIN (SELECT COUNT(*)::INT AS n FROM sim.practice_projects WHERE COALESCE(is_deleted, FALSE) = FALSE) np
      CROSS JOIN LATERAL (
        SELECT id FROM sim.practice_projects WHERE COALESCE(is_deleted, FALSE) = FALSE ORDER BY created_at
        OFFSET ((g.i - 1) % GREATEST(np.n, 1)) LIMIT 1
      ) pp
      CROSS JOIN LATERAL (
        SELECT id FROM public.users WHERE COALESCE(is_deleted, FALSE) = FALSE ORDER BY created_at
        OFFSET ((g.i) % (SELECT GREATEST(COUNT(*)::INT, 1) FROM public.users WHERE COALESCE(is_deleted, FALSE) = FALSE)) LIMIT 1
      ) uu
    $sql$;
  END IF;

  IF to_regclass('sim.project_budget_baselines') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO sim.project_budget_baselines (
        practice_project_id, baseline_name, version_number, total_amount, categories_snapshot, is_locked, created_by_user_id
      )
      SELECT
        pp.id,
        'FM-SEED v425 sim baseline ' || g.i,
        1 + ((g.i - 1) / GREATEST(np.n, 1)),
        (80000 + g.i * 4000)::NUMERIC(18, 2),
        '[]'::JSONB,
        (g.i % 4 = 0),
        (SELECT id FROM public.users WHERE COALESCE(is_deleted, FALSE) = FALSE ORDER BY created_at LIMIT 1)
      FROM generate_series(1, 22) AS g(i)
      CROSS JOIN (SELECT COUNT(*)::INT AS n FROM sim.practice_projects WHERE COALESCE(is_deleted, FALSE) = FALSE) np
      CROSS JOIN LATERAL (
        SELECT id FROM sim.practice_projects WHERE COALESCE(is_deleted, FALSE) = FALSE ORDER BY created_at
        OFFSET ((g.i - 1) % GREATEST(np.n, 1)) LIMIT 1
      ) pp
    $sql$;
  END IF;

  IF to_regclass('sim.project_evm_snapshots') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO sim.project_evm_snapshots (
        practice_project_id, period_date, planned_value, earned_value, actual_cost, notes, created_by_user_id
      )
      SELECT
        pp.id,
        (DATE_TRUNC('month', CURRENT_DATE) - ((g.i - 1) || ' months')::INTERVAL)::DATE,
        (8000 + g.i * 80)::NUMERIC(18, 4),
        (7800 + g.i * 75)::NUMERIC(18, 4),
        (7900 + g.i * 82)::NUMERIC(18, 4),
        'FM-SEED v425 sim EVM ' || g.i,
        (SELECT id FROM public.users WHERE COALESCE(is_deleted, FALSE) = FALSE ORDER BY created_at LIMIT 1)
      FROM generate_series(1, 22) AS g(i)
      CROSS JOIN (SELECT COUNT(*)::INT AS n FROM sim.practice_projects WHERE COALESCE(is_deleted, FALSE) = FALSE) np
      CROSS JOIN LATERAL (
        SELECT id FROM sim.practice_projects WHERE COALESCE(is_deleted, FALSE) = FALSE ORDER BY created_at
        OFFSET ((g.i + 2) % GREATEST(np.n, 1)) LIMIT 1
      ) pp
    $sql$;
  END IF;

  IF to_regclass('sim.project_revenue_entries') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO sim.project_revenue_entries (
        practice_project_id, revenue_date, amount, currency, revenue_type, description, is_confirmed
      )
      SELECT
        pp.id,
        (CURRENT_DATE - (g.i * 3))::DATE,
        (1500 + g.i * 280)::NUMERIC(15, 2),
        'USD',
        'other',
        'FM-SEED v425 sim revenue ' || g.i,
        TRUE
      FROM generate_series(1, 22) AS g(i)
      CROSS JOIN (SELECT COUNT(*)::INT AS n FROM sim.practice_projects WHERE COALESCE(is_deleted, FALSE) = FALSE) np
      CROSS JOIN LATERAL (
        SELECT id FROM sim.practice_projects WHERE COALESCE(is_deleted, FALSE) = FALSE ORDER BY created_at
        OFFSET ((g.i - 1) % GREATEST(np.n, 1)) LIMIT 1
      ) pp
    $sql$;
  END IF;

  IF to_regclass('sim.expense_approval_thresholds') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO sim.expense_approval_thresholds (
        account_id, threshold_name, min_amount, max_amount, required_approval_level, is_active
      )
      SELECT
        a.id,
        'FM-SEED v425 sim band ' || g.i,
        ((g.i - 1) * 2500)::NUMERIC(15, 2),
        CASE WHEN g.i < 22 THEN ((g.i * 2500) - 0.01)::NUMERIC(15, 2) ELSE NULL END,
        1 + ((g.i - 1) % 3),
        TRUE
      FROM generate_series(1, 22) AS g(i)
      CROSS JOIN LATERAL (
        SELECT id FROM public.accounts WHERE COALESCE(is_deleted, FALSE) = FALSE ORDER BY created_at
        OFFSET ((g.i + 1) % (SELECT GREATEST(COUNT(*)::INT, 1) FROM public.accounts WHERE COALESCE(is_deleted, FALSE) = FALSE)) LIMIT 1
      ) a
    $sql$;
  END IF;

  IF to_regclass('sim.project_expense_claims') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO sim.project_expense_claims (
        practice_project_id, submitted_by_user_id, expense_date, amount, currency, description, claim_status,
        current_approval_level, total_approval_levels, approval_chain, is_deleted
      )
      SELECT
        pp.id,
        uu.id,
        (CURRENT_DATE - g.i)::DATE,
        (120 + g.i * 30)::NUMERIC(15, 2),
        'USD',
        'FM-SEED v425 sim claim ' || g.i,
        (ARRAY['draft', 'pending_l1', 'fully_approved', 'paid'])[1 + ((g.i - 1) % 4)],
        CASE WHEN g.i % 4 IN (0, 1) THEN 1 ELSE NULL END,
        CASE WHEN g.i % 3 = 0 THEN 2 ELSE 1 END,
        '[]'::JSONB,
        FALSE
      FROM generate_series(1, 22) AS g(i)
      CROSS JOIN (SELECT COUNT(*)::INT AS n FROM sim.practice_projects WHERE COALESCE(is_deleted, FALSE) = FALSE) np
      CROSS JOIN LATERAL (
        SELECT id FROM sim.practice_projects WHERE COALESCE(is_deleted, FALSE) = FALSE ORDER BY created_at
        OFFSET ((g.i - 1) % GREATEST(np.n, 1)) LIMIT 1
      ) pp
      CROSS JOIN LATERAL (
        SELECT id FROM public.users WHERE COALESCE(is_deleted, FALSE) = FALSE ORDER BY created_at
        OFFSET ((g.i * 5) % (SELECT GREATEST(COUNT(*)::INT, 1) FROM public.users WHERE COALESCE(is_deleted, FALSE) = FALSE)) LIMIT 1
      ) uu
    $sql$;
  END IF;

  IF to_regclass('sim.expense_approval_steps') IS NOT NULL AND to_regclass('sim.project_expense_claims') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO sim.expense_approval_steps (
        expense_claim_id, approval_level, approver_user_id, approver_role_name, action, comments
      )
      SELECT
        c.id,
        1,
        uu.id,
        'project_manager',
        'approved',
        'FM-SEED v425 sim step ' || c.rn
      FROM (
        SELECT id, row_number() OVER (ORDER BY created_at) AS rn
        FROM sim.project_expense_claims
        WHERE description LIKE 'FM-SEED v425%'
      ) c
      CROSS JOIN LATERAL (
        SELECT id FROM public.users WHERE COALESCE(is_deleted, FALSE) = FALSE ORDER BY created_at
        OFFSET ((c.rn + 2) % (SELECT GREATEST(COUNT(*)::INT, 1) FROM public.users WHERE COALESCE(is_deleted, FALSE) = FALSE)) LIMIT 1
      ) uu
      WHERE c.rn <= 22
    $sql$;
  END IF;
END
$v425_sim$;

-- Counts use EXECUTE so missing tables are not referenced at parse time
DO $$
DECLARE n INT;
BEGIN
  IF to_regclass('public.project_cost_entries') IS NOT NULL THEN
    EXECUTE $c$ SELECT COUNT(*)::INT FROM public.project_cost_entries WHERE description LIKE 'FM-SEED v425%' $c$ INTO n;
    RAISE NOTICE 'project_cost_entries FM-SEED v425: %', n;
  ELSE RAISE NOTICE 'project_cost_entries: table missing (apply v417)'; END IF;
  IF to_regclass('public.project_budget_baselines') IS NOT NULL THEN
    EXECUTE $c$ SELECT COUNT(*)::INT FROM public.project_budget_baselines WHERE baseline_name LIKE 'FM-SEED v425%' $c$ INTO n;
    RAISE NOTICE 'project_budget_baselines FM-SEED v425: %', n;
  ELSE RAISE NOTICE 'project_budget_baselines: table missing (apply v417)'; END IF;
  IF to_regclass('public.project_evm_snapshots') IS NOT NULL THEN
    EXECUTE $c$ SELECT COUNT(*)::INT FROM public.project_evm_snapshots WHERE notes LIKE 'FM-SEED v425%' $c$ INTO n;
    RAISE NOTICE 'project_evm_snapshots FM-SEED v425: %', n;
  ELSE RAISE NOTICE 'project_evm_snapshots: table missing (apply v418)'; END IF;
  IF to_regclass('public.project_revenue_entries') IS NOT NULL THEN
    EXECUTE $c$ SELECT COUNT(*)::INT FROM public.project_revenue_entries WHERE description LIKE 'FM-SEED v425%' $c$ INTO n;
    RAISE NOTICE 'project_revenue_entries FM-SEED v425: %', n;
  ELSE RAISE NOTICE 'project_revenue_entries: table missing (apply v419)'; END IF;
  IF to_regclass('public.expense_approval_thresholds') IS NOT NULL THEN
    EXECUTE $c$ SELECT COUNT(*)::INT FROM public.expense_approval_thresholds WHERE threshold_name LIKE 'FM-SEED v425%' $c$ INTO n;
    RAISE NOTICE 'expense_approval_thresholds FM-SEED v425: %', n;
  ELSE RAISE NOTICE 'expense_approval_thresholds: table missing (apply v420)'; END IF;
  IF to_regclass('public.project_expense_claims') IS NOT NULL THEN
    EXECUTE $c$ SELECT COUNT(*)::INT FROM public.project_expense_claims WHERE description LIKE 'FM-SEED v425%' $c$ INTO n;
    RAISE NOTICE 'project_expense_claims FM-SEED v425: %', n;
  ELSE RAISE NOTICE 'project_expense_claims: table missing (apply v420)'; END IF;
  IF to_regclass('public.expense_approval_steps') IS NOT NULL THEN
    EXECUTE $c$ SELECT COUNT(*)::INT FROM public.expense_approval_steps WHERE comments LIKE 'FM-SEED v425%' $c$ INTO n;
    RAISE NOTICE 'expense_approval_steps FM-SEED v425: %', n;
  ELSE RAISE NOTICE 'expense_approval_steps: table missing (apply v420)'; END IF;
  IF to_regclass('sim.project_cost_entries') IS NOT NULL THEN
    EXECUTE $c$ SELECT COUNT(*)::INT FROM sim.project_cost_entries WHERE description LIKE 'FM-SEED v425%' $c$ INTO n;
    RAISE NOTICE 'sim.project_cost_entries FM-SEED v425: %', n;
  ELSE RAISE NOTICE 'sim.project_cost_entries: table missing (apply v421)'; END IF;
  IF to_regclass('sim.project_budget_baselines') IS NOT NULL THEN
    EXECUTE $c$ SELECT COUNT(*)::INT FROM sim.project_budget_baselines WHERE baseline_name LIKE 'FM-SEED v425%' $c$ INTO n;
    RAISE NOTICE 'sim.project_budget_baselines FM-SEED v425: %', n;
  ELSE RAISE NOTICE 'sim.project_budget_baselines: table missing (apply v421)'; END IF;
  IF to_regclass('sim.project_evm_snapshots') IS NOT NULL THEN
    EXECUTE $c$ SELECT COUNT(*)::INT FROM sim.project_evm_snapshots WHERE notes LIKE 'FM-SEED v425%' $c$ INTO n;
    RAISE NOTICE 'sim.project_evm_snapshots FM-SEED v425: %', n;
  ELSE RAISE NOTICE 'sim.project_evm_snapshots: table missing (apply v421)'; END IF;
  IF to_regclass('sim.project_revenue_entries') IS NOT NULL THEN
    EXECUTE $c$ SELECT COUNT(*)::INT FROM sim.project_revenue_entries WHERE description LIKE 'FM-SEED v425%' $c$ INTO n;
    RAISE NOTICE 'sim.project_revenue_entries FM-SEED v425: %', n;
  ELSE RAISE NOTICE 'sim.project_revenue_entries: table missing (apply v421)'; END IF;
  IF to_regclass('sim.expense_approval_thresholds') IS NOT NULL THEN
    EXECUTE $c$ SELECT COUNT(*)::INT FROM sim.expense_approval_thresholds WHERE threshold_name LIKE 'FM-SEED v425%' $c$ INTO n;
    RAISE NOTICE 'sim.expense_approval_thresholds FM-SEED v425: %', n;
  ELSE RAISE NOTICE 'sim.expense_approval_thresholds: table missing (apply v421)'; END IF;
  IF to_regclass('sim.project_expense_claims') IS NOT NULL THEN
    EXECUTE $c$ SELECT COUNT(*)::INT FROM sim.project_expense_claims WHERE description LIKE 'FM-SEED v425%' $c$ INTO n;
    RAISE NOTICE 'sim.project_expense_claims FM-SEED v425: %', n;
  ELSE RAISE NOTICE 'sim.project_expense_claims: table missing (apply v421)'; END IF;
  IF to_regclass('sim.expense_approval_steps') IS NOT NULL THEN
    EXECUTE $c$ SELECT COUNT(*)::INT FROM sim.expense_approval_steps WHERE comments LIKE 'FM-SEED v425%' $c$ INTO n;
    RAISE NOTICE 'sim.expense_approval_steps FM-SEED v425: %', n;
  ELSE RAISE NOTICE 'sim.expense_approval_steps: table missing (apply v421)'; END IF;
END $$;
