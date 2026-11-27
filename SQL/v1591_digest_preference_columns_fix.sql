-- =============================================================================
-- v1591 — v1352 slice 1 fix: daily digest preference check (replaces the function from v1562)
-- =============================================================================
-- public.notification_preferences was first created in v30 (preference_category, email_enabled,
-- digest_frequency, user_id = users.id). v645's CREATE TABLE IF NOT EXISTS was skipped, so public has
-- no channel_email / event_category / frequency columns. sim.notification_preferences (v963p) has the
-- newer columns (user_id = auth user id). v1562 read the newer columns in both schemas and failed with
-- "column p.channel_email does not exist".
--
-- This version reads each row as JSON, so it works with either column set:
--   category  event_category, else preference_category, else preference_type
--   email     channel_email, else email_enabled
--   off       frequency = 'off', or digest_frequency = 'never'
--   person    user_id matches the auth user id or the users.id
-- No preference row means the digest is wanted (unchanged).
-- Run after v1562, then run v1565 again.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.notifications_digest_wanted(p_schema TEXT, p_auth_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
DECLARE
  v_user_id UUID;
  v_ids     TEXT[];
  v_pref    JSONB;
  v_email   BOOLEAN;
  v_freq    TEXT;
BEGIN
  IF p_auth_user_id IS NULL THEN RETURN FALSE; END IF;
  v_user_id := (SELECT us.id FROM public.users us WHERE us.auth_user_id = p_auth_user_id LIMIT 1);
  v_ids := ARRAY[p_auth_user_id::TEXT, COALESCE(v_user_id::TEXT, p_auth_user_id::TEXT)];

  IF p_schema = 'sim' THEN
    v_pref := (SELECT to_jsonb(p) FROM sim.notification_preferences p
                WHERE to_jsonb(p) ->> 'user_id' = ANY (v_ids)
                  AND COALESCE(to_jsonb(p) ->> 'event_category', to_jsonb(p) ->> 'preference_category',
                               to_jsonb(p) ->> 'preference_type') = 'reports'
                LIMIT 1);
  ELSE
    v_pref := (SELECT to_jsonb(p) FROM public.notification_preferences p
                WHERE to_jsonb(p) ->> 'user_id' = ANY (v_ids)
                  AND COALESCE(to_jsonb(p) ->> 'event_category', to_jsonb(p) ->> 'preference_category',
                               to_jsonb(p) ->> 'preference_type') = 'reports'
                LIMIT 1);
  END IF;

  IF v_pref IS NULL THEN RETURN TRUE; END IF;
  v_email := COALESCE((v_pref ->> 'channel_email')::BOOLEAN, (v_pref ->> 'email_enabled')::BOOLEAN, TRUE);
  v_freq  := COALESCE(v_pref ->> 'frequency', v_pref ->> 'digest_frequency', 'daily_digest');
  RETURN v_email AND v_freq NOT IN ('off', 'never');
END;
$$;
