-- v627_get_my_display_name_with_job_title.sql
-- Adds job_title to the get_my_display_name return set so the invitation
-- email can show the inviter's job title in the "Invitation sent by" block.
-- Must DROP first because PostgreSQL cannot change the return type of an existing function.

DROP FUNCTION IF EXISTS public.get_my_display_name();

CREATE OR REPLACE FUNCTION public.get_my_display_name()
RETURNS TABLE (
  user_id    UUID,
  full_name  TEXT,
  first_name TEXT,
  last_name  TEXT,
  email      TEXT,
  job_title  TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
SET row_security = off
AS $$
DECLARE
  v_auth_uid   UUID;
  v_auth_email TEXT;
  v_meta_first TEXT;
  v_meta_last  TEXT;
  v_meta_full  TEXT;
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

  -- Read name fields from Supabase Auth metadata for backfill
  SELECT
    NULLIF(TRIM(COALESCE(au.raw_user_meta_data->>'first_name', au.raw_user_meta_data->>'given_name',  '')), ''),
    NULLIF(TRIM(COALESCE(au.raw_user_meta_data->>'last_name',  au.raw_user_meta_data->>'family_name', '')), ''),
    NULLIF(TRIM(COALESCE(au.raw_user_meta_data->>'full_name',  au.raw_user_meta_data->>'name',        '')), '')
  INTO v_meta_first, v_meta_last, v_meta_full
  FROM auth.users au
  WHERE au.id = v_auth_uid;

  -- Backfill first_name / last_name / full_name from auth metadata when stored name is email-handle-like
  UPDATE public.users u
  SET
    first_name = COALESCE(u.first_name, v_meta_first),
    last_name  = COALESCE(u.last_name,  v_meta_last),
    full_name  = CASE
      WHEN u.first_name IS NULL AND v_meta_first IS NOT NULL THEN
        TRIM(COALESCE(v_meta_first, '') || CASE WHEN v_meta_last IS NOT NULL THEN ' ' || v_meta_last ELSE '' END)
      WHEN v_meta_full IS NOT NULL AND (
        u.first_name IS NULL OR u.full_name = SPLIT_PART(u.email::TEXT, '@', 1)
      ) THEN v_meta_full
      ELSE u.full_name
    END,
    updated_at = NOW()
  WHERE u.auth_user_id = v_auth_uid
    AND (u.first_name IS NULL OR u.full_name = SPLIT_PART(u.email::TEXT, '@', 1))
    AND (v_meta_first IS NOT NULL OR v_meta_full IS NOT NULL);

  -- Primary lookup: by auth_user_id
  RETURN QUERY
  SELECT u.id, u.full_name::TEXT, u.first_name::TEXT, u.last_name::TEXT, u.email::TEXT, u.job_title::TEXT
  FROM   public.users u
  WHERE  u.auth_user_id = v_auth_uid
  LIMIT  1;

  -- Fallback: email match
  IF NOT FOUND AND v_auth_email IS NOT NULL THEN
    RETURN QUERY
    SELECT u.id, u.full_name::TEXT, u.first_name::TEXT, u.last_name::TEXT, u.email::TEXT, u.job_title::TEXT
    FROM   public.users u
    WHERE  LOWER(u.email::TEXT) = LOWER(v_auth_email)
    LIMIT  1;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_display_name() TO authenticated;

DO $$ BEGIN RAISE NOTICE 'v627_get_my_display_name_with_job_title.sql applied'; END $$;
