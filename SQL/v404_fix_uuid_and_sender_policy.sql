-- ============================================================================
-- v404: Fix two remaining bugs after v403
--
-- Bug 1 (RPC 42883): insert_project_invitation_as_pmo_admin calls an INSERT
--   that relies on the table DEFAULT uuid_generate_v4(). The function has
--   SET search_path = public, which excludes the Supabase `extensions` schema
--   where uuid_generate_v4 lives → "function uuid_generate_v4() does not exist".
--   Fix: explicitly provide id = gen_random_uuid() in the INSERT.
--   gen_random_uuid() is in pg_catalog and is always reachable regardless of
--   search_path.
--
-- Bug 2 (INSERT 403): is_invited_by_auth_user may resolve a NULL auth id when
--   only request.jwt.claim.sub is available (some PostgREST versions use the
--   other GUC key). The function's search_path = public also excludes the auth
--   schema, so auth.uid() can't be used as a fallback inside it.
--   Fix: change language to plpgsql, add SET search_path = public,auth so
--   auth.uid() is accessible as a final fallback.
--
-- Run in Supabase SQL Editor. No Pause/Resume needed (functions only, no DDL).
-- ============================================================================

-- ============================================================================
-- 1. Robust is_invited_by_auth_user with auth.uid() fallback
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_invited_by_auth_user(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
SET row_security = off
STABLE
AS $$
DECLARE
  v_auth_id uuid;
BEGIN
  -- Primary: JWT GUC set by PostgREST
  BEGIN
    v_auth_id := COALESCE(
      NULLIF(current_setting('request.jwt.claim.sub', true), ''),
      (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    )::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_auth_id := NULL;
  END;

  -- Fallback: auth.uid() — works because auth is now in search_path
  IF v_auth_id IS NULL THEN
    BEGIN
      v_auth_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
      v_auth_id := NULL;
    END;
  END IF;

  IF v_auth_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id             = p_user_id
      AND auth_user_id   = v_auth_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_invited_by_auth_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_invited_by_auth_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_invited_by_auth_user(uuid) TO service_role;

COMMENT ON FUNCTION public.is_invited_by_auth_user(uuid) IS
  'v404: Returns true when users.id = p_user_id belongs to the current JWT caller.
   GUC primary, auth.uid() fallback. row_security=off bypasses nested RLS on users.';

-- ============================================================================
-- 2. Recreate insert_project_invitation_as_pmo_admin
--    Only change: INSERT now supplies id = gen_random_uuid() explicitly so the
--    table DEFAULT (uuid_generate_v4 in extensions schema) is never triggered
--    inside this function's restricted search_path = public context.
-- ============================================================================
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT pg_get_function_identity_arguments(p.oid) AS sig
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = 'insert_project_invitation_as_pmo_admin'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.insert_project_invitation_as_pmo_admin(%s) CASCADE', r.sig);
    RAISE NOTICE '[DROP] removed overload: (%)', r.sig;
  END LOOP;
END $$;

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
  -- Auth: JWT GUC primary, auth.uid() fallback
  BEGIN
    v_caller_uid := COALESCE(
      NULLIF(current_setting('request.jwt.claim.sub', true), ''),
      (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    )::uuid;
  EXCEPTION WHEN OTHERS THEN v_caller_uid := NULL; END;

  IF v_caller_uid IS NULL THEN
    BEGIN v_caller_uid := auth.uid(); EXCEPTION WHEN OTHERS THEN v_caller_uid := NULL; END;
  END IF;

  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  -- PMO admin check — POSIX regex, all 4 role variants
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    INNER JOIN roles r ON r.id = ur.role_id
    INNER JOIN users u ON u.id = ur.user_id
    WHERE u.auth_user_id = v_caller_uid
      AND ur.is_active = TRUE
      AND COALESCE(ur.is_deleted, FALSE) = FALSE
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

  SELECT id INTO v_inviter_id FROM users WHERE auth_user_id = v_caller_uid LIMIT 1;
  IF v_inviter_id IS NULL THEN
    RAISE EXCEPTION 'Inviter profile not found' USING ERRCODE = 'P0002';
  END IF;

  v_email := lower(trim(p_invited_email));
  SELECT id INTO v_invited_user_id FROM users WHERE lower(email) = v_email LIMIT 1;
  v_expiry := COALESCE(p_invitation_expires_at, now() + INTERVAL '14 days');

  -- KEY FIX: supply id = gen_random_uuid() explicitly.
  -- The table DEFAULT uses uuid_generate_v4() from the extensions schema, which is
  -- not in this function's search_path = public. gen_random_uuid() is in pg_catalog
  -- and is always reachable.
  INSERT INTO project_invitations (
    id,
    project_id, invited_email, invited_user_id, role_id,
    invited_by_user_id, invitation_message, invitation_expires_at
  ) VALUES (
    gen_random_uuid(),
    p_project_id, v_email, v_invited_user_id, p_role_id,
    v_inviter_id, p_invitation_message, v_expiry
  ) RETURNING id INTO v_inserted_id;

  IF v_inserted_id IS NULL THEN
    RAISE EXCEPTION 'Insert returned no id' USING ERRCODE = 'P0001';
  END IF;

  -- Re-query after INSERT so AFTER-trigger values (e.g. invitation_token) are included
  SELECT id, invitation_token, invitation_expires_at, invitation_status,
         project_id, invited_email, role_id, created_at
    INTO v_row FROM project_invitations WHERE id = v_inserted_id;

  RETURN json_build_object(
    'id',                    v_row.id,
    'invitation_token',      v_row.invitation_token,
    'invitation_expires_at', v_row.invitation_expires_at,
    'invitation_status',     v_row.invitation_status,
    'project_id',            v_row.project_id,
    'invited_email',         v_row.invited_email,
    'role_id',               v_row.role_id,
    'created_at',            v_row.created_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.insert_project_invitation_as_pmo_admin(uuid, text, uuid, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_project_invitation_as_pmo_admin(uuid, text, uuid, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_project_invitation_as_pmo_admin(uuid, text, uuid, text, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.insert_project_invitation_as_pmo_admin(uuid, text, uuid, text, timestamptz) TO anon;

COMMENT ON FUNCTION public.insert_project_invitation_as_pmo_admin(uuid, text, uuid, text, timestamptz) IS
  'v404: SECURITY DEFINER RPC. Fixed: INSERT now supplies id = gen_random_uuid() to avoid
   uuid_generate_v4() outside extensions schema. Auth via GUC + auth.uid() fallback.
   POSIX regex role normalisation. Re-queries row for AFTER-trigger tokens.';

-- ============================================================================
-- 3. Also fix the project_invitations table DEFAULT so direct INSERTs from JS
--    never hit the same uuid_generate_v4() issue.
-- ============================================================================
ALTER TABLE public.project_invitations
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- ============================================================================
-- 4. Verify
-- ============================================================================
DO $$
DECLARE cnt int;
BEGIN
  SELECT COUNT(*) INTO cnt FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'insert_project_invitation_as_pmo_admin';
  RAISE NOTICE '[VERIFY] insert_project_invitation_as_pmo_admin overloads: % (want 1)', cnt;

  SELECT COUNT(*) INTO cnt FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'is_invited_by_auth_user';
  RAISE NOTICE '[VERIFY] is_invited_by_auth_user exists: % (want 1)', cnt;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
             AND tablename='project_invitations'
             AND policyname='policy_project_invitations_sender_can_insert') THEN
    RAISE NOTICE '[VERIFY] sender_can_insert policy: OK';
  ELSE
    RAISE WARNING '[VERIFY] sender_can_insert policy: MISSING — re-run v403 first';
  END IF;

  -- Confirm the column default was updated
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name   = 'project_invitations'
       AND column_name  = 'id'
       AND column_default LIKE '%gen_random_uuid%'
  ) THEN
    RAISE NOTICE '[VERIFY] project_invitations.id DEFAULT: gen_random_uuid() OK';
  ELSE
    RAISE WARNING '[VERIFY] project_invitations.id DEFAULT: still uuid_generate_v4() — ALTER may need manual confirmation';
  END IF;

  RAISE NOTICE 'Done. Test Send Invite — no Pause/Resume needed for function-only changes.';
END $$;

NOTIFY pgrst, 'reload schema';
