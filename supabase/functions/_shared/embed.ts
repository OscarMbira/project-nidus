/**
 * v1272 Phase 2b — text embeddings with Supabase's built-in edge-runtime model (PRD D22): gte-small,
 * 384 dimensions, no API key, no per-call cost, text stays in our infrastructure.
 * The model name is stored with every embedding (search_index.embedding_model) so it can be
 * swapped later through a background re-embed (D22a).
 */
import { toVectorLiteral } from './ai/embedding.js'

// deno-lint-ignore no-explicit-any
declare const Supabase: any

export const EMBED_MODEL = 'gte-small'

// deno-lint-ignore no-explicit-any
let session: any = null

export async function embed(text: string): Promise<number[]> {
  session ??= new Supabase.ai.Session(EMBED_MODEL)
  const output = await session.run(String(text).slice(0, 4000), { mean_pool: true, normalize: true })
  return Array.from(output as ArrayLike<number>)
}

/** Embedding as a pgvector literal, or null when the model is unavailable (callers fall back to keyword search). */
export async function embedLiteral(text: string): Promise<string | null> {
  try {
    return toVectorLiteral(await embed(text))
  } catch (err) {
    console.warn('[embed] meaning search unavailable, using keywords only', (err as Error)?.message)
    return null
  }
}
