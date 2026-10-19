/**
 * v1272 Phase 2 — import-mapper: the Import Mapper's suggest_column_mapping tool (PRD D26, story 32).
 *
 * POST { app: 'platform'|'simulator', template_label, dictionary: [{key,label,required,type,allowed,aliases,description}],
 *        headers: string[], rows: object[] }
 * Only the headers and the first 20 rows are used (anything else is dropped here, server-side).
 * Response: { columns: [{ source, target|null, confidence, conversions, note }], missing_required: string[] }
 * Nothing is imported: the user confirms or changes every mapping, then the page's own validation
 * and confirmation steps run unchanged.
 * Deploy: supabase functions deploy import-mapper
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { errorResponse, json, preflight } from '../_shared/http.ts'
import { normaliseApp } from '../_shared/auth.ts'
import { startAiRun } from '../_shared/aiRun.ts'
import { parseJsonReply, responseText } from '../_shared/anthropic.ts'
import { buildMapperPrompt, limitSample, validateMapperReply } from '../_shared/ai/importMapper.js'

serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre
  if (req.method !== 'POST') return json(req, 405, { error: 'Method not allowed' })
  try {
    const body = await req.json()
    const app = normaliseApp(body.app)
    if (app === 'planner') return json(req, 400, { error: 'The Import Mapper is not part of the Project Planner edition.' })
    const dictionary = Array.isArray(body.dictionary) ? body.dictionary.slice(0, 80) : []
    const { headers, rows } = limitSample({ headers: Array.isArray(body.headers) ? body.headers : [], rows: Array.isArray(body.rows) ? body.rows : [] })
    if (!dictionary.length || !headers.length) return json(req, 400, { error: 'Nothing to map: the file needs a header row.' })

    const run = await startAiRun(req, { app, agent: 'import_mapper' })
    if (run.blocked) return json(req, 403, run.blocked)

    try {
      const { data: lang } = await run.publicDb.from('languages').select('name').eq('code', run.languageCode).maybeSingle()
      const prompt = buildMapperPrompt({
        templateLabel: String(body.template_label || 'import').slice(0, 100), dictionary, headers, rows, languageName: lang?.name,
      })
      const msg = await run.call({
        tier: headers.length > 15 ? 'agent' : 'quick',
        max_tokens: 4000,
        output_config: { effort: 'low' },
        system: prompt.system,
        messages: [{ role: 'user', content: prompt.user }],
      })
      const result = validateMapperReply(parseJsonReply(responseText(msg)), dictionary, headers)
      run.addSteps([{ step_type: 'tool', tool_name: 'suggest_column_mapping', tool_input: { headers: headers.length, rows: rows.length },
        tool_output_summary: { mapped: result.columns.filter((c: any) => c.target).length, missing: result.missing_required.length } }])
      await run.finish({ answer: `Mapped ${result.columns.filter((c: any) => c.target).length} of ${headers.length} columns.` })
      return json(req, 200, result)
    } catch (err) {
      await run.finish({ error: String((err as Error)?.message || err), status: 'failed' })
      throw err
    }
  } catch (err) {
    return errorResponse(req, err)
  }
})
