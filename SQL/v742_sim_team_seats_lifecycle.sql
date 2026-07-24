-- ============================================================================
-- v742: Simulator Team seat lifecycle (Use Case 2 — Phase B)
-- PostgreSQL 15+ / Supabase
-- Prerequisites: v741 (team seats schema), v85 (generate_invitation_token),
--                v66 (sim.simulator_subscriptions), v740 (trial cap check)
-- @see projectplan/v736_Simulator_Team_And_Collaborative_Mode_Plan.md (Phase B)
-- Idempotent: CREATE OR REPLACE / ADD COLUMN IF NOT EXISTS. Safe to re-run.
--
-- B.1 invite, B.2 claim (token-based, not email-matching — see below), B.3
-- entitlement wiring. B.4 (team owner dashboard UI) is not part of this file.
--
-- WHY TOKEN-BASED CLAIM, NOT EMAIL-MATCHING
-- v741's plan comment suggested "seat auto-claims on first login matching
-- invited_email." Platform already has a mature, proven invite pattern
-- (project_invitations / organisation_invitations: generate_invitation_token(),
-- validate_invitation_token(), token-in-URL accept flow — see
-- SQL/v85_project_invitations_seats.sql, apps/platform/src/services/
-- invitationService.js). Token-based accept links are more secure and don't
-- require the invitee's signup email to exactly match the invited address.
-- This migration adds token + expiry columns to sim.team_subscription_seats
-- and reuses the existing generate_invitation_token() function rather than
-- inventing a second token generator.
--
-- B.3 DECISION (flagged as open in v741, resolved here): CLAIMING A SEAT
-- SYNTHESIZES a sim.simulator_subscriptions ROW, rather than only extending
-- check_scenario_trial_eligibility. Rationale: the rest of the app
-- (subscriptionService.js's canAccessScenario, SubscriptionAccessGate.jsx,
-- any future tier check) already treats sim.simulator_subscriptions as the
-- single source of truth for "what can this user do" — synthesizing a real
-- row means every one of those checks works correctly for team members with
-- zero further changes, instead of patching each check site individually.
-- The new team_subscription_seat_id link makes the synthesized row easy to
-- find and cancel on revoke, so it never becomes a second, drifting source
-- of truth — claim_team_seat() and revoke_team_seat() are the ONLY places
-- that write it, and they always move together.
-- ============================================================================

-- ── sim.team_subscription_seats: add invite token + expiry ───────────────────
ALTER TABLE sim.team_subscription_seats
    ADD COLUMN IF NOT EXISTS invitation_token VARCHAR UNIQUE,
    ADD COLUMN IF NOT EXISTS invitation_expires_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION sim.trg_team_seats_set_defaults()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.invitation_token IS NULL OR NEW.invitation_token = '' THEN
        NEW.invitation_token := generate_invitation_token();
    END IF;
    IF NEW.invitation_expires_at IS NULL THEN
        NEW.invitation_expires_at := NOW() + INTERVAL '14 days';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_team_seats_defaults ON sim.team_subscription_seats;
CREATE TRIGGER trg_team_seats_defaults
    BEFORE INSERT ON sim.team_subscription_seats
    FOR EACH ROW EXECUTE FUNCTION sim.trg_team_seats_set_defaults();

-- ── sim.simulator_subscriptions: allow 'team' plan_type + link to a seat ─────
ALTER TABLE sim.simulator_subscriptions
    DROP CONSTRAINT IF EXISTS simulator_subscriptions_plan_type_check;

ALTER TABLE sim.simulator_subscriptions
    ADD CONSTRAINT simulator_subscriptions_plan_type_check
    CHECK (plan_type IN (
        'free', 'basic', 'professional', 'enterprise', 'team',
        'lifetime_basic', 'lifetime_professional', 'lifetime_ultimate'
    ));

