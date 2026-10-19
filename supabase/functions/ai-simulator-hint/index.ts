/**
 * ai-simulator-hint Edge Function
 * Real-time coaching hints during a simulation. Input: { stage?, moduleId, score, triggerReason } — no PII.
 * v1272: signed-in users only, Anthropic (quick model from ai_platform_settings), AI gate + audit + credits.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { errorResponse, json, preflight } from '../_shared/http.ts'
import { startAiRun } from '../_shared/aiRun.ts'
import { responseText } from '../_shared/anthropic.ts'

const TRIGGER_PROMPTS: Record<string, (moduleId: string, score: number) => string> = {
  stage_entry: (m) => `The user just entered the "${m}" stage of their simulation. Give a brief, encouraging tip for this stage.`,
  score_low: (m, s) => `The user's score in "${m}" is below 60% (current: ${s}%). Give a concise, constructive suggestion to improve.`,
  blank_field: (m) => `The user left a critical field blank in "${m}". Remind them why this field matters.`,
  idle: (m) => `The user has been idle on "${m}" for over 90 seconds. Give a gentle nudge to help them decide.`,
  bad_decision: (m) => `The user made a decision in "${m}" that conflicts with best practice. Briefly explain what to consider instead.`,
}

serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre
  try {
    const { moduleId, score = 0, triggerReason } = await req.json()
    if (!moduleId || !triggerReason) return json(req, 400, { error: 'moduleId and triggerReason are required' })

    const run = await startAiRun(req, { app: 'simulator', agent: 'sim_hint' })
    if (run.blocked) return json(req, 403, run.blocked)

    const prompt = (TRIGGER_PROMPTS[triggerReason] || TRIGGER_PROMPTS.stage_entry)(String(moduleId).slice(0, 200), Number(score) || 0)
    try {
      const msg = await run.call({
        tier: 'quick',
        max_tokens: 600,
        output_config: { effort: 'low' },
        system: 'You are a friendly project management coach in a simulation environment. Reply in 1-2 sentences. Be encouraging and practical.',
        messages: [{ role: 'user', content: prompt }],
      })
      const hint = responseText(msg)
      await run.finish({ answer: hint })
      return json(req, 200, { hint })
    } catch (err) {
      await run.finish({ error: String((err as Error)?.message || err), status: 'failed' })
      throw err
    }
  } catch (err) {
    return errorResponse(req, err)
  }
})
