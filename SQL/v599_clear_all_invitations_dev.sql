-- =============================================================================
-- v599_clear_all_invitations_dev.sql
-- DEV/RESET: Clear all invitation records, related memberships from accepted
-- invites, invitation email logs, bulk drafts, and simulator invite tables.
--
-- Run manually in Supabase SQL Editor (service role) OR via:
--   node scripts/clear-all-invitations-dev.mjs
--
-- Does NOT remove: invitation_message_templates (role message auto-fill),
-- seat purchase history, menu/config, or users/auth accounts.
-- To re-seed templates if missing: v600_restore_invitation_message_templates.sql
-- =============================================================================

BEGIN;

-- ── 1) Revert project access granted via accepted project invitations ─────────
DELETE FROM public.user_roles ur
USING public.project_invitations pi
WHERE pi.invitation_status = 'accepted'
  AND COALESCE(pi.is_deleted, FALSE) = FALSE
  AND pi.project_id IS NOT NULL
  AND ur.project_id = pi.project_id
  AND ur.role_id = pi.role_id
  AND ur.user_id = COALESCE(pi.accepted_by_user_id, pi.invited_user_id);

DELETE FROM public.project_memberships pm
USING public.project_invitations pi
WHERE pi.invitation_status = 'accepted'
  AND COALESCE(pi.is_deleted, FALSE) = FALSE
  AND pi.project_id IS NOT NULL
  AND pm.project_id = pi.project_id
  AND pm.user_id = COALESCE(pi.accepted_by_user_id, pi.invited_user_id);

-- ── 2) Revert organisation-level roles from accepted org invitations ──────────
DELETE FROM public.user_roles ur
USING public.organisation_invitations oi
WHERE oi.invitation_status = 'accepted'
  AND COALESCE(oi.is_deleted, FALSE) = FALSE
  AND ur.user_id = COALESCE(oi.accepted_by_user_id, oi.invited_user_id)
  AND ur.role_id = oi.role_id
  AND ur.project_id IS NULL;

-- ── 3) Invitation-related email logs ──────────────────────────────────────────
DELETE FROM public.email_logs
WHERE subject ILIKE '%invited to join%'
   OR subject ILIKE '%invitation%'
   OR COALESCE(body_html, '') ILIKE '%/auth/invitation%'
   OR COALESCE(body_text, '') ILIKE '%/auth/invitation%'
   OR COALESCE(body_html, '') ILIKE '%invitation expires%'
   OR COALESCE(body_text, '') ILIKE '%invitation expires%';

-- ── 4) Invitation / draft / bulk tables (platform) ───────────────────────────
DELETE FROM public.bulk_invite_drafts;
DELETE FROM public.organisation_invitations;
DELETE FROM public.project_invitations;

-- ── 5) Simulator invitation tables ────────────────────────────────────────────
DELETE FROM sim.entity_invitations;
DELETE FROM sim.bulk_invitations;

-- ── 6) Refresh seat counts for projects that had seat allocations ─────────────
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT project_id FROM public.project_seat_allocations WHERE project_id IS NOT NULL
  LOOP
    PERFORM public.calculate_project_seat_usage(r.project_id);
  END LOOP;
END $$;

COMMIT;
