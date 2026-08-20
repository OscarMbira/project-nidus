-- =============================================================================
-- v900: Fix get_my_display_name() silently reverting a user's Settings-saved
-- full_name back to stale Supabase Auth metadata on every call.
--
-- Root cause (v627's backfill block): the trigger condition for overwriting
-- full_name was `u.first_name IS NULL`, not "is full_name actually bad."
-- Settings.jsx (profile edit page) only ever writes public.users.full_name —
-- it never populates first_name/last_name. So for any account that only ever
-- used the Settings page, first_name stays NULL forever, which means EVERY
-- call to get_my_display_name() (invite sends, signatory panels, anywhere
-- this RPC is used) re-ran the backfill and clobbered a deliberately-set
-- full_name with whatever was in auth.users.raw_user_meta_data at signup —
-- even when full_name already held a perfectly good, user-edited value.
--
-- Fix: only touch full_name when it is genuinely missing (NULL/blank) or
-- handle-like (equals the email's local part) — i.e. exactly the case v623's
-- original backfill was meant to fix. A real full_name, once set, is never
-- overwritten again regardless of what first_name/last_name hold. The
-- first_name/last_name backfill-from-metadata is left as-is (harmless —
-- display no longer depends on those columns; resolveInviterDisplayNameFromUser
-- prefers full_name first as of the JS-side fix earlier this session).
-- =============================================================================

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

  -- Backfill first_name/last_name (harmless — not directly displayed) always when null.
  -- Backfill full_name ONLY when it is missing/blank or still handle-like (== email
  -- local part) — v900: never overwrite a real, user-edited full_name again.
  UPDATE public.users u
  SET
    first_name = COALESCE(u.first_name, v_meta_first),
    last_name  = COALESCE(u.last_name,  v_meta_last),
    full_name  = CASE
      WHEN u.full_name IS NULL
        OR TRIM(u.full_name) = ''
        OR u.full_name = SPLIT_PART(u.email::TEXT, '@', 1)
      THEN
        COALESCE(
          v_meta_full,
          NULLIF(TRIM(COALESCE(v_meta_first, '') || CASE WHEN v_meta_last IS NOT NULL THEN ' ' || v_meta_last ELSE '' END), ''),
          u.full_name
        )
      ELSE u.full_name
    END,
    updated_at = NOW()
  WHERE u.auth_user_id = v_auth_uid
    AND (
      u.first_name IS NULL
      OR u.last_name IS NULL
      OR u.full_name IS NULL
      OR TRIM(u.full_name) = ''
      OR u.full_name = SPLIT_PART(u.email::TEXT, '@', 1)
    )
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

-- ---------------------------------------------------------------------------
-- One-time data repair: restore this session's test account, clobbered by the
-- bug above the moment an invite was sent after its Settings edit.
-- ---------------------------------------------------------------------------
UPDATE public.users
SET full_name = 'Oscar PMO Administrator',
    updated_at = NOW()
WHERE LOWER(email) = LOWER('nombira@gmail.com')
  AND full_name = 'Oscar Organisational Administrator';

DO $$
BEGIN
  RAISE NOTICE 'v900_fix_get_my_display_name_backfill_overwrite.sql applied';
END $$;
