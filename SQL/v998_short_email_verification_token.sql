-- ============================================================================
-- v998: Shorter account-email verification tokens (spam-friendly short links)
-- ============================================================================
-- v929 generated a 64-char token (two UUIDs concatenated). Registration emails
-- then embedded /auth/verify-email?token=<64hex>, which is long, query-string
-- heavy, and more likely to trip spam filters when shown as a copy-paste URL.
--
-- This migration shortens new tokens to a single UUID without dashes (32 hex).
-- Existing outstanding tokens (64-char) remain valid until they expire — the
-- verify_email_token() lookup is unchanged. App emails now use /v/{token}.
-- ============================================================================

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

  -- Single UUID (32 hex) — enough entropy for a 24h one-time link; pairs with /v/:token
  v_token := replace(gen_random_uuid()::text, '-', '');

  UPDATE public.users
  SET email_verification_token = v_token,
      email_verification_token_expires_at = NOW() + INTERVAL '48 hours',
      updated_at = NOW()
  WHERE id = v_user_id;

  RETURN v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_email_verification() TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'v998: request_email_verification now returns a 32-char token for /v/:token short links';
END $$;
