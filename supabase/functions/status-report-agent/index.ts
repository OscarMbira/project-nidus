/**
 * v1272 — status-report-agent: drafts a highlight report (PRD stories 25–27c, 28; D12, D12a).
 *
 * POST { app: 'platform'|'simulator', project_id, period_start?, period_end? }
 *   1. resolves the project's report layout (ai_resolve_report_layout: assigned → project →
 *      organisation PMO → built-in default)
 *   2. gathers the period's facts with ai_run_query AS THE USER (RLS applies): tasks finished /
 *      due / late, milestones, open and new risks and issues, change requests, decisions, budget
 *   3. the agent model writes every enabled section of the layout (custom ones included), proposes
 *      time / cost / quality RAG values with a reason each, and lists the records each section used
 *   4. saves a DRAFT highlight report as the user (rule 37); the PM edits and submits through the
 *      normal approval (rule 53). The agent never submits or approves (D3).
 * Response: { report_id, project_id, sections_drafted, needs_input, rag, edit_path }
 * Deploy: supabase functions deploy status-report-agent
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { errorResponse, HttpError, json, preflight } from '../_shared/http.ts'
import { normaliseApp } from '../_shared/auth.ts'
import { startAiRun } from '../_shared/aiRun.ts'
import { parseJsonReply, responseText } from '../_shared/anthropic.ts'
import { buildPeriod, buildStatusReportPrompt, collectSources, factQueries, mapDraftToReport } from '../_shared/ai/statusReport.js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre
  if (req.method !== 'POST') return json(req, 405, { error: 'Method not allowed' })
  try {
    const body = await req.json()
    const app = normaliseApp(body.app)
    if (app === 'planner') return json(req, 400, { error: 'Status reports are not part of the Project Planner edition.' })
    const projectId = String(body.project_id || '')
    if (!UUID_RE.test(projectId)) return json(req, 400, { error: 'Choose a project first.' })

    const run = await startAiRun(req, { app, agent: 'status_report', projectId })
    if (run.blocked) return json(req, 403, run.blocked)

    try {
      const reportsTable = run.schema === 'sim' ? 'practice_highlight_reports' : 'highlight_reports'
      const projectCol = run.schema === 'sim' ? 'practice_project_id' : 'project_id'

      const [{ data: layoutRow, error: layoutErr }, { data: lastReport }, { data: project }] = await Promise.all([
        run.db.rpc('ai_resolve_report_layout', { p_project_id: projectId }),
        run.db.from(reportsTable).select('reporting_period_end').eq(projectCol, projectId)
          .order('reporting_period_end', { ascending: false, nullsFirst: false }).limit(1).maybeSingle(),
        run.db.rpc('ai_run_query', { p_spec: { entity: 'projects', project_id: projectId, limit: 1 } }),
      ])
      if (layoutErr) throw new HttpError(403, 'not_allowed', 'You do not have access to this project.')
      const projectRow = project?.rows?.[0]
      if (!projectRow) throw new HttpError(404, 'not_found', 'That project could not be found.')

      const period = buildPeriod({ start: body.period_start, end: body.period_end, lastEnd: lastReport?.reporting_period_end })
      const queries = factQueries(projectId, period)
      const facts: Record<string, unknown> = {}
      const steps: Array<Record<string, unknown>> = []
      await Promise.all(Object.entries(queries).map(async ([key, spec]) => {
        const t0 = Date.now()
        const { data, error } = await run.db.rpc('ai_run_query', { p_spec: spec })
        facts[key] = error ? { error: error.message } : data
        steps.push({ step_type: 'tool', tool_name: 'query_records', tool_input: spec, is_error: Boolean(error),
          tool_output_summary: error ? { error: error.message.slice(0, 200) } : { total_count: data?.total_count }, duration_ms: Date.now() - t0 })
      }))
      run.addSteps(steps)

      const { data: settingsLang } = await run.publicDb.rpc('ai_org_status')
      const language = (settingsLang?.report_language_code as string) || run.languageCode
      const layout = layoutRow?.layout || { sections: [] }
      const { system, user } = buildStatusReportPrompt({
        projectName: projectRow.project_name, period, layout, facts, language,
      })

      const msg = await run.call({
        tier: 'agent',
        max_tokens: 8000,
        output_config: { effort: 'medium' },
        system,
        messages: [{ role: 'user', content: user }],
      })
      const draft = parseJsonReply<Record<string, any>>(responseText(msg))
      const sources = collectSources(facts)
      const { row, childRows, needsInput, sectionsDrafted } = mapDraftToReport({
        schema: run.schema, draft, layout, period, projectId, projectName: projectRow.project_name,
        sources, facts, layoutNodeId: layoutRow?.node_id || null,
      })

      const { data: profile } = await run.publicDb.from('users').select('id').eq('auth_user_id', run.user.userId).maybeSingle()
      if (run.schema === 'sim') {
        row.user_id = run.user.userId
        row.created_by = run.user.userId
      } else {
        row.prepared_by_user_id = profile?.id ?? null
        row.created_by = profile?.id ?? null
        row.updated_by = profile?.id ?? null
      }
      const { data: saved, error: saveErr } = await run.db.from(reportsTable).insert(row).select('id').single()
      if (saveErr) throw saveErr

      if (run.schema === 'public') {
        for (const [table, rows] of Object.entries(childRows)) {
          if ((rows as unknown[]).length) {
            const { error } = await run.db.from(table).insert((rows as Array<Record<string, unknown>>).map((r) => ({ ...r, highlight_report_id: saved.id })))
            if (error) console.warn(`[status-report-agent] ${table} links skipped:`, error.message)
          }
        }
      }

      await run.finish({ answer: `Drafted highlight report ${saved.id} (${sectionsDrafted} sections)` })
      return json(req, 200, {
        report_id: saved.id,
        project_id: projectId,
        sections_drafted: sectionsDrafted,
        needs_input: needsInput,
        rag: draft.rag || null,
        edit_path: run.schema === 'sim'
          ? `/simulator/practice-highlight-reports/${saved.id}?projectId=${projectId}`
          : `/platform/projects/${projectId}/highlight-reports/${saved.id}/edit`,
      })
    } catch (err) {
      await run.finish({ error: String((err as Error)?.message || err), status: 'failed' })
      throw err
    }
  } catch (err) {
    return errorResponse(req, err)
  }
})
