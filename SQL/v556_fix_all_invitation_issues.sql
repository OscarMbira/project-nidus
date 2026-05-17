-- ============================================================================
-- v556: ONE-SHOT FIX — Send Role Invitations (all issues)
-- ============================================================================
-- Fixes two problems shown on the Send Role Invitations page:
--   1. POST …/rpc/insert_project_invitation_as_pmo_admin → 404
--   2. Stuck "Sending…" button caused by lock contention in check_seat_availability
--
-- Run this entire script ONCE in Supabase → SQL Editor, then hard-refresh the web app.
-- No other scripts need to be run after this one.
--
-- Includes (in order):
--   A. is_user_pmo_admin helper   (v551/v397 equivalent)
--   B. insert_project_invitation_as_pmo_admin RPC  (v552/v554 equivalent)
--   C. RLS policies on project_invitations / project_seat_allocations  (v553 equivalent)
--   D. check_seat_availability read-only fix   (v535 equivalent)
--   E. PostgREST schema reload
-- ============================================================================


-- ============================================================================
-- A. is_user_pmo_admin (SECURITY DEFINER helper)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_user_pmo_admin(p_auth_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    INNER JOIN roles r ON r.id = ur.role_id
    INNER JOIN users u ON u.id = ur.user_id
    WHERE u.auth_user_id = p_auth_uuid
      AND ur.is_active = TRUE
      AND COALESCE(ur.is_deleted, FALSE) = FALSE
      AND COALESCE(r.is_deleted, FALSE) = FALSE
      AND COALESCE(r.is_active, TRUE) = TRUE
      AND lower(
        regexp_replace(
          regexp_replace(trim(COALESCE(r.role_name, '')), '[[:space:]]+', '_', 'g'),
          '-', '_', 'g'
        )
      ) IN ('pmo_admin', 'org_admin', 'system_admin', 'super_admin')
  );
$$;

REVOKE ALL ON FUNCTION public.is_user_pmo_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_user_pmo_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_pmo_admin(uuid) TO service_role;

COMMENT ON FUNCTION public.is_user_pmo_admin(uuid) IS
  'Suite PMO/org/system/super admin per normalized role_name (matches app pmoSuiteRoleAccess).';


-- ============================================================================
-- B. insert_project_invitation_as_pmo_admin RPC (SECURITY DEFINER — bypasses RLS)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.insert_project_invitation_as_pmo_admin(
  p_project_id          uuid,
  p_invited_email       text,
  p_role_id             uuid,
  p_invitation_message  text,
  p_invitation_expires_at timestamptz
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_auth             uuid := auth.uid();
  v_inviter_id       uuid;
  v_existing_invitee uuid;
  v_row              public.project_invitations%ROWTYPE;
BEGIN
  IF v_auth IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  IF NOT (
    public.is_user_pmo_admin(v_auth)
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      INNER JOIN public.users u ON u.id = ur.user_id
      WHERE u.auth_user_id = v_auth
        AND ur.project_id = p_project_id
        AND ur.is_active = TRUE
        AND COALESCE(ur.is_deleted, FALSE) = FALSE
    )
  ) THEN
    RAISE EXCEPTION 'Forbidden: PMO suite admin or active project membership required'
      USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_inviter_id
  FROM public.users WHERE auth_user_id = v_auth LIMIT 1;
  IF v_inviter_id IS NULL THEN
    RAISE EXCEPTION 'Inviter user profile not found' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_existing_invitee
  FROM public.users
  WHERE lower(trim(email)) = lower(trim(p_invited_email))
  LIMIT 1;

  INSERT INTO public.project_invitations (
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
    trim(p_invited_email),
    v_existing_invitee,
    p_role_id,
    v_inviter_id,
    NULLIF(trim(p_invitation_message), ''),
    p_invitation_expires_at
  )
  RETURNING * INTO v_row;

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

