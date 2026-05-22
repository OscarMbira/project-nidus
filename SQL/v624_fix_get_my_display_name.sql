-- v624_fix_get_my_display_name.sql
-- Fixes "structure of query does not match function result type" from v623.
-- Root cause: public.users columns (full_name, first_name, last_name, email) are
-- VARCHAR(n), not TEXT. PostgreSQL requires explicit casts when they differ from
-- the RETURNS TABLE declaration. Both RETURN QUERY blocks are updated.

CREATE OR REPLACE FUNCTION public.get_my_display_name()
RETURNS TABLE (
  user_id    UUID,
  full_name  TEXT,
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
    RETURN;
  END IF;

  -- Link auth_user_id if the row exists by email but has no auth_user_id yet (idempotent)
  IF v_auth_email IS NOT NULL THEN
    UPDATE public.users u
    SET    auth_user_id = v_auth_uid,
           updated_at   = NOW()
    WHERE  LOWER(u.email::TEXT) = LOWER(v_auth_email)
      AND  u.auth_user_id IS NULL;
  END IF;

  -- Primary lookup: by auth_user_id
  RETURN QUERY
  SELECT
    u.id,
    u.full_name::TEXT,
    u.first_name::TEXT,
    u.last_name::TEXT,
    u.email::TEXT
  FROM public.users u
  WHERE u.auth_user_id = v_auth_uid
  LIMIT 1;

  -- Fallback: email match
  IF NOT FOUND AND v_auth_email IS NOT NULL THEN
    RETURN QUERY
    SELECT
      u.id,
      u.full_name::TEXT,
      u.first_name::TEXT,
      u.last_name::TEXT,
      u.email::TEXT
    FROM public.users u
    WHERE LOWER(u.email::TEXT) = LOWER(v_auth_email)
    LIMIT 1;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_display_name() TO authenticated;

DO $$ BEGIN RAISE NOTICE 'v624_fix_get_my_display_name.sql applied'; END $$;
