/**
 * v1352 — handler for catalogue job `testers.moratorium_expiry` (edge function admin-moratorium-cron,
 * which had no schedule). Wraps the existing function unchanged.
 */
export async function handle(_payload, ctx) {
  const res = await ctx.invokeFunction('admin-moratorium-cron', {})
  if (!res.ok || res.data?.success === false) {
    return { error: `admin-moratorium-cron returned ${res.status}: ${res.data?.error || 'no detail'}` }
  }
  const results = Array.isArray(res.data?.results) ? res.data.results : []
  return { processed: results.filter((r) => !r?.error).length, results }
}
