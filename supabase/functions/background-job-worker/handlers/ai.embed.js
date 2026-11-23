/**
 * v1352 — handler for catalogue job `ai.embed` (was pg_cron nidus_ai_embed, SQL v1284).
 * Calls the existing ai-embed edge function with the same AI_CRON_SECRET header.
 * The tick only queues this job when public.ai_embed_has_work() is true.
 *
 * CPU limit: each ai-embed call has its own edge CPU allowance (~0.1 s CPU per row). One call that kept
 * fetching rows for 45 s — or 5 s — exceeded it (HTTP 546, first live runs 2026-11-23). So each call embeds
 * at most `limit` rows and stops, and this handler makes several short calls per run, stopping when the
 * backlog is empty. The payload may override { limit, calls }.
 */
export const DEFAULT_LIMIT = 8
export const DEFAULT_CALLS = 6

function rowsHandled(result) {
  return Object.values(result || {}).reduce(
    (n, r) => n + (Number(r?.stored) || 0) + (Number(r?.changed) || 0) + (Number(r?.failed) || 0), 0)
}

function storedCount(result) {
  return Object.values(result || {}).reduce((n, r) => n + (Number(r?.stored) || 0), 0)
}

export async function handle(payload, ctx) {
  const limit = Number(payload?.limit) || DEFAULT_LIMIT
  const calls = Number(payload?.calls) || DEFAULT_CALLS
  const headers = { 'x-ai-cron-secret': ctx.env('AI_CRON_SECRET') || '' }
  let processed = 0
  let callsMade = 0

  for (let i = 0; i < calls; i += 1) {
    const res = await ctx.invokeFunction('ai-embed', { limit }, { headers })
    callsMade += 1
    if (!res.ok) {
      const reason = res.status === 546
        ? `ai-embed hit the edge runtime resource limit (546) with ${limit} rows; lower the limit`
        : `ai-embed returned ${res.status}: ${res.data?.error || 'no detail'}`
      // Rows already stored in earlier calls are kept; report them with the error.
      return { error: reason, processed, calls: callsMade }
    }
    if (res.data?.skipped) return { processed, skipped: res.data.skipped, calls: callsMade }
    processed += storedCount(res.data?.result)
    if (rowsHandled(res.data?.result) < limit) break // backlog empty
  }
  return { processed, calls: callsMade }
}
