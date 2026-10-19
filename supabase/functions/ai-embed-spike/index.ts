/**
 * v1272 Phase 2b — ai-embed-spike: D22a feasibility spike only. Embeds texts with an open
 * multilingual model (multilingual-e5-small via transformers.js) so the meaning-search eval can
 * compare it with gte-small. Never writes to the database; production embeddings stay in ai-embed.
 *
 *   POST { texts: string[] } → { model, vectors, ms, memory_mb }     (x-ai-cron-secret header)
 *
 * Kept separate from ai-embed because the transformers.js package is large: if it cannot be
 * bundled or exceeds edge memory, that is itself the spike's answer, and ai-embed is unaffected.
 * Deploy only for the spike: supabase functions deploy ai-embed-spike --no-verify-jwt
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { errorResponse, json } from '../_shared/http.ts'
import { requireCronSecret } from '../_shared/auth.ts'

const MODEL = 'multilingual-e5-small'
// deno-lint-ignore no-explicit-any
let extractor: any = null

async function spikeEmbed(text: string): Promise<number[]> {
  if (!extractor) {
    const { pipeline } = await import('npm:@huggingface/transformers@3.2.4')
    extractor = await pipeline('feature-extraction', 'Xenova/multilingual-e5-small')
  }
  const out = await extractor(`query: ${text}`, { pooling: 'mean', normalize: true })
  return Array.from(out.data as ArrayLike<number>)
}

serve(async (req) => {
  try {
    if (req.method !== 'POST') return json(req, 405, { error: 'Method not allowed' })
    requireCronSecret(req)
    const body = await req.json().catch(() => ({}))
    const texts: string[] = Array.isArray(body.texts) ? body.texts.slice(0, 200).map((t: unknown) => String(t)) : []
    const started = Date.now()
    const vectors = []
    for (const t of texts) vectors.push(await spikeEmbed(t))
    // deno-lint-ignore no-explicit-any
    const memory = (Deno as any).memoryUsage?.().rss
    return json(req, 200, { model: MODEL, vectors, ms: Date.now() - started, memory_mb: memory ? Math.round(memory / 1048576) : null })
  } catch (err) {
    return errorResponse(req, err)
  }
})
