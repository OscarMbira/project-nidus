-- =============================================================================
-- v1595 — Security fix: remove the open policy on public.payment_transactions
-- =============================================================================
-- v117 created policy_payment_transactions_service_role as FOR ALL USING (true) with no role, so it
-- applied to every signed-in user: anyone could read, add, change or delete any organisation’s
-- payment rows (and the Platform Subscription page listed other organisations’ payments).
--
-- The policy was never needed: every write goes through server functions that use the service role
-- key (paynow-initiate, paynow-poll, paynow-verify-subscription, paynow-webhook, the background job
-- worker) or SECURITY DEFINER SQL functions, and the service role bypasses row security.
-- Users keep read access to their own organisation’s payments through the existing policies
-- payment_transactions_billing_select and policy_payment_transactions_select, and Admin keeps
-- policy_payment_transactions_admin_console_select.
-- =============================================================================

DROP POLICY IF EXISTS policy_payment_transactions_service_role ON public.payment_transactions;

-- Check: no policy on this table may allow every row to every user any more.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies
              WHERE schemaname = 'public' AND tablename = 'payment_transactions'
                AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE')
                AND (qual = 'true' OR with_check = 'true')) THEN
    RAISE EXCEPTION 'v1595: an open write policy is still present on public.payment_transactions';
  END IF;
  RAISE NOTICE 'v1595: payment_transactions has no open write policy';
END $$;
