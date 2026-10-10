-- ============================================================================
-- v1237: Fix SEED334-PRJ-08's pending expense claim so it actually surfaces on
-- Expense Approvals
-- ============================================================================
-- v1220_seed_cost_management_seed334_prj08.sql inserted a 'pending_l1' expense
-- claim (id c1220006-0000-4000-8000-000000000002) but never set approval_chain /
-- current_approval_level / total_approval_levels, so they default to '[]' / NULL /
-- NULL. getPendingApprovals() (apps/platform/src/services/expenseClaimService.js)
-- resolves cur = current_approval_level || 1 = 1, then reads chain[cur-1] — on an
-- empty chain that's undefined, so the row is silently filtered out and never
-- appears as "pending my approval" for anyone. This backfills the missing columns
-- so the existing row actually shows up, naming the project's demo user as the
-- level-1 approver — same pattern resolve_expense_approval_chain() would have
-- produced had the claim been submitted through the live approval-chain RPC.
-- ============================================================================

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM public.users WHERE email = 'oscarmbirablogging@gmail.com' LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'oscarmbirablogging@gmail.com not found in public.users — skipping';
    RETURN;
  END IF;

  UPDATE public.project_expense_claims
  SET
    current_approval_level = 1,
    total_approval_levels = 1,
    approval_chain = jsonb_build_array(
      jsonb_build_object('level', 1, 'approver_user_id', v_user_id, 'approver_role', 'project_manager')
    ),
    updated_at = NOW()
  WHERE id = 'c1220006-0000-4000-8000-000000000002'
    AND claim_status = 'pending_l1';

  RAISE NOTICE 'v1237_fix_seed334_pending_expense_approval.sql applied successfully';
END $$;
