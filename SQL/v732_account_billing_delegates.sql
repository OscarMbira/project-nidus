-- =============================================================================
-- v732: Account billing delegates + has_billing_access() + audit log
-- Run BEFORE v733_billing_rls.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.account_billing_delegates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  granted_by_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_account_billing_delegates_account
  ON public.account_billing_delegates(account_id) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_account_billing_delegates_user
  ON public.account_billing_delegates(user_id) WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS public.account_billing_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action VARCHAR(80) NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_account_billing_audit_account
  ON public.account_billing_audit_log(account_id, created_at DESC);

-- ─── has_billing_access ───────────────────────────────────────────────────────

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

-- ─── RLS on delegate tables ───────────────────────────────────────────────────

ALTER TABLE public.account_billing_delegates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_billing_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS account_billing_delegates_select ON public.account_billing_delegates;
CREATE POLICY account_billing_delegates_select ON public.account_billing_delegates
  FOR SELECT TO authenticated
  USING (
    public.has_billing_access(auth.uid(), account_id)
    OR public.is_account_owner(auth.uid(), account_id)
  );

DROP POLICY IF EXISTS account_billing_delegates_insert ON public.account_billing_delegates;
CREATE POLICY account_billing_delegates_insert ON public.account_billing_delegates
  FOR INSERT TO authenticated
  WITH CHECK (public.is_account_owner(auth.uid(), account_id));

DROP POLICY IF EXISTS account_billing_delegates_update ON public.account_billing_delegates;
CREATE POLICY account_billing_delegates_update ON public.account_billing_delegates
  FOR UPDATE TO authenticated
  USING (public.is_account_owner(auth.uid(), account_id))
  WITH CHECK (public.is_account_owner(auth.uid(), account_id));

DROP POLICY IF EXISTS account_billing_audit_select ON public.account_billing_audit_log;
CREATE POLICY account_billing_audit_select ON public.account_billing_audit_log
  FOR SELECT TO authenticated
  USING (public.has_billing_access(auth.uid(), account_id));

DROP POLICY IF EXISTS account_billing_audit_insert ON public.account_billing_audit_log;
CREATE POLICY account_billing_audit_insert ON public.account_billing_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (public.has_billing_access(auth.uid(), account_id));

DO $$
BEGIN
  RAISE NOTICE 'v732: account_billing_delegates + has_billing_access() ready';
END $$;
