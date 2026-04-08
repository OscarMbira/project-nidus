/**
 * aiAssistantService.js
 * Orchestrates the AI assistant (NotebookLM-style, no Ollama):
 *   - Data queries → Supabase-first (fetchContextStructured) + template / Claude / Gemini summary
 *   - Generic queries → Google Gemini 1.5 Flash (free tier)
 * Persists conversations and messages to Supabase.
 */

import { platformDb } from './supabase/supabaseClient'
import { classifyQuery } from '../utils/queryRouter'
import { detectModules } from '../utils/intentDetector'
import { fetchContextStructured } from '../utils/contextFetcher'
import { buildTemplateAnswer } from '../utils/dataAnswerTemplates'
import { fetchDocContext } from '../utils/docFetcher'

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''
const AI_DATA_SUMMARY_URL = import.meta.env.VITE_AI_DATA_SUMMARY_URL || ''
const AI_DOCS_URL = import.meta.env.VITE_AI_DOCS_URL || ''

// ─────────────────────────────────────────────────────────────────────────────
// Conversation management
// ─────────────────────────────────────────────────────────────────────────────

/** Get or create the active conversation for a user */
export async function getActiveConversation(userId) {
  const { data, error } = await platformDb
    .from('ai_conversations')
    .select('id, title, project_id, created_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .eq('domain', 'platform')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[AI] getActiveConversation error:', error)
    return null
  }
  return data || null
}

/** Load all messages for a conversation */
export async function loadMessages(conversationId) {
  try {
    const { data } = await platformDb
      .from('ai_messages')
      .select('id, role, content, processed_by, context_modules, structured_data, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    return data || []
  } catch {
    return []
  }
}

/** List past conversations for the history sidebar */
export async function listConversations(userId) {
  try {
    const { data } = await platformDb
      .from('ai_conversations')
      .select('id, title, project_id, is_active, created_at, updated_at')
      .eq('user_id', userId)
      .eq('domain', 'platform')
      .order('updated_at', { ascending: false })
      .limit(20)

    return data || []
  } catch {
    return []
  }
}

/** Create a new conversation and deactivate any existing active ones.
 *  Returns { id, error } so callers can surface the exact failure reason. */
export async function createConversation(userId, projectId = null) {
  // Deactivate current active conversation (best-effort, ignore errors)
  await platformDb
    .from('ai_conversations')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('is_active', true)
    .eq('domain', 'platform')

  const { data, error } = await platformDb
    .from('ai_conversations')
    .insert({
      user_id: userId,
      project_id: projectId || null,
      domain: 'platform',
      is_active: true,
      title: null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[AI] createConversation error:', error)
    return { id: null, error }
  }
  return { id: data?.id || null, error: null }
}

/** Switch to an existing conversation */
export async function switchConversation(userId, conversationId) {
  try {
    await platformDb
      .from('ai_conversations')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('is_active', true)

    await platformDb
      .from('ai_conversations')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('id', conversationId)
      .eq('user_id', userId)

    return true
  } catch {
    return false
  }
}

/** Update conversation title (Phase 5.2 — auto-title from first message, max 50 chars) */
export async function updateConversationTitle(conversationId, title) {
  if (!conversationId || !title) return
  const truncated = String(title).slice(0, 50)
  try {
    await platformDb
      .from('ai_conversations')
      .update({ title: truncated, updated_at: new Date().toISOString() })
      .eq('id', conversationId)
  } catch (e) {
    console.warn('[AI] updateConversationTitle error:', e)
  }
}

/** Save a single message to DB */
export async function saveMessage(conversationId, role, content, processedBy = null, modules = [], structuredData = null) {
  try {
    const { data } = await platformDb
      .from('ai_messages')
      .insert({
        conversation_id: conversationId,
        role,
        content,
        processed_by: processedBy,
        context_modules: modules.length > 0 ? modules : null,
        structured_data: structuredData ?? null,
      })
      .select('id')
      .single()

    // Auto-title the conversation from the first user message (Phase 5.2 — 50 chars)
    if (role === 'user') {
      await platformDb
        .from('ai_conversations')
        .update({
          title: content.slice(0, 50),
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId)
        .is('title', null)
    }

    return data?.id || null
  } catch {
    return null
  }
}

/** Save user feedback (thumbs up/down) on a message */
export async function saveMessageFeedback(messageId, userId, rating) {
  try {
    await platformDb
      .from('ai_feedback')
      .upsert({ message_id: messageId, user_id: userId, rating },
               { onConflict: 'message_id,user_id' })
    return true
  } catch {
    return false
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AI engine calls (no Ollama — data path uses Supabase + template / Edge / Gemini)
// ─────────────────────────────────────────────────────────────────────────────

const GEMINI_TIMEOUT_MS = 30_000

// Gemini base URL (everything before the model name)
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta'

// Preferred models newest-first. First available one wins.
const GEMINI_MODEL_PREFERENCE = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
]

// Cached model name for this browser session — avoids repeated ListModels calls.
let resolvedGeminiModel = null

/** Create an AbortController that auto-cancels after `ms` milliseconds. */
function timedAbort(ms) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  // Clear the timer if the request completes before the timeout
  controller.signal.addEventListener('abort', () => clearTimeout(timer), { once: true })
  return controller
}

/**
 * Get org AI settings (data_answer_mode). Returns 'template' if no org or not found.
 */
export async function getOrgAiSettings(orgId) {
  if (!orgId) return { data_answer_mode: 'template' }
  try {
    const { data } = await platformDb
      .from('ai_settings')
      .select('data_answer_mode')
      .eq('organisation_id', orgId)
      .maybeSingle()
    return { data_answer_mode: data?.data_answer_mode || 'template' }
  } catch {
    return { data_answer_mode: 'template' }
  }
}

/**
 * Call Edge Function ai-data-summary or fallback to Gemini for data summary.
 * history: last N { role, content } pairs for follow-up context.
 */
async function callDataSummary(formattedText, question, mode, onChunk, history = []) {
  // Build conversation history block for context-aware follow-ups
  const historyBlock = history.length > 0
    ? `\n\nConversation so far:\n${history.map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')}\n`
    : ''

  if (AI_DATA_SUMMARY_URL) {
    const res = await fetch(AI_DATA_SUMMARY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formattedText, question, mode, history }),
    })
    if (!res.ok) throw new Error(`Data summary failed: ${res.status}`)
    const json = await res.json()
    const answer = json?.answer ?? ''
    if (onChunk) onChunk(answer)
    return answer
  }
  // Dev fallback: Gemini with data + conversation history
  const prompt = `You are a project management assistant. Answer the user's question using ONLY the records explicitly listed below. IMPORTANT RULES: (1) Only count or reference records that appear in full in the data. (2) Never assume a field is empty or null for a record unless that record's data is fully shown and the field is absent or blank. (3) If the data says "showing X of Y total", only count or assert about the X shown — do not extrapolate to Y. Do not invent data.${historyBlock}\nCurrent data:\n${formattedText.slice(0, 40000)}\n\nQuestion: ${question}`
  const answer = await callGemini(prompt)
  if (onChunk) onChunk(answer)
  return answer
}

