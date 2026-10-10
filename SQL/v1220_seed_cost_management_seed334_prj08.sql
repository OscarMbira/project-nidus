-- =============================================================================
-- v1220: Cost Management seed data for SEED334-PRJ-08 (Velocity Freight) only.
-- Covers the Cost Management sidebar sections:
--   Budget                 -> project_budget_categories, project_budget_revisions,
--                             project_budget_baselines
--   Actuals                -> cost_actuals
--   Financial Management   -> project_cost_entries
--   My Expenses /
--   Expense Approvals      -> project_expense_claims, expense_approval_steps,
--                             expense_approval_thresholds (account-scoped)
--   Forecast & Performance -> project_evm_snapshots
--   Financial Reports      -> reads the rows above (no table of its own)
-- Idempotent: fixed hex-only UUIDs, ON CONFLICT DO NOTHING.
-- Requires: v1219-era project SEED334-PRJ-08 with an owner user and account.
-- =============================================================================

DO $$
DECLARE
  v_project_id UUID;
  v_account_id UUID;
  v_user_id    UUID;
BEGIN
  SELECT id, account_id, owner_user_id
    INTO v_project_id, v_account_id, v_user_id
  FROM public.projects
  WHERE project_code = 'SEED334-PRJ-08'
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'v1220: project SEED334-PRJ-08 not found';
  END IF;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'v1220: project SEED334-PRJ-08 has no owner_user_id';
  END IF;

  -- Budget: categories (Budget page)
  INSERT INTO public.project_budget_categories (id, project_id, category_name, budget_amount, display_order)
  VALUES
    ('c1220001-0000-4000-8000-000000000001', v_project_id, 'Labour',              420000.00, 1),
    ('c1220001-0000-4000-8000-000000000002', v_project_id, 'Routing software',    180000.00, 2),
    ('c1220001-0000-4000-8000-000000000003', v_project_id, 'Fleet telematics',    150000.00, 3),
    ('c1220001-0000-4000-8000-000000000004', v_project_id, 'Contingency',          90000.00, 4)
  ON CONFLICT DO NOTHING;

  -- Budget: approved revision 1 and baseline
  INSERT INTO public.project_budget_revisions
    (id, project_id, revision_number, budget_categories, total_amount, currency, approval_status_at_revision, note, created_by)
  VALUES
    ('c1220002-0000-4000-8000-000000000001', v_project_id, 1,
     '[{"name":"Labour","amount":420000},{"name":"Routing software","amount":180000},{"name":"Fleet telematics","amount":150000},{"name":"Contingency","amount":90000}]'::jsonb,
     840000.00, 'USD', 'approved', 'Initial approved budget', v_user_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.project_budget_baselines
    (id, project_id, baseline_name, version_number, categories_snapshot, created_by_user_id, is_locked)
  VALUES
    ('c1220003-0000-4000-8000-000000000001', v_project_id, 'Performance baseline v1', 1,
     '[{"name":"Labour","amount":420000},{"name":"Routing software","amount":180000},{"name":"Fleet telematics","amount":150000},{"name":"Contingency","amount":90000}]'::jsonb,
     v_user_id, TRUE)
  ON CONFLICT DO NOTHING;

  -- Actuals: commitments, actuals and accruals
  INSERT INTO public.cost_actuals
    (id, project_id, transaction_type, amount, transaction_date, created_by, updated_by)
  VALUES
    ('c1220004-0000-4000-8000-000000000001', v_project_id, 'commitment',  62000.00, '2026-02-03', v_user_id, v_user_id),
    ('c1220004-0000-4000-8000-000000000002', v_project_id, 'actual',     58500.00, '2026-02-17', v_user_id, v_user_id),
    ('c1220004-0000-4000-8000-000000000003', v_project_id, 'actual',     74250.00, '2026-03-10', v_user_id, v_user_id),
    ('c1220004-0000-4000-8000-000000000004', v_project_id, 'accrual',    21000.00, '2026-03-31', v_user_id, v_user_id),
    ('c1220004-0000-4000-8000-000000000005', v_project_id, 'actual',     81400.00, '2026-04-22', v_user_id, v_user_id),
    ('c1220004-0000-4000-8000-000000000006', v_project_id, 'commitment', 45000.00, '2026-05-12', v_user_id, v_user_id)
  ON CONFLICT DO NOTHING;

  -- Financial Management: cost entries (not yet linked to a budget category)
  INSERT INTO public.project_cost_entries
    (id, project_id, entry_date, amount, currency, entered_by_user_id, approval_status)
  VALUES
    ('c1220005-0000-4000-8000-000000000001', v_project_id, '2026-02-05', 12500.00, 'USD', v_user_id, 'approved'),
    ('c1220005-0000-4000-8000-000000000002', v_project_id, '2026-02-20',  8400.00, 'USD', v_user_id, 'approved'),
    ('c1220005-0000-4000-8000-000000000003', v_project_id, '2026-03-08', 16750.00, 'USD', v_user_id, 'pending'),
    ('c1220005-0000-4000-8000-000000000004', v_project_id, '2026-03-24',  4300.00, 'USD', v_user_id, 'recorded'),
    ('c1220005-0000-4000-8000-000000000005', v_project_id, '2026-04-09', 22900.00, 'USD', v_user_id, 'approved'),
    ('c1220005-0000-4000-8000-000000000006', v_project_id, '2026-04-27',  9800.00, 'USD', v_user_id, 'rejected'),
    ('c1220005-0000-4000-8000-000000000007', v_project_id, '2026-05-14', 15600.00, 'USD', v_user_id, 'pending'),
    ('c1220005-0000-4000-8000-000000000008', v_project_id, '2026-06-02',  6100.00, 'USD', v_user_id, 'recorded')
  ON CONFLICT DO NOTHING;

  -- Expense approval thresholds (account-scoped; skip names already present)
  INSERT INTO public.expense_approval_thresholds
    (id, account_id, threshold_name, min_amount, required_approval_level, is_active)
  SELECT t.id, v_account_id, t.name, t.min_amount, t.lvl, TRUE
  FROM (VALUES
    ('c1220008-0000-4000-8000-000000000001'::uuid, 'Seed334 - Up to 500',       0.00,   1),
    ('c1220008-0000-4000-8000-000000000002'::uuid, 'Seed334 - 500 to 5000',   500.00,   2),
    ('c1220008-0000-4000-8000-000000000003'::uuid, 'Seed334 - Above 5000',   5000.00,   3)
  ) AS t(id, name, min_amount, lvl)
  WHERE v_account_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.expense_approval_thresholds x
      WHERE x.account_id = v_account_id AND x.threshold_name = t.name
    )
  ON CONFLICT DO NOTHING;

  -- My Expenses / Expense Approvals: claims in different states
  INSERT INTO public.project_expense_claims
    (id, project_id, submitted_by_user_id, expense_type, expense_date, amount, currency, claim_status, is_reimbursable)
  VALUES
    ('c1220006-0000-4000-8000-000000000001', v_project_id, v_user_id, 'travel',       '2026-03-02',  640.00, 'USD', 'draft',           TRUE),
    ('c1220006-0000-4000-8000-000000000002', v_project_id, v_user_id, 'accommodation', '2026-03-18', 1850.00, 'USD', 'pending_l1',      TRUE),
    ('c1220006-0000-4000-8000-000000000003', v_project_id, v_user_id, 'equipment',     '2026-04-05', 4200.00, 'USD', 'fully_approved',  TRUE),
    ('c1220006-0000-4000-8000-000000000004', v_project_id, v_user_id, 'travel',        '2026-05-20',  320.00, 'USD', 'paid',            TRUE)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.expense_approval_steps
    (id, expense_claim_id, approval_level, approver_user_id, action, actioned_at)
  VALUES
    ('c1220007-0000-4000-8000-000000000001', 'c1220006-0000-4000-8000-000000000003', 1, v_user_id, 'approved', '2026-04-07 10:00:00+00'),
    ('c1220007-0000-4000-8000-000000000002', 'c1220006-0000-4000-8000-000000000003', 2, v_user_id, 'approved', '2026-04-09 15:30:00+00')
  ON CONFLICT DO NOTHING;

  -- Forecast & Performance: monthly EVM snapshots
  INSERT INTO public.project_evm_snapshots
    (id, project_id, period_date, planned_value, earned_value, actual_cost, created_by_user_id)
  VALUES
    ('c1220009-0000-4000-8000-000000000001', v_project_id, '2026-01-31', 110000, 102000,  98500, v_user_id),
    ('c1220009-0000-4000-8000-000000000002', v_project_id, '2026-02-28', 150000, 141000, 137200, v_user_id),
    ('c1220009-0000-4000-8000-000000000003', v_project_id, '2026-03-31', 195000, 178500, 189400, v_user_id),
    ('c1220009-0000-4000-8000-000000000004', v_project_id, '2026-04-30', 240000, 219000, 232800, v_user_id),
    ('c1220009-0000-4000-8000-000000000005', v_project_id, '2026-05-31', 290000, 262000, 281500, v_user_id),
    ('c1220009-0000-4000-8000-000000000006', v_project_id, '2026-06-30', 340000, 306000, 329900, v_user_id)
  ON CONFLICT DO NOTHING;
END $$;

-- Verification: rows for SEED334-PRJ-08 per section
SELECT 'budget categories' AS section, COUNT(*) FROM public.project_budget_categories pbc
  JOIN public.projects p ON p.id = pbc.project_id WHERE p.project_code = 'SEED334-PRJ-08'
UNION ALL SELECT 'cost actuals', COUNT(*) FROM public.cost_actuals ca
  JOIN public.projects p ON p.id = ca.project_id WHERE p.project_code = 'SEED334-PRJ-08'
UNION ALL SELECT 'cost entries', COUNT(*) FROM public.project_cost_entries ce
  JOIN public.projects p ON p.id = ce.project_id WHERE p.project_code = 'SEED334-PRJ-08'
UNION ALL SELECT 'expense claims', COUNT(*) FROM public.project_expense_claims c
  JOIN public.projects p ON p.id = c.project_id WHERE p.project_code = 'SEED334-PRJ-08'
UNION ALL SELECT 'evm snapshots', COUNT(*) FROM public.project_evm_snapshots e
  JOIN public.projects p ON p.id = e.project_id WHERE p.project_code = 'SEED334-PRJ-08';
