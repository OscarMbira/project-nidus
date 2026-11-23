/**
 * v1352 D4 — handler for catalogue job `system.alert_email`: one grouped alert email for a failed or
 * late background job, queued by the Admin alert hook (Admin SQL v255) with { to, subject, html }.
 * Sent through the existing send-email edge function.
 */
export async function handle(payload, ctx) {
  const { to, subject, html } = payload || {}
  if (!to || !subject || !html) return { error: 'Alert email needs to, subject and html' }
  const res = await ctx.invokeFunction('send-email', { to, subject, html })
  if (!res.ok || res.data?.success === false) {
    return { error: `send-email returned ${res.status}: ${res.data?.error || 'no detail'}` }
  }
  return { processed: 1, message_id: res.data?.message_id || null }
}