/** Returns true when the question is asking to filter or aggregate by a field value */
function isFilterQuestion(question) {
  const q = question.toLowerCase()
  return /\b(type|status|category|role|priority|have|with|where|whose|filter|group|breakdown|by|of those|of them)\b/.test(q)
    || /=/.test(q)
}

/**
 * Call Edge Function ai-docs or fallback to Gemini for docs-based answer (Phase 1.5).
 */
async function callDocsSummary(chunks, formattedText, question, onChunk) {
  if (AI_DOCS_URL) {
    const res = await fetch(AI_DOCS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chunks, question }),
    })
    if (!res.ok) throw new Error(`Docs summary failed: ${res.status}`)
    const json = await res.json()
    const answer = json?.answer ?? ''
    if (onChunk) onChunk(answer)
    return answer
  }
  const prompt = `Using ONLY the following documentation excerpts, answer the user's question. Do not use external knowledge.\n\n${formattedText.slice(0, 20000)}\n\nQuestion: ${question}`
  const answer = await callGemini(prompt)
  if (onChunk) onChunk(answer)
  return answer
}

/**
 * Discover the best available Gemini model for this API key.
 * Calls ListModels once and caches the result for the session.
 * Returns the model name (e.g. 'gemini-2.0-flash') or throws if none found.
 */
async function discoverGeminiModel() {
  if (resolvedGeminiModel) return resolvedGeminiModel

  const abort = timedAbort(10_000)
  let listData
  try {
    const res = await fetch(`${GEMINI_BASE}/models?key=${GEMINI_KEY}`, { signal: abort.signal })
    listData = await res.json()
  } catch {
    // Network error during discovery — fall through to preference list without filtering
    listData = null
  }

  if (listData?.models?.length) {
    // Build a set of available model base-names (strip "models/" prefix)
    const available = new Set(
      listData.models
        .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m) => m.name.replace('models/', ''))
    )
    const match = GEMINI_MODEL_PREFERENCE.find((m) => available.has(m))
    if (match) {
      resolvedGeminiModel = match
      console.info('[AI] Gemini model resolved via ListModels:', match)
      return match
    }
  }

  // Fallback: use the first entry in the preference list without validation
  resolvedGeminiModel = GEMINI_MODEL_PREFERENCE[0]
  console.warn('[AI] ListModels unavailable — defaulting to:', resolvedGeminiModel)
  return resolvedGeminiModel
}

/**
 * Call Gemini for a generic knowledge question (no project data).
 * Auto-discovers the current model — never needs a .env update.
 */
