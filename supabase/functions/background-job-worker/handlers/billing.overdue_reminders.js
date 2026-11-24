/**
 * v1353 — catalogue job billing.overdue_reminders.
 * public.billing_overdue_pending prepares one email per invoice per reminder step (7, 14, 30 days).
 * This handler sends those emails and marks the step sent, so the next day does not repeat it.
 */
export async function handle(_payload, ctx) {
  const listed = await ctx.rpc('billing_overdue_pending', {})
  if (listed.error) return { error: listed.error.message }
  const items = Array.isArray(listed.data) ? listed.data : []
  let sent = 0
  for (const item of items) {
    if (!item?.to || !item?.send_id) continue
    const res = await ctx.invokeFunction('send-email', { to: item.to, subject: item.subject, html: item.html })
    if (!res.ok || res.data?.success === false) {
      return { error: `send-email returned ${res.status}: ${res.data?.error || 'no detail'}`, sent }
    }
    const marked = await ctx.rpc('billing_mark_reminder_sent', { p_send_id: item.send_id })
    if (marked.error) ctx.log?.(`[billing.overdue_reminders] sent but not marked: ${marked.error.message}`)
    sent += 1
  }
  return { processed: sent }
}
