/**
 * v1239 Slice 7.2 — the Planner's own invitation email (not the Platform template), sent through
 * the shared `send-email` Edge Function. Pure builder + a sender; exported for tests.
 */
import { platformDb } from '@nidus/supabase'

const esc = (s) => String(s ?? '').replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]))
export const ROLE_LABELS = { project_manager: 'Project manager', team_member: 'Team member', plan_viewer: 'Viewer' }

export function buildInviteEmail({ inviterName, projectName, workspaceName, roleName, link }) {
  const role = ROLE_LABELS[roleName] || 'Team member'
  const subject = `${inviterName || 'Someone'} invited you to "${projectName}" on Nidus Planner`
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#111827;line-height:1.5">
  <h2 style="margin:0 0 12px">You're invited to plan with ${esc(workspaceName || 'a team')}</h2>
  <p>${esc(inviterName || 'A colleague')} invited you to join <strong>${esc(projectName)}</strong> as <strong>${esc(role)}</strong> on Nidus Project Planner.</p>
  <p><a href="${esc(link)}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none">Accept the invitation</a></p>
  <p style="font-size:13px;color:#6b7280">The link works for 7 days. If you don't have an account yet, create one with this email address, then open the link again.</p>
  </body></html>`
  return { subject, html, text: html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() }
}

export async function sendInviteEmail(to, details) {
  const { subject, html, text } = buildInviteEmail(details)
  const { data, error } = await platformDb.functions.invoke('send-email', { body: { to, subject, html, text } })
  if (error || data?.success === false) throw new Error('The invitation was saved, but the email could not be sent. Copy the link and send it yourself.')
  return true
}
