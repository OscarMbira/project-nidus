-- ============================================================================
-- Pending Invitation Lookup by Email (unauthenticated, pre-signup)
-- Version: v982
-- Description: Backs the "I was invited" branch of the new registration entry-choice
--   screen (projectplan/v982_saas_user_journey_account_pmo_delivery_plan.md, Phase 1,
--   task A). A prospective user who knows they were invited but doesn't have the link
--   handy can enter their email and get told whether a pending invitation exists and
--   which organisation it's for — nothing else.
-- Author: Development Team
-- Date: 2026-08-24
--
-- Security note (decision 5 in the plan): this RPC is intentionally minimal. It never
-- returns an invitation token, invitation id, inviter identity, or any other field an
-- unauthenticated caller could use to act on (accept/decline/resend) the invitation
-- directly. Resend stays exclusively inside the authenticated/token-bearing
-- /i/:token accept flow. Granted to `anon` because it is called from a pre-auth
-- screen by design.
--
-- Schema note: only `public` gets this function. Both apps' invitationService.js
-- (apps/platform and apps/simulator) import `appDb`, which both resolve to
-- `platformDb` (public schema) per packages/supabase — confirmed no
-- sim.organisation_invitations / sim.project_invitations tables exist. Organisation
-- and project invitations are shared cross-app via the public schema already, so a
-- sim-schema duplicate would be dead code, not parity. See plan task A note.
--
-- Database Table Registration Rule: N/A — this file creates a function only, no new
-- table, so no database_tables insert is required.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_pending_invitation_by_email(p_email TEXT)
RETURNS TABLE (
  found BOOLEAN,
  organisation_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT := lower(trim(coalesce(p_email, '')));
  v_org_name TEXT;
BEGIN
  IF v_email = '' OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT;
    RETURN;
  END IF;

  -- Organisation-scoped invitations (PMO Admin / org role invites) first — these are
  -- the ones this branch of the entry-choice screen is primarily for.
  SELECT COALESCE(a.account_display_name, a.account_name, a.company_name)
  INTO v_org_name
  FROM public.organisation_invitations oi
  JOIN public.accounts a ON a.id = oi.organisation_id
  WHERE lower(oi.invited_email) = v_email
    AND oi.invitation_status = 'pending'
    AND oi.is_deleted = FALSE
    AND (oi.invitation_expires_at IS NULL OR oi.invitation_expires_at > NOW())
  ORDER BY oi.invitation_sent_at DESC
  LIMIT 1;

  IF v_org_name IS NOT NULL THEN
    RETURN QUERY SELECT TRUE, v_org_name;
    RETURN;
  END IF;

  -- Fall back to project-scoped invitations (a person invited straight onto a
  -- project without a separate org-level invite) — resolve the owning
  -- organisation's name via the project's account.
  SELECT COALESCE(a.account_display_name, a.account_name, a.company_name)
  INTO v_org_name
  FROM public.project_invitations pi
  JOIN public.projects p ON p.id = pi.project_id
  JOIN public.accounts a ON a.id = p.account_id
  WHERE lower(pi.invited_email) = v_email
    AND pi.invitation_status = 'pending'
    AND pi.is_deleted = FALSE
    AND (pi.invitation_expires_at IS NULL OR pi.invitation_expires_at > NOW())
  ORDER BY pi.invitation_sent_at DESC
  LIMIT 1;

  IF v_org_name IS NOT NULL THEN
    RETURN QUERY SELECT TRUE, v_org_name;
    RETURN;
  END IF;

  RETURN QUERY SELECT FALSE, NULL::TEXT;
END;
$$;

COMMENT ON FUNCTION public.check_pending_invitation_by_email(TEXT) IS
  'Pre-auth lookup for the registration entry-choice screen "I was invited" branch (v982). '
  'Returns only {found, organisation_name} — never a token/id, by design (no resend vector).';

GRANT EXECUTE ON FUNCTION public.check_pending_invitation_by_email(TEXT) TO anon, authenticated;

DO $$
BEGIN
  RAISE NOTICE 'v982: check_pending_invitation_by_email() installed (public schema only — see file header)';
END $$;
