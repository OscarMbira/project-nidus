/**
 * v1272 Phase 3 — sim-ai-npc: AI stakeholders (PRD D15, D27; stories 43–44, 48). Simulator only.
 *
 * POST { mode: 'reply', run_id, message_id }         in-character reply to a learner's message; the
 *                                                    model may move trust by ±10; memory updated
 * POST { mode: 'event_outcome', run_id, event_id }   after the learner resolves an NPC's event: trust
 *                                                    moves by rule (no model call, no credits)
 * POST { mode: 'personalise_event', run_id, event_id }  rewrites a new event's title/description to
 *                                                    refer to the learner's project; options untouched
 * Everything is read as the learner (RLS: their own runs). NPC memory is written with the service
 * role only after that check, so learners cannot edit trust.
 * Deploy: supabase functions deploy sim-ai-npc
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { errorResponse, HttpError, json, preflight } from '../_shared/http.ts'
import { requireUser } from '../_shared/auth.ts'
import { startAiRun } from '../_shared/aiRun.ts'
import { parseJsonReply, responseText } from '../_shared/anthropic.ts'
import {
  buildNpcReplyPrompt,
  buildPersonalisePrompt,
  eventOutcomeTrustDelta,
  alreadyCounted,
  nextMemory,
  validateNpcReply,
  validatePersonalised,
} from '../_shared/ai/simNpc.js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// deno-lint-ignore no-explicit-any
async function loadMemory(admin: any, runId: string, npcId: string) {
  const { data } = await admin.from('npc_run_memory').select('*').eq('run_id', runId).eq('npc_character_id', npcId).maybeSingle()
  return data
}

// deno-lint-ignore no-explicit-any
async function saveMemory(admin: any, runId: string, npcId: string, values: Record<string, unknown>) {
  const { error } = await admin.from('npc_run_memory').upsert({ run_id: runId, npc_character_id: npcId, ...values }, { onConflict: 'run_id,npc_character_id' })
  if (error) throw error
}

// deno-lint-ignore no-explicit-any
async function recentDecisions(db: any, runId: string) {
  const { data } = await db.from('ai_events').select('id, event_name, user_response, resolved_at')
    .eq('run_id', runId).eq('is_resolved', true).order('resolved_at', { ascending: false }).limit(6)
  return (data || []).reverse().map((e: any) => ({ event: e.event_name, decision: e.user_response?.text || null }))
}

serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre
  if (req.method !== 'POST') return json(req, 405, { error: 'Method not allowed' })
  try {
    const body = await req.json()
    const mode = String(body.mode || '')
    const runId = String(body.run_id || '')
    if (!UUID_RE.test(runId)) return json(req, 400, { error: 'Run not found.' })

    // ── Rule-based trust after a decision (no model, no credits) ───────────────────────
    if (mode === 'event_outcome') {
      const user = await requireUser(req)
      const db = user.userDb('sim')
      const { data: ev } = await db.from('ai_events').select('id, run_id, npc_character_id, event_name, user_response, response_score, is_resolved')
        .eq('id', String(body.event_id || '')).eq('run_id', runId).maybeSingle()
      if (!ev?.is_resolved || !ev.npc_character_id) return json(req, 200, { skipped: true })
      const admin = user.adminDb('sim')
      const memory = await loadMemory(admin, runId, ev.npc_character_id)
      // Each decision moves trust once, however often this is called.
      if (alreadyCounted(memory, ev.id)) return json(req, 200, { skipped: true, trust: memory?.trust_score ?? 0 })
      const delta = eventOutcomeTrustDelta(ev.response_score, Boolean(ev.user_response?.isOptimal))
      const next = nextMemory(memory, { trustDelta: delta, countedEventId: ev.id, keyDecision: { text: `${ev.event_name}: ${ev.user_response?.text || 'responded'}`, event_id: ev.id } })
      await saveMemory(admin, runId, ev.npc_character_id, next)
      return json(req, 200, { trust_delta: delta, trust: next.trust_score })
    }

    if (mode !== 'reply' && mode !== 'personalise_event') return json(req, 400, { error: 'Unknown mode.' })

    const run = await startAiRun(req, { app: 'simulator', agent: mode === 'reply' ? 'sim_npc_reply' : 'sim_event_text' })
    if (run.blocked) return json(req, 403, run.blocked)

    try {
      const { data: simRun } = await run.db.from('simulation_runs')
        .select('id, sim_day, active_stage, project_health, practice_project_id').eq('id', runId).maybeSingle()
      if (!simRun) throw new HttpError(404, 'not_found', 'Run not found.')
      const { data: lang } = await run.publicDb.from('languages').select('name').eq('code', run.languageCode).maybeSingle()
      const admin = run.user.adminDb('sim')

      if (mode === 'reply') {
        const { data: message } = await run.db.from('npc_user_messages').select('*')
          .eq('id', String(body.message_id || '')).eq('run_id', runId).maybeSingle()
        if (!message) throw new HttpError(404, 'not_found', 'Message not found.')
        if (message.ai_generated && message.npc_response) {
          // Already answered: return it rather than re-rolling trust (and spending credits) again.
          await run.finish({ answer: 'existing reply' })
          return json(req, 200, { reply: message.npc_response, trust_delta: message.trust_delta ?? 0, trust: message.trust_after ?? null })
        }
        const npcId = message.to_npc_character_id
        const [{ data: npc }, memory, decisions, { data: history }] = await Promise.all([
          run.db.from('npc_characters').select('*').eq('id', npcId).maybeSingle(),
          loadMemory(admin, runId, npcId),
          recentDecisions(run.db, runId),
          run.db.from('npc_user_messages').select('body, npc_response, created_at').eq('run_id', runId).eq('to_npc_character_id', npcId)
            .neq('id', message.id).order('created_at', { ascending: false }).limit(6),
        ])
        const prompt = buildNpcReplyPrompt({
          npc, memory, run: simRun, recentDecisions: decisions, languageName: lang?.name, message,
          history: (history || []).reverse().flatMap((h: any) => [{ learner: h.body }, ...(h.npc_response ? [{ you: h.npc_response }] : [])]),
        })
        const msg = await run.call({ tier: 'quick', max_tokens: 1200, output_config: { effort: 'low' }, system: prompt.system, messages: [{ role: 'user', content: prompt.user }] })
        const out = validateNpcReply(parseJsonReply(responseText(msg)))
        const next = nextMemory(memory, { trustDelta: out.trust_delta, summary: out.memory_summary, keyDecision: out.key_decision })
        await saveMemory(admin, runId, npcId, next)
        await run.db.from('npc_user_messages').update({
          npc_response: out.reply, npc_responded_at: new Date().toISOString(), ai_generated: true,
          trust_delta: out.trust_delta, trust_after: next.trust_score,
        }).eq('id', message.id)
        await run.finish({ answer: out.reply })
        return json(req, 200, { reply: out.reply, trust_delta: out.trust_delta, trust: next.trust_score })
      }

      // personalise_event
      const { data: ev } = await run.db.from('ai_events').select('*').eq('id', String(body.event_id || '')).eq('run_id', runId).maybeSingle()
      if (!ev || ev.is_resolved || ev.event_data?.personalised) {
        await run.finish({ answer: 'skipped' })
        return json(req, 200, { skipped: true })
      }
      const [{ data: npc }, decisions, { data: project }] = await Promise.all([
        ev.npc_character_id ? run.db.from('npc_characters').select('character_name, role_name').eq('id', ev.npc_character_id).maybeSingle() : Promise.resolve({ data: null }),
        recentDecisions(run.db, runId),
        simRun.practice_project_id
          ? run.db.from('practice_projects').select('project_name, project_description').eq('id', simRun.practice_project_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ])
      const prompt = buildPersonalisePrompt({
        npc, event: ev, recentDecisions: decisions, languageName: lang?.name,
        project: project ? { name: project.project_name, description: String(project.project_description || '').slice(0, 400), day: simRun.sim_day } : { day: simRun.sim_day },
      })
      const msg = await run.call({ tier: 'quick', max_tokens: 800, output_config: { effort: 'low' }, system: prompt.system, messages: [{ role: 'user', content: prompt.user }] })
      const text = validatePersonalised(parseJsonReply(responseText(msg)), ev)
      if (text) {
        await run.db.from('ai_events').update({
          event_name: text.title,
          event_description: text.description,
          event_data: { ...(ev.event_data || {}), personalised: true, original_title: ev.event_name, original_description: ev.event_description },
        }).eq('id', ev.id).eq('is_resolved', false)
      }
      await run.finish({ answer: text ? text.title : 'unchanged' })
      return json(req, 200, { personalised: Boolean(text) })
    } catch (err) {
      await run.finish({ error: String((err as Error)?.message || err), status: 'failed' })
      throw err
    }
  } catch (err) {
    return errorResponse(req, err)
  }
})
