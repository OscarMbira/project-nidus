-- ============================================================================
-- v748: Collaborative Team mode — targeted role invites (Phase F.2, deferred
-- at Phase F time, built now)
-- PostgreSQL 15+ / Supabase
-- Prerequisites: v741/v742 (team seats), v743 (collaborative sessions/
--                participants), v747 (user_has_active_team_seat)
-- @see projectplan/v736_Simulator_Team_And_Collaborative_Mode_Plan.md (F.2)
-- Idempotent: CREATE OR REPLACE. Safe to re-run.
--
-- WHAT WAS MISSING
-- Role claiming was open self-service only — anyone reaching a session's
-- link who held an active Team seat (anywhere, not even the same Team
-- subscription) could claim an open role. This adds the other half F.2
-- described: a session creator can reserve a role for one specific
-- teammate, who then gets an accept/decline prompt instead of the role
-- being generally claimable. Open self-service claiming is UNCHANGED and
-- still works for roles nobody has specifically invited someone to — this
-- is additive, not a replacement.
--
-- WHY INVITES TARGET A user_id, NOT AN EMAIL
-- Unlike Team seat invites (v742), which invite someone who may not have an
-- account yet, a collaborative session invite can only target someone who
-- ALREADY holds an active Team seat (collaborative_session_participants.
-- user_id is NOT NULL — there's no "pending, not yet a real user" state in
-- this table, unlike team_subscription_seats). So "invite a teammate" means
-- picking from people who already have claimed seats, not typing an email.
--
-- WHO CAN BE INVITED: "MY TEAM", DEFINED AS SHARING A team_subscription_id
-- get_team_members_for_invite() resolves teammates via the session's
-- team_subscription_id if set, falling back to the CALLER's own claimed
-- seat's team_subscription_id if the session wasn't created with one
-- (sessions created before this file, or via the API without passing it).
-- This also tightens a latent scoping gap from v747: that file's
-- user_has_active_team_seat() check is global (any Team seat, anywhere)
-- since collaborative sessions were never scoped to one organisation's
-- roster. Targeted invites ARE scoped to one team_subscription_id -- if you
-- want open-claim tightened to "same team only" too, that's a further
-- change to join_collaborative_session_role() beyond what F.2 asked for.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_team_members_for_invite(p_session_id UUID)
RETURNS TABLE (user_id UUID, seat_id UUID, invited_email VARCHAR)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_team_subscription_id UUID;
BEGIN
    SELECT cs.team_subscription_id INTO v_team_subscription_id
    FROM sim.collaborative_sessions cs
    WHERE cs.id = p_session_id;

    IF v_team_subscription_id IS NULL THEN
        SELECT tss.team_subscription_id INTO v_team_subscription_id
        FROM sim.team_subscription_seats tss
        WHERE tss.user_id = auth.uid() AND tss.status = 'claimed'
        LIMIT 1;
    END IF;

    IF v_team_subscription_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT tss.user_id, tss.id, tss.invited_email
    FROM sim.team_subscription_seats tss
    WHERE tss.team_subscription_id = v_team_subscription_id
      AND tss.status = 'claimed'
      AND tss.user_id <> auth.uid()
      AND tss.user_id NOT IN (
          SELECT csp.user_id FROM sim.collaborative_session_participants csp
          WHERE csp.session_id = p_session_id AND csp.status IN ('invited', 'joined')
      );
END;
$$;

COMMENT ON FUNCTION get_team_members_for_invite(UUID) IS
'Teammates (same Team subscription as the session, or the caller''s own if the session has none set) who are not already invited/joined to this session — the invite picker''s candidate list.';

GRANT EXECUTE ON FUNCTION get_team_members_for_invite(UUID) TO authenticated;

-- ── invite_collaborative_session_role ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION invite_collaborative_session_role(
    p_session_id UUID,
    p_role TEXT,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session sim.collaborative_sessions;
    v_existing sim.collaborative_session_participants;
BEGIN
    SELECT * INTO v_session FROM sim.collaborative_sessions WHERE id = p_session_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Session not found');
    END IF;

    IF v_session.created_by <> auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only the session creator can invite teammates to a role');
    END IF;

    IF v_session.status <> 'forming' THEN
        RETURN jsonb_build_object('success', false, 'error', 'This session is no longer accepting participants');
    END IF;

    IF p_role NOT IN ('portfolio_manager', 'programme_manager', 'project_manager') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid role');
    END IF;

    IF NOT sim.user_has_active_team_seat(p_user_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'That person does not hold an active Team seat');
    END IF;

    IF EXISTS (
        SELECT 1 FROM sim.collaborative_session_participants
        WHERE session_id = p_session_id AND role = p_role AND status = 'joined'
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'That role is already filled');
    END IF;

    SELECT * INTO v_existing
    FROM sim.collaborative_session_participants
    WHERE session_id = p_session_id AND role = p_role AND status = 'invited';

    IF FOUND AND v_existing.user_id <> p_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'This role is already reserved for a different teammate — cancel that invite first');
    END IF;

    IF EXISTS (
        SELECT 1 FROM sim.collaborative_session_participants
        WHERE session_id = p_session_id AND user_id = p_user_id AND role <> p_role
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'That person is already invited to a different role in this session');
    END IF;

    INSERT INTO sim.collaborative_session_participants (session_id, user_id, role, status)
    VALUES (p_session_id, p_user_id, p_role, 'invited')
    ON CONFLICT (session_id, user_id) DO UPDATE SET
        role = EXCLUDED.role,
        status = 'invited',
        joined_at = NULL;

    RETURN jsonb_build_object('success', true, 'role', p_role, 'userId', p_user_id);
