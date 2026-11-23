/**
 * v1352 Slice 0 — background-job-worker edge function (PRD D2, A1).
 *
 * Woken by the tick (public.run_due_background_jobs → background_job_wake_worker, pg_net) with the
 * x-background-job-secret header; never called by browsers. Drains public.background_job_queue through
 * the handlers in ./handlers (one file per catalogue job code) and records runs for Admin › Background Jobs.
 *
 * Secrets: BACKGROUND_JOB_SECRET (equal to public.background_job_config.worker_secret), plus whatever a
 * handler needs (ai.embed uses AI_CRON_SECRET). Deploy: supabase functions deploy background-job-worker --no-verify-jwt
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createJobContext } from './adapter.ts'
import { runWorker } from './worker.js'
import { handlers } from './handlers/index.js'

function reply(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

serve(async (req) => {
  if (req.method !== 'POST') return reply(405, { error: 'Method not allowed' })
  const expected = Deno.env.get('BACKGROUND_JOB_SECRET') || ''
  if (!expected || req.headers.get('x-background-job-secret') !== expected) return reply(401, { error: 'Not allowed' })
  try {
    const ctx = createJobContext()
    const summary = await runWorker(ctx, handlers, { workerId: `edge-${crypto.randomUUID().slice(0, 8)}` })
    return reply(200, summary)
  } catch (err) {
    console.error('[background-job-worker] failed', err)
    return reply(500, { error: String((err as Error)?.message || err) })
  }
})