REVOKE ALL ON FUNCTION public.insert_project_invitation_as_pmo_admin(uuid, text, uuid, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_project_invitation_as_pmo_admin(uuid, text, uuid, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_project_invitation_as_pmo_admin(uuid, text, uuid, text, timestamptz) TO service_role;

COMMENT ON FUNCTION public.insert_project_invitation_as_pmo_admin(uuid, text, uuid, text, timestamptz) IS
  'Inserts project_invitation when caller is suite PMO admin OR active project member. Bypasses RLS. (v556)';


-- ============================================================================
-- C. RLS policy — allow PMO admins full access on project_invitations
-- ============================================================================
DROP POLICY IF EXISTS policy_project_invitations_pmo_admin_all ON project_invitations;
CREATE POLICY policy_project_invitations_pmo_admin_all
  ON project_invitations
  FOR ALL
  TO authenticated
  USING (public.is_user_pmo_admin(auth.uid()))
  WITH CHECK (public.is_user_pmo_admin(auth.uid()));

DO $$
BEGIN
  IF to_regclass('public.project_seat_allocations') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS policy_project_seat_allocations_pmo_admin_all ON project_seat_allocations';
    EXECUTE $p$
      CREATE POLICY policy_project_seat_allocations_pmo_admin_all
        ON project_seat_allocations
        FOR ALL
        TO authenticated
        USING (public.is_user_pmo_admin(auth.uid()))
        WITH CHECK (public.is_user_pmo_admin(auth.uid()))
    $p$;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.project_memberships') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS policy_project_memberships_pmo_admin_all ON project_memberships';
    EXECUTE $p$
      CREATE POLICY policy_project_memberships_pmo_admin_all
        ON project_memberships
        FOR ALL
        TO authenticated
        USING (public.is_user_pmo_admin(auth.uid()))
        WITH CHECK (public.is_user_pmo_admin(auth.uid()))
    $p$;
  END IF;
END $$;


-- ============================================================================
-- D. check_seat_availability — read-only fix (removes lock-causing UPDATE)
-- ============================================================================
-- Root cause of stuck "Sending..." button:
--   The previous version called calculate_project_seat_usage (PERFORM), which did
--   an UPDATE on project_seat_allocations, acquiring a ROW EXCLUSIVE lock.
--   A hung prior request holding this lock blocked all subsequent invitation calls
--   indefinitely. Seat counts are already maintained by triggers on user_roles,
--   so no manual refresh is needed.
CREATE OR REPLACE FUNCTION public.check_seat_availability(p_project_id UUID)
RETURNS TABLE (
    has_available_seats BOOLEAN,
    current_count       INTEGER,
    total_seats         INTEGER,
    available_seats     INTEGER,
    usage_percentage    DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        (psa.available_seats > 0)                                      AS has_available_seats,
        psa.current_user_count                                         AS current_count,
        psa.total_seats,
        psa.available_seats,
        CASE
            WHEN psa.total_seats > 0
                THEN ROUND((psa.current_user_count::DECIMAL / psa.total_seats * 100), 2)
            ELSE 0
        END                                                            AS usage_percentage
    FROM project_seat_allocations psa
    WHERE psa.project_id = p_project_id;
END;
$$;

COMMENT ON FUNCTION public.check_seat_availability(UUID) IS
  'Read-only seat availability check (v556). Seat counts maintained by triggers; '
  'UPDATE call removed to prevent lock-wait hangs during invitation sending.';


-- ============================================================================
-- E. PostgREST schema reload (makes new RPC appear immediately)
-- ============================================================================
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE 'v556_fix_all_invitation_issues.sql applied successfully.';
  RAISE NOTICE '  ✓ is_user_pmo_admin (re)created';
  RAISE NOTICE '  ✓ insert_project_invitation_as_pmo_admin RPC created';
  RAISE NOTICE '  ✓ RLS policies on project_invitations / seat_allocations / memberships updated';
  RAISE NOTICE '  ✓ check_seat_availability replaced with read-only version';
  RAISE NOTICE '  ✓ PostgREST schema reload requested';
  RAISE NOTICE 'Now hard-refresh the web app (Ctrl+Shift+R / Cmd+Shift+R).';
END $$;
