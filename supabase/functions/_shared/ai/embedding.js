/**
 * v1272 Phase 2b — meaning search helpers (PRD D21–D25). Pure; the model call is in ../embed.ts.
 */

export const EMBED_DIMENSIONS = 384

/** pgvector text literal for an embedding. Throws on a wrong size or a non-number. */
export function toVectorLiteral(values) {
  const arr = Array.from(values || [])
  if (arr.length !== EMBED_DIMENSIONS) throw new Error(`Expected ${EMBED_DIMENSIONS} dimensions, got ${arr.length}`)
  if (arr.some((v) => typeof v !== 'number' || !Number.isFinite(v))) throw new Error('Embedding contains a non-number')
  return `[${arr.map((v) => Number(v.toFixed(7))).join(',')}]`
}

export function cosine(a, b) {
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0
}

const EN_STOP = new Set(['the', 'and', 'of', 'to', 'in', 'is', 'for', 'on', 'with', 'that', 'be', 'by', 'are', 'this',
  'as', 'it', 'at', 'from', 'or', 'will', 'not', 'have', 'has', 'was', 'we', 'an', 'our', 'may', 'due', 'need'])

/**
 * Rough language guess for the Admin "non-English share" figure (D22a): 'en' when English
 * stop-words make up a normal share of the words, 'other' otherwise, null when too short to tell.
 */
export function guessLanguage(text) {
  const words = String(text || '').toLowerCase().match(/\p{L}+/gu) || []
  if (words.length < 6) return null
  const hits = words.filter((w) => EN_STOP.has(w)).length
  return hits / words.length >= 0.08 ? 'en' : 'other'
}

/**
 * Meaning-only matches need a high similarity to count as a possible duplicate: gte-small gives
 * unrelated sentences fairly high cosine scores. Keyword overlap counts from any level.
 */
export const DUPLICATE_MIN_MEANING = 0.86

export function isDuplicateCandidate(hit) {
  if (!hit) return false
  if (hit.matched === 'reference') return true
  if (Number(hit.keyword_similarity) > 0) return true
  return Number(hit.similarity) >= DUPLICATE_MIN_MEANING
}

/** Recall@k for a labelled near-duplicate set: share of queries whose expected match is in the top k. */
export function recallAtK(queries, k = 5) {
  if (!queries.length) return 0
  const found = queries.filter((q) => (q.ranked || []).slice(0, k).includes(q.expected)).length
  return found / queries.length
}