ALTER TABLE sim.simulator_subscriptions
    ADD COLUMN IF NOT EXISTS team_subscription_seat_id UUID
        REFERENCES sim.team_subscription_seats(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_simulator_subscriptions_team_seat
    ON sim.simulator_subscriptions (team_subscription_seat_id)
    WHERE team_subscription_seat_id IS NOT NULL;

-- ── invite_team_seat ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION invite_team_seat(
    p_team_subscription_id UUID,
    p_email TEXT,
    p_invited_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_inviter UUID := COALESCE(p_invited_by, auth.uid());
    v_seat sim.team_subscription_seats;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM sim.team_subscriptions
        WHERE id = p_team_subscription_id AND owner_user_id = v_inviter
    ) THEN
        RAISE EXCEPTION 'Only the team subscription owner can invite seats';
    END IF;

    IF NOT check_team_seat_available(p_team_subscription_id) THEN
        RAISE EXCEPTION 'No available seats on this team subscription';
    END IF;

    INSERT INTO sim.team_subscription_seats (
        team_subscription_id, invited_email, invited_by, status
    ) VALUES (
        p_team_subscription_id, LOWER(TRIM(p_email)), v_inviter, 'invited'
    )
    RETURNING * INTO v_seat;

    RETURN jsonb_build_object(
        'success', true,
        'seatId', v_seat.id,
        'invitationToken', v_seat.invitation_token,
        'expiresAt', v_seat.invitation_expires_at
    );
END;
$$;

COMMENT ON FUNCTION invite_team_seat(UUID, TEXT, UUID) IS
'Invites a new seat under a Team subscription. Caller must be the subscription owner. Returns the invitation token for email dispatch (email sending itself happens client-side via the send-email Edge Function, same as project invitations).';

GRANT EXECUTE ON FUNCTION invite_team_seat(UUID, TEXT, UUID) TO authenticated;

-- ── claim_team_seat ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION claim_team_seat(
    p_token TEXT,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user UUID := COALESCE(p_user_id, auth.uid());
    v_seat sim.team_subscription_seats;
BEGIN
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'Must be authenticated to claim a seat';
    END IF;

    SELECT * INTO v_seat
    FROM sim.team_subscription_seats
    WHERE invitation_token = p_token
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid invitation token');
    END IF;

    IF v_seat.status <> 'invited' THEN
        RETURN jsonb_build_object('success', false, 'error', 'This invitation is no longer available');
    END IF;

    IF v_seat.invitation_expires_at IS NOT NULL AND v_seat.invitation_expires_at < NOW() THEN
        RETURN jsonb_build_object('success', false, 'error', 'This invitation has expired');
    END IF;

    UPDATE sim.team_subscription_seats
    SET user_id = v_user, status = 'claimed', claimed_at = NOW()
    WHERE id = v_seat.id;

    -- Synthesize the entitlement record every other subscription check reads.
    -- One seat -> one simulator_subscriptions row, linked and kept in sync
    -- only by this function and revoke_team_seat().
    INSERT INTO sim.simulator_subscriptions (
        user_id, plan_type, status, started_at, billing_cycle, team_subscription_seat_id
    ) VALUES (
        v_user, 'team', 'active', NOW(), 'monthly', v_seat.id
    );

    RETURN jsonb_build_object('success', true, 'seatId', v_seat.id, 'teamSubscriptionId', v_seat.team_subscription_id);
END;
$$;

COMMENT ON FUNCTION claim_team_seat(TEXT, UUID) IS
'Claims an invited team seat by token. Sets seat status to claimed and synthesizes an active sim.simulator_subscriptions row (plan_type=team) so existing entitlement checks (check_scenario_trial_eligibility, canAccessScenario, etc.) recognize this user with no further changes.';

GRANT EXECUTE ON FUNCTION claim_team_seat(TEXT, UUID) TO authenticated;

-- ── revoke_team_seat ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION revoke_team_seat(p_seat_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_seat sim.team_subscription_seats;
BEGIN
    SELECT s.* INTO v_seat
    FROM sim.team_subscription_seats s
    JOIN sim.team_subscriptions ts ON ts.id = s.team_subscription_id
    WHERE s.id = p_seat_id
      AND ts.owner_user_id = auth.uid();

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Seat not found or you are not the team subscription owner';
    END IF;

    UPDATE sim.team_subscription_seats
    SET status = 'revoked'
    WHERE id = p_seat_id;

    UPDATE sim.simulator_subscriptions
    SET status = 'cancelled', cancelled_at = NOW()
    WHERE team_subscription_seat_id = p_seat_id
      AND status = 'active';

    RETURN jsonb_build_object('success', true);
END;
$$;

COMMENT ON FUNCTION revoke_team_seat(UUID) IS
'Revokes a team seat (owner-only) and cancels its synthesized simulator_subscriptions row, if any — the two always move together.';

GRANT EXECUTE ON FUNCTION revoke_team_seat(UUID) TO authenticated;

DO $$ BEGIN RAISE NOTICE 'v742_sim_team_seats_lifecycle.sql completed'; END $$;
