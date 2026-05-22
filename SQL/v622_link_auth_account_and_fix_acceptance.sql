-- v622: Reliable auth_user_id backfill for invited users.
--
-- Problem: client-side UPDATE users SET auth_user_id=... is blocked by RLS for
-- non-admin users, so the mapping between Supabase Auth UID and public.users is
-- never written. Every hook that queries users by auth_user_id then returns
-- PGRST116 (0 rows on .single()) → "No menu items", "No organization found".
--
-- Fix A: link_auth_account() — a SECURITY DEFINER function the client calls
--        immediately after signInWithPassword. Reads the caller's UID + email
--        from the JWT and updates the matching public.users row. No auth schema
--        access needed; uses auth.uid() and auth.jwt() (session GUCs).
--
-- Fix B: accept_project_invitation updated to also run the backfill as part of
--        the normal acceptance AND the idempotency-repair path (v621).

-- ============================================================================
-- A. link_auth_account() helper
-- ============================================================================

CREATE OR REPLACE FUNCTION public.link_auth_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   uuid;
  v_email text;
BEGIN
  v_uid   := auth.uid();
  v_email := (auth.jwt() ->> 'email')::text;

  IF v_uid IS NULL OR v_email IS NULL OR v_email = '' THEN
    RETURN;
  END IF;

  UPDATE public.users
  SET auth_user_id = v_uid,
      updated_at   = NOW()
  WHERE lower(trim(email)) = lower(trim(v_email))
    AND is_deleted = FALSE
    AND (auth_user_id IS NULL OR auth_user_id != v_uid);
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_auth_account() TO authenticated;

COMMENT ON FUNCTION public.link_auth_account() IS
  'Links the current Supabase auth session to the matching public.users row '
  'by matching JWT email. SECURITY DEFINER bypasses RLS. Safe to call any '
  'time after login — is idempotent when auth_user_id is already correct.';

-- ============================================================================
-- B. accept_project_invitation — carry forward v619+v620+v621, add backfill
-- ============================================================================

