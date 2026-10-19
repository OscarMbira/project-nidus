/**
 * v1272 Phase 2 — meeting-register-agent: "File to registers" (PRD D13, stories 29–31, 35).
 *
 * POST { app: 'platform'|'simulator', meeting_id, project_id?, notes? }
 *   1. If the meeting has nothing staged yet: extracts actions, risks, issues and decisions from
 *      the transcript (or pasted notes) and stages them (comm_meeting_* tables) + saves the summary.
 *   2. For every staged item still waiting for review: finds possible duplicates in the register
 *      (hybrid keyword + meaning search, Phase 2b; keyword only when embeddings are unavailable), suggests an owner from the meeting
 *      participants and project team, a due date for actions, and the organisation's own values
 *      for category / priority.
 *   3. Writes those suggestions onto the staging rows only. It never creates, changes, submits or
 *      deletes register records (D3): people accept items on the review checklist, and the app
 *      then creates DRAFT records.
 * Everything runs as the signed-in user (RLS applies). Response: { project_id, staged, enriched, counts }
 * Deploy: supabase functions deploy meeting-register-agent
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { errorResponse, HttpError, json, preflight } from '../_shared/http.ts'
import { normaliseApp } from '../_shared/auth.ts'
import { startAiRun } from '../_shared/aiRun.ts'
import { embedLiteral } from '../_shared/embed.ts'
import { isDuplicateCandidate } from '../_shared/ai/embedding.js'
import { parseJsonReply, responseText } from '../_shared/anthropic.ts'
import {
  anyWordQuery,
  assertStagingTable,
  buildEnrichmentPrompt,
  DONE_STATUSES,
  enrichmentUpdate,
  EXTRACTION_SYSTEM,
  KINDS,
  projectColumn,
  rankCandidates,
  STAGING,
  stagedText,
  stagingRowsFromExtraction,
} from '../_shared/ai/meetingRegister.js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_ITEMS = 40
const MAPPED_FIELDS: Record<string, string[]> = {
  risks: ['category'],
  issues: ['category', 'priority'],
  actions: ['priority'],
  decisions: ['category', 'priority'],
}

serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre
  if (req.method !== 'POST') return json(req, 405, { error: 'Method not allowed' })
  try {
    const body = await req.json()
    const app = normaliseApp(body.app)
    if (app === 'planner') return json(req, 400, { error: 'Meeting filing is not part of the Project Planner edition.' })
    const meetingId = String(body.meeting_id || '')
    if (!UUID_RE.test(meetingId)) return json(req, 400, { error: 'Meeting not found.' })
    const requestedProject = typeof body.project_id === 'string' && UUID_RE.test(body.project_id) ? body.project_id : null

    const run = await startAiRun(req, { app, agent: 'meeting_to_register', projectId: requestedProject })
    if (run.blocked) return json(req, 403, run.blocked)

    try {
      const pcol = projectColumn(run.schema)
      const { data: meeting } = await run.db.from('comm_meetings').select('*').eq('id', meetingId).maybeSingle()
      if (!meeting) throw new HttpError(404, 'not_found', 'Meeting not found, or you do not have access to it.')
      const projectId = (run.schema === 'public' ? meeting.project_id : null) || requestedProject
      if (!projectId) throw new HttpError(400, 'project_required', 'Choose the project these meeting outcomes belong to.')
      const meetingDate = String(meeting.actual_start || meeting.scheduled_start || meeting.created_at || '').slice(0, 10)

      // 1. Stage items if nothing is staged yet -----------------------------------------
      const loadStaged = async () => {
        const out: Record<string, any[]> = {}
        await Promise.all(KINDS.map(async (k: string) => {
          const { data } = await run.db.from(STAGING[k].table).select('*').eq('meeting_id', meetingId)
          out[k] = data || []
        }))
        return out
      }
      let staged = await loadStaged()
      let stagedNow = 0
      if (!KINDS.some((k: string) => staged[k].length)) {
        const { data: segments } = await run.db.from('comm_meeting_transcripts').select('speaker_label, text')
          .eq('meeting_id', meetingId).order('segment_index')
        const transcript = (segments || []).map((s: any) => (s.speaker_label ? `${s.speaker_label}: ${s.text}` : s.text)).join('\n')
          || String(body.notes || '').trim()
        if (!transcript) throw new HttpError(400, 'no_transcript', 'This meeting has no transcript yet. Paste the meeting notes to file them.')

        const msg = await run.call({
          tier: 'quick',
          max_tokens: 8000,
          output_config: { effort: 'low' },
          system: `${EXTRACTION_SYSTEM}\nWrite the summary and descriptions in the language of the transcript.`,
          messages: [{ role: 'user', content: `Meeting: ${meeting.title}\nTranscript:\n${transcript.slice(0, 48000)}` }],
        })
        const extraction = parseJsonReply<Record<string, any>>(responseText(msg))
        const rows = stagingRowsFromExtraction(extraction, { meetingId, schema: run.schema, projectId })
        for (const k of KINDS) {
          if (!rows[k].length) continue
          const { error } = await run.db.from(assertStagingTable(STAGING[k].table)).insert(rows[k])
          if (error) throw new HttpError(403, 'not_allowed', `Could not stage the meeting ${k}s: ${error.message}`)
          stagedNow += rows[k].length
        }
        await run.db.from(assertStagingTable('comm_meeting_summaries')).upsert({
          meeting_id: meetingId,
          summary_text: extraction.summary || null,
          key_decisions: extraction.key_decisions || [],
          action_items: extraction.action_items || [],
          ai_model_used: run.settings.model_quick,
          generated_at: new Date().toISOString(),
        }, { onConflict: 'meeting_id' }).then(({ error }: any) => { if (error) console.warn('[meeting-register] summary not saved', error.message) })
        staged = await loadStaged()
      }

      // 2. Context for enrichment ------------------------------------------------------------
      const pending: Array<{ key: string; kind: string; row: any }> = []
      for (const k of KINDS) {
        for (const row of staged[k]) {
          if (DONE_STATUSES.has(row.status) || row.agent_enriched_at) continue
          if (row[pcol] && row[pcol] !== projectId) continue
          pending.push({ key: `${k}:${row.id}`, kind: k, row })
        }
      }
      const work = pending.slice(0, MAX_ITEMS)

      const ownersPromise = (async () => {
        const ids = new Set<string>()
        const { data: parts } = await run.db.from('comm_meeting_participants').select('user_id').eq('meeting_id', meetingId)
        for (const p of parts || []) if (p.user_id) ids.add(p.user_id)
        if (run.schema === 'public') {
          const { data: team } = await run.publicDb.from('user_projects').select('user_id').eq('project_id', projectId).eq('is_deleted', false).limit(200)
          for (const t of team || []) if (t.user_id) ids.add(t.user_id)
        }
        const { data: me } = await run.publicDb.from('users').select('id').eq('auth_user_id', run.user.userId).maybeSingle()
        if (me?.id) ids.add(me.id)
        if (!ids.size) return []
        const { data: users } = await run.publicDb.from('users').select('id, full_name, display_name').in('id', [...ids])
        return (users || []).map((u: any) => ({ id: u.id, name: u.full_name || u.display_name })).filter((u: any) => u.name)
      })()

      const allowedPromise = (async () => {
        const allowed: Record<string, Record<string, string[]>> = {}
        await Promise.all(Object.entries(MAPPED_FIELDS).map(async ([entity, fields]) => {
          allowed[entity] = {}
          await Promise.all(fields.map(async (field) => {
            // The organisation's own values: what its registers already use (rule 25.1, nothing hard-coded).
            const { data } = await run.db.rpc('ai_run_query', {
              p_spec: { entity, group_by: [field], aggregates: [{ fn: 'count', alias: 'n' }], sort: [{ field: 'n', dir: 'desc' }], limit: 30 },
            })
            const values = (data?.rows || []).map((r: any) => r[field]).filter((v: unknown) => v != null && String(v).trim() !== '')
            if (values.length) allowed[entity][field] = values
          }))
        }))
        return allowed
      })()

      const candidatesPromise = Promise.all(work.map(async (w) => {
        const text = stagedText(w.kind, w.row)
        const q = anyWordQuery(text)
        if (!q) return []
        const params = { p_text: q, p_entity_types: [STAGING[w.kind].entity], p_project_id: projectId, p_limit: 5 }
        const embedding = await embedLiteral(text)
        let { data, error } = embedding
          ? await run.db.rpc('ai_hybrid_search', { ...params, p_embedding: embedding })
          : await run.db.rpc('ai_search_records', params)
        if (error && embedding) ({ data, error } = await run.db.rpc('ai_search_records', params))
        return rankCandidates(text, data || []).filter(isDuplicateCandidate)
      }))

      const [owners, allowed, candidateLists] = await Promise.all([ownersPromise, allowedPromise, candidatesPromise])

      // 3. One model call for all items, then write suggestions to the staging rows ----------------
      let enriched = 0
      if (work.length) {
        const { data: lang } = await run.publicDb.from('languages').select('name').eq('code', run.languageCode).maybeSingle()
        const prompt = buildEnrichmentPrompt({
          meeting: { title: meeting.title, date: meetingDate },
          owners,
          allowed: Object.fromEntries(Object.entries(allowed).map(([e, v]) => [e, v])),
          languageName: lang?.name,
          items: work.map((w, i) => ({
            key: w.key,
            register: STAGING[w.kind].entity,
            text: stagedText(w.kind, w.row).slice(0, 1500),
            owner_mentioned: w.row.assigned_to_name || w.row.made_by_name || null,
            candidates: candidateLists[i].map((c: any) => ({ id: c.id, ref: c.ref, title: c.title })),
          })),
        })
        const msg = await run.call({
          tier: 'agent',
          max_tokens: 6000,
          output_config: { effort: 'low' },
          system: prompt.system,
          messages: [{ role: 'user', content: prompt.user }],
        })
        const reply = parseJsonReply<{ items?: Array<Record<string, any>> }>(responseText(msg))
        const byKey = new Map((reply.items || []).map((s) => [String(s.key), s]))
        await Promise.all(work.map(async (w, i) => {
          const update = enrichmentUpdate(w.kind, byKey.get(w.key) || {}, {
            candidates: candidateLists[i], owners, allowed: allowed[STAGING[w.kind].entity] || {}, meetingDate,
          })
          if (w.kind === 'action' && !w.row[pcol]) update[pcol] = projectId
          const { error } = await run.db.from(assertStagingTable(STAGING[w.kind].table)).update(update).eq('id', w.row.id)
          if (!error) enriched += 1
        }))
      }
      run.addSteps([{ step_type: 'tool', tool_name: 'meeting_register', tool_input: { meeting_id: meetingId },
        tool_output_summary: { staged: stagedNow, enriched, pending: pending.length } }])

      const counts = Object.fromEntries(KINDS.map((k: string) => [k, staged[k].length]))
      await run.finish({ answer: `Staged ${stagedNow}, enriched ${enriched} meeting items.` })
      return json(req, 200, { project_id: projectId, staged: stagedNow, enriched, counts, more: pending.length > work.length })
    } catch (err) {
      await run.finish({ error: String((err as Error)?.message || err), status: 'failed' })
      throw err
    }
  } catch (err) {
    return errorResponse(req, err)
  }
})
