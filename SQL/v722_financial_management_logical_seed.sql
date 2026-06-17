-- =============================================================================
-- v722: Financial Management — logical demo seed (Reporting & Intelligence)
-- Maps to sidebar: Financial Reports, Portfolio/Programme/Project EVM,
--                 Expense Approvals, Expense Thresholds
-- Prerequisites: v417–v420 (financial tables), v334 recommended (hierarchy)
-- Idempotent: deletes rows tagged FM-SEED v722 then re-inserts
-- =============================================================================

DO $$
DECLARE
  v_account_id   UUID;
  v_user_id      UUID;
  v_status_id    UUID;
  v_portfolio_id UUID;
  v_prog1_id     UUID;
  v_prog2_id     UUID;
  v_proj_id      UUID;
  v_code         TEXT;
  i              INT;
  m              INT;
  v_pv           NUMERIC(18, 4);
  v_ev           NUMERIC(18, 4);
  v_ac           NUMERIC(18, 4);
  v_months       INT := 6;
  -- project codes used when v334 hierarchy exists
  v_prog1_codes  TEXT[] := ARRAY['SEED334-PRJ-10','SEED334-PRJ-13','SEED334-PRJ-16','SEED334-PRJ-19','SEED334-PRJ-22'];
  v_prog2_codes  TEXT[] := ARRAY['SEED334-PRJ-11','SEED334-PRJ-14','SEED334-PRJ-17','SEED334-PRJ-20'];
  v_all_codes    TEXT[];
  v_has_v334     BOOLEAN := FALSE;
