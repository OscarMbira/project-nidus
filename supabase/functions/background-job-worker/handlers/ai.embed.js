/**
 * v1352 — handler for catalogue job `ai.embed` (was pg_cron nidus_ai_embed, SQL v1284).
 * Wraps the existing ai-embed edge function unchanged: same call, same AI_CRON_SECRET header.
 * The tick only queues this job when public.ai_embed_has_work() is true.
 */
export async function handle(_payload, ctx) {
  const res = await ctx.invokeFunction('ai-embed', {}, { headers: { 'x-ai-cron-secret': ctx.env('AI_CRON_SECRET') || '' } })
  if (!res.ok) return { error: `ai-embed returned ${res.status}: ${res.data?.error || 'no detail'}` }
  if (res.data?.skipped) return { processed: 0, skipped: res.data.skipped }
  const result = res.data?.result || {}
  const stored = Object.values(result).reduce((n, r) => n + (Number(r?.stored) || 0), 0)
  return { processed: stored, result, ms: res.data?.ms }
}
