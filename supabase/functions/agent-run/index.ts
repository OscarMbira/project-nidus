/**
 * v1272 — agent-run: Ask Nidus (PRD stories 12–23, 27d/27e, 28; D1–D4, D10, D16, D18).
 *
 * POST { app: 'platform'|'simulator'|'planner', question, conversation_id?, project_id?, project_name? }
 * Response: text/event-stream of JSON events
 *   { type: 'status', text }                         progress ("Looking up risks…")
 *   { type: 'table', result }                        an ai_run_query result to render
 *   { type: 'search', text, hits } | { type: 'docs', excerpts }
 *   { type: 'answer', text }
 *   { type: 'done', conversation_id, message_id, credits }
 *   { type: 'error', error }
 * Blocked (kill switch, consent, credits, planner read-only) → 403 JSON { error, code, reason }.
 *
 * Shared by Platform, Simulator (sim schema) and Planner (planner catalogue scope).
 * Replaces the old ai-chat / ai-data-summary / ai-docs / ai-knowledge functions.
 * Deploy: supabase functions deploy agent-run
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders, errorResponse, json, preflight } from '../_shared/http.ts'
import { normaliseApp } from '../_shared/auth.ts'
import { startAiRun } from '../_shared/aiRun.ts'
import { modelFor, responseText } from '../_shared/anthropic.ts'
import { runAgentLoop } from '../_shared/ai/agentLoop.js'
import { executeTool, toolsFor } from '../_shared/ai/tools.js'
import { buildAskNidusSystem, toolStatus } from '../_shared/ai/prompts.js'
import { embedLiteral } from '../_shared/embed.ts'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const HISTORY_TURNS = 10
const STORED_ROWS = 200

serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre
  if (req.method !== 'POST') return json(req, 405, { error: 'Method not allowed' })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json(req, 400, { error: 'Your request could not be read.' })
  }
  const question = String(body.question || '').trim()
  if (!question) return json(req, 400, { error: 'Please type a question.' })
  if (question.length > 4000) return json(req, 400, { error: 'Please keep questions under 4,000 characters.' })
  const app = normaliseApp(body.app)
  const projectId = typeof body.project_id === 'string' && UUID_RE.test(body.project_id) ? body.project_id : null
  const conversationIn = typeof body.conversation_id === 'string' && UUID_RE.test(body.conversation_id) ? body.conversation_id : null

  let run
  try {
    run = await startAiRun(req, { app, agent: 'ask_nidus', projectId, conversationId: conversationIn, question })
  } catch (err) {
    return errorResponse(req, err)
  }
  if (run.blocked) return json(req, 403, run.blocked)

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      const results: Array<Record<string, unknown>> = []
      try {
        send({ type: 'status', text: 'Thinking…' })

        // Conversation (RLS: users manage their own) ---------------------------------
        let conversationId = conversationIn
        if (conversationId) {
          const { data } = await run.db.from('ai_conversations').select('id').eq('id', conversationId).maybeSingle()
          if (!data) conversationId = null
        }
        if (!conversationId) {
          const row: Record<string, unknown> = {
            user_id: run.user.userId,
            title: question.slice(0, 80),
            organisation_id: run.accountId,
          }
          if (run.schema === 'public') {
            row.project_id = projectId
            row.domain = app
          }
          const { data, error } = await run.db.from('ai_conversations').insert(row).select('id').single()
          if (error) throw error
          conversationId = data.id
        }
        run.setConversation(conversationId)

        const [{ data: history }, { data: catalogue, error: catErr }, { data: lang }] = await Promise.all([
          run.db.from('ai_messages').select('role, content').eq('conversation_id', conversationId)
            .order('created_at', { ascending: false }).limit(HISTORY_TURNS * 2),
          run.db.rpc('ai_catalogue_for_session'),
          run.publicDb.from('languages').select('code, name').eq('code', run.languageCode).maybeSingle(),
        ])
        if (catErr) throw catErr

        await run.db.from('ai_messages').insert({ conversation_id: conversationId, role: 'user', content: question })

        // Route: quick model for simple look-ups, agent model for multi-step questions (D1)
        let tier: 'quick' | 'agent' = 'agent'
        try {
          const routed = await run.call({
            tier: 'routing',
            max_tokens: 400,
            output_config: { effort: 'low' },
            system: 'Classify the user question for a project data assistant. Reply with exactly one word: "simple" if it needs one straightforward lookup or count, otherwise "complex".',
            messages: [{ role: 'user', content: question }],
          })
          if (/\bsimple\b/i.test(responseText(routed))) tier = 'quick'
        } catch (e) {
          console.warn('[agent-run] routing failed, using agent model', e)
        }

        const system = buildAskNidusSystem({
          app,
          catalogue,
          context: {
            today: new Date().toISOString().slice(0, 10),
            userName: run.userName,
            projectId,
            projectName: typeof body.project_name === 'string' ? body.project_name.slice(0, 200) : null,
            languageName: lang?.name,
            languageCode: run.languageCode,
          },
        })

        const prior = (history || []).reverse().map((m: { role: string; content: string }) => ({ role: m.role, content: m.content }))
        const messages = [...prior, { role: 'user', content: question }]

        const result = await runAgentLoop({
          createMessage: (p: Record<string, unknown>) => run.call({ tier, ...p }),
          params: {
            model: modelFor(run.settings, tier),
            max_tokens: 4096,
            output_config: { effort: tier === 'agent' ? 'medium' : 'low' },
            system,
            tools: toolsFor(run.edition),
          },
          messages: normaliseHistory(messages),
          maxIterations: run.settings.max_agent_iterations || 8,
          executeTool: (name: string, input: Record<string, unknown>) =>
            executeTool(name, input, { db: run.db, publicDb: run.publicDb, edition: run.edition, projectId, embed: embedLiteral }),
          onEvent: (ev: Record<string, any>) => {
            if (ev.type === 'tool_start') send({ type: 'status', text: toolStatus(ev.name, ev.input, catalogue) })
            if (ev.type === 'tool_end' && ev.data) {
              if (ev.data.kind === 'table') {
                results.push(ev.data)
                send({ type: 'table', result: ev.data })
              } else if (ev.data.kind === 'search') {
                results.push(ev.data)
                send({ type: 'search', text: ev.data.text, hits: ev.data.hits })
              } else if (ev.data.kind === 'docs') {
                results.push(ev.data)
                send({ type: 'docs', excerpts: ev.data.excerpts })
              }
            }
          },
        })
        run.addSteps(result.steps.filter((s: Record<string, unknown>) => s.step_type === 'tool'))

        const answer = result.text || (result.stopReason === 'refusal'
          ? 'I can\'t help with that request.'
          : 'I couldn\'t find an answer to that. Try asking in a different way.')
        send({ type: 'answer', text: answer })

        const structured = {
          results: results.map((r) => (r.kind === 'table' ? { ...r, rows: (r.rows as unknown[] || []).slice(0, STORED_ROWS) } : r)),
          model_tier: tier,
        }
        const { data: saved } = await run.db.from('ai_messages').insert({
          conversation_id: conversationId, role: 'assistant', content: answer, processed_by: 'agent', structured_data: structured,
        }).select('id').single()
        await run.db.from('ai_conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId)

        const { credits } = await run.finish({ answer })
        send({ type: 'done', conversation_id: conversationId, message_id: saved?.id ?? null, credits })
      } catch (err) {
        console.error('[agent-run] failed', err)
        const message = 'Something went wrong while answering. Please try again.'
        send({ type: 'error', error: message })
        await run.finish({ error: String((err as Error)?.message || err), status: 'failed' }).catch(() => {})
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { ...corsHeaders(req), 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  })
})

/** The API needs alternating roles starting with 'user'; merge or drop anything else. */
function normaliseHistory(messages: Array<{ role: string; content: string }>) {
  const out: Array<{ role: 'user' | 'assistant'; content: string }> = []
  for (const m of messages) {
    if (m.role !== 'user' && m.role !== 'assistant') continue
    if (!m.content) continue
    const last = out[out.length - 1]
    if (last && last.role === m.role) last.content = `${last.content}\n\n${m.content}`
    else out.push({ role: m.role as 'user' | 'assistant', content: m.content })
  }
  while (out.length && out[0].role !== 'user') out.shift()
  return out
}
