/**
 * ai-insights — short dashboard insight bullets from rule-based findings (Phase 6.2 narrative).
 * Body: { app?, findings: string }  →  { bullets: string[] }
 * v1272: replaces the dashboard's use of the retired ai-chat function. Signed-in users only;
 * Anthropic quick model; AI gate + audit + credits.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { errorResponse, json, preflight } from '../_shared/http.ts'
import { normaliseApp } from '../_shared/auth.ts'
import { startAiRun } from '../_shared/aiRun.ts'
import { responseText } from '../_shared/anthropic.ts'

serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre
  try {
    const body = await req.json()
    const findings = String(body.findings || '').trim()
    if (!findings) return json(req, 400, { error: 'findings required' })

    const run = await startAiRun(req, { app: normaliseApp(body.app), agent: 'dashboard_insights' })
    if (run.blocked) return json(req, 403, run.blocked)

    try {
      const msg = await run.call({
        tier: 'quick',
        max_tokens: 800,
        output_config: { effort: 'low' },
        system: `Write 2 to 4 very short bullet-point insights for a project dashboard, based only on the data points given. No preamble, bullets only. Language: ${run.languageCode}.`,
        messages: [{ role: 'user', content: findings.slice(0, 6000) }],
      })
      const bullets = responseText(msg).split(/\n+/).map((l) => l.replace(/^[-*•]\s*/, '').trim()).filter(Boolean).slice(0, 5)
      await run.finish({ answer: bullets.join('\n') })
      return json(req, 200, { bullets })
    } catch (err) {
      await run.finish({ error: String((err as Error)?.message || err), status: 'failed' })
      throw err
    }
  } catch (err) {
    return errorResponse(req, err)
  }
})
