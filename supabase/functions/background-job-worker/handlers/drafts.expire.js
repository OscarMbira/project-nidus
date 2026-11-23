/**
 * v1352 — handler for catalogue job `drafts.expire` (edge function expire-drafts, which had no schedule).
 * Wraps the existing function unchanged; its own per-step errors stay in its result.
 */
export async function handle(_payload, ctx) {
  const res = await ctx.invokeFunction('expire-drafts', {})
  if (!res.ok || res.data?.success === false) {
    return { error: `expire-drafts returned ${res.status}: ${res.data?.error || 'no detail'}` }
  }
  const r = res.data?.results || {}
  return {
    processed: (Number(r.expiredPlatform) || 0) + (Number(r.expiredSimulator) || 0) + (Number(r.warningsSent) || 0),
    results: r,
  }
}
