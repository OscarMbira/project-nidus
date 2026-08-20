-- ============================================================================
-- v929: Account email verification via the reliable send-email/Resend-API path
-- ============================================================================
-- Built as a decoupled replacement for Supabase Auth's native "Confirm email"
-- gate, which this session traced to an unreliable SMTP integration causing
-- signup to intermittently 504/500 (see conversation for the full diagnosis).
--
-- CODE-COMPLETE BUT INACTIVE BY DEFAULT: gated behind
-- ACCOUNT_EMAIL_VERIFICATION_ENABLED = false in registrationEmailService.js.
-- With Supabase's native "Confirm email" toggled off (a dashboard setting,
-- done manually), signUp() always returns a session immediately and a
-- "Welcome" email is sent via the same reliable path (v929 does not touch
-- that welcome-email path — it's plain, unconditional, no token). This
-- migration exists so real verification can be switched on later without a
-- second schema change: flip the flag, and the token/RPC plumbing already
-- exists and is already tested-shaped.
--
-- public.users already has is_verified BOOLEAN / verified_at TIMESTAMP
-- (v03_user_access_tables.sql) — this migration only adds the token pair
-- needed to drive them from a Project-Nidus-controlled email instead of
-- Supabase's own confirmation link.
-- ============================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS email_verification_token TEXT,
  ADD COLUMN IF NOT EXISTS email_verification_token_expires_at TIMESTAMP;

COMMENT ON COLUMN public.users.email_verification_token IS
  'v929: opaque token for Project-Nidus-driven email verification (inactive by default — see ACCOUNT_EMAIL_VERIFICATION_ENABLED). NULL once verified or never requested.';
COMMENT ON COLUMN public.users.email_verification_token_expires_at IS
  'v929: expiry for email_verification_token (24h from generation, matching the existing organisation-verification link pattern).';

CREATE INDEX IF NOT EXISTS idx_users_email_verification_token
  ON public.users(email_verification_token) WHERE email_verification_token IS NOT NULL;

-- ── request_email_verification ───────────────────────────────────────────────
-- Generates and stores a fresh token for the CALLING user (auth.uid()-resolved,
-- never takes a user id param, so a user can only ever request a token for
-- themselves). Returns the token so the caller can build the verification
-- link and send it via send-email/Resend (client-side, same as the existing
-- organisation-verification flow in registrationEmailService.js).
CREATE OR REPLACE FUNCTION public.request_email_verification()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_token   TEXT;
BEGIN
  SELECT id INTO v_user_id FROM public.users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

  UPDATE public.users
  SET email_verification_token = v_token,
      email_verification_token_expires_at = NOW() + INTERVAL '24 hours',
      updated_at = NOW()
  WHERE id = v_user_id;

  RETURN v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_email_verification() TO authenticated;

-- ── verify_email_token ───────────────────────────────────────────────────────
-- Token-only, no auth.uid() requirement — matches how email verification
-- links work everywhere (the browser clicking the link is often not the same
-- session that requested it). SECURITY DEFINER so it can update the target
-- row despite RLS.
CREATE OR REPLACE FUNCTION public.verify_email_token(p_token TEXT)
RETURNS TABLE (success BOOLEAN, user_email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_email   TEXT;
BEGIN
  IF p_token IS NULL OR trim(p_token) = '' THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT;
    RETURN;
  END IF;

  SELECT id, email INTO v_user_id, v_email
  FROM public.users
  WHERE email_verification_token = p_token
    AND email_verification_token_expires_at > NOW()
    AND is_deleted = FALSE;

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT;
    RETURN;
  END IF;

  UPDATE public.users
  SET is_verified = TRUE,
      verified_at = NOW(),
      email_verification_token = NULL,
      email_verification_token_expires_at = NULL,
      updated_at = NOW()
  WHERE id = v_user_id;

  RETURN QUERY SELECT TRUE, v_email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_email_token(TEXT) TO authenticated, anon;

DO $$
BEGIN
  RAISE NOTICE 'v929: account email verification token plumbing installed (inactive — see ACCOUNT_EMAIL_VERIFICATION_ENABLED)';
END $$;
