/**
 * v1352 — handler for catalogue job `ai.embed` (was pg_cron nidus_ai_embed, SQL v1284).
 * Calls the existing ai-embed edge function with the same AI_CRON_SECRET header.
 * The tick only queues this job when public.ai_embed_has_work() is true.
 *
 * Small batches: one ai-embed call with the original 40 rows / 45 s exceeded the edge runtime's CPU limit
 * (HTTP 546, first live run 2026-11-23), so the worker asks for a few rows per call. The payload may
 * override { limit, budgetMs }; the backlog drains over successive runs.
 */
export const DEFAULT_LIMIT = 3
export const DEFAULT_BUDGET_MS = 5_000

export async function handle(payload, ctx) {
  const body = {
    limit: Number(payload?.limit) || DEFAULT_LIMIT,
    budgetMs: Number(payload?.budgetMs) || DEFAULT_BUDGET_MS,
  }
  const res = await ctx.invokeFunction('ai-embed', body, { headers: { 'x-ai-cron-secret': ctx.env('AI_CRON_SECRET') || '' } })
  if (!res.ok) {
    if (res.status === 546) {
      return { error: `ai-embed hit the edge runtime resource limit (546) with ${body.limit} rows; lower the limit` }
    }
    return { error: `ai-embed returned ${res.status}: ${res.data?.error || 'no detail'}` }
  }
  if (res.data?.skipped) return { processed: 0, skipped: res.data.skipped }
  const result = res.data?.result || {}
  const stored = Object.values(result).reduce((n, r) => n + (Number(r?.stored) || 0), 0)
  return { processed: stored, result, ms: res.data?.ms }
}