BEGIN
  SELECT a.id, COALESCE(a.owner_user_id, u.id)
  INTO v_account_id, v_user_id
  FROM public.accounts a
  LEFT JOIN LATERAL (
    SELECT id FROM public.users
    WHERE COALESCE(is_deleted, FALSE) = FALSE
    ORDER BY created_at ASC NULLS LAST
    LIMIT 1
  ) u ON TRUE
  WHERE COALESCE(a.is_deleted, FALSE) = FALSE
    AND COALESCE(a.is_active, TRUE) = TRUE
  ORDER BY a.created_at ASC NULLS LAST
  LIMIT 1;

  IF v_account_id IS NULL OR v_user_id IS NULL THEN
    RAISE NOTICE 'v722: No active account/user — skipping financial seed.';
    RETURN;
  END IF;

  SELECT ps.id INTO v_status_id
  FROM public.project_statuses ps
  WHERE COALESCE(ps.is_deleted, FALSE) = FALSE
  ORDER BY COALESCE(ps.status_order, 0), ps.status_code NULLS LAST
  LIMIT 1;

  SELECT EXISTS (
    SELECT 1 FROM public.portfolios
    WHERE portfolio_code = 'SEED334-PORT-01' AND COALESCE(is_deleted, FALSE) = FALSE
  ) INTO v_has_v334;

  -- -------------------------------------------------------------------------
  -- Clean prior v722 seed
  -- -------------------------------------------------------------------------
  IF to_regclass('public.expense_approval_steps') IS NOT NULL THEN
    DELETE FROM public.expense_approval_steps s
    WHERE EXISTS (
      SELECT 1 FROM public.project_expense_claims c
      WHERE c.id = s.expense_claim_id AND c.description LIKE 'FM-SEED v722%'
    );
  END IF;
  IF to_regclass('public.project_expense_claims') IS NOT NULL THEN
    DELETE FROM public.project_expense_claims WHERE description LIKE 'FM-SEED v722%';
  END IF;
  IF to_regclass('public.expense_approval_thresholds') IS NOT NULL THEN
    DELETE FROM public.expense_approval_thresholds WHERE threshold_name LIKE 'FM-SEED v722%';
  END IF;
  IF to_regclass('public.project_cost_entries') IS NOT NULL THEN
    DELETE FROM public.project_cost_entries WHERE description LIKE 'FM-SEED v722%';
  END IF;
  IF to_regclass('public.project_budget_baselines') IS NOT NULL THEN
    DELETE FROM public.project_budget_baselines WHERE baseline_name LIKE 'FM-SEED v722%';
  END IF;
  IF to_regclass('public.project_revenue_entries') IS NOT NULL THEN
    DELETE FROM public.project_revenue_entries WHERE description LIKE 'FM-SEED v722%';
  END IF;
  IF to_regclass('public.project_evm_snapshots') IS NOT NULL THEN
    DELETE FROM public.project_evm_snapshots WHERE notes LIKE 'FM-SEED v722%';
  END IF;

  -- -------------------------------------------------------------------------
  -- Bootstrap minimal hierarchy when v334 is absent
  -- -------------------------------------------------------------------------
  IF NOT v_has_v334 THEN
    INSERT INTO public.portfolios (
      portfolio_code, portfolio_name, portfolio_description,
      portfolio_type, portfolio_status, portfolio_level, is_deleted
    )
    VALUES (
      'FM-v722-PORT', 'Enterprise Digital Portfolio',
      'Demo portfolio for Financial Management seed — ERP, payments, and customer channels.',
      'strategic', 'active', 1, FALSE
    )
    ON CONFLICT (portfolio_code) DO UPDATE SET
      portfolio_name = EXCLUDED.portfolio_name,
      portfolio_description = EXCLUDED.portfolio_description,
      is_deleted = FALSE;

    SELECT id INTO v_portfolio_id
    FROM public.portfolios
    WHERE portfolio_code = 'FM-v722-PORT' AND COALESCE(is_deleted, FALSE) = FALSE
    LIMIT 1;

    INSERT INTO public.programmes (
      programme_code, programme_name, programme_description,
      programme_type, programme_status, portfolio_id, is_deleted
    )
    VALUES
      (
        'FM-v722-PROG-01', 'Core Platform Modernisation',
        'Finance module cutover, API gateway, and shared services under Enterprise Digital Portfolio.',
        'technology', 'active', v_portfolio_id, FALSE
      ),
      (
        'FM-v722-PROG-02', 'Customer Experience & Payments',
        'Mobile apps, loyalty, and PCI remediation streams.',
        'business_transformation', 'active', v_portfolio_id, FALSE
      )
    ON CONFLICT (programme_code) DO UPDATE SET
      programme_name = EXCLUDED.programme_name,
      programme_description = EXCLUDED.programme_description,
      portfolio_id = EXCLUDED.portfolio_id,
      is_deleted = FALSE;

    SELECT id INTO v_prog1_id FROM public.programmes WHERE programme_code = 'FM-v722-PROG-01' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
    SELECT id INTO v_prog2_id FROM public.programmes WHERE programme_code = 'FM-v722-PROG-02' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;

    FOR i IN 1..4 LOOP
      v_code := 'FM-v722-PRJ-' || LPAD(i::TEXT, 2, '0');
      INSERT INTO public.projects (
        project_code, project_name, project_description,
        account_id, owner_user_id, status_id, is_deleted
      )
      VALUES (
        v_code,
        (ARRAY[
          'Summit ERP - Finance Module Cutover',
          'Nexus Platform - API Gateway',
          'Aurora Mobile - Field Technician App',
          'Meridian Payments - PCI Remediation'
        ])[i],
        'FM-SEED v722 demo project for financial roll-ups and EVM reporting.',
        v_account_id,
        v_user_id,
        v_status_id,
        FALSE
      )
      ON CONFLICT (project_code) DO UPDATE SET
        project_name = EXCLUDED.project_name,
        project_description = EXCLUDED.project_description,
        account_id = EXCLUDED.account_id,
        owner_user_id = EXCLUDED.owner_user_id,
        is_deleted = FALSE;

      SELECT id INTO v_proj_id FROM public.projects WHERE project_code = v_code AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
      IF v_proj_id IS NULL THEN CONTINUE; END IF;

      IF v_portfolio_id IS NOT NULL THEN
        INSERT INTO public.portfolio_projects (portfolio_id, project_id, assignment_status, portfolio_priority, is_deleted)
        SELECT v_portfolio_id, v_proj_id, 'active', 'high', FALSE
        WHERE NOT EXISTS (
          SELECT 1 FROM public.portfolio_projects pp
          WHERE pp.portfolio_id = v_portfolio_id AND pp.project_id = v_proj_id AND COALESCE(pp.is_deleted, FALSE) = FALSE
        );
      END IF;

      IF i <= 2 AND v_prog1_id IS NOT NULL THEN
        INSERT INTO public.programme_projects (programme_id, project_id, assignment_status, programme_priority, is_deleted)
        SELECT v_prog1_id, v_proj_id, 'active', 'high', FALSE
        WHERE NOT EXISTS (
          SELECT 1 FROM public.programme_projects pp
          WHERE pp.programme_id = v_prog1_id AND pp.project_id = v_proj_id AND COALESCE(pp.is_deleted, FALSE) = FALSE
        );
      ELSIF v_prog2_id IS NOT NULL THEN
        INSERT INTO public.programme_projects (programme_id, project_id, assignment_status, programme_priority, is_deleted)
        SELECT v_prog2_id, v_proj_id, 'active', 'high', FALSE
        WHERE NOT EXISTS (
          SELECT 1 FROM public.programme_projects pp
          WHERE pp.programme_id = v_prog2_id AND pp.project_id = v_proj_id AND COALESCE(pp.is_deleted, FALSE) = FALSE
        );
      END IF;

      INSERT INTO public.user_projects (user_id, project_id, project_role, access_level, is_active, is_deleted)
      SELECT v_user_id, v_proj_id, 'Project Manager', 'member', TRUE, FALSE
      WHERE NOT EXISTS (
        SELECT 1 FROM public.user_projects up
        WHERE up.user_id = v_user_id AND up.project_id = v_proj_id AND COALESCE(up.is_deleted, FALSE) = FALSE
      );
    END LOOP;

    v_all_codes := ARRAY['FM-v722-PRJ-01','FM-v722-PRJ-02','FM-v722-PRJ-03','FM-v722-PRJ-04'];
    v_prog1_codes := ARRAY['FM-v722-PRJ-01','FM-v722-PRJ-02'];
    v_prog2_codes := ARRAY['FM-v722-PRJ-03','FM-v722-PRJ-04'];
  ELSE
    v_all_codes := v_prog1_codes || v_prog2_codes;
  END IF;

  -- -------------------------------------------------------------------------
  -- 1. Financial Reports — costs, revenue, budget baselines
  -- -------------------------------------------------------------------------
  IF to_regclass('public.project_budget_baselines') IS NOT NULL THEN
    FOREACH v_code IN ARRAY v_all_codes LOOP
      SELECT id INTO v_proj_id FROM public.projects WHERE project_code = v_code AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
      IF v_proj_id IS NULL THEN CONTINUE; END IF;

      INSERT INTO public.project_budget_baselines (
        project_id, baseline_name, version_number, total_amount, categories_snapshot, is_locked, created_by_user_id
      )
      VALUES (
        v_proj_id,
        'FM-SEED v722 approved baseline',
        922,
        850000.00,
        jsonb_build_array(
          jsonb_build_object('category_code', 'LAB', 'amount', 420000),
          jsonb_build_object('category_code', 'MAT', 'amount', 180000),
          jsonb_build_object('category_code', 'SUB', 'amount', 250000)
        ),
        TRUE,
        v_user_id
      )
      ON CONFLICT (project_id, version_number) DO UPDATE SET
        baseline_name = EXCLUDED.baseline_name,
        total_amount = EXCLUDED.total_amount,
        categories_snapshot = EXCLUDED.categories_snapshot,
        is_locked = EXCLUDED.is_locked,
        is_deleted = FALSE;
    END LOOP;
  END IF;

  IF to_regclass('public.project_cost_entries') IS NOT NULL THEN
    i := 0;
    FOREACH v_code IN ARRAY v_all_codes LOOP
      i := i + 1;
      SELECT id INTO v_proj_id FROM public.projects WHERE project_code = v_code AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
      IF v_proj_id IS NULL THEN CONTINUE; END IF;

      FOR m IN 1..4 LOOP
        INSERT INTO public.project_cost_entries (
          project_id, entry_date, amount, currency, description, entered_by_user_id, approval_status
        )
        VALUES (
          v_proj_id,
          (CURRENT_DATE - (m * 14 + i))::DATE,
          (12000 + i * 850 + m * 1200)::NUMERIC(15, 2),
          'USD',
          'FM-SEED v722 cost — ' || v_code || ' period ' || m,
          v_user_id,
          CASE m WHEN 4 THEN 'pending' ELSE 'approved' END
        );
      END LOOP;
    END LOOP;
  END IF;

  IF to_regclass('public.project_revenue_entries') IS NOT NULL THEN
    i := 0;
    FOREACH v_code IN ARRAY v_all_codes LOOP
      i := i + 1;
      SELECT id INTO v_proj_id FROM public.projects WHERE project_code = v_code AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
      IF v_proj_id IS NULL THEN CONTINUE; END IF;

      INSERT INTO public.project_revenue_entries (
        project_id, revenue_date, amount, currency, revenue_type, description, is_confirmed
      )
      VALUES
        (v_proj_id, (CURRENT_DATE - 60)::DATE, (95000 + i * 5000)::NUMERIC(15, 2), 'USD', 'milestone',
         'FM-SEED v722 milestone payment — ' || v_code, TRUE),
        (v_proj_id, (CURRENT_DATE - 30)::DATE, (42000 + i * 1200)::NUMERIC(15, 2), 'USD', 'contract_payment',
         'FM-SEED v722 progress invoice — ' || v_code, TRUE);
    END LOOP;
  END IF;

  -- -------------------------------------------------------------------------
  -- 2–4. Portfolio / Programme / Project EVM — monthly snapshots per project
  --      Slight CPI/SPI variance by project index for realistic roll-ups
  -- -------------------------------------------------------------------------
  IF to_regclass('public.project_evm_snapshots') IS NOT NULL THEN
    i := 0;
    FOREACH v_code IN ARRAY v_all_codes LOOP
      i := i + 1;
      SELECT id INTO v_proj_id FROM public.projects WHERE project_code = v_code AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
      IF v_proj_id IS NULL THEN CONTINUE; END IF;

      FOR m IN 1..v_months LOOP
        v_pv := (80000 + i * 5000 + m * 12000)::NUMERIC(18, 4);
        -- Project 1 on track; 2 slightly under; 3 over cost; others mixed
        v_ev := v_pv * CASE i % 4
          WHEN 0 THEN 0.97
          WHEN 1 THEN 1.00
          WHEN 2 THEN 0.94
          ELSE 0.98
        END;
        v_ac := v_ev * CASE i % 4
          WHEN 0 THEN 1.02
          WHEN 1 THEN 0.99
          WHEN 2 THEN 1.08
          ELSE 1.01
        END;

        INSERT INTO public.project_evm_snapshots (
          project_id, period_date, planned_value, earned_value, actual_cost, notes, created_by_user_id
        )
        VALUES (
          v_proj_id,
          (DATE_TRUNC('month', CURRENT_DATE) - ((v_months - m) || ' months')::INTERVAL)::DATE,
          v_pv,
          v_ev,
          v_ac,
          'FM-SEED v722 EVM — ' || v_code || ' month ' || m,
          v_user_id
        )
        ON CONFLICT (project_id, period_date) DO UPDATE SET
          planned_value = EXCLUDED.planned_value,
          earned_value = EXCLUDED.earned_value,
          actual_cost = EXCLUDED.actual_cost,
          notes = EXCLUDED.notes,
          updated_at = NOW();
      END LOOP;
    END LOOP;
  END IF;

  -- -------------------------------------------------------------------------
  -- 5. Expense Approvals — claims across workflow states
  -- -------------------------------------------------------------------------
  IF to_regclass('public.project_expense_claims') IS NOT NULL THEN
    i := 0;
    FOREACH v_code IN ARRAY v_all_codes LOOP
      i := i + 1;
      SELECT id INTO v_proj_id FROM public.projects WHERE project_code = v_code AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
      IF v_proj_id IS NULL THEN CONTINUE; END IF;

      INSERT INTO public.project_expense_claims (
        project_id, submitted_by_user_id, expense_type, expense_date, amount, currency,
        description, vendor_name, claim_status, current_approval_level, total_approval_levels,
        approval_chain, is_reimbursable
      )
      VALUES
        (v_proj_id, v_user_id, 'travel', CURRENT_DATE - 3, 420.00, 'USD',
         'FM-SEED v722 claim — onsite workshop travel', 'Regional Rail Co', 'pending_l1', 1, 2, '[]'::JSONB, TRUE),
        (v_proj_id, v_user_id, 'meals', CURRENT_DATE - 5, 185.50, 'USD',
         'FM-SEED v722 claim — client working lunch', 'City Bistro', 'pending_l2', 2, 2, '[]'::JSONB, TRUE),
        (v_proj_id, v_user_id, 'equipment', CURRENT_DATE - 12, 1299.00, 'USD',
         'FM-SEED v722 claim — test device purchase', 'TechSupply Ltd', 'fully_approved', NULL, 2, '[]'::JSONB, TRUE),
        (v_proj_id, v_user_id, 'training', CURRENT_DATE - 20, 750.00, 'USD',
         'FM-SEED v722 claim — certification course', 'PM Academy', 'paid', NULL, 2, '[]'::JSONB, TRUE),
        (v_proj_id, v_user_id, 'vendor', CURRENT_DATE - 8, 5400.00, 'USD',
         'FM-SEED v722 claim — specialist contractor day rate', 'Agile Partners', 'rejected', NULL, 3, '[]'::JSONB, FALSE);
    END LOOP;
  END IF;

  IF to_regclass('public.expense_approval_steps') IS NOT NULL
     AND to_regclass('public.project_expense_claims') IS NOT NULL THEN
    INSERT INTO public.expense_approval_steps (
      expense_claim_id, approval_level, approver_user_id, approver_role_name, action, comments
    )
    SELECT
      c.id,
      1,
      v_user_id,
      'project_manager',
      'approved',
      'FM-SEED v722 L1 approved'
    FROM public.project_expense_claims c
    WHERE c.description LIKE 'FM-SEED v722 claim —%'
      AND c.claim_status IN ('pending_l2', 'fully_approved', 'paid');
  END IF;

  -- -------------------------------------------------------------------------
  -- 6. Expense Thresholds — four logical approval bands
  -- -------------------------------------------------------------------------
  IF to_regclass('public.expense_approval_thresholds') IS NOT NULL THEN
    INSERT INTO public.expense_approval_thresholds (
      account_id, threshold_name, min_amount, max_amount, required_approval_level, is_active
    )
    VALUES
      (v_account_id, 'FM-SEED v722 — Petty cash (auto-approve)', 0, 99.99, 1, TRUE),
      (v_account_id, 'FM-SEED v722 — Team lead sign-off', 100, 499.99, 1, TRUE),
      (v_account_id, 'FM-SEED v722 — Programme / PM approval', 500, 2499.99, 2, TRUE),
      (v_account_id, 'FM-SEED v722 — PMO / executive approval', 2500, NULL, 3, TRUE)
    ON CONFLICT DO NOTHING;
  END IF;

  RAISE NOTICE 'v722_financial_management_logical_seed.sql applied (v334=%)', v_has_v334;