END;
$$;

COMMENT ON FUNCTION invite_collaborative_session_role(UUID, TEXT, UUID) IS
'Creator reserves an open role for a specific teammate. Reserved roles are no longer open to self-service claiming by anyone else (see join_collaborative_session_role below) until accepted, declined, or cancelled.';

GRANT EXECUTE ON FUNCTION invite_collaborative_session_role(UUID, TEXT, UUID) TO authenticated;

-- ── cancel_collaborative_session_invite ───────────────────────────────────────
CREATE OR REPLACE FUNCTION cancel_collaborative_session_invite(
    p_session_id UUID,
    p_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM sim.collaborative_sessions
        WHERE id = p_session_id AND created_by = auth.uid()
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only the session creator can cancel an invite');
    END IF;

    DELETE FROM sim.collaborative_session_participants
    WHERE session_id = p_session_id AND role = p_role AND status = 'invited';

    RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION cancel_collaborative_session_invite(UUID, TEXT) TO authenticated;

-- ── decline_collaborative_session_invite ──────────────────────────────────────
CREATE OR REPLACE FUNCTION decline_collaborative_session_invite(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM sim.collaborative_session_participants
    WHERE session_id = p_session_id AND user_id = auth.uid() AND status = 'invited';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'No pending invite found for you in this session');
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION decline_collaborative_session_invite(UUID) TO authenticated;

-- ── join_collaborative_session_role: aware of targeted invites now ───────────
-- Extends the version from v745/v747 with two new cases: accepting a
-- targeted invite (row already exists for ME), and being blocked from
-- open-claiming a role someone ELSE was specifically invited to.
CREATE OR REPLACE FUNCTION join_collaborative_session_role(
    p_session_id UUID,
    p_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session sim.collaborative_sessions;
    v_role_row sim.collaborative_session_participants;
    v_my_row sim.collaborative_session_participants;
BEGIN
    IF NOT sim.user_has_active_team_seat(auth.uid()) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Collaborative sessions require an active Team subscription seat');
    END IF;

    SELECT * INTO v_session FROM sim.collaborative_sessions WHERE id = p_session_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Session not found');
    END IF;

    IF v_session.status <> 'forming' THEN
        RETURN jsonb_build_object('success', false, 'error', 'This session is no longer accepting participants');
    END IF;

    IF p_role NOT IN ('portfolio_manager', 'programme_manager', 'project_manager') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid role');
    END IF;

    SELECT * INTO v_role_row
    FROM sim.collaborative_session_participants
    WHERE session_id = p_session_id AND role = p_role AND status IN ('invited', 'joined');

    IF FOUND THEN
        IF v_role_row.status = 'joined' THEN
            RETURN jsonb_build_object('success', false, 'error', 'That role is already taken');
        END IF;
        -- status = 'invited': only the targeted person may accept it.
        IF v_role_row.user_id <> auth.uid() THEN
            RETURN jsonb_build_object('success', false, 'error', 'This role has been reserved for another teammate');
        END IF;
        UPDATE sim.collaborative_session_participants
        SET status = 'joined', joined_at = NOW()
        WHERE id = v_role_row.id;
        RETURN jsonb_build_object('success', true, 'role', p_role);
    END IF;

    -- Role is genuinely open. If I already have a different row in this
    -- session (e.g. switching roles), move it; otherwise insert fresh.
    SELECT * INTO v_my_row
    FROM sim.collaborative_session_participants
    WHERE session_id = p_session_id AND user_id = auth.uid();

    IF FOUND THEN
        UPDATE sim.collaborative_session_participants
        SET role = p_role, status = 'joined', joined_at = NOW()
        WHERE id = v_my_row.id;
    ELSE
        INSERT INTO sim.collaborative_session_participants (session_id, user_id, role, status, joined_at)
        VALUES (p_session_id, auth.uid(), p_role, 'joined', NOW());
    END IF;

    RETURN jsonb_build_object('success', true, 'role', p_role);
END;
$$;

DO $$ BEGIN RAISE NOTICE 'v748_sim_collaborative_targeted_invites.sql completed'; END $$;
