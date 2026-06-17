-- =============================================================================
-- v733: Billing RLS — platform_subscriptions + payment_transactions
-- Prerequisites: v732_account_billing_delegates.sql (tables); function ensured below
-- =============================================================================

-- Ensure helper exists (idempotent — safe if v732 already created it)
CREATE OR REPLACE FUNCTION public.has_billing_access(
  p_auth_user_id UUID,
  p_account_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF p_auth_user_id IS NULL OR p_account_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT id INTO v_user_id FROM public.users WHERE auth_user_id = p_auth_user_id LIMIT 1;
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF public.is_account_owner(p_auth_user_id, p_account_id) THEN
    RETURN TRUE;
  END IF;

  IF to_regclass('public.account_billing_delegates') IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.account_billing_delegates d
    WHERE d.account_id = p_account_id
      AND d.user_id = v_user_id
      AND d.is_active = TRUE
      AND d.revoked_at IS NULL
  );
END;
$$;

COMMENT ON FUNCTION public.has_billing_access(UUID, UUID) IS
  'True when auth user is account owner or active billing delegate for the account';

GRANT EXECUTE ON FUNCTION public.has_billing_access(UUID, UUID) TO authenticated;

-- platform_subscriptions: billing-capable users can read their account subs
DROP POLICY IF EXISTS platform_subscriptions_billing_select ON public.platform_subscriptions;
CREATE POLICY platform_subscriptions_billing_select ON public.platform_subscriptions
  FOR SELECT TO authenticated
  USING (
    public.has_billing_access(auth.uid(), account_id)
    OR public.is_account_owner(auth.uid(), account_id)
  );

-- payment_transactions: billing users can read transactions (when table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'payment_transactions'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS payment_transactions_billing_select ON public.payment_transactions';
    EXECUTE '
      CREATE POLICY payment_transactions_billing_select ON public.payment_transactions
        FOR SELECT TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.accounts a
            WHERE public.has_billing_access(auth.uid(), a.id)
          )
        )';
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE 'v733: billing RLS policies applied';
END $$;
