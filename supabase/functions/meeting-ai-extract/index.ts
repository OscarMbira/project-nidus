/**
 * meeting-ai-extract — structured meeting extraction from a transcript.
 * Body: { transcript, app? }  →  { summary, key_decisions, action_items, issues, risks }
 * v1272: signed-in users only; Anthropic (quick model from ai_platform_settings); AI gate + audit + credits.
 * The Meeting-to-Register agent (meeting-register-agent) enriches these extracts in Phase 2.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { errorResponse, json, preflight } from '../_shared/http.ts'
import { normaliseApp } from '../_shared/auth.ts'
import { startAiRun } from '../_shared/aiRun.ts'
import { parseJsonReply, responseText } from '../_shared/anthropic.ts'
import { EXTRACTION_SYSTEM as SYSTEM } from '../_shared/ai/meetingRegister.js'

serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre
  try {
    const body = await req.json()
    const transcript = body.transcript
    if (!transcript || typeof transcript !== 'string') return json(req, 400, { error: 'transcript required' })

    const run = await startAiRun(req, { app: normaliseApp(body.app), agent: 'meeting_extract' })
    if (run.blocked) return json(req, 403, run.blocked)

    try {
      const msg = await run.call({
        tier: 'quick',
        max_tokens: 8000,
        output_config: { effort: 'low' },
        system: `${SYSTEM}\nWrite the summary and descriptions in the language of the transcript.`,
        messages: [{ role: 'user', content: `Transcript:\n${transcript.slice(0, 48000)}` }],
      })
      const parsed = parseJsonReply<Record<string, unknown>>(responseText(msg))
      await run.finish({ answer: String(parsed.summary || '') })
      return json(req, 200, parsed)
    } catch (err) {
      await run.finish({ error: String((err as Error)?.message || err), status: 'failed' })
      throw err
    }
  } catch (err) {
    return errorResponse(req, err)
  }
})
