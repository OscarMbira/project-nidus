-- v626_fix_user_name_at_registration.sql
-- Fixes two root causes of email-handle appearing as the inviter name:
--
-- 1. get_or_create_user: no longer falls back to SPLIT_PART(email,'@',1).
--    Now accepts p_first_name / p_last_name and stores them properly.
--    full_name is composed from first+last, or falls back to p_full_name, or 'User'.
--
-- 2. get_my_display_name: after linking auth_user_id, backfills first_name /
--    last_name / full_name from auth.users.raw_user_meta_data for accounts that
--    were created before proper names were captured.

-- =============================================================================
-- 1. Update get_or_create_user
-- =============================================================================

DROP FUNCTION IF EXISTS get_or_create_user(uuid, text, text, boolean);
DROP FUNCTION IF EXISTS get_or_create_user(uuid, text, text, text, text, boolean);

CREATE OR REPLACE FUNCTION public.get_or_create_user(
  p_auth_user_id uuid,
  p_email        text,
  p_full_name    text    DEFAULT NULL,
  p_first_name   text    DEFAULT NULL,
  p_last_name    text    DEFAULT NULL,
  p_is_verified  boolean DEFAULT false
)
RETURNS TABLE (
  user_id       uuid,
  full_name_out text,
  email_out     text,
  is_new        boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id      uuid;
  v_full_name    text;
  v_email        text;
  v_is_new       boolean := false;
  v_default_name text;
  v_first        text;
  v_last         text;
BEGIN
  v_first := NULLIF(TRIM(COALESCE(p_first_name, '')), '');
  v_last  := NULLIF(TRIM(COALESCE(p_last_name,  '')), '');

  -- Compose a proper full_name — never use the email local part as a fallback
  v_default_name := COALESCE(
    NULLIF(TRIM(COALESCE(v_first, '') || CASE WHEN v_first IS NOT NULL AND v_last IS NOT NULL THEN ' ' ELSE '' END || COALESCE(v_last, '')), ''),
    NULLIF(TRIM(COALESCE(p_full_name, '')), ''),
    'User'
  );

  -- ── 1. Find by auth_user_id ─────────────────────────────────────────────
  SELECT id, full_name, email INTO v_user_id, v_full_name, v_email
  FROM   public.users
  WHERE  auth_user_id = p_auth_user_id AND is_deleted = false
  LIMIT  1;

  IF FOUND THEN
    UPDATE public.users
    SET is_verified  = CASE WHEN p_is_verified THEN true ELSE is_verified END,
        verified_at  = CASE WHEN p_is_verified THEN COALESCE(verified_at, NOW()) ELSE verified_at END,
        -- backfill names if they are still empty
        first_name   = COALESCE(first_name, v_first),
        last_name    = COALESCE(last_name,  v_last),
        updated_at   = NOW()
    WHERE id = v_user_id;
    RETURN QUERY SELECT v_user_id, v_full_name, v_email, false;
    RETURN;
  END IF;

  -- ── 2. Find by email ────────────────────────────────────────────────────
  IF p_email IS NOT NULL AND p_email <> '' THEN
    SELECT id, full_name, email INTO v_user_id, v_full_name, v_email
    FROM   public.users
    WHERE  email = p_email AND is_deleted = false
    LIMIT  1;

    IF FOUND THEN
      UPDATE public.users
      SET auth_user_id = p_auth_user_id,
          is_verified  = CASE WHEN p_is_verified THEN true ELSE is_verified END,
          verified_at  = CASE WHEN p_is_verified THEN COALESCE(verified_at, NOW()) ELSE verified_at END,
          first_name   = COALESCE(first_name, v_first),
          last_name    = COALESCE(last_name,  v_last),
          updated_at   = NOW()
      WHERE id = v_user_id;
      RETURN QUERY SELECT v_user_id, v_full_name, v_email, false;
      RETURN;
    END IF;
  END IF;

  -- ── 3. Create new user ──────────────────────────────────────────────────
  INSERT INTO public.users
    (auth_user_id, email, full_name, first_name, last_name, is_active, is_verified, verified_at)
  VALUES (
    p_auth_user_id,
    p_email,
    v_default_name,
    v_first,
    v_last,
    true,
    p_is_verified,
    CASE WHEN p_is_verified THEN NOW() ELSE NULL END
  )
  RETURNING id, full_name, email INTO v_user_id, v_full_name, v_email;

  v_is_new := true;
  RETURN QUERY SELECT v_user_id, v_full_name, v_email, v_is_new;

EXCEPTION
  WHEN unique_violation THEN
    SELECT id, full_name, email INTO v_user_id, v_full_name, v_email
    FROM   public.users
    WHERE  auth_user_id = p_auth_user_id AND is_deleted = false
    LIMIT  1;
    IF FOUND THEN
      RETURN QUERY SELECT v_user_id, v_full_name, v_email, false;
      RETURN;
    END IF;
    IF p_email IS NOT NULL THEN
      SELECT id, full_name, email INTO v_user_id, v_full_name, v_email
      FROM   public.users
      WHERE  email = p_email AND is_deleted = false
      LIMIT  1;
      IF FOUND THEN
        UPDATE public.users SET auth_user_id = p_auth_user_id WHERE id = v_user_id;
        RETURN QUERY SELECT v_user_id, v_full_name, v_email, false;
        RETURN;
      END IF;
    END IF;
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_user(uuid, text, text, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_user(uuid, text, text, text, text, boolean) TO anon;

-- =============================================================================
-- 2. Update get_my_display_name — backfill names from auth metadata
-- =============================================================================

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

  -- Link auth_user_id if row exists by email but has no auth_user_id yet (idempotent)
  IF v_auth_email IS NOT NULL THEN
    UPDATE public.users u
    SET    auth_user_id = v_auth_uid,
           updated_at   = NOW()
    WHERE  LOWER(u.email::TEXT) = LOWER(v_auth_email)
      AND  u.auth_user_id IS NULL;
  END IF;

  -- Read name fields from Supabase Auth metadata for backfill
  SELECT
    NULLIF(TRIM(COALESCE(
      au.raw_user_meta_data->>'first_name',
      au.raw_user_meta_data->>'given_name', ''
    )), ''),
    NULLIF(TRIM(COALESCE(
      au.raw_user_meta_data->>'last_name',
      au.raw_user_meta_data->>'family_name', ''
    )), ''),
    NULLIF(TRIM(COALESCE(
      au.raw_user_meta_data->>'full_name',
      au.raw_user_meta_data->>'name', ''
    )), '')
  INTO v_meta_first, v_meta_last, v_meta_full
  FROM auth.users au
  WHERE au.id = v_auth_uid;

  -- Backfill first_name / last_name / full_name from auth metadata
  -- when the stored full_name looks like an email handle (no spaces, matches email local part)
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
  SELECT u.id, u.full_name::TEXT, u.first_name::TEXT, u.last_name::TEXT, u.email::TEXT
  FROM   public.users u
  WHERE  u.auth_user_id = v_auth_uid
  LIMIT  1;

  -- Fallback: email match
  IF NOT FOUND AND v_auth_email IS NOT NULL THEN
    RETURN QUERY
    SELECT u.id, u.full_name::TEXT, u.first_name::TEXT, u.last_name::TEXT, u.email::TEXT
    FROM   public.users u
    WHERE  LOWER(u.email::TEXT) = LOWER(v_auth_email)
    LIMIT  1;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_display_name() TO authenticated;

DO $$ BEGIN RAISE NOTICE 'v626_fix_user_name_at_registration.sql applied'; END $$;