async function callGemini(question) {
  if (!GEMINI_KEY) {
    throw new Error('Gemini API key not set. Add VITE_GEMINI_API_KEY to .env.development.')
  }

  const model = await discoverGeminiModel()
  const url = `${GEMINI_BASE}/models/${model}:generateContent?key=${GEMINI_KEY}`

  const abort = timedAbort(GEMINI_TIMEOUT_MS)
  let response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: question }] }],
        generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
      }),
      signal: abort.signal,
    })
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Gemini timed out after 30s.')
    throw new Error(`Gemini network error: ${err.message}`)
  }

  if (response.status === 404) {
    // Chosen model was deprecated — clear cache and try once more with discovery
    resolvedGeminiModel = null
    throw new Error('Gemini model not found — will retry with latest model on next message.')
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const msg = body?.error?.message || response.statusText
    throw new Error(`Gemini error ${response.status}: ${msg}`)
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response received from Gemini.'
}

// ─────────────────────────────────────────────────────────────────────────────
// Main send function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Send a message through the AI pipeline (data path = Supabase-first, no Ollama).
 *
 * @param {Object} params
 * @param {string} params.question        - User's question
 * @param {string} params.conversationId   - Current conversation ID
 * @param {string} params.userId           - Authenticated user ID
 * @param {string} [params.projectId]     - Currently selected project
 * @param {string} [params.orgId]          - User's organisation ID
 * @param {Object} [params.userInfo]       - { userName, orgName, role }
 * @param {Array}  [params.history]        - Prior messages for context
 * @param {Function} params.onChunk       - Called with partial text during streaming
 * @returns {Promise<{ content: string, engine: string, modules: string[], structured?: Record<string, unknown[]> }>}
 */
export async function sendMessage({
  question,
  conversationId,
  userId,
  projectId = null,
  orgId = null,
  userInfo = {},
  history = [],
  onChunk,
  onStatus = () => {},
}) {
  const { engine } = classifyQuery(question)
  const modules = engine === 'data' ? detectModules(question) : []

  if (engine === 'docs') {
    onStatus('Searching documentation…')
    let chunks = []
    let formattedText = ''
    try {
      const docResult = await fetchDocContext(question)
      chunks = docResult.chunks || []
      formattedText = docResult.formattedText || ''
    } catch (err) {
      console.warn('[AI] fetchDocContext error:', err)
    }
    if (chunks.length === 0) {
      onStatus('Waiting for AI…')
      const content = await callGemini(question)
      if (onChunk) onChunk(content)
      await saveMessage(conversationId, 'assistant', content, 'external', [])
      return { content, engine: 'external', modules: [] }
    }
    onStatus('Waiting for AI…')
    const content = await callDocsSummary(chunks, formattedText, question, onChunk)
    const structuredDocs = chunks.map((c) => ({ doc_title: c.doc_title, doc_filename: c.doc_filename, doc_route: c.doc_route }))
    const structuredPayload = { modules: { docs: structuredDocs }, row_count: chunks.length }
    await saveMessage(conversationId, 'assistant', content, 'docs', ['docs'], structuredPayload)
    return { content, engine: 'docs', modules: ['docs'], structured: { docs: structuredDocs } }
  }

  if (engine === 'data') {
    onStatus('Gathering context…')
    let formattedText = ''
    let structured = {}

    try {
      const result = await fetchContextStructured(modules, userId, projectId, orgId, question)
      formattedText = result.formattedText || ''
      structured = result.structured || {}
    } catch (err) {
      console.warn('[AI] fetchContextStructured error:', err)
    }

    const rowCount = Object.values(structured).reduce((sum, rows) => sum + (Array.isArray(rows) ? rows.length : 0), 0)

    if (rowCount === 0 && !formattedText.trim()) {
      const content = 'No matching records found in your data. Try a different question or check your project selection.'
      onChunk(content)
      await saveMessage(conversationId, 'assistant', content, 'data', modules, { modules: structured, row_count: 0 })
      return { content, engine: 'data', modules, structured }
    }

    const { data_answer_mode: mode } = await Promise.race([
      getOrgAiSettings(orgId),
      new Promise((resolve) => setTimeout(() => resolve({ data_answer_mode: 'template' }), 5_000)),
    ])
    let content = ''

    // Template mode: simple count summary — but fall through to Gemini for
    // filter/aggregate questions (type=X, status=Y, "how many have…", etc.)
    // or when there is conversation history that needs to be used for follow-ups.
    const needsGemini = mode !== 'template' || isFilterQuestion(question) || history.length > 0

    if (!needsGemini) {
      content = buildTemplateAnswer(modules, structured)
      if (onChunk) onChunk(content)
    } else {
      onStatus('Waiting for AI…')
      const aiMode = mode === 'claude' ? 'claude' : 'gemini'
      content = await callDataSummary(formattedText, question, aiMode, onChunk, history)
    }

    const structuredPayload = { modules: structured, row_count: rowCount }
    await saveMessage(conversationId, 'assistant', content, 'data', modules, structuredPayload)

    return { content, engine: 'data', modules, structured }
  }

  // Generic PM knowledge — Gemini, no project data
  onStatus('Waiting for AI…')
  const content = await callGemini(question)
  if (onChunk) onChunk(content)
  await saveMessage(conversationId, 'assistant', content, 'external', [])

  return { content, engine: 'external', modules: [] }
}