END $$;

-- Summary counts
DO $$
DECLARE n INT;
BEGIN
  IF to_regclass('public.project_evm_snapshots') IS NOT NULL THEN
    SELECT COUNT(*)::INT INTO n FROM public.project_evm_snapshots WHERE notes LIKE 'FM-SEED v722%';
    RAISE NOTICE 'project_evm_snapshots (Portfolio/Programme/Project EVM): %', n;
  END IF;
  IF to_regclass('public.project_cost_entries') IS NOT NULL THEN
    SELECT COUNT(*)::INT INTO n FROM public.project_cost_entries WHERE description LIKE 'FM-SEED v722%';
    RAISE NOTICE 'project_cost_entries (Financial Reports): %', n;
  END IF;
  IF to_regclass('public.project_revenue_entries') IS NOT NULL THEN
    SELECT COUNT(*)::INT INTO n FROM public.project_revenue_entries WHERE description LIKE 'FM-SEED v722%';
    RAISE NOTICE 'project_revenue_entries (Financial Reports): %', n;
  END IF;
  IF to_regclass('public.project_budget_baselines') IS NOT NULL THEN
    SELECT COUNT(*)::INT INTO n FROM public.project_budget_baselines WHERE baseline_name LIKE 'FM-SEED v722%';
    RAISE NOTICE 'project_budget_baselines (Financial Reports): %', n;
  END IF;
  IF to_regclass('public.project_expense_claims') IS NOT NULL THEN
    SELECT COUNT(*)::INT INTO n FROM public.project_expense_claims WHERE description LIKE 'FM-SEED v722%';
    RAISE NOTICE 'project_expense_claims (Expense Approvals): %', n;
  END IF;
  IF to_regclass('public.expense_approval_thresholds') IS NOT NULL THEN
    SELECT COUNT(*)::INT INTO n FROM public.expense_approval_thresholds WHERE threshold_name LIKE 'FM-SEED v722%';
    RAISE NOTICE 'expense_approval_thresholds (Expense Thresholds): %', n;
  END IF;
END $$;
