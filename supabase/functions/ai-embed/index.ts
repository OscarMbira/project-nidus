/**
 * v1272 Phase 2b — ai-embed: background embedding worker (PRD D24). Called every 2 minutes by
 * pg_cron (SQL v1284 → ai_embed_kick) with the x-ai-cron-secret header; never by browsers.
 *
 *   POST {}                                   embed waiting search_index rows (public + sim) in batches
 *   POST { mode: 'eval', texts }              return gte-small embeddings for the meaning-search eval
 *                                             (scripts/ai-eval) — same secret. The D22a multilingual spike
 *                                             is a separate function, ai-embed-spike.
 *
 * A row is stored only if its text has not changed while it was being embedded; failures are
 * retried up to 3 times, then shown in Admin → AI Centre → Meaning Search.
 * Deploy: supabase functions deploy ai-embed --no-verify-jwt   (auth is the cron secret)
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { errorResponse, json } from '../_shared/http.ts'
import { requireCronSecret, serviceDb } from '../_shared/auth.ts'
import { embed, EMBED_MODEL } from '../_shared/embed.ts'
import { guessLanguage, toVectorLiteral } from '../_shared/ai/embedding.js'

const BATCH = 40
const TIME_BUDGET_MS = 45_000

serve(async (req) => {
  try {
    if (req.method !== 'POST') return json(req, 405, { error: 'Method not allowed' })
    requireCronSecret(req)
    const body = await req.json().catch(() => ({}))
    const db = serviceDb('public')

    if (body?.mode === 'eval') {
      const texts: string[] = Array.isArray(body.texts) ? body.texts.slice(0, 200).map((t: unknown) => String(t)) : []
      const started = Date.now()
      const vectors = []
      for (const t of texts) vectors.push(await embed(t))
      // deno-lint-ignore no-explicit-any
      const memory = (Deno as any).memoryUsage?.().rss
      return json(req, 200, { model: EMBED_MODEL, vectors, ms: Date.now() - started, memory_mb: memory ? Math.round(memory / 1048576) : null })
    }

    const { data: settings } = await db.from('ai_platform_settings').select('kill_switch').eq('id', true).maybeSingle()
    if (settings?.kill_switch) return json(req, 200, { skipped: 'kill switch on' })

    const started = Date.now()
    const result: Record<string, { stored: number; changed: number; failed: number }> = {}
    for (const schema of ['public', 'sim']) {
      const counts = { stored: 0, changed: 0, failed: 0 }
      result[schema] = counts
      while (Date.now() - started < TIME_BUDGET_MS) {
        const { data: rows, error } = await db.rpc('ai_embed_pending', { p_schema: schema, p_limit: BATCH })
        if (error) throw error
        if (!rows?.length) break
        for (const row of rows) {
          if (Date.now() - started >= TIME_BUDGET_MS) break
          try {
            const vector = toVectorLiteral(await embed(row.embed_text))
            const { data: ok, error: storeError } = await db.rpc('ai_embed_store', {
              p_schema: schema, p_id: row.id, p_hash: row.content_hash, p_embedding: vector,
              p_model: EMBED_MODEL, p_lang: guessLanguage(row.embed_text),
            })
            if (storeError) throw storeError
            if (ok) counts.stored += 1
            else counts.changed += 1
          } catch (err) {
            counts.failed += 1
            await db.rpc('ai_embed_failed', { p_schema: schema, p_id: row.id, p_error: String((err as Error)?.message || err) })
          }
        }
        if (rows.length < BATCH) break
      }
    }
    return json(req, 200, { result, ms: Date.now() - started })
  } catch (err) {
    return errorResponse(req, err)
  }
})
