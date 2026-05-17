-- ============================================================================
-- v398 (rev 3): SECURITY DEFINER RPC — insert_project_invitation_as_pmo_admin
--
-- Root-cause history
-- ------------------
-- rev 1: called public.is_user_pmo_admin() internally → if v397 not deployed,
--         error "function does not exist" → isInvitationRpcMissingOrUnreachable
--         returned true → fell to legacy INSERT → "permission denied".
--
-- rev 2: inlined the admin check (no v397 dependency) BUT kept
--         `v_caller_uid uuid := auth.uid()` in DECLARE block.
--         On some Supabase configs, SECURITY DEFINER + SET search_path = public
--         causes auth.uid() to fail with "function auth.uid() does not exist"
--         (EXECUTE not granted to the function owner, or auth schema shadowed).
--         Same "does not exist" → isInvitationRpcMissingOrUnreachable → legacy
--         INSERT → "permission denied" → "Database setup required" error.
--
-- rev 3 (this file): replaces auth.uid() with an inline current_setting() read
--         (which is what auth.uid() does internally) — zero external function
--         calls, immune to EXECUTE-grant issues.
--         Also re-queries the inserted row AFTER the INSERT so any
--         AFTER-INSERT trigger that generates invitation_token is captured.
--
-- Prerequisites: project_invitations table (v85+). No other functions required.
-- Apply: run in Supabase SQL Editor. CREATE OR REPLACE is idempotent.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.insert_project_invitation_as_pmo_admin(
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
  -- Inline auth.uid(): read JWT sub claim directly from session GUC.
  -- Avoids calling auth.uid() (which may fail with "function does not exist"
  -- in SECURITY DEFINER context when EXECUTE is not granted to the owner).
  v_caller_uid      uuid;
  v_is_admin        boolean;
  v_inviter_id      uuid;
  v_invited_user_id uuid;
  v_expiry          timestamptz;
  v_email           text;
  v_inserted_id     uuid;
  v_row             RECORD;
BEGIN
  -- -----------------------------------------------------------------------
  -- 1. Resolve the calling user's auth UUID from the JWT GUC.
  --    current_setting with missing_ok = true (second arg) returns NULL
  --    instead of raising an error when the GUC is absent.
  -- -----------------------------------------------------------------------
  BEGIN
    v_caller_uid := COALESCE(
      NULLIF(current_setting('request.jwt.claim.sub', true), ''),
      (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    )::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_caller_uid := NULL;
  END;

  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated — no valid JWT sub claim in session'
      USING ERRCODE = '42501';
  END IF;

  -- -----------------------------------------------------------------------
  -- 2. Inline PMO admin check (row_security = off → bypasses RLS on these
  --    tables; no external function call required).
  --    Normalises role_name the same way JS matchesPmoSuiteAdminRole does.
  -- -----------------------------------------------------------------------
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    INNER JOIN roles   r ON r.id  = ur.role_id
    INNER JOIN users   u ON u.id  = ur.user_id
    WHERE u.auth_user_id = v_caller_uid
      AND ur.is_active                     = TRUE
      AND COALESCE(ur.is_deleted,  FALSE)  = FALSE
      AND COALESCE(r.is_deleted,   FALSE)  = FALSE
      AND COALESCE(r.is_active,    TRUE)   = TRUE
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

  -- -----------------------------------------------------------------------
  -- 3. Resolve the inviter's internal users.id.
  -- -----------------------------------------------------------------------
  SELECT id INTO v_inviter_id
    FROM users
   WHERE auth_user_id = v_caller_uid
   LIMIT 1;

  IF v_inviter_id IS NULL THEN
    RAISE EXCEPTION 'Inviter profile not found for auth uid %', v_caller_uid
      USING ERRCODE = 'P0002';
  END IF;

  -- -----------------------------------------------------------------------
  -- 4. Normalise email; look up existing platform user (may be NULL).
  -- -----------------------------------------------------------------------
  v_email := lower(trim(p_invited_email));

  SELECT id INTO v_invited_user_id
    FROM users
   WHERE lower(email) = v_email
   LIMIT 1;

  -- -----------------------------------------------------------------------
  -- 5. Default expiry to 14 days when the caller did not supply one.
  -- -----------------------------------------------------------------------
  v_expiry := COALESCE(p_invitation_expires_at, now() + INTERVAL '14 days');

  -- -----------------------------------------------------------------------
  -- 6. Insert the invitation row, capturing only the generated PK.
  --    invitation_token  → DB DEFAULT or BEFORE-trigger
  --    invitation_status → DB DEFAULT ('pending')
  --    is_deleted        → DB DEFAULT (false)
  --
  --    We deliberately do NOT use RETURNING for the full row here because
  --    on some schemas the token is written by an AFTER-INSERT trigger,
  --    which fires AFTER RETURNING captures values → token would be NULL.
  --    Instead we INSERT, get the id, then SELECT the committed row.
  -- -----------------------------------------------------------------------
  INSERT INTO project_invitations (
    project_id,
    invited_email,
    invited_user_id,
    role_id,
    invited_by_user_id,
    invitation_message,
    invitation_expires_at
  )
  VALUES (
    p_project_id,
    v_email,
    v_invited_user_id,
    p_role_id,
    v_inviter_id,
    p_invitation_message,
    v_expiry
  )
  RETURNING id INTO v_inserted_id;

  IF v_inserted_id IS NULL THEN
    RAISE EXCEPTION 'Invitation insert returned no id — check project_invitations table constraints'
      USING ERRCODE = 'P0001';
  END IF;

  -- -----------------------------------------------------------------------
  -- 7. Re-query the committed row so AFTER-trigger values (e.g. token) are
  --    included. row_security = off means this SELECT is always allowed.
  -- -----------------------------------------------------------------------
  SELECT
    id,
    invitation_token,
    invitation_expires_at,
    invitation_status,
    project_id,
    invited_email,
    role_id,
    created_at
  INTO v_row
  FROM project_invitations
  WHERE id = v_inserted_id;

  -- -----------------------------------------------------------------------
  -- 8. Return as JSON for JS parseInvitationRpcPayload().
  --    id is always present; invitation_token may be null if the schema
  --    uses no default/trigger — JS isValidInvitationRow checks only id.
  -- -----------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.insert_project_invitation_as_pmo_admin(uuid, text, uuid, text, timestamptz)
  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.insert_project_invitation_as_pmo_admin(uuid, text, uuid, text, timestamptz)
  TO authenticated;

GRANT EXECUTE ON FUNCTION public.insert_project_invitation_as_pmo_admin(uuid, text, uuid, text, timestamptz)
  TO service_role;

COMMENT ON FUNCTION public.insert_project_invitation_as_pmo_admin(uuid, text, uuid, text, timestamptz) IS
  'v398 rev-3: Self-contained SECURITY DEFINER RPC. Reads auth identity via
   current_setting() instead of auth.uid() to avoid EXECUTE-grant failures in
   SECURITY DEFINER context. Re-queries the inserted row after INSERT so
   AFTER-trigger-generated tokens are captured. Raises 42501 if caller is not
   a PMO admin. Returns JSON with id, invitation_token, and related fields.';

-- ---------------------------------------------------------------------------
-- Reload PostgREST schema cache.
-- After running this script wait ~30 s then test.
-- If still 404 after 30 s: Supabase Dashboard → project → Pause → Resume.
-- ---------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

DO $$ BEGIN
  RAISE NOTICE 'v398 rev-3: insert_project_invitation_as_pmo_admin deployed (current_setting auth + re-query)';
END $$;
