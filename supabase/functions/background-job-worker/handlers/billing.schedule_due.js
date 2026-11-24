/**
 * v1353 — catalogue job billing.schedule_due.
 * The daily tick and a completed milestone enqueue this handler.
 * It calls public.billing_schedule_due, which adds the due lines to a draft invoice.
 */
export async function handle(payload, ctx) {
  const res = await ctx.rpc('billing_schedule_due', { p_context: payload || {} })
  if (res.error) return { error: res.error.message }
  return { processed: Number(res.data) || 0 }
}
