/**
 * v1352 Slice 0 — background job worker core (PRD D2, A1). Host-neutral: no Deno or Supabase APIs here.
 *
 * The worker claims ready queue items (public.background_job_claim: FOR UPDATE SKIP LOCKED, run_after,
 * per-job batch size and per-organisation cap are applied in SQL), runs each item's handler and reports
 * the result (public.background_job_item_complete: back-off or dead). One run row is written per job
 * per claimed batch (background_job_run_start / _run_finish), so Admin › Background Jobs shows it.
 *
 * Handler interface: handle(payload, ctx) → { processed?: number, error?: string, ...anything }.
 * Throwing or returning `error` marks the item as failed. `ctx` comes from the adapter (adapter.ts) —
 * the only module that talks to the database client.
 */

export const DEFAULT_CLAIM_LIMIT = 50
export const DEFAULT_TIME_BUDGET_MS = 45_000

function message(err) {
  return String(err?.message || err || 'Failed').slice(0, 4000)
}

async function call(ctx, fn, args) {
  const { data, error } = await ctx.rpc(fn, args)
  if (error) throw new Error(`${fn}: ${error.message || error}`)
  return data
}

/** Group claimed items by job code, keeping claim order. */
export function groupByJob(items) {
  const groups = new Map()
  for (const item of items || []) {
    if (!groups.has(item.job_code)) groups.set(item.job_code, [])
    groups.get(item.job_code).push(item)
  }
  return groups
}

/** Run one job's claimed items under one run row. */
export async function processJobBatch(ctx, handlers, jobCode, items) {
  const runId = await call(ctx, 'background_job_run_start', { p_job_code: jobCode, p_context: { items: items.length } })
  const handler = handlers[jobCode]
  let processed = 0
  let dead = 0
  let retrying = 0
  let lastError = null
  for (const item of items) {
    let outcome
    try {
      if (!handler || typeof handler.handle !== 'function') throw new Error(`No handler is registered for ${jobCode}`)
      outcome = (await handler.handle(item.payload || {}, ctx)) || {}
      if (outcome.error) throw new Error(outcome.error)
      processed += Number(outcome.processed) || 0
      await call(ctx, 'background_job_item_complete', {
        p_item_id: item.id, p_ok: true, p_error: null, p_result: outcome, p_run_id: runId,
      })
    } catch (err) {
      lastError = message(err)
      ctx.log?.(`[background-job-worker] ${jobCode} item ${item.id} failed: ${lastError}`)
      const status = await call(ctx, 'background_job_item_complete', {
        p_item_id: item.id, p_ok: false, p_error: lastError, p_result: null, p_run_id: runId,
      })
      if (status === 'dead') dead += 1
      else retrying += 1
    }
  }
  const status = await call(ctx, 'background_job_run_finish', {
    p_run_id: runId, p_processed: processed, p_dead: dead, p_retrying: retrying,
    p_error: lastError, p_result: { items: items.length, processed, dead, retrying },
  })
  return { jobCode, runId, items: items.length, processed, dead, retrying, status }
}

/**
 * Drain the queue until it is empty or the time budget is used. Safe to run several workers at once:
 * the claim hands each item to one worker only.
 */
export async function runWorker(ctx, handlers, options = {}) {
  const {
    workerId = 'worker',
    claimLimit = DEFAULT_CLAIM_LIMIT,
    timeBudgetMs = DEFAULT_TIME_BUDGET_MS,
    now = () => Date.now(),
  } = options
  const started = now()
  const batches = []
  while (now() - started < timeBudgetMs) {
    const items = await call(ctx, 'background_job_claim', { p_worker_id: workerId, p_limit: claimLimit })
    if (!items || items.length === 0) break
    for (const [jobCode, jobItems] of groupByJob(items)) {
      batches.push(await processJobBatch(ctx, handlers, jobCode, jobItems))
    }
    if (items.length < claimLimit) break
  }
  return {
    batches,
    claimed: batches.reduce((n, b) => n + b.items, 0),
    processed: batches.reduce((n, b) => n + b.processed, 0),
    ms: now() - started,
  }
}
