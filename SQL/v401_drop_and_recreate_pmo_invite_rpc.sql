-- ============================================================================
-- v401: Drop ALL overloads of insert_project_invitation_as_pmo_admin, then
--       recreate it cleanly. PGRST202 "not found in schema cache" means either:
--         a) PostgREST hasn't reloaded since v400 ran (Pause/Resume required), OR
--         b) Multiple overloads exist and PostgREST can't disambiguate.
--       This file eliminates (b) by dropping every overload first.
--
-- After running this file:
--   1. Supabase Dashboard → your project → Settings (or home) → Pause → Resume.
--   2. Wait ~60 s for PostgREST to restart, then test the Send Invite button.
--
-- Prerequisites: v400_pmo_invite_definitive_fix.sql already applied.
-- ============================================================================

-- ============================================================================
-- Step 1: Drop every overload of insert_project_invitation_as_pmo_admin
-- ============================================================================
DO $$
DECLARE
  r RECORD;
  dropped int := 0;
BEGIN
  FOR r IN
    SELECT p.oid,
           pg_get_function_identity_arguments(p.oid) AS sig
      FROM pg_proc      p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname = 'insert_project_invitation_as_pmo_admin'
  LOOP
    EXECUTE format(
      'DROP FUNCTION IF EXISTS public.insert_project_invitation_as_pmo_admin(%s) CASCADE',
      r.sig
    );
    RAISE NOTICE 'Dropped overload: public.insert_project_invitation_as_pmo_admin(%)', r.sig;
    dropped := dropped + 1;
  END LOOP;

  IF dropped = 0 THEN
    RAISE NOTICE 'No existing overloads found — creating fresh.';
  ELSE
    RAISE NOTICE 'Dropped % overload(s). Creating fresh...', dropped;
  END IF;
END $$;

