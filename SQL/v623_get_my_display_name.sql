-- v623_get_my_display_name.sql
-- SECURITY DEFINER function that:
--   1. Attempts to link auth_user_id on the caller's public.users row (idempotent)
--   2. Returns the caller's profile (id, full_name, first_name, last_name, email)
-- This bypasses RLS so the invitation system can always resolve the inviter's
-- proper display name — even when auth_user_id was previously NULL.

CREATE OR REPLACE FUNCTION public.get_my_display_name()
RETURNS TABLE (
  user_id   UUID,
  full_name TEXT,
  first_name TEXT,
  last_name  TEXT,
  email      TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_auth_uid   UUID;
  v_auth_email TEXT;
BEGIN
  v_auth_uid   := auth.uid();
  v_auth_email := auth.email();

  IF v_auth_uid IS NULL THEN
    RETURN;  -- not authenticated
  END IF;

  -- Link auth_user_id if the row exists by email but has no auth_user_id yet (idempotent)
  IF v_auth_email IS NOT NULL THEN
    UPDATE public.users u
    SET    auth_user_id = v_auth_uid,
           updated_at   = NOW()
    WHERE  LOWER(u.email) = LOWER(v_auth_email)
      AND  u.auth_user_id IS NULL;
  END IF;

  -- Primary lookup: by auth_user_id (covers both newly-linked and already-linked rows)
  RETURN QUERY
  SELECT u.id, u.full_name, u.first_name, u.last_name, u.email
  FROM   public.users u
  WHERE  u.auth_user_id = v_auth_uid
  LIMIT  1;

  -- Fallback: email match (in case the UPDATE above affected 0 rows for some reason)
  IF NOT FOUND AND v_auth_email IS NOT NULL THEN
    RETURN QUERY
    SELECT u.id, u.full_name, u.first_name, u.last_name, u.email
    FROM   public.users u
    WHERE  LOWER(u.email) = LOWER(v_auth_email)
    LIMIT  1;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_display_name() TO authenticated;
