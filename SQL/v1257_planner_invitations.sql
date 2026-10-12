-- ============================================================================
-- v1257: Project Planner invitations and members — v1239 Slice 7.2
-- Uses the existing project_invitations table (v85). Planner-only RPCs; the Platform invite path
-- (accept-invitation Edge Function, get_project_invite_context) is not touched, and these RPCs
-- refuse Platform-edition projects, so a Platform invite never creates or changes a planner
-- account and vice versa (story 7.3).
--
--   planner_invite_member(project, email, role)   owner / project manager; member limit; 7-day token
--   planner_invite_context(token)                 what the accept page shows
--   planner_accept_invite(token)                  membership + project-scoped role; no new account
--   planner_list_members(project)                 members + pending invitations
--   planner_remove_member(project, user)          deactivates membership and project roles
-- Roles offered: project_manager, team_member, plan_viewer (D11; pmo_admin is not offered).
-- Run after v1247 and v1252. Idempotent.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.planner_can_manage_project(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  WITH me AS (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1)
  SELECT EXISTS (SELECT 1 FROM public.projects p JOIN public.accounts a ON a.id = p.account_id, me
                  WHERE p.id = p_project_id AND a.owner_user_id = me.id)
      OR EXISTS (SELECT 1 FROM public.project_memberships m JOIN public.project_roles pr ON pr.id = m.project_role_id, me
                  WHERE m.project_id = p_project_id AND m.user_id = me.id AND m.is_active AND pr.role_name = 'project_manager');
$$;

CREATE OR REPLACE FUNCTION public.planner_invite_member(p_project_id UUID, p_email TEXT, p_role_name TEXT DEFAULT 'team_member')
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_me UUID := (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1);
  v_project RECORD;
  v_email TEXT := lower(btrim(p_email));
  v_role UUID;
  v_token TEXT;
  v_max INT;
  v_used INT;
  v_existing UUID;
  v_invite UUID;
BEGIN
  IF p_role_name NOT IN ('project_manager', 'team_member', 'plan_viewer') THEN RAISE EXCEPTION 'Choose Project manager, Team member or Viewer'; END IF;
  IF v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN RAISE EXCEPTION 'Enter a valid email address'; END IF;
  SELECT p.id, p.project_name, p.account_id, a.product_edition INTO v_project
    FROM public.projects p JOIN public.accounts a ON a.id = p.account_id WHERE p.id = p_project_id;
  IF v_project.id IS NULL THEN RAISE EXCEPTION 'Project not found'; END IF;
  IF v_project.product_edition <> 'planner' THEN RAISE EXCEPTION 'Use the full PMIS to invite people to this project' USING ERRCODE = '42501'; END IF;
  IF NOT public.planner_can_manage_project(p_project_id) THEN RAISE EXCEPTION 'Only the account owner or the project manager can invite people' USING ERRCODE = '42501'; END IF;
  IF NOT public.auth_user_account_can_write(v_project.account_id) THEN RAISE EXCEPTION 'PLANNER_READ_ONLY: your trial has ended. Upgrade to invite people.' USING ERRCODE = 'P0001'; END IF;
  IF EXISTS (SELECT 1 FROM public.project_memberships m JOIN public.users u ON u.id = m.user_id
              WHERE m.project_id = p_project_id AND m.is_active AND lower(u.email) = v_email) THEN
    RAISE EXCEPTION 'That person is already on this project';
  END IF;

  -- Seats: active members across the account + other pending invitations.
  v_max := public.planner_limit_value(v_project.account_id, 'max_members');
  IF v_max IS NOT NULL THEN
    SELECT COUNT(*) INTO v_used FROM (
      SELECT lower(u.email) AS e FROM public.project_memberships m JOIN public.projects p ON p.id = m.project_id JOIN public.users u ON u.id = m.user_id
       WHERE p.account_id = v_project.account_id AND m.is_active
      UNION
      SELECT lower(i.invited_email) FROM public.project_invitations i JOIN public.projects p ON p.id = i.project_id
       WHERE p.account_id = v_project.account_id AND i.invitation_status = 'pending' AND COALESCE(i.is_deleted, FALSE) = FALSE
         AND i.invitation_expires_at > NOW()
    ) seats WHERE e <> v_email;
    IF v_used >= v_max THEN
      RAISE EXCEPTION 'PLANNER_LIMIT: your plan allows % member(s). Add seats to invite more.', v_max USING ERRCODE = 'P0001';
    END IF;
  END IF;

  SELECT id INTO v_role FROM public.roles WHERE role_name = p_role_name AND account_id IS NULL AND is_active LIMIT 1;
  IF v_role IS NULL THEN RAISE EXCEPTION 'Role % is not set up — run v1252', p_role_name; END IF;
  -- 2 × 122 random bits from core gen_random_uuid() (pgcrypto is not on this search_path).
  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

  SELECT id INTO v_existing FROM public.project_invitations
   WHERE project_id = p_project_id AND lower(invited_email) = v_email AND invitation_status = 'pending' AND COALESCE(is_deleted, FALSE) = FALSE
   LIMIT 1;
  IF v_existing IS NOT NULL THEN
    UPDATE public.project_invitations
       SET invitation_token = v_token, role_id = v_role, invitation_sent_at = NOW(),
           invitation_expires_at = NOW() + INTERVAL '7 days', updated_at = NOW(), updated_by = v_me,
           invitation_metadata = COALESCE(invitation_metadata, '{}'::jsonb) || jsonb_build_object('source', 'planner', 'role_name', p_role_name)
     WHERE id = v_existing;
    v_invite := v_existing;
  ELSE
    INSERT INTO public.project_invitations (project_id, invited_email, invited_user_id, role_id, invited_by_user_id, invitation_token,
                                            invitation_status, invitation_sent_at, invitation_expires_at, invitation_metadata, created_by)
    VALUES (p_project_id, v_email, (SELECT id FROM public.users WHERE lower(email) = v_email LIMIT 1), v_role, v_me, v_token,
            'pending', NOW(), NOW() + INTERVAL '7 days', jsonb_build_object('source', 'planner', 'role_name', p_role_name), v_me)
    RETURNING id INTO v_invite;
  END IF;

  INSERT INTO public.audit_log (table_name, record_id, action, action_details, performed_by)
  VALUES ('project_invitations', v_invite, 'planner_invite_sent', jsonb_build_object('project_id', p_project_id, 'email', v_email, 'role', p_role_name), v_me);

  RETURN jsonb_build_object('invitation_id', v_invite, 'token', v_token, 'project_name', v_project.project_name,
                            'expires_at', NOW() + INTERVAL '7 days');
END;
$$;

CREATE OR REPLACE FUNCTION public.planner_invite_context(p_token TEXT)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  SELECT jsonb_build_object(
    'project_name', p.project_name,
    'account_name', a.account_name,
    'invited_email', i.invited_email,
    'invited_by', COALESCE(u.full_name, u.email),
    'role_name', i.invitation_metadata ->> 'role_name',
    'status', CASE WHEN i.invitation_status = 'pending' AND i.invitation_expires_at <= NOW() THEN 'expired' ELSE i.invitation_status END
  )
  FROM public.project_invitations i
  JOIN public.projects p ON p.id = i.project_id
  JOIN public.accounts a ON a.id = p.account_id
  LEFT JOIN public.users u ON u.id = i.invited_by_user_id
  WHERE i.invitation_token = p_token AND COALESCE(i.is_deleted, FALSE) = FALSE
    AND i.invitation_metadata ->> 'source' = 'planner';
$$;

CREATE OR REPLACE FUNCTION public.planner_accept_invite(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_inv RECORD;
  v_email TEXT;
  v_me UUID;
  v_role_name TEXT;
  v_project_role UUID;
  v_code TEXT;
  v_account UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to accept the invitation' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_inv FROM public.project_invitations
   WHERE invitation_token = p_token AND COALESCE(is_deleted, FALSE) = FALSE AND invitation_metadata ->> 'source' = 'planner'
   FOR UPDATE;
  IF v_inv.id IS NULL THEN RAISE EXCEPTION 'This invitation link is not valid'; END IF;
  IF v_inv.invitation_status <> 'pending' THEN RAISE EXCEPTION 'This invitation has already been %', v_inv.invitation_status; END IF;
  IF v_inv.invitation_expires_at <= NOW() THEN RAISE EXCEPTION 'This invitation has expired — ask for a new one'; END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF lower(v_email) <> lower(v_inv.invited_email) THEN
    RAISE EXCEPTION 'This invitation was sent to %. Sign in with that email to accept it.', v_inv.invited_email USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_me FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1;
  IF v_me IS NULL THEN
    SELECT u.user_id INTO v_me FROM public.get_or_create_user(p_auth_user_id => auth.uid(), p_email => v_email, p_is_verified => TRUE) u LIMIT 1;
  END IF;

  v_role_name := COALESCE(v_inv.invitation_metadata ->> 'role_name', (SELECT role_name FROM public.roles WHERE id = v_inv.role_id), 'team_member');
  SELECT id INTO v_project_role FROM public.project_roles WHERE role_name = v_role_name AND project_id IS NULL AND is_active ORDER BY created_at LIMIT 1;

  IF EXISTS (SELECT 1 FROM public.project_memberships WHERE project_id = v_inv.project_id AND user_id = v_me) THEN
    UPDATE public.project_memberships SET is_active = TRUE, project_role_id = COALESCE(v_project_role, project_role_id),
           invitation_status = 'accepted', accepted_at = NOW(), updated_at = NOW()
     WHERE project_id = v_inv.project_id AND user_id = v_me;
  ELSE
    INSERT INTO public.project_memberships (project_id, user_id, project_role_id, invited_by_user_id, invitation_status, accepted_at, is_active)
    VALUES (v_inv.project_id, v_me, v_project_role, v_inv.invited_by_user_id, 'accepted', NOW(), TRUE);
  END IF;

  -- Project-scoped system role, so the planner menu grants for that role apply.
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_me AND role_id = v_inv.role_id AND project_id = v_inv.project_id AND is_active) THEN
    INSERT INTO public.user_roles (user_id, role_id, project_id, assigned_by, is_active)
    VALUES (v_me, v_inv.role_id, v_inv.project_id, v_inv.invited_by_user_id, TRUE);
  END IF;

  UPDATE public.project_invitations
     SET invitation_status = 'accepted', accepted_at = NOW(), accepted_by_user_id = v_me, invited_user_id = v_me, updated_at = NOW()
   WHERE id = v_inv.id;

  SELECT project_code, account_id INTO v_code, v_account FROM public.projects WHERE id = v_inv.project_id;
  -- Open the inviting workspace next time (no new account is created for an invitee).
  UPDATE public.users SET last_active_account_id = v_account WHERE id = v_me;

  INSERT INTO public.user_platform_access (user_id, platform, has_registered, registration_date)
  VALUES (auth.uid(), 'planner', TRUE, NOW())
  ON CONFLICT (user_id, platform) DO NOTHING;

  INSERT INTO public.audit_log (table_name, record_id, action, action_details, performed_by)
  VALUES ('project_invitations', v_inv.id, 'planner_invite_accepted', jsonb_build_object('project_id', v_inv.project_id, 'role', v_role_name), v_me);

  RETURN jsonb_build_object('project_id', v_inv.project_id, 'project_code', v_code);
END;
$$;

CREATE OR REPLACE FUNCTION public.planner_list_members(p_project_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
BEGIN
  IF NOT public.auth_user_can_access_project(p_project_id) THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501'; END IF;
  RETURN jsonb_build_object(
    'members', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('user_id', u.id, 'name', COALESCE(u.full_name, u.email), 'email', u.email,
                                          'role_name', pr.role_name, 'joined_at', m.accepted_at, 'created_at', m.created_at)
                       ORDER BY lower(COALESCE(u.full_name, u.email)))
        FROM public.project_memberships m JOIN public.users u ON u.id = m.user_id
        LEFT JOIN public.project_roles pr ON pr.id = m.project_role_id
       WHERE m.project_id = p_project_id AND m.is_active), '[]'::jsonb),
    'invitations', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', i.id, 'email', i.invited_email, 'role_name', i.invitation_metadata ->> 'role_name',
                                          'expires_at', i.invitation_expires_at, 'created_at', i.created_at)
                       ORDER BY lower(i.invited_email))
        FROM public.project_invitations i
       WHERE i.project_id = p_project_id AND i.invitation_status = 'pending' AND COALESCE(i.is_deleted, FALSE) = FALSE
         AND i.invitation_expires_at > NOW()), '[]'::jsonb),
    'can_manage', public.planner_can_manage_project(p_project_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.planner_remove_member(p_project_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_me UUID := (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1);
  v_owner UUID := (SELECT a.owner_user_id FROM public.projects p JOIN public.accounts a ON a.id = p.account_id WHERE p.id = p_project_id);
BEGIN
  IF NOT public.planner_can_manage_project(p_project_id) THEN RAISE EXCEPTION 'Only the account owner or the project manager can remove people' USING ERRCODE = '42501'; END IF;
  IF p_user_id = v_owner THEN RAISE EXCEPTION 'The account owner cannot be removed'; END IF;
  IF p_user_id = v_me THEN RAISE EXCEPTION 'You cannot remove yourself'; END IF;
  UPDATE public.project_memberships SET is_active = FALSE, updated_at = NOW() WHERE project_id = p_project_id AND user_id = p_user_id;
  UPDATE public.user_roles SET is_active = FALSE WHERE project_id = p_project_id AND user_id = p_user_id;
  INSERT INTO public.audit_log (table_name, record_id, action, action_details, performed_by)
  VALUES ('project_memberships', p_project_id, 'planner_member_removed', jsonb_build_object('user_id', p_user_id), v_me);
  RETURN jsonb_build_object('removed', TRUE);
END;
$$;

CREATE OR REPLACE FUNCTION public.planner_cancel_invite(p_invitation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE v_project UUID;
BEGIN
  SELECT project_id INTO v_project FROM public.project_invitations WHERE id = p_invitation_id AND invitation_metadata ->> 'source' = 'planner';
  IF v_project IS NULL OR NOT public.planner_can_manage_project(v_project) THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501'; END IF;
  UPDATE public.project_invitations SET invitation_status = 'cancelled', cancelled_at = NOW(), updated_at = NOW() WHERE id = p_invitation_id;
  RETURN jsonb_build_object('cancelled', TRUE);
END;
$$;

REVOKE ALL ON FUNCTION public.planner_invite_member(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.planner_accept_invite(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.planner_remove_member(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.planner_cancel_invite(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.planner_can_manage_project(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.planner_invite_member(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.planner_invite_context(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.planner_accept_invite(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.planner_list_members(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.planner_remove_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.planner_cancel_invite(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
DO $$ BEGIN RAISE NOTICE 'v1257 applied: planner invitation and member RPCs'; END $$;