-- ============================================================================
-- Step 2: Create the single canonical function
-- ============================================================================
CREATE FUNCTION public.insert_project_invitation_as_pmo_admin(
  p_project_id              uuid,
  p_invited_email           text,
  p_role_id                 uuid,
  p_invitation_message      text        DEFAULT NULL,
  p_invitation_expires_at   timestamptz DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_caller_uid      uuid;
  v_is_admin        boolean;
  v_inviter_id      uuid;
  v_invited_user_id uuid;
  v_expiry          timestamptz;
  v_email           text;
  v_inserted_id     uuid;
  v_row             RECORD;
BEGIN
  -- 1. Resolve caller UUID from JWT GUC (PostgREST standard).
  BEGIN
    v_caller_uid := COALESCE(
      NULLIF(current_setting('request.jwt.claim.sub', true), ''),
      (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    )::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_caller_uid := NULL;
  END;

  -- Fallback: auth.uid() (postgres superuser can always call this).
  IF v_caller_uid IS NULL THEN
    BEGIN
      v_caller_uid := auth.uid();
    EXCEPTION WHEN OTHERS THEN
      v_caller_uid := NULL;
    END;
  END IF;

  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated — no valid JWT sub claim in session'
      USING ERRCODE = '28000';
  END IF;

  -- 2. Inline PMO admin check — all 4 role variants, normalised.
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    INNER JOIN roles   r ON r.id = ur.role_id
    INNER JOIN users   u ON u.id = ur.user_id
    WHERE u.auth_user_id = v_caller_uid
      AND ur.is_active                    = TRUE
      AND COALESCE(ur.is_deleted, FALSE)  = FALSE
      AND COALESCE(r.is_deleted, FALSE)   = FALSE
      AND COALESCE(r.is_active,  TRUE)    = TRUE
      AND lower(
            regexp_replace(
              regexp_replace(
                trim(COALESCE(r.role_name, '')),
                '[[:space:]]+', '_', 'g'
              ),
              '-', '_', 'g'
            )
          ) IN ('pmo_admin', 'org_admin', 'system_admin', 'super_admin')
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Permission denied: caller is not a PMO admin (auth uid: %)', v_caller_uid
      USING ERRCODE = '42501';
  END IF;

  -- 3. Resolve inviter's internal users.id.
  SELECT id INTO v_inviter_id
    FROM users
   WHERE auth_user_id = v_caller_uid
   LIMIT 1;

  IF v_inviter_id IS NULL THEN
    RAISE EXCEPTION 'Inviter profile not found for auth uid %', v_caller_uid
      USING ERRCODE = 'P0002';
  END IF;

  -- 4. Normalise email; look up existing platform user (may be NULL).
  v_email := lower(trim(p_invited_email));

  SELECT id INTO v_invited_user_id
    FROM users
   WHERE lower(email) = v_email
   LIMIT 1;

  -- 5. Default expiry to 14 days.
  v_expiry := COALESCE(p_invitation_expires_at, now() + INTERVAL '14 days');

  -- 6. Insert (capture id only — RETURNING misses AFTER-trigger values).
  INSERT INTO project_invitations (
    project_id, invited_email, invited_user_id, role_id,
    invited_by_user_id, invitation_message, invitation_expires_at
  )
  VALUES (
    p_project_id, v_email, v_invited_user_id, p_role_id,
    v_inviter_id, p_invitation_message, v_expiry
  )
  RETURNING id INTO v_inserted_id;

  IF v_inserted_id IS NULL THEN
    RAISE EXCEPTION 'Invitation insert returned no id'
      USING ERRCODE = 'P0001';
  END IF;

  -- 7. Re-query to capture AFTER-trigger values (e.g. invitation_token).
  SELECT id, invitation_token, invitation_expires_at, invitation_status,
         project_id, invited_email, role_id, created_at
    INTO v_row
    FROM project_invitations
   WHERE id = v_inserted_id;

  -- 8. Return JSON.
  RETURN json_build_object(
    'id',                     v_row.id,
    'invitation_token',       v_row.invitation_token,
    'invitation_expires_at',  v_row.invitation_expires_at,
    'invitation_status',      v_row.invitation_status,
    'project_id',             v_row.project_id,
    'invited_email',          v_row.invited_email,
    'role_id',                v_row.role_id,
    'created_at',             v_row.created_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.insert_project_invitation_as_pmo_admin(uuid, text, uuid, text, timestamptz)
  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.insert_project_invitation_as_pmo_admin(uuid, text, uuid, text, timestamptz)
  TO authenticated;

GRANT EXECUTE ON FUNCTION public.insert_project_invitation_as_pmo_admin(uuid, text, uuid, text, timestamptz)
  TO service_role;

COMMENT ON FUNCTION public.insert_project_invitation_as_pmo_admin(uuid, text, uuid, text, timestamptz) IS
  'v401: Clean single-overload SECURITY DEFINER RPC. Auth via GUC then auth.uid() fallback. 4-role admin check. Re-queries row for AFTER-trigger tokens.';

-- ============================================================================
-- Step 3: Verify exactly 1 overload exists
-- ============================================================================
DO $$
DECLARE
  cnt int;
BEGIN
  SELECT COUNT(*) INTO cnt
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname = 'insert_project_invitation_as_pmo_admin';

  IF cnt = 1 THEN
    RAISE NOTICE 'VERIFY OK: exactly 1 overload of insert_project_invitation_as_pmo_admin. Overload count: %', cnt;
  ELSE
    RAISE WARNING 'VERIFY WARN: % overload(s) found — expected 1. PostgREST may still return PGRST202.', cnt;
  END IF;

  RAISE NOTICE '=== NEXT STEP ===';
  RAISE NOTICE 'Go to Supabase Dashboard → your project → Pause → Resume.';
  RAISE NOTICE 'Wait ~60 s for PostgREST to restart, then test the Send Invite button.';
  RAISE NOTICE 'Do NOT just click Retry in the app — PostgREST must restart first.';
END $$;

-- Attempt schema cache reload (may not be enough alone — Pause/Resume is more reliable)
NOTIFY pgrst, 'reload schema';
