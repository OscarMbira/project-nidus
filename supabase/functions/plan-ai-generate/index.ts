/**
 * plan-ai-generate — AI-assisted schedule / plan structure for the Planning module (M5).
 * Body: { prompt, industryTemplate?, projectId, app? }
 * Returns JSON consumed by planAIService.js (generated_* + ai_assumptions + ai_explanation).
 *
 * v1272: signed-in users only; Anthropic (agent model from ai_platform_settings); AI gate + audit
 * + credits. The old placeholder "stub plan" is gone (no fallback data — CLAUDE.md rule 26):
 * if generation fails the caller gets an error and can retry.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { errorResponse, json, preflight } from '../_shared/http.ts'
import { normaliseApp } from '../_shared/auth.ts'
import { startAiRun } from '../_shared/aiRun.ts'
import { parseJsonReply, responseText } from '../_shared/anthropic.ts'

const SYSTEM = `You are a project planning assistant. Return ONLY valid JSON (no markdown) with this shape:
{
  "generated_phases": [{"name": string, "order_index": number}],
  "generated_milestones": [{"name": string, "target_date": string | null, "description": string | null}],
  "generated_tasks": [{"name": string, "duration_days": number, "start_date": string | null, "due_date": string | null, "description": string | null, "is_milestone": boolean}],
  "generated_risks": [{"title": string, "description": string | null}],
  "ai_assumptions": [string],
  "ai_explanation": string
}
Use realistic but generic names; do not invent confidential data. Dates use YYYY-MM-DD.`

serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre
  try {
    const body = await req.json()
    const prompt = String(body.prompt || '').trim()
    // Simulator callers send practiceProjectId + sim: true (simPlanAIService).
    const projectId = body.projectId || body.practiceProjectId
    if (!prompt || !projectId) return json(req, 400, { error: 'prompt and projectId are required' })
    const app = body.sim === true ? 'simulator' : normaliseApp(body.app)

    const run = await startAiRun(req, { app, agent: 'plan_generate', projectId })
    if (run.blocked) return json(req, 403, run.blocked)

    const industry = body.industryTemplate ? `\nIndustry template context: ${String(body.industryTemplate).slice(0, 500)}` : ''
    try {
      const msg = await run.call({
        tier: 'agent',
        max_tokens: 8000,
        output_config: { effort: 'medium' },
        system: `${SYSTEM}\nWrite names and descriptions in the user's language (${run.languageCode}).`,
        messages: [{ role: 'user', content: `User request:\n${prompt.slice(0, 12000)}${industry}` }],
      })
      const out = parseJsonReply<Record<string, unknown>>(responseText(msg))
      await run.finish({ answer: String(out.ai_explanation || '') })
      return json(req, 200, out)
    } catch (err) {
      await run.finish({ error: String((err as Error)?.message || err), status: 'failed' })
      throw err
    }
  } catch (err) {
    return errorResponse(req, err)
  }
})
