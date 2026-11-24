/**
 * v1352 Slice 1 (2.2, D6) — handler for catalogue job `notifications.digest_send`: one daily digest email.
 * Queued by public.run_daily_digest, at most once per person per local day (dedupe key), with
 * { user_id, to, name, date_label, items: [{ id, title, message, practice }], notification_ids }.
 * After the email goes out the notices are marked as emailed (public.notifications_digest_mark_sent), so
 * the next digest does not repeat them. A failed send is retried by the queue's back-off.
 */
import { buildDigestEmail } from '../email.js'

export async function handle(payload, ctx) {
  const { user_id: userId, to } = payload || {}
  const items = Array.isArray(payload?.items) ? payload.items : []
  if (!userId || !to || items.length === 0) return { error: 'Digest item needs user_id, to and items' }

  const { subject, html } = buildDigestEmail(payload)
  const res = await ctx.invokeFunction('send-email', { to, subject, html })
  if (!res.ok || res.data?.success === false) {
    return { error: `send-email returned ${res.status}: ${res.data?.error || 'no detail'}` }
  }

  const ids = Array.isArray(payload.notification_ids) && payload.notification_ids.length
    ? payload.notification_ids
    : items.map((i) => i.id).filter(Boolean)
  const marked = await ctx.rpc('notifications_digest_mark_sent', { p_user_id: userId, p_ids: ids })
  // The email has gone: never fail (and resend) because the marking failed; log it instead.
  if (marked.error) ctx.log?.(`[notifications.digest_send] could not mark notices as emailed: ${marked.error.message}`)
  return { processed: 1, items: items.length, message_id: res.data?.message_id || null }
}