CREATE OR REPLACE FUNCTION public.accept_project_invitation(
  p_token              VARCHAR,
  p_accepting_user_id  UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation        project_invitations%ROWTYPE;
  v_is_valid          BOOLEAN;
  v_legacy_role_name  VARCHAR;
  v_mapped_role_name  VARCHAR;
  v_project_role_id   UUID;
BEGIN
  SELECT * INTO v_invitation
  FROM project_invitations
  WHERE invitation_token = p_token
    AND is_deleted = FALSE;

  IF v_invitation.id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- ── Backfill auth_user_id so every hook that queries by auth UID works ──────
  -- auth.uid() is the JWT UID of the calling user even in SECURITY DEFINER.
  UPDATE public.users
  SET auth_user_id = auth.uid(),
      updated_at   = NOW()
  WHERE id = p_accepting_user_id
    AND auth.uid() IS NOT NULL
    AND (auth_user_id IS NULL OR auth_user_id != auth.uid());

  -- ── Idempotency: same user re-accepting; repair membership if missing (v621) ─
  IF v_invitation.invitation_status = 'accepted'
     AND v_invitation.accepted_by_user_id = p_accepting_user_id THEN

    IF NOT EXISTS (
      SELECT 1 FROM project_memberships pm
      WHERE pm.project_id = v_invitation.project_id
        AND pm.user_id    = p_accepting_user_id
        AND pm.is_active  = TRUE
    ) THEN
      SELECT role_name INTO v_legacy_role_name
      FROM roles WHERE id = v_invitation.role_id LIMIT 1;

      v_mapped_role_name := CASE v_legacy_role_name
        WHEN 'project_manager'      THEN 'project_manager'
        WHEN 'programme_manager'    THEN 'programme_manager'
        WHEN 'portfolio_manager'    THEN 'portfolio_manager'
        WHEN 'team_manager'         THEN 'team_manager'
        WHEN 'team_member'          THEN 'team_member'
        WHEN 'team_lead'            THEN 'team_lead'
        WHEN 'project_assurance'    THEN 'project_assurance'
        WHEN 'quality_assurance'    THEN 'quality_assurance'
        WHEN 'change_authority'     THEN 'change_authority'
        WHEN 'pm_team_manager'      THEN 'team_manager'
        WHEN 'pm_team_member'       THEN 'team_member'
        WHEN 'pm_project_assurance' THEN 'project_assurance'
        WHEN 'pm_quality_assurance' THEN 'quality_assurance'
        WHEN 'pm_change_authority'  THEN 'change_authority'
        WHEN 'pm_project_manager'   THEN 'project_manager'
        WHEN 'pm_programme_manager' THEN 'programme_manager'
        WHEN 'pm_team_lead'         THEN 'team_lead'
        ELSE v_legacy_role_name
      END;

      SELECT pr.id INTO v_project_role_id
      FROM project_roles pr
      WHERE pr.is_template = TRUE
        AND pr.project_id  IS NULL
        AND pr.is_active   = TRUE
        AND pr.role_name   = v_mapped_role_name
      LIMIT 1;

      INSERT INTO project_memberships (
        project_id, user_id, project_role_id,
        invitation_status, accepted_at, is_active
      )
      VALUES (
        v_invitation.project_id, p_accepting_user_id, v_project_role_id,
        'accepted', NOW(), TRUE
      );
    END IF;

    RETURN TRUE;
  END IF;

  -- ── Normal acceptance path ──────────────────────────────────────────────────
  v_is_valid := (
    v_invitation.invitation_status = 'pending'
    AND (v_invitation.invitation_expires_at IS NULL
         OR v_invitation.invitation_expires_at > NOW())
  );

  IF NOT v_is_valid THEN
    RETURN FALSE;
  END IF;

  PERFORM 1 FROM check_seat_availability(v_invitation.project_id)
  WHERE has_available_seats = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No available seats in project';
  END IF;

  INSERT INTO user_roles (user_id, role_id, project_id, assigned_by, is_active)
  VALUES (
    p_accepting_user_id,
    v_invitation.role_id,
    v_invitation.project_id,
    v_invitation.invited_by_user_id,
    TRUE
  )
  ON CONFLICT (user_id, role_id, project_id) DO UPDATE
  SET is_active  = TRUE,
      is_deleted = FALSE,
      updated_at = NOW();

  SELECT role_name INTO v_legacy_role_name
  FROM roles WHERE id = v_invitation.role_id LIMIT 1;

  v_mapped_role_name := CASE v_legacy_role_name
    WHEN 'project_manager'      THEN 'project_manager'
    WHEN 'programme_manager'    THEN 'programme_manager'
    WHEN 'portfolio_manager'    THEN 'portfolio_manager'
    WHEN 'team_manager'         THEN 'team_manager'
    WHEN 'team_member'          THEN 'team_member'
    WHEN 'team_lead'            THEN 'team_lead'
    WHEN 'project_assurance'    THEN 'project_assurance'
    WHEN 'quality_assurance'    THEN 'quality_assurance'
    WHEN 'change_authority'     THEN 'change_authority'
    WHEN 'pm_team_manager'      THEN 'team_manager'
    WHEN 'pm_team_member'       THEN 'team_member'
    WHEN 'pm_project_assurance' THEN 'project_assurance'
    WHEN 'pm_quality_assurance' THEN 'quality_assurance'
    WHEN 'pm_change_authority'  THEN 'change_authority'
    WHEN 'pm_project_manager'   THEN 'project_manager'
    WHEN 'pm_programme_manager' THEN 'programme_manager'
    WHEN 'pm_team_lead'         THEN 'team_lead'
    ELSE v_legacy_role_name
  END;

  SELECT pr.id INTO v_project_role_id
  FROM project_roles pr
  WHERE pr.is_template = TRUE
    AND pr.project_id  IS NULL
    AND pr.is_active   = TRUE
    AND pr.role_name   = v_mapped_role_name
  LIMIT 1;

  IF v_project_role_id IS NULL AND v_legacy_role_name IS NOT NULL THEN
    SELECT pr.id INTO v_project_role_id
    FROM project_roles pr
    WHERE pr.is_template = TRUE
      AND pr.project_id  IS NULL
      AND pr.is_active   = TRUE
      AND pr.role_name   = v_legacy_role_name
    LIMIT 1;
  END IF;

  IF EXISTS (
    SELECT 1 FROM project_memberships pm
    WHERE pm.project_id = v_invitation.project_id
      AND pm.user_id    = p_accepting_user_id
      AND pm.is_active  = TRUE
  ) THEN
    UPDATE project_memberships
    SET project_role_id   = COALESCE(v_project_role_id, project_role_id),
        invitation_status = 'accepted',
        accepted_at       = COALESCE(accepted_at, NOW()),
        updated_at        = NOW()
    WHERE project_id = v_invitation.project_id
      AND user_id    = p_accepting_user_id
      AND is_active  = TRUE;
  ELSE
    INSERT INTO project_memberships (
      project_id, user_id, project_role_id,
      invitation_status, accepted_at, is_active
    )
    VALUES (
      v_invitation.project_id, p_accepting_user_id, v_project_role_id,
      'accepted', NOW(), TRUE
    );
  END IF;

  UPDATE project_invitations
  SET invitation_status   = 'accepted',
      accepted_at         = NOW(),
      accepted_by_user_id = p_accepting_user_id,
      updated_at          = NOW()
  WHERE id = v_invitation.id;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.accept_project_invitation(VARCHAR, UUID) IS
  'Accepts a project invitation. SECURITY DEFINER (v620). '
  'Backfills auth_user_id from JWT so all auth_user_id-based queries work (v622). '
  'Always writes project_memberships for all role types (v621). '
  'Idempotent: same user re-accepting repairs missing membership (v619/v621).';
