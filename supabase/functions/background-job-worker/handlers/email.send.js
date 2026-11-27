/**
 * v1352 Slice 2 (2.1) — handler for catalogue job `email.send`: the email outbox. One queue item = one email,
 * queued by public.queue_email (SQL jobs, triggers, RPCs) or by another handler through ctx.rpc('queue_email').
 *
 * Payload: { to, subject, html } (ready HTML) or { to, subject, body, practice } (plain text, built here).
 * Retry, back-off, `dead` after max_attempts / expiry and single-item replay come from the v1352 queue
 * (background_job_item_complete) — this handler only sends and reports the result.
 */
import { buildNoticeEmail } from '../email.js'

const looksLikeEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())

export async function handle(payload, ctx) {
  const to = String(payload?.to || '').trim()
  const subject = String(payload?.subject || '').trim()
  if (!looksLikeEmail(to) || !subject || (!payload?.html && !payload?.body)) {
    return { error: 'Outbox email needs to, subject and html or body' }
  }
  const message = payload.html
    ? { subject, html: String(payload.html) }
    : buildNoticeEmail({ subject, body: payload.body, practice: Boolean(payload.practice) })

  const res = await ctx.invokeFunction('send-email', { to, subject: message.subject, html: message.html })
  if (!res.ok || res.data?.success === false) {
    return { error: `send-email returned ${res.status}: ${res.data?.error || 'no detail'}` }
  }
  return { processed: 1, message_id: res.data?.message_id || null }
}
