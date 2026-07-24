/**
 * Simulator Team seat lifecycle — invite, claim, revoke, list.
 * @see projectplan/v736_Simulator_Team_And_Collaborative_Mode_Plan.md (Phase B)
 *
 * Mirrors apps/platform/src/services/invitationService.js's shape
 * (generate token via DB, dispatch email via the shared 'send-email' Edge
 * Function, non-blocking on email failure) rather than inventing a new
 * pattern — see that file's dispatchProjectInvitationEmail for the fuller
 * project-invite version this deliberately keeps leaner than.
 */
import { simDb } from '../supabase/supabaseClient'
import { getSimAuthUserId } from './simAuth'
import { escapeHtml } from '@nidus/shared/utils/invitationMessageEmailFormat'

const SEND_EMAIL_TIMEOUT_MS = 12_000

function withTimeout(promise, ms, label = 'Operation') {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    }),
  ])
}

/**
 * Invite a new seat under a Team subscription. Owner-only (enforced in the
 * RPC). Non-blocking on email dispatch failure — the seat/token is
 * persisted regardless, same policy as sendProjectInvitation.
 */
export async function inviteTeamSeat(teamSubscriptionId, email, opts = {}) {
  try {
    const authUserId = await getSimAuthUserId()
    const { data, error } = await simDb.rpc('invite_team_seat', {
      p_team_subscription_id: teamSubscriptionId,
      p_email: email,
      p_invited_by: authUserId,
    })
    if (error) return { success: false, error: error.message }

    void dispatchTeamSeatInviteEmail(email, {
      invitationToken: data.invitationToken,
      inviterName: opts.inviterName || 'A team administrator',
      expiresAt: data.expiresAt,
    }).catch((err) => {
      console.warn('[inviteTeamSeat] Email dispatch failed:', err?.message)
    })

    return { success: true, seatId: data.seatId, invitationToken: data.invitationToken }
  } catch (err) {
    console.error('inviteTeamSeat', err)
    return { success: false, error: err.message || 'Failed to invite seat' }
  }
}

/**
 * Claim an invited seat by token. Synthesizes the linked
 * simulator_subscriptions row server-side (see claim_team_seat RPC) — the
 * caller doesn't need to do anything else for the claimed user to be
 * treated as a paid subscriber everywhere else in the app.
 */
export async function claimTeamSeat(token) {
  try {
    const authUserId = await getSimAuthUserId()
    const { data, error } = await simDb.rpc('claim_team_seat', {
      p_token: token,
      p_user_id: authUserId,
    })
    if (error) return { success: false, error: error.message }
    if (!data.success) return { success: false, error: data.error }
    return { success: true, seatId: data.seatId, teamSubscriptionId: data.teamSubscriptionId }
  } catch (err) {
    console.error('claimTeamSeat', err)
    return { success: false, error: err.message || 'Failed to claim seat' }
  }
}

/** Team subscriptions owned by the current user (RLS already scopes this to owner_user_id = auth.uid()). */
export async function getMyTeamSubscriptions() {
  const { data, error } = await simDb
    .from('team_subscriptions')
    .select('id, seat_limit, status, started_at, expires_at, billing_cycle')
    .order('created_at', { ascending: false })
  if (error) return { success: false, error: error.message, data: [] }
  return { success: true, data: data || [] }
}

/** Whether this user currently holds a claimed Team seat — gates Collaborative mode (v736 Phase H). */
export async function hasActiveTeamSeat(userId) {
  const { data, error } = await simDb
    .from('team_subscription_seats')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'claimed')
    .limit(1)
    .maybeSingle()
  if (error) return false
  return Boolean(data)
}

/** Revoke a seat (owner-only, enforced in the RPC). Cancels the linked subscription row too. */
export async function revokeTeamSeat(seatId) {
  try {
    const { data, error } = await simDb.rpc('revoke_team_seat', { p_seat_id: seatId })
    if (error) return { success: false, error: error.message }
    return { success: Boolean(data?.success) }
  } catch (err) {
    console.error('revokeTeamSeat', err)
    return { success: false, error: err.message || 'Failed to revoke seat' }
  }
}

/** List all seats for a team subscription (RLS already scopes this to the owner or the seat's own claimed user). */
export async function listTeamSeats(teamSubscriptionId) {
  const { data, error } = await simDb
    .from('team_subscription_seats')
    .select('id, invited_email, user_id, status, invited_at, claimed_at, invitation_expires_at')
    .eq('team_subscription_id', teamSubscriptionId)
    .order('invited_at', { ascending: false })
  if (error) return { success: false, error: error.message, data: [] }
  return { success: true, data: data || [] }
}

function buildClaimUrl(token) {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}/simulator/team/claim?token=${encodeURIComponent(token)}`
}

/**
 * Send the seat-invite email (non-blocking caller pattern — see inviteTeamSeat).
 * Deliberately leaner than dispatchProjectInvitationEmail in invitationService.js:
 * no project context / appointment terms apply to a Team seat invite.
 */
async function dispatchTeamSeatInviteEmail(email, { invitationToken, inviterName, expiresAt }) {
  const claimUrl = buildClaimUrl(invitationToken)
  const expiryDays = expiresAt
    ? Math.max(1, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : 14

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <tr><td style="background:#065f46;padding:32px 40px;">
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Project Nidus Simulator</h1>
          <p style="margin:8px 0 0;color:#a7f3d0;font-size:14px;">Team seat invitation</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <h2 style="margin:0 0 16px;color:#111827;font-size:20px;">You've been given a Simulator seat</h2>
          <p style="color:#374151;line-height:1.6;margin:0 0 16px;">
            <strong>${escapeHtml(inviterName)}</strong> has invited you to a licensed seat on their
            Project Nidus Simulator Team subscription — full access to Portfolio/Programme/Project
            Manager practice scenarios.
          </p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${claimUrl}" style="background:#065f46;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-size:16px;font-weight:600;display:inline-block;">
              Claim your seat
            </a>
          </div>
          <p style="color:#9ca3af;font-size:12px;text-align:center;margin:12px 0 0;">
            Button not working? <a href="${claimUrl}" style="color:#065f46;">Click here to claim your seat</a>
          </p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;">
          <p style="color:#6b7280;font-size:13px;margin:0;">
            This invitation expires in <strong>${expiryDays} days</strong>. If you didn't expect this email, you can safely ignore it.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

  const text = [
    "You've been given a Project Nidus Simulator team seat",
    '',
    `${inviterName} has invited you to a licensed seat on their Simulator Team subscription.`,
    '',
    'Claim your seat:',
    claimUrl,
    '',
    `This invitation expires in ${expiryDays} days.`,
  ].join('\n')

  try {
    const { error } = await withTimeout(
      simDb.functions.invoke('send-email', {
        body: {
          to: email,
          subject: "You've been invited to a Project Nidus Simulator Team seat",
          html,
          text,
          template_id: 'sim_team_seat_invite',
        },
      }),
      SEND_EMAIL_TIMEOUT_MS,
      'send-email',
    )
    if (error) console.warn('[dispatchTeamSeatInviteEmail] Email send failed:', error)
  } catch (err) {
    console.warn('[dispatchTeamSeatInviteEmail] Email function threw:', err?.message)
  }
}

export default {
  inviteTeamSeat,
  claimTeamSeat,
  revokeTeamSeat,
  listTeamSeats,
  getMyTeamSubscriptions,
  hasActiveTeamSeat,
}
