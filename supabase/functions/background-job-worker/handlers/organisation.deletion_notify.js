/**
 * v1358 Slice 3a — handler for `organisation.deletion_notify` (queued when a system admin approves a deletion,
 * and again for the day-5 reminder). Emails the Account Owner a link that confirms the deletion.
 *
 * Payload: { request_id, kind: 'confirm' | 'reminder', token } — the plain token exists only here and in the
 * email; the database keeps its hash. The link opens Data export & deletion in the owner's app:
 *   Platform  <SITE_URL>/platform/organisation/data-export?confirm=<token>
 *   Planner   <PLANNER_SITE_URL or SITE_URL>/app/settings/data?confirm=<token>
 * The owner must be signed in as the Account Owner for the link to work. A request that is no longer waiting
 * for confirmation is skipped (nothing sent).
 */
const escapeHtml = (text) => String(text ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

export function confirmLink(ctx, edition, token) {
  const platform = String(ctx.env('SITE_URL') || '').replace(/\/$/, '')
  if (edition === 'planner') {
    const planner = String(ctx.env('PLANNER_SITE_URL') || platform).replace(/\/$/, '')
    return `${planner}/app/settings/data?confirm=${encodeURIComponent(token)}`
  }
  return `${platform}/platform/organisation/data-export?confirm=${encodeURIComponent(token)}`
}

export function buildEmail(info, link, kind) {
  const org = escapeHtml(info.organisation)
  const subject = kind === 'reminder'
    ? `Reminder: confirm the deletion of ${info.organisation}`
    : `Confirm the deletion of ${info.organisation}`
  const html = [
    `<p>Hello ${escapeHtml(info.owner_name || '')},</p>`,
    `<p>Our support team has approved deletion request <strong>${escapeHtml(info.reference)}</strong> for <strong>${org}</strong>.</p>`,
    '<p>Nothing happens until you confirm. When you confirm:</p>',
    '<ul>',
    `<li>${org} is locked for 30 days: members cannot use it, integrations are switched off and the subscription is cancelled.</li>`,
    '<li>A final export is prepared for you to download.</li>',
    '<li>You can cancel at any time during the 30 days. After that, the data is deleted permanently and cannot be recovered.</li>',
    '</ul>',
    `<p><a href="${escapeHtml(link)}">Confirm the deletion</a> (sign in as the Account Owner). This link works until ${escapeHtml(info.expires)}${kind === 'reminder' ? ' and replaces the link in our earlier email' : ''}.</p>`,
    '<p>If you did not ask for this, do nothing and contact support: the request lapses on its own.</p>',
  ].join('\n')
  return { subject, html }
}

export async function handle(payload, ctx) {
  const requestId = payload?.request_id
  const token = payload?.token
  if (!requestId || !token) return { error: 'request_id and token are required' }
  if (!ctx.env('SITE_URL')) return { error: 'SITE_URL is not set for the worker, so the confirmation link cannot be built' }

  const res = await ctx.rpc('organisation_deletion_notify_context', { p_request_id: requestId })
  if (res.error) return { error: `organisation_deletion_notify_context: ${res.error.message}` }
  const info = res.data || {}
  if (info.skip) return { processed: 0, skipped: info.skip }
  if (!info.owner_email) return { error: 'The organisation has no Account Owner email' }

  const { subject, html } = buildEmail(info, confirmLink(ctx, info.edition, token), payload.kind)
  const sent = await ctx.invokeFunction('send-email', { to: info.owner_email, subject, html })
  if (!sent.ok || sent.data?.success === false) {
    return { error: `send-email ${sent.status}: ${sent.data?.error || 'failed'}` }
  }
  return { processed: 1 }
}
