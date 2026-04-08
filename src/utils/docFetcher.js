/**
 * docFetcher.js (Phase 1.5)
 * Fetches documentation chunks from ai_docs_index for "how do I" / docs query path.
 * Uses PostgreSQL array overlap on keywords.
 */

import { platformDb } from '../services/supabase/supabaseClient'

const MAX_CHUNKS = 3

/** Extract significant words from question for keyword overlap (min 3 chars, no pure numbers) */
function questionToKeywords(question) {
  if (!question || typeof question !== 'string') return []
  const words = question
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !/^\d+$/.test(w))
  return [...new Set(words)].slice(0, 30)
}

/**
 * Fetch doc chunks relevant to the question from ai_docs_index.
 * @param {string} question - User question (e.g. "How do I create a mandate?")
 * @returns {Promise<{ chunks: Array<{ doc_title: string, chunk_text: string, doc_filename: string, doc_route: string }>, formattedText: string }>}
 */
export async function fetchDocContext(question) {
  const keywords = questionToKeywords(question)
  if (keywords.length === 0) {
    return { chunks: [], formattedText: '' }
  }

  try {
    const { data, error } = await platformDb
      .from('ai_docs_index')
      .select('doc_title, chunk_text, doc_filename, doc_route')
      .overlaps('keywords', keywords)
      .limit(MAX_CHUNKS)

    if (error) {
      console.warn('[AI] fetchDocContext error:', error)
      return { chunks: [], formattedText: '' }
    }

    const chunks = (data || []).map((row) => ({
      doc_title: row.doc_title ?? '',
      chunk_text: row.chunk_text ?? '',
      doc_filename: row.doc_filename ?? '',
      doc_route: row.doc_route ?? '',
    }))

    const formattedText = chunks
      .map(
        (c) =>
          `[${c.doc_title}]\n${c.chunk_text.slice(0, 2000)}${c.chunk_text.length > 2000 ? '…' : ''}`
      )
      .join('\n\n---\n\n')

    return { chunks, formattedText }
  } catch (err) {
    console.warn('[AI] fetchDocContext exception:', err)
    return { chunks: [], formattedText: '' }
  }
}
