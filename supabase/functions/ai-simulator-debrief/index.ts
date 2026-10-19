/**
 * ai-simulator-debrief Edge Function
 * Post-simulation debrief. Input: { runSummary, assessments? } — aggregated, no PII.
 * v1272: signed-in users only, Anthropic via ai_platform_settings, AI gate + audit + credits.
 * v1272 Phase 3 (D14): when AI Assessor results are passed in, the debrief uses them.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { errorResponse, json, preflight } from '../_shared/http.ts'
import { startAiRun } from '../_shared/aiRun.ts'
import { parseJsonReply, responseText } from '../_shared/anthropic.ts'

serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre
  try {
    const { runSummary, assessments } = await req.json()
    if (!runSummary || typeof runSummary !== 'string') return json(req, 400, { error: 'runSummary (string) is required' })

    const run = await startAiRun(req, { app: 'simulator', agent: 'sim_debrief' })
    if (run.blocked) return json(req, 403, run.blocked)

    const assessmentBlock = Array.isArray(assessments) && assessments.length
      ? `\n\nAI Assessor results (rubric scores with evidence):\n${JSON.stringify(assessments).slice(0, 6000)}`
      : ''
    const prompt = `Based on the following simulation run summary, write a structured debrief.
Return ONLY a JSON object with these keys:
{
  "summary": "1-2 sentence overall performance narrative",
  "strengths": ["up to 3 short strength bullet points"],
  "improvements": ["up to 3 short improvement bullet points"],
  "topTip": "single most important takeaway",
  "moduleCommentary": { "module name": "one sentence each" }
}

Run summary:
${runSummary.slice(0, 8000)}${assessmentBlock}`

    try {
      const msg = await run.call({
        tier: 'quick',
        max_tokens: 2000,
        output_config: { effort: 'low' },
        system: `You are a project management simulation coach. Write in the learner's language (${run.languageCode}).`,
        messages: [{ role: 'user', content: prompt }],
      })
      const debrief = parseJsonReply(responseText(msg))
      await run.finish({ answer: JSON.stringify(debrief) })
      return json(req, 200, { debrief })
    } catch (err) {
      await run.finish({ error: String((err as Error)?.message || err), status: 'failed' })
      throw err
    }
  } catch (err) {
    return errorResponse(req, err)
  }
})
