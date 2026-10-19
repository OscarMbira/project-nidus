/**
 * v1272 Phase 3 — sim-ai-assess: the AI Assessor (PRD D14; stories 46–48). Simulator only.
 *
 * POST { run_id, event_id }  → score one key decision against the scenario's rubric
 * POST { run_id }            → score the whole run (run end)
 * The agent model scores each rubric criterion (level 1–4) with a reason and evidence from the
 * learner's own events and messages. One assessment per decision and one per run (repeat calls
 * return the stored one). Advisory unless the scenario has been calibrated and switched to
 * "counts toward score" in Admin; the counts flag and weight are snapshotted on each assessment.
 * Assessments are written with the service role after the run is read as the learner, so learners
 * cannot write or change their own scores.
 * Deploy: supabase functions deploy sim-ai-assess
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { errorResponse, HttpError, json, preflight } from '../_shared/http.ts'
import { startAiRun } from '../_shared/aiRun.ts'
import { parseJsonReply, responseText } from '../_shared/anthropic.ts'
import { buildAssessorPrompt, rubricFor, validateAssessment } from '../_shared/ai/simAssessor.js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const optionText = (ev: any) => ev?.user_response?.text || (Array.isArray(ev?.response_options) ? ev.response_options[ev.selected_option_index]?.text : null)

serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre
  if (req.method !== 'POST') return json(req, 405, { error: 'Method not allowed' })
  try {
    const body = await req.json()
    const runId = String(body.run_id || '')
    const eventId = body.event_id ? String(body.event_id) : null
    if (!UUID_RE.test(runId) || (eventId && !UUID_RE.test(eventId))) return json(req, 400, { error: 'Run not found.' })
    const point = eventId ? 'decision' : 'run_end'

    const run = await startAiRun(req, { app: 'simulator', agent: 'sim_assessor' })
    if (run.blocked) return json(req, 403, run.blocked)

    try {
      const { data: simRun } = await run.db.from('simulation_runs').select('id, user_id, scenario_id, status, sim_day').eq('id', runId).maybeSingle()
      if (!simRun) throw new HttpError(404, 'not_found', 'Run not found.')

      const admin = run.user.adminDb('sim')
      const existing = point === 'decision'
        ? await run.db.from('ai_assessments').select('*').eq('ai_event_id', eventId).maybeSingle()
        : await run.db.from('ai_assessments').select('*').eq('run_id', runId).eq('assessment_point', 'run_end').maybeSingle()
      if (existing.data) {
        await run.finish({ answer: 'existing assessment' })
        return json(req, 200, { assessment: existing.data, existing: true })
      }

      const [{ data: scenario }, { data: rubricRows }, { data: lang }] = await Promise.all([
        run.db.from('scenarios').select('id, name, learning_objectives, assessor_counts, assessor_weight').eq('id', simRun.scenario_id).maybeSingle(),
        run.db.from('scenario_rubrics').select('*').eq('scenario_id', simRun.scenario_id).eq('is_active', true).order('sort_order'),
        run.publicDb.from('languages').select('name').eq('code', run.languageCode).maybeSingle(),
      ])
      const rubric = rubricFor(rubricRows || [], point)
      if (!rubric.length) throw new HttpError(409, 'no_rubric', 'This scenario has no AI Assessor rubric yet.')

      // Evidence: the learner's own decisions and messages (read as the learner).
      const evidence: Record<string, unknown> = {}
      const ids = new Set<string>()
      if (point === 'decision') {
        const { data: ev } = await run.db.from('ai_events').select('*').eq('id', eventId).eq('run_id', runId).maybeSingle()
        if (!ev?.is_resolved) throw new HttpError(409, 'not_resolved', 'Respond to the event first.')
        ids.add(ev.id)
        evidence.decision = {
          id: ev.id, situation: ev.event_name, details: ev.event_description, severity: ev.severity,
          options: (ev.response_options || []).map((o: any) => o?.text), chosen: optionText(ev), learner_notes: ev.user_response?.notes || null,
        }
      } else {
        const [{ data: events }, { data: messages }, { data: memory }] = await Promise.all([
          run.db.from('ai_events').select('id, event_name, severity, response_options, selected_option_index, user_response, is_resolved, auto_deteriorated')
            .eq('run_id', runId).order('triggered_at').limit(60),
          run.db.from('npc_user_messages').select('id, message_type, subject, body, to_npc_character_id').eq('run_id', runId).order('created_at').limit(40),
          run.db.from('npc_run_memory').select('npc_character_id, trust_score, summary').eq('run_id', runId),
        ])
        for (const e of events || []) ids.add(e.id)
        for (const m of messages || []) ids.add(m.id)
        evidence.decisions = (events || []).map((e: any) => ({
          id: e.id, situation: e.event_name, severity: e.severity, chosen: e.is_resolved ? optionText(e) : null,
          missed_deadline: Boolean(e.auto_deteriorated), unanswered: !e.is_resolved,
        }))
        evidence.messages_to_stakeholders = (messages || []).map((m: any) => ({ id: m.id, type: m.message_type, subject: m.subject, text: String(m.body || '').slice(0, 600) }))
        evidence.stakeholder_views = (memory || []).map((m: any) => ({ trust: m.trust_score, view: m.summary }))
      }

      const prompt = buildAssessorPrompt({ point, rubric, scenario, evidence, languageName: lang?.name })
      const msg = await run.call({ tier: 'agent', max_tokens: 4000, output_config: { effort: 'medium' }, system: prompt.system, messages: [{ role: 'user', content: prompt.user }] })
      const result = validateAssessment(parseJsonReply(responseText(msg)), rubric, ids)

      const { data: saved, error } = await admin.from('ai_assessments').insert({
        run_id: runId, user_id: simRun.user_id, scenario_id: simRun.scenario_id, assessment_point: point, ai_event_id: eventId,
        criteria: result.criteria, overall_score: result.overall_score, summary: result.summary,
        model: run.settings.model_agent, counts_toward_score: Boolean(scenario?.assessor_counts), weight: Number(scenario?.assessor_weight) || 0,
      }).select('*').single()
      if (error) throw error
      await run.finish({ answer: `Assessed ${point}: ${result.overall_score}` })
      return json(req, 200, { assessment: saved })
    } catch (err) {
      await run.finish({ error: String((err as Error)?.message || err), status: 'failed' })
      throw err
    }
  } catch (err) {
    return errorResponse(req, err)
  }
})
